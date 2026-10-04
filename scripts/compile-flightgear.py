"""Compile supplied facts/XML into runtime data; never imports reference assets.

Usage: python scripts/compile-flightgear.py /path/to/extracted-aircraft
The original GLB, textures, facts and source XML/Nasal are copied verbatim.
"""
import json, re, shutil, sys, hashlib
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = {
    'p51d': 'man-p51d-cc364f19',
    'p51davinci': 'fg-davinci-p-51d-072f9e39',
    'mustangiii': 'fg-mustangiii-voodoo-75fa9f7d',
    'mig29': 'fg-mig-29-ac3aa937',
}

def tree(e):
    return {'op': e.tag, 'value': (e.text or '').strip(), 'attrs': e.attrib,
            'children': [tree(c) for c in e]}

def objects(e):
    return [(n.text or '').strip() for n in e.findall('object-name')]

for aircraft, folder in PACKAGES.items():
    src = Path(sys.argv[1]) / folder
    facts = json.loads((src / 'facts.json').read_text())
    dst = ROOT / 'dist' / 'flightgear' / aircraft
    dst.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src / 'model.glb', dst / 'model.glb')
    shutil.copy2(src / 'facts.json', dst / 'facts.json')
    shutil.copytree(src / 'textures', dst / 'textures', dirs_exist_ok=True)
    source_dst = ROOT / 'aircraft-source' / aircraft
    shutil.copytree(src / 'source', source_dst / 'source', dirs_exist_ok=True)
    shutil.copy2(src / 'facts.json', source_dst / 'facts.json')
    xmls = []
    for p in sorted((src / 'source').rglob('*.xml')):
        try:
            xmls.append((str(p.relative_to(src / 'source')), ET.parse(p).getroot()))
        except ET.ParseError:
            pass
    aliases = {}
    defaults = {}
    def walk(e, path=''):
        for c in e:
            name = c.tag + (f"[{c.attrib['n']}]" if 'n' in c.attrib else '')
            key = (path + '/' + name).strip('/')
            if c.attrib.get('alias'):
                aliases[key] = c.attrib['alias'].strip('/')
            elif not len(c) and c.text and c.text.strip():
                defaults.setdefault(key, c.text.strip())
            walk(c, key)
    for _, root in xmls:
        walk(root)
    # /params properties are local to model XMLs, with their value being a path.
    for _, root in xmls:
        params = root.find('params')
        if params is not None:
            def resolve_params(e, path='params'):
                for c in e:
                    k = path + '/' + c.tag
                    if not len(c) and c.text:
                        aliases[k] = c.text.strip().strip('/')
                    resolve_params(c, k)
            resolve_params(params)

    animations = []
    for index, a0 in enumerate(facts['animations_from_xml']):
        a = dict(a0, fact_index=index)
        matches = [(p, x) for p, root in xmls for x in root.findall('animation')
                   if x.findtext('type', '').strip() == a['type'] and objects(x) == a['objects']]
        # Several aircraft have multiple animations for the same objects.
        prop = a.get('property') or ''
        def score(item):
            x = item[1]
            return (4 * (x.findtext('property', '').strip() == prop)
                    + 2 * (x.findtext('factor') == a.get('factor'))
                    + (bool(x.find('interpolation') is not None) == bool(a.get('interpolation'))))
        if matches:
            p, x = max(matches, key=score)
            a['source_xml'] = p
            pe = x.find('property')
            if pe is not None:
                a['property'] = (pe.text or '').strip() or pe.attrib.get('alias', '')
            a['offset'] = float(x.findtext('offset-deg', x.findtext('offset-m', '0')))
            a['factor'] = float(x.findtext('factor', '1'))
            entries = [[float(e.findtext('ind')), float(e.findtext('dep'))]
                       for e in x.findall('interpolation/entry')]
            if entries:
                a['interpolation'] = sorted(entries)
                a['travel'] = [min(v[1] for v in entries), max(v[1] for v in entries)]
        else:
            a['factor'] = float(a.get('factor') or 1)
            a['offset'] = float(a.get('offset') or 0)
        a['property'] = (a.get('property') or '').strip('/')
        animations.append(a)
    conditions = []
    for record in facts['shown_or_hidden_by_condition']:
        p = record['xml']
        root = next((r for name, r in xmls if name == p), None)
        if root is None:
            continue
        matches = [x for x in root.findall('animation')
                   if x.findtext('type', '').strip() == record['type']
                   and objects(x) == record['objects']]
        for x in matches:
            condition = x.find('condition')
            conditions.append(dict(record, condition=tree(condition) if condition is not None else None))
    # Default texture filenames are sometimes property placeholders. Resolve by
    # source property defaults and original filename, without inventing UVs.
    image_files = facts['textures'] + facts['liveries']['copied']
    texture_parts = []
    for item in facts['texture_by_part']:
        if not item['glb_nodes']:
            continue
        original = item['texture']
        choices = [t for t in image_files if t['original'] == original]
        if not choices:
            basename = Path(original).name.lower()
            choices = [t for t in image_files if Path(t['original']).name.lower() == basename]
        texture_parts.append(dict(item, file=choices[0]['file'] if choices else None))
    material_switches = [dict(objects=objects(x), property=x.findtext('texture-prop'),
                              texture=x.findtext('texture'), source=p)
                         for p, root in xmls for x in root.findall('animation')
                         if x.findtext('type', '').strip() == 'material' and x.find('texture-prop') is not None]
    data = dict(aircraft=aircraft, title=facts['title'], animations=animations,
                conditions=conditions, aliases=aliases, defaults=defaults,
                materialSwitches=material_switches,
                textureParts=texture_parts, textures=image_files,
                liveries=facts['livery_names'], geometry=facts['fdm_geometry'],
                frame=facts['frame'], specs=facts['real_world_specs'], eyePoint=facts['eye_point'],
                categories=facts['node_categories'], skipped=facts['skipped_submodels'],
                glbSha256=hashlib.sha256((src / 'model.glb').read_bytes()).hexdigest())
    (ROOT / 'src' / 'flightgear-data').mkdir(exist_ok=True)
    (ROOT / 'src' / 'flightgear-data' / (aircraft + '.json')).write_text(json.dumps(data, indent=2) + '\n')
    print(aircraft, len(animations), 'animations,', len(conditions), 'conditions')
