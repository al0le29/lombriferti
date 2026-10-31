/* Comprobante imprimible y respaldo de datos. */
(function () {
  const $$ = s => document.querySelector(s);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Comprobante ---------- */
  function printReceipt(o) {
    const card = o.pago && o.pago.metodo === 'tarjeta', est = (adminData.ETIQ[o.estado || 'entregado']);
    const old = $$('#printarea'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'printarea';
    d.innerHTML = `<h1>🌿 Lombriferti</h1><p>Comprobante de compra</p>
      <table class="pr-t"><tr><td>Compra</td><td>#${E(o.num || o.id)}</td></tr><tr><td>Fecha</td><td>${fmt(o.fecha)}</td></tr><tr><td>Cliente</td><td>${E(o.name || o.email || '')}</td></tr>
      ${o.dir ? `<tr><td>Enviar a</td><td>${E(o.dir.nombre)}<br>${E(addrTxt(o.dir))}</td></tr>` : ''}
      <tr><td>Pago</td><td>${E(payTxt(o.pago))}</td></tr><tr><td>Estado</td><td>${E(est)}</td></tr></table>
      <table class="pr-i"><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>${o.items.map(i => `<tr><td>${E(pname(i))}<br><small>Lote ${E(i.lote)}</small></td><td>${i.qty}</td><td>${money(i.precio)}</td><td>${money(i.qty * i.precio)}</td></tr>`).join('')}</tbody></table>
      <p class="pr-tot">${o.envio !== undefined ? `Subtotal: ${money(o.subtotal)}<br>${o.descuento ? `Descuento (${E(o.cupon)}): −${money(o.descuento)}<br>` : ''}Envío: ${o.envio ? money(o.envio) : 'Gratis'}<br>` : ''}<b>Total: ${money(o.total != null ? o.total : o.items.reduce((a, i) => a + i.qty * i.precio, 0))}</b></p>
      <p class="pr-n">Comprobante de demostración: no es una factura fiscal y no se realizó ningún cobro real.</p>`;
    document.body.append(d); document.body.classList.add('printing');
    const clean = () => { d.remove(); document.body.classList.remove('printing'); window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean); setTimeout(() => window.print(), 50);
  }

  /* ---------- Espacio del navegador ----------
     Cada sitio tiene unos 5 MB en localStorage. Lo que mas ocupa son las fotos de productos. */
  const LIMIT = 5 * 1024 * 1024;
  function usage() { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length; } } catch (e) { } return { used: n, pct: Math.min(100, Math.round(n / LIMIT * 100)) }; }
  const mb = n => n < 100 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB';
  /* Si se llena, avisa en vez de fallar sin decir nada */
  try {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      try { return orig.call(this, k, v); }
      catch (e) { if (e && (e.name === 'QuotaExceededError' || e.code === 22) && typeof toast === 'function') toast('No hay espacio para guardar. Descarga un respaldo y quita fotos de productos.'); throw e; }
    };
  } catch (e) { }
  const usageBar = () => { const u = usage(); return `<div class="usage"><div class="usage-bar"><span style="width:${Math.max(2, u.pct)}%" class="${u.pct >= 80 ? 'hi' : ''}"></span></div><small class="mut">Espacio usado en este navegador: ${mb(u.used)} de unos ${mb(LIMIT)} (${u.pct}%)</small></div>`; };
  const storageWarn = () => { const u = usage(); return u.pct >= 70 ? `<div class="panel warnbox"><b>⚠️ El espacio del navegador está al ${u.pct}%</b><p>Descarga un respaldo en Configuración y usa fotos más ligeras o quita algunas. Si se llena, ya no se podrán guardar pedidos ni productos.</p><a class="btn sm" href="#/config">Ir a Configuración</a></div>` : ''; };

  /* ---------- Primeros pasos del administrador ---------- */
  function firstSteps() {
    let hidden = false; try { hidden = localStorage.getItem('lf_onb_done') === '1'; } catch (e) { }
    if (hidden) return '';
    const st = [
      ['Registra los residuos que recibiste', '#/residuos', adminData.waste().length > 0],
      ['Registra un lote de producto', '#/productos', load().length > 0],
      ['Sube una foto a tus productos', '#/productos', load().some(p => p.foto)],
      ['Crea un cupón de descuento', '#/cupones', JSON.parse(localStorage.getItem('lf_coupons') || '[]').length > 0],
      ['Descarga un respaldo de tus datos', '#/config', !!localStorage.getItem('lf_last_backup')],
    ];
    if (st.every(s => s[2])) return '';
    return `<div class="panel" id="onb"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h2 style="margin:0">Primeros pasos</h2><button class="btn sm ghost" id="onb-x">Ocultar</button></div>
      <p class="mut" style="margin:6px 0 10px">${st.filter(s => s[2]).length} de ${st.length} listos</p>
      <ul class="onb">${st.map((s, k) => `<li class="${s[2] ? 'ok' : ''}"><span class="onb-i" aria-hidden="true">${s[2] ? '✓' : k + 1}</span><a href="${s[1]}">${s[0]}</a>${s[2] ? ' <span class="sr">(listo)</span>' : ''}</li>`).join('')}</ul></div>`;
  }
  function bindFirstSteps() { const b = $$('#onb-x'); if (b) b.onclick = () => { try { localStorage.setItem('lf_onb_done', '1'); } catch (e) { } $$('#onb').remove(); }; }

  /* ---------- Respaldo ---------- */
  const SKIP = /^lf_(session|sessions|seen|noIntro|theme|cart_|pending|back)/;
  const keys = () => Object.keys(localStorage).filter(k => k.startsWith('lf_') && !SKIP.test(k));
  function backupHtml() {
    return `<div class="panel" style="max-width:480px"><h2>Respaldo de datos</h2>
      <p class="sub" style="margin:0 0 10px;font-size:13px">Todo se guarda en este navegador. Descarga una copia para no perder productos, pedidos, residuos ni cuentas si se borran los datos del sitio. El archivo incluye las cuentas (con contraseñas cifradas), guárdalo en un lugar seguro.</p>
      ${usageBar()}
      <div class="actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn" id="bk-exp">⬇️ Descargar respaldo</button><button class="btn ghost" id="bk-imp">⬆️ Restaurar respaldo</button></div>
      <input type="file" id="bk-file" accept=".json,application/json" hidden></div>`;
  }
  function bindBackup() {
    const exp = $$('#bk-exp'); if (!exp) return;
    exp.onclick = () => {
      const data = {}; keys().forEach(k => data[k] = localStorage.getItem(k));
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'lombriferti', version: 1, fecha: new Date().toISOString(), data })], { type: 'application/json' }));
      a.download = 'lombriferti_respaldo_' + todayISO() + '.json'; document.body.append(a); a.click(); a.remove(); localStorage.setItem('lf_last_backup', todayISO()); toast('Respaldo descargado');
    };
    $$('#bk-imp').onclick = () => $$('#bk-file').click();
    $$('#bk-file').onchange = async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      let j; try { j = JSON.parse(await f.text()); } catch (x) { return toast('El archivo no es un respaldo válido.'); }
      if (!j || j.app !== 'lombriferti' || !j.data || typeof j.data !== 'object') return toast('El archivo no es un respaldo de Lombriferti.');
      const ks = Object.keys(j.data).filter(k => k.startsWith('lf_') && !SKIP.test(k) && typeof j.data[k] === 'string');
      if (!ks.length) return toast('El respaldo está vacío.');
      if (!await askDialog({ icon: '⚠️', title: '¿Restaurar este respaldo?', text: 'Reemplazará los datos actuales (productos, pedidos, residuos, cuentas) por los del archivo.', ok: 'Restaurar', cancel: 'Cancelar', danger: true })) return;
      keys().forEach(k => localStorage.removeItem(k)); ks.forEach(k => localStorage.setItem(k, j.data[k]));
      toast('Respaldo restaurado'); setTimeout(() => location.reload(), 700);
    };
  }
  /* ---------- Animacion al confirmar la compra ----------
     Un circulo verde se abre y se cierra, la palomita aparece al centro, se dibuja y vuela a su lugar en el recibo.
     Dura ~1.6 s; un toque o una tecla la terminan. Si el dispositivo pide menos movimiento, no se reproduce. */
  function celebrate(bg) {
    const circle = bg.querySelector('.ok-circle'), card = bg.querySelector('.modal');
    if (!circle || !card || matchMedia('(prefers-reduced-motion: reduce)').matches || !document.body.animate) return;
    bg.classList.add('cel');
    const iris = document.createElement('div'), fly = document.createElement('div');
    iris.className = 'lf-iris'; fly.className = 'lf-fly'; fly.innerHTML = circle.innerHTML;
    document.body.append(iris, fly);
    let done = false; const timers = [];
    /* el toque que salta la animacion no debe cerrar el recibo ni pulsar un boton */
    const eat = e => { e.stopImmediatePropagation(); e.preventDefault(); bg.removeEventListener('click', eat, true); };
    const onDown = () => { bg.addEventListener('click', eat, true); setTimeout(() => bg.removeEventListener('click', eat, true), 600); finish(); };
    const finish = () => {
      if (done) return; done = true; timers.forEach(clearTimeout);
      iris.remove(); fly.remove(); bg.classList.remove('cel'); bg.classList.add('cel-in');
      removeEventListener('keydown', finish, true); bg.removeEventListener('pointerdown', onDown);
    };
    addEventListener('keydown', finish, true); bg.addEventListener('pointerdown', onDown);
    fly.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.25)' }], { delay: 300, duration: 450, easing: 'cubic-bezier(.175,.885,.32,1.275)', fill: 'forwards' });
    timers.push(setTimeout(() => { if (!done) bg.classList.add('cel-show'); }, 900));
    timers.push(setTimeout(() => {
      if (done) return;
      const r = circle.getBoundingClientRect(), dx = r.left + r.width / 2 - innerWidth / 2, dy = r.top + r.height / 2 - innerHeight / 2;
      fly.animate([{ transform: 'scale(1.25)' }, { transform: `translate(${dx}px, ${dy}px) scale(1)` }], { duration: 600, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }).onfinish = finish;
    }, 1000));
  }

  window.extras = { celebrate, printReceipt, backupHtml, bindBackup, usage, storageWarn, firstSteps, bindFirstSteps };
})();
