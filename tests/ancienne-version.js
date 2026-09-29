// Ancienne version : rendu d'origine, et échanges de données avec la nouvelle version dans les deux sens
const { chromium } = require('playwright');const fs=require('fs');const path=require('path');
const N=s=>parseFloat(String(s).replace(/[^\d,-]/g,'').replace(',','.'))||0;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
const p=await b.newPage({viewport:{width:1300,height:1300}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const fails=[];const chk=(c,m)=>{if(!c)fails.push(m)};
await p.addInitScript(s=>{if(!sessionStorage.getItem('init')){localStorage.setItem('suivi_financier_local_v1',s);localStorage.removeItem('sf_view');sessionStorage.setItem('init','1')}},fs.readFileSync(process.argv[2],'utf8'));
await p.goto('file://'+path.resolve(__dirname,'../suivi-financier.html'));await p.waitForTimeout(700);
const $o=(sel,fn)=>p.evaluate(([sel,fn])=>{const r=document.getElementById('oldHost').shadowRoot;const e=r.querySelector(sel);return e?(new Function('e','return '+fn))(e):null},[sel,fn]);
chk(await p.evaluate(()=>!document.getElementById('oldHost').hidden),'ouverture : l\'ancienne version doit s\'afficher par défaut');
const data=JSON.parse(await p.evaluate(()=>localStorage.getItem('suivi_financier_local_v1')));
const rev=Object.values(data.revenus||{});
const total=rev.reduce((a,r)=>a+N(r.montant),0);
chk(Math.abs(N(await $o('#cumulTotal','e.textContent'))-total)<=1,`cumul total ${await $o('#cumulTotal','e.textContent')} ≠ ${total}`);
chk((await $o('.brand','getComputedStyle(e).fontFamily')).includes('Fraunces'),'police Fraunces absente');
chk(await $o(':host .cumul','getComputedStyle(e).backgroundColor')==='rgb(22, 33, 58)'||true,'');
chk(await p.evaluate(()=>getComputedStyle(document.getElementById('oldHost').shadowRoot.querySelector('.cumul')).backgroundColor)==='rgb(22, 33, 58)','bandeau bleu marine absent');
chk(await p.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(245, 242, 234)','fond crème absent');
await p.screenshot({path:path.resolve(__dirname,'ancienne.png'),fullPage:true});
// 1. ancienne -> nouvelle : passer un revenu en encaissé
const id=await p.evaluate(()=>document.getElementById('oldHost').shadowRoot.querySelector('#tbodyRevenus tr[data-id]').dataset.id);
await p.evaluate(id=>{const r=document.getElementById('oldHost').shadowRoot;const s=r.querySelector(`tr[data-id="${id}"] .f-statut`);s.value='encaisse';s.dispatchEvent(new Event('change'))},id);
await p.waitForTimeout(100);
await p.click('#viewSwitch');await p.waitForTimeout(1200);
await p.click('[data-tab=revenus]');await p.waitForTimeout(150);
chk(await p.$eval(`[data-rid="${id}"] select[data-rf=statut]`,e=>e.value)==='encaisse','ancienne → nouvelle : le statut encaissé ne passe pas');
// 2. nouvelle -> ancienne : modifier un montant
await p.fill(`[data-rid="${id}"] input[data-rf=montant]`,'4321');await p.waitForTimeout(100);
await p.click('#viewSwitch');await p.waitForTimeout(1200);
chk(await p.evaluate(id=>document.getElementById('oldHost').shadowRoot.querySelector(`tr[data-id="${id}"] .f-montant`).value,id)==='4321','nouvelle → ancienne : le montant ne passe pas');
// 3. ressources : l'ancienne version ne doit pas effacer Livret A / LDDS de la nouvelle
await p.click('#viewSwitch');await p.waitForTimeout(1200);
await p.click('[data-tab=ressources]');await p.fill('#resLivretA','3000');await p.fill('#resLdds','1000');await p.fill('#resCc','500');await p.waitForTimeout(100);
await p.click('#viewSwitch');await p.waitForTimeout(1200);
chk(N(await $o('#resEpargne','e.value'))===4000,`ressources : épargne dans l'ancienne ${await $o('#resEpargne','e.value')} au lieu de 4000`);
await p.evaluate(()=>{const r=document.getElementById('oldHost').shadowRoot;r.querySelector('.top-tab[data-tab=ressources]').click();const i=r.querySelector('#resCc');i.value='800';i.dispatchEvent(new Event('input'))});
await p.waitForTimeout(700);
await p.click('#viewSwitch');await p.waitForTimeout(1200);
chk(await p.$eval('#resLdds',e=>e.value)==='1000','ressources : le LDDS a été effacé par l\'ancienne version');
chk(await p.$eval('#resCc',e=>e.value)==='800','ressources : le compte courant modifié dans l\'ancienne ne passe pas');
// 4. rechargement : la version choisie est mémorisée
await p.reload();await p.waitForTimeout(700);
chk(await p.evaluate(()=>!document.getElementById('app').hidden),'rechargement : la dernière version utilisée n\'est pas reprise');
// 5. onglets de l'ancienne version
await p.click('#viewSwitch');await p.waitForTimeout(1200);
for(const t of ['depenses','ressources','previsionnel','revenus']){await p.evaluate(t=>document.getElementById('oldHost').shadowRoot.querySelector(`.top-tab[data-tab=${t}]`).click(),t);await p.waitForTimeout(100);
  chk(await p.evaluate(t=>document.getElementById('oldHost').shadowRoot.getElementById('panel-'+t).classList.contains('active'),t),`onglet ${t} ne s'ouvre pas`);}
await p.evaluate(()=>{const r=document.getElementById('oldHost').shadowRoot;r.querySelector('.top-tab[data-tab=previsionnel]').click();const s=r.getElementById('horizonSelect');s.value='24';s.dispatchEvent(new Event('change'))});await p.waitForTimeout(150);
chk(await p.evaluate(()=>document.getElementById('oldHost').shadowRoot.querySelectorAll('#monthlyTable tbody tr').length)===28,'prévisionnel 24 mois : nombre de lignes');
console.log('CONTRÔLES EN ÉCHEC',fails.length);fails.forEach(f=>console.log('  '+f));console.log('JS',errs);await b.close();})();
