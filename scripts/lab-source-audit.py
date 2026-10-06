#!/usr/bin/env python3
"""Read handoff XML into a provenance-preserving audit; never changes packs.

Usage: python3 scripts/lab-source-audit.py --asset fg-dauphin-ea380a4c
       python3 scripts/lab-source-audit.py --output /tmp/lab-source-audit.json

The output deliberately keeps conditions and expressions as trees. It does not
infer normalized domains, choose variants, or turn ambiguous XML into motions.
Missing includes and ambiguous object-to-GLB bindings remain explicit requests.
"""

import argparse
import collections
import json
import pathlib
import re
import xml.etree.ElementTree as ET


ASSETS = (
    "fg-spitfire-spitfirevb-371986bf", "fg-spitfire-seafireiiic-e1e7c198",
    "fg-f4u-8cea7feb", "fg-f16-defa67fc", "fg-dauphin-ea380a4c",
    "fg-ec130-9797aa83", "fg-bo105-5f1245bd", "fg-e-flash-c73b47ce",
    "fg-macchi-m33-70f57d9d", "man-supermarine-s-6b-366f4f6d",
    "man-macchi-castoldi-mc72-6fa2f786", "man-caproni-ca60-e193e5f3",
)


def ast(element):
    """Preserve XML order, attribute indices, operators, and textual values."""
    if element is None:
        return None
    value = {"tag": element.tag}
    if element.attrib:
        value["attributes"] = dict(element.attrib)
    if element.text and element.text.strip():
        value["text"] = element.text.strip()
    children = [ast(child) for child in element if isinstance(child.tag, str)]
    if children:
        value["children"] = children
    return value


def scalar(text):
    text = (text or "").strip()
    if text.lower() in ("true", "false"):
        return text.lower() == "true"
    try:
        return float(text) if any(x in text for x in ".eE") else int(text)
    except ValueError:
        return text


def leaves(element, prefix=""):
    """Property paths retain FlightGear n= indices and explicit aliases."""
    out = {}
    counts = collections.Counter(child.tag for child in element if isinstance(child.tag, str))
    occurrences = collections.Counter()
    for child in element:
        if not isinstance(child.tag, str):
            continue
        implicit = occurrences[child.tag]
        occurrences[child.tag] += 1
        index = child.attrib.get("n", implicit if counts[child.tag] > 1 else None)
        name = child.tag + (f"[{index}]" if index is not None else "")
        path = f"{prefix}/{name}".strip("/")
        if list(child):
            out.update(leaves(child, path))
        elif child.attrib.get("alias"):
            out[path] = {"alias": child.attrib["alias"]}
        elif child.text and len(child.text.strip()) <= 256:
            out[path] = scalar(child.text)
    return out


