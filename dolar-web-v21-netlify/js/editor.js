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
const DEFAULT_CONFIG = JSON.parse(JSON.stringify(DW_CONFIG));
const QUOTE_LABELS = { oficial:'Dólar Oficial', blue:'Dólar Blue', mep:'Dólar MEP', ccl:'Dólar CCL', tarjeta:'Dólar Tarjeta', cripto:'Dólar Cripto' };
const QUOTE_IDS = Object.keys(QUOTE_LABELS);
const STYLE_KEYS = ['color','backgroundColor','fontSize','fontWeight','textAlign','borderRadius','width','height','padding','margin','opacity','position','left','top'];
const $ = id => document.getElementById(id);
let selectedKey = null;
let selectedEl = null;
let frameReady = false;

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function readConfig(){
  const saved = dwStorage.getItem('dw_site_config');
  if (!saved) return clone(DEFAULT_CONFIG);
  try { const parsed=JSON.parse(saved); const cfg=clone(DEFAULT_CONFIG); Object.assign(cfg,parsed); cfg.site={...DEFAULT_CONFIG.site,...(parsed.site||{})}; cfg.theme={...DEFAULT_CONFIG.theme,...(parsed.theme||{})}; cfg.cards={...DEFAULT_CONFIG.cards,...(parsed.cards||{})}; cfg.fees={...DEFAULT_CONFIG.fees,...(parsed.fees||{})}; cfg.receiving={...DEFAULT_CONFIG.receiving,...(parsed.receiving||{})}; return cfg; } catch { return clone(DEFAULT_CONFIG); }
}
function readVisualEdits(){ try{return JSON.parse(dwStorage.getItem('dw_visual_edits')||'{}')||{};}catch{return{};} }
function writeVisualEdits(v){ dwStorage.setItem('dw_visual_edits',JSON.stringify(v)); }
function colorValue(v,fallback){ return /^#[0-9a-f]{6}$/i.test(v||'')?v:fallback; }
function getFrame(){ return $('previewFrame').contentWindow; }
function getDoc(){ return getFrame()?.document; }
function qsaFrame(sel){ const d=getDoc(); return d?[...d.querySelectorAll(sel)]:[]; }

function getElementLabel(el){
  const tag=el.tagName?.toLowerCase()||'elemento';
  const text=(el.innerText||el.textContent||el.value||'').replace(/\s+/g,' ').trim();
  const cls=[...el.classList||[]].slice(0,2).join('.');
  return `${tag}${cls?'.'+cls:''}${text?' · '+text.slice(0,42):''}`;
}
function makeKey(el){
  if(el.dataset.editorId) return el.dataset.editorId;
  if(el.id) return el.id;
  const parts=[]; let cur=el;
  while(cur && cur.tagName && cur.tagName.toLowerCase()!=='body'){
    const tag=cur.tagName.toLowerCase();
    let idx=1, sib=cur.previousElementSibling;
    while(sib){ if(sib.tagName===cur.tagName) idx++; sib=sib.previousElementSibling; }
    parts.unshift(`${tag}[${idx}]`); cur=cur.parentElement;
  }
  return 'auto:'+parts.join('>');
}
function decorateFrame(){
  const d=getDoc(); if(!d)return;
  d.querySelectorAll('body *').forEach(el=>{
    if(['SCRIPT','STYLE','LINK','META'].includes(el.tagName))return;
    if(!el.dataset.editorId) el.dataset.editorId=makeKey(el);
  });
  injectFrameDesignerStyles();
  refreshElementList();
  applyAllVisualEdits();
}
function injectFrameDesignerStyles(){
  const d=getDoc(); if(!d || d.getElementById('dwEditorStyle'))return;
  const st=d.createElement('style'); st.id='dwEditorStyle'; st.textContent=`
    body.dw-editor-active [data-editor-id]{cursor:grab!important;outline:0 solid transparent;transition:outline .08s,box-shadow .08s;}
    body.dw-editor-active.dw-editor-dragging,body.dw-editor-active.dw-editor-dragging *{cursor:grabbing!important;user-select:none!important;}
    body.dw-editor-active [data-editor-id]:hover{outline:2px dashed rgba(10,143,103,.55)!important;outline-offset:2px;}
    body.dw-editor-active [data-editor-selected="true"]{outline:2px solid #0a8f67!important;outline-offset:3px;box-shadow:0 0 0 4px rgba(10,143,103,.12)!important;}
    body.dw-editor-inline [contenteditable="true"]{outline:2px solid #0a8f67!important;outline-offset:2px;}
  `; d.head.appendChild(st);
}
function setEditorMode(){
  const d=getDoc(); if(!d)return; d.body.classList.toggle('dw-editor-active',$('directEditToggle').checked);
}
function applyAllVisualEdits(){
  const d=getDoc(); if(!d)return; const edits=readVisualEdits();
  Object.entries(edits).forEach(([key,data])=>{
    const el=d.querySelector(`[data-editor-id="${CSS.escape(key)}"]`); if(!el)return;
    if(data.hidden!==undefined) el.style.display=data.hidden?'none':'';
    if(!el.dataset.live && data.text!==undefined && !/^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName)) el.textContent=data.text;
    if(!el.dataset.live && data.value!==undefined && 'value' in el) el.value=data.value;
    if(data.placeholder!==undefined && 'placeholder' in el) el.placeholder=data.placeholder;
    if(data.href!==undefined && el.tagName==='A') el.href=data.href;
    Object.entries(data.styles||{}).forEach(([p,v])=>{ if(STYLE_KEYS.includes(p)) el.style[p]=v; });
  });
  setEditorMode();
}
function selectedData(){
  if(!selectedEl)return null;
  const cs=getFrame().getComputedStyle(selectedEl);
  return {
    key:selectedKey,
    tag:selectedEl.tagName.toLowerCase(),
    text:selectedEl.dataset.live?'':(selectedEl.tagName==='INPUT'||selectedEl.tagName==='TEXTAREA'||selectedEl.tagName==='SELECT'||selectedEl.tagName==='OPTION'?'':selectedEl.textContent),
    value:'value' in selectedEl?selectedEl.value:'',
    placeholder:'placeholder' in selectedEl?selectedEl.placeholder:'',
    href:selectedEl.tagName==='A'?selectedEl.getAttribute('href')||'':'',
    styles:{color:toHex(cs.color),backgroundColor:toHex(cs.backgroundColor),fontSize:parseInt(cs.fontSize)||16,fontWeight:cs.fontWeight,textAlign:cs.textAlign,borderRadius:parseInt(cs.borderRadius)||0,width:selectedEl.style.width||'',height:selectedEl.style.height||'',padding:selectedEl.style.padding||'',margin:selectedEl.style.margin||'',opacity:parseFloat(cs.opacity)}
  };
}
function toHex(rgb){ const m=rgb&&rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m?('#'+[m[1],m[2],m[3]].map(v=>Number(v).toString(16).padStart(2,'0')).join('')):'#000000'; }
function selectElement(el){
  if(!el || !el.dataset.editorId)return;
  if(selectedEl)selectedEl.removeAttribute('data-editor-selected');
  selectedEl=el; selectedKey=el.dataset.editorId; el.dataset.editorSelected='true';
  const s=selectedData();
  $('selectedInfo').innerHTML=`<strong>${s.tag}</strong> · <code>${s.key}</code>${el.dataset.live?' · dato automático':''}`;
  $('elementText').value=s.text||''; $('elementValue').value=s.value||''; $('elementPlaceholder').value=s.placeholder||''; $('elementHref').value=s.href||'';
  $('styleColor').value=colorValue(s.styles.color,'#000000'); $('styleBackground').value=colorValue(s.styles.backgroundColor,'#ffffff'); $('styleFontSize').value=s.styles.fontSize; $('styleOpacity').value=s.styles.opacity; $('styleWeight').value=['400','500','600','700','800'].includes(String(s.styles.fontWeight))?String(s.styles.fontWeight):''; $('styleAlign').value=['left','center','right','justify'].includes(s.styles.textAlign)?s.styles.textAlign:''; $('styleRadius').value=s.styles.borderRadius; $('styleWidth').value=s.styles.width; $('styleHeight').value=s.styles.height; $('stylePadding').value=s.styles.padding; $('styleMargin').value=s.styles.margin;
}
function ensureRecord(){ const all=readVisualEdits(); if(!all[selectedKey])all[selectedKey]={styles:{}}; return all; }
function setEditProp(prop,value){
  if(!selectedEl)return;
  const all=ensureRecord(); if(prop==='text' && !selectedEl.dataset.live && !['INPUT','TEXTAREA','SELECT','OPTION'].includes(selectedEl.tagName)){selectedEl.textContent=value; all[selectedKey].text=value;}
  else if(prop==='value' && 'value' in selectedEl && !selectedEl.dataset.live){selectedEl.value=value; all[selectedKey].value=value;}
  else if(prop==='placeholder' && 'placeholder' in selectedEl){selectedEl.placeholder=value; all[selectedKey].placeholder=value;}
  else if(prop==='href' && selectedEl.tagName==='A'){selectedEl.href=value; all[selectedKey].href=value;}
  else if(STYLE_KEYS.includes(prop)){selectedEl.style[prop]=value; all[selectedKey].styles={...(all[selectedKey].styles||{}),[prop]:value};}
  writeVisualEdits(all); markDirty();
}
function bindInspector(){
  const map={elementText:'text',elementValue:'value',elementPlaceholder:'placeholder',elementHref:'href',styleColor:'color',styleBackground:'backgroundColor',styleFontSize:'fontSize',styleOpacity:'opacity',styleWeight:'fontWeight',styleAlign:'textAlign',styleRadius:'borderRadius',styleWidth:'width',styleHeight:'height',stylePadding:'padding',styleMargin:'margin'};
  Object.entries(map).forEach(([id,prop])=>$(id).addEventListener('input',e=>{
    let v=e.target.value;
    if(['fontSize','borderRadius'].includes(prop)&&v) v=v+'px';
    if(prop==='opacity' && v!=='') v=String(Math.min(1,Math.max(0,Number(v))));
    setEditProp(prop,v);
  }));
  $('hideElementBtn').addEventListener('click',()=>{if(!selectedEl)return; const all=ensureRecord(); all[selectedKey].hidden=true; selectedEl.style.display='none'; writeVisualEdits(all); markDirty();});
  $('clearStylesBtn').addEventListener('click',()=>{if(!selectedEl)return; const all=ensureRecord(); all[selectedKey].styles={}; selectedEl.removeAttribute('style'); applyAllVisualEdits(); selectElement(selectedEl); markDirty();});
  $('inlineEditBtn').addEventListener('click',()=>{
    if(!selectedEl || selectedEl.dataset.live || /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(selectedEl.tagName))return;
    selectedEl.contentEditable='true'; selectedEl.focus(); const d=getDoc(); d.body.classList.add('dw-editor-inline');
    const finish=()=>{const val=selectedEl.textContent; setEditProp('text',val); selectedEl.contentEditable='false'; d.body.classList.remove('dw-editor-inline'); selectedEl.removeEventListener('blur',finish);}; selectedEl.addEventListener('blur',finish);
  });
}
function refreshElementList(){
  const box=$('elementList'); if(!box||!frameReady)return;
  const d=getDoc(); const candidates=[...d.querySelectorAll('[data-editor-id]')].filter(el=>{if(el.offsetParent===null && el.tagName!=='BODY')return false; return !['SCRIPT','STYLE','LINK'].includes(el.tagName);});
  const term=($('elementSearch').value||'').toLowerCase();
  const rows=candidates.map(el=>({el,label:getElementLabel(el)})).filter(x=>!term||(`${x.label} ${x.el.dataset.editorId}`).toLowerCase().includes(term)).slice(0,250);
  box.innerHTML=rows.map((x,i)=>`<button type="button" class="element-item" data-element-key="${x.el.dataset.editorId.replace(/"/g,'&quot;')}"><strong>${x.label.slice(0,66)}</strong><small>${x.el.dataset.editorId}</small></button>`).join('') || '<div class="field-help">No hay elementos que coincidan.</div>';
}
function hashPassword(str){
  let h1=0x811c9dc5, h2=0x01000193;
  for(let i=0;i<str.length;i++){ const c=str.charCodeAt(i); h1=Math.imul(h1^c,0x01000193); h2=Math.imul(h2^(c+i),0x811c9dc5); }
  return `${(h1>>>0).toString(16)}-${(h2>>>0).toString(16)}`;
}
function getAccountEditor(){
  try { return JSON.parse(dwStorage.getItem('dw_account') || 'null') || {name:'Juan Calderon',dni:'32.456.781',email:'juan.calderon.dolarweb@gmail.com',phone:'381 555 0148',alias:DW_CONFIG.receiving?.defaultAlias||'JUAN.CALDERON',cbu:DW_CONFIG.receiving?.defaultCbu||'0000003100001234567890',cvu:DW_CONFIG.receiving?.defaultCvu||'0000003100009876543210',cuit:DW_CONFIG.receiving?.defaultCuit||'20-32456781-7',bank:DW_CONFIG.receiving?.defaultBank||'Dólar Web',passwordHash:hashPassword('1111'),isDemo:true}; }
  catch { return {name:'Juan Calderon',dni:'32.456.781',email:'juan.calderon.dolarweb@gmail.com',phone:'381 555 0148',alias:DW_CONFIG.receiving?.defaultAlias||'JUAN.CALDERON',cbu:DW_CONFIG.receiving?.defaultCbu||'0000003100001234567890',cvu:DW_CONFIG.receiving?.defaultCvu||'0000003100009876543210',cuit:DW_CONFIG.receiving?.defaultCuit||'20-32456781-7',bank:DW_CONFIG.receiving?.defaultBank||'Dólar Web',passwordHash:hashPassword('1111'),isDemo:true}; }
}
function fillAccountEditor(){
  const a=getAccountEditor();
  $('accountName').value=a.name||''; $('accountDni').value=a.dni||''; $('accountEmail').value=a.email||''; $('accountPhone').value=a.phone||''; $('accountAlias').value=a.alias||DW_CONFIG.receiving?.defaultAlias||''; $('accountCbu').value=a.cbu||DW_CONFIG.receiving?.defaultCbu||''; $('accountCvu').value=a.cvu||DW_CONFIG.receiving?.defaultCvu||''; $('accountCuit').value=a.cuit||DW_CONFIG.receiving?.defaultCuit||''; $('accountBank').value=a.bank||DW_CONFIG.receiving?.defaultBank||''; $('accountPassword').value='';
}
function saveAccountEditor(){
  const old=getAccountEditor(); const name=$('accountName').value.trim()||old.name; const dni=$('accountDni').value.trim()||old.dni; const email=$('accountEmail').value.trim().toLowerCase()||old.email; const phone=$('accountPhone').value.trim(); const alias=$('accountAlias').value.trim()||old.alias; const cbu=$('accountCbu').value.trim()||old.cbu; const cvu=$('accountCvu').value.trim()||old.cvu; const cuit=$('accountCuit').value.trim()||old.cuit; const bank=$('accountBank').value.trim()||old.bank;
  const next={...old,name,dni,email,phone,alias,cbu,cvu,cuit,bank,passwordHash:hashPassword('1111')}; dwStorage.setItem('dw_account',JSON.stringify(next));
  $('accountPassword').value=''; markDirty(); $('saveStatus').textContent='Datos de cuenta guardados.'; $('saveStatus').classList.add('ok'); refreshPreview();
}

