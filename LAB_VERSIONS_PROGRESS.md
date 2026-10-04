# Lab versions progress

Branch: `lab-versions`. Baseline: `cd1fc73750cd4ac54894dcae896f62c0a33e2f57`. Existing ChatGPT modules, aircraft settings, tests, artifacts and README sections are protected. No push without a new user instruction.

## Shared helpers

- [x] Pack facts trimmed and original XML conditions preserved.
- [x] XML pivots, channels, interpolation, contacts, rotating parts, textures and liveries tested.
- [x] ChatGPT / Lab / Both selector and interleaved entries.

## Aircraft checklist

For each aircraft: audit → pack/source/images → candidates/proportions → rig/visibility/ground/paint → tests → live extremes/livery → inspector/compare artifacts → README → commit.

| Order | Aircraft | Status |
| --- | --- | --- |
| 1 | Spitfire Mk Vb | Done; pose-qualified height reference requested |
| 2 | Seafire Mk III | Done; source door/height review requested |
| 3 | Corsair F4U-1 | Done; source contact/taxi-spin defects recorded |
| 4 | F-16 | Partial exact-variant shape; rig/paint verified |
| 5 | Dauphin | Done; startup aliases / blade profile requested |
| 6 | EC130 | Implemented; tests pass; final live evidence pending |
| 7 | Bo 105 | Implemented; tests pass; live evidence pending |
| 8 | E-Flash | Implemented; tests pass; live evidence pending |
| 9 | Macchi M.33 | Implemented; tests pass; live evidence pending |
| 10 | Supermarine S.6B | Implemented; tests pass; live evidence pending |
| 11 | Macchi M.C.72 | Implemented; tests pass; live evidence pending |
| 12 | Caproni Ca.60 | Partial; geometry/paint preserved; live evidence pending |

## Pack-builder issues found during initial reads

- Visibility records flatten Boolean operators; Lab packaging must read source XML.
- Broad node categories include structural parts and instrument dials; they cannot be used as hide lists.
- Channel labels conflate compression, caster, rotor pitch, radiator, trim and external surfaces; use the driving property.
- Four texture-by-part arrays are truncated at 400 entries. Some exterior bindings are absent.
- Alternate licence metadata is unknown in the packs. User subsequently confirmed on 2026-10-03 that licensing is sorted for all supplied alternates and authorized borrowing. Borrow only where reference comparison supports an improvement; record provenance without inventing licence identifiers.
- F-16 is a YF-16/PW source variant; supplied specifications are for F-16C.
- Bo 105 parked pitch includes an auxiliary skid and disagrees with main-skid contacts.
- E-Flash 2.04 m is an XML hinge height, not an established sail translation.

## Spitfire Mk Vb guess audit (written before implementation)

| Baseline guess/decision | Pack/source replacement |
| --- | --- |
| Ailerons ±16°, elevators ±12°, rudder ±12° | XML exterior animations: ±20°, ±15°, ±15° |
| Six flap panels rotate 25° continuously | Source flap factor ±86; two-position flap lever in source |
| Main gear anchors (2.48,−.767,±.65), 85° swing | Exact XML axis lines (2.43,−.75,±.663)→(2.53,−.785,±.637); travel ±91.1°, .07/.93 sequence |
| Gear doors same typed anchors, 78° | XML separate axes, ±96° |
| Tail anchor (8.49,−.37,0), −65° retraction; hide wheel in flight | Source caster only; `gear_contacts[2].retracts=false`. Keep fixed tailwheel visible |
| Canopy 0.65 m along +X | XML 0.570 m, including frame and hood catch |
| Prop radius1.68, hub(.4,0,0), three procedural blades | Keep sound original three blades; FDM radius1.638. Spin on XML X-axis (centre−.4 lies on the same shaft) |
| Spinner color #62715e | Original embedded paint, no recolor |
| No Vb wing fold, implicit82° reused naval parameter | Vb set owns no folding/hook controls; omit them |
| Hide Rain/Propeller/Spinner/Chocks by regex, Pilot and i36_mk1 | Source Boolean select conditions; retain sound original rotor and real variant parts; hide only false conditions with reasons |
| Canopy glass tint#608699, opacity.4, roughness.22, metalness.05 | Source effects/transparent materials and original textures, baseline `repairMaterials`; avoid treating frame as glass |
| Fold quaternion±82°, main gear hidden below.015, doors78°*gear | Vb no fold; gear remains inspectable, XML sequences put tyres in wells; no visibility threshold guess |
| Ground pitch fitted with tyre names | FDM target12.04°, compare actual tyre geometry; record any contact discrepancy |
| Animation smoothing rate7; roll/.65, pitch/.58, rudder follows roll | Technique retained per catalogue; limits and handedness sourced from XML/FDM |
| Blade shape/tips/hub and rotor speeds4+95*throttle invented | Preserve original geometry/paint and XML spin factor with FDM RPM |
| Shared visibility/material categorization | Lab-specific reasons and source conditions; protected shared module unchanged |

### Spitfire checklist

- [x] Guess audit
- [x] Source/XML and intended-look images
- [x] Base/alternate comparison and proportions
- [x] Rig, conditions, contacts and original paint
- [x] Tests and full baseline suite
- [x] Live parked/flight/control/livery checks
- [x] Inspector and comparison images
- [x] README row and aircraft commit

# Seafire Mk IIIc Lab guess audit (read-only code review)

Pack: `fg-spitfire-seafireiiic-e1e7c198`; original module `src/additional-aircraft.js:18–55`, `src/rotors.js:38–56`, README additional-aircraft Seafire row. Read CHANGE_CATALOGUE first. Preserve original modules/tests/artifacts/README section unchanged.

## Guess audit

| Original decision/value | Pack / original source authority | Lab action |
|---|---|---|
| `id === 'seafire'` selects naval variant inside shared Spitfire function | `fg_sets=[seafireIIIc-set.xml]`, set model `Models/seafire_model.xml`, original `.ac=seafireIIIc.ac` | Separate Lab module; keep exact naval geometry and source Seafire paint, do not derive its appearance from Vb |
| Hide every name matching `Rain|Propeller|Spinner|Chocks` | Source select XML: rain layers visible iff `raining-norm > .01`; Propeller visible iff RPM <1000; PropellerDisk iff RPM >900; spinner visible exterior, not cockpit | Hide rain and blur disc at dry rest; preserve original sound four solid blades and spinner instead of replacing all. Chocks if any need stated equipment reason |
| Hide pilot subtree | XML pilot selection `(not show-pilot) OR view-number !=0`; head visible iff external view | Crew hiding can be stated inspector policy, but source external-rest condition actually shows pilot. Do not hide `Bulkhead-F` or `Headrest` just because pack loosely categories them as crew |
| Hide `i36_mk1` | `Models/rgs-mk2.xml` empty select on mk1/mount-back | Source selects MkII sight; quarantine MkI/mount-back with explicit source reason |
| Hide arrester hook as equipment | `Arrester-Hook` is genuine Seafire part with two XML animations | Keep visible stowed; add hook channel 0–60° about GLB (5.91,-.6,0), axis -Z. Collision compression second rotation about +Z remains 0 in inspector |
| Blue glass tint `#608699`, roughness .22, metallic .05, opacity .4, DoubleSide, depthWrite false | Glass effect names precisely Canopy-Main/FP/F/Rear; effect specifies transparency/reflection and `plexi_1.png` normal, no blue tint | Keep original clear/neutral glass material with physically sensible repair; avoid applying glass to solid frame. Normals optional source asset |
| Aileron hinges fitted by leading-edge geometry | Frame fit 0m/trusted; exact XML two-point axes | Use exact axes: left (3.568,-.5052,3.2393)→(3.2956,-.3692,4.4698), right mirrored Z |
| Aileron ±16° | anim 1/2 tables ±20° | Left interpolation -1→+20,0→0,+1→-20; right -1→-20,0→0,+1→+20. Axis vectors themselves mirror Z, so evaluate travel and physical directions correctly rather than adding an extra blind sign |
| Elevator ±12°, both fitted | anim9/10 ±15°, XML axes | Left (8.36,.23,.05)→(8.37,.23,.77), factor -15; right mirrored Z, factor +15 |
| Rudder ±12°, geometry fitted Y | anim11 **±30°**, factor -30, axis (8.51,1.2,0)→(8.51,-.29,0) | Use ±30. This differs from prompt/catalogue's claimed ±15; facts agree XML. Include child rudder lamp where present |
| Six flaps -25°, fitted hinges | anim3–8 ±86 (sign opposite per side), normal channel; Nasal flap lever two positions | All six split flaps 0 or86°. Left factor -86 with axis +Z; right +86 with axis -Z. Inner axes (4.04,-.8,±.37)→(4,-.8,±.77); outer axes (4,-.8,±.77)→(3.89,-.71,±1.85). Retain outer child under fold |
| Main gear anchor (2.48,-.767,±.65) | anim18/19 exact line (2.43,-.75,±.663)→(2.53,-.785,±.637) | Oblique axis, not X alone. Original model is down at rest; apply direct XML -91.1/+91.1 at gear0 and 0 at gear1 |
| Main gear ±85° ×(1-gear), hide wheels when gear<.015 | anim18/19 gear table 0→±91.1,.07→same,.93→0,1→0 | Preserve visible meshes even retracted, they should tuck into well; use table with .07/.93 dead bands, verify containment |
| Gear doors same guessed leg anchor, ±78°×gear | anim16/17 exact line (2.36,-.81,±.67)→(2.48,-.85,±.64), table 0→0,1→±96° | Use exact axes and ±96 with source-rest offset; door meshes are closed at imported rest, while XML gear1 gives ±96 down. Apply the full table directly; legs are down at imported rest and XML gear1 gives 0 |
| Tail anchor (8.49,-.37,0), swing -65°×(1-gear), hide near flight | XML tail wheel only castors; FDM retracts:false; exact caster center(8.2778,-.5023,0), +Y axis | Never retract or hide fixed tail wheel; caster0 held neutral unless separate supported caster channel supplied |
| Canopy 0.65m along +X | anim28 +.570m along +X, moves Canopy-Main,Frame-Main,Hood-Catch | Include frame and catch. Pawl/lever compound independent XML motions need defaults, not all mapped automatically from canopy slider |
| Fold ±82° about existing wing parent's X | anim38–41 main folds ±110°, separate tips ∓110° | Main X-axis line from(1.38,-.46,±1.85) to(4.35,-.46,±1.85). Tip X-axis from(1.38,-.36,±4.88) to(4.35,-.36,±4.88). Main left -110/right+110; tips left+110/right-110, inherited under main folds |
| Four procedural blades at (.4,0,0), radius1.68 | FDM radius1.638; real_world_specs blade count4. XML spin axis(-1,0,0) center(-.4,0,0) | Original blades radius≈1.679 already within2.5% FDM and spin sound; retain rather than replace. If replacement needed choose radius1.638 and spinner's actual mesh plane≈X.4. XML X -.4 is only an arbitrary position on identical X-axis line, unsuitable physical hub X |
| Procedural spinner `#abb8b7`, cone radius.324/length.52, offsetX-.13, roughness.52 metallic.12 | Original textured spinner exists, boundedX .00778–.53585 and radius.3245 | Preserve original source texture/geometry instead of invented silvery material |
| Procedural blade dark `#25333c`, gold `#e8bd53`, hub `#7f919c` and blade profiletwist28–10° | Original fourblade source mesh and texture | Keep actual mesh/paint; no blade geometry guess necessary |
| Procedural spin dt×(4+95×power), positive X | XML rpm×.477, axis -X | Use XML spin factor sign/rpm; if retain baseline arcade speed, document speed as interface simplification. Caster/wheel spins not same as engine |
| Park pitch fitted from tyres | FDM target12.04° nose-up, contact points (2.2,-2,±.87),(8.48,-.66,0) | Target source12.04° and compare mesh-derived pitch within1°; contacts y differs front mesh by.018m |
| Controls roll/.65, pitch/.58, rudder followsroll; smoothing rate7; idlepower.05 | Catalogue explicitly keeps mapping/smoothing | Preserve flight mapping, independent inspectorrudder; ranges from XML |
| fields gear/fold/canopy/flaps/aileron/elevator/rudder/engine | XML additionally side door -170°, radiator flap70°, hook60°, pawls/lock lever | Add supported hook and door; radiator mapped separate cowl channel; leave cockpit lock logic recorded if impractical |
| resetVisibility baseline eachconfigure; never baked mixed clips | Catalogue technique retains | Keep baseline mechanism with hidden reasons and restored quaternions; zero spin delta leaves static prop |
| Source textures retained only, no livery options | Source Seafire seafire-tx00..03 present; livery_names=[]; no copied liveries | One default named source Seafire MkIIIc livery, no invented Vbpaint switch. Supplement lost RGB lights only when nodes+UVs match |
| Baseline repair IOR1.5,specular.25,rough≥.48,metal≤.3,sRGB/aniso8 | Pack78 highIOR materials (1000), noisy alpha etc | Keep baseline fix. Preserve texture alpha only where actual cutout; normals/reflection maps aren't basecolor |

## Schema pitfalls and pack corrections

