# FlightGear additions: decisions before implementation

This audit was written before modifying the aircraft runtime. The four supplied `model.glb` files remain unchanged. Existing aircraft are outside the scope of these fixes. Measurements and checks are in native metres, with the nose toward −x, +y up and the left wing toward +z.

| Decision otherwise guessed | Authority to use | Treatment |
|---|---|---|
| Coordinate axes, side and units | `frame.fg_to_glb`, `frame.nose_points` | Use the verified transform; no additional model normalization. |
| Aircraft size | `real_world_specs.*_m`, `size_m`, individual mesh bounds | Remove strays first. Keep metre scale, never shrink the complete aircraft to fit helpers/effects. Compare parked height separately from level model height. |
| Hinge position and direction | `animations_from_xml[].glb_center`, `glb_axis_points`, `glb_axis_dir` | Rebuild transform groups around these axes while preserving neutral mesh positions. Do not trust baked clips or exported generic ranges. |
| Rotation/translation limits and signs | `travel`, `interpolation`, `factor`, `offset`; matching source XML | Clamp the driving property before interpolation and clamp its result to the XML travel. Resolve aliases and null property ranges from the source. |
| Main gear inward retraction | Gear entries in `animations_from_xml`; wheel and wing geometry | Apply the complete XML hierarchy/sequences and measure the stowed wheel positions, including hidden wheels. Visibility alone does not establish containment. |
| Door sequencing | XML interpolation; official P-51D `Nasal/gear-doors.nas` | Official inner doors open during the middle third of travel and sag open with the engine stopped. Other doors follow their own supplied tables. |
| Steering/castoring | Source property and FDM steering limits | Separate steering from gear extension; do not interpret a castor animation as retraction. |
| Parked pitch and floor height | `fdm_geometry.parked_pitch_deg_nose_up`, trusted `gear_contacts[].glb` | Use 13.69°, 14.61°, 13.64°, and 0.06° respectively; ground all contacts after pitching. Report tyre/contact disagreement. |
| Canopy motion | Canopy translation XML and `skipped_submodels` | daVinci has a 0.65 m slide. The official enclosure was omitted by the lab and its XML is absent; any replacement must be identified as procedural/reference fitted. No invented opening motion for the static Mustang III hood or MiG canopy. |
| Propeller diameter/count | FDM propeller geometry and `real_world_specs.prop_blade_number` | Official 3.5052 m/four; III 3.5 m/four. Check daVinci's 2.8 m FDM value against its 3.40 m real specification and original geometry before choosing. |
| Propeller centre/axis | Spin animation, not FDM thrust point | Retain only an original that spins concentrically. Record any procedural replacement and the diameter decision. |
| Hidden stores, pilots, effects, lights and screens | `shown_or_hidden_by_condition` plus complete source XML condition tree | Evaluate the actual comparisons/boolean rules. Every default-hidden mesh remains in the inspector, with a reason. Do not hide by broad name/category guesses. |
| Materials/glass | `material_warnings`, original GLB material, per-part glass identity | Correct IOR 1000, specular/roughness and glass opacity; keep frames opaque and respect texture alpha. Styling coefficients are explicitly artistic choices, not historical facts. |
| Texture restoration | `texture_by_part`, `textures[].original/file`, source effects | Restore only matching material/primitive mappings; do not overwrite multiple material slots with one texture. Preserve UVs, sRGB and image alpha. |
| Liveries | `livery_names`, `liveries.copied`, original livery XML | daVinci has 11 named sets. Official has one named Delivery Day scheme at several resolutions, not 18 distinct liveries. |
| Untextured MiG paint | Intended thumbnail and supplied web photos 01/02 (RF-92188), 08 (14 blue), 09 (04 blue), 10 (museum example) | Retain textured markings; grey reference paint only on primitives without usable paint. Cite photographs in the final report; never ship them. |
| Geometry repair, canopy/exhaust/guns/antennas | Actual missing geometry, `known_defects`, author images and correct-variant photos | Preserve the separate D bubble canopy and III razorback/Malcolm-hood forms. Reference-fitted dimensions must be labelled as estimates. |
| MiG elevon mixing | XML `left/right-elevon-pos-norm`, ±30° | Clamp pitch ± roll independently before the 30° rotation. Flaps/slats 20°, upper/lower airbrakes −56°/+60°, rudders ±25°, nosewheel ±50°. |
| MiG ground intake state | `/gear/gear[1]/wow` conditions and louver XML | Parked screens visible/louvers 60°; flight screens hidden/louvers closed. Expose a ground-intake inspection channel. |
| MiG reheat and nozzle petals | XML selection plus `Nasal/Mig-29.nas` | Reheat engages at 90% throttle; nozzle petals use their own throttle interpolation. Flame geometry is an effect and excluded from physical airframe length. |
| Eye point and sound scope | `eye_point`, `sounds_in_package` | Preserve metadata. No new cockpit camera or audio is required. |

## Comparison before choosing

- **Official P-51D:** accurate detailed airframe and four-blade propeller; tiedown geometry inflates span, and the lab omitted the canopy enclosure. Preserve its detailed meshes and restore Delivery Day textures.
- **daVinci P-51D:** useful bubble canopy and 11 complete liveries matching the author's screenshots; propeller centre/diameter and some exported hinges need verification. Preserve this D airframe, never substitute the III fuselage.
- **Mustang III:** correct razorback silhouette and RAF paint; duplicated door/wheel representations and the mismatched tail-wheel FDM flag need checking. Keep its distinct hood and four-gun airframe.
- **MiG-29:** recognizable Fulcrum geometry with detailed XML gear, intakes and tailerons; reheat/glow meshes inflate dimensions and numerous untextured primitives/IOR 1000 materials harm appearance. Preserve the author mesh and restore grey paint only where it is missing.

The 11 alternate Mustangs were compared as silhouettes only. No geometry, texture or image from that package is copied into the project. No part shape is borrowed from an alternate.

## Conflicts already identified

- Mustang III `real_world_specs.variant` describes P-51D, not B/C; it is an approximate comparison, not proof of III variant dimensions.
- Mustang III FDM says the tail wheel does not retract; its exterior XML explicitly rotates it 85° behind doors. Use the visual XML and record the conflict.
- The official enclosure is listed in `skipped_submodels` and neither enclosure geometry nor its animation XML is supplied. Its reconstruction cannot be completely fact-driven.
- The supplied MiG references include a MiG-27, MiG-17 and decoy. Exclude those from the paint/shape decisions.
- Trusted ground-contact records still differ from the visible tyre bottom by several centimetres; verify ground placement explicitly.

Further findings and measured results are recorded in `flightgear-results.md` after testing.