def audit_pack(pack):
    facts = json.loads((pack / "facts.json").read_text())
    source = pack / "source"
    names = [node["name"] for node in facts.get("nodes", [])]
    documents, parse_errors = {}, []
    for path in sorted(source.rglob("*")):
        if path.suffix not in (".xml", ".eff"):
            continue
        try:
            parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True))
            documents[path] = ET.parse(path, parser=parser).getroot()
        except (ET.ParseError, OSError) as error:
            parse_errors.append({"file": str(path.relative_to(pack)), "error": str(error)})

    def resolve(raw, context, extension=""):
        raw = (raw or "").removeprefix("Aircraft/")
        candidates = [source / raw, context.parent / raw]
        if extension and not pathlib.Path(raw).suffix:
            candidates += [pathlib.Path(str(p) + extension) for p in candidates]
        return next((p for p in candidates if p.is_file()), None)

    groups_by_xml = {}
    group_candidates = collections.defaultdict(list)
    for path, tree in documents.items():
        local_groups = groups_by_xml.setdefault(path, {})
        for animation in tree.iter("animation"):
            name = animation.findtext("name")
            if name and not animation.findtext("type"):
                objects = [e.text.strip() for e in animation.findall("object-name") if e.text]
                local_groups[name.strip()] = objects
                group_candidates[name.strip()].append(objects)
    groups = {name: variants[0] for name, variants in group_candidates.items() if len(variants) == 1}

    def expand(objects, context, seen=()):
        result = []
        for name in objects:
            local = groups_by_xml.get(context, {}).get(name, groups.get(name))
            if local is not None and name not in seen:
                result += expand(local, context, (*seen, name))
            else:
                result.append(name)
        return list(dict.fromkeys(result))

    def bindings(objects, context):
        matched = {}
        for obj in expand(objects, context):
            candidates = [name for name in names if name == obj or re.sub(r"^i\d+_", "", name) == obj]
            matched[obj] = candidates
        return matched

    result = {
        "asset_id": facts["asset_id"], "source": str(pack),
        "frame": facts.get("frame"), "size_m": facts.get("size_m"),
        "real_world_specs": facts.get("real_world_specs"),
        "fdm_geometry": facts.get("fdm_geometry"), "set_files": [],
        "missing_includes": [], "groups": groups,
        "groups_by_xml": {str(path.relative_to(pack)): local for path, local in groups_by_xml.items() if local},
        "animations": [],
        "conditions": [], "material_bindings": [], "effect_bindings": [],
        "livery_files": [], "submodels": [], "parse_errors": parse_errors,
    }
    for path, tree in documents.items():
        relative = str(path.relative_to(pack))
        includes = []
        for element in tree.iter():
            raw = element.attrib.get("include")
            if raw:
                found = resolve(raw, path)
                record = {"file": relative, "include": raw,
                          "resolved": str(found.relative_to(pack)) if found else None}
                includes.append(record)
                if found is None:
                    result["missing_includes"].append(record)
        if path.name.endswith("-set.xml"):
            result["set_files"].append({"file": relative, "defaults": leaves(tree), "includes": includes})
        if "liver" in str(path).lower() and tree.find("sim/model") is not None:
            result["livery_files"].append({"file": relative, "properties": leaves(tree)})
        for model in tree.findall("model"):
            raw = model.findtext("path")
            resolved = resolve(raw, path)
            result["submodels"].append({
                "xml": relative, "name": model.findtext("name"), "path": raw,
                "resolved": str(resolved.relative_to(pack)) if resolved else None,
                "offsets": leaves(model.find("offsets")) if model.find("offsets") is not None else {},
            })
        for index, animation in enumerate(tree.findall("animation")):
            kind = (animation.findtext("type") or "group").strip()
            objects = [(e.text or "").strip() for e in animation.findall("object-name")]
            record = {"xml": relative, "index": index, "type": kind,
                      "objects": objects, "bindings": bindings(objects, path)}
            if kind in ("rotate", "translate", "spin"):
                for key in ("property", "factor", "offset", "min", "max"):
                    if animation.find(key) is not None:
                        record[key] = scalar(animation.findtext(key))
                for key in ("center", "axis", "interpolation", "expression", "condition"):
                    if animation.find(key) is not None:
                        record[key] = ast(animation.find(key))
                comments = [e.text.strip() for e in animation if e.tag is ET.Comment and e.text and "property" in e.text]
                if comments:
                    record["commented_property_aliases"] = comments
                result["animations"].append(record)
            if kind in ("select", "range"):
                record["definition"] = ast(animation)
                result["conditions"].append(record)
            if kind == "material":
                record["parameters"] = leaves(animation)
                record["definition"] = ast(animation)
                result["material_bindings"].append(record)
        for effect in tree.findall("effect"):
            objects = [(e.text or "").strip() for e in effect.findall("object-name")]
            inheritance = effect.findtext("inherits-from")
            inherited = resolve(inheritance, path, ".eff")
            result["effect_bindings"].append({
                "xml": relative, "objects": objects, "bindings": bindings(objects, path),
                "inherits_from": inheritance,
                "inherited_file": str(inherited.relative_to(pack)) if inherited else None,
                "parameters": leaves(effect.find("parameters")) if effect.find("parameters") is not None else {},
                "inherited_parameters": leaves(documents[inherited].find("parameters"))
                if inherited in documents and documents[inherited].find("parameters") is not None else {},
            })
    result["summary"] = {
        "source_xml_files": len(documents), "source_motions": len(result["animations"]),
        "fact_motions": len(facts.get("animations_from_xml", [])),
        "fact_channels": dict(collections.Counter(a.get("channel") or "unclassified" for a in facts.get("animations_from_xml", []))),
        "material_slots": len(result["material_bindings"]),
        "texture_by_part_count": len(facts.get("texture_by_part", [])),
        "unmapped_material_objects": sorted({obj for r in result["material_bindings"] for obj, ns in r["bindings"].items() if not ns}),
        "ambiguous_material_objects": sorted({obj for r in result["material_bindings"] for obj, ns in r["bindings"].items() if len(ns) > 1}),
    }
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--handoff", type=pathlib.Path, default=pathlib.Path.home() / "Downloads/flight-playground-handoff")
    parser.add_argument("--asset", action="append", choices=ASSETS, help="Repeat to limit the audit; default is all twelve.")
    parser.add_argument("--output", type=pathlib.Path)
    args = parser.parse_args()
    report = {asset: audit_pack(args.handoff / asset) for asset in (args.asset or ASSETS)}
    encoded = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.write_text(encoded)
        print(f"Wrote {args.output} ({len(report)} packs).")
    else:
        print(encoded, end="")


if __name__ == "__main__":
    main()
