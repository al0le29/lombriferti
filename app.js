const $ = s => document.querySelector(s);
/* Modo invitado: sin sesion se puede ver el catalogo y usar favoritos. Para carrito, compras y perfil se pide iniciar sesion. */
const sess = JSON.parse(localStorage.getItem('lf_session') || 'null');
const guest = !sess;
const user = sess || { name: 'Invitado', email: 'guest', role: 'Cliente', sid: null };
if (!guest && !user.sid) { user.sid = addSession(user.email); localStorage.setItem('lf_session', JSON.stringify(user)); }

/* ---------- datos (localStorage) ---------- */
const KEY = 'lf_products', ORDK = 'lf_orders';
const TIPOS = ['Lombriferti (fertilizante)', 'Composta tradicional', 'Humus de lombriz'];
const seed = [
  { lote: 'LF-2025-001', kg: 50, stock: 12, fecha: '2025-09-21', tipo: 'Lombriferti (fertilizante)', desc: 'Fertilizante orgánico a base de composta.', precio: 120 },
  { lote: 'LF-2025-002', kg: 50, stock: 8, fecha: '2025-09-21', tipo: 'Lombriferti (fertilizante)', desc: '', precio: 120 },
  { lote: 'LF-2025-003', kg: 40, stock: 0, fecha: '2025-09-22', tipo: 'Lombriferti (fertilizante)', desc: '', precio: 125 },
  { lote: 'LF-2025-004', kg: 30, stock: 0, fecha: '2025-09-22', tipo: 'Lombriferti (fertilizante)', desc: '', precio: 115 },
  { lote: 'LF-2025-005', kg: 5, stock: 24, fecha: '2025-09-23', tipo: 'Humus de lombriz', desc: 'Humus puro de lombriz, ideal para macetas y almácigos.', precio: 85 },
  { lote: 'LF-2025-006', kg: 10, stock: 18, fecha: '2025-09-24', tipo: 'Composta tradicional', desc: 'Composta madura de residuos de cocina y jardín.', precio: 70 },
  { lote: 'LF-2025-007', kg: 25, stock: 6, fecha: '2025-09-25', tipo: 'Lombriferti (fertilizante)', desc: 'Presentación grande para huertos y jardines.', precio: 210 },
  { lote: 'LF-2025-008', kg: 20, stock: 3, fecha: '2025-09-26', tipo: 'Humus de lombriz', desc: 'Humus de lombriz en saco, para cultivos y hortalizas.', precio: 260 },
  { lote: 'LF-2025-009', kg: 25, stock: 0, fecha: '2025-09-27', tipo: 'Composta tradicional', desc: 'Composta en saco para mejorar la tierra.', precio: 140 },
];
const save = d => localStorage.setItem(KEY, JSON.stringify(d));
function load() {
  let d = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (!d) { d = seed.map(x => ({ ...x })); save(d); localStorage.setItem('lf_data_v', '2'); return d; }
  if (localStorage.getItem('lf_data_v') !== '2') {            // migracion desde la version de 1 pieza por lote
    const ord = JSON.parse(localStorage.getItem(ORDK) || '[]');
    d.forEach(p => {
      if (p.stock === undefined) p.stock = p.vendido ? 0 : 10;
      if (p.vendido) ord.push({ id: 'M' + p.lote, email: p.comprador || '', name: p.comprador ? '' : 'Venta directa', fecha: p.fechaVenta || p.fecha, items: [{ lote: p.lote, qty: 1, precio: p.precio, tipo: p.tipo, kg: p.kg }], total: p.precio });
      delete p.vendido; delete p.comprador; delete p.fechaVenta;
    });
    seed.forEach(x => { if (!d.some(p => p.lote === x.lote)) d.push({ ...x }); });
    localStorage.setItem(ORDK, JSON.stringify(ord)); save(d); localStorage.setItem('lf_data_v', '2');
  }
  return d;
}
const orders = () => JSON.parse(localStorage.getItem(ORDK) || '[]');
function addOrder(o) { const l = orders(), n = { id: 'P' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), fecha: todayISO(), ...o }; n.hist = { pendiente: n.fecha, ...(o.hist || {}) }; l.push(n); localStorage.setItem(ORDK, JSON.stringify(l)); return n; }
const snap = (p, q) => ({ lote: p.lote, qty: q, precio: p.precio, tipo: p.tipo, kg: p.kg });
const live = o => o.estado !== 'cancelado';   // pedidos que cuentan para inventario y QR
const soldMap = () => { const m = {}; orders().filter(live).forEach(o => o.items.forEach(i => { m[i.lote] = (m[i.lote] || 0) + i.qty; })); return m; };
/* Envio: costo segun el peso total del pedido; gratis al llegar al monto indicado. Ajusta estos valores a tus tarifas reales. */
const ENVIO = { gratisDesde: 1000, tramos: [[10, 60], [30, 120], [60, 200], [Infinity, 300]] };   // [hasta X kg, costo en MXN]
const shipCost = (lines, sub) => sub >= ENVIO.gratisDesde ? 0 : ENVIO.tramos.find(t => lines.reduce((a, l) => a + l.q * l.p.kg, 0) <= t[0])[1];
const money = n => '$' + n.toLocaleString('es-MX') + ' MXN';
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/* El cliente ve productos por nombre y presentacion, no por lote. Los lotes con las mismas caracteristicas (tipo, kg, precio) se muestran como un solo producto y se surten del mas antiguo al mas nuevo. */
const pname = p => `${p.tipo} · ${p.kg} kg`;
function groups() {
  const m = new Map();
  load().forEach(p => { const k = gk(p); if (!m.has(k)) m.set(k, []); m.get(k).push(p); });
  return [...m.values()].map(ls => {
    ls.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.lote.localeCompare(b.lote));
    const f = ls.find(p => p.stock > 0) || ls[0];
    return { tipo: f.tipo, kg: f.kg, precio: f.precio, desc: ls.map(p => p.desc).find(Boolean) || '', fecha: ls[ls.length - 1].fecha, foto: ls.map(p => p.foto).find(Boolean) || '', lotes: ls, lote: f.lote, stock: ls.reduce((a, p) => a + p.stock, 0) };
  });
}
const gk = p => `${p.tipo}|${p.kg}|${p.precio}`;
/* junta renglones del mismo producto (aunque vengan de lotes distintos) sumando su cantidad */
function mergeBy(list, qty, setQty) { const m = new Map(); list.forEach(x => { const k = gk(x.p || x) + '|' + (x.oid || ''); if (!m.has(k)) m.set(k, { ...x }); else setQty(m.get(k), qty(m.get(k)) + qty(x)); }); return [...m.values()]; }
const mergeLines = l => mergeBy(l, x => x.q, (x, v) => { x.q = v; });          // [{ p, q }]
const mergeItems = l => mergeBy(l, x => x.qty, (x, v) => { x.qty = v; });      // [{ tipo, kg, precio, qty, ... }]
function setGroupQty(g, q) { g.lotes.forEach(p => setQty(p.lote, 0)); if (q > 0) addGroup(g, q); }
const cartGroups = () => groups().map(g => ({ g, q: Math.min(g.lotes.reduce((a, p) => a + cartQty(p.lote), 0), g.stock) })).filter(x => x.q > 0);
const groupOf = l => groups().find(g => g.lotes.some(p => p.lote === l));
const rateG = g => { const r = reviews().filter(v => g.lotes.some(p => p.lote === v.lote)); return { n: r.length, avg: r.length ? r.reduce((a, v) => a + v.stars, 0) / r.length : 0 }; };
function addGroup(g, n) {
  let left = n;
  for (const l of g.lotes) {
    const p = load().find(x => x.lote === l.lote); if (!p) continue;
    const take = Math.min(left, p.stock - cartQty(p.lote)); if (take > 0) { setQty(p.lote, cartQty(p.lote) + take); left -= take; }
  }
  return n - left;
}
const ico = t => /Humus/.test(t) ? '🪱' : /Composta/.test(t) ? '🍂' : '🌿';
const stateTag = x => x.stock <= 0 ? '<span class="tag v">Agotado</span>' : x.stock <= 3 ? '<span class="tag w">Pocas unidades</span>' : '<span class="tag d">Disponible</span>';

const isClient = user.role === 'Cliente';
const NK = 'lf_notifs';
const notifs = () => JSON.parse(localStorage.getItem(NK) || '[]');
const notify = (para, texto) => { const n = notifs(); n.unshift({ para, texto, fecha: new Date().toISOString(), leida: false }); localStorage.setItem(NK, JSON.stringify(n)); };
const mine = () => prefs().app ? notifs().filter(n => n.para === (isClient ? user.email : 'admin')) : [];
function badge() { const c = mine().filter(n => !n.leida).length; $('#badge').textContent = c; $('#badge').hidden = !c; }

const PK = 'lf_prefs_' + user.email;
const prefs = () => ({ email: true, app: true, reminders: true, ...JSON.parse(localStorage.getItem(PK) || '{}') });
const LK = 'lf_links_' + user.email;
const links = () => JSON.parse(localStorage.getItem(LK) || '{}');
const FK = 'lf_favs_' + user.email;
const favs = () => JSON.parse(localStorage.getItem(FK) || '[]');
function toggleFav(g) {
  const f = favs(), on = f.some(l => g.lotes.some(p => p.lote === l));
  localStorage.setItem(FK, JSON.stringify(on ? f.filter(l => !g.lotes.some(p => p.lote === l)) : [...f, g.lote]));
  toast(on ? 'Quitado de favoritos' : 'Agregado a favoritos');
}
const RK = 'lf_reviews';
const reviews = () => JSON.parse(localStorage.getItem(RK) || '[]');
const TIPS = ['Alterna capas de residuos verdes (frutas, verduras) y secos (hojas, cartón) en tu composta.', 'Mantén la composta húmeda como una esponja exprimida, sin encharcarla.', 'Evita echar carne, lácteos o grasas: atraen plagas y huelen mal.', 'Voltea tu composta cada semana para que le llegue oxígeno.', 'A las lombrices les gustan los restos picados en trozos pequeños.', 'Un poco de cáscara de huevo triturada ayuda a equilibrar la acidez.'];
function sendReminder() {
  const i = +(localStorage.getItem('lf_tip_i_' + user.email) || 0);
  notify(isClient ? user.email : 'admin', '🌱 Tip: ' + TIPS[i % TIPS.length]);
  localStorage.setItem('lf_tip_i_' + user.email, i + 1);
  localStorage.setItem('lf_tip_at_' + user.email, Date.now());
}
/* Un tip cada TIP_MIN minutos mientras la pagina este abierta (y al entrar, si ya paso ese tiempo). Una pagina web no puede avisar con el sitio cerrado sin un servidor de notificaciones push. */
const TIP_MIN = 10;
function checkReminder() {
  if (prefs().reminders && Date.now() - +(localStorage.getItem('lf_tip_at_' + user.email) || 0) > TIP_MIN * 60000) { sendReminder(); return true; }
}
/* ---- direccion de entrega (una por cuenta, guardada en este navegador) ---- */
const userPhone = () => user.phone || (JSON.parse(localStorage.getItem('lf_users') || '[]').find(u => u.email === user.email) || {}).phone || '';
const AK = 'lf_addr_' + user.email;
const ADK = 'lf_addrs_' + user.email;   // varias direcciones por cuenta; una es la predeterminada
const addrs = () => { let l = JSON.parse(localStorage.getItem(ADK) || 'null'); if (!l) { const old = JSON.parse(localStorage.getItem(AK) || 'null'); l = old ? [{ ...old, id: 'a1', pred: true }] : []; } return l; };
const saveAddrs = l => { localStorage.setItem(ADK, JSON.stringify(l)); localStorage.removeItem(AK); };
const addr = () => { const l = addrs(); return l.find(a => a.pred) || l[0] || null; };
let adEdit = null, lotEdit = null;
const addrTxt = a => `${a.calle}, ${a.colonia}, ${a.ciudad}, ${a.estado}, C.P. ${a.cp}`;
const ESTADOS = ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'];
const PENDK = 'lf_pending_add';
function requireLogin(text = 'Para agregar productos al carrito y comprar necesitas una cuenta.') {
  return askDialog({ icon: '🔒', title: 'Inicia sesión para continuar', text, ok: 'Iniciar sesión', cancel: 'Ahora no' })
    .then(ok => { if (ok) location.href = 'login.html'; return ok; });
}
function logoutNow() { localStorage.removeItem('lf_session'); location.replace('index.html'); }
const back = () => guest ? '<p><a href="#/tienda">← Volver al catálogo</a></p>' : '<p><a href="#/config">← Volver al perfil</a></p>';
const swRow = (k, t, d, on) => `<label class="switch"><span><b>${t}</b><small>${d}</small></span><input type="checkbox" role="switch" data-pref="${k}"${on ? ' checked' : ''}></label>`;

