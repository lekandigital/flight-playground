"""Copy runtime-only handoff data; preserve XML conditions instead of flattened text."""
import argparse
import json
import re
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HANDOFF = Path.home() / 'Downloads/flight-playground-handoff'


def ast(element):
    return {'op': element.tag, 'text': (element.text or '').strip(),
            'children': [ast(child) for child in element]}


def prepare(asset, selected_set=None):
    pack = HANDOFF / asset
    facts = json.loads((pack / 'facts.json').read_text())
    facts['textures'] = facts.get('textures', []) + (facts.get('liveries') or {}).get('copied', [])
    source = pack / 'source'
    parsed = []
    for path in sorted(source.rglob('*.xml')):
        try:
            parsed.append((path, ET.parse(path).getroot()))
        except ET.ParseError:
            continue
    defaults, conditions, source_anims = {}, [], []
    selected = selected_set or (facts.get('fg_sets') or [None])[0]
    if not selected:
        candidates = list(source.rglob('*-set.xml'))
        if len(candidates) == 1:
            selected = candidates[0].name

    def set_values(element, prefix=''):
        for child in element:
            path = prefix + child.tag
            if 'n' in child.attrib:
                path += '[' + child.attrib['n'] + ']'
            if len(child):
                set_values(child, path + '/')
            elif child.text and child.text.strip():
                value = child.text.strip()
                if child.attrib.get('type') == 'bool' or value in ['true', 'false']:
                    value = value == 'true'
                else:
                    try:
                        value = float(value)
                    except ValueError:
                        pass
                defaults[path] = value

    for path, tree in parsed:
        if selected and path.name == Path(selected).name:
            includes = tree.attrib.get('include', '').split()
            for include in includes:
                candidate = path.parent / include
                if candidate.exists():
                    set_values(ET.parse(candidate).getroot())
            set_values(tree)
        for animation in tree.iter('animation'):
            names = [n.text.strip() for n in animation.findall('object-name') if n.text]
            kind = animation.findtext('type', 'rotate')
            entry = {'source_xml': str(path.relative_to(source)), 'objects': names,
                     'type': kind, 'property': animation.findtext('property', '')}
            expression = animation.find('expression')
            if expression is not None:
                entry['expression'] = ast(expression)
            condition = animation.find('condition')
            if kind in ['select', 'range'] and names:
                entry['condition'] = ast(condition) if condition is not None else None
                entry['range_m'] = [animation.findtext('min-m'), animation.findtext('max-m')]
                conditions.append(entry)
            else:
                source_anims.append(entry)
    for animation in facts.get('animations_from_xml', []):
        matches = [a for a in source_anims if a['type'] == animation.get('type')
                   and a['objects'] == animation.get('objects')
                   and a['property'].lstrip('/') == animation.get('property', '').lstrip('/')]
        if matches:
            animation.update({k: matches[0][k] for k in ['source_xml', 'expression'] if k in matches[0]})
        # EC130's map has no fitted pivots; retain the declared axis conversion.
        if not animation.get('glb_center') and animation.get('fg_center_m'):
            x, y, z = animation['fg_center_m']
            animation['glb_center'] = [x, z, -y]
            animation['frame_assumed'] = True
        axis = animation.get('fg_axis') or {}
        if not animation.get('glb_axis_dir') and axis.get('dir'):
            x, y, z = axis['dir']
            animation['glb_axis_dir'] = [x, z, -y]
        if not animation.get('glb_axis_points') and axis.get('points_m'):
            animation['glb_axis_points'] = [[x, z, -y] for x, y, z in axis['points_m']]
    facts['source_conditions'] = conditions
    facts['default_properties'] = defaults
    facts['selected_set'] = selected
    facts['runtime_notes'] = ['GLB already uses the mapped frame; do not apply the map twice.',
                              'Source conditions retain Boolean operators; categories are advisory.']
    keep = ['asset_id', 'title', 'frame', 'size_m', 'real_world_specs', 'fdm_geometry',
            'animations_from_xml', 'source_conditions', 'default_properties', 'selected_set',
            'propellers_rotors', 'node_categories', 'nodes', 'material_warnings', 'known_defects',
            'texture_by_part', 'textures', 'livery_names', 'eye_point', 'sounds_copied',
            'nasal_files', 'runtime_notes']
    trimmed = {key: facts.get(key) for key in keep}
    target = ROOT / 'dist/lab' / asset
    target.mkdir(parents=True, exist_ok=True)
    used = {item.get('texture') for item in facts.get('texture_by_part', []) if item.get('has_uv')}
    textures = []
    for texture in facts.get('textures', []):
        file = texture.get('file')
        if not file or (texture.get('original') not in used and 'liveries/' not in file.lower()):
            continue
        path = pack / file
        if path.is_file():
            destination = target / file
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, destination)
            textures.append(texture)
    # Livery XML files identify the real named slots rather than guessed filename matching.
    by_original = {item.get('original'): item.get('file') for item in facts.get('textures', [])}
    for livery in trimmed.get('livery_names') or []:
        path = source / livery['file']
        if not path.is_file():
            continue
        tree = ET.parse(path).getroot()
        slots = {}
        for node in tree.iter():
            if not len(node) and node.text and re.search(r'\.(png|rgb|jpg|jpeg)$', node.text.strip(), re.I):
                value = node.text.strip()
                candidates = [t for t in facts.get('textures', [])
                              if t.get('original', '').endswith(value) or t.get('file', '').endswith(value)]
                if candidates:
                    selected_texture = candidates[0]
                    slots[node.tag] = selected_texture['file']
                    path = pack / selected_texture['file']
                    if path.is_file():
                        destination = target / selected_texture['file']
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(path, destination)
                        if selected_texture not in textures:
                            textures.append(selected_texture)
        livery['slots'] = slots
    trimmed['textures'] = textures
    (target / 'facts.json').write_text(json.dumps(trimmed, separators=(',', ':'), ensure_ascii=False) + '\n')
    print(asset, 'animations', len(trimmed.get('animations_from_xml') or []),
          'conditions', len(conditions), 'textures', len(textures))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('asset_id')
    parser.add_argument('--set')
    args = parser.parse_args()
    prepare(args.asset_id, args.set)
