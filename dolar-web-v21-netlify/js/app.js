/* DÓLAR WEB · almacenamiento robusto: funciona también en iframes/restricciones de privacidad */
const dwStorage = (() => {
  try {
    const s = window.localStorage;
    const k='__dw_storage_test__';
    s.setItem(k,'1'); s.removeItem(k);
    return s;
  } catch {
    const mem = Object.create(null);
    return { getItem:k => Object.prototype.hasOwnProperty.call(mem,k) ? mem[k] : null, setItem:(k,v)=>{mem[k]=String(v)}, removeItem:k=>{delete mem[k]}, clear:()=>{for(const k of Object.keys(mem)) delete mem[k]} };
  }
})();
/* DÓLAR WEB · lógica de la aplicación */
function readVisualEdits(){ try{return JSON.parse(dwStorage.getItem('dw_visual_edits')||'{}')||{};}catch{return{};} }
function makeEditorKey(el){
  if(!el || !el.tagName) return '';
  const ds=el.dataset||{};
  if(ds.editorId) return ds.editorId;
  if(el.id) return el.id;
  const parts=[]; let cur=el;
  while(cur && cur.tagName && cur.tagName.toLowerCase()!=='body'){
    let idx=1, sib=cur.previousElementSibling;
    while(sib){ if(sib.tagName===cur.tagName)idx++; sib=sib.previousElementSibling; }
    parts.unshift(`${cur.tagName.toLowerCase()}[${idx}]`); cur=cur.parentElement;
  }
  return 'auto:'+parts.join('>');
}
function decorateEditorElements(){
  const liveIds=['lastUpdate','activeRateName','activeRateLabel','activeSellRate','balanceTotal','balanceUSD','balanceARS','usdBalance','selectedQuoteName','selectedQuoteSell','selectedQuoteBuy','selectedQuoteSell2','selectedQuoteTrend','demoRateText','cardSpendBalance','detailType','detailName','detailCardNumber','detailCardHolder','detailCardExpiry','detailFullNumber','detailFullExpiry','detailCvv','detailCardKind','helloName','settingsAccountName','settingsAccountEmail'];
  document.querySelectorAll('body *').forEach(el=>{
    if(!el || !el.tagName || ['SCRIPT','STYLE','LINK','META'].includes(el.tagName)) return;
    const ds=el.dataset;
    if(!ds) return;
    if(!ds.editorId) ds.editorId=makeEditorKey(el);
    if(el.id && liveIds.includes(el.id)) ds.live='true';
  });
}
function applyVisualEdits(){
  decorateEditorElements(); const edits=readVisualEdits();
  Object.entries(edits).forEach(([key,data])=>{
    if(!data || !key)return;
    const el=document.querySelector(`[data-editor-id="${CSS.escape(key)}"]`); if(!el)return;
    if(data.hidden!==undefined)el.style.display=data.hidden?'none':'';
    if(data.text!==undefined && !el.dataset?.live && !/^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName))el.textContent=data.text;
    if(data.value!==undefined && !el.dataset?.live && 'value' in el)el.value=data.value;
    if(data.placeholder!==undefined && 'placeholder' in el)el.placeholder=data.placeholder;
    if(data.href!==undefined && el.tagName==='A')el.setAttribute('href',data.href);
    Object.entries(data.styles||{}).forEach(([prop,value])=>{if(typeof prop==='string')el.style[prop]=value;});
  });
}

const isPreview=new URLSearchParams(location.search).has('preview');
const state={
  quotes:{}, selectedQuote:'oficial', mode:'ars-usd', history:safeParse('dw_quote_history',{}),
  activity:safeParse('dw_activity',[]), jars:safeParse('dw_jars',[]), creditApplications:safeParse('dw_credit_apps',[]), creditIssued:dwStorage.getItem('dw_credit_cards_issued')==='true', investments:safeParse('dw_investments',[]), investmentHistory:safeParse('dw_investment_history',[]), marketPrices:safeParse('dw_market_prices',{}),
  balanceHidden:dwStorage.getItem('dw_balance_hidden')!=='false', revealedCards:{}, securityExtra:dwStorage.getItem('dw_security_extra')!=='false', authMode:'login'
};
function safeParse(key,fallback){try{return JSON.parse(dwStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
function save(key,value){dwStorage.setItem(key,JSON.stringify(value));}
function walletBalanceARS(){const raw=dwStorage.getItem('dw_wallet_balance_ars');return raw===null?Number(DW_CONFIG.demoBalanceARS)||0:Number(raw)||0;}
function walletBalanceUSD(){const raw=dwStorage.getItem('dw_wallet_balance_usd');return raw===null?Number(DW_CONFIG.demoBalanceUSD)||0:Number(raw)||0;}
function setWalletBalances(arsAmount,usdAmount=walletBalanceUSD()){dwStorage.setItem('dw_wallet_balance_ars',String(Number(arsAmount)||0));dwStorage.setItem('dw_wallet_balance_usd',String(Number(usdAmount)||0));}

const QUOTE_DEFS=[
  {id:'oficial',label:'Dólar Oficial',endpoint:'https://dolarapi.com/v1/dolares/oficial'},
  {id:'blue',label:'Dólar Blue',endpoint:'https://dolarapi.com/v1/dolares/blue'},
  {id:'mep',label:'Dólar MEP',endpoint:'https://dolarapi.com/v1/dolares/bolsa'},
  {id:'ccl',label:'Dólar CCL',endpoint:'https://dolarapi.com/v1/dolares/contadoconliqui'},
  {id:'tarjeta',label:'Dólar Tarjeta',endpoint:'https://dolarapi.com/v1/dolares/tarjeta'},
  {id:'mayorista',label:'Dólar Mayorista',endpoint:'https://dolarapi.com/v1/dolares/mayorista'},
  {id:'cripto',label:'Dólar Cripto',endpoint:'https://dolarapi.com/v1/dolares/cripto'}
];
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const ars=(n,digits=2)=>Number.isFinite(Number(n))?new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(n)):'—';
const usd=(n,digits=2)=>Number.isFinite(Number(n))?`US$ ${new Intl.NumberFormat('es-AR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(n))}`:'—';
const pct=n=>Number.isFinite(Number(n))?`${Number(n)>=0?'+':''}${Number(n).toFixed(2)}%`:'—';
function toast(msg){const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2200);}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function hashPassword(str){let h1=0x811c9dc5,h2=0x01000193;for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h1=Math.imul(h1^c,0x01000193);h2=Math.imul(h2^(c+i),0x811c9dc5);}return `${(h1>>>0).toString(16)}-${(h2>>>0).toString(16)}`;}
function initials(name='JD'){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'JD';}

function svgIcon(name, extraClass=''){
  const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const icons={
    pencil:`<svg class="${extraClass}" ${common}><path d="m4 16 0-4L15.5 3.5a2.1 2.1 0 0 1 3 3L7 18l-3 1 1-3Z"/><path d="m13.5 5.5 3 3"/></svg>`,
    moon:`<svg class="${extraClass}" ${common}><path d="M20.3 14.8A8.6 8.6 0 0 1 9.2 3.7 8.6 8.6 0 1 0 20.3 14.8Z"/></svg>`,
    sun:`<svg class="${extraClass}" ${common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
    gear:`<svg class="${extraClass}" ${common}><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="M19.4 13.8a7.8 7.8 0 0 0 .1-1.8 7.8 7.8 0 0 0-.1-1.8l2-1.5-2-3.5-2.3.9a7.7 7.7 0 0 0-3.1-1.8L13.7 2H10.3l-.3 2.3a7.7 7.7 0 0 0-3.1 1.8L4.6 5.2l-2 3.5 2 1.5a7.8 7.8 0 0 0-.1 1.8 7.8 7.8 0 0 0 .1 1.8l-2 1.5 2 3.5 2.3-.9a7.7 7.7 0 0 0 3.1 1.8l.3 2.3h3.4l.3-2.3a7.7 7.7 0 0 0 3.1-1.8l2.3.9 2-3.5-2-1.5Z"/></svg>`,
    home:`<svg class="${extraClass}" ${common}><path d="m3.5 10.8 8.5-7 8.5 7"/><path d="M5.5 9.4V20h13V9.4"/><path d="M9.5 20v-5h5v5"/></svg>`,
    convert:`<svg class="${extraClass}" ${common}><path d="M4 7h13l-2.8-2.8"/><path d="m17 7-2.8 2.8"/><path d="M20 17H7l2.8 2.8"/><path d="m7 17 2.8-2.8"/></svg>`,
    savings:`<svg class="${extraClass}" ${common}><path d="M6 7h12a2 2 0 0 1 2 2v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a2 2 0 0 1 2-2Z"/><path d="M8 7V5.8A2.8 2.8 0 0 1 10.8 3h2.4A2.8 2.8 0 0 1 16 5.8V7"/><path d="M12 11v5M9.5 13.5h5"/></svg>`,
    invest:`<svg class="${extraClass}" ${common}><path d="M4 18V9"/><path d="M9 18V5"/><path d="M14 18v-7"/><path d="M19 18V3"/><path d="M4 20h16"/></svg>`,
    card:`<svg class="${extraClass}" ${common}><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>`,
    activity:`<svg class="${extraClass}" ${common}><path d="M4 17.5V6.5"/><path d="M9 19V5"/><path d="M14 15V9"/><path d="M19 19V3"/></svg>`,
    plus:`<svg class="${extraClass}" ${common}><path d="M12 5v14M5 12h14"/></svg>`,
    receive:`<svg class="${extraClass}" ${common}><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>`,
    send:`<svg class="${extraClass}" ${common}><path d="M12 20V8"/><path d="m7 13 5-5 5 5"/><path d="M5 4h14"/></svg>`,
    jar:`<svg class="${extraClass}" ${common}><path d="M6 8h12v9a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/><path d="M7.5 5h9"/><path d="M9 3h6"/><path d="M12 11v5M9.5 13.5h5"/></svg>`,
    coin:`<svg class="${extraClass}" ${common}><circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-.7-1.5-1-2.7-1-1.5 0-2.5.8-2.5 1.8 0 2.8 5 1.1 5 4 0 1.1-1 1.9-2.6 1.9-1.1 0-2-.4-2.8-1.1"/><path d="M12 6.7v10.6"/></svg>`,
    bars:`<svg class="${extraClass}" ${common}><path d="M6 18V11"/><path d="M12 18V7"/><path d="M18 18V4"/><path d="M4 20h16"/></svg>`,
    stock:`<svg class="${extraClass}" ${common}><path d="m4 16 4-5 4 3 5-7 3 2"/><path d="M18 7h2v2"/></svg>`
  };
  return icons[name]||icons.stock;
}
function renderStaticIcons(){
  const set=(sel,name)=>{const el=$(sel);if(el)el.innerHTML=svgIcon(name);};
  set('.ui-pencil','pencil');set('.ui-gear','gear');
  $$('.ui-nav-icon').forEach(el=>{el.innerHTML=svgIcon(el.dataset.navIcon||'home');});
  $('[data-icon="money-add"]')?.replaceChildren(new DOMParser().parseFromString(svgIcon('plus'),'image/svg+xml').documentElement);
  $('[data-icon="money-receive"]')?.replaceChildren(new DOMParser().parseFromString(svgIcon('receive'),'image/svg+xml').documentElement);
  $('[data-icon="money-send"]')?.replaceChildren(new DOMParser().parseFromString(svgIcon('send'),'image/svg+xml').documentElement);
  const jar=$('.ui-jar-icon');if(jar)jar.innerHTML=svgIcon('jar');
}
function assetIconMarkup(a, history=false){
  const slug=escapeHtml(a.brandSlug||'');
  const ticker=escapeHtml(a.symbol||'');
  const fallback=escapeHtml((a.symbol||'?').slice(0,2));
  if(slug){
    const brandColor=String(a.brandColor||'64706b').replace('#','').replace(/[^0-9a-f]/gi,'')||'64706b';
    const src=`https://cdn.simpleicons.org/${slug}/${brandColor}`;
    return `<span class="asset-icon ${a.tone||'slate'} asset-icon-modern brand-asset-icon" aria-hidden="true"><img src="${src}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="brand-fallback">${fallback}</span><small>${ticker}</small></span>`;
  }
  const kind=(a.type||'').toLowerCase();let name='stock';if(a.symbol==='BTC'||kind.includes('cripto'))name='coin';else if(kind.includes('etf'))name='bars';
  return `<span class="asset-icon ${a.tone||'slate'} asset-icon-modern" aria-hidden="true">${svgIcon(name)}<small>${ticker}</small></span>`;
}