/* ---------- utilidades ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = iso => iso.split('-').reverse().join('/');
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');   // fecha local (no UTC)
const todayISO = () => ymd(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const isLocalHost = () => location.protocol === 'file:' || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
const firstSale = l => orders().filter(live).filter(o => o.items.some(i => i.lote === l)).map(o => o.fecha).sort()[0];   // fecha real de la primera venta del lote
/* Etapas del lote: produccion y venta son fechas reales; transporte y distribucion son estimadas y nunca pasan de la venta. */
const etapas = (f, v, o) => [...(o ? [['♻️', 'Recepción de residuos', o]] : []), ['🌱', 'Producción', f], ['🧑‍🌾', 'Primera venta', v || null]];   // solo fechas reales
function toast(t) { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.append(e); setTimeout(() => e.remove(), 2200); }
function askDialog({ icon = '🛒', title, text = '', html = '', ok = 'Aceptar', cancel = 'Cancelar', danger = false, select = null, qtyMax = null }) {
  return new Promise(res => {
    const prev = document.activeElement, o = document.createElement('div');
    o.className = 'modal-bg';
    o.innerHTML = `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="mdt" aria-describedby="mdx"><div class="modal-ic">${icon}</div><h2 id="mdt">${esc(title)}</h2><p id="mdx">${esc(text)}</p>${html}${select ? `<select id="msel" aria-label="Lote">${select.map(v => { const o = typeof v === 'object' ? v : { v, t: v }; return `<option value="${esc(o.v)}">${esc(o.t)}</option>`; }).join('')}</select>${qtyMax ? `<label style="margin-top:-4px">Cantidad${stepper('x', 1, 1)}</label>` : ''}` : ''}<div class="actions"><button class="btn ghost" type="button">${esc(cancel)}</button><button class="btn${danger ? ' danger' : ''}" type="button">${esc(ok)}</button></div></div>`;
    const [bc, bo] = o.querySelectorAll('.actions button');
    function close(v) { document.removeEventListener('keydown', key, true); o.remove(); if (prev && prev.focus) prev.focus(); res(v); }
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      else if (e.key === 'Tab') {
        const f = [...o.querySelectorAll('button, select, input')].filter(x => !x.disabled && x.offsetParent), i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    }
    document.addEventListener('keydown', key, true);
    o.onclick = e => { if (e.target === o) close(false); };
    bc.onclick = () => close(false);
    bo.onclick = () => close(select ? { value: o.querySelector('#msel').value, qty: +((o.querySelector('.qty input') || {}).value || 1) } : true);
    document.body.append(o);
    if (select) enhanceSelect(o.querySelector('#msel'));
    if (select && qtyMax) {
      const inp = o.querySelector('.qty input'), sel = o.querySelector('#msel');
      bindQty(o);
      const upd = () => { inp.max = qtyMax[sel.value] || 1; inp.dispatchEvent(new Event('change')); };
      sel.onchange = upd; upd();
    }
    (danger ? bc : select ? o.querySelector('.dd-btn') : bo).focus();
  });
}
function qr(el, text, size = 110) {
  el.innerHTML = '';
  if (!window.QRCode) return void (el.textContent = '(QR no disponible sin internet)');
  new QRCode(el, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.L });
  if (/^https?:|^file:/.test(text)) { const a = document.createElement('a'); a.href = text; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Abrir en otra pestaña'; a.style.cssText = 'display:block;font-size:12px;margin-top:6px'; el.append(a); }
}
/* El QR lleva a verificar.html con los datos del lote dentro del enlace, asi abre en el navegador del celular sin necesitar cuenta ni servidor. */
async function traceUrl(p, venta, oid) {
  const h = (await loteHash(p, venta)).slice(0, 12);
  const u = new URL('verificar.html', location.href); u.hash = '';
  u.search = new URLSearchParams({ l: p.lote, t: p.tipo, k: p.kg, f: p.fecha, h, ...(p.origen ? { o: p.origen } : {}), ...(venta ? { v: venta } : {}), ...(oid ? { p: oid } : {}) }).toString();
  return u.href;
}

const myItems = () => orders().filter(o => o.email === user.email).flatMap(o => o.items.map(i => ({ ...i, fecha: o.fecha, pago: o.pago, num: o.num, oid: o.id, estado: o.estado || 'entregado', hist: o.hist })));
const boughtLots = () => [...new Set(myItems().filter(i => i.estado !== 'cancelado').map(i => i.lote))];
const rate = l => { const r = reviews().filter(v => v.lote === l); return { n: r.length, avg: r.length ? r.reduce((a, v) => a + v.stars, 0) / r.length : 0 }; };
function stockAlert(p) {
  if (p.stock <= 0) notify('admin', `Se agotó el lote ${p.lote}.`);
  else if (p.stock <= 3) notify('admin', `Quedan ${p.stock} unidades del lote ${p.lote}.`);
}

/* ---- Asistente experto: recomienda producto y dosis orientativa segun la planta (reglas locales, sin servidor) ---- */
const PLANTAS = [
  { n: 'Tomate o jitomate', kw: ['tomate', 'jitomate'], tipo: 'Lombriferti (fertilizante)', por: 'Es una planta que da mucho fruto y necesita nutrientes constantes.', maceta: '2 cucharadas soperas mezcladas con el sustrato de una maceta de 20 litros.', huerto: 'Unos 250 g por planta al trasplantar.', freq: 'Repite cada 3 a 4 semanas, y al salir las primeras flores.', tip: 'Riega en la base y evita mojar las hojas.' },
  { n: 'Chile o pimiento', kw: ['chile', 'pimiento', 'morron', 'jalapeno', 'serrano', 'habanero'], tipo: 'Lombriferti (fertilizante)', por: 'Responde bien a un abono completo durante la floración y la fruta.', maceta: '2 cucharadas soperas por maceta de 15 a 20 litros.', huerto: 'Unos 200 g por planta al trasplantar.', freq: 'Cada 3 a 4 semanas.', tip: 'No dejes que el sustrato se seque por completo.' },
  { n: 'Calabaza, calabacita, pepino o melón', kw: ['calabaza', 'calabacita', 'pepino', 'melon', 'sandia', 'chayote'], tipo: 'Lombriferti (fertilizante)', por: 'Son plantas muy demandantes que crecen rápido.', maceta: 'Necesitan maceta grande (40 L o más): 3 cucharadas soperas mezcladas.', huerto: 'Unos 300 g por planta, en el hoyo de siembra.', freq: 'Cada 3 semanas durante la floración.', tip: 'Acolcha con paja para conservar la humedad.' },
  { n: 'Maíz', kw: ['maiz', 'elote'], tipo: 'Composta tradicional', por: 'Mejora el suelo y aporta nutrientes de forma pareja antes de sembrar.', maceta: 'Mejor siémbralo en tierra; si es en maceta, usa una de 40 L o más con 1 puño de composta.', huerto: 'De 2 a 3 kg por metro cuadrado, mezclados antes de sembrar.', freq: 'Una aplicación al preparar la tierra y otra a media altura.', tip: 'Siémbralo en bloques y no en una sola hilera para que polinice mejor.' },
  { n: 'Frijol, ejote o chícharo', kw: ['frijol', 'ejote', 'chicharo', 'haba', 'lenteja', 'garbanzo'], tipo: 'Humus de lombriz', por: 'Las leguminosas fijan su propio nitrógeno; basta un abono suave.', maceta: '1 cucharada sopera por maceta mediana, mezclada con el sustrato.', huerto: 'Alrededor de 1 kg por metro cuadrado al preparar el suelo.', freq: 'Una sola vez al sembrar.', tip: 'Evita el exceso de abono: da muchas hojas y pocas vainas.' },
  { n: 'Hortalizas de hoja (lechuga, espinaca, acelga, col)', kw: ['lechuga', 'espinaca', 'acelga', 'col ', 'repollo', 'kale', 'cilantro', 'perejil', 'hoja'], tipo: 'Humus de lombriz', por: 'Aporta nutrientes suaves que favorecen hojas tiernas.', maceta: '1 cucharada sopera por maceta mediana, mezclada.', huerto: 'De 1 a 1.5 kg por metro cuadrado antes de sembrar.', freq: 'Refuerza cada 3 semanas con un puñado pequeño.', tip: 'Riega seguido pero poco: las raíces son superficiales.' },
  { n: 'Cebolla, ajo, zanahoria o rábano', kw: ['cebolla', 'ajo', 'zanahoria', 'rabano', 'betabel', 'papa'], tipo: 'Composta tradicional', por: 'La composta madura suelta la tierra y no fuerza las raíces.', maceta: 'Una capa de 2 cm de composta mezclada en los primeros 15 cm de sustrato.', huerto: 'De 2 kg por metro cuadrado, bien incorporados antes de sembrar.', freq: 'Una sola aplicación al preparar la cama.', tip: 'No uses abono fresco: deforma las raíces.' },
  { n: 'Fresa', kw: ['fresa', 'frutilla'], tipo: 'Humus de lombriz', por: 'Prefiere un abono suave y húmedo, rico en materia orgánica.', maceta: '1 cucharada sopera por planta, mezclada con el sustrato.', huerto: 'Alrededor de 1 kg por metro cuadrado al plantar.', freq: 'Refuerza cada 4 semanas en temporada.', tip: 'Evita mojar el fruto para prevenir hongos.' },
  { n: 'Flores y plantas de ornato', kw: ['flor', 'flores', 'rosa', 'rosal', 'geranio', 'petunia', 'ornato', 'ornamental', 'buganvilia', 'jardin'], tipo: 'Humus de lombriz', por: 'Estimula una floración abundante sin quemar las raíces.', maceta: '1 a 2 cucharadas soperas por maceta mediana, mezcladas.', huerto: 'Un puñado grande (unos 150 g) alrededor de cada planta.', freq: 'Cada 4 semanas durante la floración.', tip: 'Retira las flores marchitas para que florezca más.' },
  { n: 'Plantas de interior y helechos', kw: ['interior', 'helecho', 'pothos', 'potos', 'monstera', 'costilla', 'sala', 'planta de casa'], tipo: 'Humus de lombriz', por: 'Es un abono limpio, sin mal olor y suave para espacios cerrados.', maceta: '1 cucharada sopera por maceta mediana, esparcida arriba o mezclada.', huerto: 'Si las pasas a jardín: 1 puño por planta.', freq: 'Cada 4 a 6 semanas.', tip: 'Revisa que la maceta tenga drenaje.' },
  { n: 'Suculentas y cactus', kw: ['suculenta', 'cactus', 'cacto', 'echeveria', 'agave', 'sabila', 'aloe'], tipo: 'Humus de lombriz', por: 'Necesitan muy poco abono; mejor poco que mucho.', maceta: 'Máximo 10 a 15% de humus mezclado con arena o tezontle.', huerto: 'Un puñado pequeño al plantar.', freq: 'Una o dos veces al año.', tip: 'El exceso de agua daña más que la falta de abono.' },
  { n: 'Hierbas aromáticas', kw: ['albahaca', 'menta', 'hierbabuena', 'romero', 'oregano', 'tomillo', 'lavanda', 'epazote', 'aromatica', 'hierba'], tipo: 'Humus de lombriz', por: 'Mantiene el sabor y el aroma sin forzar el crecimiento.', maceta: '1 cucharada sopera por maceta, mezclada.', huerto: 'Medio kilo por metro cuadrado al preparar la cama.', freq: 'Cada 4 a 6 semanas.', tip: 'Poda seguido las puntas para que ramifique.' },
  { n: 'Árboles frutales (limón, aguacate, mango, etc.)', kw: ['arbol', 'frutal', 'limon', 'naranja', 'aguacate', 'mango', 'guayaba', 'manzana', 'durazno'], tipo: 'Lombriferti (fertilizante)', por: 'Necesitan aporte constante de nutrientes durante el año.', maceta: 'En maceta grande: 1 taza (unos 200 g) esparcida y mezclada en la superficie.', huerto: 'De 3 a 5 kg por árbol joven y de 8 a 10 kg por árbol adulto, alrededor de la copa.', freq: 'Dos veces al año: al inicio de la época de lluvias y antes de la floración.', tip: 'Aplícalo en el borde de la copa, no pegado al tronco.' },
  { n: 'Césped o pasto', kw: ['cesped', 'pasto', 'zacate', 'grass'], tipo: 'Composta tradicional', por: 'Mejora la tierra y alimenta el césped poco a poco.', maceta: 'No aplica en maceta.', huerto: 'Una capa fina de medio centímetro (unos 2 a 3 kg por metro cuadrado), esparcida y regada.', freq: 'Dos veces al año.', tip: 'Cortar el pasto antes de aplicar ayuda a que la composta llegue al suelo.' },
];
const asistente = {
  lugar: 'huerto',
  buscar(t) { const q = ' ' + norm(t) + ' '; return PLANTAS.find(p => p.kw.some(k => q.includes(norm(k)))); },
  respuesta(p) {
    const dosis = this.lugar === 'maceta' ? p.maceta : p.huerto;
    return `<b>${esc(p.n)}</b> · ${this.lugar === 'maceta' ? 'en maceta' : 'en huerto o jardín'}
      <p style="margin:6px 0 10px">${esc(p.por)}</p>
      <dl class="receipt"><div><dt>Te recomiendo</dt><dd>${ico(p.tipo)} ${esc(p.tipo)}</dd></div><div><dt>Cantidad orientativa</dt><dd>${esc(dosis)}</dd></div><div><dt>Cada cuánto</dt><dd>${esc(p.freq)}</dd></div></dl>
      <p style="margin:0 0 10px">💡 ${esc(p.tip)}</p>
      <p class="mut" style="font-size:12px;margin:0 0 10px">Las cantidades son orientativas. Ajusta según la etiqueta del lote y el estado de tu suelo.</p>
      <button type="button" class="btn sm" data-cat="${esc(p.tipo)}">Ver ${esc(p.tipo)} en el catálogo</button>`;
  },
};

