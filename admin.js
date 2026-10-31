/* Modulos del Administrador: Pedidos, Residuos y costos, Reportes.
   Todo se guarda en localStorage (claves lf_waste, lf_costs, lf_orders). Ver INTEGRACION.md para conectarlo a la base de datos real. */
(function () {
  const WK = 'lf_waste', CK = 'lf_costs';
  const DB = {
    get: k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  };
  const waste = () => DB.get(WK), costs = () => DB.get(CK);
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const ESTADOS = ['pendiente', 'preparando', 'enviado', 'entregado'];
  const ETIQ = { pendiente: 'Pendiente', preparando: 'Preparando', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado' };
  const estadoDe = o => o.estado || 'entregado';   // pedidos antiguos sin estado se consideran entregados
  const valid = o => estadoDe(o) !== 'cancelado';
  const totalOf = o => o.total != null ? o.total : o.items.reduce((a, i) => a + i.qty * i.precio, 0);
  const money = n => { n = Math.round(n * 100) / 100; return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('es-MX') + ' MXN'; };
  const num = v => Math.max(0, +v || 0);
  const mesDe = iso => iso.slice(0, 7);
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesTxt = m => MESES[+m.slice(5) - 1] + ' ' + m.slice(2, 4);
  const lastMonths = n => { const r = [], d = new Date(); d.setDate(1); for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); r.push(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0')); } return r; };
  const tag = e => `<span class="tag ${e === 'entregado' ? 'd' : e === 'cancelado' ? 'x' : 'w'}">${ETIQ[e]}</span>`;

  function csv(name, rows) {
    const t = '﻿' + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.append(a); a.click(); a.remove();
  }
  const bars = (rows, fmtv) => {
    const mx = Math.max(1, ...rows.map(r => r[1]));
    return rows.map(r => `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;font-size:14px"><span style="width:92px;flex:none">${esc(r[0])}</span><div style="flex:1;background:var(--line);border-radius:6px;height:14px;overflow:hidden"><div style="width:${Math.round(r[1] / mx * 100)}%;height:100%;background:var(--g)"></div></div><b style="min-width:70px;text-align:right">${fmtv(r[1])}</b></div>`).join('');
  };

  /* ---------- Pedidos ---------- */
  /* Cancelar un pedido (lo usan el administrador y el cliente): regresa el stock y avisa a la otra parte. */
  async function cancelOrder(id, by) {
    const l = orders(), o = l.find(x => x.id === id); if (!o || !['pendiente', 'preparando'].includes(estadoDe(o))) { toast('Este pedido ya no se puede cancelar.'); return false; }
    if (!await askDialog({ icon: '⚠️', title: '¿Cancelar este pedido?', text: by === 'cliente' ? 'Se cancelará tu compra y no se te hará el envío.' : 'Las unidades regresarán al inventario.', ok: 'Sí, cancelar', cancel: 'Volver', danger: true })) return false;
    const d = load(); o.items.forEach(i => { const p = d.find(x => x.lote === i.lote); if (p) p.stock += i.qty; });
    save(d); o.estado = 'cancelado'; o.hist = { ...(o.hist || {}), cancelado: todayISO() }; localStorage.setItem('lf_orders', JSON.stringify(l)); tienda.checkRestock();
    const n = '#' + (o.num || o.id);
    if (by === 'cliente') notify('admin', `❌ ${o.name || o.email} canceló su pedido ${n}.`);
    if (o.email) notify(o.email, `❌ Tu pedido ${n} fue cancelado.`);
    toast('Pedido cancelado'); return true;
  }
  let filtro = 'todos';
  function pedidosHtml() {
    const all = orders().slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
    const list = all.filter(o => filtro === 'todos' || estadoDe(o) === filtro);
    const cnt = e => all.filter(o => estadoDe(o) === e).length;
    const pills = ['todos', ...ESTADOS, 'cancelado'].map(e => `<button class="pill ${filtro === e ? 'on' : ''}" aria-pressed="${filtro === e}" data-f="${e}">${e === 'todos' ? 'Todos' : ETIQ[e]} (${e === 'todos' ? all.length : cnt(e)})</button>`).join(' ');
    const rows = list.map(o => {
      const e = estadoDe(o), i = ESTADOS.indexOf(e), sig = i >= 0 && i < ESTADOS.length - 1 ? ESTADOS[i + 1] : null;
      return `<tr><td data-l="Pedido"><b>${esc(o.num || o.id)}</b></td><td data-l="Cliente">${esc(o.name || o.email || 'Venta directa')}</td><td data-l="Productos">${o.items.map(x => esc(x.tipo) + ' · ' + x.kg + ' kg × ' + x.qty).join('<br>')}</td><td data-l="Total">${money(totalOf(o))}</td><td data-l="Fecha">${fmt(o.fecha)}</td><td data-l="Estado">${tag(e)}${o.hist && o.hist[e] ? `<br><small class="mut">desde ${fmt(o.hist[e])}</small>` : ''}</td><td data-l="Acciones">${sig ? `<button class="btn sm" data-next="${o.id}">Marcar ${ETIQ[sig].toLowerCase()}</button> ` : ''}${e !== 'cancelado' && e !== 'entregado' ? `<button class="btn sm ghost" data-cancel="${o.id}">Cancelar</button>` : ''}</td></tr>`;
    }).join('');
    return `<div class="bar" style="flex-wrap:wrap">${pills}</div>` + (list.length
      ? `<div class="table stack"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="panel empty">No hay pedidos en esta categoría.</div>`);
  }

  /* ---------- Residuos y costos ---------- */
  function residuosHtml() {
    const w = waste().sort((a, b) => b.fecha.localeCompare(a.fecha)), c = costs().sort((a, b) => b.fecha.localeCompare(a.fecha));
    const kg = w.reduce((a, x) => a + x.kg, 0), pagoW = w.reduce((a, x) => a + x.kg * x.costoKg, 0), gastos = c.reduce((a, x) => a + x.monto, 0), tot = pagoW + gastos;
    return `<div class="stats">
      <div class="stat"><div class="e">♻️</div><b>${kg} kg</b><span>Residuos recibidos</span></div>
      <div class="stat"><div class="e">💰</div><b>${money(tot).replace(' MXN', '')}</b><span>Costo total (MXN)</span></div>
      <div class="stat"><div class="e">⚖️</div><b>${kg ? money(tot / kg).replace(' MXN', '') : '—'}</b><span>Costo por kg (MXN)</span></div>
    </div>
    <div class="agrid">
      <form class="panel" id="fw"><h2>Recepción de residuos</h2>
        <label>Mercadero / proveedor<input id="w_prov" required maxlength="60"></label>
        <div class="row2"><label>Kg recibidos<input id="w_kg" type="number" min="1" step="any" required></label><label>Pago por kg (MXN)<input id="w_ckg" type="number" min="0" step="any" value="0"></label></div>
        <div class="row2"><label>Tipo de residuo<select id="w_tipo"><option>Verduras</option><option>Frutas</option><option>Mezcla orgánica</option><option>Restos de poda</option></select></label><label>Fecha<input id="w_fecha" type="date" required></label></div>
        <div class="actions"><button class="btn">Registrar recepción</button></div></form>
      <form class="panel" id="fc"><h2>Registrar gasto</h2>
        <label>Concepto<input id="c_con" required maxlength="60" placeholder="Transporte, lombrices, sacos…"></label>
        <div class="row2"><label>Monto (MXN)<input id="c_mon" type="number" min="1" step="any" required></label><label>Fecha<input id="c_fecha" type="date" required></label></div>
        <div class="actions"><button class="btn">Registrar gasto</button></div></form>
    </div>
    <h2>Recepciones</h2>${w.length ? `<div class="table stack"><table><thead><tr><th>Ref.</th><th>Fecha</th><th>Mercadero</th><th>Tipo</th><th>Kg</th><th>Pago</th><th></th></tr></thead><tbody>${w.map(x => `<tr><td data-l="Ref.">${esc(x.id)}</td><td data-l="Fecha">${fmt(x.fecha)}</td><td data-l="Mercadero">${esc(x.prov)}</td><td data-l="Tipo">${esc(x.tipo)}</td><td data-l="Kg">${x.kg} kg</td><td data-l="Pago">${money(x.kg * x.costoKg)}</td><td><button class="btn sm ghost" data-dw="${x.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="panel empty">Aún no hay recepciones registradas.</div>'}
    <h2>Gastos</h2>${c.length ? `<div class="table stack"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th><th></th></tr></thead><tbody>${c.map(x => `<tr><td data-l="Fecha">${fmt(x.fecha)}</td><td data-l="Concepto">${esc(x.concepto)}</td><td data-l="Monto">${money(x.monto)}</td><td><button class="btn sm ghost" data-dc="${x.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="panel empty">Aún no hay gastos registrados.</div>'}`;
  }

  /* ---------- Reportes ---------- */
  function datos() {
    const os = orders().filter(valid), meses = lastMonths(6);
    const porMes = meses.map(m => [mesTxt(m), os.filter(o => mesDe(o.fecha) === m).reduce((a, o) => a + totalOf(o), 0), m]);
    const tipos = {}; os.forEach(o => o.items.forEach(i => { const t = tipos[i.tipo] = tipos[i.tipo] || { u: 0, ing: 0, mes: {} }; t.u += i.qty; t.ing += i.qty * i.precio; t.mes[mesDe(o.fecha)] = (t.mes[mesDe(o.fecha)] || 0) + i.qty; }));
    const ult3 = meses.slice(3);
    const dem = Object.entries(tipos).map(([t, v]) => {
      const est = Math.ceil(ult3.reduce((a, m) => a + (v.mes[m] || 0), 0) / 3);
      const stock = load().filter(p => p.tipo === t).reduce((a, p) => a + p.stock, 0);
      return { t, u: v.u, ing: v.ing, est, stock };
    }).sort((a, b) => b.u - a.u);
    const semanas = []; for (let k = 7; k >= 0; k--) { const f = new Date(); f.setDate(f.getDate() - k * 7); const t = ymd(f), ini = ymd(new Date(f.getTime() - 6 * 864e5)); semanas.push([ini.slice(8) + '/' + ini.slice(5, 7), os.filter(o => o.fecha >= ini && o.fecha <= t).reduce((a, o) => a + totalOf(o), 0)]); }
    const porProd = Object.entries(tipos).map(([t, v]) => [t.replace(' (fertilizante)', ''), v.ing]).sort((a, b) => b[1] - a[1]);
    const ingresos = os.reduce((a, o) => a + totalOf(o), 0);
    const egresos = waste().reduce((a, x) => a + x.kg * x.costoKg, 0) + costs().reduce((a, x) => a + x.monto, 0);
    return { porMes, semanas, porProd, dem, ingresos, egresos, pedidos: os.length };
  }
  function reportesHtml() {
    const d = datos();
    const util = d.ingresos - d.egresos;
    return `<div class="stats">
      <div class="stat"><div class="e">📈</div><b>${money(d.ingresos).replace(' MXN', '')}</b><span>Ingresos (MXN)</span></div>
      <div class="stat"><div class="e">📉</div><b>${money(d.egresos).replace(' MXN', '')}</b><span>Costos (MXN)</span></div>
      <div class="stat"><div class="e">${util >= 0 ? '✅' : '⚠️'}</div><b>${money(util).replace(' MXN', '')}</b><span>Utilidad estimada (MXN)</span></div>
      <div class="stat"><div class="e">🧾</div><b>${d.pedidos}</b><span>Pedidos (sin cancelados)</span></div>
    </div>
    <div class="panel"><h2>Ventas por mes</h2>${d.porMes.some(r => r[1]) ? bars(d.porMes, money) : '<p class="mut">Todavía no hay ventas en los últimos 6 meses.</p>'}</div>
    <div class="panel"><h2>Ventas por semana</h2><p class="mut" style="margin:0 0 6px"><small>Últimas 8 semanas (cada barra empieza el día indicado).</small></p>${d.semanas.some(r => r[1]) ? bars(d.semanas, money) : '<p class="mut">Todavía no hay ventas en las últimas 8 semanas.</p>'}</div>
    <div class="panel"><h2>Ingresos por producto</h2>${d.porProd.length ? bars(d.porProd, money) : '<p class="mut">Aún no hay ventas.</p>'}</div>
    <div class="panel"><h2>Demanda por producto</h2>${d.dem.length ? `<div class="table stack"><table><thead><tr><th>Producto</th><th>Unidades vendidas</th><th>Ingresos</th><th>Demanda estimada / mes</th><th>En stock</th></tr></thead><tbody>${d.dem.map(x => `<tr><td data-l="Producto">${esc(x.t)}</td><td data-l="Vendidas">${x.u}</td><td data-l="Ingresos">${money(x.ing)}</td><td data-l="Demanda est.">${x.est} u.</td><td data-l="En stock">${x.stock} u. ${x.stock < x.est ? '<span class="tag d">Producir más</span>' : '<span class="tag v">Suficiente</span>'}</td></tr>`).join('')}</tbody></table></div>
      <p class="mut"><small>La demanda estimada es el promedio de unidades vendidas en los últimos 3 meses. Es un cálculo simple, no inteligencia artificial.</small></p>` : '<p class="mut">Aún no hay ventas para calcular la demanda.</p>'}</div>
    <div class="actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn" id="csvv">⬇️ Exportar ventas (CSV)</button><button class="btn ghost" id="csvr">⬇️ Exportar residuos y gastos (CSV)</button></div>`;
  }

  const rerender = () => { route(); };

  window.adminViews = {
    pedidos: () => `<h1>Gestión de pedidos</h1><p class="sub">Revisa los pedidos de tus clientes y actualiza su estado.</p><div id="plist" aria-live="polite">${pedidosHtml()}</div>`,
    residuos: () => `<h1>Residuos y costos</h1><p class="sub">Registra los residuos que llegan de los mercaderos y lo que cuesta producir.</p>${residuosHtml()}`,
    reportes: () => `<h1>Reportes de ventas y demanda</h1><p class="sub">Resumen de lo que vendes y de lo que podrías necesitar producir.</p>${reportesHtml()}`,
  };

  window.adminHooks = {
    pedidos() {
      const box = $('#plist');
      box.onclick = async e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.f) { filtro = b.dataset.f; box.innerHTML = pedidosHtml(); return; }
        const l = orders(), o = l.find(x => x.id === (b.dataset.next || b.dataset.cancel)); if (!o) return;
        if (b.dataset.next) {
          if (estadoDe(o) === 'cancelado') { toast('Este pedido fue cancelado.'); box.innerHTML = pedidosHtml(); return; }
          const i = ESTADOS.indexOf(estadoDe(o)); o.estado = ESTADOS[Math.min(i + 1, ESTADOS.length - 1)]; o.hist = { ...(o.hist || {}), [o.estado]: todayISO() };
          localStorage.setItem('lf_orders', JSON.stringify(l)); toast('Pedido ' + ETIQ[o.estado].toLowerCase());
          if (o.email) notify(o.email, '📦 Tu pedido #' + (o.num || o.id) + ' ahora está: ' + ETIQ[o.estado].toLowerCase() + '.');
        } else {
          if (!await cancelOrder(o.id, 'admin')) return;
        }
        box.innerHTML = pedidosHtml();
      };
    },

    residuos() {
      $('#w_fecha').value = $('#c_fecha').value = todayISO();
      $('#fw').onsubmit = e => {
        e.preventDefault();
        const w = waste(), kg = num($('#w_kg').value); if (!kg) return toast('Escribe los kg recibidos.');
        w.push({ id: uid('R-').toUpperCase().slice(0, 9), fecha: $('#w_fecha').value, prov: $('#w_prov').value.trim(), tipo: $('#w_tipo').value, kg, costoKg: num($('#w_ckg').value) });
        DB.set(WK, w); toast('Recepción registrada'); rerender();
      };
      $('#fc').onsubmit = e => {
        e.preventDefault();
        const c = costs(), m = num($('#c_mon').value); if (!m) return toast('Escribe el monto.');
        c.push({ id: uid('C'), fecha: $('#c_fecha').value, concepto: $('#c_con').value.trim(), monto: m });
        DB.set(CK, c); toast('Gasto registrado'); rerender();
      };
      $('#view').onclick = async e => {
        const b = e.target.closest('button[data-dw],button[data-dc]'); if (!b) return;
        if (!await askDialog({ icon: '🗑️', title: '¿Eliminar este registro?', text: 'No se puede deshacer.', ok: 'Eliminar', cancel: 'Volver', danger: true })) return;
        if (b.dataset.dw) DB.set(WK, waste().filter(x => x.id !== b.dataset.dw)); else DB.set(CK, costs().filter(x => x.id !== b.dataset.dc));
        rerender();
      };
    },
    reportes() {
      $('#csvv').onclick = () => csv('ventas.csv', [['Pedido', 'Fecha', 'Cliente', 'Estado', 'Producto', 'Kg', 'Cantidad', 'Precio', 'Total']].concat(orders().flatMap(o => o.items.map(i => [o.num || o.id, o.fecha, o.name || o.email || 'Venta directa', ETIQ[estadoDe(o)], i.tipo, i.kg, i.qty, i.precio, i.qty * i.precio]))));
      $('#csvr').onclick = () => csv('residuos_y_gastos.csv', [['Tipo', 'Ref', 'Fecha', 'Detalle', 'Kg', 'Monto']].concat(waste().map(x => ['Residuo', x.id, x.fecha, x.prov + ' (' + x.tipo + ')', x.kg, x.kg * x.costoKg]), costs().map(x => ['Gasto', x.id, x.fecha, x.concepto, '', x.monto])));
    },
  };
  /* Linea de tiempo del pedido para el cliente */
  const track = (e, o) => {
    if (e === 'cancelado') return tag(e) + (o && o.hist && o.hist.cancelado ? ` <small class="mut">el ${fmt(o.hist.cancelado)}</small>` : '');
    const i = ESTADOS.indexOf(e), f = s => o ? tienda.fechaDe(o, s) : null;
    return `<div class="trk" role="img" aria-label="Estado: ${ETIQ[e]}">${ESTADOS.map((s, k) => `<span class="${k < i ? 'dn' : k === i ? 'cur' : ''}"><i></i><em>${ETIQ[s]}${k <= i && f(s) ? `<br><small>${fmt(f(s)).slice(0, 5)}</small>` : ''}</em></span>`).join('')}</div>`;
  };
  window.adminData = { waste, costs, estadoDe, valid, ETIQ, cancelOrder, track };
})();