1. Rudder conflict: Seafire actual XML `factor -30` and pack `travel[-30,30]` (prompt/catalogue says15). Pack is right here.
2. `shown_or_hidden_by_condition.condition_values` omits the operator tree. Not enough to distinguish rain `>` from canopy `<=`, prop `<1000` from disc `>900`, or exterior `not(equals(view,0))`. Normalize condition AST from `source` before runtime. Use exterior view1, dry0, engine0 defaults.
3. Conditions have `objects` but **no glb_nodes**, and repeated generic object names occur in many submodelinstances. Resolve each XML's instance, not all suffix matches (`disk`, `mk1`).
4. Channel is heuristic: `gear` includes compression translations, unbounded caster, wheel spin, cockpit indicators, hook collision; `flaps` includes radiator70° and lever-90/+20; `elevator` includes trim105°, controlsstick and cylinder1440. Never drive every animation on heuristic channel blindly; filter exact properties or define property resolver with defaults.
5. glb_nodes list includes both movable objects and their `pivot_*` ancestors. Collapse ancestors/descendants to prevent duplicate reparenting. Different rotations/translations on same object require nested pivots and delta relative to current imported pose.
6. Import GLB pivots carry guessed fg_range values e.g fold[-25,25] and hook[0,90] while pack XML specifies110 and60. Trust actual XML/packtravel, not glbextras.
7. Main gear glTF is extended at zero quaternion and XML gear1=0°. Doors glTF are CLOSED at zero quaternion; XML gear1=±96° lowers them. Apply exact XML tables directly, while preserving the independent geometric rest. Tip fold pivot must inherit main fold.
8. FDM propeller fg/glb position(1.42,-.45,0) is thrust point, not visualhub. XML prop center X-.4 is collinear axis but not near bladeplane X.4. Original rotor preserved avoids misplaced newhub. Spinner packcenter-.4 conflicts GLB pivotcenter.2718 but spin still same Xaxis.
9. node_categories contains obvious falsepositives/truncation: `crew` lists cockpit screwheads and Bulkhead/Headrest; `groundequipment` lists genuine cowling covers; `blurdisc` every instrumentdial `disk`; `externalstores` genuine fuel cover/supportbrackets. Do not hide all categories. The `...93 total`/`...78 total` placeholders are not nodes.
10. `exterior_textures_missing_from_glb=6` misleading: missing textures are green/red/white lightRGB conversions, navswitch/switchRGB and seafireIII-map01 (**reflectionmap**, not exteriorpaint). Existing basepaint seafire-tx00..03 is embedded. TextureByPart includes duplicated sameacobject + ambiguousgeneric nodes acrossinstances. Preserve mappedcurrenttexture unless exact mapping known.
11. livery_names empty and no copied liveries. No real liveryswitch alternatives exist in this source; don't invent names.
12. Intended-look splash/thumbnail are **Spitfire IIa**, notSeafire (splash caption explicitlySpitfireIIa). Use model's actual navaltextures first. Pack should supply Seafire-specific authorintendedimage.
13. Web reference pack mostly MkXV/XVII, wrongvariant for MkIII canopy/hook/engine. Period images03/05 offer earlySeafire and are bettershapechecks; period carrierdeckphoto shouldbe added for unequivocalMkIII foldingtip layout.
14. ALTERNATES claims29sameaircraft but almost all are otherSpitfiremarks (XIV,Vb,Vc,IIa,VIII,IX) and alllicensesunknown. Do not borrow bydefault. Base navalmodel already has correcthook/tips/fourbladeprop. Need matching licensedSeafireIII alternate for meaningfulborrowing; comparison can still showbase/Vb/markednonmatchingalternates.
15. FDM gearcontact list duplicates fixedtailpoint and contains nonwheelcollisionpoint(3.9,.7,0) nearestwrongcockpitneedle. Filter is_wheel and deduplicate. Trusted applieswheelcontacts only.
16. SourceFDM radius1.638 is reusedVbdiameter; no Seafire-specificsourceblade diameter beyondthat. Original4bladegeometricradius1.679 fits3%tolerance, preferable to scalingwithoutsource.

## Proportions and record-only fields

`size_m` 9.093×3.751×11.302 (length,height,span). RealMkIII 9.207×3.493×11.227. Length -1.24%, span +.67%, height +7.39%. Height bounds includes propellerblurdisc top1.768 vs lowerextendedgeary-1.982; propdisc shouldbe hidden. Recompute visiblebounds afterdryrest/quarantines before asserting5%. Taildownheight vs leveldifference shouldbe documented. Do not uniformlyscale just to correctheight.

Eye `(3.8755,.5181,0)`, pitch-10°, FOVnull; recordonly. Sounds merlin_rpm1/rpm4/shutdown/starter, spita, canopy_slide; recordonly, don'twireaudio.

Local visual review: `reference/contact.jpg` showsnavalgreycamouflage/blueroundels,4bladeoutlineanddisc exportoverlay; `reference/flightgear/Spitfire_splash.png` clearlywrongIIavariant, notnavalpaintauthority. Source geometry has allnecessary navalparts. No borrowedalternates recommended.

