# Flight Playground export

Taken directly from the source repository backing published Site version 3, commit `a8ae94b4bc74ddecb43cdf37fb011a4b630e8e8b`. Includes the source, built demo, HTML/CSS, all five original GLBs and their embedded textures, runtime rig code, tests, lockfile, and hosting configuration.

Only local-run support was added: the `dev` command in `package.json`, `scripts/dev-server.mjs`, and this note. Every other original project file is unchanged. The deployed Site was not changed.

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
node tests/corsair.test.mjs
node tests/aircraft.test.mjs
```

The original package/lockfile pins Three.js 0.180.0 and esbuild 0.25.10. Three.js is also included in the built JavaScript. Installed `node_modules` and package-manager caches are excluded; `npm install` restores them.

## Deploy independently

Run `npm install` and `npm run build`, then publish the contents of `dist/` on any static-site host. Serve `dist/` as the website root: the page uses root-relative `/game.js`, `/style.css`, and `/models/` paths. No ChatGPT service, API credentials, or third-party asset CDN is needed.

## Aircraft

Supermarine S.6B, Macchi MC.72, Macchi M.33, F4U Corsair, and F-16. The two Spitfire models referenced elsewhere are not part of this published version.
