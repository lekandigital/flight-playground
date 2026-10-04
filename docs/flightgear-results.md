# Four FlightGear aircraft — changes, evidence and limitations

The four supplied GLBs are unchanged. Each aircraft has its own runtime module. The previous twelve aircraft modules and model assets are unchanged. The selector and inspector now contain sixteen aircraft. This is still the existing arcade flight demo, not a port of FlightGear's flight dynamics.

## Shared work

- Used the verified `frame.fg_to_glb`: x aft, y up, z left, in metres. The new models have scale **1**. The gallery wrapper turns them to the existing world's heading without resizing them.
- Discarded the exporter's overlapping animation hierarchy while preserving every mesh's neutral transform. Reapplied ordered XML transforms about `glb_center` / `glb_axis_points`, along `glb_axis_dir`, with signed factors, offsets, travel and interpolation tables. No baked `gear` or `control_surfaces` clip is played.
- Resolved aliases, condition trees and null travel/property information from the original XML/Nasal. Bounded every normalized inspection input and every finite rotation/translation output. Continuous spins use a periodic phase, not an unbounded Euler angle.
- Restored textures per material primitive and original AC3D object, in sRGB with the original UVs. Embedded cockpit textures without standalone files remain embedded. IOR 1000 becomes 1.5; glazing is transparent and frames remain opaque.
- Matched tyre bottoms to trusted FDM contacts with local centimetre-scale corrections. The parked pitch is unchanged. Ground contacts are level to within 0.4 mm. The inspector positions those contacts at its apron floor.
- Added source-specific parked/flight presets, signed control sliders, live travel readouts and P-51D paint selectors. All default-hidden meshes remain individually revealable. Manual visibility overrides survive the runtime's animation updates; Restore returns to the source conditions.

The complete original facts and supplied XML/Nasal are in `aircraft-source/`. Compiled per-hinge data is in `src/flightgear-data/`. `docs/flightgear-guess-audit.md` records the decisions made before implementation. `docs/flightgear-validation.json` contains the measured results, offsets and GLB hashes.

## Official P-51D — `src/p51d.js`

| What changed | Facts replacing guesses | Remaining issue / qualification |
|---|---|---|
| Removed tiedown ropes and securing equipment from the normal view; fixed physical span from 13.21 m to 11.335 m. | `shown_or_hidden_by_condition`, source securing properties, actual i74/i75 rope bounds; `real_world_specs.span_m = 11.278`. | Equipment remains revealable. Aircraft stays at metre scale. |
| Rebuilt inward main-gear motion, outer/inner doors, hydraulic links, tail-wheel retraction, surfaces, trim tabs, cooling/oil doors and blade pitch. | Exact XML hinges, factors and tables; main legs ±88°, tail-wheel assembly −58°, flaps 47°, elevator/rudder 30°, ailerons 15°; `Engines/P51prop.xml` blade pitch 23–58°. | The inner-door state also follows `Nasal/gear-doors.nas`: middle-third opening and engine-stopped sag. Instruments not useful to this exterior demo are left at their neutral values. |
| Retained the four original blades and both source RPM representations; corrected blur transparency. | Original spin line / factor 0.479; FDM diameter 3.5052 m; source prop max RPM 1260. | Measured blade diameter 3.449 m (−1.61%), within the requested 3%. No procedural propeller here. |
| Restored Delivery Day paint, separate fuselage/wing/spinner slots and 1K/2K/4K/8K resolution choices. | `texture_by_part`, source `texture-*` properties and livery XML. | This package has one named scheme at four resolutions, not eighteen schemes. Missing enclosure texture cannot be used as an accurate UV layout on a newly fitted shell. |
| Added the omitted bubble hood, fixed windscreen and thin sill/aft frames procedurally. | `skipped_submodels` confirms missing enclosure. Fits use the existing windshield/seal bounds and author's intended-look images. | **Reference fit**, not recovered original geometry. The 0.65 m slide is explicitly a daVinci analogue; no official enclosure XML was supplied. Cockpit/pilot detail omitted by the lab is not reconstructed. |
| Parked at 13.69°, gear down, canopy shut, flaps up. | `fdm_geometry.parked_pitch_deg_nose_up` and trusted contacts. | Small original tyre/contact mismatch is corrected locally; notes record each offset. |

## daVinci P-51D — `src/p51davinci.js`

