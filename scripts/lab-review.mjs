// Read-only local review server. Reference photos and alternate GLBs stay in
// the supplied handoff; the generated bundle and page live in the OS temp dir.
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile,stat,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,relative,extname,join} from 'node:path';
import {homedir,tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url)),handoff=join(homedir(),'Downloads/flight-playground-handoff'),scratch=join(tmpdir(),'flight-lab-review');
await mkdir(scratch,{recursive:true});
await build({entryPoints:[join(root,'src/lab/review.js')],bundle:true,format:'esm',outfile:join(scratch,'review.js')});
await writeFile(join(scratch,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><title>Aircraft Lab comparison</title><style>body{margin:0;background:#152534;color:#e7edf2;font:14px system-ui}header{padding:18px}h1{font-size:22px;margin:0 0 10px}a{color:#9acfe8}button,select{font:inherit;padding:8px;margin-right:8px}#panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px}.panel{background:#273b4a;min-width:0}.view{height:420px;position:relative}canvas{position:absolute;inset:0;width:100%;height:100%}.photo{width:100%;height:420px;object-fit:contain;background:#20323e}.label{padding:10px;font-weight:600}.notes{padding:0 10px 12px;font-size:12px;min-height:44px;overflow-wrap:anywhere}#controls{padding:15px;display:flex;flex-wrap:wrap;gap:12px}label{display:flex;flex-direction:column}pre{white-space:pre-wrap;padding:12px}#status{padding:0 18px}body.candidates #panels{grid-template-columns:repeat(2,minmax(0,1fr))}body.candidates .view{height:260px}body.candidates .notes{min-height:0}body.candidates .photo{height:260px}</style></head><body><header><h1 id="title">Aircraft Lab comparison</h1><button id="parked">Parked</button><button id="flight">Flight pose</button><button id="side">Side</button><button id="perspective">Perspective</button><a id="candidateLink">Compare candidates</a><a id="prev">Previous candidates</a> <a id="next">Next candidates</a></header><p id="status">Loading…</p><main id="panels"></main><section id="controls"></section><pre id="report"></pre><script type="module" src="/review.js"></script></body></html>`);
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname.startsWith('/meta/')){const asset=pathname.slice(6);if(!/^[\w-]+$/.test(asset))throw Error();const pack=join(handoff,asset),facts=JSON.parse(await readFile(join(pack,'facts.json'),'utf8')),alternates=[];try{for(const name of await readdir(join(pack,'alternates')))if(!name.endsWith('.json')&&(await stat(join(pack,'alternates',name,'model.glb'))).isFile())alternates.push(name);}catch{}
 const refs=await readdir(join(pack,'reference/web')).catch(()=>[]),intended=await readdir(join(pack,'reference/flightgear')).catch(()=>[]);
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({asset,title:facts.title,alternates,refs,intended,references:await readFile(join(pack,'REFERENCES.md'),'utf8')}));return;}
 let base=scratch,path=pathname==='/'?'/index.html':pathname;if(pathname.startsWith('/pack/')){base=handoff;path=pathname.slice(5);}else if(pathname.startsWith('/models/')||pathname.startsWith('/lab/'))base=join(root,'dist');
 const file=resolve(base,'.'+path),rel=relative(base,file);if(rel.startsWith('..')||rel.startsWith('/'))throw Error();const info=await stat(file);if(!info.isFile())throw Error();res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-cache'});createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}}).listen(5175,'127.0.0.1',()=>console.log('Lab review: http://127.0.0.1:5175/?id=spitfire'));
