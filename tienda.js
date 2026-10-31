/* Funciones de tienda: detalle de producto con reseñas, pie de pagina y paginas informativas, Mis compras por pedido
   (detalle, comprar de nuevo), avisos de reabastecimiento, cupones y lista de clientes. */
(function () {
  const J = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } };
  const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const param = k => new URLSearchParams(location.hash.split('?')[1] || '').get(k);
  const userName = email => { const u = J('lf_users', '[]').find(x => x.email === email); if (!u) return 'Cliente'; const p = u.name.trim().split(/\s+/); return p[0] + (p[1] ? ' ' + p[1][0] + '.' : ''); };
  const starsTxt = n => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
  const USO = {
    'Lombriferti (fertilizante)': ['Mézclalo con la tierra al trasplantar o espárcelo alrededor de la planta.', 'Riega después de aplicarlo para que los nutrientes bajen a la raíz.', 'Repite cada 4 a 6 semanas en temporada de crecimiento.'],
    'Composta tradicional': ['Incorpórala a la tierra antes de sembrar para mejorar su textura.', 'En macetas, mezcla una parte de composta por tres de tierra.', 'Úsala como capa superficial para conservar la humedad.'],
    'Humus de lombriz': ['Aplica una capa delgada sobre la tierra sin tocar el tallo.', 'Es suave: sirve para plántulas, macetas y plantas de interior.', 'Repite cada 3 a 4 semanas y riega después.'],
  };
  const uso = t => USO[t] || ['Aplícalo sobre la tierra alrededor de la planta y riega después.'];

  /* ---------- Avisos de reabastecimiento ---------- */
  const WK = 'lf_watch', wkey = g => g.tipo + '|' + g.kg;
  const watching = g => !guest && J(WK, '[]').some(w => w.email === user.email && w.key === wkey(g));
  function toggleWatch(lote) {
    if (guest) return requireLogin('Para recibir un aviso cuando haya producto necesitas una cuenta.');
    const g = groupOf(lote); if (!g) return;
    const l = J(WK, '[]'), on = l.some(w => w.email === user.email && w.key === wkey(g));
    S(WK, on ? l.filter(w => !(w.email === user.email && w.key === wkey(g))) : [...l, { email: user.email, key: wkey(g), fecha: todayISO() }]);
    toast(on ? 'Ya no te avisaremos' : 'Te avisaremos cuando haya unidades');
  }
  function checkRestock() {
    const gs = groups(), keep = [];
    J(WK, '[]').forEach(w => {
      const g = gs.find(x => wkey(x) === w.key && x.stock > 0);
      if (g) notify(w.email, `🔔 Ya hay ${pname(g)} disponible. ¡Aprovecha antes de que se agote!`); else keep.push(w);
    });
    S(WK, keep);
  }

  /* ---------- Cupones ---------- */
  const CK = 'lf_coupons', coupons = () => J(CK, '[]'), ACK = () => 'lf_coupon_' + user.email;
  const applied = () => { try { return sessionStorage.getItem(ACK()) || ''; } catch (e) { return ''; } };
  const setApplied = c => { try { c ? sessionStorage.setItem(ACK(), c) : sessionStorage.removeItem(ACK()); } catch (e) { } };
  /* Un cupon aplica a toda la tienda (aplica: 'todos') o a un tipo de producto (aplica: 'Humus de lombriz', ...).
     - Porcentaje: se descuenta de TODAS las unidades de los productos que aplican.
     - Monto fijo: se descuenta una sola vez por compra (sin pasar del importe de esos productos).
     - La compra minima se mide sobre todo el carrito.
     lines = [{ tipo, precio, q }]. Devuelve { code, desc, base } o { error }. */
  const aplicaTxt = c => !c.aplica || c.aplica === 'todos' ? 'toda la tienda' : c.aplica;
  const descTxt = c => `${c.tipo === 'pct' ? c.valor + '%' : money(c.valor)} de descuento en ${aplicaTxt(c)}${c.minimo ? ` (compras desde ${money(c.minimo)})` : ''}`;
  function couponFor(lines, code = applied()) {
    if (!code) return null;
    const c = coupons().find(x => x.code === code.toUpperCase());
    if (!c || !c.activo) return { error: 'Ese cupón no existe o ya no está activo.' };
    const sub = lines.reduce((a, l) => a + l.q * l.precio, 0);
    if (sub < c.minimo) return { error: `Este cupón aplica en compras desde ${money(c.minimo)}.` };
    const base = lines.filter(l => !c.aplica || c.aplica === 'todos' || l.tipo === c.aplica).reduce((a, l) => a + l.q * l.precio, 0);
    if (!base) return { error: `Este cupón solo aplica a ${c.aplica}. Agrégalo a tu carrito para usarlo.` };
    return { code: c.code, base, aplica: aplicaTxt(c), desc: Math.min(base, c.tipo === 'pct' ? Math.round(base * c.valor / 100) : c.valor) };
  }
  /* Cupones que el cliente puede ver: los del banner y los que el administrador le envio */
  const misCupones = () => guest ? [] : coupons().filter(c => c.activo && (c.banner || (c.para || []).includes(user.email)));
  const bannerHtml = () => {
    const c = coupons().filter(x => x.activo && x.banner).pop(); if (!c) return '';
    return `<div class="promo"><span class="promo-ic" aria-hidden="true">🏷️</span><span><b>${esc(descTxt(c))}</b><br><small>Usa el código <b>${esc(c.code)}</b> en tu carrito.</small></span><button class="btn sm" data-promo="${esc(c.code)}">${applied() === c.code ? '✓ Cupón listo' : 'Usar cupón'}</button></div>`;
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-promo]'); if (!b) return;
    if (guest) return requireLogin('Para usar un cupón necesitas una cuenta.');
    setApplied(b.dataset.promo); toast('Cupón listo: se aplicará en tu carrito');
    if (b.dataset.go) location.hash = '#/carrito'; else b.textContent = '✓ Cupón listo';
  });
  const useCoupon = code => { const l = coupons(), c = l.find(x => x.code === code); if (c) { c.usos = (c.usos || 0) + 1; S(CK, l); } setApplied(''); };

  /* ---------- Historial con fechas reales ---------- */
  const fechaDe = (o, e) => (o.hist && o.hist[e]) || (e === 'pendiente' ? o.fecha : null);
  const estimada = o => { const e = adminData.estadoDe(o); return e === 'entregado' || e === 'cancelado' ? null : addDays(o.fecha, 5); };

  /* ---------- Pie de pagina ---------- */
  const footer = () => `<footer class="foot"><div><b>🌿 Lombriferti</b><p class="mut">Fertilizante orgánico hecho con residuos de mercado.</p></div>
    <nav aria-label="Información"><a href="#/nosotros">Quiénes somos</a><a href="#/faq">Preguntas frecuentes</a><a href="#/contacto">Contacto</a><a href="#/privacidad">Aviso de privacidad</a><a href="#/terminos">Términos y condiciones</a></nav>
    <small class="mut">© ${new Date().getFullYear()} Lombriferti · Proyecto académico</small></footer>`;
  const info = (t, body) => `<p><a href="#/${isClient || guest ? 'tienda' : 'inicio'}">← Volver</a></p><h1>${t}</h1><div class="panel prose" style="max-width:760px">${body}</div>`;
  const FAQ = () => [
    ['¿Qué es Lombriferti?', 'Es un fertilizante orgánico que hacemos con residuos de frutas y verduras de mercados locales, transformados con lombrices y composta.'],
    ['¿Cuál producto me conviene?', 'Usa el Asistente Experto: eliges tu planta y te recomienda el producto y una cantidad orientativa. El humus de lombriz es el más suave, ideal para macetas.'],
    ['¿Cuánto cuesta el envío?', `Depende del peso del pedido, desde ${money(ENVIO.tramos[0][1])}. Es gratis en compras desde ${money(ENVIO.gratisDesde)}.`],
    ['¿Puedo cancelar mi pedido?', 'Sí, desde Mis compras, mientras esté pendiente o en preparación. Las unidades regresan al inventario.'],
    ['¿Para qué sirve el código QR?', 'Al escanearlo ves de qué lote viene tu producto, cuándo se produjo y si los datos del código son auténticos.'],
    ['¿Cómo pago?', 'Con tarjeta de crédito o débito, o en efectivo al recibir. En esta versión de demostración el pago es simulado.'],
  ];

  /* ---------- Mis compras por pedido ---------- */
  function orderCard(o) {
    const e = adminData.estadoDe(o), est = estimada(o), canCancel = ['pendiente', 'preparando'].includes(e);
    return `<div class="panel ord"><div class="ord-h"><div><b>Pedido #${esc(o.num || o.id)}</b><br><small class="mut">${fmt(o.fecha)} · ${o.items.reduce((a, i) => a + i.qty, 0)} ${o.items.length === 1 && o.items[0].qty === 1 ? 'unidad' : 'unidades'} · ${money(o.total)}</small></div>${est ? `<small class="mut">Entrega estimada: <b>${fmt(est)}</b></small>` : ''}</div>
      ${adminData.track(e, o)}
      <ul class="ord-i">${mergeItems(o.items).map(i => `<li>${i.qty} × ${esc(pname(i))}</li>`).join('')}</ul>
      <div class="actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn sm" data-od="${o.id}">Ver detalle</button><button class="btn sm ghost" data-again="${o.id}">Comprar de nuevo</button>${canCancel ? `<button class="btn sm ghost" data-co="${o.id}">Cancelar pedido</button>` : ''}</div></div>`;
  }
  function orderDetail(o) {
    const e = adminData.estadoDe(o), est = estimada(o);
    const m = modal(`<div class="modal-ic">📦</div><h2 id="mdt">Pedido #${esc(o.num || o.id)}</h2>
      ${adminData.track(e, o)}
      <dl class="receipt">
        ${o.items.map(i => `<div><dt>${i.qty} × ${esc(pname(i))}<br><small class="mut">Lote ${esc(i.lote)}</small></dt><dd>${money(i.qty * i.precio)}</dd></div>`).join('')}
        ${o.subtotal != null ? `<div><dt>Subtotal</dt><dd>${money(o.subtotal)}</dd></div>` : ''}
        ${o.descuento ? `<div><dt>Descuento (${esc(o.cupon)})</dt><dd>−${money(o.descuento)}</dd></div>` : ''}
        ${o.envio != null ? `<div><dt>Envío</dt><dd>${o.envio ? money(o.envio) : 'Gratis'}</dd></div>` : ''}
        <div><dt><b>Total</b></dt><dd><b>${money(o.total)}</b></dd></div>
        <div><dt>Pago</dt><dd>${esc(payTxt(o.pago))}</dd></div>
        <div><dt>Fecha de compra</dt><dd>${fmt(o.fecha)}</dd></div>
        ${est ? `<div><dt>Entrega estimada</dt><dd>${fmt(est)}</dd></div>` : ''}
        ${o.dir ? `<div><dt>Enviar a</dt><dd>${esc(o.dir.nombre)} · ${esc(addrTxt(o.dir))}</dd></div>` : ''}
      </dl>
      <div class="actions" style="flex-wrap:wrap"><button class="btn ghost" type="button" data-pr>🖨️ Comprobante</button><button class="btn ghost" type="button" data-ag>Comprar de nuevo</button><button class="btn" type="button" data-ok>Cerrar</button></div>`);
    m.el.querySelector('[data-ok]').onclick = () => m.close();
    m.el.querySelector('[data-pr]').onclick = () => { m.close(); extras.printReceipt(o); };
    m.el.querySelector('[data-ag]').onclick = () => { m.close(); buyAgain(o); };
    m.el.querySelector('[data-ok]').focus();
  }
  function buyAgain(o) {
    let n = 0, miss = 0;
    o.items.forEach(i => { const g = groups().find(x => x.tipo === i.tipo && x.kg === i.kg && x.stock > 0); if (!g) { miss += i.qty; return; } const a = addGroup(g, i.qty); n += a; miss += i.qty - a; });
    if (!n) return toast('Esos productos ya no tienen unidades disponibles.');
    toast(miss ? `Agregamos ${n} al carrito; ${miss} ya no están disponibles.` : `Agregamos ${n} ${n > 1 ? 'unidades' : 'unidad'} al carrito`);
    location.hash = '#/carrito';
  }

  /* ---------- Detalle de producto ---------- */
  function productoHtml() {
    const g = groupOf(param('l') || '');
    if (!g) return `<p><a href="#/tienda">← Volver al catálogo</a></p><div class="panel empty">Este producto ya no existe.<p><a href="#/tienda">Ir al catálogo</a></p></div>`;
    const r = rateG(g), rv = reviews().filter(v => g.lotes.some(p => p.lote === v.lote)).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const f = favs().some(l => g.lotes.some(p => p.lote === l));
    const rel = groups().filter(x => x !== g && x.lote !== g.lote && x.stock > 0).sort((a, b) => (b.tipo === g.tipo) - (a.tipo === g.tipo) || b.stock - a.stock).slice(0, 3);
    return `<p><a href="#/tienda">← Volver al catálogo</a></p>
    <div class="pdet">
      <div class="pdet-img">${/^data:image\//.test(g.foto || '') ? `<img src="${g.foto}" alt="${esc(pname(g))}">` : `<span aria-hidden="true">${ico(g.tipo)}</span>`}</div>
      <div class="card pdet-info">
        <button class="fav${f ? ' on' : ''}" data-fav="${esc(g.lote)}" aria-pressed="${f}" aria-label="${f ? 'Quitar de favoritos' : 'Guardar en favoritos'}">${f ? '♥' : '♡'}</button>
        <h1 style="margin:0">${esc(g.tipo)}</h1><p class="mut" style="margin:2px 0 6px">Presentación de ${g.kg} kg</p>
        ${r.n ? `<a href="#resenas" class="rate" style="text-decoration:none">${starsTxt(r.avg)} ${r.avg.toFixed(1)} · ${r.n} ${r.n === 1 ? 'opinión' : 'opiniones'}</a>` : '<small class="mut">Aún sin opiniones</small>'}
        <div class="price" style="font-size:30px;margin:8px 0">${money(g.precio)}</div>
        <p>${esc(g.desc || 'Fertilizante orgánico de composta y lombrices.')}</p>
        <div>${g.stock <= 0 ? '<span class="tag x">Agotado</span>' : g.stock <= 3 ? `<span class="tag w">¡Últimas ${g.stock}!</span>` : `<span class="mut">${g.stock} disponibles</span>`}</div>
        ${cardAct(g)}
        <small class="mut">🚚 Envío gratis desde ${money(ENVIO.gratisDesde)} · 🔗 Incluye código QR de trazabilidad</small>
      </div>
    </div>
    <div class="panel"><h2>Cómo usarlo</h2><ul>${uso(g.tipo).map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="mut" style="margin:0"><small>¿Dudas sobre tu planta? <a href="#/asistente">Pregúntale al asistente</a>.</small></p></div>
    <div class="panel" id="resenas"><h2>Opiniones de clientes</h2>${rv.length ? `<p><b class="rate" style="font-size:20px">${r.avg.toFixed(1)}</b> <span class="rate">${starsTxt(r.avg)}</span> <span class="mut">de ${r.n} ${r.n === 1 ? 'opinión' : 'opiniones'}</span></p>` + rv.map(v => `<div class="rev"><div><b>${esc(userName(v.email))}</b> <span class="rate">${starsTxt(v.stars)}</span> <small class="mut">${fmt(ymd(new Date(v.fecha)))}</small></div>${v.text ? `<p>${esc(v.text)}</p>` : ''}</div>`).join('') : '<p class="mut">Aún no hay opiniones. Cuando compres este producto podrás calificarlo en Perfil → Mis opiniones.</p>'}</div>
    ${rel.length ? `<h2>También te puede interesar</h2><div class="cards">${rel.map(productCard).join('')}</div>` : ''}`;
  }

  /* ---------- Admin: clientes y cupones ---------- */
  let cq = '';
  function clientesHtml() {
    const os = orders(), users = J('lf_users', '[]').filter(u => u.role !== 'Administrador');
    const m = new Map(users.map(u => [u.email, { name: u.name, email: u.email, phone: u.phone || '', n: 0, total: 0, last: '' }]));
    os.filter(o => o.email).forEach(o => {
      if (!m.has(o.email)) m.set(o.email, { name: o.name || o.email, email: o.email, phone: '', n: 0, total: 0, last: '' });
      const c = m.get(o.email); if (adminData.valid(o)) { c.n++; c.total += o.total || 0; } if (o.fecha > c.last) c.last = o.fecha;
    });
    const q = lfNorm(cq), list = [...m.values()].filter(c => !q || lfNorm(c.name + ' ' + c.email + ' ' + c.phone).includes(q)).sort((a, b) => b.total - a.total);
    return list.length ? `<div class="table stack"><table><thead><tr><th>Cliente</th><th>Teléfono</th><th>Pedidos</th><th>Total comprado</th><th>Última compra</th></tr></thead><tbody>${list.map(c => `<tr><td data-l="Cliente"><b>${esc(c.name)}</b><br><small class="mut">${esc(c.email)}</small></td><td data-l="Teléfono">${esc(c.phone || '—')}</td><td data-l="Pedidos">${c.n}</td><td data-l="Total">${money(c.total)}</td><td data-l="Última compra">${c.last ? fmt(c.last) : '—'}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="panel empty">${cq ? 'No hay clientes que coincidan con la búsqueda.' : 'Aún no hay clientes. Cuando alguien cree su cuenta o compre, aparecerá aquí.'}</div>`;
  }
  function cuponesHtml() {
    const l = coupons();
    return `<form class="panel" id="fcup" style="max-width:760px" novalidate><h2>Nuevo cupón</h2>
      <div class="row2"><label>Código<input id="cp_code" maxlength="15" placeholder="Ej. HUERTO10" autocapitalize="characters"></label>
      <label>Aplica a<select id="cp_apl"><option value="todos">Todos los productos</option>${TIPOS.map(x => `<option>${esc(x)}</option>`).join('')}</select></label></div>
      <div class="row2"><label>Tipo de descuento<select id="cp_tipo"><option value="pct">Porcentaje (%)</option><option value="fijo">Monto fijo (MXN), una vez por compra</option></select></label><label>Valor<input id="cp_val" type="number" min="1" step="1" placeholder="10"></label></div>
      <div class="row2"><label>Compra mínima del carrito (MXN)<input id="cp_min" type="number" min="0" step="1" value="0"></label><label class="switch" style="align-self:end"><span><b>Mostrar en el catálogo</b><br><small class="mut">Banner visible para todos</small></span><input type="checkbox" role="switch" id="cp_ban"></label></div>
      <p class="msg" id="cp_msg" role="alert"></p><div class="actions"><button class="btn">Crear cupón</button></div></form>
      <h2>Cupones</h2>${l.length ? `<div class="table stack"><table><thead><tr><th>Código</th><th>Descuento</th><th>Mínimo</th><th>Usos</th><th>Estado</th><th></th></tr></thead><tbody>${l.map(c => `<tr><td data-l="Código"><b>${esc(c.code)}</b>${c.banner ? '<br><small class="mut">En el catálogo</small>' : ''}${(c.para || []).length ? `<br><small class="mut">Enviado a ${c.para.length} ${c.para.length === 1 ? 'cliente' : 'clientes'}</small>` : ''}</td><td data-l="Descuento">${c.tipo === 'pct' ? c.valor + '%' : money(c.valor)}<br><small class="mut">${esc(aplicaTxt(c))}</small></td><td data-l="Mínimo">${c.minimo ? money(c.minimo) : 'Sin mínimo'}</td><td data-l="Usos">${c.usos || 0}</td><td data-l="Estado">${c.activo ? '<span class="tag d">Activo</span>' : '<span class="tag v">Pausado</span>'}</td><td><div class="actions" style="justify-content:flex-start;flex-wrap:wrap;margin:0"><button class="btn sm" data-cs="${esc(c.code)}"${c.activo ? '' : ' disabled'}>Enviar a clientes</button><button class="btn sm ghost" data-cb="${esc(c.code)}">${c.banner ? 'Quitar del catálogo' : 'Mostrar en catálogo'}</button><button class="btn sm ghost" data-ct="${esc(c.code)}">${c.activo ? 'Pausar' : 'Activar'}</button><button class="btn sm ghost" data-cd="${esc(c.code)}">Eliminar</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="panel empty">Aún no hay cupones.</div>'}`;

  }

  /* ---------- Codigo de administrador ---------- */
  const ADK = 'lf_admin_code', adminCode = () => localStorage.getItem(ADK) || 'LOMBRI-2026';
  const adminCodeHtml = () => `<div class="panel" style="max-width:480px"><h2>Código de administrador</h2>
    <p class="sub" style="margin:0 0 10px;font-size:13px">Las cuentas nuevas siempre son de cliente. Para crear otra cuenta de administrador, comparte este código: se escribe al registrarse.</p>
    <p style="font-size:20px;margin:0 0 10px"><b id="acode">${esc(adminCode())}</b></p><button class="btn sm ghost" id="acode-new">Generar código nuevo</button></div>`;
  function bindAdminCode() {
    const b = document.getElementById('acode-new'); if (!b) return;
    b.onclick = async () => {
      if (!await askDialog({ icon: '🔑', title: '¿Generar un código nuevo?', text: 'El código anterior dejará de funcionar para nuevos registros.', ok: 'Generar' })) return;
      const c = 'LOMBRI-' + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(10 + Math.random() * 90);
      localStorage.setItem(ADK, c); document.getElementById('acode').textContent = c; toast('Código nuevo generado');
    };
  }

  window.tienda = { footer, cardWatch: g => watching(g), toggleWatch, checkRestock, couponFor, applied, setApplied, useCoupon, bannerHtml, misCupones, fechaDe, adminCodeHtml, bindAdminCode };

  window.tiendaViews = {
    producto: productoHtml,
    compras: () => {
      const os = orders().filter(o => o.email === user.email).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
      return `<h1>Mis compras</h1>` + (os.length ? os.map(orderCard).join('') : `<div class="panel empty">Aún no has comprado nada.<p><a href="#/tienda">Ir al catálogo</a></p></div>`);
    },
    nosotros: () => info('Quiénes somos', `<p>Lombriferti nace de una idea sencilla: los mercados tiran todos los días toneladas de frutas y verduras que todavía pueden aprovecharse.</p><p>Recogemos esos residuos orgánicos con los mercaderos, los transformamos con lombrices y composta, y los convertimos en fertilizante natural para huertos, jardines y macetas.</p><p>Cada lote se registra desde que llegan los residuos hasta que se vende, y cada producto trae un código QR para que sepas de dónde viene.</p><p class="mut"><small>Lombriferti es un proyecto académico.</small></p>`),
    faq: () => info('Preguntas frecuentes', FAQ().map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')),
    contacto: () => info('Contacto', `<p>¿Tienes dudas sobre un producto o un pedido? Escríbenos y te responderemos lo antes posible.</p>
      <form id="fct" novalidate><div class="row2"><label>Nombre<input id="ct_n" value="${guest ? '' : esc(user.name)}"></label><label>E-mail<input id="ct_e" type="email" value="${guest ? '' : esc(user.email)}"></label></div>
      <label>Mensaje<textarea id="ct_m" rows="4" maxlength="800"></textarea></label><p class="msg" id="ct_msg" role="alert"></p><div class="actions"><button class="btn">Enviar mensaje</button></div></form>`),
    privacidad: () => info('Aviso de privacidad', `<p><b>Plantilla para el proyecto.</b> Antes de vender de forma real, este aviso debe revisarse conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</p><p><b>Datos que recabamos:</b> nombre, e-mail, teléfono, direcciones de entrega e historial de compras. De las tarjetas solo se guardan la marca y los últimos 4 dígitos.</p><p><b>Para qué los usamos:</b> procesar y entregar tus pedidos, avisarte de su estado y atender tus dudas.</p><p><b>Con quién los compartimos:</b> solo con quien entrega tu pedido. No vendemos tus datos.</p><p><b>Tus derechos:</b> puedes pedir acceder, corregir o eliminar tus datos escribiéndonos desde Contacto.</p>`),
    terminos: () => info('Términos y condiciones', `<p><b>Plantilla para el proyecto.</b> Debe revisarse antes de vender de forma real.</p><p><b>Precios:</b> están en pesos mexicanos e incluyen impuestos. El envío se calcula según el peso y es gratis desde ${money(ENVIO.gratisDesde)}.</p><p><b>Pedidos:</b> puedes cancelar mientras el pedido esté pendiente o en preparación. Una vez enviado ya no se puede cancelar.</p><p><b>Producto:</b> es un fertilizante orgánico; las cantidades recomendadas son orientativas y pueden variar según la planta y el clima.</p><p><b>Cupones:</b> un cupón por compra, sujeto a su compra mínima y vigencia.</p>`),
    miscupones: () => { const l = misCupones(); return `<p><a href="#/config">← Volver al perfil</a></p><h1>Mis cupones</h1><p class="sub">Descuentos disponibles para ti.</p>` + (l.length ? `<div class="cards">${l.map(c => `<div class="card coup"><div class="coup-code">${esc(c.code)}</div><b>${esc(c.tipo === 'pct' ? c.valor + '% de descuento' : money(c.valor) + ' de descuento')}</b><p>En ${esc(aplicaTxt(c))}${c.minimo ? `, en compras desde ${money(c.minimo)}` : ''}.${c.tipo === 'fijo' ? ' Se descuenta una vez por compra.' : ''}</p><button class="btn${applied() === c.code ? ' ghost' : ''}" data-promo="${esc(c.code)}" data-go="1">${applied() === c.code ? '✓ Listo · Ir al carrito' : 'Usar en mi carrito'}</button></div>`).join('')}</div>` : '<div class="panel empty">🏷️<p>Por ahora no tienes cupones. Cuando la tienda te envíe uno, aparecerá aquí y te llegará una notificación.</p></div>'); },
    clientes: () => `<h1>Clientes</h1><p class="sub">Quiénes te compran y cuánto.</p><div class="bar"><input id="cq" type="search" placeholder="Buscar por nombre, e-mail o teléfono…" value="${esc(cq)}"></div><div id="clist">${clientesHtml()}</div>`,
    cupones: () => `<h1>Cupones de descuento</h1><p class="sub">Crea códigos que tus clientes pueden aplicar en el carrito.</p>${cuponesHtml()}`,
  };

  window.tiendaHooks = {
    producto() { bindCards($('#view'), () => { const y = scrollY; route(); scrollTo(0, y); }); },
    compras() {
      $('#view').onclick = async e => {
        const b = e.target.closest('button[data-od],button[data-again],button[data-co]'); if (!b) return;
        const o = orders().find(x => x.id === (b.dataset.od || b.dataset.again || b.dataset.co)); if (!o) return;
        if (b.dataset.od) orderDetail(o); else if (b.dataset.again) buyAgain(o); else if (await adminData.cancelOrder(o.id, 'cliente')) route();
      };
    },
    contacto() {
      $('#fct').onsubmit = e => {
        e.preventDefault();
        const n = $('#ct_n').value.trim(), m = $('#ct_e').value.trim(), t = $('#ct_m').value.trim(), msg = $('#ct_msg');
        if (n.length < 2) return msg.textContent = 'Escribe tu nombre.';
        if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(m)) return msg.textContent = 'Escribe un e-mail válido.';
        if (t.length < 5) return msg.textContent = 'Escribe tu mensaje.';
        notify('admin', `✉️ Mensaje de ${n} (${m}): ${t}`); msg.textContent = '';
        $('#ct_m').value = ''; toast('Mensaje enviado. Te responderemos pronto.');
      };
    },
    clientes() { $('#cq').oninput = e => { cq = e.target.value; $('#clist').innerHTML = clientesHtml(); }; },
    cupones() {
      $('#cp_code').oninput = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); };
      $('#fcup').onsubmit = e => {
        e.preventDefault();
        const msg = $('#cp_msg'), code = $('#cp_code').value.trim(), tipo = $('#cp_tipo').value, valor = Math.round(+$('#cp_val').value || 0), minimo = Math.max(0, Math.round(+$('#cp_min').value || 0));
        if (code.length < 3) return msg.textContent = 'El código debe tener al menos 3 caracteres.';
        if (coupons().some(c => c.code === code)) return msg.textContent = 'Ya existe un cupón con ese código.';
        if (valor < 1 || (tipo === 'pct' && valor > 90)) return msg.textContent = tipo === 'pct' ? 'El porcentaje debe estar entre 1 y 90.' : 'El monto debe ser mayor a 0.';
        const banner = $('#cp_ban').checked, l = coupons().map(c => banner ? { ...c, banner: false } : c);   // un solo banner a la vez
        S(CK, [...l, { code, tipo, valor, minimo, aplica: $('#cp_apl').value, banner, activo: true, usos: 0, para: [], fecha: todayISO() }]); toast('Cupón creado'); route();
      };
      $('#view').onclick = async e => {
        const b = e.target.closest('button[data-ct],button[data-cd],button[data-cb],button[data-cs]'); if (!b) return;
        const l = coupons(), c = l.find(x => x.code === (b.dataset.ct || b.dataset.cd || b.dataset.cb || b.dataset.cs)); if (!c) return;
        if (b.dataset.ct) { c.activo = !c.activo; S(CK, l); return route(); }
        if (b.dataset.cb) { const on = !c.banner; l.forEach(x => { x.banner = false; }); c.banner = on; S(CK, l); toast(on ? 'El cupón se muestra en el catálogo' : 'Cupón quitado del catálogo'); return route(); }
        if (b.dataset.cs) {
          const emails = [...new Set([...J('lf_users', '[]').filter(u => u.role !== 'Administrador').map(u => u.email), ...orders().map(o => o.email).filter(Boolean)])];
          if (!emails.length) return toast('Todavía no hay clientes a quién enviarlo.');
          if (!await askDialog({ icon: '🏷️', title: `¿Enviar ${c.code} a ${emails.length} ${emails.length === 1 ? 'cliente' : 'clientes'}?`, text: 'Les llegará una notificación y lo verán en Mis cupones.', ok: 'Enviar' })) return;
          emails.forEach(m => notify(m, `🏷️ Tienes un cupón: ${descTxt(c)}. Usa el código ${c.code} en tu carrito o búscalo en Perfil → Mis cupones.`));
          c.para = [...new Set([...(c.para || []), ...emails])]; S(CK, l); toast('Cupón enviado'); return route();
        }
        if (!await askDialog({ icon: '🏷️', title: '¿Eliminar el cupón ' + c.code + '?', ok: 'Eliminar', danger: true })) return;
        S(CK, l.filter(x => x.code !== c.code)); route();
      };
    },
  };
})();