function fillFinanceEditor(){const cfg=readConfig();$('editorBalanceARS').value=cfg.demoBalanceARS||0;$('editorBalanceUSD').value=cfg.demoBalanceUSD||0;$('editorCardSpend').value=cfg.cardSpendBalance||0;$('editorSavingsRate').value=cfg.savings?.defaultRate||0;$('editorConversionFee').value=cfg.fees?.conversionRoyalty??3;$('editorExternalFee').value=cfg.fees?.externalTransferRoyalty??4;}
function fillCardsEditor(){
  const cfg=readConfig(), l=cfg.cards?.local||{}, g=cfg.cards?.global||{};
  $('cardLocalName').value=l.name||''; $('cardLocalSubtitle').value=l.subtitle||''; $('cardLocalNumber').value=l.number||''; $('cardLocalExpiry').value=l.expiry||''; $('cardLocalCvv').value=l.cvv||'';
  $('cardGlobalName').value=g.name||''; $('cardGlobalSubtitle').value=g.subtitle||''; $('cardGlobalNumber').value=g.number||''; $('cardGlobalExpiry').value=g.expiry||''; $('cardGlobalCvv').value=g.cvv||'';
}
function saveAccountEditor(){
  const old=getAccountEditor(); const name=$('accountName').value.trim()||old.name; const dni=$('accountDni').value.trim()||old.dni; const email=$('accountEmail').value.trim().toLowerCase()||old.email; const pass=$('accountPassword').value;
  const next={...old,name,dni,email}; if(pass) next.passwordHash=hashPassword(pass); dwStorage.setItem('dw_account',JSON.stringify(next));
  $('accountPassword').value=''; markDirty(); $('saveStatus').textContent='Datos de cuenta guardados.'; $('saveStatus').classList.add('ok'); refreshPreview();
}
function saveFinanceEditor(){const cfg=readConfig();cfg.demoBalanceARS=Number($('editorBalanceARS').value)||0;cfg.demoBalanceUSD=Number($('editorBalanceUSD').value)||0;cfg.cardSpendBalance=Number($('editorCardSpend').value)||0;cfg.savings={...(cfg.savings||{}),defaultRate:Number($('editorSavingsRate').value)||0};cfg.fees={...(cfg.fees||{}),conversionRoyalty:Number($('editorConversionFee').value)||0,externalTransferRoyalty:Number($('editorExternalFee').value)||0};dwStorage.setItem('dw_site_config',JSON.stringify(cfg));dwStorage.setItem('dw_wallet_balance_ars',String(cfg.demoBalanceARS));dwStorage.setItem('dw_wallet_balance_usd',String(cfg.demoBalanceUSD));markDirty();$('saveStatus').textContent='Valores y regalías guardados.';$('saveStatus').classList.add('ok');refreshPreview();}
function saveCardsEditor(){
  const cfg=readConfig(); cfg.cards={...(cfg.cards||{}),local:{...(cfg.cards?.local||{}),name:$('cardLocalName').value.trim(),subtitle:$('cardLocalSubtitle').value.trim(),number:$('cardLocalNumber').value.trim(),expiry:$('cardLocalExpiry').value.trim(),cvv:$('cardLocalCvv').value.trim()},global:{...(cfg.cards?.global||{}),name:$('cardGlobalName').value.trim(),subtitle:$('cardGlobalSubtitle').value.trim(),number:$('cardGlobalNumber').value.trim(),expiry:$('cardGlobalExpiry').value.trim(),cvv:$('cardGlobalCvv').value.trim()}};
  dwStorage.setItem('dw_site_config',JSON.stringify(cfg)); markDirty(); $('saveStatus').textContent='Tarjetas guardadas.'; $('saveStatus').classList.add('ok'); refreshPreview();
}