function clientHome() {
  const all = load(), mi = myItems().filter(i => i.estado !== 'cancelado');
  if (guest) return `<h1>¡Bienvenido a Lombriferti!</h1><p class="sub">Explora el catálogo y guarda tus favoritos. Inicia sesión solo cuando quieras comprar.</p>
  <div class="stats"><div class="stat"><div class="e">🛍️</div><b>${groups().filter(g => g.stock > 0).length}</b><span>Productos disponibles</span></div></div>
  <div class="panel asist"><h2>Asistente Experto 🌿</h2><p>¿No sabes qué tipo de abono o humus necesita tu cultivo? Dinos qué planta tienes y te recomendaremos el producto y una cantidad orientativa.</p><a class="btn" href="#/asistente">Consultar al Asistente</a></div>
  <div class="banner">Cada compra convierte residuos orgánicos en vida para tu huerto 🌱<p><a class="btn" href="#/tienda">Ir al catálogo</a> <a class="btn ghost" href="login.html">Iniciar sesión</a></p></div>`;
  return `<h1>¡Hola, ${esc(user.name)}!</h1><p class="sub">Compra fertilizante orgánico y verifica de dónde viene.</p>${tienda.bannerHtml()}
  <div class="stats">
    <div class="stat"><div class="e">🛍️</div><b>${groups().filter(g => g.stock > 0).length}</b><span>Productos disponibles</span></div>
    <div class="stat"><div class="e">📦</div><b>${mi.reduce((a, i) => a + i.qty, 0)}</b><span>Unidades compradas</span></div>
    <div class="stat"><div class="e">♻️</div><b>${mi.reduce((a, i) => a + i.qty * i.kg, 0)} kg</b><span>Fertilizante comprado</span></div>
  </div>
  <div class="panel asist"><h2>Asistente Experto 🌿</h2><p>¿No sabes qué tipo de abono o humus necesita tu cultivo? Dinos qué planta tienes y te recomendaremos el producto y una cantidad orientativa.</p><a class="btn" href="#/asistente">Consultar al Asistente</a></div>
  <div class="banner">Cada compra convierte residuos orgánicos en vida para tu huerto 🌱<p><a class="btn" href="#/tienda">Ir al catálogo</a></p></div>`;
}

/* ---- carrito: [{ lote, qty }] ---- */
const CK = 'lf_cart_' + user.email;
const cart = () => JSON.parse(localStorage.getItem(CK) || '[]').map(c => typeof c === 'string' ? { lote: c, qty: 1 } : c);
const cartQty = l => (cart().find(c => c.lote === l) || { qty: 0 }).qty;
function cartBadge() { const b = $('#cartBadge'); if (!b) return; const n = cart().reduce((a, c) => a + c.qty, 0); b.textContent = n; b.hidden = !n; }
const saveCart = c => { localStorage.setItem(CK, JSON.stringify(c)); cartBadge(); };
function setQty(l, q) {
  const c = cart(), i = c.findIndex(x => x.lote === l);
  if (q <= 0) { if (i >= 0) c.splice(i, 1); } else if (i >= 0) c[i].qty = q; else c.push({ lote: l, qty: q });
  saveCart(c);
}

/* ---- selector de cantidad  − 1 +  ---- */
const stepper = (l, v, max) => `<div class="qty" data-qty="${esc(l)}"><button type="button" data-d="-1" aria-label="Disminuir cantidad">−</button><input type="number" inputmode="numeric" min="1" max="${max}" value="${v}" aria-label="Cantidad"><button type="button" data-d="1" aria-label="Aumentar cantidad">+</button></div>`;
function bindQty(scope, cb) {
  scope.querySelectorAll('.qty').forEach(q => {
    const inp = q.querySelector('input'), dn = q.querySelector('[data-d="-1"]'), up = q.querySelector('[data-d="1"]');
    let last = +inp.value;
    const sync = () => { dn.disabled = +inp.value <= +inp.min; up.disabled = +inp.value >= +inp.max; };
    const set = v => {
      v = Math.max(+inp.min, Math.min(+inp.max, Math.round(+v) || +inp.min));
      inp.value = v; sync();
      if (v !== last) { last = v; if (cb) cb(q.dataset.qty, v); }
    };
    dn.onclick = () => set(+inp.value - 1); up.onclick = () => set(+inp.value + 1);
    inp.onchange = () => set(inp.value);
    sync();
  });
}

/* ---- tarjeta de producto (catalogo y favoritos) ---- */
/* Botones de compra de una tarjeta (cantidad + agregar, o avisar si esta agotado) */
function cardAct(x) {
  const inCart = x.lotes.reduce((a, p) => a + cartQty(p.lote), 0), avail = x.stock - inCart;
  return x.stock <= 0 ? (tienda.cardWatch(x) ? `<button class="btn ghost" data-watch="${esc(x.lote)}">✓ Te avisaremos</button>` : `<button class="btn ghost" data-watch="${esc(x.lote)}">🔔 Avísame cuando haya</button>`)
    : avail <= 0 ? '<button class="btn ghost" disabled>Todo en tu carrito ✓</button>'
    : `<div class="addrow">${stepper(x.lote, 1, avail)}<button class="btn" data-add="${esc(x.lote)}">Agregar</button></div>`;
}
function productCard(x) {
  const inCart = x.lotes.reduce((a, p) => a + cartQty(p.lote), 0), f = favs().some(l => x.lotes.some(p => p.lote === l)), r = rateG(x);
  const stockTxt = x.stock <= 0 ? '<span class="tag v">Agotado</span>' : x.stock <= 3 ? `<span class="tag w">¡Últimas ${x.stock}!</span>` : `<span class="mut">${x.stock} disponibles</span>`;
  const href = '#/producto?l=' + encodeURIComponent(x.lote);
  return `<div class="card"><button class="fav${f ? ' on' : ''}" data-fav="${esc(x.lote)}" aria-pressed="${f}" aria-label="${f ? 'Quitar de favoritos' : 'Guardar en favoritos'}">${f ? '♥' : '♡'}</button><a class="card-link" href="${href}">${/^data:image\//.test(x.foto || '') ? `<img class="ph" src="${x.foto}" alt="${esc(pname(x))}">` : `<div class="e">${ico(x.tipo)}</div>`}<b>${esc(pname(x))}</b></a>${r.n ? `<small class="rate">★ ${r.avg.toFixed(1)} (${r.n})</small>` : ''}<p>${esc(x.desc || 'Fertilizante orgánico de composta y lombrices.')}</p><div class="price">${money(x.precio)}</div><div>${stockTxt}${inCart ? ` <span class="mut">· ${inCart} en tu carrito</span>` : ''}</div>${cardAct(x)}<a class="mut card-more" href="${href}">Ver detalles y opiniones →</a></div>`;
}
function bindCards(scope, redraw) {
  bindQty(scope);
  scope.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => { toggleFav(groupOf(b.dataset.fav)); redraw(); });
  scope.querySelectorAll('[data-watch]').forEach(b => b.onclick = () => { tienda.toggleWatch(b.dataset.watch); redraw(); });
  scope.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
    const n = +b.closest('.card').querySelector('.qty input').value;
    if (guest) { localStorage.setItem(PENDK, JSON.stringify({ lote: b.dataset.add, qty: n })); return requireLogin(); }
    const add = addGroup(groupOf(b.dataset.add), n);
    toast(add ? `Agregado al carrito: ${add} ${add > 1 ? 'unidades' : 'unidad'}` : 'No hay más unidades disponibles'); redraw();
  });
}

/* ---- catalogo: busqueda, filtros y orden ---- */
const cat = { q: '', tipo: 'all', disp: true, precio: 'all', orden: 'rel' };
const PRECIOS = { all: 'Cualquiera', lt100: 'Hasta $100', mid: '$100 a $200', gt200: 'Más de $200' };
const ORDEN = { rel: 'Relevancia', pa: 'Precio: menor a mayor', pd: 'Precio: mayor a menor', az: 'Nombre: A a Z', new: 'Más recientes', top: 'Mejor calificados', sold: 'Más vendidos' };
function catalog() {
  const sm = soldMap(), q = norm(cat.q.trim());
  const okPrecio = p => cat.precio === 'all' || (cat.precio === 'lt100' ? p < 100 : cat.precio === 'mid' ? p >= 100 && p <= 200 : p > 200);
  const sold = g => g.lotes.reduce((a, p) => a + (sm[p.lote] || 0), 0);
  const cmp = {
    rel: (a, b) => (b.stock > 0) - (a.stock > 0),
    pa: (a, b) => a.precio - b.precio,
    pd: (a, b) => b.precio - a.precio,
    az: (a, b) => a.tipo.localeCompare(b.tipo, 'es') || a.kg - b.kg,
    new: (a, b) => b.fecha.localeCompare(a.fecha),
    top: (a, b) => rateG(b).avg - rateG(a).avg || rateG(b).n - rateG(a).n,
    sold: (a, b) => sold(b) - sold(a),
  }[cat.orden];
  return groups()
    .filter(g => (!cat.disp || g.stock > 0) && (cat.tipo === 'all' || g.tipo === cat.tipo) && okPrecio(g.precio) && norm(`${g.tipo} ${g.kg} kg ${g.kg}kg ${g.desc} ${g.lotes.map(p => p.lote).join(' ')}`).includes(q))
    .sort(cmp);
}