function applySavedSiteConfig(){
  let saved={};try{saved=JSON.parse(dwStorage.getItem('dw_site_config')||'{}')||{};}catch{}
  const configVersion=Number(saved.__schemaVersion||0);
  if(configVersion<16){
    saved.site={
      ...(saved.site||{}),
      visibleQuotes:['oficial','blue','mep','ccl','tarjeta','cripto'],
      showSavings:true,showInvestment:true,showActivity:true,quotesEyebrow:''
    };
    saved.__schemaVersion=16;
    try{dwStorage.setItem('dw_site_config',JSON.stringify(saved));}catch{}
  }else if(Array.isArray(saved.site?.visibleQuotes)){
    saved.site.visibleQuotes=saved.site.visibleQuotes.filter(id=>id!=='mayorista');
    try{dwStorage.setItem('dw_site_config',JSON.stringify(saved));}catch{}
  }
  if(saved.site){Object.assign(DW_CONFIG.site,saved.site);}
  DW_CONFIG.site.visibleQuotes=['oficial','blue','mep','ccl','tarjeta','cripto'];
  DW_CONFIG.site.quotesEyebrow='';
  if(saved.theme)Object.assign(DW_CONFIG.theme,saved.theme);
  if(saved.appName)DW_CONFIG.appName=saved.appName;
  if(saved.tagline)DW_CONFIG.tagline=saved.tagline;
  if(saved.cards)DW_CONFIG.cards={...DW_CONFIG.cards,...saved.cards,local:{...DW_CONFIG.cards.local,...(saved.cards.local||{})},global:{...DW_CONFIG.cards.global,...(saved.cards.global||{})}};
  document.title=DW_CONFIG.appName;
  renderStaticIcons();
  const setText=(id,v)=>{const el=$('#'+id);if(el&&v!=null)el.textContent=v;};
  setText('authBrandName',DW_CONFIG.appName);setText('authBrandTagline',DW_CONFIG.tagline);setText('brandName',DW_CONFIG.appName);setText('brandTagline',DW_CONFIG.tagline);
  setText('heroEyebrow',DW_CONFIG.site.heroEyebrow);setText('heroTitle1',DW_CONFIG.site.heroTitle1);setText('heroTitle2',DW_CONFIG.site.heroTitle2);setText('heroDescription',DW_CONFIG.site.heroDescription);setText('heroPrimaryCta',DW_CONFIG.site.primaryCta);setText('heroSecondaryCta',DW_CONFIG.site.secondaryCta);
  setText('quotesEyebrow','');setText('quotesTitle','Seguimiento');
  document.documentElement.style.setProperty('--primary',DW_CONFIG.theme.primary||'#0a8f67');document.documentElement.style.setProperty('--bg',DW_CONFIG.theme.background||'#f4f8f6');
  const display=(id,show)=>{const el=$('#'+id);if(el)el.style.display=show?'':'';};
  display('page-ahorro',DW_CONFIG.site.showSavings!==false);display('page-inversion',DW_CONFIG.site.showInvestment!==false);display('page-movimientos',DW_CONFIG.site.showActivity!==false);
  display('navAhorro',DW_CONFIG.site.showSavings!==false);display('navInversion',DW_CONFIG.site.showInvestment!==false);display('navActividad',DW_CONFIG.site.showActivity!==false);
  applyVisualEdits();
}
// AUTH
function getAccount(){return safeParse('dw_account',null);} function setAccount(a){save('dw_account',a);} function currentAccount(){return getAccount()||{name:'Juan Calderon',dni:'32.456.781',email:'juan.calderon.dolarweb@gmail.com',phone:'381 555 0148',alias:DW_CONFIG.receiving?.defaultAlias,cbu:DW_CONFIG.receiving?.defaultCbu,cvu:DW_CONFIG.receiving?.defaultCvu,cuit:DW_CONFIG.receiving?.defaultCuit,bank:DW_CONFIG.receiving?.defaultBank};}
function isLoggedIn(){return isPreview||dwStorage.getItem('dw_logged_in')==='true';}
function showAuth(mode='login'){state.authMode=mode;$('#authApp').classList.remove('hidden');$('#mainApp').classList.add('hidden');$$('.auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.authMode===mode));$('#loginForm').classList.toggle('hidden-form',mode!=='login');$('#registerForm').classList.toggle('hidden-form',mode!=='register');}
function enterApp(){dwStorage.setItem('dw_logged_in','true');$('#authApp').classList.add('hidden');$('#mainApp').classList.remove('hidden');updateProfile();navigate('inicio',false);}
function updateProfile(){
  const a=currentAccount(), ini=initials(a.name), set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=v??'';};
  set('profileAvatar',ini);set('profileName',a.name);set('profileEmail',a.email);set('profileDni',a.dni);set('settingsAvatar',ini);set('settingsAccountName',a.name);set('settingsAccountEmail',a.email);set('profileBtn',ini);set('helloName',`Hola, ${a.name.split(/\s+/)[0]}`);
  ['settingsName','settingsDni','settingsEmail','settingsPhone','settingsAlias','settingsCbu','settingsCvu','settingsCuit','settingsBank'].forEach((id,i)=>{const e=$('#'+id);if(!e)return;e.value=[a.name,a.dni,a.email,a.phone||'',a.alias||DW_CONFIG.receiving?.defaultAlias||'',a.cbu||DW_CONFIG.receiving?.defaultCbu||'',a.cvu||DW_CONFIG.receiving?.defaultCvu||'',a.cuit||DW_CONFIG.receiving?.defaultCuit||'',a.bank||DW_CONFIG.receiving?.defaultBank||''][i];});
  updateReceiveSummary();
  set('securityToggleText',state.securityExtra?'Protección adicional activada':'Protección adicional desactivada');set('settingsThemeText',document.body.classList.contains('dark')?'Oscuro':'Claro');
  if($('#notifyQuotes'))$('#notifyQuotes').checked=dwStorage.getItem('dw_notify_quotes')!=='false';if($('#notifyActivity'))$('#notifyActivity').checked=dwStorage.getItem('dw_notify_activity')!=='false';if($('#notifyPromos'))$('#notifyPromos').checked=dwStorage.getItem('dw_notify_promos')==='true';
  const holder=$('#detailCardHolder');if(holder)holder.textContent=a.name.toUpperCase().slice(0,20);applyVisualEdits();
}
function createDemoAccount(){const existing=getAccount();const isLegacy=existing && (existing.name==='Juan Demo'||existing.email==='demo@gmail.com'||existing.email==='demo@dolarweb.local');if(!existing||isLegacy){setAccount({name:'Juan Calderon',dni:'32.456.781',email:'juan.calderon.dolarweb@gmail.com',phone:'381 555 0148',alias:DW_CONFIG.receiving?.defaultAlias,cbu:DW_CONFIG.receiving?.defaultCbu,cvu:DW_CONFIG.receiving?.defaultCvu,cuit:DW_CONFIG.receiving?.defaultCuit,bank:DW_CONFIG.receiving?.defaultBank,passwordHash:hashPassword('1111'),createdAt:new Date().toISOString(),isDemo:true});}else{setAccount({...existing,passwordHash:hashPassword('1111')});}}
function handleLogin(e){e.preventDefault();const email=$('#loginEmail').value.trim().toLowerCase(),pass=$('#loginPassword').value;if(!/@gmail\.com$/.test(email)){$('#loginError').textContent='Ingresá una dirección de Gmail válida.';return;}if(pass!=='1111'){$('#loginError').textContent='La contraseña es incorrecta.';return;}const acc=getAccount()||currentAccount();setAccount({...acc,email,passwordHash:hashPassword('1111')});$('#loginError').textContent='';enterApp();}
function handleRegister(e){e.preventDefault();const dni=$('#registerDni').value.trim(),email=$('#registerEmail').value.trim().toLowerCase(),pass=$('#registerPassword').value;if(!dni){$('#registerError').textContent='Ingresá tu DNI.';return;}if(!/@gmail\.com$/.test(email)){$('#registerError').textContent='Usá una dirección de Gmail.';return;}if(pass!=='1111'){$('#registerError').textContent='La contraseña ingresada no es válida.';return;}setAccount({name:'Juan Calderon',dni,email,phone:'',alias:DW_CONFIG.receiving?.defaultAlias,cbu:DW_CONFIG.receiving?.defaultCbu,cvu:DW_CONFIG.receiving?.defaultCvu,cuit:DW_CONFIG.receiving?.defaultCuit,bank:DW_CONFIG.receiving?.defaultBank,passwordHash:hashPassword('1111'),createdAt:new Date().toISOString(),isDemo:false});$('#registerError').textContent='';enterApp();}

// NAV / QUOTES
function navigate(page,smooth=true){$$('.page').forEach(el=>el.classList.toggle('active',el.id===`page-${page}`));$$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.nav===page));if(smooth)window.scrollTo({top:0,behavior:'smooth'});if(page==='tarjetas')renderCards();if(page==='movimientos')renderActivity();if(page==='recibir'){updateProfile();updateReceiveSummary();}if(page==='enviar'){updateSendSummary();}if(page==='configuracion'){updateProfile();initSupportChat();updateFeeSettings();}}
function getVisibleQuotes(){const ids=DW_CONFIG.site?.visibleQuotes;const list=Array.isArray(ids)?QUOTE_DEFS.filter(q=>ids.includes(q.id)):QUOTE_DEFS;return list.length?list:QUOTE_DEFS;}
function drawSparkline(canvas,values){
  if(!canvas)return;const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  const nums=(values||[]).map(x=>typeof x==='object'?Number(x.v):Number(x)).filter(Number.isFinite);if(nums.length<2)return;
  const min=Math.min(...nums),max=Math.max(...nums),range=max-min||1,padX=14,padY=18;
  ctx.strokeStyle='rgba(120,135,129,.15)';ctx.lineWidth=1;[0.2,0.4,0.6,0.8].forEach(r=>{const y=padY+r*(h-padY*2);ctx.beginPath();ctx.moveTo(padX,y);ctx.lineTo(w-padX,y);ctx.stroke();});
  const pts=nums.map((v,i)=>[padX+i*((w-padX*2)/Math.max(nums.length-1,1)),h-padY-((v-min)/range)*(h-padY*2)]);const up=nums.at(-1)>=nums[0],stroke=up?'#0a9d70':'#cf5964';
  const fill=ctx.createLinearGradient(0,padY,0,h-padY);fill.addColorStop(0,up?'rgba(10,157,112,.18)':'rgba(207,89,100,.18)');fill.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.lineTo(pts.at(-1)[0],h-padY);ctx.lineTo(pts[0][0],h-padY);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=stroke;ctx.lineWidth=2.6;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  const [lx,ly]=pts.at(-1);ctx.fillStyle=stroke;ctx.beginPath();ctx.arc(lx,ly,3.5,0,Math.PI*2);ctx.fill();
}
async function fetchQuote(q){const r=await fetch(q.endpoint,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(String(r.status));return r.json();}
function renderQuotes(){
  const grid=$('#quoteGrid');if(!grid)return;const list=getVisibleQuotes();grid.innerHTML=list.map(q=>{const d=state.quotes[q.id],tr=d?.variation,cls=tr>0?'up':tr<0?'down':'';return `<article class="card quote-row" data-editor-id="quote-${q.id}-card"><div class="quote-row-info"><div class="quote-row-head"><div><span class="eyebrow" data-editor-id="quote-${q.id}-eyebrow">${q.id==='oficial'?'REFERENCIA':'MERCADO'}</span><div class="quote-title-line"><h3 data-editor-id="quote-${q.id}-name">${q.label}</h3><a class="quote-search" href="https://www.google.com/search?q=${encodeURIComponent(q.label+' hoy')}" target="_blank" rel="noopener" aria-label="Buscar ${escapeHtml(q.label)} en Google" title="Ver en Google">↗</a></div><span class="sub">Venta</span></div><span class="trend ${cls}" data-editor-id="quote-${q.id}-trend" data-live="true">${tr==null?'—':(tr>=0?'▲ ':'▼ ')+pct(Math.abs(tr))}</span></div><div class="quote-value" data-editor-id="quote-${q.id}-value" data-live="true">${d?ars(d.venta,2):'Cargando…'}</div><div class="quote-buy" data-editor-id="quote-${q.id}-buy" data-live="true">Compra ${d?ars(d.compra,2):'—'}</div></div><div class="quote-row-chart"><div class="chart-caption"><span>Evolución</span><small>Datos web · última actualización</small></div><canvas class="quote-spark" data-spark="${q.id}" data-editor-id="quote-${q.id}-chart" width="520" height="150"></canvas></div></article>`;}).join('');list.forEach(q=>drawSparkline($(`canvas[data-spark="${q.id}"]`),state.history[q.id]||[]));applyVisualEdits();}
async function fetchNetlifyQuotes(){
  const r=await fetch('/.netlify/functions/market?type=dollars',{headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error(`Market proxy ${r.status}`);
  const data=await r.json();
  if(!Array.isArray(data)||!data.length)throw new Error('No se recibieron cotizaciones');
  return data;
}
async function fetchAggregateQuotes(){
  const r=await fetch('https://dolarapi.com/v1/dolares',{headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error(String(r.status));
  return r.json();
}
function aggregateQuoteFor(q,items){
  const keys={
    oficial:['oficial','dolar oficial'],blue:['blue'],mep:['bolsa','mep'],ccl:['contadoconliqui','ccl','contado con liqui'],
    tarjeta:['tarjeta'],mayorista:['mayorista'],cripto:['cripto']
  }[q.id]||[q.id];
  return (Array.isArray(items)?items:[]).find(item=>{
    const hay=`${item?.casa||''} ${item?.nombre||''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return keys.some(k=>hay.includes(k));
  })||null;
}
async function fetchQuotes(){
  const visible=getVisibleQuotes();
  if($('#lastUpdate'))$('#lastUpdate').textContent='Actualizando…';
  // Google Apps Script: fetch server-side to avoid CORS problems inside its iframe.
  if(window.google&&google.script&&google.script.run){
    try{
      google.script.run
        .withSuccessHandler(items=>{
          const source=Array.isArray(items)?items:[];
          let updated=0;
          visible.forEach(q=>{
            const d=aggregateQuoteFor(q,source);
            if(!d)return;
            updated++;
            const prev=state.quotes[q.id]?.venta;
            const rawVariation=Number(d.variacion);
            const variation=prev?((Number(d.venta)-Number(prev))/Number(prev))*100:(Number.isFinite(rawVariation)?rawVariation:null);
            state.quotes[q.id]={...d,label:q.label,variation};
            const value=Number(d.venta);
            if(Number.isFinite(value)&&value>0){
              const arr=state.history[q.id]||[];
              arr.push({t:new Date().toISOString(),v:value});
              state.history[q.id]=arr.slice(-48);
            }
          });
          if(!updated){ fetchQuotesDirect(visible); return; }
          save('dw_quote_history',state.history);
          renderQuotes();buildQuoteSelect();updateConverter();updateFocus();updateBalances();renderHomeRecent();
          if($('#lastUpdate'))$('#lastUpdate').textContent=`En vivo · ${new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`;
        })
        .withFailureHandler(()=>fetchQuotesDirect(visible))
        .getDolarQuotes();
      return;
    }catch{}
  }
  await fetchQuotesDirect(visible);
}
async function fetchQuotesDirect(visible=getVisibleQuotes()){
  let aggregate=null,sourceName='DolarAPI',results=[];
  try{aggregate=await fetchNetlifyQuotes();results=visible.map(q=>({status:'fulfilled',value:aggregateQuoteFor(q,aggregate)}));}
  catch{
    results=await Promise.allSettled(visible.map(fetchQuote));
    if(results.some(r=>r.status==='rejected')){try{aggregate=await fetchAggregateQuotes();}catch{} }
    sourceName='DolarAPI';
  }
  results.forEach((r,i)=>{
    const q=visible[i];
    const d=r.status==='fulfilled'&&r.value ? r.value : aggregateQuoteFor(q,aggregate);
    if(!d)return;
    const prev=state.quotes[q.id]?.venta;
    const rawVariation=Number(d.variacion);
    const variation=prev?((Number(d.venta)-Number(prev))/Number(prev))*100:(Number.isFinite(rawVariation)?rawVariation:null);
    state.quotes[q.id]={...d,label:q.label,variation};
    const value=Number(d.venta);
    if(Number.isFinite(value)&&value>0){
      const arr=state.history[q.id]||[];
      arr.push({t:new Date().toISOString(),v:value});
      state.history[q.id]=arr.slice(-48);
    }
  });
  save('dw_quote_history',state.history);
  renderQuotes();buildQuoteSelect();updateConverter();updateFocus();updateBalances();renderHomeRecent();
  const ok=visible.some(q=>Number(state.quotes[q.id]?.venta)>0);
  if($('#lastUpdate'))$('#lastUpdate').textContent=ok?`${sourceName} · ${new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`:'Sin conexión';
}
function buildQuoteSelect(){const s=$('#quoteSelect'),list=getVisibleQuotes();if(!s)return;if(!list.some(q=>q.id===state.selectedQuote))state.selectedQuote=list[0].id;s.innerHTML=list.map(q=>`<option value="${q.id}">${q.label}</option>`).join('');s.value=state.selectedQuote;}
function getConversionFeeRate(){return Number(DW_CONFIG.fees?.conversionRoyalty??3)||0;}
function updateConverter(){
  const q=state.quotes[state.selectedQuote],amount=Number($('#amountInput')?.value)||0,feeRate=getConversionFeeRate();
  const rate=state.mode==='ars-usd'?Number(q?.venta):Number(q?.compra);
  if($('#amountCurrency'))$('#amountCurrency').textContent='USD';
  if($('#amountPrompt'))$('#amountPrompt').textContent=state.mode==='ars-usd'?'¿Cuántos dólares querés comprar?':'¿Cuántos dólares querés vender?';
  if($('#activeRateName'))$('#activeRateName').textContent=state.mode==='ars-usd'?'Venta':'Compra';
  if($('#activeRateLabel'))$('#activeRateLabel').textContent=q&&rate?ars(rate,2):'$ —';
  if($('#activeSellRate'))$('#activeSellRate').textContent=q&&rate?ars(rate,2):'—';
  if($('#activeDollarValue'))$('#activeDollarValue').textContent=q&&rate?ars(rate,2):'$ —';
  if($('#activeRateDescriptor'))$('#activeRateDescriptor').textContent=state.mode==='ars-usd'?'valor de venta':'valor de compra';
  if($('#selectedQuoteMiniName'))$('#selectedQuoteMiniName').textContent=q?.label||'Dólar Oficial';
  const quoteLine=$('#conversionQuoteLine'),feeLabel=$('#conversionFeeLabel'),feeAmount=$('#conversionFeeAmount'),resultLabel=$('#conversionResultLabel');
  if(!q||!rate){
    if($('#conversionResult'))$('#conversionResult').textContent='$ —';
    if(quoteLine)quoteLine.textContent='$ —';
    if(feeAmount)feeAmount.textContent='$ —';
    return;
  }
  if(state.mode==='ars-usd'){
    const base=amount*rate,fee=base*feeRate/100,total=base+fee;
    if($('#conversionResult'))$('#conversionResult').textContent=amount>0?ars(total,2):'$ —';
    if(resultLabel)resultLabel.textContent='Te van a cobrar';
    if(quoteLine)quoteLine.textContent=amount>0?ars(base,2):'$ —';
    if(feeLabel)feeLabel.textContent=`Regalía ${feeRate}%`;
    if(feeAmount)feeAmount.textContent=amount>0?ars(fee,2):'$ —';
    const line=$('#conversionFeeLine');if(line)line.textContent=amount>0?`Regalía ${feeRate}% · ${ars(fee,2)}`:`Regalía ${feeRate}%`;
  }else{
    const gross=amount*rate,fee=gross*feeRate/100,net=gross-fee;
    if($('#conversionResult'))$('#conversionResult').textContent=amount>0?ars(net,2):'$ —';
    if(resultLabel)resultLabel.textContent='Recibís aproximadamente';
    if(quoteLine)quoteLine.textContent=amount>0?ars(gross,2):'$ —';
    if(feeLabel)feeLabel.textContent=`Regalía ${feeRate}%`;
    if(feeAmount)feeAmount.textContent=amount>0?ars(fee,2):'$ —';
    const line=$('#conversionFeeLine');if(line)line.textContent=amount>0?`Regalía ${feeRate}% · ${ars(fee,2)}`:`Regalía ${feeRate}%`;
  }
}
function updateFocus(){const q=state.quotes[state.selectedQuote];if(!q)return;const set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=v;};set('selectedQuoteName',q.label);set('selectedQuoteSell',ars(q.venta,2));set('selectedQuoteBuy',ars(q.compra,2));set('selectedQuoteSell2',ars(q.venta,2));const tr=q.variation;set('selectedQuoteTrend',tr==null?'Sin referencia':`${tr>=0?'▲':'▼'} ${pct(Math.abs(tr))}`);const t=$('#selectedQuoteTrend');if(t)t.className=`trend ${tr>0?'up':tr<0?'down':''}`;const c=$('#focusSpark');if(c){c.innerHTML='<canvas width="620" height="100"></canvas>';drawSparkline(c.querySelector('canvas'),state.history[state.selectedQuote]||[]);}}
function getDemoUSDRate(){return Number(state.quotes.mep?.venta||state.quotes.oficial?.venta||state.quotes.blue?.venta||0);}
function renderBalanceEye(hidden){const btn=$('#hideBalance'),icon=$('#balanceEyeIcon');if(!btn||!icon)return;btn.setAttribute('aria-label',hidden?'Mostrar saldos':'Ocultar saldos');btn.title=hidden?'Mostrar saldos':'Ocultar saldos';icon.innerHTML=hidden?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.1A10.4 10.4 0 0 1 12 4.9c5.4 0 9 5.1 9 7.1a9.7 9.7 0 0 1-3.1 4.6"/><path d="M6.5 6.7C4.4 8 3 10.2 3 12c0 2 3.6 7.1 9 7.1 1.4 0 2.7-.3 3.9-.8"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.6-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.6 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>';}
function updateBalances(){const a=walletBalanceARS(),u=walletBalanceUSD(),r=getDemoUSDRate(),total=a+u*(r||0),hidden=state.balanceHidden,m='••••••';$('#balanceARS').textContent=hidden?m:ars(a,0);$('#usdBalance').textContent=hidden?m:u.toFixed(2);$('#balanceUSD').textContent=hidden?m:(r?new Intl.NumberFormat('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(total/r):'—');$('#balanceTotal').textContent=hidden?m:ars(total,0);renderBalanceEye(hidden);}

// SAVINGS / INVESTMENTS helpers (kept explicit so every screen can initialize independently).
function renderJars(){
  const box=$('#jarList');if(!box)return;
  if(!state.jars.length){box.innerHTML='<div class="jar-empty">Todavía no tenés frascos. Creá una meta para verla acá.</div>';return;}
  const rate=Number(DW_CONFIG.savings?.defaultRate)||0;
  box.innerHTML=state.jars.map((j,i)=>{
    const days=Math.max(1,Number(j.days)||1),amount=Math.max(0,Number(j.amount)||0),currency=j.currency||'ARS';
    const projected=amount*(1+rate/100*days/365),gain=projected-amount,target=Math.max(1,Number(j.target)||amount||1),progress=Math.min(100,Math.max(8,(amount/target)*100));
    const formatted=currency==='USD'?usd(projected,2):ars(projected,0),gainText=currency==='USD'?usd(gain,2):ars(gain,0);
    return `<div class="jar-item"><div class="jar-top"><div><div class="jar-name">${escapeHtml(j.name||'Nueva meta')}</div><div class="jar-meta">${currency} · ${days} días · Tasa ${rate}%</div></div><button class="mini-btn" data-delete-jar="${i}" aria-label="Eliminar frasco">×</button></div><div class="jar-amount">${formatted}</div><div class="jar-meta">Rendimiento estimado: ${gainText}</div><div class="jar-progress"><i style="width:${progress}%"></i></div></div>`;
  }).join('');
  applyVisualEdits();
}
function getAssetBySymbol(symbol){return DW_CONFIG.investmentAssets.find(a=>a.symbol===symbol)||null;}
function assetPrice(a){if(!a)return 0;return Number(state.marketPrices[a.symbol]?.price||a.demoPriceUSD)||0;}
function fmtAssetPrice(a,price){return usd(price,Number(price)>=1?2:6);}
async function loadBTC(){
  const apply=(price,changePercent,updatedAt)=>{
    const p=Number(price);
    if(!Number.isFinite(p)||p<=0)return false;
    state.marketPrices.BTC={price:p,changePercent:Number.isFinite(Number(changePercent))?Number(changePercent):null,updatedAt:updatedAt||new Date().toISOString()};
    save('dw_market_prices',state.marketPrices);
    renderInvestments();
    renderHomeRecent();
    return true;
  };
  if(window.google&&google.script&&google.script.run){
    try{
      google.script.run
        .withSuccessHandler(data=>{ if(!apply(data?.price,data?.changePercent,data?.updatedAt)) loadBTCDirect(); })
        .withFailureHandler(()=>loadBTCDirect())
        .getBitcoinMarket();
      return;
    }catch{}
  }
  await loadBTCDirect();
}
async function loadBTCDirect(){
  try{
    let price=0,change=null,updatedAt=new Date().toISOString();
    try{const proxy=await fetch('/.netlify/functions/market?type=asset&symbol=BTC',{headers:{Accept:'application/json'}});if(!proxy.ok)throw new Error('proxy');const d=await proxy.json();price=Number(d.price);change=Number(d.changePercent);updatedAt=d.updatedAt||updatedAt;}catch{
      const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(String(r.status));const d=await r.json();price=Number(d?.bitcoin?.usd);change=Number(d?.bitcoin?.usd_24h_change);
    }
    if(!Number.isFinite(price)||price<=0)return;
    state.marketPrices.BTC={price,changePercent:Number.isFinite(change)?change:null,updatedAt};
    save('dw_market_prices',state.marketPrices);renderInvestments();renderHomeRecent();
  }catch{}
}
function renderInvestments(){
  const grid=$('#investmentGrid');if(!grid)return;
  const list=DW_CONFIG.investmentAssets;
  grid.innerHTML=list.map((a,i)=>{const price=assetPrice(a),change=state.marketPrices[a.symbol]?.changePercent;const cls=change>0?'up':change<0?'down':'';const owned=state.investments.find(h=>h.symbol===a.symbol);const qty=Number(owned?.quantity)||0;const value=qty*price;return `<article class="card invest-card"><div class="asset-row">${assetIconMarkup(a)}<span class="trend ${cls}">${a.type}${change!=null?` · ${change>=0?'▲':'▼'} ${Math.abs(change).toFixed(2)}%`:''}</span></div><div class="asset-name"><strong>${escapeHtml(a.name)}</strong><span>${escapeHtml(a.symbol)}</span></div><div class="asset-price" data-asset-price="${escapeHtml(a.symbol)}">${fmtAssetPrice(a,price)}</div>${qty>0?`<div class="asset-owned">Tenés ${qty.toLocaleString('es-AR',{maximumFractionDigits:a.decimals||6})} · ${usd(value,2)}</div>`:''}<button class="secondary-btn full" data-invest="${i}">Comprar</button></article>`;}).join('');
  renderPortfolio();renderInvestmentHistory();applyVisualEdits();
}
function renderPortfolio(){
  const box=$('#portfolioHoldings');if(!box)return;
  if(!state.investments.length){box.innerHTML='<div class="portfolio-empty"><strong>Todavía no tenés activos comprados.</strong><span>Elegí una acción, ETF o cripto para empezar a armar tu cartera.</span></div>';} else {
    box.innerHTML=state.investments.map(h=>{const a=getAssetBySymbol(h.symbol)||{symbol:h.symbol,name:h.name||h.symbol,type:h.type||'Activo',tone:'slate',demoPriceUSD:h.priceUSD||0};const current=assetPrice(a)||Number(h.priceUSD)||0;const qty=Number(h.quantity)||0;const invested=Number(h.investedUSD)||0;const value=qty*current;const pnl=value-invested;const pnlPct=invested?((pnl/invested)*100):0;const cls=pnl>=0?'positive':'negative';return `<div class="holding-row"><div class="holding-title">${assetIconMarkup(a)}<div><strong>${escapeHtml(a.name||h.symbol)}</strong><span>${escapeHtml(h.symbol)} · ${escapeHtml(a.type||'Activo')}</span></div></div><div class="holding-metrics"><div><span>Cantidad</span><strong>${qty.toLocaleString('es-AR',{maximumFractionDigits:6})}</strong></div><div><span>Precio compra</span><strong>${fmtAssetPrice(a,Number(h.avgBuyUSD)||0)}</strong></div><div><span>Precio actual</span><strong>${fmtAssetPrice(a,current)}</strong></div><div><span>Valor actual</span><strong>${usd(value,2)}</strong></div><div><span>Resultado</span><strong class="${cls}">${pnl>=0?'+':''}${usd(pnl,2)} <small>(${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}%)</small></strong></div></div></div>`;}).join('');
  }
  const invested=state.investments.reduce((sum,h)=>sum+(Number(h.investedUSD)||0),0);
  const current=state.investments.reduce((sum,h)=>{const a=getAssetBySymbol(h.symbol)||{demoPriceUSD:h.priceUSD||0};return sum+(Number(h.quantity)||0)*assetPrice(a);},0);
  const pnl=current-invested;
  if($('#portfolioTotalValue'))$('#portfolioTotalValue').textContent=usd(current,2);
  if($('#portfolioInvested'))$('#portfolioInvested').textContent=usd(invested,2);
  if($('#portfolioPnl'))$('#portfolioPnl').textContent=`Ganancia/pérdida · ${pnl>=0?'+':''}${usd(pnl,2)}`;
  if($('#portfolioAssetCount'))$('#portfolioAssetCount').textContent=String(state.investments.length);
  if($('#portfolioTradeCount'))$('#portfolioTradeCount').textContent=String(state.investmentHistory.length);
}
function openInvestmentHistoryDetail(index){
  const x=state.investmentHistory[index];if(!x)return;const d=new Date(x.t),q=Number(x.quantity)||0,p=Number(x.priceUSD)||0,total=Number(x.totalUSD)||q*p,a=getAssetBySymbol(x.symbol)||{type:x.type||'Activo'};
  if($('#activityDetailTitle'))$('#activityDetailTitle').textContent=`Compra de ${x.name||x.symbol}`;
  if($('#activityDetailAmount'))$('#activityDetailAmount').textContent=`− ${usd(total,2)}`;
  if($('#activityDetailStatus'))$('#activityDetailStatus').textContent=x.status||'Completado';
  if($('#activityDetailType'))$('#activityDetailType').textContent='Inversión';
  if($('#activityDetailDate'))$('#activityDetailDate').textContent=d.toLocaleDateString('es-AR');
  if($('#activityDetailTime'))$('#activityDetailTime').textContent=d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  if($('#activityDetailId'))$('#activityDetailId').textContent=String(x.id||'DW').slice(0,12).toUpperCase();
  if($('#activityDetailMeta'))$('#activityDetailMeta').textContent=`${q.toLocaleString('es-AR',{maximumFractionDigits:6})} unidades · ${usd(p,2)} por unidad · ${a.type||'Activo'}`;
  if($('#activityDetailFee'))$('#activityDetailFee').textContent='Sin cargo';
  const icon=$('#activityDetailIcon');if(icon){icon.className='activity-icon investment';icon.innerHTML=assetIconMarkup(a,true);}
  $('#activityDetailModal')?.classList.remove('hidden');
}
function renderInvestmentHistory(){
  const box=$('#investmentHistoryList');if(!box)return;
  if(!state.investmentHistory.length){box.innerHTML='<div class="activity-empty">Todavía no registraste compras de activos.</div>';return;}
  box.innerHTML=state.investmentHistory.map((x,i)=>{const d=new Date(x.t),p=Number(x.priceUSD)||0,q=Number(x.quantity)||0,total=Number(x.totalUSD)||q*p,a=getAssetBySymbol(x.symbol)||{symbol:x.symbol,name:x.name||x.symbol,type:x.type||'Activo',tone:'slate',brandSlug:''};return `<div class="investment-history-row"><div class="investment-history-leading">${assetIconMarkup(a,true)}</div><div class="investment-history-main"><div class="activity-top"><div><div class="activity-title">Compra de ${escapeHtml(x.name||x.symbol)}</div><div class="activity-ref">${escapeHtml(x.symbol)} · ID ${escapeHtml(String(x.id||'DW').slice(0,12).toUpperCase())}</div></div><strong>− ${usd(total,2)}</strong></div><div class="activity-meta">${q.toLocaleString('es-AR',{maximumFractionDigits:6})} unidades · ${usd(p,2)} por unidad · ${d.toLocaleDateString('es-AR')} · ${d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</div><div class="activity-status"><span>● ${escapeHtml(x.status||'Completado')}</span><small>Orden de inversión</small></div></div><button class="activity-more" type="button" data-investment-detail="${i}" aria-label="Ver detalle de la compra"><span></span><span></span><span></span></button></div>`;}).join('');
}

function seedInvestmentData(){
  const btc=getAssetBySymbol('BTC');
  // Repair old demo data: legacy Bitcoin activity -> proper position + trade history.
  if(!state.investmentHistory.length){
    const legacy=state.activity.find(x=>/Compra de Bitcoin/i.test(x.title||''));
    if(legacy&&btc){
      const amountMatch=String(legacy.amount||'').match(/([0-9.,]+)/);
      const amount=amountMatch?Number(amountMatch[1].replace(/\./g,'').replace(',','.')):25;
      const price=assetPrice(btc)||Number(btc.demoPriceUSD)||0;
      if(amount>0&&price>0){
        const quantity=amount/price;
        const id=String(legacy.id||'dw03').toUpperCase();
        if(!state.investments.some(h=>h.symbol==='BTC')) state.investments.push({symbol:'BTC',name:btc.name,type:btc.type,quantity,investedUSD:amount,avgBuyUSD:price,priceUSD:price});
        state.investmentHistory=[{id,symbol:'BTC',name:btc.name,type:btc.type,quantity,priceUSD:price,totalUSD:amount,t:legacy.t,status:legacy.status||'Completado'}];
      }
    }
  }
  // Repair positions that exist but have no matching history.
  const known=new Set(state.investmentHistory.map(x=>x.symbol));
  state.investments.forEach(h=>{
    if(!known.has(h.symbol)){
      const qty=Number(h.quantity)||0, invested=Number(h.investedUSD)||0, p=Number(h.avgBuyUSD||h.priceUSD)||0;
      if(qty>0&&invested>0&&p>0){
        const id=('REC'+Date.now()+h.symbol).slice(-12).toUpperCase();
        state.investmentHistory.push({id,symbol:h.symbol,name:h.name||h.symbol,type:h.type||'Activo',quantity:qty,priceUSD:p,totalUSD:invested,t:new Date().toISOString(),status:'Registrado'});
      }
    }
  });
  state.investmentHistory.sort((a,b)=>new Date(b.t)-new Date(a.t));
  save('dw_investments',state.investments);save('dw_investment_history',state.investmentHistory);
}
function openInvestmentBuy(index){const a=DW_CONFIG.investmentAssets[index];if(!a)return;const price=assetPrice(a);if(price<=0){toast('La cotización del activo no está disponible.');return;}const minimumQty=Math.max((Number(a.minUSD)||1)/price,a.allowFractional?(a.symbol==='BTC'?0.0001:0.01):1);const defaultQty=a.allowFractional?Math.max(minimumQty,a.symbol==='BTC'?0.0001:0.1):1;$('#buyAssetName').textContent=a.name;$('#buyAssetMeta').textContent=`${a.type} · Cotización actual ${fmtAssetPrice(a,price)}`;$('#buyAssetSymbol').textContent=a.symbol;$('#buyAssetPrice').textContent=fmtAssetPrice(a,price);$('#buyUnitPrice').textContent=fmtAssetPrice(a,price);$('#buyAssetIcon').innerHTML=assetIconMarkup(a);$('#buyAssetIcon').className=`asset-icon ${a.tone||'slate'} buy-asset-icon`;$('#buyQuantity').value=String(defaultQty);$('#buyQuantity').step=a.allowFractional?'0.000001':'1';$('#buyQuantity').min=a.allowFractional?String(minimumQty):'1';$('#buyFractionHint').textContent=a.allowFractional?'Podés comprar microacciones y fracciones de este activo.':`Compra mínima: 1 unidad.`;$('#buyInvestError').textContent='';$('#confirmInvestmentBuy').dataset.assetIndex=index;updateBuyTotal();$('#investmentBuyModal').classList.remove('hidden');setTimeout(()=>$('#buyQuantity')?.focus(),50);}
function closeInvestmentBuy(){$('#investmentBuyModal')?.classList.add('hidden');}
function updateBuyTotal(){const idx=Number($('#confirmInvestmentBuy')?.dataset.assetIndex),a=DW_CONFIG.investmentAssets[idx],qty=Number($('#buyQuantity')?.value)||0,total=qty*assetPrice(a||{});if($('#buyTotalPrice'))$('#buyTotalPrice').textContent=usd(total,2);}
function confirmInvestmentBuy(){const idx=Number($('#confirmInvestmentBuy').dataset.assetIndex),a=DW_CONFIG.investmentAssets[idx],qty=Number($('#buyQuantity').value)||0,price=assetPrice(a),total=qty*price;const error=$('#buyInvestError');if(!a||qty<=0||price<=0){error.textContent='Ingresá una cantidad válida.';return;}if(total<(Number(a.minUSD)||0)){error.textContent=`La compra mínima es de ${usd(Number(a.minUSD)||1,0)}.`;return;}if(total>walletBalanceUSD()){error.textContent='Saldo insuficiente en dólares.';return;}const id=(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())).split('-')[0].toUpperCase();let holding=state.investments.find(h=>h.symbol===a.symbol);if(!holding){holding={symbol:a.symbol,name:a.name,type:a.type,quantity:0,investedUSD:0,avgBuyUSD:0,priceUSD:price};state.investments.push(holding);}holding.quantity=Number(holding.quantity)+qty;holding.investedUSD=Number(holding.investedUSD)+total;holding.avgBuyUSD=holding.investedUSD/holding.quantity;holding.priceUSD=price;const trade={id,symbol:a.symbol,name:a.name,type:a.type,quantity:qty,priceUSD:price,totalUSD:total,t:new Date().toISOString(),status:'Completado'};state.investmentHistory.unshift(trade);setWalletBalances(walletBalanceARS(),walletBalanceUSD()-total);save('dw_investments',state.investments);save('dw_investment_history',state.investmentHistory);addActivity(`Compra de ${a.name}`,`${qty.toLocaleString('es-AR',{maximumFractionDigits:6})} ${a.symbol} · ${usd(price,2)} por unidad · orden ${id}`,{type:'investment',amount:'− '+usd(total,2),investmentId:id});closeInvestmentBuy();renderInvestments();updateBalances();toast(`Compra registrada · ${a.symbol}`);}
async function fetchMarketAsset(a){if(a.symbol==='BTC')return;const symbol=encodeURIComponent(a.marketSymbol||a.symbol);try{let data;try{const r=await fetch(`/.netlify/functions/market?type=asset&symbol=${encodeURIComponent(a.symbol)}`,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error('proxy');data=await r.json();}catch{const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1m`,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(String(r.status));const x=await r.json();const meta=x?.chart?.result?.[0]?.meta||{};const price=Number(meta.regularMarketPrice||meta.postMarketPrice||meta.preMarketPrice);const prev=Number(meta.chartPreviousClose||meta.previousClose);data={price,changePercent:Number.isFinite(prev)&&prev>0?((price-prev)/prev)*100:null,updatedAt:new Date().toISOString()};}const price=Number(data?.price);if(!Number.isFinite(price)||price<=0)return;state.marketPrices[a.symbol]={price,changePercent:Number.isFinite(Number(data.changePercent))?Number(data.changePercent):null,updatedAt:data.updatedAt||new Date().toISOString()};}catch{}}
async function loadMarketPrices(){
  const symbols=DW_CONFIG.investmentAssets.filter(a=>a.symbol!=='BTC').map(a=>a.symbol);
  if(window.google&&google.script&&google.script.run){
    google.script.run.withSuccessHandler(data=>{
      if(data&&typeof data==='object')Object.assign(state.marketPrices,data);
      save('dw_market_prices',state.marketPrices);renderInvestments();
    }).withFailureHandler(async()=>{await Promise.all(DW_CONFIG.investmentAssets.map(fetchMarketAsset));save('dw_market_prices',state.marketPrices);renderInvestments();}).getMarketPrices(symbols);
    return;
  }
  await Promise.all(DW_CONFIG.investmentAssets.map(fetchMarketAsset));
  save('dw_market_prices',state.marketPrices);renderInvestments();
}

// CARDS
function maskCardNumber(full){const d=String(full||'').replace(/\D/g,'');return `•••• •••• •••• ${d.slice(-4)||'0000'}`;}
function formatCardNumber(value){const digits=String(value||'').replace(/\D/g,'');return digits.replace(/(\d{4})(?=\d)/g,'$1 ').trim();}
function renderCards(){
  const a=currentAccount(),cards=[DW_CONFIG.cards.local,DW_CONFIG.cards.global];
  const spend=$('#cardSpendBalance'); if(spend) spend.textContent=ars(DW_CONFIG.cardSpendBalance,0);
  const grid=$('#virtualCardGrid');
  if(grid){
    grid.innerHTML=cards.map((c,i)=>{const full=c.fullNumber||String(c.number||'').replace(/[^0-9]/g,'');return `<article class="virtual-card-wrap"><div class="virtual-card ${c.tone}"><div class="virtual-top"><span class="card-chip"></span><span class="card-network">DÓLAR WEB</span></div><div class="virtual-label">${escapeHtml(c.name)}</div><div class="virtual-number">${escapeHtml(maskCardNumber(full))}</div><div class="virtual-bottom"><div><small>TITULAR</small><strong>${escapeHtml(a.name.toUpperCase().slice(0,20))}</strong></div><div><small>VENCE</small><strong>${escapeHtml(c.expiry)}</strong></div><div class="contactless">)))</div></div></div><div class="virtual-card-actions"><div><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.subtitle)}</small></div><button class="secondary-btn" data-card-detail="${i}">Mostrar datos</button></div></article>`;}).join('');
  }
  renderCreditCards();
  $('#creditRequestPanel')?.classList.remove('request-open');
  applyVisualEdits();
}
function renderCreditCards(){
  const box=$('#creditCardsIssued'); if(!box)return;
  box.classList.toggle('hidden',!state.creditIssued);
  if(!state.creditIssued){box.innerHTML='';return;}
  const a=currentAccount();
  const creditCards=[
    {name:'Tarjeta de crédito Local',subtitle:'Límite disponible · Argentina',tone:'forest',kind:'Local',fullNumber:'5274 8103 6642 1935',expiry:'08/30',cvv:'351'},
    {name:'Tarjeta de crédito Global',subtitle:'Límite disponible · Internacional',tone:'ink',kind:'Global',fullNumber:'4593 7206 1485 6302',expiry:'08/30',cvv:'824'}
  ];
  box.innerHTML=`<article class="credit-issued-card"><div class="credit-issued-head"><div><span class="eyebrow">TARJETAS DE CRÉDITO</span><h3>Tus nuevas tarjetas</h3><p>La solicitud fue procesada correctamente.</p></div><span class="issued-status">Activa</span></div><div class="credit-card-issued-grid">${creditCards.map((c,i)=>`<article class="credit-card-issued"><div class="virtual-card ${c.tone}"><div class="virtual-top"><span class="card-chip"></span><span class="card-network">DÓLAR WEB</span></div><div class="virtual-label">${escapeHtml(c.name)}</div><div class="virtual-number">${escapeHtml(maskCardNumber(c.fullNumber))}</div><div class="virtual-bottom"><div><small>TITULAR</small><strong>${escapeHtml(a.name.toUpperCase().slice(0,20))}</strong></div><div><small>VENCE</small><strong>${escapeHtml(c.expiry)}</strong></div><div class="contactless">)))</div></div></div><button class="secondary-btn full" type="button" data-credit-detail="${i}">Ver tarjeta</button></article>`).join('')}</div></article>`;
  applyVisualEdits();
}
function openCreditCardDetail(index){
  const data=[{name:'Tarjeta de crédito Local',subtitle:'Límite disponible · Argentina',tone:'forest',kind:'Local',fullNumber:'5274 8103 6642 1935',expiry:'08/30',cvv:'351'},{name:'Tarjeta de crédito Global',subtitle:'Límite disponible · Internacional',tone:'ink',kind:'Global',fullNumber:'4593 7206 1485 6302',expiry:'08/30',cvv:'824'}][index];
  if(!data)return;
  $('#detailType').textContent=`TARJETA DE CRÉDITO · ${data.kind.toUpperCase()}`;$('#detailName').textContent=data.name;$('#detailCardHolder').textContent=currentAccount().name.toUpperCase().slice(0,20);$('#detailCardVisual').className=`detail-card-preview ${data.tone}`;$('#revealCardData').dataset.cardIndex=`credit-${index}`;$('#revealCardData').dataset.revealed='false';$('#revealCardData').textContent='Mostrar datos';$('#revealCardData').dataset.creditCardJson=JSON.stringify(data);setCardDetailValues(data,false);$('#cardDetailModal').classList.remove('hidden');
}
function openCardDetail(index){
  const c=[DW_CONFIG.cards.local,DW_CONFIG.cards.global][index],a=currentAccount();
  $('#detailType').textContent=`TARJETA VIRTUAL · ${c.kind.toUpperCase()}`;$('#detailName').textContent=c.name;$('#detailCardHolder').textContent=a.name.toUpperCase().slice(0,20);$('#detailCardVisual').className=`detail-card-preview ${c.tone}`;$('#revealCardData').dataset.cardIndex=index;$('#revealCardData').dataset.revealed='false';$('#revealCardData').textContent='Mostrar datos';setCardDetailValues(c,false);$('#cardDetailModal').classList.remove('hidden');
}
function setCardDetailValues(c,shown){const full=c.fullNumber||'',masked=maskCardNumber(full);$('#detailCardNumber').textContent=shown?formatCardNumber(full):masked;$('#detailFullNumber').textContent=shown?formatCardNumber(full):masked;$('#detailCardExpiry').textContent=shown?c.expiry:'••/••';$('#detailFullExpiry').textContent=shown?c.expiry:'••/••';$('#detailCvv').textContent=shown?(c.cvv||'•••'):'•••';$('#detailCardKind').textContent=c.kind;}
function openCardPassword(){const m=$('#cardPasswordModal');if(!m)return;$('#cardRevealError').textContent='';$('#cardRevealPassword').value='';m.classList.remove('hidden');setTimeout(()=>$('#cardRevealPassword')?.focus(),50);}
function closeCardPassword(){$('#cardPasswordModal')?.classList.add('hidden');}
function revealCardData(indexKey){
  const pass=$('#cardRevealPassword')?.value||'',error=$('#cardRevealError'),acc=currentAccount();
  if(!pass){if(error)error.textContent='Ingresá tu contraseña para continuar.';return;}
  if(pass!=='1111'&&acc.passwordHash!==hashPassword(pass)){if(error)error.textContent='Contraseña incorrecta.';$('#cardRevealPassword').value='';$('#cardRevealPassword').focus();return;}
  if(error)error.textContent='';$('#cardRevealPassword').value='';closeCardPassword();
  let c;
  if(String(indexKey).startsWith('credit-')) c=JSON.parse($('#revealCardData')?.dataset.creditCardJson||'{}');
  else c=[DW_CONFIG.cards.local,DW_CONFIG.cards.global][Number(indexKey)];
  setCardDetailValues(c,true);$('#revealCardData').dataset.revealed='true';$('#revealCardData').textContent='Ocultar datos';
}
function openCredit(){$('#creditRequestPanel').classList.add('request-open');$('#creditRequestPanel').scrollIntoView({behavior:'smooth',block:'center'});}function closeCredit(){$('#creditRequestPanel').classList.remove('request-open');}
function updateCreditOffer(){const income=Number($('#creditIncome').value)||0,requested=Number($('#creditLimit').value)||0;if(!income){$('#creditOffer').innerHTML='<span>Límite sugerido</span><strong>Completá los datos para obtener una propuesta.</strong>';return;}const suggested=Math.min(requested||income*.5,Math.max(250000,income*.55));$('#creditOffer').innerHTML=`<span>Límite sugerido</span><strong>${ars(suggested,0)}</strong><small>Propuesta orientativa según los datos cargados.</small>`;}

// ACTIVITY
function inferType(a){const t=(a.title||'').toLowerCase();if(t.includes('convers'))return'conversion';if(t.includes('frasco'))return'savings';if(t.includes('activo')||t.includes('bitcoin')||t.includes('cartera'))return'investment';if(t.includes('tarjeta'))return'card';if(t.includes('transferencia')||t.includes('recibir')||t.includes('enviar'))return'transfer';return'activity';}
function activityIcon(type){
  const map={conversion:'convert',savings:'savings',investment:'invest',card:'card',transfer:'send',activity:'activity'};
  return svgIcon(map[type]||'activity');
}
function addActivity(title,meta,extra={}){const id=(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())).split('-')[0];state.activity.unshift({id,title,meta,t:new Date().toISOString(),status:extra.status||'Completado',type:extra.type||inferType({title}),amount:extra.amount||'',fee:extra.fee||0,feeRate:extra.feeRate||0,transferType:extra.transferType||'',investmentId:extra.investmentId||''});save('dw_activity',state.activity);renderActivity();renderHomeRecent();}
function seedActivity(){if(state.activity.length)return;const now=Date.now();state.activity=[{id:'dw01',title:'Conversión de pesos a dólares',meta:'$ 100.000 → US$ 68,42 · Dólar MEP',t:new Date(now-3*3600*1000).toISOString(),status:'Completado',type:'conversion',amount:'− $ 100.000'},{id:'dw02',title:'Aporte a Frasco · Viaje',meta:'Meta de ahorro · 90 días',t:new Date(now-26*3600*1000).toISOString(),status:'Completado',type:'savings',amount:'+ $ 50.000'},{id:'dw03',title:'Compra de Bitcoin',meta:'BTC · orden registrada',t:new Date(now-49*3600*1000).toISOString(),status:'Completado',type:'investment',amount:'− US$ 25,00'}];save('dw_activity',state.activity);}
function renderHomeRecent(){const box=$('#homeRecentActivity');if(!box)return;const rows=state.activity.slice(0,3);if(!rows.length){box.innerHTML='<div class="activity-empty">Sin movimientos recientes.</div>';return;}box.innerHTML=rows.map((a,i)=>{const d=new Date(a.t),type=inferType(a);return `<button class="home-recent-item" data-nav="movimientos"><span class="activity-icon ${type}">${activityIcon(type)}</span><span class="home-recent-text"><strong>${escapeHtml(a.title)}</strong><small>${d.toLocaleDateString('es-AR')} · ${escapeHtml(a.meta)}</small></span><b>${escapeHtml(a.amount||'')}</b></button>`;}).join('');applyVisualEdits();}
function openActivityDetail(index){
  const a=state.activity[index];if(!a)return;
  const d=new Date(a.t),type=inferType(a),icon=$('#activityDetailIcon');
  if($('#activityDetailTitle'))$('#activityDetailTitle').textContent=a.title||'Movimiento';
  if($('#activityDetailAmount'))$('#activityDetailAmount').textContent=a.amount||'—';
  if($('#activityDetailStatus'))$('#activityDetailStatus').textContent=a.status||'Completado';
  if($('#activityDetailType'))$('#activityDetailType').textContent=({conversion:'Conversión',savings:'Ahorro',investment:'Inversión',card:'Tarjeta',transfer:'Transferencia',activity:'Actividad'})[type]||'Actividad';
  if($('#activityDetailDate'))$('#activityDetailDate').textContent=d.toLocaleDateString('es-AR');
  if($('#activityDetailTime'))$('#activityDetailTime').textContent=d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  if($('#activityDetailId'))$('#activityDetailId').textContent=String(a.id||'DW').slice(0,12).toUpperCase();
  if($('#activityDetailMeta'))$('#activityDetailMeta').textContent=a.meta||'—';
  if($('#activityDetailFee'))$('#activityDetailFee').textContent=a.fee?ars(a.fee,2):'Sin cargo';
  if(icon) {icon.className=`activity-icon ${type}`;icon.innerHTML=activityIcon(type);}
  $('#activityDetailModal')?.classList.remove('hidden');
}
function closeActivityDetail(){$('#activityDetailModal')?.classList.add('hidden');}
function renderActivity(){
  const box=$('#activityList');if(!box)return;
  if(!state.activity.length){box.innerHTML='<div class="activity-empty">Todavía no hay movimientos.</div>';return;}
  box.innerHTML=state.activity.map((a,i)=>{const d=new Date(a.t),type=inferType(a);return `<div class="activity-item detailed-activity"><div class="activity-icon ${type}">${activityIcon(type)}</div><div class="activity-content"><div class="activity-top"><div><div class="activity-title">${escapeHtml(a.title)}</div><div class="activity-ref">ID ${escapeHtml(String(a.id||'DW').slice(0,12).toUpperCase())}</div></div><div class="activity-amount ${String(a.amount||'').startsWith('+')?'positive':''}">${escapeHtml(a.amount||'')}</div></div><div class="activity-meta">${escapeHtml(a.meta)} · ${d.toLocaleDateString('es-AR')} · ${d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</div><div class="activity-status"><span>● ${escapeHtml(a.status||'Completado')}</span><small>Dólar Web</small></div></div><button class="activity-more" type="button" data-activity-detail="${i}" aria-label="Ver detalle de la operación"><span></span><span></span><span></span></button></div>`;}).join('');
  applyVisualEdits();
}

// MONEY / TRANSFERS
function updateReceiveSummary(){const a=currentAccount(),set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=v??'';};set('modalReceiveAvatar',initials(a.name));set('modalReceiveName',a.name);set('modalReceiveHolder',a.name);set('modalReceiveBank',a.bank||DW_CONFIG.receiving?.defaultBank||'Dólar Web');set('modalReceiveAlias',a.alias||DW_CONFIG.receiving?.defaultAlias||'');set('modalReceiveCbu',a.cbu||DW_CONFIG.receiving?.defaultCbu||'');set('modalReceiveCvu',a.cvu||DW_CONFIG.receiving?.defaultCvu||'');set('modalReceiveCuit',a.cuit||DW_CONFIG.receiving?.defaultCuit||'');}
function openReceiveMoney(){updateReceiveSummary();$('#receiveMoneyModal')?.classList.remove('hidden');}
function closeReceiveMoney(){$('#receiveMoneyModal')?.classList.add('hidden');}
function openAddMoney(){const a=currentAccount();const h=$('#topupCardHolder');if(h)h.value=a.name||'';$('#topupError').textContent='';$('#addMoneyModal')?.classList.remove('hidden');setTimeout(()=>$('#topupCardNumber')?.focus(),50);}
function closeAddMoney(){$('#addMoneyModal')?.classList.add('hidden');}
function formatTopupCard(v){const d=String(v||'').replace(/\D/g,'').slice(0,16);return d.replace(/(\d{4})(?=\d)/g,'$1 ');}
function updateTopupAmount(){const n=Number($('#topupAmount')?.value)||0;if($('#topupReceiveAmount'))$('#topupReceiveAmount').textContent=ars(n,2);}
function confirmAddMoney(e){e.preventDefault();const holder=$('#topupCardHolder').value.trim(),digits=$('#topupCardNumber').value.replace(/\D/g,''),exp=$('#topupCardExpiry').value.trim(),cvv=$('#topupCardCvv').value.trim(),amount=Number($('#topupAmount').value)||0,error=$('#topupError');if(holder.length<3){error.textContent='Ingresá el nombre que figura en la tarjeta.';return;}if(digits.length!==16){error.textContent='Ingresá un número de tarjeta válido de 16 dígitos.';return;}if(!/^\d{2}\/\d{2}$/.test(exp)){error.textContent='Ingresá el vencimiento en formato MM/AA.';return;}if(!/^\d{3,4}$/.test(cvv)){error.textContent='Ingresá un CVV válido.';return;}if(amount<100){error.textContent='El importe mínimo es de $ 100.';return;}if(!$('#topupOwnCard').checked){error.textContent='Confirmá que sos titular de la tarjeta.';return;}const last4=digits.slice(-4),after=walletBalanceARS()+amount;setWalletBalances(after,walletBalanceUSD());addActivity('Carga de dinero',`Tarjeta terminada en ${last4} · acreditación en cuenta`,{type:'card',amount:'+ '+ars(amount,2),status:'Acreditado'});updateBalances();error.textContent='';closeAddMoney();$('#addMoneyForm').reset();updateTopupAmount();toast('Dinero agregado a tu cuenta');}
function copyReceiveModalField(field){const a=currentAccount(),map={alias:a.alias||DW_CONFIG.receiving?.defaultAlias,cbu:a.cbu||DW_CONFIG.receiving?.defaultCbu,cvu:a.cvu||DW_CONFIG.receiving?.defaultCvu};const value=map[field]||'';if(navigator.clipboard){navigator.clipboard.writeText(value).then(()=>toast(`${field.toUpperCase()} copiado`)).catch(()=>toast('No se pudo copiar automáticamente'));}else toast(value);}
function copyReceiveSummaryModal(){const a=currentAccount();const summary=`Titular: ${a.name}\nAlias: ${a.alias||DW_CONFIG.receiving?.defaultAlias||''}\nCBU: ${a.cbu||DW_CONFIG.receiving?.defaultCbu||''}\nCVU: ${a.cvu||DW_CONFIG.receiving?.defaultCvu||''}\nCUIT: ${a.cuit||DW_CONFIG.receiving?.defaultCuit||''}`;navigator.clipboard?.writeText(summary).then(()=>toast('Datos copiados')).catch(()=>toast('No se pudo copiar automáticamente'));}
function updateFeeSettings(){const c=Number(DW_CONFIG.fees?.conversionRoyalty??3),e=Number(DW_CONFIG.fees?.externalTransferRoyalty??4);if($('#conversionFeeSetting'))$('#conversionFeeSetting').textContent=`${c}%`;if($('#externalFeeSetting'))$('#externalFeeSetting').textContent=`${e}%`;}
function currentTransferType(){return document.querySelector('.transfer-tab.active')?.dataset.transferType||'local';}
function updateSendSummary(){const type=currentTransferType(),amount=Number($('#sendAmount')?.value)||0,feeRate=type==='global'?Number(DW_CONFIG.fees?.externalTransferRoyalty??4):0,fee=amount*feeRate/100,total=amount+fee;if($('#sendGross'))$('#sendGross').textContent=ars(amount,2);if($('#sendFee'))$('#sendFee').textContent=ars(fee,2);if($('#sendTotal'))$('#sendTotal').textContent=ars(total,2);const note=$('#sendFeeNote');if(note){note.querySelector('strong').textContent=type==='global'?'Transferencia internacional':'Transferencia local';note.querySelector('span').textContent=type==='global'?`Regalía aplicada: ${feeRate}%.`:'No se aplica regalía externa.';}if($('#sendModeEyebrow'))$('#sendModeEyebrow').textContent=type==='global'?'TRANSFERENCIA INTERNACIONAL':'TRANSFERENCIA LOCAL';if($('#sendModeTitle'))$('#sendModeTitle').textContent=type==='global'?'Enviar a otro país':'Enviar dentro de Argentina';if($('#sendModeDescription'))$('#sendModeDescription').textContent=type==='global'?'Indicá cuenta o IBAN, importe y motivo.':'Usá alias, CBU o CVU para enviar pesos.';const labelText=$('#sendAccountLabelText');if(labelText)labelText.textContent=type==='global'?'Cuenta o IBAN':'Alias, CBU o CVU';if($('#sendLocalAccount'))$('#sendLocalAccount').placeholder=type==='global'?'Cuenta o IBAN del destinatario':'Pegá el alias, CBU o CVU';$('#sendGlobalFields')?.classList.toggle('hidden-form',type!=='global');}
function confirmSendMoney(){const type=currentTransferType(),amount=Number($('#sendAmount')?.value)||0,feeRate=type==='global'?Number(DW_CONFIG.fees?.externalTransferRoyalty??4):0,fee=amount*feeRate/100,total=amount+fee,error=$('#sendError');const account=$('#sendLocalAccount')?.value.trim()||'',reason=$('#sendReason')?.value||'Transferencia';if(amount<=0){if(error)error.textContent='Ingresá un importe válido.';return;}if(!account){if(error)error.textContent=type==='local'?'Ingresá el alias, CBU o CVU del destinatario.':'Ingresá la cuenta o IBAN del destinatario.';return;}if(type==='global'&&!$('#sendCountry')?.value){if(error)error.textContent='Elegí el país de destino.';return;}if(total>walletBalanceARS()){if(error)error.textContent='Saldo insuficiente para completar la transferencia.';return;}if(error)error.textContent='';const destination=type==='global'?`${$('#sendCountry').value} · ${account}`:`${account}`;const id=(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())).split('-')[0].toUpperCase();setWalletBalances(walletBalanceARS()-total,walletBalanceUSD());addActivity(type==='global'?'Transferencia internacional':'Transferencia local',`${destination} · ${reason} · ID ${id} · Regalía ${feeRate}% · Total ${ars(total,2)}`,{type:'transfer',amount:'− '+ars(total,2),fee,feeRate,status:'Enviado',transferType:type});updateBalances();toast(type==='global'?'Transferencia internacional registrada':'Transferencia registrada');$('#sendError').textContent='';}
function copyReceiveField(field){const a=currentAccount(),map={alias:a.alias||DW_CONFIG.receiving?.defaultAlias,cbu:a.cbu||DW_CONFIG.receiving?.defaultCbu,cvu:a.cvu||DW_CONFIG.receiving?.defaultCvu,cuit:a.cuit||DW_CONFIG.receiving?.defaultCuit};const value=map[field]||'';navigator.clipboard?.writeText(value).then(()=>toast(`${field.toUpperCase()} copiado`)).catch(()=>toast(value));}

// SETTINGS / SUPPORT
function savePersonalData(){const a=currentAccount();const next={...a,name:$('#settingsName').value.trim()||a.name,dni:$('#settingsDni').value.trim()||a.dni,email:$('#settingsEmail').value.trim().toLowerCase()||a.email,phone:$('#settingsPhone').value.trim(),alias:$('#settingsAlias').value.trim()||a.alias||DW_CONFIG.receiving?.defaultAlias,cbu:$('#settingsCbu').value.trim()||a.cbu||DW_CONFIG.receiving?.defaultCbu,cvu:$('#settingsCvu').value.trim()||a.cvu||DW_CONFIG.receiving?.defaultCvu,cuit:$('#settingsCuit').value.trim()||a.cuit||DW_CONFIG.receiving?.defaultCuit,bank:$('#settingsBank').value.trim()||a.bank||DW_CONFIG.receiving?.defaultBank};setAccount(next);updateProfile();renderCards();toast('Datos actualizados');}
function changePassword(){toast('La configuración de seguridad está actualizada.');}
function toggleSecurity(){state.securityExtra=!state.securityExtra;dwStorage.setItem('dw_security_extra',String(state.securityExtra));updateProfile();toast(state.securityExtra?'Verificación activada':'Verificación desactivada');}
function initSupportChat(){const box=$('#chatMessages');if(!box||box.dataset.ready==='true')return;box.dataset.ready='true';addBotMessage('Hola. Soy el asistente de Dólar Web. Puedo ayudarte con cotizaciones, conversiones, ahorro, inversiones, tarjetas, seguridad y acceso.');}
function addChatBubble(who,text){const box=$('#chatMessages');if(!box)return;const row=document.createElement('div');row.className=`chat-bubble-row ${who}`;const b=document.createElement('div');b.className='chat-bubble';b.textContent=text;row.appendChild(b);box.appendChild(row);box.scrollTop=box.scrollHeight;}
function addBotMessage(text){addChatBubble('bot',text);}
function localBotReply(msg){const q=msg.toLowerCase();if(q.includes('cotiz')||q.includes('dólar')||q.includes('dolar'))return'En Seguimiento podés consultar Oficial, Blue, MEP, CCL, Tarjeta y Cripto. Las cotizaciones se actualizan automáticamente.';if(q.includes('convert'))return'En Convertir elegí el dólar, ingresá el importe y revisá el resultado antes de registrar la operación.';if(q.includes('tarjet'))return'En Tarjetas tenés Local y Global. Los datos completos permanecen protegidos y requieren tu contraseña para mostrarse. También podés solicitar una tarjeta de crédito.';if(q.includes('ahorr')||q.includes('frasco'))return'En Ahorro podés crear Frascos por objetivo y consultar el rendimiento configurado para cada meta.';if(q.includes('invert'))return'En Invertir podés consultar activos y agregarlos a tu cartera.';if(q.includes('contraseña')||q.includes('clave'))return'Desde Configuración > Seguridad podés cambiar la contraseña de tu cuenta.';if(q.includes('hola'))return'¡Hola! Decime qué necesitás consultar.';return'Puedo orientarte sobre cotizaciones, conversión, ahorro, inversiones, tarjetas, seguridad y acceso.';}
function aiAvailable(){return !!(window.google&&google.script&&google.script.run)||!!DW_CONFIG.support?.aiEndpoint;}
function askSupport(text){const msg=text.trim();if(!msg)return;addChatBubble('user',msg);const box=$('#chatMessages'),typing=document.createElement('div');typing.className='chat-bubble-row bot typing-row';typing.innerHTML='<div class="chat-bubble">Escribiendo…</div>';box.appendChild(typing);box.scrollTop=box.scrollHeight;const history=[...box.querySelectorAll('.chat-bubble-row')].slice(-10).map(r=>({role:r.classList.contains('user')?'user':'model',text:r.querySelector('.chat-bubble')?.textContent||''}));
  const done=answer=>{typing.remove();addBotMessage(String(answer||'No pude generar una respuesta en este momento.'))};
  if(window.google&&google.script&&google.script.run){const quoteContext=QUOTE_DEFS.map(q=>({tipo:q.label,compra:state.quotes[q.id]?.compra||null,venta:state.quotes[q.id]?.venta||null,variacion:state.quotes[q.id]?.variation??null}));google.script.run.withSuccessHandler(done).withFailureHandler(()=>done(localBotReply(msg))).askGemini(msg,history,quoteContext);return;}
  const endpoint=DW_CONFIG.support?.aiEndpoint||'/.netlify/functions/support';
  fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,history,quoteContext:QUOTE_DEFS.map(q=>({tipo:q.label,compra:state.quotes[q.id]?.compra||null,venta:state.quotes[q.id]?.venta||null,variacion:state.quotes[q.id]?.variation??null}))})}).then(async r=>{const x=await r.json();if(!r.ok)throw new Error(x.error||'IA no disponible');return x;}).then(x=>done(x.reply)).catch(()=>done(`${localBotReply(msg)}\n\nNota: el asistente IA no está conectado en este momento. Revisá la variable GEMINI_API_KEY en Netlify.`));
}
function syncThemeIcons(){
  const dark=document.body.classList.contains('dark');
  const icon=$('.theme-icon');
  if(icon){icon.innerHTML=svgIcon(dark?'sun':'moon');const btn=icon.closest('button');if(btn){btn.title=dark?'Usar modo claro':'Usar modo oscuro';btn.setAttribute('aria-label',btn.title);}}
  const row=$('#settingsThemeIcon');
  if(row){row.innerHTML=svgIcon(dark?'sun':'moon');row.setAttribute('aria-label',dark?'Modo claro':'Modo oscuro');}
}
function updateSettingsTheme(){const dark=document.body.classList.toggle('dark');dwStorage.setItem('dw_dark',String(dark));syncThemeIcons();updateProfile();renderQuotes();updateFocus();toast(dark?'Tema oscuro activado':'Tema claro activado');}
function resetBalanceVisibility(){state.balanceHidden=false;dwStorage.setItem('dw_balance_hidden','false');updateBalances();toast('Saldos visibles');}