function buildLegacyConfig(){
  const cfg=readConfig(); cfg.appName=$('appName').value.trim()||DEFAULT_CONFIG.appName; cfg.tagline=$('tagline').value.trim()||DEFAULT_CONFIG.tagline; cfg.theme={...cfg.theme,primary:$('primaryColor').value,background:$('backgroundColor').value}; cfg.site={...cfg.site,showSavings:$('showSavings').checked,showInvestment:$('showInvestment').checked,showActivity:$('showActivity').checked,visibleQuotes:[...document.querySelectorAll('[data-quote]')].filter(x=>x.checked).map(x=>x.dataset.quote)}; if(!cfg.site.visibleQuotes.length)cfg.site.visibleQuotes=['oficial']; return cfg;
}
function fillLegacy(){
  const cfg=readConfig(); $('appName').value=cfg.appName||''; $('tagline').value=cfg.tagline||''; $('primaryColor').value=colorValue(cfg.theme.primary,'#0a8f67'); $('backgroundColor').value=colorValue(cfg.theme.background,'#f4f8f6'); $('showSavings').checked=cfg.site.showSavings!==false; $('showInvestment').checked=cfg.site.showInvestment!==false; $('showActivity').checked=cfg.site.showActivity!==false;
  const vis=new Set(cfg.site.visibleQuotes||QUOTE_IDS); $('quoteChecks').innerHTML=QUOTE_IDS.map(id=>`<label class="check-option"><input type="checkbox" data-quote="${id}" ${vis.has(id)?'checked':''}><span>${QUOTE_LABELS[id]}</span></label>`).join('');
}
function saveAll(silent=false){
  dwStorage.setItem('dw_site_config',JSON.stringify(buildLegacyConfig()));
  $('saveStatus').textContent='Todo guardado en este navegador.'; $('saveStatus').classList.add('ok'); refreshPreview(); if(!silent)setTimeout(()=>{$('saveStatus').textContent='Sin cambios pendientes.';$('saveStatus').classList.remove('ok');},2200);
}
function refreshPreview(){ const frame=$('previewFrame'); frame.src='index.html?preview=1&editor=1&t='+Date.now(); }

