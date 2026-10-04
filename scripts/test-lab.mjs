import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const folder=new URL('../tests/lab/',import.meta.url);
for(const file of readdirSync(folder).filter(f=>f.endsWith('.test.mjs')).sort()){
 const result=spawnSync(process.execPath,[new URL(file,folder).pathname],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status??1);
}
