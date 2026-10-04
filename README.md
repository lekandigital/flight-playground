# Flight Playground

A static Three.js flight demo and aircraft inspector using the twelve supplied GLBs: Supermarine S.6B, Macchi MC.72, Macchi M.33, F4U Corsair, F-16, Caproni Ca.60, E-Flash, BO 105, Dauphin, EC130, Spitfire Mk Vb, and Seafire Mk III. All models and textures are bundled locally. Aircraft load when selected, and stay available afterward, to avoid downloading the entire collection at startup.

The demo initially opens the EC130 in **Dev view**. Choose an aircraft, switch between **Parked** and **Flight pose**, and adjust its supported rig sliders. The parked Corsair and Seafire have folded wings and lowered landing gear. The four seaplanes use a water inspection surface. Drag to orbit, scroll to zoom, or use the front, side, and top cameras. Surface display switches between corrected textures, clay, and wireframe. Visibility switches affect groups or individual meshes, including imported parts hidden in the configured default. Search and group filters make the F-16's many mesh instances easier to inspect. Reset restores the pose and visibility; Restore resets visibility alone. These inspection settings are temporary; Take flight uses the configured flight pose.

In flight, W / Up climbs, S / Down descends, A / Left and D / Right turn. Q / E adjust throttle; Shift boosts. C changes camera, R resets, and Escape pauses. Touch controls appear on touch devices. Flight uses arcade physics with automatic leveling and reset after contact with water or terrain.

## Runtime model configuration

Original GLBs are unchanged. The Corsair's insignia and number textures use alpha cutouts to remove opaque decal backgrounds; texture color space, filtering, imported reflectivity, and neutral inspection lighting are corrected in Three.js. UVs and original painted textures are preserved.

The Corsair has a procedural three-blade propeller and hub, original gear attached to stable runtime groups, original control surfaces attached to geometry-fitted hinges, and corrected wing-fold direction. Overlapping external stores, imported propeller/discs, rocket rails, and the hook are hidden by default. Limits: wing fold 85°, flaps 25°, ailerons ±18°, elevators ±14°, rudder ±12°, cowl flaps 8°. Canopy travel is limited to 0.7 model units; landing gear has a bounded extension/retraction path. Parked pitch is fitted to the actual tire geometry so all three wheels meet the ground.

The F-16 hides overlapping loadouts, alternate tails/nozzles, ground equipment, original gear, and unstable engine effects. It uses procedural tricycle gear and a simple nozzle. Original ailerons, stabilators, rudder, flaps, and air brakes are attached to fitted hinges. Limits: ailerons ±15°, stabilators ±12°, rudder ±15°, flaps 20°, air brakes 35°, canopy 28°. These are stylized bounded configurations, not a restoration of manufacturer-accurate mechanical linkage or every imported animation. Individual hidden variants can be revealed in the inspector.

The three seaplanes keep their imported propeller animations and use bounded control motions: ailerons ±16°, elevators ±12°, rudder ±10°. Pause freezes animation. Aircraft performance values are demo tuning. Asset ownership and original terms remain with their respective rights holders.

The Ca.60 export has no embedded textures or materials. Its runtime finish uses cream fabric with a procedural weave bump texture, a blue lower hull, wood struts and propellers, and muted metal/glass. Duplicated distant geometry, overlapping/incomplete wing meshes, and original propellers are hidden but can be revealed under **Original export geometry**. Three complete wing banks reuse the intact imported aft-wing geometry, with 18 tip surfaces on stable hinges. Eight procedural two-blade propellers and two procedural rudders replace unstable or missing details. The imported animation that separates assemblies is disabled. Controls use ailerons ±10°, pitch contribution ±6° on the forward/aft banks, combined tip deflection capped at ±12°, and rudders ±10°. This is a stylized reconstruction rather than an exact historical restoration. The larger aircraft uses a slower flight pace and wider inspection/chase cameras.

## Additional aircraft

These six aircraft keep their uploaded GLBs byte-for-byte. The demo disables their mixed imported clips and applies small, bounded configurations in Three.js. Original hidden parts remain independently revealable under Original rotor / propeller, Original export variants, Crew, or Optional equipment. Painted texture images and UVs remain intact; glass uses a consistent tint and transparency. Procedural rotating parts use dark airfoil blades, restrained safety tips, and detailed metal hubs. Helicopter tail fans use muted grey blades.