/* ---- ventanas modales genericas ---- */
function modal(inner) {
  const prev = document.activeElement, o = document.createElement('div');
  o.className = 'modal-bg';
  o.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdt">${inner}</div>`;
  const api = { el: o, locked: false, onclose: null, close() { document.removeEventListener('keydown', key, true); o.remove(); if (prev && prev.focus) prev.focus(); if (api.onclose) api.onclose(); } };
  function key(e) {
    if (e.key === 'Escape') { e.preventDefault(); if (!api.locked) api.close(); }
    else if (e.key === 'Tab') {
      const f = [...o.querySelectorAll('button, select, input')].filter(x => !x.disabled && x.type !== 'hidden' && x.offsetParent !== null);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }
  document.addEventListener('keydown', key, true);
  o.onclick = e => { if (e.target === o && !api.locked) api.close(); };
  document.body.append(o);
  return api;
}

/* ---- metodos de pago (SIMULADO: nunca se guarda el numero completo ni el CVV) ---- */
const CDK = 'lf_cards_' + user.email;
const cards = () => JSON.parse(localStorage.getItem(CDK) || '[]');
const saveCards = c => localStorage.setItem(CDK, JSON.stringify(c));
const brandOf = n => /^4/.test(n) ? 'Visa' : /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'American Express' : 'Tarjeta';
const brandIco = m => ({ Visa: 'VISA', Mastercard: 'MC', 'American Express': 'AMEX' }[m] || '💳');
const luhn = n => { let s = 0, d = false; for (let i = n.length - 1; i >= 0; i--) { let x = +n[i]; if (d) { x *= 2; if (x > 9) x -= 9; } s += x; d = !d; } return s % 10 === 0; };
const cardTxt = c => `${c.marca} •••• ${c.last4}`;
const payTxt = p => !p ? '—' : p.metodo === 'tarjeta' ? `Tarjeta ${p.marca} •••• ${p.last4}` : 'Efectivo al recibir (pendiente)';
const payShort = p => !p ? '—' : p.metodo === 'tarjeta' ? `${p.marca} •••• ${p.last4}` : 'Efectivo';
const DEMO = '🔒 Demostración: no se realiza ningún cobro real y solo se guardan la marca y los últimos 4 dígitos. Tarjeta de prueba: 4242 4242 4242 4242 (se aprueba) o 4000 0000 0000 0002 (se rechaza).';

const cardFormHTML = () => `<div class="cardform">
  <label>Nombre del titular<input name="holder" autocomplete="cc-name" placeholder="Como aparece en la tarjeta"></label>
  <label>Número de tarjeta<input name="num" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" maxlength="23"></label>
  <div class="cf2"><label>Vence (MM/AA)<input name="exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5"></label>
  <label>CVV<input name="cvv" type="password" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4"></label></div></div>`;
function bindCardForm(scope) {
  const n = scope.querySelector('[name=num]'), e = scope.querySelector('[name=exp]'), c = scope.querySelector('[name=cvv]');
  n.oninput = () => { n.value = n.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '); };
  e.oninput = () => { const d = e.value.replace(/\D/g, '').slice(0, 4); e.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
  c.oninput = () => { c.value = c.value.replace(/\D/g, '').slice(0, 4); };
}
function readCardForm(scope) {
  const v = n => scope.querySelector(`[name=${n}]`).value.trim();
  const holder = v('holder'), num = v('num').replace(/\s/g, ''), exp = v('exp'), cvv = v('cvv');
  if (holder.length < 3) return { error: 'Escribe el nombre del titular tal como aparece en la tarjeta.' };
  if (!/^\d{13,19}$/.test(num) || !luhn(num)) return { error: 'El número de tarjeta no es válido.' };
  const m = /^(\d{2})\/(\d{2})$/.exec(exp);
  if (!m || +m[1] < 1 || +m[1] > 12) return { error: 'La fecha de vencimiento debe tener el formato MM/AA.' };
  if (new Date(2000 + +m[2], +m[1], 1) <= new Date()) return { error: 'La tarjeta está vencida.' };
  const marca = brandOf(num);
  if (!new RegExp(`^\\d{${marca === 'American Express' ? 4 : 3}}$`).test(cvv)) return { error: 'El código de seguridad (CVV) no es válido.' };
  return { card: { id: 'c' + Date.now().toString(36), marca, last4: num.slice(-4), titular: holder, vence: exp }, declined: num.slice(-4) === '0002' };
}

function payDialog(lines, total, envio = 0, desc = 0) {
  return new Promise(resolve => {
    const saved = cards(), def = saved.find(c => c.pred) || saved[0];
    const pm = (val, ico, t, sub, chk) => `<label class="pm"><input type="radio" name="pm" value="${val}"${chk ? ' checked' : ''}><span class="pm-ic">${ico}</span><span><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</span></label>`;
    const m = modal(`<div class="modal-ic">💳</div><h2 id="mdt">Método de pago</h2>
      <p>Revisa tu pedido y elige cómo quieres pagar.</p>
      ${addr() ? `<p class="mut" style="font-size:13px;margin-top:-6px">📍 Entrega en: ${esc(addrTxt(addr()))} · <a href="#/direccion" data-chg>Cambiar</a></p>` : ''}
      <div class="sum">${mergeLines(lines).map(l => `<div><span>${l.q} × ${esc(pname(l.p))}</span><span>${money(l.q * l.p.precio)}</span></div>`).join('')}${desc ? `<div><span>Descuento</span><span>−${money(desc)}</span></div>` : ''}<div><span>Envío</span><span>${envio ? money(envio) : 'Gratis'}</span></div><div><span>Total</span><span>${money(total)}</span></div></div>
      <div class="paymethods" role="radiogroup" aria-label="Método de pago">
        ${saved.map(c => pm('c:' + c.id, brandIco(c.marca), esc(cardTxt(c)), `Vence ${esc(c.vence)} · ${esc(c.titular)}`, c === def)).join('')}
        ${pm('new', '➕', 'Nueva tarjeta', 'Crédito o débito', !def)}
        ${pm('cash', '💵', 'Efectivo al recibir', 'Pagas cuando te entreguen tu pedido', false)}
      </div>
      <div id="ncf"${def ? ' hidden' : ''}>${cardFormHTML()}<label class="chk"><input type="checkbox" name="keep" checked> Guardar esta tarjeta para futuras compras</label></div>
      <p class="msg" id="pmsg" role="alert"></p>
      <p class="demo">${DEMO}</p>
      <div class="actions sticky"><button class="btn ghost" type="button" data-c>Cancelar</button><button class="btn" type="button" data-p>Pagar ${money(total)}</button></div>`);
    m.onclose = () => resolve(null);
    const chg = m.el.querySelector('[data-chg]'); if (chg) chg.onclick = () => { sessionStorage.setItem('lf_back_cart', '1'); m.close(); };
    const el = m.el, q = s => el.querySelector(s), form = q('#ncf'), msg = q('#pmsg');
    const radios = [...el.querySelectorAll('[name=pm]')], cur = () => radios.find(r => r.checked).value;
    const pay = q('[data-p]'), cancel = q('[data-c]');
    bindCardForm(form);
    radios.forEach(r => r.onchange = () => { form.hidden = cur() !== 'new'; msg.textContent = ''; });
    cancel.onclick = () => m.close();
    pay.onclick = async () => {
      msg.textContent = '';
      const c = cur(); let res;
      if (c === 'cash') res = { metodo: 'efectivo' };
      else if (c === 'new') {
        const r = readCardForm(form); if (r.error) return msg.textContent = r.error;
        res = { metodo: 'tarjeta', card: r.card, declined: r.declined, guardar: form.querySelector('[name=keep]').checked, nueva: true };
      } else { const card = saved.find(x => 'c:' + x.id === c); res = { metodo: 'tarjeta', card, declined: card.last4 === '0002' }; }
      if (res.metodo === 'tarjeta') {
        m.locked = true; pay.disabled = cancel.disabled = true; pay.textContent = 'Procesando pago…';
        await new Promise(r => setTimeout(r, 1300));
        m.locked = false;
        if (res.declined) { msg.textContent = 'Tu banco rechazó el pago. Prueba con otra tarjeta.'; pay.disabled = cancel.disabled = false; pay.textContent = `Pagar ${money(total)}`; return; }
      }
      resolve(res); m.close();
    };
    (radios.find(r => r.checked) || radios[0]).focus();
  });
}

function successDialog(o) {
  return new Promise(resolve => {
    const card = o.pago.metodo === 'tarjeta';
    const m = modal(`<div id="v1">
      <div class="ok-banner"><span class="ok-circle" aria-hidden="true"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><div><h2 id="mdt">${card ? '¡Listo!' : '¡Pedido registrado!'}</h2><p>${card ? 'Tu pago ha sido aprobado' : 'Pagarás en efectivo al recibir tu pedido'}</p></div></div>
      <dl class="receipt">
        <div><dt>Tu compra</dt><dd>${esc(o.num)}</dd></div>
        <div><dt>${card ? 'Pagaste con' : 'Método de pago'}</dt><dd>${esc(payTxt(o.pago))}</dd></div>
        ${o.envio !== undefined ? `<div><dt>Subtotal</dt><dd>${money(o.subtotal)}</dd></div>${o.descuento ? `<div><dt>Descuento (${esc(o.cupon)})</dt><dd>−${money(o.descuento)}</dd></div>` : ''}<div><dt>Envío</dt><dd>${o.envio ? money(o.envio) : 'Gratis'}</dd></div>` : ''}
        <div><dt>${card ? 'Monto pagado' : 'Monto a pagar'}</dt><dd>${money(o.total)}</dd></div>
        ${card ? `<div><dt>Número de pago</dt><dd>${esc(o.pago.pagoId)}</dd></div>` : ''}
        <div><dt>Fecha</dt><dd>${fmt(o.fecha)}</dd></div>
        ${o.dir ? `<div><dt>Enviar a</dt><dd>${esc(o.dir.nombre)} · ${esc(addrTxt(o.dir))}</dd></div>` : ''}
      </dl>
      <p class="demo">🔒 Demostración: no se realizó ningún cobro real. Encuentras este comprobante en Mis compras.</p>
      <div class="actions"><button class="btn ghost" type="button" data-qr>Ver código QR de trazabilidad</button><button class="btn ghost" type="button" data-pr>🖨️ Imprimir / PDF</button><button class="btn" type="button" data-ok>Aceptar</button></div></div>
      <div id="v2" hidden>
      <div class="modal-ic">🔗</div><h2>Código QR de trazabilidad</h2>
      <p>Escanéalo para verificar la autenticidad ${o.items.length > 1 ? 'de cada lote' : 'del producto'}.</p>
      <div class="qrgrid">${o.items.map((i, k) => `<div class="qrc"><div data-q="${k}"></div><b>${esc(pname(i))}</b><small class="mut">${i.qty} ${i.qty > 1 ? 'unidades' : 'unidad'} · Lote ${esc(i.lote)}</small></div>`).join('')}</div>
      <div class="actions"><button class="btn ghost" type="button" data-back>Volver al recibo</button><button class="btn" type="button" data-ok>Aceptar</button></div></div>`);
    m.onclose = resolve;
    const el = m.el, q = s => el.querySelector(s);
    extras.celebrate(el);
    el.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => m.close());
    q('[data-pr]').onclick = () => { m.close(); extras.printReceipt(o); };
    let drawn = false;
    q('[data-qr]').onclick = async () => {
      q('#v1').hidden = true; q('#v2').hidden = false; q('[data-back]').focus();
      if (drawn) return; drawn = true;
      for (const [k, i] of o.items.entries()) { const p = load().find(x => x.lote === i.lote); if (p) qr(q(`[data-q="${k}"]`), await traceUrl(p, o.fecha, o.id), 170); }
    };
    if (isLocalHost()) q('#v2 .qrgrid').insertAdjacentHTML('afterend', '<p class="demo">⚠️ Este QR apunta a tu propia computadora, así que desde otro celular no abrirá. Publica el sitio (por ejemplo en Netlify) para que se pueda escanear.</p>');
    q('[data-back]').onclick = () => { q('#v2').hidden = true; q('#v1').hidden = false; q('[data-qr]').focus(); };
    q('[data-ok]').focus();
  });
}

async function checkout() {
  const d = load(); let adj = false;
  const lines = cart().map(c => {
    const p = d.find(x => x.lote === c.lote);
    if (!p || p.stock <= 0) { adj = true; return null; }
    const q = Math.min(c.qty, p.stock); if (q < c.qty) adj = true;
    return { p, q };
  }).filter(Boolean);
  if (adj) toast('Algunas cantidades se ajustaron a la existencia disponible.');
  if (!lines.length) { saveCart([]); return route(); }
  if (!addr()) {
    if (await askDialog({ icon: '📍', title: 'Agrega tu dirección', text: 'Necesitamos una dirección de entrega para enviar tu pedido.', ok: 'Agregar dirección', cancel: 'Ahora no' })) { sessionStorage.setItem('lf_back_cart', '1'); location.hash = '#/direccion'; }
    return;
  }
  const units = lines.reduce((a, l) => a + l.q, 0), sub0 = lines.reduce((a, l) => a + l.q * l.p.precio, 0), env0 = shipCost(lines, sub0), cp0 = tienda.couponFor(lines.map(l => ({ tipo: l.p.tipo, precio: l.p.precio, q: l.q }))), d0 = cp0 && !cp0.error ? cp0.desc : 0, total = sub0 - d0 + env0;
  const pay = await payDialog(lines, total, env0, d0);
  if (!pay) return;
  const d2 = load(), done = [];
  lines.forEach(l => { const p = d2.find(x => x.lote === l.p.lote), q = p ? Math.min(l.q, p.stock) : 0; if (q > 0) { p.stock -= q; done.push({ p, q }); } });
  if (!done.length) { toast('Esos productos ya no están disponibles.'); saveCart([]); return route(); }
  const sub = done.reduce((a, l) => a + l.q * l.p.precio, 0), envio = shipCost(done, sub), cp = tienda.couponFor(done.map(l => ({ tipo: l.p.tipo, precio: l.p.precio, q: l.q }))), desc = cp && !cp.error ? cp.desc : 0, tot = sub - desc + envio;
  const rnd = () => String(Math.floor(1e9 + Math.random() * 9e9));
  const pago = pay.metodo === 'tarjeta' ? { metodo: 'tarjeta', marca: pay.card.marca, last4: pay.card.last4, pagoId: rnd(), estado: 'aprobado' } : { metodo: 'efectivo', estado: 'pendiente' };
  if (pay.nueva && pay.guardar && !cards().some(c => c.marca === pay.card.marca && c.last4 === pay.card.last4 && c.vence === pay.card.vence)) {
    const cs = cards(); if (!cs.length) pay.card.pred = true; cs.push(pay.card); saveCards(cs);
  }
  save(d2);
  const order = addOrder({ email: user.email, name: user.name, items: done.map(l => snap(l.p, l.q)), subtotal: sub, envio, total: tot, ...(desc ? { descuento: desc, cupon: cp.code } : {}), num: rnd(), pago, dir: addr(), estado: 'pendiente' });
  if (desc) tienda.useCoupon(cp.code);
  saveCart([]);
  const txt = mergeLines(done).map(l => `${l.q} × ${pname(l.p)}`).join(', '), txtA = done.map(l => `${l.q} × ${pname(l.p)} (lote ${l.p.lote})`).join(', ');
  notify(user.email, `Compra #${order.num} confirmada: ${txt} (${money(tot)}) · ${payTxt(pago)}.`);
  notify('admin', `${user.name} compró ${txtA} (${money(tot)}) · ${payTxt(pago)}.`);
  done.forEach(l => stockAlert(l.p));
  badge(); route();
  await successDialog(order);
  location.hash = '#/compras';
}

/* ---------- vistas ---------- */
const views = {
  inicio: () => {
    if (isClient) return clientHome();
    const p = load(), sm = soldMap(), mes = todayISO().slice(0, 7);
    const kg = adminData.waste().reduce((a, x) => a + x.kg, 0), pend = orders().filter(o => adminData.estadoDe(o) === 'pendiente').length, v = orders().filter(o => adminData.valid(o) && o.fecha.startsWith(mes)).length;
    return `<h1>¡Bienvenido, ${esc(user.name)}!</h1><p class="sub">Aquí puedes gestionar tus productos, ver la trazabilidad y realizar ventas.</p>
    <div class="stats">
      <div class="stat"><div class="e">🌱</div><b>${p.length}</b><span>Productos registrados</span></div>
      <div class="stat"><div class="e">📦</div><b>${pend}</b><span>Pedidos pendientes</span></div>
      <div class="stat"><div class="e">🛒</div><b>${v}</b><span>Ventas este mes</span></div>
      <div class="stat"><div class="e">♻️</div><b>${kg} kg</b><span>Residuos recibidos</span></div>
    </div>
    ${extras.storageWarn()}${extras.firstSteps()}
    ${(() => { const low = p.filter(x => x.stock <= 3).sort((a, b) => a.stock - b.stock); return low.length ? `<div class="panel" id="lowst"><h2>⚠️ Stock bajo</h2>${low.map(x => `<div class="notif"><span><b>${esc(x.lote)}</b> · ${esc(pname(x))}<br><small>${x.stock <= 0 ? 'Agotado' : 'Quedan ' + x.stock + ' unidades'}</small></span><button class="btn sm" data-re="${esc(x.lote)}">Reabastecer</button></div>`).join('')}</div>` : ''; })()}
    <div class="banner">De los residuos orgánicos… ¡nace un gran fertilizante! 🪱</div>`;
  },

  productos: () => {
    const L = load(), e = L.find(x => x.lote === lotEdit), sold = !!e && orders().some(o => o.items.some(i => i.lote === e.lote));
    const val = (k, d = '') => esc(e && e[k] != null ? e[k] : d);
    const org = adminData.waste();
    return `<h1>${e ? 'Editar lote ' + esc(e.lote) : 'Registrar nuevo producto'}</h1><p class="sub">${e ? (sold ? 'Este lote ya tiene ventas: el tipo, peso, fecha y residuos de origen no se pueden cambiar para no invalidar los QR.' : 'Modifica los datos del lote.') : 'Cada lote queda guardado con su código de trazabilidad.'}</p>
    <form class="panel grid2" id="f">
      <div>
        <div class="row2">
          <label>Lote / ID<input id="lote" required${e ? ' readonly' : ''} value="${val('lote')}"></label>
          ${sold ? `<label>Tipo de composta<input id="tipo" disabled value="${val('tipo')}"></label>` : `<label>Tipo de composta<select id="tipo">${TIPOS.map(t => `<option${e && e.tipo === t ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`}
        </div>
        <div class="row2">
          <label>Peso por unidad (kg)<input id="kg" type="number" min="1" required${sold ? ' disabled' : ''} value="${val('kg')}"></label>
          <label>Unidades disponibles<input id="stock" type="number" min="0" required value="${val('stock', 10)}"></label>
        </div>
        <div class="row2">
          <label>Fecha de producción<input id="fecha" type="date" required${sold ? ' disabled' : ''} value="${val('fecha')}"></label>
          <label>Precio por unidad (MXN)<input id="precio" type="number" min="0" value="${val('precio', 120)}"></label>
        </div>
        ${sold ? `<label>Residuos de origen<input id="origen" disabled value="${val('origen') || 'Sin vincular'}"></label>` : `<label>Residuos de origen (opcional)<select id="origen"><option value="">Sin vincular</option>${org.map(w => `<option value="${esc(w.id)}"${e && e.origen === w.id ? ' selected' : ''}>${esc(w.id)} · ${esc(w.prov)} · ${w.kg} kg</option>`).join('')}</select></label>`}
        <label>Descripción<textarea id="desc" rows="3">${val('desc')}</textarea></label>
        <label>Foto del producto (opcional)<input type="file" id="foto" accept="image/*"></label>
        <div class="actions"><button type="button" class="btn ghost" id="fcancel">Cancelar</button><button class="btn">${e ? 'Guardar cambios' : 'Guardar'}</button></div>
      </div>
      <div class="qrbox"><div id="qr">Generar QR de trazabilidad</div><button type="button" class="btn sm" id="gen">Generar</button><div id="fprev"></div></div>
    </form>
    <h2>Inventario de lotes</h2>
    ${L.length ? `<div class="table stack"><table><thead><tr><th>Lote</th><th>Producto</th><th>Disponibles</th><th>Precio</th><th></th></tr></thead><tbody>${L.map(x => `<tr><td data-l="Lote">${esc(x.lote)}</td><td data-l="Producto">${esc(pname(x))}</td><td data-l="Disponibles">${x.stock <= 3 ? `<span class="tag ${x.stock <= 0 ? 'x' : 'w'}">${x.stock}</span>` : x.stock}</td><td data-l="Precio">${money(x.precio)}</td><td><button class="btn sm ghost" data-le="${esc(x.lote)}">Editar</button> <button class="btn sm ghost" data-ld="${esc(x.lote)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="panel empty">Aún no hay lotes.</div>'}`;
  },

  trazabilidad: () => {
    const p = load().filter(x => !isClient || boughtLots().includes(x.lote));
    if (!p.length) return `<h1>Verificar producto</h1><div class="panel empty">Aún no tienes lotes para verificar.<p><a href="#/tienda">Ir al catálogo</a></p></div>`;
    return `<h1>Historial y trazabilidad</h1><p class="sub">Selecciona un lote para ver su recorrido.</p>
    <label style="max-width:300px">Lote<select id="sel">${p.map(x => `<option>${esc(x.lote)}</option>`).join('')}</select></label>
    <div id="trace"></div>`;
  },

  ventas: () => `<h1>Marketplace</h1>
    <div class="bar"><input id="q" placeholder="Buscar por lote, nombre o tipo…"><button class="btn" id="buscar">Buscar</button></div>
    <div class="bar" id="filters"><button class="pill on" data-f="all">Todos</button><button class="pill" data-f="d">Disponibles</button><button class="pill" data-f="v">Agotados</button></div>
    <div class="table stack"><table><thead><tr><th>Producto</th><th>Lote</th><th>Presentación</th><th>Stock</th><th>Precio</th><th>Estado</th></tr></thead><tbody id="rows"></tbody></table></div>
    <p><button class="btn" id="newSale">Crear nueva venta</button></p>`,

  notificaciones: () => {
    const n = mine();
    return `<h1>Notificaciones</h1>` + (n.length
      ? `<div class="actions"><button class="btn ghost sm" id="clear">Borrar todas</button></div><div class="panel">${n.map(x => `<div class="notif nt ${x.leida ? '' : 'new'}"><span>${esc(x.texto)}</span><small>${new Date(x.fecha).toLocaleString('es-MX')}</small></div>`).join('')}</div>`
      : `<div class="panel empty">🔔<p>${prefs().app ? 'No hay notificaciones' : 'Las notificaciones en la app están desactivadas'}</p></div>`);
  },

  carrito: () => {
    const gs = cartGroups();
    if (!gs.length) return `<h1>Carrito</h1><div class="panel empty">🛒<p>Tu carrito está vacío</p><p><a href="#/tienda">Ir al catálogo</a></p></div>`;
    return `<h1>Carrito</h1><div class="panel">${gs.map(({ g, q }) => `<div class="cl"><div><b>${esc(pname(g))}</b><br><small class="mut">${money(g.precio)} c/u</small></div>${stepper(g.lote, q, g.stock)}<b class="cl-sub" data-sub="${esc(g.lote)}">${money(q * g.precio)}</b><button class="btn ghost sm" data-rm="${esc(g.lote)}">Quitar</button></div>`).join('')}
      <div class="cl sm"><span>Subtotal (<span id="units"></span> unidades)</span><b id="subt"></b></div>
      <div class="cl sm" id="discRow" hidden><span>Descuento <small class="mut" id="discCode"></small></span><b id="disc"></b></div>
      <div class="cl sm"><span>Envío <small class="mut">(gratis desde ${money(ENVIO.gratisDesde)})</small></span><b id="ship"></b></div>
      <div class="cl tot"><b>Total</b><b id="total"></b></div>
      <form class="coupon" id="cpf" novalidate><label>¿Tienes un cupón?<span class="bar" style="margin:4px 0 0"><input id="cpc" maxlength="15" placeholder="Escribe tu código" autocapitalize="characters" value="${esc(tienda.applied())}"><button class="btn ghost">${tienda.applied() ? 'Quitar' : 'Aplicar'}</button></span></label><p class="msg" id="cpm" role="alert"></p></form></div>
      <div class="actions"><button class="btn ghost" id="empty">Vaciar carrito</button><button class="btn" id="pay">Finalizar compra</button></div>`;
  },

  tienda: () => `<h1>Catálogo</h1><p class="sub">Encuentra el fertilizante que necesitas.</p>${tienda.bannerHtml()}
    <div class="panel filters">
      <label class="f-search">Buscar<input id="q" type="search" placeholder="Ej. humus, composta, 25 kg…" value="${esc(cat.q)}"></label>
      <label>Tipo<select id="ftipo"><option value="all">Todos</option>${TIPOS.map(t => `<option${cat.tipo === t ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Precio<select id="fprecio">${Object.entries(PRECIOS).map(([k, t]) => `<option value="${k}"${cat.precio === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Ordenar por<select id="forden">${Object.entries(ORDEN).map(([k, t]) => `<option value="${k}"${cat.orden === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="switch f-disp"><span><b>Solo disponibles</b></span><input type="checkbox" role="switch" id="fdisp"${cat.disp ? ' checked' : ''}></label>
    </div>
    <div class="resbar"><span id="count" aria-live="polite"></span><button type="button" class="btn ghost sm" id="reset">Limpiar filtros</button></div>
    <div class="cards" id="cards"></div>`,

  // compras: la vista de Mis compras esta en tienda.js

  favoritos: () => {
    const items = [...new Set(favs().map(l => groupOf(l)).filter(Boolean))];
    if (!items.length) return `${back()}<h1>Favoritos</h1><div class="panel empty">♡<p>Aún no tienes favoritos</p><p><a href="#/tienda">Ir al catálogo</a></p></div>`;
    return `${back()}<h1>Favoritos</h1><p class="sub">Los productos que guardaste.</p><div class="cards">${items.map(productCard).join('')}</div>`;
  },

  opiniones: () => {
    const m = boughtLots().map(l => load().find(p => p.lote === l)).filter(Boolean), rv = reviews().filter(r => r.email === user.email);
    if (!m.length) return `${back()}<h1>Mis opiniones</h1><div class="panel empty">⭐<p>Cuando compres un producto podrás calificarlo aquí</p><p><a href="#/tienda">Ir al catálogo</a></p></div>`;
    return `${back()}<h1>Mis opiniones</h1><p class="sub">Califica los productos que compraste y cuéntanos qué tal te fue.</p>` + m.map(x => {
      const r = rv.find(v => v.lote === x.lote);
      return `<form class="panel review" data-lote="${esc(x.lote)}" style="max-width:640px" novalidate>
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start"><div><b>${esc(pname(x))}</b></div>${r ? '<span class="tag d">Opinión guardada</span>' : ''}</div>
        <div class="stars" role="radiogroup" aria-label="Calificación" data-stars="${r ? r.stars : 0}">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star${r && n <= r.stars ? ' on' : ''}" data-n="${n}" role="radio" aria-checked="${!!r && r.stars === n}" aria-label="${n} ${n > 1 ? 'estrellas' : 'estrella'}">★</button>`).join('')}</div>
        <label>Describe el producto<textarea rows="3" maxlength="500" placeholder="¿Cómo te funcionó? ¿Lo recomendarías?">${r ? esc(r.text) : ''}</textarea></label>
        <p class="msg" role="alert"></p>
        <div class="actions">${r ? '<button type="button" class="btn ghost sm" data-del>Eliminar</button>' : ''}<button class="btn sm">${r ? 'Actualizar opinión' : 'Guardar opinión'}</button></div></form>`;
    }).join('');
  },

  pagos: () => {
    const cs = cards();
    return `${back()}<h1>Métodos de pago</h1><p class="sub">Registra tus tarjetas para pagar más rápido.</p>
    <div class="panel" style="max-width:640px"><h2>Mis tarjetas</h2>${cs.length ? cs.map(c => `<div class="notif"><span style="display:flex;gap:12px;align-items:center"><span class="pm-ic">${brandIco(c.marca)}</span><span class="cardinfo"><b>${esc(cardTxt(c))}</b>${c.pred ? ' <span class="tag d">Predeterminada</span>' : ''}<br><small class="mut">Vence ${esc(c.vence)} · ${esc(c.titular)}</small></span></span><span class="cardact">${c.pred ? '' : `<button class="btn ghost sm" data-pred="${esc(c.id)}">Predeterminar</button>`}<button class="btn ghost sm" data-delc="${esc(c.id)}">Eliminar</button></span></div>`).join('') : '<p class="mut" style="margin:0">Aún no has registrado tarjetas.</p>'}</div>
    <form class="panel" id="cf" style="max-width:640px" novalidate><h2>Agregar tarjeta</h2>${cardFormHTML()}
      <p class="msg" id="cfmsg" role="alert"></p><p class="demo">${DEMO}</p>
      <div class="actions"><button class="btn">Guardar tarjeta</button></div></form>`;
  },

  asistente: () => `<h1>Asistente Experto 🌿</h1><p class="sub">Dime qué planta tienes y te recomiendo el producto y una cantidad orientativa.</p>
    <div class="panel" style="max-width:720px">
      <b>¿Dónde está tu cultivo?</b>
      <div class="bar" id="aLugar" style="margin:8px 0 14px"><button type="button" class="pill${asistente.lugar === 'huerto' ? ' on' : ''}" data-l="huerto">Huerto o jardín</button><button type="button" class="pill${asistente.lugar === 'maceta' ? ' on' : ''}" data-l="maceta">Maceta</button></div>
      <b>Elige tu planta</b>
      <div class="bar" id="aChips" style="margin:8px 0 14px">${PLANTAS.map((p, i) => `<button type="button" class="pill" data-i="${i}">${esc(p.n.split(' (')[0])}</button>`).join('')}</div>
      <form class="bar" id="aForm" style="margin:0"><input id="aQ" placeholder="O escribe aquí tu planta: tomate, rosal, limón…" aria-label="Tu planta"><button class="btn">Consultar</button></form>
      <p class="mut" style="font-size:12px;margin:10px 0 0">Por ahora el asistente no analiza fotos: dime qué planta tienes. Sus recomendaciones se basan en reglas de cultivo generales.</p>
    </div>
    <div class="chat" id="chat" aria-live="polite"></div>`,

  direccion: () => {
    const L = addrs(), a = L.find(x => x.id === adEdit) || {}, v = k => esc(a[k] || '');
    return `${back()}<h1>Direcciones de entrega</h1><p class="sub">Guarda varias y elige a cuál te llevamos cada pedido.</p>
    ${L.length ? `<div style="max-width:640px">${L.map(x => `<div class="panel" style="margin-bottom:12px"><b>${esc(x.nombre)}</b> ${x.pred ? '<span class="tag d">Predeterminada</span>' : ''}<p class="mut" style="margin:6px 0 10px">${esc(addrTxt(x))}${x.ref ? '<br>' + esc(x.ref) : ''}</p>
      <div class="actions" style="justify-content:flex-start;flex-wrap:wrap">${x.pred ? '' : `<button class="btn sm" data-use="${x.id}">Usar esta</button>`}<button class="btn sm ghost" data-edit="${x.id}">Editar</button><button class="btn sm ghost" data-del="${x.id}">Eliminar</button></div></div>`).join('')}</div>` : ''}
    <form class="panel" id="af" style="max-width:640px" novalidate><h2>${a.id ? 'Editar dirección' : L.length ? 'Agregar otra dirección' : 'Nueva dirección'}</h2>
      <div class="row2"><label>Nombre de quien recibe<input name="nombre" autocomplete="name" value="${v('nombre') || (a.id ? '' : esc(user.name))}"></label>
      <label>Teléfono (10 dígitos)<input name="tel" type="tel" inputmode="numeric" autocomplete="tel-national" value="${v('tel') || (a.id ? '' : esc(userPhone()))}"></label></div>
      <label>Calle y número<input name="calle" autocomplete="street-address" placeholder="Ej. Av. Juárez 123, int. 4" value="${v('calle')}"></label>
      <div class="row2"><label>Colonia<input name="colonia" autocomplete="address-line2" value="${v('colonia')}"></label>
      <label>Código postal<input name="cp" inputmode="numeric" autocomplete="postal-code" maxlength="5" value="${v('cp')}"></label></div>
      <div class="row2"><label>Ciudad o municipio<input name="ciudad" autocomplete="address-level2" value="${v('ciudad')}"></label>
      <label>Estado<select name="estado"><option value="">Elige un estado</option>${ESTADOS.map(e => `<option${a.estado === e ? ' selected' : ''}>${e}</option>`).join('')}</select></label></div>
      <label>Referencias (opcional)<textarea name="ref" rows="2" maxlength="200" placeholder="Entre qué calles está, color de la casa, etc.">${v('ref')}</textarea></label>
      <p class="msg" id="amsg" role="alert"></p>
      <div class="actions">${a.id ? '<button type="button" class="btn ghost" data-new>Cancelar edición</button>' : ''}<button class="btn">${a.id ? 'Guardar cambios' : 'Guardar dirección'}</button></div></form>`;
  },

  seguridad: () => `${back()}<h1>Seguridad</h1>
    <form class="panel" id="pw" style="max-width:480px" novalidate><h2>Cambiar contraseña</h2>
      <label>Contraseña actual<input id="pw0" type="password" autocomplete="current-password"></label>
      <label>Nueva contraseña<input id="pw1" type="password" autocomplete="new-password"></label>
      <label>Confirmar nueva contraseña<input id="pw2" type="password" autocomplete="new-password"></label>
      <p class="msg" id="pwmsg" role="alert"></p>
      <div class="actions"><button class="btn">Cambiar contraseña</button></div></form>
    <div class="panel" style="max-width:640px"><h2>Sesiones activas</h2><div id="ses"></div>
      <p class="sub" style="margin:12px 0 0;font-size:13px">Las sesiones se registran en este navegador. Para ver tus otros dispositivos hace falta un servidor.</p></div>`,

  'ajustes-notif': () => { const p = prefs(); return `${back()}<h1>Notificaciones</h1><p class="sub">Elige cómo quieres recibir avisos.</p>
    <div class="panel" style="max-width:640px">
      ${swRow('email', 'Notificaciones por correo', 'Confirmación de compras, ofertas de abonos y boletines de compostaje.', p.email)}
      ${swRow('app', 'Notificaciones en la app', isClient ? 'Alertas sobre el estado de tus pedidos en "Mis compras".' : 'Alertas cuando un cliente compra un lote.', p.app)}
      ${swRow('reminders', 'Recordatorios', 'Tips ecológicos y cuidado de tu composta, uno cada 10 minutos mientras tengas la página abierta.', p.reminders)}
    </div><p class="sub" style="font-size:13px">El envío real de correos requiere un servidor; por ahora la preferencia queda guardada.</p>`; },

  conexiones: () => { const l = links(); return `${back()}<h1>Conexiones</h1><p class="sub">Vincula cuentas para iniciar sesión más rápido.</p>
    <div class="panel" style="max-width:640px">${[['google', 'Google', 'G'], ['apple', 'Apple', 'A'], ['facebook', 'Facebook', 'f']].map(([k, n, i]) => `<div class="notif"><span style="display:flex;gap:12px;align-items:center"><span class="avatar">${i}</span><span><b>${n}</b><br><small>${l[k] ? 'Vinculada el ' + new Date(l[k]).toLocaleDateString('es-MX') : 'No vinculada'}</small></span></span><button class="btn${l[k] ? ' ghost' : ''} sm" data-link="${k}">${l[k] ? 'Desvincular' : 'Vincular'}</button></div>`).join('')}</div>
    <p class="sub" style="font-size:13px">Es una simulación: el acceso real con Google, Apple o Facebook requiere registrar la app con cada proveedor y un servidor.</p>`; },

  config: () => `<h1>Mi perfil</h1><p class="sub">Datos de tu cuenta.</p>
    <div class="panel" id="pf" style="max-width:480px">
      <label>Nombre<input id="pn" value="${esc(user.name)}" disabled></label>
      <label>Correo<input value="${esc(user.email)}" disabled></label>
      ${userPhone() ? `<label>Teléfono<input value="${esc(userPhone())}" disabled></label>` : ''}
    </div>
    ${isClient ? `<div class="panel list" style="max-width:480px"><h2>Mi actividad</h2>
      <a href="#/favoritos"><span>❤️ Favoritos</span><span>›</span></a><a href="#/opiniones"><span>⭐ Mis opiniones</span><span>›</span></a><a href="#/miscupones"><span>🏷️ Mis cupones${tienda.misCupones().length ? ` <span class="tag d">${tienda.misCupones().length}</span>` : ''}</span><span>›</span></a><a href="#/pagos"><span>💳 Métodos de pago</span><span>›</span></a><a href="#/direccion"><span>📍 Direcciones de entrega</span><span>›</span></a></div>` : ''}
    <div class="panel" style="max-width:480px"><h2>Apariencia</h2>
      <div class="dd" id="themeDd">
        <button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false"><span>${THEMES[lfTheme.mode()]}</span><span class="dd-arrow" aria-hidden="true">▾</span></button>
        <ul class="dd-menu" role="listbox" aria-label="Tema" hidden>${Object.entries(THEMES).map(([k, t]) => `<li role="option" tabindex="-1" data-mode="${k}" aria-selected="${lfTheme.mode() === k}">${t}</li>`).join('')}</ul></div>
      <p class="sub" style="margin:10px 0 0;font-size:13px">Dispositivo sigue el tema claro u oscuro de tu equipo.</p></div>
    <div class="panel list" style="max-width:480px"><h2>Configuración de la cuenta</h2>
      <a href="#/seguridad"><span>🔒 Seguridad</span><span>›</span></a><a href="#/ajustes-notif"><span>🔔 Notificaciones</span><span>›</span></a><a href="#/conexiones"><span>🔌 Conexiones</span><span>›</span></a></div>
    ${isClient ? '' : tienda.adminCodeHtml() + extras.backupHtml()}`,
};

/* ---------- lógica por vista ---------- */
const hooks = {
  productos() {
    const e = load().find(x => x.lote === lotEdit); if (lotEdit && !e) lotEdit = null;
    const sold = !!e && orders().some(o => o.items.some(i => i.lote === e.lote));
    let foto = e ? e.foto || '' : '';
    if (!e) { $('#fecha').value = todayISO(); $('#lote').value = 'LF-' + new Date().getFullYear() + '-' + String(load().length + 1).padStart(3, '0'); }
    const prev = () => { $('#fprev').innerHTML = foto ? `<img class="ph" src="${foto}" alt="Foto del producto" style="max-width:150px;margin-top:10px"><br><button type="button" class="btn sm ghost" id="fquit">Quitar foto</button>` : ''; const q = $('#fquit'); if (q) q.onclick = () => { foto = ''; $('#foto').value = ''; prev(); }; };
    prev();
    $('#foto').onchange = async ev => {
      const f = ev.target.files[0]; if (!f) return; if (!/^image\//.test(f.type)) { ev.target.value = ''; return toast('Elige un archivo de imagen.'); }
      try {
        const url = URL.createObjectURL(f), img = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = url; });
        const k = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); const nf = c.toDataURL('image/jpeg', 0.72);
        if (extras.usage().used + nf.length > 4.7 * 1024 * 1024) { ev.target.value = ''; return toast('Ya casi no hay espacio en el navegador. Descarga un respaldo y quita otras fotos.'); }
        foto = nf; prev();
      } catch (x) { ev.target.value = ''; toast('No se pudo leer esa imagen.'); }
    };
    const read = () => sold ? { tipo: e.tipo, kg: e.kg, fecha: e.fecha, origen: e.origen || '' } : { tipo: $('#tipo').value, kg: +$('#kg').value, fecha: $('#fecha').value, origen: $('#origen').value };
    $('#gen').onclick = async () => {
      const p = { lote: $('#lote').value.trim(), ...read() };
      if (!p.lote || !p.kg || !p.fecha) return toast('Completa lote, peso y fecha para generar el QR.');
      qr($('#qr'), await traceUrl(p, e ? firstSale(p.lote) : undefined), 150);
    };
    $('#fcancel').onclick = () => { if (e) { lotEdit = null; route(); } else location.hash = '#/inicio'; };
    $('#f').onsubmit = ev => {
      ev.preventDefault();
      const d = load(), lote = $('#lote').value.trim(), r = read();
      if (!lote) return toast('Escribe el lote.');
      if (!(r.kg > 0)) return toast('El peso debe ser mayor a 0.');
      const base = { stock: Math.max(0, +$('#stock').value || 0), precio: +$('#precio').value || 0, desc: $('#desc').value, foto };
      if (e) { Object.assign(d.find(x => x.lote === e.lote), r, base); save(d); lotEdit = null; tienda.checkRestock(); toast('Lote actualizado'); route(); return; }
      if (d.some(x => x.lote === lote)) return toast('Ese lote ya existe.');
      d.push({ lote, ...r, ...base }); save(d); tienda.checkRestock(); toast('Producto guardado'); location.hash = '#/inicio';
    };
    $('#view').onclick = async ev => {
      const b = ev.target.closest('button[data-le],button[data-ld]'); if (!b) return;
      if (b.dataset.le) { lotEdit = b.dataset.le; route(); scrollTo(0, 0); return; }
      const l = b.dataset.ld;
      if (orders().some(o => o.items.some(i => i.lote === l))) return toast('Este lote tiene ventas, no se puede eliminar. Ponle 0 unidades.');
      if (!await askDialog({ icon: '🗑️', title: '¿Eliminar el lote ' + l + '?', text: 'No se puede deshacer.', ok: 'Eliminar', danger: true })) return;
      save(load().filter(x => x.lote !== l)); if (lotEdit === l) lotEdit = null; toast('Lote eliminado'); route();
    };
  },

  trazabilidad() {
    if (!$('#sel')) return;
    const show = async () => {
      const x = load().find(p => p.lote === $('#sel').value); if (!x) return;
      const h = await loteHash(x, firstSale(x.lote));
      const st = etapas(x.fecha, firstSale(x.lote), x.origen);
      $('#trace').innerHTML = `<h2>Historial del lote ${esc(x.lote)}</h2>
        <div class="steps">${st.map(s => `<div class="step"><div class="c">${s[0]}</div><b>${s[1]}</b><small>${s[2] ? (/^\d{4}-/.test(s[2]) ? fmt(s[2]) : 'Ref. ' + esc(s[2])) : 'Sin ventas aún'}</small></div>`).join('')}</div>
        <div class="panel"><div class="ok"><span class="tick">✓</span><div><b>Registro en blockchain</b><div class="hash">Hash del lote: ${h}</div><small>Verificado y consultable (simulado)</small></div></div></div>
        <div class="panel ok"><div id="q2"></div><span>Escanea el código QR para verificar la autenticidad del producto.</span></div>`;
      qr($('#q2'), await traceUrl(x, firstSale(x.lote)), 150);
    };
    $('#sel').onchange = show;
    const want = new URLSearchParams(location.hash.split('?')[1] || '').get('lote');
    if (want) $('#sel').value = want;
    show();
  },

  ventas() {
    let f = 'all';
    const draw = () => {
      const q = norm($('#q').value);
      const r = load().filter(x => (f === 'all' || (f === 'v') === (x.stock <= 0)) && norm(x.lote + x.tipo).includes(q));
      $('#rows').innerHTML = r.map(x => `<tr><td data-l="Producto">${esc(x.tipo)}</td><td data-l="Lote">${esc(x.lote)}</td><td data-l="Presentación">${x.kg} kg</td><td data-l="Stock">${x.stock}</td><td data-l="Precio">${money(x.precio)}</td><td data-l="Estado">${stateTag(x)}</td></tr>`).join('') || '<tr><td colspan="6">No hay lotes que coincidan.</td></tr>';
    };
    document.querySelectorAll('#filters .pill').forEach(b => b.onclick = () => { f = b.dataset.f; document.querySelectorAll('#filters .pill').forEach(p => p.classList.toggle('on', p === b)); draw(); });
    $('#buscar').onclick = draw; $('#q').oninput = draw;
    $('#newSale').onclick = async () => {
      const d = load(), libres = d.filter(x => x.stock > 0);
      if (!libres.length) return toast('No hay productos con existencia.');
      const r = await askDialog({ icon: '💰', title: 'Crear nueva venta', text: 'Elige el lote y la cantidad vendida.', ok: 'Registrar venta', select: libres.map(x => ({ v: x.lote, t: `${x.lote} · ${x.tipo} (${x.stock} disp.)` })), qtyMax: Object.fromEntries(libres.map(x => [x.lote, x.stock])) });
      if (!r) return;
      const x = d.find(p => p.lote === r.value && p.stock > 0); if (!x) return;
      const q = Math.min(r.qty, x.stock); x.stock -= q; save(d);
      addOrder({ email: '', name: 'Venta directa', items: [snap(x, q)], total: q * x.precio, estado: 'entregado' });
      stockAlert(x); draw(); toast('Venta registrada');
    };
    draw();
  },

  notificaciones() {
    const all = notifs(), key = isClient ? user.email : 'admin';
    all.forEach(n => { if (n.para === key) n.leida = true; });
    localStorage.setItem(NK, JSON.stringify(all)); badge();
    const c = $('#clear');
    if (c) c.onclick = () => { localStorage.setItem(NK, JSON.stringify(all.filter(n => n.para !== key))); route(); };
  },

  carrito() {
    if (!$('#pay')) return;   // carrito vacio: no hay botones que conectar
    const view = $('#view');
    const refresh = () => {
      const gs = cartGroups(); let t = 0, u = 0;
      gs.forEach(({ g, q }) => {
        t += q * g.precio; u += q;
        const e = [...view.querySelectorAll('[data-sub]')].find(el => groupOf(el.dataset.sub) && groupOf(el.dataset.sub).lotes.some(p => p.lote === g.lote)); if (e) e.textContent = money(q * g.precio);
      });
      const env = shipCost(gs.map(({ g, q }) => ({ q, p: { kg: g.kg } })), t);
      const cp = tienda.couponFor(gs.map(({ g, q }) => ({ tipo: g.tipo, precio: g.precio, q }))), dsc = cp && !cp.error ? cp.desc : 0;
      $('#discRow').hidden = !dsc; $('#disc').textContent = '−' + money(dsc); $('#discCode').textContent = cp && cp.code ? '(' + cp.code + (cp.aplica === 'toda la tienda' ? '' : ' · solo ' + cp.aplica) + ')' : '';
      $('#cpm').textContent = cp && cp.error ? cp.error : '';
      $('#subt').textContent = money(t); $('#ship').textContent = env ? money(env) : 'Gratis'; $('#total').textContent = money(t - dsc + env); $('#units').textContent = u;
    };
    bindQty(view, (l, v) => { setGroupQty(groupOf(l), v); refresh(); });
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { setGroupQty(groupOf(b.dataset.rm), 0); route(); });
    $('#empty').onclick = () => { saveCart([]); route(); };
    $('#pay').onclick = checkout;
    $('#cpf').onsubmit = e => {
      e.preventDefault();
      if (tienda.applied()) { tienda.setApplied(''); toast('Cupón quitado'); return route(); }
      const code = $('#cpc').value.trim().toUpperCase(); if (!code) return $('#cpm').textContent = 'Escribe el código del cupón.';
      const cp = tienda.couponFor(cartGroups().map(({ g, q }) => ({ tipo: g.tipo, precio: g.precio, q })), code);
      if (cp.error) return $('#cpm').textContent = cp.error;
      tienda.setApplied(cp.code); toast('Cupón aplicado: −' + money(cp.desc)); route();
    };
    $('#cpc').oninput = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); };
    refresh();
  },

  tienda() {
    const draw = () => {
      const r = catalog();
      $('#count').textContent = `${r.length} ${r.length === 1 ? 'producto' : 'productos'}`;
      $('#cards').innerHTML = r.map(productCard).join('') || '<div class="panel empty" style="grid-column:1/-1">No encontramos productos con esos filtros.<p><button class="btn ghost sm" data-reset>Limpiar filtros</button></p></div>';
      bindCards($('#cards'), draw);
      const rs = $('#cards [data-reset]'); if (rs) rs.onclick = reset;
    };
    const reset = () => {
      Object.assign(cat, { q: '', tipo: 'all', disp: true, precio: 'all', orden: 'rel' });
      $('#q').value = ''; $('#ftipo').value = 'all'; $('#fprecio').value = 'all'; $('#forden').value = 'rel'; $('#fdisp').checked = true; ['#ftipo', '#fprecio', '#forden'].forEach(k => $(k).dispatchEvent(new Event('lf-sync'))); draw();
    };
    $('#q').oninput = e => { cat.q = e.target.value; draw(); };
    $('#ftipo').onchange = e => { cat.tipo = e.target.value; draw(); };
    $('#fprecio').onchange = e => { cat.precio = e.target.value; draw(); };
    $('#forden').onchange = e => { cat.orden = e.target.value; draw(); };
    $('#fdisp').onchange = e => { cat.disp = e.target.checked; draw(); };
    $('#reset').onclick = reset;
    draw();
  },

  favoritos() { bindCards($('#view'), route); },

  opiniones() {
    document.querySelectorAll('.review').forEach(f => {
      const stars = f.querySelector('.stars'), msg = f.querySelector('.msg'), lote = f.dataset.lote;
      const paint = n => {
        f.querySelectorAll('.star').forEach(s => { s.classList.toggle('on', +s.dataset.n <= n); s.setAttribute('aria-checked', +s.dataset.n === n); });
        stars.dataset.stars = n; msg.textContent = '';
      };
      f.querySelectorAll('.star').forEach(s => s.onclick = () => paint(+s.dataset.n));
      f.onsubmit = e => {
        e.preventDefault();
        const n = +stars.dataset.stars;
        if (!n) return msg.textContent = 'Elige una calificación de 1 a 5 estrellas.';
        const l = reviews().filter(r => !(r.email === user.email && r.lote === lote));
        l.push({ lote, email: user.email, stars: n, text: f.querySelector('textarea').value.trim(), fecha: new Date().toISOString() });
        localStorage.setItem(RK, JSON.stringify(l)); toast('Opinión guardada'); route();
      };
      const del = f.querySelector('[data-del]');
      if (del) del.onclick = async () => {
        if (!await askDialog({ icon: '🗑️', title: 'Eliminar opinión', text: 'Se borrarán tu calificación y tu descripción de este producto.', ok: 'Eliminar', danger: true })) return;
        localStorage.setItem(RK, JSON.stringify(reviews().filter(r => !(r.email === user.email && r.lote === lote)))); route();
      };
    });
  },

  pagos() {
    const f = $('#cf'); bindCardForm(f);
    f.onsubmit = e => {
      e.preventDefault(); const m = $('#cfmsg');
      const r = readCardForm(f); if (r.error) return m.textContent = r.error;
      const cs = cards();
      if (cs.some(c => c.marca === r.card.marca && c.last4 === r.card.last4 && c.vence === r.card.vence)) return m.textContent = 'Esa tarjeta ya está registrada.';
      if (!cs.length) r.card.pred = true;
      cs.push(r.card); saveCards(cs); toast('Tarjeta guardada'); route();
    };
    document.querySelectorAll('[data-pred]').forEach(b => b.onclick = () => { saveCards(cards().map(c => ({ ...c, pred: c.id === b.dataset.pred }))); route(); });
    document.querySelectorAll('[data-delc]').forEach(b => b.onclick = async () => {
      const c = cards().find(x => x.id === b.dataset.delc); if (!c) return;
      if (!await askDialog({ icon: '💳', title: 'Eliminar tarjeta', text: `Se quitará ${cardTxt(c)} de tus métodos de pago.`, ok: 'Eliminar', danger: true })) return;
      const cs = cards().filter(x => x.id !== c.id); if (cs.length && !cs.some(x => x.pred)) cs[0].pred = true;
      saveCards(cs); route();
    });
  },

  asistente() {
    const chat = $('#chat');
    const say = (html, me) => { const d = document.createElement('div'); d.className = 'bub' + (me ? ' me' : ''); d.innerHTML = html; chat.append(d); d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return d; };
    const reply = (p, asked) => {
      say(esc(asked), true);
      const d = say(p ? asistente.respuesta(p) : 'Todavía no reconozco esa planta. Elige una de las opciones de arriba o prueba con otro nombre (por ejemplo: tomate, rosal, limón, césped).');
      const b = d.querySelector('[data-cat]');
      if (b) b.onclick = () => { cat.tipo = b.dataset.cat; cat.q = ''; cat.disp = true; location.hash = '#/tienda'; };
    };
    say('¡Hola! 🌱 Soy el asistente de Lombriferti. Cuéntame qué planta tienes y te digo qué abono le conviene y en qué cantidad.');
    document.querySelectorAll('#aLugar .pill').forEach(b => b.onclick = () => {
      asistente.lugar = b.dataset.l; document.querySelectorAll('#aLugar .pill').forEach(x => x.classList.toggle('on', x === b));
    });
    document.querySelectorAll('#aChips .pill').forEach(b => b.onclick = () => { const p = PLANTAS[+b.dataset.i]; reply(p, p.n.split(' (')[0]); });
    $('#aForm').onsubmit = e => { e.preventDefault(); const t = $('#aQ').value.trim(); if (!t) return; reply(asistente.buscar(t), t); $('#aQ').value = ''; };
  },

  direccion() {
    const f = $('#af'), m = $('#amsg'), goBack = () => { if (sessionStorage.getItem('lf_back_cart')) { sessionStorage.removeItem('lf_back_cart'); location.hash = '#/carrito'; return true; } };
    f.querySelector('[name=tel]').oninput = e => { const d = e.target.value.replace(/\D/g, ''); e.target.value = (d.length > 10 && d.startsWith('52') ? d.slice(2) : d).slice(0, 10); };   // acepta 55 1234 5678 y +52 55 1234 5678
    f.querySelector('[name=cp]').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); };
    f.onsubmit = e => {
      e.preventDefault();
      const g = n => f.querySelector(`[name=${n}]`).value.trim(), a = { nombre: g('nombre'), tel: g('tel'), calle: g('calle'), colonia: g('colonia'), cp: g('cp'), ciudad: g('ciudad'), estado: g('estado'), ref: g('ref') };
      if (a.nombre.length < 3) return m.textContent = 'Escribe el nombre de quien recibe.';
      if (!/^\d{10}$/.test(a.tel)) return m.textContent = 'El teléfono debe tener 10 dígitos.';
      if (a.calle.length < 3) return m.textContent = 'Escribe la calle y el número.';
      if (!a.colonia) return m.textContent = 'Escribe la colonia.';
      if (!/^\d{5}$/.test(a.cp)) return m.textContent = 'El código postal debe tener 5 dígitos.';
      if (!a.ciudad) return m.textContent = 'Escribe la ciudad o municipio.';
      if (!a.estado) return m.textContent = 'Elige el estado.';
      const L = addrs(), old = L.find(x => x.id === adEdit);
      if (old) Object.assign(old, a); else L.push({ ...a, id: 'a' + Date.now().toString(36), pred: !L.length });
      saveAddrs(L); adEdit = null; toast('Dirección guardada');
      if (!goBack()) route();
    };
    const nw = f.querySelector('[data-new]'); if (nw) nw.onclick = () => { adEdit = null; route(); };
    $('#view').onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      const L = addrs();
      if (b.dataset.use) { L.forEach(x => { x.pred = x.id === b.dataset.use; }); saveAddrs(L); toast('Dirección predeterminada'); if (!goBack()) route(); }
      else if (b.dataset.edit) { adEdit = b.dataset.edit; route(); scrollTo(0, document.body.scrollHeight); }
      else if (b.dataset.del) {
        if (!await askDialog({ icon: '📍', title: 'Eliminar dirección', text: 'Esta dirección dejará de estar guardada.', ok: 'Eliminar', danger: true })) return;
        const R = L.filter(x => x.id !== b.dataset.del); if (R.length && !R.some(x => x.pred)) R[0].pred = true;
        saveAddrs(R); adEdit = null; route();
      }
    };
  },

  seguridad() {
    $('#pw').onsubmit = async e => {
      e.preventDefault();
      const m = $('#pwmsg'), cur = $('#pw0').value, nw = $('#pw1').value, cf = $('#pw2').value;
      m.className = 'msg';
      const us = JSON.parse(localStorage.getItem('lf_users') || '[]'), u = us.find(x => x.email === user.email);
      if (!u || u.hash !== await sha(cur)) return m.textContent = 'La contraseña actual no es correcta.';
      if (nw.length < 6) return m.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
      if (nw !== cf) return m.textContent = 'La confirmación no coincide con la nueva contraseña.';
      if (nw === cur) return m.textContent = 'La nueva contraseña debe ser distinta de la actual.';
      u.hash = await sha(nw); localStorage.setItem('lf_users', JSON.stringify(us));
      e.target.reset(); m.className = 'msg good'; m.textContent = 'Contraseña actualizada.';
    };
    const draw = () => {
      const l = allSessions().filter(s => s.email === user.email);
      $('#ses').innerHTML = l.map(s => `<div class="notif"><span><b>${esc(s.device)}</b>${s.sid === user.sid ? ' <span class="tag d">Esta sesión</span>' : ''}<br><small>Inicio: ${new Date(s.fecha).toLocaleString('es-MX')}</small></span>${s.sid === user.sid ? '' : `<button class="btn ghost sm" data-sid="${esc(s.sid)}">Cerrar</button>`}</div>`).join('')
        + (l.length > 1 ? '<div class="actions" style="margin-top:12px"><button class="btn ghost sm" id="others">Cerrar todas las demás</button></div>' : '');
      document.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => { dropSession(b.dataset.sid); draw(); toast('Sesión cerrada'); });
      if ($('#others')) $('#others').onclick = () => { l.filter(s => s.sid !== user.sid).forEach(s => dropSession(s.sid)); draw(); toast('Sesiones cerradas'); };
    };
    draw();
  },

  'ajustes-notif'() {
    document.querySelectorAll('[data-pref]').forEach(i => i.onchange = () => {
      const p = prefs(); p[i.dataset.pref] = i.checked; localStorage.setItem(PK, JSON.stringify(p));
      if (i.dataset.pref === 'reminders' && i.checked) sendReminder();
      badge(); toast('Preferencia guardada');
    });
  },

  conexiones() {
    document.querySelectorAll('[data-link]').forEach(b => b.onclick = async () => {
      const l = links(), k = b.dataset.link;
      if (l[k]) { if (!await askDialog({ icon: '🔌', title: 'Desvincular cuenta', text: 'Dejarás de poder iniciar sesión con esta cuenta. Puedes vincularla de nuevo cuando quieras.', ok: 'Desvincular', danger: true })) return; delete l[k]; } else l[k] = new Date().toISOString();
      localStorage.setItem(LK, JSON.stringify(l)); route();
    });
  },

  inicio() {
    extras.bindFirstSteps();
    const b = $('#lowst'); if (b) b.onclick = ev => { const x = ev.target.closest('[data-re]'); if (x) { lotEdit = x.dataset.re; location.hash = '#/productos'; } };
  },

  config() {
    extras.bindBackup(); tienda.bindAdminCode();
    const dd = $('#themeDd'), btn = dd.querySelector('.dd-btn'), menu = dd.querySelector('.dd-menu'), opts = [...menu.querySelectorAll('li')];
    const close = back => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (back) btn.focus(); };
    const choose = o => {
      lfTheme.set(o.dataset.mode); btn.firstElementChild.textContent = THEMES[o.dataset.mode];
      opts.forEach(x => x.setAttribute('aria-selected', x === o)); close(true);
    };
    btn.onclick = () => {
      if (!menu.hidden) return close();
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
      (opts.find(o => o.getAttribute('aria-selected') === 'true') || opts[0]).focus();
    };
    opts.forEach(o => o.onclick = () => choose(o));
    menu.onkeydown = e => {
      const i = opts.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(document.activeElement); }
      else if (e.key === 'Escape' || e.key === 'Tab') close(true);
    };
  },
};

/* ---------- navegación ---------- */
const menu = guest
  ? [['inicio', '🏠', 'Inicio'], ['tienda', '🛍️', 'Catálogo'], ['asistente', '💬', 'Asistente'], ['favoritos', '❤️', 'Favoritos']]
  : isClient
  ? [['inicio', '🏠', 'Inicio'], ['tienda', '🛍️', 'Catálogo'], ['asistente', '💬', 'Asistente'], ['compras', '📦', 'Mis compras'], ['config', '⚙️', 'Perfil']]
  : [['inicio', '🏠', 'Inicio'], ['productos', '🌱', 'Productos'], ['trazabilidad', '🔗', 'Trazabilidad'], ['ventas', '🛒', 'Ventas'], ['pedidos', '📦', 'Pedidos'], ['clientes', '👥', 'Clientes'], ['cupones', '🏷️', 'Cupones'], ['residuos', '♻️', 'Residuos'], ['reportes', '📊', 'Reportes'], ['config', '⚙️', 'Configuración']];
const THEMES = { light: '☀️ Claro', dark: '🌙 Oscuro', auto: '🖥️ Dispositivo' };
const SUB = ['seguridad', 'conexiones', 'ajustes-notif', ...(isClient ? ['favoritos', 'opiniones', 'pagos', 'direccion', 'miscupones'] : [])];
const INFO = ['producto', 'nosotros', 'faq', 'contacto', 'privacidad', 'terminos'];
const GUEST_OK = ['inicio', 'tienda', 'favoritos', 'asistente', ...INFO];
function route() {
  if (!guest && !allSessions().some(s => s.sid === user.sid)) return logoutNow();
  let k = (location.hash.slice(2).split('?')[0]) || 'inicio', gated = false;
  if (guest && !GUEST_OK.includes(k)) { gated = k !== 'inicio'; history.replaceState(null, '', '#/tienda'); k = 'tienda'; }
  const name = [...menu.map(m => m[0]), 'notificaciones', ...SUB, ...INFO, ...(isClient ? ['carrito'] : [])].includes(k) ? k : 'inicio';
  /* En celular el administrador ve 4 secciones abajo y el resto en "Más" (asi la barra no se desliza) */
  const isOn = m => m[0] === name || (m[0] === 'config' && SUB.includes(name)), MOB = isClient || guest ? null : ['inicio', 'productos', 'pedidos', 'reportes'];
  const xtra = MOB ? menu.filter(m => !MOB.includes(m[0])) : [];
  $('#nav').innerHTML = menu.map(m => `<a href="#/${m[0]}" class="${isOn(m) ? 'on' : ''}${MOB && !MOB.includes(m[0]) ? ' xtra' : ''}"><span>${m[1]}</span>${m[2]}</a>`).join('')
    + (MOB ? `<button type="button" class="more${xtra.some(isOn) ? ' on' : ''}" aria-haspopup="dialog"><span>☰</span>Más</button>` : '');
  const more = $('#nav .more');
  if (more) more.onclick = () => {
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Más secciones"><div class="sheet-grab"></div><div class="sheet-grid">${xtra.map(m => `<a href="#/${m[0]}" class="${isOn(m) ? 'on' : ''}"><span>${m[1]}</span>${m[2]}</a>`).join('')}</div></div>`;
    const close = () => { bg.remove(); document.removeEventListener('keydown', key); more.focus(); }, key = e => { if (e.key === 'Escape') close(); };
    bg.onclick = e => { if (e.target === bg || e.target.closest('a')) close(); };
    document.addEventListener('keydown', key); document.body.append(bg); bg.querySelector('a').focus();
  };
  if (name !== 'productos') lotEdit = null;
  $('#view').innerHTML = views[name]() + (isClient || guest ? tienda.footer() : '');   // el pie con informacion de la tienda es para clientes
  hooks[name]?.();
  $('#view').querySelectorAll('select').forEach(enhanceSelect);
    if (gated) setTimeout(() => requireLogin('Para ver esta sección necesitas una cuenta.'), 0);
}
Object.assign(views, window.adminViews || {}, window.tiendaViews || {}); Object.assign(hooks, window.adminHooks || {}, window.tiendaHooks || {});
load(); // migra datos de versiones anteriores al abrir la app
$('#uname').textContent = guest ? 'Invitado' : user.name + (isClient ? ' (Cliente)' : ' (Admin)');
$('#bell').onclick = () => location.hash = '#/notificaciones';
if (guest) { $('#bell').hidden = true; $('#av').hidden = true; $('#logout').textContent = 'Iniciar sesión'; $('#logout').className = 'btn sm'; }
else {
  checkReminder();
  badge();
  setInterval(() => { if (checkReminder()) { badge(); toast('🌱 Nuevo tip en tus notificaciones'); if (location.hash.startsWith('#/notificaciones')) route(); } }, 30000);
  // favoritos guardados como invitado se pasan a la cuenta
  const gf = JSON.parse(localStorage.getItem('lf_favs_guest') || '[]');
  if (gf.length) { localStorage.setItem(FK, JSON.stringify([...new Set([...favs(), ...gf])])); localStorage.removeItem('lf_favs_guest'); }
}
if (!guest) {
  // producto que quiso agregar al carrito antes de iniciar sesion
  const pend = JSON.parse(localStorage.getItem(PENDK) || 'null'); localStorage.removeItem(PENDK);
  if (pend && isClient) {
    const add = addGroup(groupOf(pend.lote), pend.qty);
    if (add) { location.hash = '#/carrito'; setTimeout(() => toast(`Agregado al carrito: ${add} ${add > 1 ? 'unidades' : 'unidad'}`), 300); }
  }
}
if (isClient && !guest) { $('#cartBtn').hidden = false; $('#cartBtn').onclick = () => location.hash = '#/carrito'; cartBadge(); }
$('#av').textContent = user.name[0].toUpperCase();
$('#logout').onclick = () => { if (guest) return location.href = 'login.html'; dropSession(user.sid); logoutNow(); };
addEventListener('storage', e => { if (!guest && e.key === 'lf_sessions' && !allSessions().some(s => s.sid === user.sid)) logoutNow(); });
addEventListener('click', e => {
  const m = document.querySelector('#themeDd .dd-menu');
  if (m && !m.hidden && !e.target.closest('#themeDd')) { m.hidden = true; document.querySelector('#themeDd .dd-btn').setAttribute('aria-expanded', 'false'); }
});
addEventListener('hashchange', route);
route();