| What changed | Facts replacing guesses | Remaining issue / qualification |
|---|---|---|
| Rebuilt main/tail gear, compression, doors, surfaces, wheel phase and sliding bubble canopy. | XML pivots/tables: main legs 90.3° / −90.5°, tail leg 90°, flaps 40°, ailerons 12°, elevator/rudder 20°, canopy translation 0.65 m. | The supplied complete bubble-canopy airframe is retained independently of the III. |
| Hid the undersized original blades/blur and created four Hamilton Standard blades with yellow tips at the verified spin centre. Original spinner retained. | Original centre `[0.579, 0.434, 0]`, x-axis; FDM diameter 2.8 m conflicts with measured original ~2.6 m and `real_world_specs.prop_dia_m = 3.40`. | Chosen nominal diameter **3.40 m**; measured bevel/tip envelope 3.419 m (+0.55%). Blade profile is an artistic procedural fit, not a manufacturer blade drawing. No reference-model shape was copied. |
| Restored paint and all eleven livery sets across fuselage, wing tops, wing bottoms and horizontal stabilizers. | Original livery XML `Fuselage`, `WingTops`, `WingBottoms`, `HorizStabs` texture properties; 44 copied files. | `Default` starts selected. Embedded cockpit maps remain where no separate file exists. |
| Fixed glass/materials and parked at 14.61°. | Source glass object names, material warnings, FDM contact/pitch data. Prop RPM uses FDM cruise 1257 and the original spin factor. | **Height remains 4.327 m, +6.14% against the zip's 4.077 m figure.** Length/span pass. No global scaling or unsupported fin/gear deformation was applied to conceal this discrepancy. |
| Kept this aircraft available on the owner's private Site and in the project. | Package has no stated licence; Site access was verified owner-only. | No public redistribution permission is asserted. |

## Mustang III — `src/mustangiii.js`

| What changed | Facts replacing guesses | Remaining issue / qualification |
|---|---|---|
| Kept the separate razorback, Malcolm hood, four-gun layout and original RAF scheme. | Supplied III geometry and author's FlightGear splash/screenshots. | Supplied historical photo 10 is an early razorback Mustang, not an exact RAF III. Most other supplied Mustang photographs depict Ds. |
| Rebuilt inward gear, doors, tail wheel, compression and surfaces. | XML: main struts 85°, wheels 89°, outer doors 95°, inner doors 90°, tail leg/wheel 85°, tail doors 90°; flaps 47°, ailerons 15°, elevator/rudder 30°. | The exterior XML retracts the tail wheel despite the FDM `retracts:false` flag; XML wins for visual motion. |
| Corrected main-tyre stowed offsets while preserving the XML angles. | Actual `wells` mesh envelope, exact transformed tyre vertices. | Left/right tyre fits are about +3.5 cm aft and +5.4 cm up, blended out when extended. These are exporter mesh fits, not new gear travel angles. |
| Made `glaze`, `iglaze`, `malc2` and gunsight glass transparent; retained `malc1in/out` painted frames. | Source transparent-effect lists in `P51-MustangIII.xml`. | The original low-resolution hood/frame detail is retained; no invented opening channel. |
| Kept the original four-blade propeller, source RPM blur and hub. | FDM diameter 3.5 m; spin centre `[0.6, −0.3, 0]`; cruise prop RPM 1293. | Measured diameter 3.466 m (−0.98%). The XML's lowercase `prophub` does not resolve to a supplied mesh; the symmetric static hub is retained. |
| Parked at 13.64°, grounded from contacts. | FDM pitch/contact coordinates. | The zip's real-world spec block incorrectly says **P-51D**. The primary 1944 P-51B-5 report gives 9.830 × 4.166 × 11.278 m; this III's measured 9.681 × 4.055 × 11.053 m is within 5% of that comparison. It is still not proof of every RAF III production variant. |
| Kept this aircraft on the owner's private Site and in the project. | No stated FGUK licence; verified owner-only access. | No public redistribution permission is asserted. |

## MiG-29 — `src/mig29.js`