| Aircraft | Runtime repairs and appearance | Inspection controls |
| --- | --- | --- |
| E-Flash | Raise the misplaced sail by 2.04 model units and separate the trike from its inherited wing motion. Hide the deployed parachute, locator mesh, mispositioned crew, and old propeller. Keep sail registration and add a subtle fabric weave; use warm orange fairings and blue-grey tubes. Add a three-blade pusher. | Wing bank ±6°, wing pitch ±5°, nose-wheel steering ±20°, engine speed. |
| BO 105 | Replace fragmented rotor/blur assemblies with a four-blade main rotor and two-blade tail rotor. Restore the front and rear clamshell door pivots to a closed pose; give the cargo doors a separate bounded control. Attach side doors to fitted hinges. Hide crew, weapons, baked shadows, and rotor variants. Use clearcoated warm gold paint, reflective tinted glazing, door seals, and original skids; remove the eight-pixel placeholder livery that created black blocks. | Collective 0–12°, cyclic pitch/roll ±6°, tail pitch offset ±9°, front doors 0–35°, side rear door slide up to 0.55 units, cargo clamshells 0–55°, engine speed. |
| Dauphin | Replace both segmented rotors, including disconnected duplicate blades and blur meshes. Add a four-blade main rotor, eleven-blade enclosed tail rotor, and mast. Hide the alternate nose and duplicate HDR windows; attach the crew glazing to its moving door assembly. Preserve the painted livery; group original wheels into a bounded retracting rig. | Collective 0–12°, cyclic pitch/roll ±6°, tail pitch offset ±9°, doors 0–35° and rear slide up to 0.55 units, landing gear, engine speed. |
| EC130 | Select the T2 fuselage/door variants and hide overlapping body skins, window overlays, baskets, hoist, floats, snowshoes, and other optional equipment. Add the missing three-blade main rotor, mast, and ten-blade enclosed tail rotor. Retain the painted livery and baked skids; replace large navigation-light billboards with small emissive lenses. | Collective 0–12°, cyclic pitch/roll ±6°, tail pitch offset ±9°, cabin doors 0–35°, engine speed. |
| Spitfire Mk Vb | Preserve camouflage/markings; replace the old blades, duplicated spinner, and disc with a three-blade propeller. Hide rain overlays, crew, ground chocks, and an alternate gunsight. Fit surface hinges and group original gear. Sliding canopy includes its frame. Fit parked pitch to the actual tires. | Landing gear, canopy slide up to 0.65 units, flaps 0–25°, ailerons ±16°, elevators/rudder ±12°, engine speed. |
| Seafire Mk III | Use the Spitfire repairs with its own livery and a four-blade propeller. Keep outer-wing control surfaces attached to their folding wings; parked preset folds both wings upward. Hide the imported arresting hook. | Spitfire controls plus wing fold 0–82°. |

### Helicopter finish and reference pass

Helicopters use thin closed airfoil sections with spanwise twist, tapered rounded tips, engine-dependent droop/coning, detailed blade grips, fasteners, pitch links, swashplates, and stationary masts. Enclosed tail fans have stationary support vanes. Paint uses clearcoat and subtle procedural roughness variation; glazing, rubber, upholstery, and exhaust metal have separate finishes. Crease-aware normals smooth curved surfaces while retaining hard edges and the original UVs. Thin merged door gaskets follow the imported geometry. All additions remain available in the inspector visibility groups.

Reference photographs used for visual comparison, not embedded texture assets:

- [BO105 exterior and rotor head — HeliTrader seller gallery](https://helitrader.com/for-sale/helicopters/airbus/bo105-cbs-5/airbus-bo105-cbs-5-4/)
- [AS365 N3 CS-HHR — avia-dejavu photograph](https://avia-dejavu.net/photo%20CS-HHR.htm)
- [EC130T2 N130SB — Vertical Flight Society gallery](https://gallery.vtol.org/image/AVv5D)
- [H130/EC130 T2 — Airbus](https://www.airbus.com/en/products-services/helicopters/civil-helicopters/h130)

These are stylistic demo configurations, not manufacturer-accurate mechanisms. The helicopters use the same arcade flight model with a lower pace and gentler pitch/bank; this is not a hover or helicopter dynamics simulation. Engine speed and rotor geometry can be inspected independently. Pause freezes rotating parts.

## Development and validation

Run `npm install` and `npm run dev` to serve the included build at http://127.0.0.1:5173. After editing source, run `npm run build` and refresh. Deploy the contents of `dist/` to any static host. Sources are in `src/`; deployed HTML, CSS, bundle, and GLBs are in `dist/`.

Run `node tests/corsair.test.mjs`, `node tests/aircraft.test.mjs`, `node tests/ca60.test.mjs`, and `node tests/additional-aircraft.test.mjs`. Checks load the actual GLBs, exercise parked/flight presets and control extremes, verify hinge stability and clamping, and check texture/visibility restoration. Textured neutral and deflected Corsair/F-16/Ca.60 and all six additional aircraft poses were also reviewed through offline geometry rendering. Browser/WebGL interaction and visual QA were unavailable in the execution environment.

## FlightGear Mustangs and MiG-29

Four separate aircraft modules add the official P-51D, daVinci P-51D, RAF Mustang III and MiG-29. All GLBs remain byte-identical to the supplied files. The new aircraft use native metres, verified XML hinges/limits/sequences, source condition visibility, restored original textures and FDM ground contacts/pitch. Both P-51Ds have paint selectors in the gallery and inspector; the official package contains one scheme at four resolutions, and daVinci contains eleven schemes.

`npm install` then `npm run dev` builds and starts the exact current project at http://127.0.0.1:5173. `npm run build` refreshes `dist/game.js`; deploy `dist/` independently. `npm test` runs all aircraft regressions and `npm run audit:flightgear` writes the native geometry audit. Optional offline inspection tools require Python with numpy/Pillow and g++: run `node scripts/snapshot-flightgear.mjs /absolute/output/path`, then `python scripts/render-flightgear.py /absolute/output/path`.

Detailed per-aircraft changes, measured results, source conflicts and limitations are in [docs/flightgear-results.md](docs/flightgear-results.md), with the pre-implementation audit in [docs/flightgear-guess-audit.md](docs/flightgear-guess-audit.md). Control clamping, parked pitch/contact placement, propeller diameter and stowed tyre envelopes pass the checks. Native parked heights for daVinci (+6.14%) and MiG-29 (−6.67%) remain outside the requested 5% real-height tolerance; no unsupported global stretching was applied. The official missing canopy is a labelled procedural/reference fit, with an approximate analogue slide.

See [AIRCRAFT-NOTICE.md](AIRCRAFT-NOTICE.md) for source credits and licences. The two FGUK downloads have no stated licence and are kept on the existing owner-only Site. Reference photos and alternate models are never bundled as project assets. These additions share the existing arcade flight controls; they do not implement the aircrafts' FlightGear FDMs.