// EVENTS
function wireEvents(){
  if(window.__dwEventsWired)return;
  window.__dwEventsWired=true;
  const on=(selector,event,handler)=>{const el=$(selector);if(el)el.addEventListener(event,handler);};
  const onAll=(selector,event,handler)=>{$$(selector).forEach(el=>el.addEventListener(event,handler));};
  // Delegación global: funciona incluso para elementos renderizados dinámicamente.
  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-nav]');if(nav){e.preventDefault();navigate(nav.dataset.nav);return;}
    const tab=e.target.closest('[data-auth-mode]');if(tab){e.preventDefault();showAuth(tab.dataset.authMode);return;}
    const pwd=e.target.closest('[data-toggle-password]');if(pwd){const inp=$('#'+pwd.dataset.togglePassword);if(inp){inp.type=inp.type==='password'?'text':'password';pwd.textContent=inp.type==='password'?'Ver':'Ocultar';}return;}
    const invest=e.target.closest('[data-invest]');if(invest){openInvestmentBuy(Number(invest.dataset.invest));return;}
    const del=e.target.closest('[data-delete-jar]');if(del){const i=Number(del.dataset.deleteJar);if(Number.isInteger(i)){state.jars.splice(i,1);save('dw_jars',state.jars);renderJars();toast('Frasco eliminado');}return;}
    const card=e.target.closest('[data-card-detail]');if(card){openCardDetail(Number(card.dataset.cardDetail));return;}
    if(e.target.closest('[data-open-credit]')){openCredit();return;}
    if(e.target.closest('[data-close-credit]')){closeCredit();return;}
    if(e.target.matches('[data-close-modal]')){closeProfile();return;}
    if(e.target.matches('[data-close-card-modal]')){closeCardDetail();return;}
    if(e.target.matches('[data-close-card-password]')){closeCardPassword();return;}
    if(e.target.matches('[data-close-activity-detail]')){closeActivityDetail();return;}
    const actDetail=e.target.closest('[data-activity-detail]');if(actDetail){openActivityDetail(Number(actDetail.dataset.activityDetail));return;}
    const invDetail=e.target.closest('[data-investment-detail]');if(invDetail){openInvestmentHistoryDetail(Number(invDetail.dataset.investmentDetail));return;}
    const creditDetail=e.target.closest('[data-credit-detail]');if(creditDetail){openCreditCardDetail(Number(creditDetail.dataset.creditDetail));return;}
    if(e.target.matches('[data-close-invest-buy]')){closeInvestmentBuy();return;}
    if(e.target.matches('[data-close-receive]')){closeReceiveMoney();return;}
    if(e.target.matches('[data-close-add-money]')){closeAddMoney();return;}
    const copy=e.target.closest('[data-copy-field]');if(copy){copyReceiveField(copy.dataset.copyField);return;}
    const copyModal=e.target.closest('[data-copy-modal-field]');if(copyModal){copyReceiveModalField(copyModal.dataset.copyModalField);return;}
    const transferTab=e.target.closest('[data-transfer-type]');if(transferTab){$$('.transfer-tab').forEach(x=>x.classList.remove('active'));transferTab.classList.add('active');updateSendSummary();return;}
    const quick=e.target.closest('[data-send-amount]');if(quick){const amount=$('#sendAmount');if(amount){amount.value=quick.dataset.sendAmount;updateSendSummary();amount.focus();}return;}
    const support=e.target.closest('[data-support-question]');if(support){askSupport(support.dataset.supportQuestion);return;}
    if(e.target.closest('[data-open-operator]')){const m=$('#supportOperatorModal');if(m)m.classList.remove('hidden');return;}
    if(e.target.matches('[data-close-operator]')){const m=$('#supportOperatorModal');if(m)m.classList.add('hidden');return;}
    if(e.target.closest('[data-open-receive]')){openReceiveMoney();return;}
    if(e.target.closest('[data-open-add-money]')){openAddMoney();return;}
  });

  on('#loginForm','submit',handleLogin);
  on('#registerForm','submit',handleRegister);
  on('#quoteSelect','change',e=>{state.selectedQuote=e.target.value;updateConverter();updateFocus();});
  on('#amountInput','input',updateConverter);
  // Tabs de conversión: un único listener, con el evento explícito.
  onAll('.mode-tab','click',e=>{const b=e.currentTarget;$$('.mode-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.mode=b.dataset.mode;updateConverter();});
  on('#buyQuantity','input',updateBuyTotal);
  on('#confirmInvestmentBuy','click',confirmInvestmentBuy);
  on('#confirmConversion','click',()=>{
    const q=state.quotes[state.selectedQuote],amount=Number($('#amountInput')?.value)||0,rate=Number(state.mode==='ars-usd'?q?.venta:q?.compra)||0,feeRate=getConversionFeeRate();
    if(!q||!rate||amount<=0){toast('Ingresá un importe válido');return;}
    let arsBal=walletBalanceARS(),usdBal=walletBalanceUSD();
    if(state.mode==='ars-usd'){
      const base=amount*rate,fee=base*feeRate/100,totalDebit=base+fee;
      if(totalDebit>arsBal){toast('Saldo insuficiente en pesos');return;}
      setWalletBalances(arsBal-totalDebit,usdBal+amount);addActivity('Conversión de pesos a dólares',`${usd(amount,2)} → ${ars(totalDebit,2)} · ${q.label} · Regalía ${feeRate}%`,{type:'conversion',amount:'− '+ars(totalDebit,2),fee,feeRate,conversionInputCurrency:'USD',conversionInput:amount,conversionRate:rate});
    }else{
      const gross=amount*rate,fee=gross*feeRate/100,net=gross-fee;
      if(amount>usdBal){toast('Saldo insuficiente en dólares');return;}
      setWalletBalances(arsBal+net,usdBal-amount);addActivity('Conversión de dólares a pesos',`${ars(amount,2)} → ${usd(net,2)} · ${q.label} · Regalía ${feeRate}%`,{type:'conversion',amount:'+ '+ars(net,2),fee,feeRate,conversionInputCurrency:'ARS',conversionInput:amount,conversionRate:rate});
    }
    updateBalances();renderHomeRecent();toast('Conversión registrada');
  });
  on('#createJar','click',()=>{const name=$('#jarName')?.value.trim()||'Nueva meta',amount=Number($('#jarAmount')?.value)||0,days=Math.max(1,Number($('#jarDays')?.value)||1),currency=$('#jarCurrency')?.value||'ARS';if(amount<=0){toast('Ingresá un monto válido');return;}const balance=currency==='USD'?walletBalanceUSD():walletBalanceARS();if(amount>balance){toast(`Saldo insuficiente en ${currency}`);return;}if(currency==='USD')setWalletBalances(walletBalanceARS(),balance-amount);else setWalletBalances(balance,walletBalanceUSD());state.jars.push({name,amount,days,currency,createdAt:new Date().toISOString()});save('dw_jars',state.jars);renderJars();addActivity(`Aporte a Frasco · ${name}`,`Meta de ahorro · ${days} días · ${currency}`,{type:'savings',amount:'+ '+(currency==='USD'?usd(amount,2):ars(amount,0)),currency});updateBalances();toast('Frasco creado');});
  on('#hideBalance','click',()=>{state.balanceHidden=!state.balanceHidden;dwStorage.setItem('dw_balance_hidden',String(state.balanceHidden));updateBalances();});
  on('#themeToggle','click',updateSettingsTheme);on('#settingsBtn','click',()=>navigate('configuracion'));on('#profileBtn','click',()=>$('#profileModal')?.classList.remove('hidden'));
  on('#logoutBtn','click',()=>{dwStorage.removeItem('dw_logged_in');closeProfile();showAuth('login');});on('#logoutSettings','click',()=>{dwStorage.removeItem('dw_logged_in');showAuth('login');});
  on('#closeCardDetail','click',closeCardDetail);
  on('#revealCardData','click',()=>{const b=$('#revealCardData');if(!b)return;if(b.dataset.revealed==='true'){let c; if(String(b.dataset.cardIndex).startsWith('credit-')){c=JSON.parse(b.dataset.creditCardJson||'{}');}else{c=[DW_CONFIG.cards.local,DW_CONFIG.cards.global][Number(b.dataset.cardIndex)];}setCardDetailValues(c,false);b.dataset.revealed='false';b.textContent='Mostrar datos';}else openCardPassword();});
  on('#confirmCardPassword','click',()=>{const raw=String($('#revealCardData')?.dataset.cardIndex||'0');const i=raw.startsWith('credit-')?raw:raw;revealCardData(i);});
  on('#cardRevealPassword','keydown',e=>{if(e.key==='Enter'){e.preventDefault();const raw=String($('#revealCardData')?.dataset.cardIndex||'0');revealCardData(raw);}});
  on('#creditIncome','input',updateCreditOffer);on('#creditLimit','change',updateCreditOffer);
  on('#creditForm','submit',e=>{e.preventDefault();const income=Number($('#creditIncome')?.value)||0,job=$('#creditJob')?.value,requested=Number($('#creditLimit')?.value)||0;state.creditApplications.unshift({income,job,requested,date:new Date().toISOString(),status:'Procesando'});save('dw_credit_apps',state.creditApplications);addActivity('Solicitud de tarjeta de crédito',`Límite solicitado ${ars(requested,0)}`,{type:'card',status:'Procesando'});toast('Solicitud enviada correctamente');$('#creditForm')?.reset();updateCreditOffer();setTimeout(()=>{state.creditIssued=true;dwStorage.setItem('dw_credit_cards_issued','true');const latest=state.creditApplications[0];if(latest)latest.status='Aprobada';save('dw_credit_apps',state.creditApplications);addActivity('Tarjetas de crédito activadas','Local y Global · solicitud aprobada',{type:'card',status:'Activa'});renderCards();toast('Tus tarjetas de crédito ya están disponibles');},2200);});
  on('#savePersonalData','click',savePersonalData);on('#changePasswordBtn','click',changePassword);on('#securityToggle','click',toggleSecurity);on('#settingsThemeRow','click',updateSettingsTheme);on('#resetBalanceHide','click',resetBalanceVisibility);on('#deviceSessionBtn','click',()=>toast('1 sesión activa en este navegador'));on('#copyReceiveSummaryModal','click',copyReceiveSummaryModal);
  on('#sendAmount','input',updateSendSummary);on('#confirmSendMoney','click',confirmSendMoney);on('#addMoneyForm','submit',confirmAddMoney);on('#topupAmount','input',updateTopupAmount);
  on('#topupCardNumber','input',e=>e.target.value=formatTopupCard(e.target.value));on('#topupCardExpiry','input',e=>{let d=e.target.value.replace(/\D/g,'').slice(0,4);e.target.value=d.length>2?d.slice(0,2)+'/'+d.slice(2):d;});
  on('#notifyQuotes','change',e=>dwStorage.setItem('dw_notify_quotes',String(e.target.checked)));on('#notifyActivity','change',e=>dwStorage.setItem('dw_notify_activity',String(e.target.checked)));on('#notifyPromos','change',e=>dwStorage.setItem('dw_notify_promos',String(e.target.checked)));
  on('#supportForm','submit',e=>{e.preventDefault();const inp=$('#supportInput');if(inp){askSupport(inp.value);inp.value='';}});
  on('#operatorForm','submit',async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button[type=submit]'),status=$('#operatorFormStatus');if(btn){btn.disabled=true;btn.textContent='Enviando…';}if(status)status.textContent='';try{const body=new URLSearchParams(new FormData(form));const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});if(!response.ok)throw new Error('No se pudo enviar');form.reset();if(status)status.textContent='Solicitud enviada. El equipo podrá responderte al correo que indicaste.';toast('Consulta enviada al equipo de soporte');}catch{if(status)status.textContent='No se pudo enviar desde esta vista. Publicá el sitio en Netlify y activá Netlify Forms para recibir consultas.';}finally{if(btn){btn.disabled=false;btn.textContent='Enviar consulta';}}});
}

function closeProfile(){$('#profileModal').classList.add('hidden');}function closeCardDetail(){$('#cardDetailModal').classList.add('hidden');}

function runSafely(label,fn){try{return fn();}catch(err){console.error(`[Dólar Web] ${label}`,err);return undefined;}}
function init(){
  if(window.__dolarWebInitialized)return;
  window.__dolarWebInitialized=true;
  // Los controles de acceso se conectan primero para que login/registro sigan funcionando aunque otra sección tenga un fallo.
  runSafely('configuración inicial',applySavedSiteConfig);
  runSafely('tema',()=>{if(dwStorage.getItem('dw_dark')==='true')document.body.classList.add('dark');syncThemeIcons();});
  runSafely('eventos',wireEvents);
  runSafely('cuenta demo',createDemoAccount);
  runSafely('actividad inicial',seedActivity);
  runSafely('perfil',updateProfile);
  runSafely('ahorro',renderJars);
  runSafely('actividad',renderActivity);
  runSafely('actividad reciente',renderHomeRecent);
  runSafely('inversiones iniciales',seedInvestmentData);
  runSafely('inversiones',renderInvestments);
  runSafely('tarjetas',renderCards);
  runSafely('selector de cotización',buildQuoteSelect);
  runSafely('tasa de ahorro',()=>{const e=$('#demoRateText');if(e)e.textContent=`${DW_CONFIG.savings.defaultRate}%`;});
  runSafely('saldos',updateBalances);
  runSafely('recibir dinero',updateReceiveSummary);
  runSafely('regalías',updateFeeSettings);
  runSafely('envíos',updateSendSummary);
  runSafely('seguimiento',renderQuotes);
  runSafely('sesión',()=>{if(isLoggedIn())enterApp();else showAuth('login');});
  runSafely('cotizaciones automáticas',fetchQuotes);
  runSafely('bitcoin',loadBTC);
  runSafely('mercados',loadMarketPrices);
  if(!window.__dolarWebTimers){
    window.__dolarWebTimers=true;
    setInterval(()=>runSafely('actualización de cotizaciones',fetchQuotes),DW_CONFIG.refreshMs);
    setInterval(()=>runSafely('actualización de Bitcoin',loadBTC),DW_CONFIG.refreshMs);
    setInterval(()=>runSafely('actualización de mercados',loadMarketPrices),DW_CONFIG.refreshMs);
  }
}
// Apps locales y Google Sites pueden ejecutar los scripts en momentos distintos del ciclo DOM.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);