| What changed | Facts replacing guesses | Remaining issue / qualification |
|---|---|---|
| Identified the 8 m exhaust-effect extent and oversized glow billboards; excluded effects from physical bounds and source-hidden flames when parked. | Reheat/glow mesh bounds; XML conditions, source reheat scale and blend; real length 17.32 m. | Airframe length is 17.239 m; visible flames are effects when throttling, not an aircraft scaling error. Original flame shape remains stylized/long. Glow billboards are hidden and revealable; no camera-facing billboard implementation. |
| Rebuilt all 105 supplied rotate drivers, including individual nozzle petals. | Verified hinge centres/axes, source throttle interpolation and repeated nozzle instance locations. | The demo has one common throttle for both engines. No differential-engine FDM. |
| Mixed bounded pitch/roll tailerons and drove separate flaps, slats and rudders. | `left/right-elevon-pos-norm`, ±30°; flaps/slats 20°; rudders ±25°. | Pitch + roll clamps before rotation. |
| Restored upper/lower airbrakes and sequenced all landing-gear doors/legs. | Upper −56° / lower +60°; forward main doors ±155°, legs ±115°, rear doors ±80°, nose leg 80°, nose steering ±50°, exact XML interpolation tables. | The audit is a vertex/bounding-envelope check plus offline views, not a watertight solid collision simulation. |
| Hid the incomplete original well interiors and fitted procedural open-bottom bay walls/roofs. Original wells remain revealable. | Union of each supplied opening's mesh bounds and the tyre vertices at the exact XML stowed state, with 2.5 cm visual clearance. | Original main roofs intersect tyres and the 0.389 m nose well is shallower than the ~0.633 m stowed tyre. Repaired interiors fit inside the existing fuselage; leg angles/tyre sizes are unchanged. These are visual bay fits, not recovered manufacturer structure. |
| Parked level at 0.06°, screens shown, louvers 60°; screens hidden/louvers shut in flight. | WOW condition, louver rotate XML, FDM pitch/contact data. | Ground-intake state is separately inspectable. |
| Restored the three original textures; repaired IOR and painted primitives lacking usable UVs in grey/green upper tones and a light underside. | `texture_by_part`, 20 IOR warnings / 53 no-UV primitives; supplied MiG photos 08/09/10 listed below. | The camouflage boundary is a procedural approximation, not an exact aircraft-specific livery. Missing UVs/markings and faceted source geometry remain. No photo is a runtime texture. |
| Reheat engages at 90% throttle, scales 0..1 about source x=13.739 m and converts source transparency into Three opacity. | `Mig-29_Reheat.xml`, `Nasal/Mig-29.nas`; additive blending replaces the broken opaque effect. | Reheat remains the supplied effect geometry. |
| Preserved native metre scale. | Verified frame, real dimensions and physical mesh measurements. | **Height remains 4.414 m, −6.67% against 4.73 m.** Length/span pass. Fin/gear proportions are not guessed or globally stretched to force a pass. |

## Measurements and test coverage

Length/span are measured with the airframe level, gear down and effects/stores excluded by the normal preset. Height is the complete parked physical envelope at the FDM pitch. Propeller measurement projects every blade vertex perpendicular to its actual spin axis; tips and bevels are included.

| Aircraft | Level length m | Span m | Parked height m | Pitch | Propeller m | Size outcome |
|---|---:|---:|---:|---:|---:|---|
| Official P-51D | 9.867 | 11.335 | 4.265 | 13.69° | 3.449 / 3.5052 target | All within 5% of supplied dimensions |
| daVinci P-51D | 9.619 | 11.041 | 4.327 | 14.61° | 3.419 / 3.40 target | Length/span pass; height +6.14% |
| Mustang III | 9.681 | 11.053 | 4.055 | 13.64° | 3.466 / 3.50 target | Within 5%, including the P-51B primary-report comparison |
| MiG-29 | 17.239 | 11.446 | 4.414 | 0.06° | Twin jets | Length/span pass; height −6.67% |

`npm test` loads the actual GLBs, tests extreme/out-of-range/NaN channels, verified axes, fixed spin centres, contact placement, all twelve stowed tyres, all P-51D livery paths, source glass/frame separation, MiG door waypoints/taileron mixing/intakes/reheat, and the earlier aircraft regressions. The size test **explicitly records the two unresolved heights**, rather than labelling every dimension a pass.

The CPU renderer snapshots the actual runtime meshes/matrices/materials. It produces **125 poses**: parked, flight, side, underside, every configured channel's two extremes, intermediate gear stages and combined MiG pitch/roll. Source reheat scale/blend is also included. These are offline orthographic geometry/texture inspections with simplified lighting, not WebGL screenshots or PBR image-parity tests. Browser interaction and WebGL shader output were unavailable. No baked animation clip is sampled.

## Incorrect or incomplete supplied facts

