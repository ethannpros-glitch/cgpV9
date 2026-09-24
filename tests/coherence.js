const { chromium } = require('playwright');const fs=require('fs');
const N=s=>{if(s==null)return NaN;s=String(s).replace(/[\s  €+]/g,'').replace('−','-').replace(',','.');return s===''||s==='—'?0:parseFloat(s)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
const p=await b.newPage({viewport:{width:1300,height:1400}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(s=>{localStorage.setItem('suivi_financier_local_v1',s);localStorage.setItem('sf_tab','previsionnel')},fs.readFileSync(process.argv[2],'utf8'));
await p.goto('file://'+require('path').resolve(__dirname,'../suivi-financier.html'));await p.waitForTimeout(500);
const fails=[];
if(process.env.MUT){
  await p.click('[data-tab=budget]');await p.waitForTimeout(100);
  for(const k of await p.$$eval('#p-budget input[type=checkbox][data-k]',x=>x.slice(0,4).map(e=>e.dataset.k))){await p.click(`[data-f=done][data-k="${k}"]`);await p.waitForTimeout(60);}
  await p.fill('#p-budget input[data-f=reel]','777');await p.dispatchEvent('#p-budget input[data-f=reel]','change');await p.waitForTimeout(100);
  await p.click('#nextM');await p.waitForTimeout(60);const k2=await p.$eval('#p-budget input[data-f=prevu]',e=>e.dataset.k);await p.fill(`[data-f=prevu][data-k="${k2}"]`,'2500');await p.dispatchEvent(`[data-f=prevu][data-k="${k2}"]`,'change');await p.waitForTimeout(100);
  await p.click('[data-tab=systeme]');await p.fill('[data-cfg=prov]','22');await p.dispatchEvent('[data-cfg=prov]','change');await p.waitForTimeout(100);
  await p.fill('[data-cfg=salaire]','2100');await p.dispatchEvent('[data-cfg=salaire]','change');await p.waitForTimeout(100);
  await p.click('[data-tab=objectifs]');await p.waitForTimeout(100);
  const l=await p.$('#p-objectifs [data-linkdep]');if(l){await l.click();await p.waitForTimeout(100);}
  const u=await p.$('#p-objectifs [data-up]');if(u){await u.click();await p.waitForTimeout(100);}
  await p.click('[data-tab=depenses]');await p.waitForTimeout(100);const m=await p.$('#p-depenses [data-mkgoal]');if(m){await m.click();await p.waitForTimeout(100);}
  const d=await p.$('#p-depenses [data-dpaid]');if(d){await d.click();await p.waitForTimeout(100);}
  await p.selectOption('#depBody select[data-df=nature]','envie');await p.waitForTimeout(100);
  await p.click('[data-import=depenses]');await p.fill('#impText','Voyage Lisbonne 850 15/03/2027\nAbonnement salle 45 05/10/2026');await p.click('#impGo');await p.waitForTimeout(150);
  await p.click('[data-tab=ressources]');await p.fill('#resLivretA','4000');await p.fill('#resCc','1500');await p.waitForTimeout(100);
  await p.click('[data-tab=previsionnel]');await p.waitForTimeout(150);
}const chk=(c,msg)=>{if(!c)fails.push(msg)};
// 1. horizon
for(const h of ['6','12','24']){await p.selectOption('#horizon',h);await p.waitForTimeout(150);
  const rows=await p.$$eval('#mtable tbody tr',x=>x.length);chk(rows===4+ +h,`horizon ${h}: ${rows} lignes au lieu de ${4+ +h}`);
  const bars=await p.$$eval('#projChart svg text',x=>x.filter(t=>t.getAttribute('font-size')==='10.5').length);chk(bars===4+ +h,`horizon ${h}: graphique ${bars} mois`);}
await p.selectOption('#horizon','24');await p.waitForTimeout(150);
const prev=await p.$$eval('#mtable tbody tr',x=>x.map(r=>[...r.cells].map(c=>c.innerText)));
const hdr=await p.$$eval('#mtable thead th',x=>x.map(t=>t.innerText));
console.log(hdr.join(' | '));
// 2. cc chaining
let prevCc=null;
prev.forEach((r,i)=>{const cc=N(r[7]);if(r[7].trim()==='—'){return;} const net=N(r[5]),ret=N(r[6]); if(prevCc!=null) chk(Math.abs(prevCc+net+ret-cc)<=2,`${r[0]}: compte courant ${cc} ≠ ${prevCc}+${net}+${ret}`); prevCc=cc;});
// 3. solde = entrées - dépenses - épargne
prev.forEach(r=>{const e=N(r[1])+N(r[2]),d=N(r[3]),ep=N(r[4]),s=N(r[5]);chk(Math.abs(e-d-ep-s)<=2,`${r[0]}: solde ${s} ≠ ${e}-${d}-${ep}`)});
// 4. dashboard per month vs prévisionnel
await p.click('[data-tab=budget]');await p.waitForTimeout(150);await p.click('#todayM');await p.waitForTimeout(100);
const monthsFut=prev.filter(r=>!/(juin|juillet|août) 2026/.test(r[0])).slice(0,25);
for(let i=0;i<monthsFut.length;i++){
  const r=monthsFut[i];
  const name=(await p.$eval('#curMonth',e=>e.textContent)).toLowerCase();
  chk(r[0].toLowerCase().startsWith(name),`mois décalés : tableau de bord ${name} / prévisionnel ${r[0]}`);
  const tot=async s=>N(await p.$eval(`#sec-${s} header small`,e=>e.textContent.replace('sur','').replace('prévus','')));
  const rev=await tot('rev'),fix=await tot('fix'),vr=await tot('var'),ep=await tot('epa');
  chk(Math.abs(rev-(N(r[1])+N(r[2])))<=2,`${r[0]}: revenus tableau de bord ${rev} ≠ prévisionnel ${N(r[1])+N(r[2])}`);
  chk(Math.abs(fix+vr-N(r[3]))<=2,`${r[0]}: dépenses tableau de bord ${fix+vr} ≠ prévisionnel ${N(r[3])}`);
  chk(Math.abs(ep-N(r[4]))<=2,`${r[0]}: épargne tableau de bord ${ep} ≠ prévisionnel ${N(r[4])}`);
  await p.click('#nextM');await p.waitForTimeout(80);
}
// 5. plan d'épargne vs prévisionnel
await p.click('[data-tab=objectifs]');await p.waitForTimeout(150);
const plan=await p.$$eval('#planCard tbody tr',x=>x.map(r=>[...r.cells].map(c=>c.innerText)));
plan.forEach(pr=>{const r=prev.find(x=>x[0].toLowerCase().startsWith(pr[0].toLowerCase()));if(!r)return fails.push('plan: mois absent '+pr[0]);
  chk(Math.abs(N(pr[1])-(N(r[1])+N(r[2])))<=2,`${pr[0]}: revenus plan ${pr[1]} ≠ prévisionnel`);
  chk(Math.abs(N(pr[4])-N(r[4]))<=2,`${pr[0]}: épargne plan ${pr[4]} ≠ prévisionnel ${r[4]}`);
  chk(Math.abs(N(pr[2])+N(pr[3])-N(r[3]))<=2,`${pr[0]}: besoins+envies plan ${N(pr[2])+N(pr[3])} ≠ dépenses prévisionnel ${r[3]}`);
  chk(Math.abs(N(pr[5])+N(pr[6])+N(pr[7])-N(pr[4]))<=2,`${pr[0]}: Livret A+LDDS+investi ≠ à épargner`);});
// 6. en-tête
const hero=await p.$$eval('.hero .fig b',x=>x.map(e=>e.textContent));
const cur=prev.find(r=>/en cours/.test(r[0]));chk(Math.abs(N(hero[1])-N(cur[7]))<=2,`en-tête compte courant ${hero[1]} ≠ prévisionnel ${cur[7]}`);
const dec=prev.find(r=>/décembre 2026/.test(r[0]));chk(Math.abs(N(hero[2])-N(dec[8]))<=2,`en-tête épargne fin d'année ${hero[2]} ≠ prévisionnel décembre ${dec[8]}`);
// 7. comptes d'épargne dans 12 mois vs épargne totale prévisionnel
const acc=await p.$$eval('#accCard .acc b',x=>x.map(e=>e.textContent.split('→')[1]));const accSum=acc.reduce((a,v)=>a+N(v),0);
const r11=prev.find(r=>/août 2027/.test(r[0]));chk(Math.abs(accSum-N(r11[8]))<=3,`comptes dans 12 mois ${accSum} ≠ épargne totale août 2027 ${r11[8]}`);
// 8. système : ce mois-ci
await p.click('[data-tab=systeme]');await p.waitForTimeout(150);
const eq=await p.$eval('#sysFlow .eq',e=>e.innerText);console.log(eq);
const nums=[...eq.matchAll(/(\d[\d\s  ]*?)[\s  ]€/g)].map(m=>N(m[1]));const r0=cur;
chk(Math.abs(nums[0]-(N(r0[1])+N(r0[2])))<=2,`système: encaissés ${nums[0]} ≠ prévisionnel`);
chk(Math.abs(nums[3]-N(r0[4]))<=2,`système: épargne ${nums[3]} ≠ prévisionnel ${r0[4]}`);
chk(Math.abs(nums[1]+nums[2]-N(r0[3]))<=2,`système: provision+dépenses ${nums[1]+nums[2]} ≠ dépenses prévisionnel ${r0[3]}`);
console.log('CONTRÔLES EN ÉCHEC',fails.length);fails.forEach(f=>console.log('  '+f));console.log('JS',errs);await b.close();})();
