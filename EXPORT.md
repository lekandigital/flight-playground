# Flight Playground export

This project began as an export of the source repository backing published Site version 3, commit `a8ae94b4bc74ddecb43cdf37fb011a4b630e8e8b`. That snapshot contained five aircraft: Supermarine S.6B, Macchi MC.72, Macchi M.33, F4U Corsair, and F-16.

The local project has since added Caproni Ca.60 reconstruction and paint repairs, six aircraft from `flight-playground 3`, loading aircraft on selection, and their runtime controls and tests. It now includes twelve GLBs, source, the rebuilt demo, HTML/CSS, embedded textures, rig code, lockfile, local-run support, and the original hosting configuration. See `README.md` for the current aircraft behavior and model repairs. The original Site snapshot is provenance for this project; it does not describe the current local source or build.

## Run locally

Use Node.js 18 or newer. From this folder:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. The server serves the included production build. After editing source, run `npm run build` and refresh the page. Set `PORT` or `HOST` to change the listening address.

## Rebuild and check

```sh
npm run build
npm test
```

The original package/lockfile pins Three.js 0.180.0 and esbuild 0.25.10. Three.js is also included in the built JavaScript. Installed `node_modules` and package-manager caches are excluded; `npm install` restores them.

## Deploy independently

Run `npm install` and `npm run build`, then publish the contents of `dist/` on any static-site host. Serve `dist/` as the website root: the page uses root-relative `/game.js`, `/style.css`, and `/models/` paths. No ChatGPT service, API credentials, or third-party asset CDN is needed.

## Aircraft

Supermarine S.6B, Macchi MC.72, Macchi M.33, F4U Corsair, F-16, Caproni Ca.60, E-Flash, BO 105, Dauphin, EC130, Spitfire Mk Vb, and Seafire Mk III. The seven additions after the original Site export are bundled locally alongside the original five models.
