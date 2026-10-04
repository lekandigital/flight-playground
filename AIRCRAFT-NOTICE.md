# Added FlightGear aircraft

The four aircraft were imported from [the supplied project branch](https://github.com/lekandigital/flight-playground/tree/45596a3) (`codex/flight-playground-2026-10-04`, commit `45596a3`). Their original `model.glb` files and supplied textures are preserved under `dist/flightgear/`. Runtime adaptations, compiled fact data and procedural repairs are separate source code. Provided XML, Nasal and effect files are included under `aircraft-source/`; embedded copyright notices remain intact.

| Aircraft | Source / attribution | Supplied licence status |
|---|---|---|
| Official P-51D-25-NA | FlightGear; Jim Wilson, Jon Berndt, Hal V. Engel, onox | GPL, as stated by the supplied download. Individual provided Nasal files state GPL v2 or later. |
| daVinci P-51D | FGUK; source credits Vodoun da Vinci, Detlef Faber, Stuart Cassie and an AlphaSim Freeware 3D Model | **None stated in the supplied package.** “Freeware” credit is not a replacement for a licence. |
| Mustang III | FGUK; source credits Vodoun da Vinci, StuartC | **None stated in the supplied package.** |
| MiG-29 Fulcrum | FlightGear; source XML/Nasal credits Gary R. Neely (“Buckaroo”) | GPL, as stated by the supplied download. Exact GPL version is not stated in the provided aircraft metadata. |

The owner has confirmed that licensing for the supplied aircraft and comparison models is sorted and has authorized borrowing suitable parts. The table records the notices present in the supplied files; it does not replace that clearance or assert new rights.

GPL text is included in `licenses/GPL-2.txt`; upstream per-file notices retain their own version terms. [GNU licence texts](https://www.gnu.org/licenses/) are the authoritative source. The converted GLBs are supplied exports. The imported branch did not contain complete upstream AC3D aircraft sources; this project does not claim to include those unprovided files.

The branch import excludes reference photos, author screenshots and `P51-other-models.zip`. Its official P-51D canopy, daVinci propeller and MiG-29 bay repairs are procedural fits; the imported runtime does not use parts or pixels from comparison models. Any later borrowed part should retain its own provenance in the associated repair report.

Existing aircraft attribution remains in README.md and their original assets. Three.js and esbuild retain their upstream dependency licences through npm.
