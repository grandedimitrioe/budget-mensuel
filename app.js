'use strict';
const KEY='alpesfinance-budget-v1';
const uid=()=>Math.random().toString(36).slice(2,10);
const fmt=n=>{const s=(Math.round((+n||0)*100)/100).toFixed(2);const neg=s[0]==='-';let [i,d]=s.replace('-','').split('.');i=i.replace(/\B(?=(\d{3})+(?!\d))/g,"'");return (neg?'−':'')+i+'.'+d};
const chf=n=>fmt(n)+' CHF';
const parse=v=>{const n=parseFloat(String(v).replace(/['\s]/g,'').replace(',','.'));return isNaN(n)?0:n};
const ym=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const MN=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const mLabel=k=>{const[y,m]=k.split('-');return MN[m-1]+' '+y};
const shift=(k,n)=>{const[y,m]=k.split('-').map(Number);return ym(new Date(y,m-1+n,1))};
function defaults(){return{
 income:[{id:uid(),label:'Salaire',amount:''}],
 fixed:[['Loyer',''],['Leasing voiture',''],['Leasing moto',''],['LAMal',''],['Téléphone',''],['Assurances',''],['Impôts (provision)',''],['Club moto','']].map(([l,a])=>({id:uid(),label:l,amount:a})),
 savings:[['3e pilier',''],['ETF',''],['Compte épargne','']].map(([l,a])=>({id:uid(),label:l,amount:a})),
 cats:[['Courses',400],['Restaurants',150],['Essence',150],['Loisirs',100],['Divers',50]].map(([n,b])=>({id:uid(),name:n,budget:b})),
 expenses:[]}}
let S;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S||!S.months)S={months:{},cur:ym(new Date())};
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
function month(k){if(!S.months[k]){const ks=Object.keys(S.months).filter(x=>x<k).sort();const base=ks.length?S.months[ks[ks.length-1]]:null;
 if(base){const c=JSON.parse(JSON.stringify(base));c.expenses=[];S.months[k]=c}else S.months[k]=defaults();save()}return S.months[k]}
const sum=a=>a.reduce((s,x)=>s+parse(x.amount),0);
function calc(M){const inc=sum(M.income),fix=sum(M.fixed),sav=sum(M.savings),vb=M.cats.reduce((s,c)=>s+parse(c.budget),0),vs=sum(M.expenses);
 return{inc,fix,sav,vb,vs,reste:inc-fix-sav-vs,plan:inc-fix-sav-Math.max(vb,vs),rate:inc?sav/inc*100:0}}
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function render(){const M=month(S.cur),c=calc(M);$('mTitle').textContent=mLabel(S.cur);
 $('dReste').textContent=chf(c.reste);$('dReste').className='big '+(c.reste<0?'neg':'pos');
 $('dInc').textContent=chf(c.inc);$('dFix').textContent=chf(c.fix);$('dSav').textContent=chf(c.sav);$('dVar').textContent=chf(c.vs);
 $('dPlan').textContent=chf(c.plan);$('dRate').textContent=c.rate.toFixed(1)+' %';
 $('vTot').textContent=fmt(c.vs)+' / '+fmt(c.vb);
 $('cats').innerHTML=M.cats.map(k=>{const sp=sum(M.expenses.filter(e=>e.catId===k.id)),b=parse(k.budget),p=b?sp/b:(sp?1.1:0),col=p>1?'var(--bad)':p>=.8?'var(--warn)':'var(--ok)',r=b-sp;
  return`<div class="cat"><div class="line"><input class="lbl" aria-label="Nom de catégorie" data-cat="${k.id}" data-f="name" value="${esc(k.name)}"><input class="amt" inputmode="decimal" aria-label="Budget ${esc(k.name)}" data-cat="${k.id}" data-f="budget" value="${esc(k.budget)}"><button class="ib" aria-label="Supprimer ${esc(k.name)}" data-delcat="${k.id}">✕</button></div>
  <div class="bar" role="progressbar" aria-label="${esc(k.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p*100)}"><i style="width:${Math.min(100,p*100)}%;background:${col}"></i></div>
  <div class="s">${fmt(sp)} dépensés · <b style="color:${col}">${r>=0?'reste '+fmt(r):'dépassé de '+fmt(-r)}</b></div></div>`}).join('');
 ['income','fixed','savings'].forEach(g=>{$('g-'+g).innerHTML=M[g].map(x=>`<div class="line"><input class="lbl" aria-label="Libellé" data-g="${g}" data-id="${x.id}" data-f="label" value="${esc(x.label)}"><input class="amt" inputmode="decimal" placeholder="—" aria-label="Montant ${esc(x.label)}" data-g="${g}" data-id="${x.id}" data-f="amount" value="${x.amount===''?'':esc(x.amount)}"><button class="ib" aria-label="Supprimer ${esc(x.label)}" data-delg="${g}" data-id="${x.id}">✕</button></div>`).join('')});
 const ex=[...M.expenses].sort((a,b)=>b.date.localeCompare(a.date));
 $('exps').innerHTML=ex.length?ex.map(e=>{const k=M.cats.find(c=>c.id===e.catId);return`<button class="exp" style="width:100%;background:none;border:0;border-bottom:1px solid var(--bd);color:inherit;text-align:left;font:inherit" data-exp="${e.id}" aria-label="Modifier ${esc(e.note||'dépense')}"><span><b>${esc(e.note||(k?k.name:'—'))}</b><br><span class="m">${e.date.split('-').reverse().join('.')} · ${esc(k?k.name:'Sans catégorie')}</span></span><b>${fmt(e.amount)}</b></button>`}).join(''):'<p class="m" style="color:var(--mut)">Aucune dépense ce mois-ci. Appuie sur « ＋ Dépense ».</p>';
 chartCat(M);chartMon();}
function chartCat(M){const d=M.cats.map(k=>({n:k.name,v:sum(M.expenses.filter(e=>e.catId===k.id)),b:parse(k.budget)}));const mx=Math.max(1,...d.map(x=>Math.max(x.v,x.b)));const h=d.length*34+6;
 $('chartCat').innerHTML=`<svg class="chart" viewBox="0 0 340 ${h}" width="100%" role="img" aria-label="Dépenses par catégorie">${d.map((x,i)=>{const y=i*34+4,w=x.v/mx*200,bw=x.b/mx*200;return`<text x="0" y="${y+16}">${esc(x.n)}</text><rect x="90" y="${y+4}" width="${bw}" height="18" rx="4" fill="none" stroke="var(--bd)"/><rect x="90" y="${y+4}" width="${w}" height="18" rx="4" fill="${x.v>x.b?'var(--bad)':'#D52B1E'}"/><text x="${Math.min(296,94+Math.max(w,bw))}" y="${y+17}">${fmt(x.v)}</text>`}).join('')}</svg>`}
function chartMon(){const ks=[];for(let i=5;i>=0;i--)ks.push(shift(S.cur,-i));const d=ks.map(k=>{const M=S.months[k];return{k,v:M?sum(M.expenses):0}});const mx=Math.max(1,...d.map(x=>x.v));
 $('chartMon').innerHTML=`<svg class="chart" viewBox="0 0 340 150" width="100%" role="img" aria-label="Dépenses variables mois par mois">${d.map((x,i)=>{const hh=x.v/mx*100,X=10+i*55;return`<rect x="${X}" y="${115-hh}" width="38" height="${hh}" rx="4" fill="${x.k===S.cur?'#D52B1E':'#e8a19b'}"/><text x="${X+19}" y="${110-hh}" text-anchor="middle">${x.v?Math.round(x.v):''}</text><text x="${X+19}" y="135" text-anchor="middle">${MN[+x.k.slice(5)-1].slice(0,4)}</text>`}).join('')}</svg>`}
document.addEventListener('change',e=>{const t=e.target,M=month(S.cur);
 if(t.dataset.cat){const k=M.cats.find(c=>c.id===t.dataset.cat);k[t.dataset.f]=t.dataset.f==='budget'?parse(t.value):t.value}
 else if(t.dataset.g){const x=M[t.dataset.g].find(c=>c.id===t.dataset.id);x[t.dataset.f]=t.dataset.f==='amount'?(t.value.trim()===''?'':parse(t.value)):t.value}else return;save();render()});
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const M=month(S.cur);
 if(t.dataset.delcat){const k=M.cats.find(c=>c.id===t.dataset.delcat);if(confirm(`Supprimer la catégorie « ${k.name} » ? Ses dépenses passent en « Sans catégorie ».`)){M.cats=M.cats.filter(c=>c!==k);save();render()}}
 else if(t.dataset.delg){M[t.dataset.delg]=M[t.dataset.delg].filter(x=>x.id!==t.dataset.id);save();render()}
 else if(t.dataset.add){M[t.dataset.add].push({id:uid(),label:'Nouveau',amount:''});save();render()}
 else if(t.dataset.exp)openDlg(M.expenses.find(x=>x.id===t.dataset.exp))});
$('addCat').onclick=()=>{const n=prompt('Nom de la catégorie ?');if(!n)return;month(S.cur).cats.push({id:uid(),name:n,budget:parse(prompt('Budget mensuel (CHF) ?','0'))});save();render()};
$('prev').onclick=()=>{S.cur=shift(S.cur,-1);save();render()};$('next').onclick=()=>{S.cur=shift(S.cur,1);save();render()};
let editing=null,selCat=null;
function openDlg(ex){const M=month(S.cur);editing=ex||null;$('dlgT').textContent=ex?'Modifier la dépense':'Nouvelle dépense';$('fDel').hidden=!ex;
 $('fAmt').value=ex?ex.amount:'';$('fNote').value=ex?ex.note:'';const today=new Date().toISOString().slice(0,10);
 $('fDate').value=ex?ex.date:(today.slice(0,7)===S.cur?today:S.cur+'-01');selCat=ex?ex.catId:(M.cats[0]&&M.cats[0].id);
 $('fCats').innerHTML=M.cats.map(k=>`<button type="button" data-c="${k.id}" aria-pressed="${k.id===selCat}">${esc(k.name)}</button>`).join('');
 $('dlg').showModal();setTimeout(()=>$('fAmt').focus(),50)}
$('fCats').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();selCat=b.dataset.c;[...$('fCats').children].forEach(x=>x.setAttribute('aria-pressed',x===b))});
$('fab').onclick=()=>openDlg();$('fCancel').onclick=()=>$('dlg').close();
$('fDel').onclick=()=>{const M=month(S.cur);M.expenses=M.expenses.filter(x=>x!==editing);save();$('dlg').close();render()};
$('fSave').onclick=()=>{const a=parse($('fAmt').value);if(a<=0){$('fAmt').focus();$('fAmt').setAttribute('aria-invalid','true');return}
 const d=$('fDate').value||S.cur+'-01',k=d.slice(0,7),rec={id:editing?editing.id:uid(),amount:a,catId:selCat,note:$('fNote').value.trim(),date:d};
 const cur=month(S.cur);if(editing)cur.expenses=cur.expenses.filter(x=>x!==editing);
 const T=month(k);if(k!==S.cur){const kn=cur.cats.find(c=>c.id===selCat);const tc=T.cats.find(c=>kn&&c.name===kn.name);rec.catId=tc?tc.id:selCat}
 T.expenses.push(rec);save();$('dlg').close();render()};
$('fAmt').addEventListener('keydown',e=>{if(e.key==='Enter')$('fSave').click()});
function dl(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('csv').onclick=()=>{const rows=[['Mois','Date','Catégorie','Note','Montant CHF']];Object.keys(S.months).sort().forEach(k=>{const M=S.months[k];M.expenses.forEach(e=>{const c=M.cats.find(x=>x.id===e.catId);rows.push([k,e.date,c?c.name:'',e.note,parse(e.amount).toFixed(2)])})});
 dl('budget-depenses.csv','\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\n'),'text/csv')};
$('json').onclick=()=>dl('budget-sauvegarde.json',JSON.stringify(S,null,1),'application/json');
$('imp').onclick=()=>$('impFile').click();
$('impFile').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(!d.months)throw 0;if(confirm('Remplacer toutes tes données par ce fichier ?')){S=d;save();render()}}catch(_){alert('Fichier invalide.')}})};
$('reset').onclick=()=>{if(confirm(`Réinitialiser ${mLabel(S.cur)} ? Les dépenses du mois seront effacées et les montants remis par défaut.`)){S.months[S.cur]=defaults();save();render()}};
window.__budget={get S(){return S},calc,fmt,month};
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
