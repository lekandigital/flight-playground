"""Recover omitted main XML/liveries from the named author's matching upstream.
Inputs are downloaded XML in scratch storage; source numbers stay in pack facts.
"""
import json, sys, hashlib, pathlib, xml.etree.ElementTree as ET
from importlib.util import spec_from_file_location, module_from_spec
spec=spec_from_file_location('pack',pathlib.Path(__file__).with_name('prepare-lab-pack.py')); pack=module_from_spec(spec);spec.loader.exec_module(pack)
p=pathlib.Path(__file__).resolve().parents[1]/'dist/lab/fg-f16-defa67fc'
f=json.loads((p/'facts.json').read_text()); source=ET.parse(sys.argv[1]).getroot();base=ET.parse(sys.argv[2]).getroot()
url='https://github.com/NikolaiVChr/f16'
f['source_recovery']={'url':url,'main_sha256':hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest(),'note':'Author upstream matches canopy30/hook57.175/gear112/95/offsets; missing main include recovered. Pack geometry/frame preserved.'}
main=[]
for x in source.findall('animation'):
 names=[n.text for n in x.findall('object-name')];kind=x.findtext('type','rotate')
 if kind=='select' and names:
  main.append({'source_xml':url+'/blob/master/Models/F-16.xml','objects':names,'type':kind,'condition':pack.ast(x.find('condition')) if x.find('condition') is not None else None})
 for a in f['animations_from_xml']:
  if a.get('source_xml') or kind!=a['type'] or names!=a['objects'] or x.findtext('property','').lstrip('/')!=a.get('property','').lstrip('/'):continue
  if str(a.get('factor'))!=str(x.findtext('factor')):continue
  a['source_xml']=url+'/blob/master/Models/F-16.xml'
  a['offsetUnits']='degrees' if x.find('offset-deg') is not None else 'metres' if x.find('offset-m') is not None else 'legacy' if x.find('offset') is not None else None
f['source_conditions']=main+f['source_conditions']
# Undefined runtime systems are inactive for this clean, dry parked inspector.
def properties(x):
 if x.get('op')=='property':yield x['text'].lstrip('/')
 for c in x.get('children',[]):yield from properties(c)
for rule in f['source_conditions']:
 for key in properties(rule.get('condition') or {}):f['default_properties'].setdefault(key,False)
for x in base.findall('./sim/multiplay/generic/*'):
 key='sim/multiplay/generic/'+x.tag+'['+x.get('n','0')+']';alias=x.get('alias')
 if alias:f['default_properties'][key]=f['default_properties'].get(alias.lstrip('/'),False)
 elif x.text and x.text.strip():
  value=x.text.strip()
  try:value=value=='true' if value in ['true','false'] else float(value)
  except ValueError:pass
  f['default_properties'][key]=value
f['default_properties']['sim/multiplay/generic/int[10]']=2
f['default_properties']['sim/multiplay/generic/bool[36]']=False
# Original livery list was capped at 80, excluding the selected YF entry.
for serial,name in [('75-0745','YF-16 Prototype'),('72-1568','USAF Testbed #568 "Combat Gray"')]:
 f['livery_names']=[l for l in f['livery_names'] if l['name']!=name]
 file='textures/liveries/Models/Liveries/yf/'+serial+'.png'
 logo='textures/liveries/Models/Liveries/yf/yf16-transp.png' if serial=='75-0745' else 'textures/liveries/Models/Liveries/standard.logos.color.png'
 f['livery_names'].append({'name':name,'file':'f16/Models/Liveries/yf/'+serial+'.xml','slots':{'sim/model/livery/texture':file,'sim/model/livery-logo/texture':logo},'recovered':True})
for l in f['livery_names']:
 l['slots']={k:v for k,v in l.get('slots',{}).items() if k in ['sim/model/livery/texture','sim/model/livery-logo/texture']}
# Current aircraft retains authored embedded mechanical maps; unused stores/maps aren't runtime needs.
f['texture_by_part']=[]
used={v for l in f['livery_names'] for v in l['slots'].values()}
f['textures']=[t for t in f['textures'] if t['file'] in used]
for file in used:
 if not any(t['file']==file for t in f['textures']):f['textures'].append({'file':file,'original':'f16/Models/'+file.split('Models/',1)[-1],'source':url})
for file in p.rglob('*'):
 if file.is_file() and file.suffix.lower() in ['.png','.jpg'] and str(file.relative_to(p)) not in used:file.unlink()
f['runtime_notes'].extend(['Body/logo paint groups recovered from main author XML; stores textures omitted because no stores are selected.','82 named liveries: original80 plus the omitted selected YF-16 and Combat Gray entries. Paint switching does not change production-block geometry.'])
(p/'facts.json').write_text(json.dumps(f,separators=(',',':'))+'\n')
print('F16 recovered main selectors',len(main),'liveries',len(f['livery_names']),'texture files',len(used))