1. Official width 13.21 m includes securing ropes; usable airframe span is 11.335 m. MiG length 22.63 m includes exhaust-effect geometry; physical length is 17.239 m. Glow effects also inflate MiG width.
2. daVinci FDM prop diameter 2.8 m and imported blades ~2.6 m conflict with 3.40 m real specifications. The documented real diameter is used for the replacement.
3. Official 18 livery files are one named scheme at several resolutions. daVinci's 44 files are eleven four-texture schemes.
4. Mustang III's real-world spec block names the D, and its FDM tail-wheel non-retraction flag conflicts with the 85° visual XML animation.
5. Official enclosure is explicitly skipped and its XML/geometry are absent; accurate original canopy motion cannot be recovered from these files.
6. Several null channels/ranges are source-resolvable: MiG elevon/nozzle properties, signed surface factors, wheel spin, original model-scope conditions and reheat scale/blend. The flattened condition summary loses boolean meaning, so the complete XML condition trees are used.
7. `gear_contacts_trusted` means close to the right wheel, not exactly at each visual tyre bottom. All four packages still need small recorded mesh fits. MiG's supplied well surfaces also fail tyre clearance at XML stow; fitted procedural interiors replace them.
8. The native daVinci/MiG parked heights disagree with their supplied real-height figures beyond 5%; these are unresolved source geometry/FDM/spec inconsistencies.
9. MiG reference photos 04, 05 and 07 depict a MiG-27, MiG-17 and decoy. Mustang references include a miniature and mostly Ds; they are not exact III references.

## References and procedural provenance

Paint/silhouette comparison uses the supplied author screenshots and these supplied photos. No reference photo, author screenshot or alternate-model file is included in `dist/`, the Site or the complete-project ZIP. Separate requested comparison images juxtapose our render and a supplied photo with attribution; they are not runtime assets.

- P-51D geometry comparison: [F-51 in a puddle, Korean War](https://commons.wikimedia.org/wiki/File:F-51_in_Puddle,_Korean_War.jpg), United States Air Force, public domain. Same D airframe; this photograph's service finish differs from Delivery Day / daVinci's Default paint. Paint follows each source texture set, not this photo.
- III silhouette comparison: [early North American P-51](https://commons.wikimedia.org/wiki/File:North_American_P-51_Mustang_(15954448569).jpg), SDASM Archives / Charles Daniels collection, public domain. Closest supplied razorback photograph, **not an exact B/C/RAF III**. The author's RAF side splash is the intended-paint reference.
- Variant cross-check: [P-51B-5-NA 43-6883, 1944 flight-test report](https://www.wwiiaircraftperformance.org/mustang/p-51b-6883.html), original Army Air Forces test data. Dimensions and four-blade 11 ft 2 in Hamilton Standard description are used as a B-family cross-check.
- MiG upper camouflage: [MiG-29 9.12, 14 blue](https://commons.wikimedia.org/wiki/File:Mikoyan-Gurevich_MiG-29_(9.12)_%E2%80%9914_blue%E2%80%99_(38100565051)_cropped.jpg), Alan Wilson, CC BY-SA 2.0.
- MiG grey/green panels and fin finish: [MiG-29 04 blue](https://commons.wikimedia.org/wiki/File:Mikoyan_MiG-29_%E2%80%9904_blue%E2%80%99_(38277698434).jpg), Alan Wilson, CC BY-SA 2.0.
- MiG front/intake/radome comparison: [museum MiG-29, 2016-08-16](https://commons.wikimedia.org/wiki/File:Mikoyan-Gurevich_MiG-29_in_Museum_of_technique_2016-08-16.JPG), Mike1979 Russia, CC BY-SA 4.0. This is the photo in the separate MiG comparison image; resized only. The composite is provided under CC BY-SA 4.0 for the photo/composite portion, preserving the source attribution.

All eleven `P51-other-models.zip` models were used only for visual comparison. **No part shape was borrowed.** The official canopy loft, daVinci propeller blade profile and MiG bay walls are original procedural fits to these aircrafts' own frames/hub/openings and actual tyre clearance. The canopy sill/frame tube radius 0.008 m and tessellation are stylistic choices. Gear stow clearance 0.002 m is numerical separation from the measured well boundary, not historical gear travel; the MiG's 0.025 m bay clearance is an explicit visual fit margin.

Material choices are explicitly artistic: glass tint `#a5beca`, opacity 0.23–0.24, roughness 0.13–0.14, IOR 1.5, metalness 0.08; opaque roughness bounded 0.42–0.90, specular intensity 0.28, environment intensity 0.5. MiG upper/light/dark colours are `#9da9a8` / `#bec8c8` / `#798b88`, radome `#59666c`, frames `#788887`, rubber `#242b2f`, gear `#9ba4a4`, nozzles `#46484a`. Grey boundaries use a smooth position pattern instead of a photo texture. These RGB values and pattern coefficients are reference-matched presentation choices, not facts in the downloads.

See `AIRCRAFT-NOTICE.md` for attribution and supplied licence status. The FGUK models remain private; a future public Site change needs the user's approval for those two models.