Additional primary museum reference found: [Australian War Memorial 019032](https://www.awm.gov.au/collection/019032), Jim Fitzpatrick, 1945, public domain: mechanics unfolding Seafire wings aboard HMS Implacable. Direct image page link is `https://s3-ap-southeast-2.amazonaws.com/awm-media/collection/019032/screen/4098738.JPG`. This is a better period folding-mechanism check than the pack's later MkXV/XVII photos. Local pack photos03/05 visually show later low-back examples with larger noses; treat them only as broad Seafire layout examples, not exact III variant proof. Pack needs an identified MkIII image.

## Implemented result and validation

`src/lab/seafire.js` exports `prepareSeafireLab`. It drives only source exterior properties; source animation tables and axes determine every numeric travel limit. Original four solid propeller blades and spinner are retained, as are the naval paint maps. Caster and compression stay at source neutral, with the fixed tail wheel visible. Compound collision-driven hook compression is recorded but not simulated by the static inspector. Main fold and tip fold preserve source nesting. Source categories are advisory; condition application is scoped to matching instances rather than generic object names.

The level-flight bounds are 9.093 × 11.302 × 3.357 m (length × span × height), compared with source MkIII specifications 9.207 × 11.227 × 3.493 m: errors -1.24%, +0.67%, -3.90%. The raw imported GLB's height was 3.751 m (+7.39%) because its propeller blur disk overlapped the solid blades and gear was extended. After correct dry-rest conditions and source flight pose, all three proportions fit 5%. The unmodified ChatGPT flight version measures 9.091 × 11.302 × 3.360 m; its parked folded span is 5.098 m versus Lab 4.231 m. ChatGPT tire-fit parked pitch is 11.900°; Lab uses FDM 12.04°. The meaningful difference is naval mechanism accuracy, not invented rescaling.

Solid source propeller diameter is 3.357 m versus FDM 3.276 m (+2.46%, within the required 3%). Source spinner and solid blade geometry are complete and spin about the XML X axis. No alternate geometry is borrowed; the supplied alternate licences are unknown and most models represent other marks.

`node tests/lab/seafire.test.mjs` passes. Tests exercise all controls at both endpoints and overshoot; exact surface/fold/hook/canopy/door/radiator travel; opposite physical ailerons and matching elevators; two-position flaps; gear dwell tables and mirrored doors; real wheel containment in each wing without hiding; fixed tail wheel; contact-derived pitch; inherited tip folds; visible naval hook; proportions and diameter; source texture colourspace/orientation/restoration; false-positive category protection; pause/spin; and a comparison fixture verifying untouched ChatGPT limits.

Remaining / lab requests: source gear doors extend roughly 0.117 m below the tyre datum in level extended pose when driven to the exact XML 96°; review the source door geometry/axis against an identified MkIII undercarriage drawing rather than clipping it arbitrarily. Pack needs a MkIII-specific author thumbnail and period reference. It also needs condition instance IDs and correctly classified categories, and should distinguish reflection maps from missing exterior base textures. No sounds or cockpit camera are wired; eye point and source sound list are recorded in the report. Static inspector does not simulate flap blow-back, tail castoring, landing compression or arrested landing dynamics.

## README row for the new Lab table

| Supermarine Seafire Mk III · Lab | Keeps the original naval paint, four solid blades and spinner. Replaces 82° fold with source 110° main-wing and opposite tip folds; restores the visible arrester hook (0–60°); fixes the tail wheel as non-retracting; uses XML main gear 91.1°, doors 96° and dwell sequence; ailerons ±20°, elevators ±15°, rudder ±30°, split flaps 0/86°, canopy 0.57 m, side door 170° and radiator flap 70°. | `fg-spitfire-seafireiiic-e1e7c198`: trusted frame fit 0 m, `seafire_model.xml`, `seafireIIIc-set.xml`, FDM 12.04° parked pitch, 1.638 m propeller radius; original source diameter 3.357 m fits 3%. [1945 Seafire wing unfolding, Australian War Memorial](https://www.awm.gov.au/collection/019032). No alternate geometry borrowed. | Pack rudder travel ±30° overrides overview's ±15°; source paint overrides the pack's Spitfire IIa splash. No alternate liveries supplied. Source gear-door lower edge requires lab review; compression/caster dynamics omitted. Eye `(3.8755,0.5181,0)`, pitch −10°; Merlin/starter/shutdown and canopy sounds recorded for later. |

### Vought F4U-1 Corsair — guess audit (read before implementation)

Protected baseline: `src/corsair.js`, README existing Corsair paragraph. Pack: `fg-f4u-8cea7feb`. Frame is verified (`frame.fg_to_glb.median_error_m=0.0`, 50 samples): x aft, y up, z left, metres. Do not apply another axis swap to GLB. All fact `glb_*` coordinates are already converted.

| Baseline number / decision | Lab value / decision and exact authority |
|---|---|
| Geometry-fitted aileron/elevator/rudder hinges | Use each source XML hinge: `animations_from_xml[52..54,60,62]`. This pack's frame is trusted; geometry fit only checks it. |
| Ailerons ±18°, opposite sign | XML factor 18 on `controls/flight/aileron`, opposite oriented L/R hinge lines; source input normalized −1..1. `travel` is null because parser fails to recognize this property range. Retain ±18 with provenance, rather than interpreting null as zero or unbounded UI. |
| Elevators ±14° | XML table −1→−30, 0→0, +1→+20 about GLB −z (`[53,54]`). Preserve asymmetric travel. |
| Rudder ±12°, negated UI | XML factor +30, travel ±30 about GLB +y (`[52]`). UI property mapping must state rudder sign. Flight model rudder output inverts/squares controls; inspector drives `surface-positions/rudder-pos-norm` directly. |
| All six flaps −25° about fitted leading edge | XML ±50°, signs follow each oriented hinge axis (`[48..51,59,61]`). Folded wing flaps remain children of the corresponding outerwing group. |
| Left/right gear groups at `(2.332,−.78,±1.632)` | Anchors match XML `[2,16]`; keep values, but use XML's separate pivots and nested motions rather than gathering all hardware into one group. |
| Main legs retract 95° around +z | XML legs 86° about +z at gear0 (`[2,16]`); wheels 84° about same axis (`[7,20]`), then a 90° wheel/lower-leg twist about ±y (`[8,21]`). Never hide wheels just to conceal a wrong path. |
| All wheel/leg meshes hidden for gear≤.015 | XML only hides `gearp1.L/R` at extension≤.56. Retracted wheels remain visible geometry inside bay. Remove generic hide threshold, preserve revealability of genuine conditional parts. |
| Tail gear anchor `(8.345,−.522,0)` and −80° retract | That anchor is **caster** axis, not retraction. Retraction XML `[29]` is +53° about +z at `(7.843,−.254,0)`. Caster XML `[55]` tilted line `(8.351,−.567,0)`→`(8.332,−.472,0)`, direct degrees, no stated bound; neutral caster0 until independently supported. |
| Gear doors −72° front/doorlogo, ±65° side | Front doors/doorlogo are0→86° extension around −z (`[3,4,17]`). Side outer doors table `[[0,0],[.1,−86],[1,−86]]`, inner table `[[0,0],[.2,60],[1,60]]` with source mirrored axes (`[5,6,18,19]`). Tail doors ±70°, reach open at extension .1 (`[30,31]`). |
| Main hardware rigid only | XML links independently travel: primary folding link50°, secondary10°, fixed link105° (`[9..11,22..24]`); cylinder translates .4m along raw `(1,1,0)` (`[12,25]`). Source translate axis length may matter; do not normalize it if FlightGear does not. |
| Omitted gear compression | Wheels/lower legs have .16→.32m +y compression tables (`[13,14,26,27]`); tail table .1→.03→0 along `(−.2,1,0)` (`[32]`). Default compression should be documented, not conflated with gear extension. |
| Wrong wheel spin/caster copied pack facts | Pack `[28]` rightwheel spin incorrectly references gear0 and center left z1.939; source XML has the same error. Do not animate taxi spin in scope; record source defect. |
| Hook always hidden | Real variant contains `i0_hook`; retain stowed and provide hook0..1, XML70° (`[36]`) plus source gear-linked transforms53°,55°,25° and .1m (`[29,33..35]`). Hook own XML center z1.626 is wrong side-offset (actual hook z≈0 and FDM hook yFG0); use source FDM/world geometry hinge check, document correction. |
| Wings fold ±85° about pure x | XML95° about tilted axes: left `(−1,−.15,.06)`, right `(1,.15,.06)`, at `(3.038,−.68,±2.278)` (`[57,58]`). |
| Canopy travels .7m | Correct source .7m +x for both frame and glass (`[56,65]`); retain. |
| All cowl pivots8° around ±y | XML ten named sides plus bottom cowlflap6: signed ±30° about individual circumference hinge lines (`[37..47]`). Bottom flap lacks baked pivot, but source XML still defines hinge. |
| Procedural radius `max(cowling y/z extent)×1.2` | FDM `propellers[0].radius_m=2.03` (diameter4.06m). Prefer intact original solid propeller after checking shaft and tip radius; baseline replacement only if confirmed broken. |
| Three procedural blades | Correct F4U-1 and original source mesh, author thumbnail + museum F4U-1D photograph. `real_world_specs.prop blade number=4` belongs to **F4U-4**, wrong variant. FDM pack omits blade count; derive3 from model/image and record explicit reason. |
| Procedural hub at cowling.min.x−.36, cowling.center.y/z | Spin shaft center `(3.4,0,0)` is any point on x-axis, **not visual hub x**. Actual hub mesh bounds x−.0098.. .5425, solid prop x≈same, shafty/z0. FDM thrust point(.45,0,0) likewise not automatically visual hub. Keep original. |
| Procedural radial root .12m, width .12+.21sin(πt^.75), tip narrowing .6, thickness .032(1−.55t), twist31−17t°, sweep .11t² | Unsupported geometric guesses; all replaced by original source blade geometry if viable. The 20 rings/8sections are tessellation, not source dimensions. |
| Procedural hub radii .16/.19, length .43, 24segments; nose r.17, x−.215, scales .68; 3blades evenly spaced | Keep source original hub/blades; no replacement numeric guesses. Tessellation is rendering decision. |
| Blur disc r.23..prop radius64segments, opacity .045 above throttle.3 | Original rpm-driven discs: slow1000<rpm<1701, fast rpm>1700; prop visible rpm<1051; hubturn rpm>1000 (`shown_or_hidden_by_condition`, actual XML comparators). Texture alpha may need repair because pack says disc no cutout; explicit source blur is rendering option. |
| Spin rate5+throttle100 radians/sec, idle throttle .06, positive x | XML solid prop factor−.479 with engine rpm; FDM gearratio .479, prop rpm886cruise/1293takeoff, engine2700. Preserve XML sign; convert degrees/sec/rpm consistently. Engine-off zero spin. |
| Hide all external loads / rockets / rails by name regex | Source set sim/weight[0..4]/selected all`none`, `loads.xml/lwing.xml/rwing.xml` select conditions. Hide with reason and quarantine names, no indiscriminate part loss. |
| Glass named frontglass/canopyglas, tint#28495a opacity.43 metalness.1 roughness.24 | Names supported by `transparent.xml` chrome shader and texture glass_shader.png. Tint/material numbers are Three.js rendering choices, not historic colors; use source reflection texture/intended image and restrained transparency. `node_categories` overincludes opaque canopy frames—don't make all category entries glass. |
| Blade paint#171c24/yellow#efc34e, metal .45/.2, rough .32/.4; hub# aeb9c5 metal.8rough.24; blur#222b37 | Source model/texture has black blades/yellowtips, metallic hub. Use own texture f4u-1.png. No new paint invented. |
| Existing original texture only | Apply originals via `texture_by_part`, preserving UVs, sRGB, flipYfalse. Add real **US Marines** (default fallback f4u-1/2/3) and **US Navy** f4u-1a/2a/3a. Source `f4u-set.xml` livery file empty means default fallback Marines. |
| Original IOR1000 etc | `material_warnings.ior_too_high`12 entries, baseline repairMaterialIOR1.5/spec.25metal≤.3rough≥.48 allowed rendering correction. Logos/numbers cutout texture metadata explicitlytrue. |
| Parked angle from tire geometry | FDM target12.9° (`parked_pitch_deg_nose_up`) first3 retracting wheel contacts only. Verify against tire vertices within1°, note contact offset inconsistencies. Never use belly emergency contacts for parked pitch. |
| Common smoothing9, roll÷.65 pitch÷.58, rudder follows roll | Explicitly retained behavior per change catalogue§11. Inspector independent rudderchannel required. |
| Config default fold1parked, gear1parked, canopy0flaps0cowl0engine0 | Existing general presets retained per catalogue, but exact download starts canopy1fold1cowl1. Record inspectorpreset differs source startup; source flight/parked purpose controls reason. |
| Geometry scale inferred from imported dimensions | Pack10.18×12.447×4.822m. Source is F4U-1; Wikipedia10.262×12.497×4.496m is F4U-4. Length/span within.8%/.4%, height7.25% difference variant/pose/gear, no automatic scaling. |
| Sounds/eye not recorded | Eye `(5.1,1,0)` pitch−7.5°FOVnull fromset. Sounds empty; set references external Aircraft/p51d/p51d-sound.xml, not packed. Record missing audio; don't invent or wire now. |

Pack shortcomings to report to lab:
- The only alternate **A-7E Corsair II** is a jet sharing a name, not this F4U; unknown licence. Do not borrow it. Multiple Phantom/Rolls-Royce car references are unrelated noise, and F4U-4B examples are wrongvariant. Preferred check is `05_F4U-1D...jpg` (Acroterion CC BY-SA4.0) and F4U-1 three-view14, cited without shipping image.
- `shown_or_hidden_by_condition` discarded operators/Boolean trees and `glb_nodes`. Runtime needs XML-derived conditions, not its ambiguous `condition_values` text; parse AST and map node categories/full source instance names.
- `fdm_geometry.gear_contacts_trusted=true` means point-to-bounds proximity, **not bottom-of-tyre agreement**: mains y−2.32 vs mesh−2.532 (.212m), tail−.9 vs−.997 (.097m). Pack marks belly contacts as `is_wheel:true`, although source comments label bellygear and ignored-by-solver1.
- `real_world_specs` F4U-4 instead of source F4U-1 and4blades not3. Do not enforce wrongvariant geometry assertions.
- `animations_from_xml[36].glb_center` hook z1.626 is inherited XML typo versus actualhookz0 and FDM. Source itself rightwheel spin references leftwheelcenter/property. Full transformation order/hierarchy is needed, not onepivot per part; don't reparent duplicates independently.
- Aileron travel parsernull misses normalized `controls/flight/aileron`range; source factor18 clear. Tailcaster unbounded directproperty can be parkedzero but not guessed userlimits.
- `texture_by_part`pilottexturesmissing has noGLBnodes. Converted rgb→pngtexturealiasmapping required. `primitives_without_uv=32`; cannot apply paint without UV, retain source untextured material.
- `intended_look_images` splash selected texture is a tiny pale blurcircle, not actual splashphotograph. Thumbnail usable but lowresolution.
- `sounds_copied` and packageaudioempty despite setexternalp51dsoundreference. Need upstreamexternaldependency to provide engineaudio.

Recommended Lab geometry choice: exact model GLB; no alternate borrowing. Real-source rig correction is the primary gain (86°gear+90°twist,95°fold,50°flaps,30°cowl/rudder,asymmetricelevator,hook), then two authored liveries.

#### Exact source animation schedule (array indices used above)

| # | Objects | Property | GLB hinge / axis | Travel / interpolation |
|---|---|---|---|---|
| 0 | hubturn | `engines/engine[0]/rpm` | `[3.4, 0.0, -0.0]` / `[1.0, 0.0, -0.0]` | `{'factor': '-0.01', 'travel': None}` |
| 1 | prop | `engines/engine[0]/rpm` | `[3.4, 0.0, -0.0]` / `[1.0, 0.0, -0.0]` | `{'factor': '-0.479', 'travel': None}` |
| 2 | gearleg.L, gearleg2.L, gearsc1.L, gearp2.L, gearsc2.L | `gear/gear[0]/position-norm` | `[2.332, -0.78, 1.632]` / `[0.0, 0.0, 1.0]` | `[[0.0, 86.0], [1.0, 0.0]]` |
| 3 | geardoorfront.L | `gear/gear[0]/position-norm` | `[2.332, -0.78, 1.632]` / `[0.0, 0.0, -1.0]` | `[[0.0, 0.0], [1.0, 86.0]]` |
| 4 | doorlogo.L | `gear/gear[0]/position-norm` | `[2.332, -0.78, 1.632]` / `[0.0, 0.0, -1.0]` | `[[0.0, 0.0], [1.0, 86.0]]` |
| 5 | geardoorleft.L | `gear/gear[0]/position-norm` | `[[3.194, -0.948, 2.139], [4.088, -0.883, 2.136]]` / `from points` | `[[0.0, 0.0], [0.1, -86.0], [1.0, -86.0]]` |
| 6 | geardoorright.L | `gear/gear[0]/position-norm` | `[[3.25, -0.846, 1.089], [4.088, -0.715, 1.114]]` / `from points` | `[[0.0, 0.0], [0.2, 60.0], [1.0, 60.0]]` |
| 7 | wheel.L, wheel1.L | `gear/gear[0]/position-norm` | `[2.332, -0.78, 1.632]` / `[0.0, 0.0, 1.0]` | `[[0.0, 84.0], [1.0, 0.0]]` |
| 8 | wheel.L, wheel1.L, gearleg2.L | `gear/gear[0]/position-norm` | `[2.332, -0.78, 1.632]` / `[0.0, 1.0, -0.0]` | `[[0.0, 90.0], [1.0, 0.0]]` |
| 9 | gearp2.L, gearp1.L | `gear/gear[0]/position-norm` | `[2.376, -1.281, 1.632]` / `[0.0, 0.0, 1.0]` | `[[0.0, 50.0], [1.0, 0.0]]` |
| 10 | gearp1.L | `gear/gear[0]/position-norm` | `[2.839, -0.832, 1.626]` / `[0.0, 0.0, -1.0]` | `[[0.0, 10.0], [1.0, 0.0]]` |
| 11 | gearp3.L | `gear/gear[0]/position-norm` | `[2.989, -0.982, 1.626]` / `[0.0, 0.0, -1.0]` | `[[0.0, 105.0], [1.0, 0.0]]` |
| 12 | gearcylinder.L | `gear/gear[0]/position-norm` | `translate` / `[1.0, 1.0, -0.0]` | `[[0.0, 0.4], [1.0, 0.0]]` |
| 13 | wheel.L, wheel1.L | `gear/gear[0]/compression-norm` | `translate` / `[0.0, 1.0, -0.0]` | `[[0.0, 0.16], [1.0, 0.32]]` |
| 14 | gearleg2.L | `gear/gear[0]/compression-norm` | `translate` / `[0.0, 1.0, -0.0]` | `[[0.0, 0.16], [1.0, 0.32]]` |
| 15 | wheel.L, wheel1.L | `gear/gear[0]/rollspeed-ms` | `[2.312, -2.112, 1.939]` / `[0.0, 0.0, -1.0]` | `{'factor': '-20.0', 'travel': None}` |
| 16 | gearleg.R, gearleg2.R, gearp2.R | `gear/gear[1]/position-norm` | `[2.332, -0.78, -1.632]` / `[0.0, 0.0, 1.0]` | `[[0.0, 86.0], [1.0, 0.0]]` |
| 17 | geardoorfront.R | `gear/gear[1]/position-norm` | `[2.332, -0.78, -1.632]` / `[0.0, 0.0, -1.0]` | `[[0.0, 0.0], [1.0, 86.0]]` |
| 18 | geardoorleft.R | `gear/gear[1]/position-norm` | `[[3.194, -0.948, -2.139], [4.088, -0.883, -2.136]]` / `from points` | `[[0.0, 0.0], [0.1, 86.0], [1.0, 86.0]]` |
| 19 | geardoorright.R | `gear/gear[1]/position-norm` | `[[3.25, -0.846, -1.089], [4.088, -0.715, -1.114]]` / `from points` | `[[0.0, 0.0], [0.2, -60.0], [1.0, -60.0]]` |
| 20 | wheel.R, wheel1.R | `gear/gear[1]/position-norm` | `[2.332, -0.78, -1.632]` / `[0.0, 0.0, 1.0]` | `[[0.0, 84.0], [1.0, 0.0]]` |
| 21 | wheel.R, wheel1.R, gearleg2.R | `gear/gear[1]/position-norm` | `[2.332, -0.78, -1.632]` / `[0.0, -1.0, -0.0]` | `[[0.0, 90.0], [1.0, 0.0]]` |
| 22 | gearp2.R, gearp1.R | `gear/gear[1]/position-norm` | `[2.376, -1.281, -1.632]` / `[0.0, 0.0, 1.0]` | `[[0.0, 50.0], [1.0, 0.0]]` |
| 23 | gearp1.R | `gear/gear[1]/position-norm` | `[2.839, -0.832, -1.626]` / `[0.0, 0.0, -1.0]` | `[[0.0, 10.0], [1.0, 0.0]]` |
| 24 | gearp3.R | `gear/gear[1]/position-norm` | `[2.989, -0.982, -1.626]` / `[0.0, 0.0, -1.0]` | `[[0.0, 105.0], [1.0, 0.0]]` |
| 25 | gearcylinder.R | `gear/gear[1]/position-norm` | `translate` / `[1.0, 1.0, -0.0]` | `[[0.0, 0.4], [1.0, 0.0]]` |
| 26 | wheel.R, wheel1.R | `gear/gear[1]/compression-norm` | `translate` / `[0.0, 1.0, -0.0]` | `[[0.0, 0.16], [1.0, 0.32]]` |
| 27 | gearleg2.R | `gear/gear[1]/compression-norm` | `translate` / `[0.0, 1.0, -0.0]` | `[[0.0, 0.16], [1.0, 0.32]]` |
| 28 | wheel.R, wheel1.R | `gear/gear[0]/rollspeed-ms` | `[2.312, -2.112, 1.939]` / `[0.0, 0.0, -1.0]` | `{'factor': '-20.0', 'travel': None}` |
| 29 | tailgear2, tailgear1, tailwheel, tailwheel1, hook | `gear/gear[2]/position-norm` | `[7.843, -0.254, -0.0]` / `[0.0, 0.0, 1.0]` | `[[0.0, 53.0], [1.0, 0.0]]` |
| 30 | tailwheeldoor.L | `gear/gear[2]/position-norm` | `[[7.817, -0.25, 0.215], [8.617, -0.098, 0.164]]` / `from points` | `[[0.0, 0.0], [0.1, -70.0], [1.0, -70.0]]` |
| 31 | tailwheeldoor.R | `gear/gear[2]/position-norm` | `[[7.817, -0.25, -0.215], [8.617, -0.098, -0.164]]` / `from points` | `[[0.0, 0.0], [0.1, 70.0], [1.0, 70.0]]` |
| 32 | tailwheel, tailwheel1, tailgear1 | `gear/gear[2]/compression-norm` | `translate` / `[-0.2, 1.0, -0.0]` | `[[0.0, 0.1], [0.5, 0.03], [1.0, 0.0]]` |
| 33 | hook | `gear/gear[2]/position-norm` | `[7.843, -0.254, -0.0]` / `[0.0, 0.0, -1.0]` | `[[0.0, 55.0], [1.0, 0.0]]` |
| 34 | hook | `gear/gear[2]/position-norm` | `[9.733, -0.157, -0.0]` / `[0.0, 0.0, -1.0]` | `[[0.0, 25.0], [1.0, 0.0]]` |
| 35 | hook | `gear/gear[2]/position-norm` | `translate` / `[-1.5, 1.0, -0.0]` | `[[0.0, 0.1], [1.0, 0.0]]` |
| 36 | hook | `gear/tailhook/position-norm` | `[8.518, -0.401, 1.626]` / `[0.0, 0.0, -1.0]` | `[[0.0, 0.0], [1.0, 70.0]]` |
| 37 | cowlflap1.L | `surface-positions/cowl-flaps-norm` | `[[1.527, 0.693, 0.186], [1.527, 0.507, 0.5]]` / `from points` | `[[0.0, 0.0], [1.0, 30.0]]` |
| 38 | cowlflap2.L | `surface-positions/cowl-flaps-norm` | `[[1.527, 0.507, 0.507], [1.527, 0.186, 0.693]]` / `from points` | `[[0.0, 0.0], [1.0, 30.0]]` |
| 39 | cowlflap3.L | `surface-positions/cowl-flaps-norm` | `[[1.527, 0.186, 0.693], [1.527, -0.186, 0.693]]` / `from points` | `[[0.0, 0.0], [1.0, 30.0]]` |
| 40 | cowlflap4.L | `surface-positions/cowl-flaps-norm` | `[[1.527, -0.186, 0.693], [1.527, -0.507, 0.507]]` / `from points` | `[[0.0, 0.0], [1.0, 30.0]]` |
| 41 | cowlflap5.L | `surface-positions/cowl-flaps-norm` | `[[1.527, -0.507, 0.507], [1.527, -0.693, 0.186]]` / `from points` | `[[0.0, 0.0], [1.0, 30.0]]` |
| 42 | cowlflap1.R | `surface-positions/cowl-flaps-norm` | `[[1.527, 0.693, -0.186], [1.527, 0.507, -0.5]]` / `from points` | `[[0.0, 0.0], [1.0, -30.0]]` |
| 43 | cowlflap2.R | `surface-positions/cowl-flaps-norm` | `[[1.527, 0.507, -0.507], [1.527, 0.186, -0.693]]` / `from points` | `[[0.0, 0.0], [1.0, -30.0]]` |
| 44 | cowlflap3.R | `surface-positions/cowl-flaps-norm` | `[[1.527, 0.186, -0.693], [1.527, -0.186, -0.693]]` / `from points` | `[[0.0, 0.0], [1.0, -30.0]]` |
| 45 | cowlflap4.R | `surface-positions/cowl-flaps-norm` | `[[1.527, -0.186, -0.693], [1.527, -0.507, -0.507]]` / `from points` | `[[0.0, 0.0], [1.0, -30.0]]` |
| 46 | cowlflap5.R | `surface-positions/cowl-flaps-norm` | `[[1.527, -0.507, -0.507], [1.527, -0.693, -0.186]]` / `from points` | `[[0.0, 0.0], [1.0, -30.0]]` |
| 47 | cowlflap6 | `surface-positions/cowl-flaps-norm` | `[[1.527, -0.693, 0.186], [1.527, -0.693, -0.186]]` / `from points` | `[[0.0, 0.0], [1.0, 30.0]]` |
| 48 | flap1.L | `surface-positions/flap-pos-norm` | `[[4.409, -0.444, 0.513], [4.397, -0.844, 1.571]]` / `from points` | `{'factor': '-50.0', 'travel': [-50.0, 0.0]}` |
| 49 | flap2.L | `surface-positions/flap-pos-norm` | `[[4.372, -0.774, 2.22], [4.372, -0.805, 1.571]]` / `from points` | `{'factor': '50.0', 'travel': [0.0, 50.0]}` |
| 50 | flap1.R | `surface-positions/flap-pos-norm` | `[[4.409, -0.444, -0.513], [4.397, -0.844, -1.571]]` / `from points` | `{'factor': '50.0', 'travel': [0.0, 50.0]}` |
| 51 | flap2.R | `surface-positions/flap-pos-norm` | `[[4.372, -0.774, -2.22], [4.372, -0.805, -1.571]]` / `from points` | `{'factor': '-50.0', 'travel': [-50.0, 0.0]}` |
| 52 | rudder | `surface-positions/rudder-pos-norm` | `[8.488, 1.217, -0.0]` / `[0.0, 1.0, -0.0]` | `{'factor': '30.0', 'travel': [-30.0, 30.0]}` |
| 53 | elevator.L | `surface-positions/elevator-pos-norm` | `[9.37, 0.447, 1.178]` / `[0.0, 0.0, -1.0]` | `[[-1.0, -30.0], [0.0, 0.0], [1.0, 20.0]]` |
| 54 | elevator.R | `surface-positions/elevator-pos-norm` | `[9.37, 0.447, -1.178]` / `[0.0, 0.0, -1.0]` | `[[-1.0, -30.0], [0.0, 0.0], [1.0, 20.0]]` |
| 55 | tailwheel, tailwheel1, tailgear1 | `gear/gear[2]/caster-angle-deg` | `[[8.351, -0.567, -0.0], [8.332, -0.472, -0.0]]` / `from points` | `{'factor': '1', 'travel': None}` |
| 56 | canopy | `controls/canopy/position-norm` | `translate` / `[1.0, 0.0, -0.0]` | `[[0.0, 0.0], [1.0, 0.7]]` |
| 57 | leftwing | `controls/wingfold/position-norm` | `[3.038, -0.68, 2.278]` / `[-1.0, -0.15, 0.06]` | `{'factor': '95', 'travel': [0.0, 95.0]}` |
| 58 | rightwing | `controls/wingfold/position-norm` | `[3.038, -0.68, -2.278]` / `[1.0, 0.15, 0.06]` | `{'factor': '95', 'travel': [0.0, 95.0]}` |
| 59 | flap3.L | `surface-positions/flap-pos-norm` | `[[4.205, -0.668, 3.438], [4.358, -0.864, 2.245]]` / `from points` | `{'factor': '50.0', 'travel': [0.0, 50.0]}` |
| 60 | aileron.L | `controls/flight/aileron` | `[[3.96, -0.2, 5.787], [4.235, -0.676, 3.438]]` / `from points` | `{'factor': '18.0', 'travel': None}` |
| 61 | flap3.R | `surface-positions/flap-pos-norm` | `[[4.205, -0.668, -3.438], [4.358, -0.864, -2.245]]` / `from points` | `{'factor': '-50.0', 'travel': [-50.0, 0.0]}` |
| 62 | aileron.R | `controls/flight/aileron` | `[[3.96, -0.2, -5.787], [4.235, -0.676, -3.438]]` / `from points` | `{'factor': '18.0', 'travel': None}` |
| 63 | spdisk | `engines/engine[0]/rpm` | `[0.0, 0.0, -0.0]` / `[1.0, 0.0, -0.0]` | `{'factor': '0.35', 'travel': None}` |
| 64 | fpdisk | `engines/engine[0]/rpm` | `[0.0, 0.0, -0.0]` / `[1.0, 0.0, -0.0]` | `{'factor': '0.01', 'travel': None}` |
| 65 | canopyglas | `controls/canopy/position-norm` | `translate` / `[1.0, 0.0, -0.0]` | `[[0.0, 0.0], [1.0, 0.7]]` |

# Later-aircraft guess audit (aircraft 4–11)

Protected modules read: src/aircraft-rigs.js (prepareF16, prepareSeaplane), src/additional-aircraft.js (prepareHelicopter, prepareEflash), src/rotors.js. No protected edits. Pack source/facts are authoritative except explicitly flagged errors. Source-script output: /tmp/lab-source-config.json; compact convenience config: /tmp/lab-later-config.json.

Common helper guesses in all procedural rotors: bladewidth .058radius(main)/.12radius(tail), thickness.014radius, hubradii.035/.045radius, shaftmetal#7f919c, blade#25333c/yellowtips#e8bd53; genericmainspin35rad/s,tail90rad/s; genericcollective12°/tail18°,cyclic6°; propellerblade twist28→10°,spinnerdimensions.324/.52m(or .06/.12pusher), genericspin4+95power. These are rendering techniques/provisional geometry, not sourced aircraft dimensions. Replace only source-supported parameters; disclose missing bladechord/spinnerfacts rather than callingthemexact.

Flight mapping/smoothing retained by handoff: smoothing7 exceptF16=9; roll/.65,pitch/.58,rudderroll. Inspectorcancommandindependentrudder. Surfaceaxes must come fromsource/geometry, notgeneric0,0,1.

## fg-f16-defa67fc

| ChatGPT value or decision | Pack/source replacement | Source / qualification |
|---|---|---|
| aileron ±15; elevator±12; rudder±15 | rudder±30; left tail factor57.3 / travel±57.3; aileron/tail expressions incompletely exported | animations_from_xml, missing source/F-16.xml; preserve rest for unresolved expression, do not historically assert57.3 |
| flaps20; speedbrakes±35; canopy-28 | flaps differ by surface/MP expression; speedbrake60; canopy30 | animations_from_xml channelsflaps/speedbrake/canopy; XML hinges approximate0.704m |
| main/no searrestor hook hidden | ArresterHook0..57.175 at[2.58,-.73,0] | animations_from_xml hook |
| typed procedural gear wheels(-3.02,-1.687,0),(.56,-1.5,±1.22); radii.23/.30; rotation100 and visibility>.015 | contacts(-3.0215,-1.9174,.034),(.561,-1.7971,+1.1695/-1.1812); wheelmesh geometry determinesradius; XMLgear motions28 | fdm_geometry trusted; do not hide retracted importedgear simply because nearzero |
| typed anchors(-2.97,-.805,0),(0,-.65,±.45) | centres fromgearXML fit snapped togeometry, trusted tyrebottom contacts | fdm_geometry.gear_contacts andanimations_from_xml |
| nozzlesbothhidden; proceduralat(4.57,0,0),radius.43/.35,length.68,ring.355,glow.32 | PW_nozzle enginevariant2, GEvariant0; sourceYF16setengine2 | shown_or_hidden_by_condition +source/f16/YF-16-set.xml; originalnozzle visible |
| 18namedhide list plusStrut/Tire/GearDoor/MainDoor/Hook/Fan/Flame/Spinning regex | sourcecondition/nodescategories determinePW/GE, stores, equipment; nohide realhook | conditions exactsource missingfor mainmodel, recordlimited verification |
| glass#718882,rough.19,metal.1,opacity.45; nozzle#64717b/#313941/#231f26/#dc863c | originaltextures +glasscategory/effects; keep safe materialrepair where sourcetintunknown | textures/material_warnings; maineffectXMLmissing |
| parkedfromproceduraltyres; smoothing9, roll/.65,pitch/.58,rudderroll | parked1.92°; preserve existing smoothing/mapping technique | fdm_geometry.parked_pitch; dimensionsF16C15.062x9.957x4.877 mustnotforceYF16 |

Original texture/livery slot bindings:
- source/f16/Models/Armament/loads-inner.xml: property-base=sim/model/livery, texture-prop=texture, default=f16.png. Objects: RExtTank, LExtTank, RExtTank6, LExtTank6, CFTTanks.
- source/f16/Models/Armament/loads-middle.xml: property-base=sim/model/livery-pod, texture-prop=texture, default=Armament/External-stores/MXU-648.png. Objects: Shell, Door.
- source/f16/Models/Armament/loads.xml: property-base=sim/model/livery, texture-prop=texture, default=f16.png. Objects: VentralTank, Centerpylon, Podpylon_left, Podpylon_right.
- source/f16/Models/Armament/loads.xml: property-base=sim/model/livery-pod, texture-prop=texture, default=Armament/External-stores/MXU-648.png. Objects: Shell, Door.

Missing source includes: source/f16/Models/YF-16.xml → F-16.xml, source/f16/YF-16-set.xml → f16-base.xml

## fg-dauphin-ea380a4c

| ChatGPT value or decision | Pack/source replacement | Source / qualification |
|---|---|---|
| mainradius5.9/4hub[-1.785,1.72,0],tailradius.49/11hub[5.294,-.083,.02] | mainØ11.94/4hub[-1.787,1.549,0]; tailØ1.1/11hub[5.3,-.085,0] | fdm_geometry.rotors; normals[-.05,1,0]/[0,0,1],ccw0 |
| mastlength.42 atmainY-.21, genericrotortilt6°/pitch12° andtailpitch18° | sourceactualmastandbladearticulation, rpm355/3584; incidenceanim withsourceproperties | source/Models/Externals rotors; rotoroffsetmain[-1.785,1.449,0],pitch-5 is visualbase transform, FDMhub is.10m higher |
| fourdoors±35°aroundY | crew/passengerforedoorsG-70,D+70 aboutpoint-axis | source/Models/dauphin.xml indicescrew propertiesMPfloat10/11,passenger24/25; factschannelnull |
| rearbayslide.55m X | bayG/D: popout±.02m,slide.95m after.2,then±3° | animations_from_xml MPfloat26/27 tables; sourcealiascomment bayposition |
| gear75° typedanchors[-4.88,-1.31,0],[-.85,-1.17,±.76]; doors65° | TrainAvant -90→0, main first-90→0 plus±35→0 compoundrotation; baydoors0→-80 by.2 | sourcegroups TrainAvant/Gauche/Droit expandoriginalaxis/roue children; gearXML complete |
| hiddenoriginalmain/tail/nez2; HDRnamesallhidden | nez1 if!MPbool3,nez2 ifbool3; nonHDR if!bool2; blurdiscsconditiondriven | sourceXML conditionAST; defaults unavailablebecausebaseXMLmissing |
| glass#608699opacity.4; groundpitchwheelfit | originaleffectglasstint1,1,1; parked0°,trustedtricyclescontact | effectparameters/fdm_geometry; noforcedhistoricalpalette |

Original texture/livery slot bindings:
- source/Dauphin/Models/dauphin.xml: property-base=sim/model/livery, texture-prop=texture, default=texture.png. Objects: fuselage, nez1, nez2, porteAG, porteBG, porteAD, porteBD, derive, moteurs, porteG, porteD, portecrewG, portecrewD, support, trous, echappes, roueA, axeGH, axeGB, axeG1, axeG2, axeG3, roueG, axeDH, axeDB, axeD1, axeD2, axeD3, roueD, vitres, vitrescrewG, vitrescrewD, vitreporteAG, vitreporteBG, vitreporteAD, vitreporteBD, lampeR, lampeG, HDRvitres, HDRvitrescrewG, HDRvitrescrewD, HDRvitreporteAG, HDRvitreporteBG, HDRvitreporteAD, HDRvitreporteBD.

Missing source includes: source/Dauphin/dauphin-set.xml → Systems/dauphin-base.xml

## fg-ec130-9797aa83

| ChatGPT value or decision | Pack/source replacement | Source / qualification |
|---|---|---|
| T2body kept; fuselage/frontdoorl/backdoorl/doorfr/doorbr hiddenbytypednames | B4set sim/model/variant=1; B4 body select conditionvariant!=2 | source/ec130/ec130b4-set.xml + sourceModels/ec130b4.xml exactselectAST |
| mainradius5/3hub[-2.8,1.4,0]; tailradius.43/10hub[4.44,.106,.04] | mainØ10.69/3hub[-1.9,1.325,0]; tailØ1.0/10hub[4.4,.109,-.125] | fdm_geometry.rotors assumedframe; visualsnapXMLsubmodelmain[-1.987,1.371,0]pitch-2,tail[4.409,.102,.06]roll90 |
| mast.64m/mainY-.32; genericrotorcollective12°,cyclic6°,tail18° | sourcebladeincidence/rawnormalizedflightsvalues; originals missingrotorGLB parts; proceduraldimsfromFDM | source/Rotor/rotoranimation.xml andTailRotor XML; avoid asserting genericincidenceexact |
| fourdoors±35°includesdoorfr_t2/doorbr_t2 andwrongrearleftrotation | B4doorfl-80,doorfr+70; doorbl translates.85X and-.07Z; B4doorbr-100° | factsdoorchannel/sourceXML fgcentresmappedx/z/-y; B4only |
| basket/float/snowshoe/hoist/FLIR/stretcher/searchlight regexequipmenthide | sourceconfigflags foraccessories; B4defaultbaseconfigabsent, unknownaccessoriesoffwithexplanation | sourceconditions; wirecuttereffectvisibleifflag, hookchannel belongshoistnotlandinggear |
| glass#608699; allgeometrypalette alreadyembedded | B4FlightGearlivery/default.png on38sourceboundobjects; missingexteriorUV266 | source materialanimation+effect B4objects; noUV flagsmayneedprojectionasexplicitfallback |
| groundpitch0° | pack-0.96° fromuntrustedskidcontacts | fdm_geometry; retaincontactcheckunverifiedframe |
| rawsourcewidth3.336m | realmainrotorØ10.69 restoresmissingrotor; length12.64includesrotor | specsvariantnotprovided; rawbodylength10.808 not fullrotorlength |

Original texture/livery slot bindings:
- source/ec130/Models/ec130b4.xml: property-base=sim/model/livery/, texture-prop=texture, default=default.png. Objects: fuselage, fuselage_t2, fuselage_air_in, fuselage_air_in_t2, gear_strobe_light_base, seats, seat_pass_front_l, seat_pass_front_r, seat_pass_rear_mr, seat_pass_rear_r, luggagel, luggager, luggager_slight, luggagelw, fuselage_luggagelw, luggagerw, fuselage_luggagerw, frontdoorl, frontdoorl_t2, frontdoorr, frontdoorr_t2, backdoorr, backdoorr_t2, backdoorl, backdoorl_t2, doorb, doorbr_lead_t2, top_expipes_t2, exhaust, wirecutter, stator, tailrotor, dme_base, dme_small_base, vuhf_base, hoist_frame, hoist_pyramid, tail_filter_prot.

Missing source includes: source/ec130/ec130b4-set.xml → ec130-base.xml

## fg-bo105-5f1245bd

| ChatGPT value or decision | Pack/source replacement | Source / qualification |
|---|---|---|
| mainradius5/4hub[2.744,1.65,0]; tailradius.96/2hub[8.642,1.524,.424] | mainØ9.98/4hub[2.75,1.55,0]; tailØ1.91/2hub[8.65,1.5,.18] | fdm_geometry.rotors normals[-.05,1,0]/[-.07,-.05,-1],rpm442/2219,ccw1; originalsvisualsnapbecauseframe1.0075m |
| frontdoorrestquaternionidentity; hingeYwith35°; sliders.55m | frontR-170,frontL+170; rear-.03Zpopoutthen+.6X; rearmosthingeddoorssource120° | source/Models/bo105.xml exactsequences; doorrestsfromsourcezero-propertynotidentityguess |
| tailfoldgear?; skidsfixed; groundpitch0 | tail-angle-deg source default0 is separatefold; fixedskidsneverretract; maincontactderivedslope1.0° conflicts9.12pack | fdm_geometry contacts allis_wheel=truewrong; request builderfix |
| yellowmat#dbb342; glass#608699opacity.4 | setYellowMedEvac diffuse[.8,.7,.001], livery.rgb; glasswhitealpha.2 | source/bo105-set.xml namedmaterialstates; originaldiffusecomponents, sourcecolourspaceundocumented |
| gatling/barrel/rail/hot/wirecutter/shield allhidden; rotor/shadowcrewregex | setwire-cutter=true, showwire_cutter; restoreappropriatepresetparts fromcondition | sourceconditions/categories; accessoryrailssetcondition |
| rotorcollective12°,cyclic6°/tail18°,genericspins35/90radsec | sourceRotorincidence/segmentedflapanimations directpropertyunbounded; proceduralspinFDMrpm | nohistoricalcontroltravelstated; keepunresolvedincidencedisclosed |

Original texture/livery slot bindings:
- source/bo105/Models/bo105.xml: property-base=, texture-prop=sim/model/bo105/material/rotor/texture, default=setfile-driven. Objects: main_rotor_blades, main_rotor_disc, rotor_disc_T.
- source/bo105/Models/bo105.xml: property-base=sim/model/bo105/material/emblem, texture-prop=texture, default=setfile-driven. Objects: emblem.
- source/bo105/Models/bo105.xml: property-base=sim/model/bo105/material/fuselage, texture-prop=texture, default=setfile-driven. Objects: fuselage, filler, door_front_L, door_front_R, door_back_L, door_back_R, door_stop_L, door_stop_R, rail_L, rail_R, ear_L, ear_R, funny_box, wire_cutter, hot, gatling, reardoor_L, reardoor_R, tail, tailplate, tailstab_L, tailstab_R, skirt.

Missing source includes: none

## fg-e-flash-c73b47ce

| ChatGPT value or decision | Pack/source replacement | Source / qualification |
|---|---|---|
| sailraise+2.04Y, weightShiftanchor[1.55,2.04,0] | XML2.04 is hingeheight; noXMLtranslate sets2.04; missingraw.aclocaltransform | source/Models/e-flash.xml Wingexpression; preserve benchmarkalignmentonlyasdocumentedprovisionalfallback |
| sailrotationroll±6,pitch±5 | trikeweightshiftroll±15 at[1.55,2.04,0]; pitchinterp[-1:+6,0:-3,+1:-12] at[1.55,1.96,0] | animations_from_xml +sourceExpressions groundconditionalwholewingcountermotion |
| nosewheelsteer±20 aroundY only | NoseWheel+NoseStrut ±20 around[-.2,1,0],center[.24,-.22,0] | XML propertyrudderposnorm misclassifiedgear; keepfixedwheeltranslation |
| pusherhub[2.635,.55,0],radius.7,count3 | hub[2.4,.55,0],Ø1.5697,count3,pusherspinfactor-1axis+X | fdm_geometry diameter and animations_from_xml spin |
| pilot/passengerbothhidden; all i4 parachutehidden | setpilot1/passenger0/parachute0; source crewconditions useflash2aaliaswhile setuseseflash | source .xml/.nas missingpropertyaliasconsistency; hidecrewwithrevealreason categoryallowed |
| pink#db903d; sailwhite#e9edf0fabricbump.004; alu#79929e/wire#4b6472; glass#608699 | originaldownloadmaterials/textures withoutorangeoverride | sourceintended-look images; noexternalreferencepaintneeded |
| rawlength13.018 fromopenparachute; nofixedhistoricaldimension | wingspan34.61ft=10.549m; rawspan10.542 within.1%; ignoreequipmentbounds | flight_model.wingspan unitinferredJSBSimft; sourcegearuntrustedmainwheelsmappedtoNoseWheel |

Original texture/livery slot bindings:

Missing source includes: source/e-flash/e-flash-set.xml → Aircraft/Generic/Human/Include/walker-include.xml

## fg-macchi-m33-70f57d9d

| ChatGPT value or decision | Pack/source replacement | Source / qualification |
|---|---|---|
| sharedaileron±16/elevator±12/rudder±10 axesZ/Z/Y | aileron±15 aroundXMLpointaxes; elevator±15; rudderfactor-20 ±20 | animations_from_xml /sourceModels/m33.xml |
| playbakedspinclipdt*engine*2; hideblurregex | keeptruespinbutexplicitengineaxis/sign; hub[-2.579,.789,0]axis-X,factor1;Ø1.74 | sourceHeliceComplete group expands bol+pales; FDMthrustpoint[-1.605,.789,0]notvisualhub |
| noownlivery/parkedpitch, sharedappearance | sourceDefaulttexture.png on21sourceobjects; park1.7contactwaterdatum | sourceModels/materialtextureprop sim/model/livery/texture; allmainpartsUV |
| sharedsurfaceapproxhinge/norescale | raw8.256/9.983/2.672 versus8.55/9.74/2.68within5% | facts.size_m andreal_world_specs; noalternateborrowunknownlicence |

Original texture/livery slot bindings:
- source/Macchi-M33/Models/m33.xml: property-base=sim/model/livery, texture-prop=texture, default=texture.png. Objects: fuselage, dessous, structure, bol, echappes, ailes, aileronG, aileronD, ailes2, profondeurG, profondeurD, direction, moteur, helice, flotteurs, tour, guns, trous, dynamo, boldynamo, helicedynamo.

Missing source includes: source/Macchi-M33/m33-set.xml → m33-yasim-cnf.xml

## man-supermarine-s-6b-366f4f6d

| ChatGPT value or decision | Pack/source replacement | Source / qualification |
|---|---|---|
| sharedaileron±16/elevator±12/rudder±10 | aileron±15; elevator/rudderfactor15 controls/flight±1 source,packtravelnull | sourceModels/s6b.xml normalizeddomainfactmissing |
| sharedspincliprate2, noexplicitdoorchannel | 2bladesØ2.8 hub[-3.075,.358,0]axis-X; tourvitre+glassdoor-45 | FDMradius1.4 +specblade2; HeliceComplete groupbol+helice |
| sharedpalette/nooriginalnamedlivery | Defaulttexture.png sourcebinding19objects; optionalsourceSchneiderexactmarkings | sourceModels/material sim/model/livery texture; specs/liveryDefault sourcepresentnotnull |
| seaplanegenericpark0 | packfloatcontactpitch4.99; dimensions8.792/9.113/3.699 alreadywithin1% | fdm_geometry/real_world_specs8.788/9.144/3.734; floatcontactpointsnottyre |

Original texture/livery slot bindings:
- source/Supermarine-S.6B/Models/s6b.xml: property-base=sim/model/livery, texture-prop=texture, default=texture.png. Objects: fuselage, helice, bol, ailes, aile2, derive, floteurs, aileronG, aileronD, direction, profondeur, poteau, tourvitre, trous, cables, vitres, propblur, propdisc, HDRvitres.

Missing source includes: source/Supermarine-S.6B/s6b-set.xml → Systems/s6b-base.xml

## man-macchi-castoldi-mc72-6fa2f786

| ChatGPT value or decision | Pack/source replacement | Source / qualification |
|---|---|---|
| sharedaileron±16/elevator±12/rudder±10 | aileron/elevator±15,rudderfactor-15 ±15 | animations_from_xml ownXML |
| sharedbakedspincliprate2, noassertiondirections | two2-bladepropsØ2.76each; axis+X hub[-3.285,.53,0],axis-X hub[-3.583,.53,0] | FDM2radius1.38contra1 +XML spinsoppositeaxes; specpropblade4 is total |
| sharedpalette/noownlivery | Defaulttexture.png sourcebinding24objects | sourceModels/mc72.xml materialsim/model/livery; applyoriginalmap |
| genericfloatpitch0, sharedsize | pitch2.04; length8.252/span9.469 within1%8.32/9.48 | fdm_geometry/size_m/real_world_specs; noheightfield meansnoclaim5%height |

Original texture/livery slot bindings:
- source/Macchi-Castoldi-MC72/Models/mc72.xml: property-base=sim/model/livery, texture-prop=texture, default=texture.png. Objects: fuselage, aile, aile2, floteurs, sousfloteurs, aileronG, aileronD, direction, profondeur, poteau, tourvitre, appuis, bol1, bol2, echappe, helice1, helice2, cables, vitres, propdisc1, propblur1, propdisc2, propblur2, HDRvitres.

Missing source includes: source/Macchi-Castoldi-MC72/mc72-set.xml → Systems/mc72-base.xml


### Spitfire verification details

All 29 supplied alternates rendered in the scratch comparison page, grouped three at a time with a matching camera direction and normalized span/length. Their different source axis conventions remain visible, so those front-on views are not dimensional evidence. Same-family FlightGear variants share the source geometry; the most detailed separable propeller donor has four blades and is reserved for Seafire. Mk Vb retains its correct three-blade source propeller. No licensing constraint remains. Live inspector checked every slider at both ends, gear cycling, parked/flight presets and original-only livery. Physical glass shader defines repaired after live WebGL diagnostics. Tests verify true blade radius and coplanar FDM contacts. Height disagreement is explicitly recorded in README.

### Seafire completion and licensing revision

The earlier read-only writeup above predates the user's licensing clearance and donor integration. Its statements about no borrowing and the original-only 3.357 m propeller no longer describe the final Lab implementation. The runtime now uses `man-supermarine-spitfire-1093b498 / Propelers` contours at FDM diameter 3.276 m, source axial envelope/shaft/spinner and reprojected source paint. Only that geometry JSON is shipped; no donor GLB or raw reference photo is copied. Original blades remain individually revealable. The user authorized all supplied alternate borrowing, with no licence constraint; exact metadata remains unprovided rather than invented.

- [x] Guess audit before rig implementation
- [x] XML, set, FDM, intended images and period references
- [x] Candidates: 28 GLBs hash-identical to already rendered Spitfire alternates; extra Vb equals the reviewed base
- [x] Source rig, true nested tip folds, hook, contacts, original naval paint and donor propeller
- [x] Actual donor vertex radius within 3%; wheel containment, symmetry, clamps, source paint and pause tests
- [x] Whole unchanged ChatGPT test suite
- [x] Live parked and flight poses, every control Home/End, gear cycling, original-only livery
- [x] Inspector and matched-perspective period-photo comparison
- [x] README row and local per-aircraft commit

Lab requests: identify a pose-qualified height reference; check exact source gear-door axis/lower edge, source-material UV projection near borrowed blade roots and supply exact donor licence metadata for archival provenance. These are recorded limitations, not licensing blockers.

### Corsair completion

- [x] Guess audit, source XML/set/FDM, intended thumbnail, museum F4U-1D photograph and F4U-1 three-view
- [x] Base and alternate rendered; alternate is unrelated A-7E Corsair II jet. No accurate donor parts to borrow; licence clearance honored
- [x] Original three-blade geometry, exact compound XML gear motions and independent source part hierarchy
- [x] Real hook, source navy/marine textures and livery slots, three wheel contacts (exclude emergency belly contacts)
- [x] Clamps, true wheel-bay containment, mirrored gear, asymmetric elevator travel, propeller radius, ground pitch, same-family proportions and hidden reasons
- [x] Live controls at both extremes, gear cycling, parked/flight poses and both named liveries
- [x] Inspector and matching model-camera/reference comparison images
- [x] README and per-aircraft local commit; no push

Primary dimension cross-check: Smithsonian F4U-1D record gives length10.2 m, span12.5 m and height4.6 m; pack describes F4U-4 and cannot be used as exact-variant evidence. The museum photo is a later F4U-1D family member, so canopy/markings are not copied blindly. Three blades and gull-wing layout agree. Source typo hook lateral coordinate is corrected to FDM/mesh centreline. Source right wheel spin centre/property and wheel contact-to-mesh discrepancies are recorded; static gear rig does not animate taxi spin or compression. Glass and RPM blur remain explicitly documented rendering adaptations.

### F-16 completion and borrowing recheck

- [x] Earlier guess audit read before implementation; pack/source, intended FlightGear thumbnails and museum reference inspected
- [x] All9 alternate GLBs rendered over3 pages; same simplified low-poly production family. No geometry borrowing withheld for licensing; detailed original controls/gear/nozzle outperform them
- [x] Missing main include recovered from author NikolaiVChr/f16; matches pack canopy30/hook57.175/gear112/main95/explicit offset-deg. Fingerprint retained in runtime facts
- [x] Source compound gear offset/sequence, restored left-family bilateral translation and moving brace hierarchy; retained wheels throughout retraction
- [x] FDM contacts/pitch1.92°, PW engine2 variant, source glass, 82 named liveries (80 pack +2 omitted YF schemes)
- [x] Source mechanical textures kept; body/logo paint slots separated. Nested livery slot collision and generic offset handling repaired
- [x] Control clamps, FCS radian conversion/±25° tailplanes, tyre containment within source airframe envelope, mirrors, contact heights, hidden reasons, all82 maps tested
- [x] Unchanged original whole suite and all current Lab tests pass
- [x] Live9 sliders Home/End, parked/flight, gear cycling, prototype/Combat Gray switch; original preserved
- [x] Inspector and comparative artifact images; README row; local per-aircraft commit

Lab requests: provide missing exact F-16.xml/f16-base.xml and complete shader-motion/material bindings in pack, capture uncapped liveries and source texture paths, qualify source airframe versus actual YF-16 prototype/75-0745 variant, provide closed physical gear-bay geometry and source brace hierarchy. A coarse body-envelope test is explicitly weaker than exact bay-wall containment. Source XML has opposite-side speedbrake centres; their lateral signs are snapped to geometry. Runtime only retains91 exterior paint files, not unused stores textures. The main inspector's60fps configure formerly re-scanned3303 nodes for each selector; cached node lookups fix that overhead. Simultaneous F-16 scratch renderers still slow this device, so release scratch canvases between live checks.

Licensing recheck for completed aircraft: Spitfire retains correct3-blade source geometry; detailed donor's4 blades belong on Seafire (already integrated). Corsair supplied donor is A-7 jet. F-16 candidates simplify source detail. These are accuracy decisions. All supplied geometry borrowing is authorized; no off-by-default licence gate is used.

### Dauphin completion

- [x] Guess audit before implementation; XML/FDM/material slots, author thumbnail and M-IKEY AS365 photo read
- [x] Base and single alternate rendered. Alternate is Robin DR400, not Dauphin helicopter; licensing is cleared but geometry is unsuitable
- [x] Source gear logical groups expanded, baked hierarchy flattened per moving object,−90° gear/±35° twist/−80° doors restored; wheels retained throughout sequence
- [x] Rotor11.94m/4 and Fenestron1.10m/11 at FDM hubs/RPM; original hubs and mast retained, segmented blades replaced at source diameter/chord
- [x] FDM collective−12/+12, cyclic pitch±12/roll±8, tail−20/+14; cyclic changes blade incidence, not mast tilt; independent mechanical inspector limits, not FDM flight simulation
- [x] Source70° crew/passenger doors and0.95m slider/popout tables, standard glass effect and12 source liveries; door panels were wrongly categorized as crew in pack and kept visible
- [x] Clamps, rotor actual vertex radii, source contact heights/pitch0°, mirrored gear, real tyre containment within source fuselage, source textures/all liveries/hidden reasons/pause tested
- [x] All original unchanged tests and current Lab suite pass
- [x] Live all7 control sliders Home/End, gear cycling, parked/flight presets and all12 livery choices; comparison/inspector saved
- [x] README row and local per-aircraft commit; no push

Lab requests: provide missing dauphin-base.xml startup aliases, exact closed rotor airfoil profile/Fenestron nonuniform spacing and complete glass cubemap/material conversion. Standard panes and nez1 match author thumbnail but startup alias truth remains unverified. Generated zero-opacity blur ring was wrongly counted as geometric diameter when rotated; it is quarantined separately. Rotor `ccw` is a numeric string in pack and now parsed explicitly. FDM source parameters (chord/min-max collective/cyclic) were omitted by builder and now packaged from actual XML. Named livery changes use a cancellation generation so late downloads cannot overwrite a newer choice/reset.

### Ca.60 guess audit (before Lab implementation)

The preserved `prepareCaproni` is the visual benchmark. It already recovers intact `Plane002` wing geometry, keeps the hull/booms/bracing transforms and isolates exploded merged parts. This Lab version will reuse those techniques and keep the established silver/navy/ivory finish unless a reference supports a correction.

| Existing typed choice | Pack / reference check and Lab action |
|---|---|
| Native+Z bow, yaw−90°; exact vertex bounds | Pack has no verified FlightGear frame. Retain correct native orientation; exclude168.082 m exploded parts before measuring |
| Three wing banks offsetsZ0/.985/1.975,Y.01/−.035/−.01; tiers.284 | No XML facts. Validate preserved geometry against museum scale model and period photo; do not reshape wing edges |
| Aileron±12°, pitchfore/aft±8°, combined±16°, rudder±10° | No supplied travel/hinge source. Seek period technical record; keep any unresolved degree limits explicitly partial rather than claim them source-derived |
| Eight propeller sites; outer2-blade radius.135 /central4-blade radius.12 | Pack blanket4-blade count is not per-engine-qualified. Museum model shows outer2 andcentral4; inspect period evidence before overriding correct mixed layout |
| Rotor speed4+70×throttle rad/s, opposinggroups | No RPM in pack. Unverified display rate; replace only if period/engine record supports installed drive ratio |
| Hull/roof bandsY−.035/.083,Z1.05–2.95; booms/engine trim; floatnavy32%; silver/wood/pale struts | Reference04 museumscale model and prior user-provided Volandia model photo support palette; precise color/paint masks remain rendering adaptation |
| Four recovered interplane rudders atX±.575, duplicatedone.284 tier | Reference04 scale model and periodNACA/1921 photos check placement; preserve benchmark while checking |
| Water draft.085nativeunits; parkedpitch0 | No water-contactFDM or loadedwaterline source. Retain neutral display pose; draft is unverified |
| Modelnative dimensionsabout2.7×3.2 | Compare proportion ratios after uniformspan30.5 m calibration against22.6×30.5×9.63; disclose unmatched dimensions rather than stretch axes |

Pack has no XML/FDM/textures or named liveries. Its generic baked-animation warning is inapplicable to this static/manual download. User licensing clearance covers both supplied alternates; donor suitability will be based on geometry, with provenance preserved.

### EC130 B4 implementation and verification

- [x] Guess audit and protected ChatGPT module read; original source set/model/FDM, intended-look images and historical reference checked.
- [x] Base and both supplied candidates compared from matching camera in the earlier live session. BaseB4 chosen; T2 differs by variant; B4 alternate has an added shadow billboard and no clearly better aircraft part. User licence clearance honored.
- [x] B4 set variant1, source6 passenger seats and exact B4 door/motion rules; unsupported T2 families, overlapping shader panes and source-disabled equipment quarantined with reasons.
- [x] Three-blade10.69m/386rpm main and ten-blade1.0m/3568rpm tail, FDM hubs/normals/chord; separate blade incidence retains fixed shafts. Source collective0.5/16°, cyclicpitch−12.6/+9.9, roll−7.1/+5.53; inverted tail−1=>−16.8°,0=>8.7°,+1=>34.2°.
- [x] Exact compound0.85m slide/0.07m pop and source asymmetric80/70/100° doors;72 per-object bindings prevent converted pivot conflicts.
- [x] Recovered77 UV-equipped source bindings from truncated pack metadata, four actually used texture files. Original FlightGear paint retained; no named livery XML. Standard exterior panes adapted to Three.js glass.
- [x] Fixed skids; no invented gear channel. Misidentified deflated-float contacts ignored; visible skid geometry used with source−0.96° pitch. Swept rotor/body length12.641m fits12.64 within5%;3.684m height vs3.34 fails10.3%, explicitly recorded. Source FDM vs visual main/tail hub discrepancy retained and disclosed.
- [x] `node tests/lab/ec130.test.mjs`; full unchanged `npm test` and build pass. Six controls were exercised Home/End and flight pose in the earlier session; subsequent inspector signed offset formatting still awaits live recheck.
- [ ] Final live source-default livery/parked/flight controls and proof `artifacts/lab/ec130-inspector.jpg`, `ec130-compare.jpg`. Browser reconnect rejected because stale preview became a data URL; user reopening requested. Do not claim these artifacts exist.
- [ ] Final complete status after browser evidence; code committed separately in aircraft order.

Pack requests: provide `ec130-base.xml`, named livery XML/startup accessory aliases, all texture/node rows beyond the400-row cutoff; mark skid/float contacts correctly and verify vertex contacts; qualify source height/variant/rotor azimuth; resolve visualXML versus FDM rotor-hub discrepancies. Source min/max rotor incidence and blade chord need retaining in builder output; neutral inverted tail incidence is8.7°, not0°.

### Bo105 CBS implementation and verification

#### Source corrections

- [x] Guess audit read; amend earlier audit **aft hinged doors120° ->170°**, verified current sourceXML.
- [x] `tail-angle-deg` is **crash deformation**, not a fold/retraction channel (Nasal crash sets35°, reset0). Lab holds0 and offers no gear/fold channel.
- [x] Protected original module read; source full set/model/FDM/Nasal reviewed. No protected modules edited.
- [x] Intended yellow thumbnail and military splash viewed. Museum reference02 viewed: clear panes, four main/two tail blades, detailed exposed mast, fixed skids, dark rotors. Military splash is a different preset; source Yellow MedEvac wins paint.
- [x] No supplied candidates/alternates; originalGLB retained. User license clearance applied; no declined candidate.
- [x] Original XML170° door travel/signs and0.03/0.6m source interpolation. One binding per actual mesh avoids converter pivot collisions. Front/aft XML lines project to actual edges within2mm; source axes retained.
- [x] FDM rotor diameter/count/hub/normals/chord/RPM, fixed mast and independent mechanical blade-incidence controls. Source tail rudder invert maps−1=>20°,0=>5°,+1=>−10°; tailphi0110° initial azimuth. Collective0..1=>−0.2..15.8°, cyclicpitch−4.7..10.5°, roll−4.23..5.65°.
- [x] Skid contacts fixed, mirrored andcoplanar after1.005086°; auxiliary tail contact excluded from parked-pitch fit. Mainactualskidouterwalls extend about3cm below point-contact datum; retainedsourcecontactplacement disclosed.
- [x] Continuous source-sized procedural blades replace source segmented exports and unuseddiscs with permesh quarantine reason. Authored hubs/mast/gearbox retained; generatedduplicatehubs/zeroopacityblur excluded. Legacyshadowbillboards excluded in favor scene shadows. Sourceconditions choose optionalweapons andwirecutter, lightshalosoff in staticinspection. Logicalpilot/copilot selectors expanded to their actualmeshchildren.
- [x] Source livery.rgb map applied to UV-equipped exterior, exact source diffuse properties andwhite alpha.2 glass. No namedvariantfiles/livery_names supplied. Original source eye/sounds/Nasal recordedonly.
- [x] Actual-GLB test `node tests/lab/bo105.test.mjs` passed. Covers clamped XMLrigmotions, actualvertexdiameter/chord, FDMhub/axis/RPM, source tail restingphase, fixedmast, contactpitch, parkedqualifieddimensions, mirrorsatdoorfulltravel, sequentialpassengerslide, paint/colorspace/glass, wirecutter, hiddenreasons andpausedspin.
- [ ] Root livecontrols/presets/rotor spin, source-default liveryinspection, candidate/base render (noalternates).
- [ ] Root screenshots `artifacts/lab/bo105-inspector.jpg`, `artifacts/lab/bo105-compare.jpg`.
- [ ] Root full original/Lab tests and build; README/progress; sequential commit `Lab version: Bo105`.

#### Pack-builder requests

1. `parked_pitch_deg_nose_up=9.12` incorrectly uses auxiliary tail contact in fit. Main fixedskid line is atan2(.04,2.28)=1.005086°; contacts also incorrectly `is_wheel:true`.
2. The earlier guess audit's aftdoor120° was wrong; pack/current source travel correctly170°. Crash `tail-angle-deg` wrongly categorizedgear; keep out of fold/retractioncontrol.
3. Runtime-preparer recovered sourceYASim chord/mechanical limits/phi0 (originalfacts omittedthese). Blade resting azimuth materially changes instantaneous dimensions; arbitraryverticaltwobladetailorientationinflatesheight by20%.
4. Set sourceCBS andspecCB don't match; request dimensions for exactselectedCBS variant and the specification's rotorphase/datum.
5. Set-requested `Textures/Rotor/orange.png` and medical insignia `Textures/Emblems/oebh.png` absent. Sourcepack onlyblack rotor andemptyemblem; named `Models/Variants/*.xml` also absent. Four instrumenttextures are missing and haveunresolvedgeneric `Face` bindings.
6. Globalframeerror1.0075m doesnotapplyuniformly: mappeddoorlinesmatchactualverticeswithin2mm aftersource-restreset. Record perassembly/frameverification instead of aglobalfailurethreshold.
7. Crew/category mappings incorrectly call headphonecoversgroundequipment; logicalpilot/copilot selectgroups absentinGLBrequirechildexpansion. Packedrotormotionnode lists truncated; preservefullobjectbindings forarticulatedblade/hubrigging.
8. SourceFDM contactdatum differs fromactualouter skidwalls byabout3cm; nearest-nodeAABBdistance0 isnotexactvertexcontactvalidation.


### E-Flash implementation and verification

- [x] Original module and guess audit, pack/XML/FDM, intended splash and source structural references reviewed. No alternates supplied; no licence-based exclusion.
- [x] Exact original AC recovered and validated against byte-identical model/set XML;114 source ancestor translations restored. Source weightshift/table/control sign, steering and source pilot aliases/defaults implemented.
- [x] Actual GLB test `node tests/lab/eflash.test.mjs` passed; original shaft rotates true at FDM radius, restored source RGB/UV paint, hidden reasons, fixed tyre counter-motion, pauses and clamping checked. Span agrees with FDM34.61FT within0.1%.
- [ ] Live controls/parked/flight/source paint inspection and artifacts `artifacts/lab/eflash-inspector.jpg`, `eflash-compare.jpg` pending browser recovery.
- [ ] Final complete status after live evidence.

## Main corrections

- Recovered the original public FlightGear archive from https://mirrors.ibiblio.org/flightgear/ftp/Aircraft-trunk/e-flash.zip into `/tmp/eflash-source.zip`. Model XML **and set XML are byte-identical to the handoff**. Original `Models/e-flash.ac` SHA256 `db48f2423844fa46a86ca64ff9b327e617178a03c517582f409f2bf796d128f2`.
- The low sail is a converter bug, rather than an unverified 2.04 m hinge-based guess: original Wing parent `loc [0.0159598,2.0388253,0.0000003]` and Trike parent `loc [-0.3772432,0,0]` were omitted on child geometry. Pilot/passenger ancestor locations were also omitted. 114 per-part constant translations restore exact AC world bounds, with shapes agreeing within 0.1 mm. No copied AC geometry/archive/reference photo in runtime. Empty/tiny hierarchy marker meshes are quarantined independently; sound children remain visible.
- Exact source weight shift: trike roll ±15° about `[1.55,2.04,0]`; trike pitch table `[-1:+6,0:-3,1:-12]` about `[1.55,1.96,0]`; whole-wing ground counter-roll and separate pitch table `[-1:-6,0:+3,1:+12]`. Ground tyre positions stay fixed through weight shift; in flight the wing stays fixed and the pod shifts. Original shared motion ±6/±5 was wrong. Source table expression AST was recovered correctly; original preparer matched pitch to the first roll expression because both had empty properties.
- NoseWheel **and NoseStrut** turn ±20° about normalized `[-.2,1,0]`, not just wheel about global Y. Fixed tricycle gear; no invented retracting channel. Source −1.22° parked pitch. Misclassified/untrusted contacts are excluded from UI ground placement; renderer uses actual tyre vertices. Source gear contacts differ from original AC (main X by .38 m; tyre Y by .046 m), so contact/model mismatch remains explicit. Ground tyre heights differ only ~9 mm at source pitch. Original rear tyre outlines have 21 mm lateral asymmetry, preserved.
- Original three-blade prop becomes sound once Trike's missing parent translation is restored. Retained, not unnecessarily rebuilt. Radius within3% of exact 61.8 inch (1.56972 m) FDM diameter; spin XML hub `[2.4,.55,0]`, axis+X, sign−1. Prop's axial plane is ahead of the XML hub but rotation is true and matches original drive shaft. Source no fixed electric rated/cruise RPM: 1000 rpm is explicitly a display inspection rate. Original select switches blades off over500 rpm but GLB lacks corresponding blur, so keep original blades at every display speed with recorded reason.
- Original RGB colours restored. Names `PinkFairing.001`/`PinkWing` are misleading: actual AC defines **green** fairing `[.0943,.3245,.0619]` and **blue** fin `[.1395,.1414,.8849]`, matching author's splash. Keep pale sail and metal/wire original colours; no orange, invented bump, or blue metal override. 29 UV source bindings applied (pilot/passenger/source registration). Original shader transparency/alpha/tint preserved with repaired IOR1.5; flat authored sails/prop double-sided.
- Source bool `1` was incorrectly parsed false for pilot and FES switches. Corrected exact set values. Pilot=1/passenger=0 bridged from set's `eflash` names through its multiplayer mapping to model's `flash2a` alias names. Pilot visible, passenger/deployed parachute hidden with independent reason. `NoseCone` is wing structure, incorrectly categorized as ground equipment; retained. No named liveries in original archive.

## References and alternate checks

This source set explicitly says: “This is a fictional electric microlight based on the Flash2a.” Consequently generic trike photos validate suspension/pusher/tricycle arrangement only, never type-specific paint or dimensions. No alternate models supplied; licensing does not exclude any potential donor.

Read intended images `reference/flightgear/e-flash_Splash_exterior1.jpg` and thumbnail. Read structural diagram `reference/web/07_Ultralight_trike_components.jpg`, public domain KVDP, https://commons.wikimedia.org/wiki/File:Ultralight_trike_components.JPG. Read front flying photo `reference/web/06_Ultralight_Trike_01.jpg`, Oliver Ren, CC BY-SA3.0, https://commons.wikimedia.org/wiki/File:Ultralight_Trike_01.JPG. The latter is a different real trike, suitable structural comparison only; closest matching front camera about `[-15,3,19]` and photo06 recommended for final compare.

## Dimensions and remaining issues

Span exact FDM34.61 **FT** =10.549128m, actual10.54236m within0.1%. Original raw13.018m length and5.578m height included a deployed parachute, so excluded from aircraft proportions. No authoritative type-specific length/height for this fictional aircraft. Missing source `magnetoswitch.rgb` is also absent from downloaded original archive, not just handoff. Instrument texture facts include nodes omitted from exporter; report unresolved rather than claiming recovery. No full aerodynamic weight-shift/electric motor or cockpit instrument simulation required here. Source aliases and masks now mechanically resolved.

## Pack builder requests

1. Preserve nested AC ancestor `loc` on geometry, or provide source transform facts; loss affected114 parts, not merely sail Y.
2. Expression matching needs animation ordinal/axis/centre, not only type/objects/empty property; whole-wing pitch mistakenly reused roll AST.
3. Numeric bool1 must parse true; pilot and FES defaults false are wrong.
4. Source set↔model aliases should resolve `eflash`→multiplayer→`flash2a`.
5. Fixed main wheels are misclassified non-wheel/matched NoseWheel, and source FDM/AC contacts conflict.
6. JSBSim units must be retained (wingspan34.61FT); metadata should state fictional variant explicitly.
7. Category guesses misclassify Wing NoseCone as ground equipment.
8. Source archive lacks referenced magnetoswitch texture; omitted cockpit-node texture bindings should be distinguished from visible exterior misses.
9. Author RPM not supplied for electric model; do not fabricate a cruise RPM.

### Macchi M.33 implementation and verification

- [x] Guess audit, protected module, own source XML/FDM and intended images reviewed; actual GLB tests pass.
- [x] Own clamped travel/signs/hinges, original propeller dimensions/RPM/source selectors, paint/default livery, fixed floats and pause tested.
- [ ] Live presets/control endpoints/default livery and artifacts `artifacts/lab/m33-inspector.jpg`, `m33-compare.jpg` pending browser recovery.
- [ ] Matching-camera supplied alternate render and final donor suitability decision.
## M33 — ready

Biggest corrections: individual ±15° ailerons/elevators and ±20° rudder replace shared16/12/10; source visual shaft hub−2.579/.789/0 and2500rpm replace baked speed multiplier; original red Default paint plus source1.7° water-contact pose replace generic material/pose behavior. Source XML `Models/m33.xml` exact point-axis hinges and spin group HeliceComplete rebuilt from bol/helice/propblur/propdisc. Keep original two blades: measuredØ1.74450 vsFDM1.74 (+0.26%). FDM thrust point−1.605m is not the visual hub. Source RPM selectors correctly transition to intermediate blur300–900rpm and disc above900rpm. All hidden meshes have reasons and remain independently revealable. M33 has no retractable gear and no invented cockpit-door control.

Author intent inspected: `reference/flightgear/Macchi-M33_thumbnail.jpg`, red racing boat/tricolour fin; period photograph `reference/web/04_Macchi_M.33_on_ground.jpg`, correct high engine/strut/wing/hull and two-blade arrangement. Photo is monochrome, so exact red shade is not established; source download paint retained. [Period Macchi M.33 on ground](https://commons.wikimedia.org/wiki/File:Macchi_M.33_on_ground.jpg), public domain, uncredited. Pack references01/02/06 show different aircraft and must not be used as this plane's comparison. Prefer04 for side camera, or03/05 periodM33.

Measurements in level flight:8.256398×9.983220×2.671694m vs8.55×9.74×2.68 (length−3.43%, span+2.50%, height−0.31%, all within5%). Source water contacts have unequal compression and are not verified static contact points; source1.7° is a water datum, not a tyre/trolley pose. No visual rescaling.

Alternate: one supplied `man-macchi-m-33-e380e6ee`. Licence cleared by user's blanket instruction; no off-by-default restriction. Its overall dimensions8.256398×9.983221×2.671697 match base to micrometres, anonymous merged Object_8 family vs the base's source-separated exterior; no clearly better separate part found in geometry inventory. ROOT: render candidate from same camera before recording final no-borrow decision. Keep base sound geometry unless render exposes useful improved part.

Remaining / lab requests: missing `m33-yasim-cnf.xml` and cockpit/pilot imported texture bindings; wind-driven dynamo's spin requires indicated airspeed (kept static; its source8×IAS animation is recorded, not replaced with engine spin). Verify water-contact datum against actual hull immersion. No exact historical red-shade claim.

Suggested README row:
`| Macchi M.33 · Lab | Own XML15/15/20° controls, exact point-axis hinges; original two-bladeØ1.744m shaft at−2.579/.789/0, source2500rpm and RPM blur selectors; original red Default sourcepaint and1.7° water datum. Level8.256×9.983×2.672m is within5% of8.55×9.74×2.68. [Period M.33](https://commons.wikimedia.org/wiki/File:Macchi_M.33_on_ground.jpg) and author thumbnail checked; source red retained because period photo is monochrome. [Compare](artifacts/lab/m33-compare.jpg). | Supplied manual M33 candidate matches base dimensions/outline; licence cleared by user, borrowing unnecessary if root visual confirms. Missing set include/indicative airspeed for dynamo, untrusted water contacts; no invented wheels/door. |`

Progress completion text (live/candidate ticks only after root verifies): source XML and original named groups restored; initial default texture21 sourceobjects plus sanitized extra wing object recovered,27 binding applications; exact FDM source shaft diameter/RPM tests; all source controls bounded; separate surface signs tested;1.7° source pitch with water-datum caveat; original and alternative candidate compared; source Default option and pause verified.


### Supermarine S.6B implementation and verification

- [x] Guess audit, protected module, own source XML/FDM and intended images reviewed; actual GLB tests pass.
- [x] Own clamped travel/signs/hinges, original propeller dimensions/RPM/source selectors, paint/default livery, fixed floats and pause tested.
- [ ] Live presets/control endpoints/default livery and artifacts `artifacts/lab/s6b-inspector.jpg`, `s6b-compare.jpg` pending browser recovery.
- [x] No alternates supplied; licensing did not prevent borrowing.
## S6B — ready

Biggest corrections: own±15° controls replace shared16/12/10; source−45° cockpit cover and standard/HDR glass selector are now supported; exact source prop hub−3.075/.358/0 and2070rpm plus source4.99° water-contact pose replace baked spin/genericpose. `Models/s6b.xml` uses signed normalized elevator/rudder fields; pack travel null is a builder omission, factor15×−1..1 recovers±15 without guess. Original2-blade geometry measuredØ2.75534 vsFDM2.80 (−1.60%, within3%); no replacement or arbitrary scaling. Source blur thresholds600/1500rpm. Standard vitres uses clear transmission adaptation of provided glass effect, original atlas retained; duplicate HDRvitres source-selected off and revealable.

Author intent inspected: `reference/flightgear/Supermarine-S.6B_thumbnail.jpg`, blue/silverS1595 with fin tricolour. Museum `reference/web/02_Supermarine_S.6B_S1595_18503351333_cropped_.jpg` agrees blue fuselage/float undersides, silver wings/upper floats, fin tricolour/serial; original Schneider paint retained. [S1595 Science Museum photograph](https://commons.wikimedia.org/wiki/File:Supermarine_S.6B_%E2%80%98S1595%E2%80%99_(18503351333)_(cropped).jpg), CC BY-SA2.0, Alan Wilson. Prefer02/03 museum photo and low side camera for comparison. No alternate models supplied; licensing did not prevent borrowing.

Measured level8.791693×9.113008×3.699128m vs8.788×9.144×3.734 (length+0.04%,span−0.34%,height−0.93%; allwithin1%). Source4.99° pitch derives water/buoyancy contacts; do not assert it matches a parked trolley. No invented landinggear and floats fixed.

Remaining / lab requests: missing `Systems/s6b-base.xml`; verify water-contact datum/immersion. Source normalizedcontrols travel domains should be exported instead ofnull. Museum paint age/metallicresponse is not reproduced as fake weathering; sourceatlas kept.

Suggested README row:
`| Supermarine S.6B · Lab | Own XML±15° controls and−45° cockpitcover, standard glass selector; original two-bladeØ2.755m shaft with sourceØ2.80m/2070rpm, exact visualhub−3.075/.358/0; source Schneider blue/silver/tricolour Default paint. Level8.792×9.113×3.699m is within1% of specs. [S1595 Science Museum](https://commons.wikimedia.org/wiki/File:Supermarine_S.6B_%E2%80%98S1595%E2%80%99_(18503351333)_(cropped).jpg) and author thumbnail checked. [Compare](artifacts/lab/s6b-compare.jpg). | No candidates supplied. Missing base include and normalized elevator/rudder travel metadata;4.99° is untrusted water-contact datum, not ground trolley stance. Original blades retained within3%. |`

Progress completion text (live only after root verifies): exact XML hinges/signs, recovered factor×normalizedlimits,45° cover, original2-blade visualshaft/RPM/diameter, named Default sourcepaint and HDRglassselector, measuredproportions and4.99° qualifiedsourcefloatpose; no alternate files available.


### Macchi-Castoldi M.C.72 implementation and verification

- [x] Guess audit, protected module, own source XML/FDM and intended images reviewed; actual GLB tests pass.
- [x] Own clamped travel/signs/hinges, original propeller dimensions/RPM/source selectors, paint/default livery, fixed floats and pause tested.
- [ ] Live presets/control endpoints/default livery and artifacts `artifacts/lab/mc72-inspector.jpg`, `mc72-compare.jpg` pending browser recovery.
- [x] No alternates supplied; licensing did not prevent borrowing.
## MC72 — ready

Biggest corrections: own±15° controls replace shared16/12/10; two individually rebuilt source shafts at−3.285/.53/0 and−3.583/.53/0, opposite+X/−X axes and1780rpm replace shared baked spin multiplier; source red/brass/silver Default paint,−162° cover and2.04° float-contact pose now supported. Four historical blades means two per propeller, not four on each. Actual original vertex diameters2.81105/2.75643 vs2.76 (+1.85%/−0.13%; both within3%). Keep source spinner/blade geometry. Source engine-index RPM thresholds select independent discs above1500rpm. Standardpane retained, HDRduplicate inactive/revealable.

Canopy: provided `Models/mc72.xml` uses MPfloat0×−162; provided `Nasal/doors.nas` defines normalized crew door0..1. Missing `Systems/mc72-base.xml` prevents confirming multiplayer alias. Inspector deliberately supplies normalized0..1; use exact source factor and explicitqualification, never claim reconstructedNasal/MPFDMlogic.

Author intent inspected: `reference/flightgear/Macchi-Castoldi-MC72_thumbnail.jpg`; museum `reference/web/03_2024-06-01-Museo-Vigna-di-Valle-Macchi-Castoldi-MC-72.jpg` agrees red finish, brass radiator panels and silverpropellers/floatlowerfinish. [Preserved M.C.72 museum photograph](https://commons.wikimedia.org/wiki/File:2024-06-01-Museo-Vigna-di-Valle-Macchi-Castoldi-MC-72.jpg), CC BY-SA4.0, Gunnar Klack. Prefer03 frontperspective or02 full side photo for compare. Other pack references05/06 are broad museum scenes, not usefulpaintauthority. No alternate models supplied; licensing did not prevent borrowing.

Measured level8.252148×9.468851×3.520206m; supported historiclength8.32/span9.48 gives−0.82%/−0.12%, bothwithin1%. Height has no matchingpackhistoricalvalue; noheightwithin5%claim. Source2.04° waterdatumuntrusted, no inventedwheels/retraction.

Remaining / lab requests: missing base include plusnormalizedMPdooralias andHDRstartupstate; export correctdoorchannelandbounddomain. Verifyfloat/waterdatum. Historicalheightmissing. SourceRPM mathmodelsvisualspin, not enginesounds/FSsystems.

Suggested README row:
`| Macchi-Castoldi M.C.72 · Lab | Own XML±15° controls; two original two-blade props with exact sourcehubs/opposite+X/−X axes/1780rpm; measuredØ2.811/2.756m vs2.76within3%. Original red/brass/silver Default paint and source−162° cover/standardglass. Length8.252/span9.469m within1% of8.32/9.48. [Preserved M.C.72](https://commons.wikimedia.org/wiki/File:2024-06-01-Museo-Vigna-di-Valle-Macchi-Castoldi-MC-72.jpg) and authorthumbnail checked. [Compare](artifacts/lab/mc72-compare.jpg). | No candidates supplied. Missing base/MPdooralias startup; inspector normalizeddoor0..1 qualification. Source2.04° is untrustedwaterdatum; historicalheightabsent, noheightaccuracyclaim. |`

Progress completion text (live onlyafterroot): XML15°controls exacthinges/signs, separatecontra2-bladeshafts sourcehubs/RPM/diameter,162°canopy withnormalizedaliascaveat,sourceDefaultpaint/glassselectors, fixedfloats, length/spanspectests,2.04°qualifiedwaterpose.


### Caproni Ca.60 Lab implementation and verification

- [x] Guess audit written first; preserved benchmark module/tests, no-XML pack,13 references and two candidate metadata read. Museum model/period photographs and primary1921Flight/NACA technical report consulted.
- [x] Reuse preserved benchmark recovery of intact wing geometry, four interplane rudders, imported fixed hull/nacelles/booms/struts and eight propeller sites. Museum-guided silver fabric/navy lower hull and roof/ivory nacelles/navy engine trim/wood props retained. No protected module edits.
- [x] Flight28April1921 explicitly describes two outer+central tractor/pusher pairs at each end: eight separate props. Retain mixed2-blade outer/4-blade central layout seen in supplied museummodel and periodphotos; generic pack4-blade metadata does not apply to every prop.
- [x] Uniform span calibration from contemporary98ft6in=30.0228m, preserving vertex/shape proportions. Result26.2976m length /9.7903m height. Flight79ft=24.0792m gives length discrepancy+9.2%; museum25m gives+5.2%, pack22.6m+16.4%. No longitudinal squeeze or5%proportion pass claimed.
- [x] Reference-supported control linkage has no travel numbers. Lab holds all surfaces neutral; original ChatGPT controls remain unchanged in separate entry. Propeller slider explicitly labels display rate, preserving benchmark visual spin without an installedRPM claim. Waterdraft remains provisional benchmark displaydatum.
- [x] Every damaged/duplicate export quarantined under `original_` with reason and revealable. Generated procedural finishes need no copied photo or GLB; no sounds/Nasal/eye data supplied.
- [x] `node tests/lab/ca60.test.mjs` actual-model test passes: uniformscale/proportion preservation, intact bank and mixedprop/rudder counts, neutralunknowntravel, quarantinereasons, proceduralpaint andpausedspin.
- [ ] Both cleared supplied candidates from matching camera and final donor suitability decision. Metadata/earlier user comparison favors intact original; rounded1dec6a9e wing edges and missingfairtriangles inNoviplano are concerns, never licence exclusions.
- [ ] Live parked/flight/engineendpoints/appearance/quarantine evidence; `artifacts/lab/ca60-inspector.jpg`, `ca60-compare.jpg` pending browser recovery.
- [ ] Resolve historical travel/hub/propdiameter/RPM/draft and dimensions before asserting exact reconstruction.

Sources: [Flight28April1921 article/photos/drawings](https://aviadejavu.ru/Site/Crafts/Craft31976.htm); [Caproni Museum,Semprini](https://mostre.museocaproni.it/sala/en/pilota/semprini-federico/); [Munk,NACA-TN57 July1921](https://ntrs.nasa.gov/citations/19930080852). NACA's sixprop/108ft assumptions are a tentative aerodynamic analysis with unknown basicdetails; the detailed contemporaryFlight description and museummodel outweigh them for visiblelayout. No primaryPDF/referencephotos committed. Exact museum-guided finish sources remain in the preservedREADME section.

Pack requests: non-FlightGear static/manual downloads need an inapplicable-animation warning instead of inventedXML instruction; export perpropeller bladecount, qualified reliable dimensions and sourcebasis; add verified frame/scale/dimensioned drawing, mechanicaltravels/hinges/driveRPM and loadedwaterline. Threeview11 downloaded image was solidblack; replace with usable original drawing.

### Cross-aircraft review fixes and final validation

- [x]12 Lab modules and interleaved entries registered, with one ordered local commit per aircraft. No remote push.
- [x] Independent review confirmed25 protected baseline files (six original modules, original tests/artifacts/models) byte-identical; original README remains exact prefix. No alternate GLBs, source archives/XML/audio or reference photos copied into runtime data.
- [x] EC130 cockpit collective lever now uses source inverted throttle convention while inspector blade-incidence slider runs low→high. Lever0° at minimum incidence,20° at maximum; actual-model test checks both sides.
- [x] Shared Lab cyclic incidence now follows current blade azimuth as rotor spins, keeping cyclic direction fixed in world/shaft coordinates instead of rotating it with the blades. New test checks quarter/half/full turns, fixed shaft, collective invariance and stopped pose for all3 helicopters. Source basis: [FlightGear YASim Rotor.cpp](https://github.com/FlightGear/flightgear/blob/next/src/FDM/YASim/Rotor.cpp). Airfoil/flapping/aerodynamic phase response remains approximate.
- [x] Helicopter sliders are independent full mechanical inspection ranges. They do not claim to reproduce source controller gains or affine neutral biases: source source-control channels may use reducedranges/invertedthrottle and nonzero cyclic bias. EC cockpit collective translation explicitly accounts for inverted rawproperty. Blade-incidence endpoint ranges remain source-derived.
- [x] E-Flash pitch degree label now follows actual XMLtable+6/−3/−12 at input−1/0/+1.
- [x] Actual-GLB textureloader capture across default+every named livery identified11 unused runtime files; removed them and dead binding rows. SpitfirePanel-Construction has no exportedUV although packclaimedUV. No currently used paint/livery data removed; embeddedoriginalmaps unchanged.
- [x] Final validation2026-10-04: `npm run build` succeeds (752.2KB); all14 `npm run test:lab` files pass; unchanged `npm test` passes. Protected-file byte audit and originalREADME-prefix audit pass; `git diff --check` passes. Reviewbundle rebuilt for all12 entries.
- [ ] Browser evidence: EC130 finalrecheck,Bo105,E-Flash,M33,S6B,MC72,Ca60 livecontrols/presets/defaultpaint and7 inspector/7compare artifacts. M33's1candidate andCa60's2candidate renders remain. Previewservers running5173/5175; stale browser tabs resolve to blockeddataURL, userreopen requested. No missingartifact falsely marked complete.

Additional builder requests from final review: stop copying textures for emptyglb_nodes or meshes that lostUV; distinguish independent mechanical limits from source controllergain/mapping/bias; preserve rotorcyclic azimuth and source phi0/restphase metadata. Previously copiedunusedfiles were Spitfire green/red/white/mk20i,Seafire green/red/white,F4U pilot1,Dauphin two lightatlases/generalpilot. Runtime paint recovery may preserve authoredembeddedmap when a matching externalbinding is absent; this does not establish missingUV.