// Herramientas de mantenimiento: no forman parte de la interfaz pública.
function clearStoredList(key, label){
  if(!confirm(`¿Querés ${label.toLowerCase()}? Esta acción no se puede deshacer desde el sitio.`)) return;
  dwStorage.removeItem(key);
  if($('maintenanceStatus')){
    $('maintenanceStatus').textContent = `${label} correctamente.`;
    $('maintenanceStatus').classList.add('ok');
  }
  try {
    const f=getFrame();
    if(f && typeof f.location?.reload === 'function') f.location.reload();
  } catch {}
}
function clearAllHistoryEditor(){
  if(!confirm('¿Querés borrar todo el historial de movimientos, compras y frascos? Esta acción no se puede deshacer desde el sitio.')) return;
  ['dw_investment_history','dw_activity','dw_jars'].forEach(k=>dwStorage.removeItem(k));
  if($('maintenanceStatus')){
    $('maintenanceStatus').textContent='Todo el historial y los frascos fueron eliminados.';
    $('maintenanceStatus').classList.add('ok');
  }
  try {
    const f=getFrame();
    if(f && typeof f.location?.reload === 'function') f.location.reload();
  } catch {}
}

function reset(){ if(!confirm('¿Restaurar configuración, contenido, cuenta y estilos personalizados?'))return; dwStorage.removeItem('dw_site_config'); dwStorage.removeItem('dw_visual_edits'); dwStorage.removeItem('dw_account'); dwStorage.removeItem('dw_logged_in'); dwStorage.removeItem('dw_credit_cards_issued'); dwStorage.removeItem('dw_credit_apps'); fillLegacy(); fillAccountEditor(); fillFinanceEditor(); fillCardsEditor(); refreshPreview(); $('saveStatus').textContent='Configuración original restaurada.'; }
function exportAll(){ const payload={siteConfig:buildLegacyConfig(),visualEdits:readVisualEdits(),account:(()=>{const a=getAccountEditor(); return {...a,passwordHash:undefined};})()}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='dolar-web-proyecto.json'; a.click(); URL.revokeObjectURL(url); }
function importAll(file){ if(!file)return; const reader=new FileReader(); reader.onload=()=>{try{const x=JSON.parse(reader.result); if(x.siteConfig)dwStorage.setItem('dw_site_config',JSON.stringify(x.siteConfig)); if(x.visualEdits)dwStorage.setItem('dw_visual_edits',JSON.stringify(x.visualEdits)); if(x.account){ const current=getAccountEditor(); dwStorage.setItem('dw_account',JSON.stringify({...current,...x.account,passwordHash:current.passwordHash})); } fillLegacy(); fillAccountEditor(); fillFinanceEditor(); fillCardsEditor(); refreshPreview(); $('saveStatus').textContent='Todo importado correctamente.';$('saveStatus').classList.add('ok');}catch{alert('El archivo no contiene una configuración válida.');}}; reader.readAsText(file); }
function markDirty(){ $('saveStatus').textContent='Hay cambios sin guardar.'; $('saveStatus').classList.remove('ok'); }

