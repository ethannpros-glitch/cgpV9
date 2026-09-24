// Audit : actionne chaque contrôle de chaque onglet et vérifie que quelque chose change (affichage ou données enregistrées)
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
const seed=fs.readFileSync(process.argv[2],'utf8');
const tabs=['budget','systeme','revenus','depenses','objectifs','previsionnel','ressources'];
const dead=[], ok=[], errs=[];
for(const tab of tabs){
  const p=await b.newPage({viewport:{width:1300,height:1400}});p.on('pageerror',e=>errs.push(tab+': '+e.message));
  await p.addInitScript(([s,t])=>{localStorage.setItem('suivi_financier_local_v1',s);localStorage.setItem('sf_tab',t)},[seed,tab]);
  await p.goto('file://'+require('path').resolve(__dirname,'../suivi-financier.html'));await p.waitForTimeout(400);
  const n=await p.$$eval(`#p-${tab} :is(input,select,button,summary)`,x=>x.length);
  for(let i=0;i<n;i++){
    await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close())});
    const ctl=(await p.$$(`#p-${tab} :is(input,select,button,summary)`))[i]; if(!ctl) continue;
    const info=await ctl.evaluate(e=>({tag:e.tagName,type:e.type||'',id:e.id,txt:(e.textContent||e.getAttribute('aria-label')||e.placeholder||'').trim().slice(0,40),ds:JSON.stringify(e.dataset),vis:!!(e.offsetWidth||e.offsetHeight)&&!e.disabled}));
    if(!info.vis) continue;
    const snap=()=>p.evaluate(()=>document.querySelector('.wrap').innerText+'|'+localStorage.getItem('suivi_financier_local_v1')+'|'+!!document.querySelector('dialog[open]')+'|'+document.querySelector('[aria-selected=true]').dataset.tab+'|'+(document.getElementById('toast').hidden?'':document.getElementById('toast').textContent)+'|'+[...document.querySelectorAll('details')].map(d=>d.open).join());
    const before=await snap();
    try{
      if(info.tag==='SELECT'){ const opts=await ctl.evaluate(e=>[...e.options].map(o=>o.value).filter(v=>v!==e.value)); if(!opts.length) continue; await ctl.selectOption(opts[opts.length-1]); }
      else if(info.type==='checkbox'){ await ctl.click(); }
      else if(info.tag==='INPUT' && info.type!=='file'){ const v=info.type==='date'?'2026-12-15':info.type==='month'?'2027-03':'1234'; await ctl.fill(v); await ctl.dispatchEvent('change'); await ctl.press('Tab').catch(()=>{}); }
      else if(info.type==='file') continue;
      else { await ctl.click({timeout:2000}); }
    }catch(e){ dead.push(`[${tab}] ${info.tag} ${info.id||info.txt||info.ds} -> erreur action`); continue; }
    await p.waitForTimeout(450);
    const after=await snap();
    (after===before?dead:ok).push(`[${tab}] ${info.tag}${info.type?'/'+info.type:''} ${info.id||''} «${info.txt}» ${info.ds!=='{}'?info.ds:''}`);
  }
  await p.close();
}
console.log('OK',ok.length);console.log('SANS EFFET',dead.length);dead.forEach(d=>console.log('  '+d));console.log('ERREURS JS',errs);
await b.close();})();
