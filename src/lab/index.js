import {loadFacts} from './lab-tools.js';
import {prepareSpitfireLab} from './spitfire.js';
import {prepareSeafireLab} from './seafire.js';
import {prepareF4uLab} from './f4u.js';
import {prepareF16Lab} from './f16.js';
import {prepareDauphinLab} from './dauphin.js';
import {prepareEc130Lab} from './ec130.js';
import {prepareBo105Lab} from './bo105.js';
import {prepareEflashLab} from './eflash.js';
import {prepareM33Lab} from './m33.js';
import {prepareS6BLab} from './s6b.js';
import {prepareMC72Lab} from './mc72.js';
const preparers={spitfire:prepareSpitfireLab,seafire:prepareSeafireLab,f4u:prepareF4uLab,f16:prepareF16Lab,dauphin:prepareDauphinLab,ec130:prepareEc130Lab,bo105:prepareBo105Lab,eflash:prepareEflashLab,m33:prepareM33Lab,s6b:prepareS6BLab,mc72:prepareMC72Lab};
export function labVersions(planes){return planes.flatMap(p=>[p,...(preparers[p.id]?[{...p,id:p.id+'-lab',name:p.name+' · Lab',detail:'Original download · XML rig and source paint',lab:true,baseId:p.id}]:[])]);}
export async function prepareLab(root,animations,plane){return preparers[plane.baseId](root,animations,await loadFacts(plane.file.replace(/\.glb$/,'')));}
export function matchesVersion(plane,version){return version==='both'||(version==='lab'?!!plane.lab:!plane.lab);}