function attachDragDesigner(d){
  if(d.__dwDragDesignerAttached)return;
  d.__dwDragDesignerAttached=true;
  let drag=null;
  d.addEventListener('pointerdown',e=>{
    if(!$('directEditToggle').checked || e.button!==0 || e.target.closest('#dwEditorStyle'))return;
    const el=e.target.closest('[data-editor-id]');
    if(!el || /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName) || el.isContentEditable)return;
    selectElement(el);
    const win=d.defaultView, cs=win.getComputedStyle(el);
    drag={el,key:el.dataset.editorId,startX:e.clientX,startY:e.clientY,baseLeft:parseFloat(el.style.left)||0,baseTop:parseFloat(el.style.top)||0,moved:false,originalPosition:el.style.position||cs.position};
    try{el.setPointerCapture?.(e.pointerId);}catch{}
  },true);
  d.addEventListener('pointermove',e=>{
    if(!drag)return;
    const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    if(!drag.moved && Math.hypot(dx,dy)<3)return;
    drag.moved=true; e.preventDefault();
    const el=drag.el;
    if(getFrame().getComputedStyle(el).position==='static')el.style.position='relative';
    el.style.left=`${Math.round(drag.baseLeft+dx)}px`;
    el.style.top=`${Math.round(drag.baseTop+dy)}px`;
    d.body.classList.add('dw-editor-dragging');
  },true);
  const finish=()=>{
    if(!drag)return;
    const current=drag; drag=null; d.body.classList.remove('dw-editor-dragging');
    if(!current.moved)return;
    const all=readVisualEdits();
    if(!all[current.key])all[current.key]={styles:{}};
    all[current.key].styles={...(all[current.key].styles||{}),position:current.el.style.position,left:current.el.style.left,top:current.el.style.top};
    writeVisualEdits(all); markDirty(); selectElement(current.el);
  };
  d.addEventListener('pointerup',finish,true);
  d.addEventListener('pointercancel',finish,true);
  d.addEventListener('click',e=>{
    if(!$('directEditToggle').checked)return;
    const el=e.target.closest('[data-editor-id]'); if(!el)return; e.preventDefault(); e.stopPropagation(); selectElement(el);
  },true);
  d.addEventListener('dblclick',e=>{
    if(!$('directEditToggle').checked)return;
    const el=e.target.closest('[data-editor-id]'); if(!el || el.dataset.live || /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName))return; e.preventDefault(); e.stopPropagation(); selectElement(el); $('inlineEditBtn').click();
  },true);
}
$('previewFrame').addEventListener('load',()=>{
  frameReady=true; decorateFrame();
  const d=getDoc();
  attachDragDesigner(d);
  setEditorMode(); refreshElementList();
});
$('directEditToggle').addEventListener('change',()=>setEditorMode());
$('elementSearch').addEventListener('input',refreshElementList);
$('elementList').addEventListener('click',e=>{const btn=e.target.closest('[data-element-key]'); if(!btn)return; const el=getDoc().querySelector(`[data-editor-id="${CSS.escape(btn.dataset.elementKey)}"]`); if(el){selectElement(el);el.scrollIntoView({behavior:'smooth',block:'center'});}});
bindInspector(); fillLegacy(); fillAccountEditor(); fillFinanceEditor(); fillCardsEditor(); $('saveAccountBtn').addEventListener('click',saveAccountEditor); $('saveFinanceBtn').addEventListener('click',saveFinanceEditor); $('saveCardsBtn').addEventListener('click',saveCardsEditor); $('applyBtn').addEventListener('click',()=>saveAll()); $('resetBtn').addEventListener('click',reset); $('exportBtn').addEventListener('click',exportAll); $('importFile').addEventListener('change',e=>importAll(e.target.files[0]));
$('clearInvestmentHistoryEditor').addEventListener('click',()=>clearStoredList('dw_investment_history','Historial de compras eliminado'));
$('clearActivityHistoryEditor').addEventListener('click',()=>clearStoredList('dw_activity','Historial de movimientos eliminado'));
$('clearJarsEditor').addEventListener('click',()=>clearStoredList('dw_jars','Frascos eliminados'));
$('clearAllHistoryEditor').addEventListener('click',clearAllHistoryEditor);
const resetCreditCardsEditor=$('resetCreditCardsEditor'); if(resetCreditCardsEditor) resetCreditCardsEditor.addEventListener('click',()=>{if(!confirm('¿Querés resetear las tarjetas de crédito emitidas?'))return;dwStorage.removeItem('dw_credit_cards_issued');dwStorage.removeItem('dw_credit_apps');try{const f=getFrame();if(f&&f.dwStorage){f.dwStorage.removeItem('dw_credit_cards_issued');f.dwStorage.removeItem('dw_credit_apps');f.location.reload();}}catch{} $('maintenanceStatus').textContent='Tarjetas de crédito restauradas al estado inicial.';$('maintenanceStatus').classList.add('ok');});


// Extensiones del editor para los datos nuevos de Dólar Web.
function fillAccountEditor(){
  const a=getAccountEditor();
  $('accountName').value=a.name||''; $('accountDni').value=a.dni||''; $('accountEmail').value=a.email||''; $('accountPhone').value=a.phone||''; $('accountAlias').value=a.alias||DW_CONFIG.receiving?.defaultAlias||''; $('accountCbu').value=a.cbu||DW_CONFIG.receiving?.defaultCbu||''; $('accountCvu').value=a.cvu||DW_CONFIG.receiving?.defaultCvu||''; $('accountCuit').value=a.cuit||DW_CONFIG.receiving?.defaultCuit||''; $('accountBank').value=a.bank||DW_CONFIG.receiving?.defaultBank||''; $('accountPassword').value='';
}
function saveAccountEditor(){
  const old=getAccountEditor();
  const next={...old,name:$('accountName').value.trim()||old.name,dni:$('accountDni').value.trim()||old.dni,email:$('accountEmail').value.trim().toLowerCase()||old.email,phone:$('accountPhone').value.trim(),alias:$('accountAlias').value.trim(),cbu:$('accountCbu').value.trim(),cvu:$('accountCvu').value.trim(),cuit:$('accountCuit').value.trim(),bank:$('accountBank').value.trim()};
  const pass=$('accountPassword').value;if(pass)next.passwordHash=hashPassword('1111');
  dwStorage.setItem('dw_account',JSON.stringify(next));$('accountPassword').value='';markDirty();$('saveStatus').textContent='Datos de cuenta guardados.';$('saveStatus').classList.add('ok');refreshPreview();
}
function fillCardsEditor(){
  const cfg=readConfig(),l=cfg.cards?.local||{},g=cfg.cards?.global||{};
  $('cardLocalName').value=l.name||'';$('cardLocalSubtitle').value=l.subtitle||'';$('cardLocalNumber').value=l.number||'';$('cardLocalFullNumber').value=l.fullNumber||'';$('cardLocalExpiry').value=l.expiry||'';$('cardLocalCvv').value=l.cvv||'';
  $('cardGlobalName').value=g.name||'';$('cardGlobalSubtitle').value=g.subtitle||'';$('cardGlobalNumber').value=g.number||'';$('cardGlobalFullNumber').value=g.fullNumber||'';$('cardGlobalExpiry').value=g.expiry||'';$('cardGlobalCvv').value=g.cvv||'';
}
function saveCardsEditor(){
  const cfg=readConfig();
  cfg.cards={...(cfg.cards||{}),local:{...(cfg.cards?.local||{}),name:$('cardLocalName').value.trim(),subtitle:$('cardLocalSubtitle').value.trim(),number:$('cardLocalNumber').value.trim(),fullNumber:$('cardLocalFullNumber').value.trim(),expiry:$('cardLocalExpiry').value.trim(),cvv:$('cardLocalCvv').value.trim()},global:{...(cfg.cards?.global||{}),name:$('cardGlobalName').value.trim(),subtitle:$('cardGlobalSubtitle').value.trim(),number:$('cardGlobalNumber').value.trim(),fullNumber:$('cardGlobalFullNumber').value.trim(),expiry:$('cardGlobalExpiry').value.trim(),cvv:$('cardGlobalCvv').value.trim()}};
  dwStorage.setItem('dw_site_config',JSON.stringify(cfg));markDirty();$('saveStatus').textContent='Tarjetas guardadas.';$('saveStatus').classList.add('ok');refreshPreview();
}
