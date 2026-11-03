/* Todas las llamadas al servidor están aquí. El resto de la página no usa fetch directamente.
   Si el servidor responde con otros nombres de campos, solo hay que cambiar los "mapeos" de este archivo.
   Rutas usadas (ver servidor-ejemplo/servidor.js e INTEGRACION.md):
     POST /auth/registro  POST /auth/login  GET /auth/yo  POST /auth/salir  POST /auth/recuperar  POST /auth/restablecer
     GET /lotes  GET /lotes/:codigo  POST /lotes  PUT /lotes/:codigo  DELETE /lotes/:codigo
     GET /pedidos  POST /pedidos  PATCH /pedidos/:id  POST /pedidos/:id/cancelar */
(function () {
  const BASE = String((window.LF_CONFIG || {}).apiUrl || '').trim().replace(/\/+$/, '');
  const online = !!BASE;
  const session = () => { try { return JSON.parse(localStorage.getItem('lf_session') || 'null'); } catch (e) { return null; } };

  class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

  async function req(method, path, body) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000), s = session();
    let r;
    try {
      r = await fetch(BASE + path, {
        method, signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', ...(s && s.token ? { Authorization: 'Bearer ' + s.token } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) { throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0); }
    finally { clearTimeout(timer); }
    let data = null; if (r.status !== 204) { try { data = await r.json(); } catch (e) { } }
    if (!r.ok) {
      if (r.status === 401 && s && s.token && path !== '/auth/login') dispatchEvent(new Event('lf-sesion-vencida'));
      throw new ApiError((data && (data.error || data.mensaje)) || `El servidor respondió con un error (${r.status}).`, r.status);
    }
    return data;
  }
  const enc = encodeURIComponent;

  /* ---------- Mapeos: servidor <-> página ---------- */
  const usuario = u => ({ id: u.id, name: u.nombre, email: u.email, phone: u.telefono || '', role: u.rol === 'admin' ? 'Administrador' : 'Cliente' });
  const lote = x => ({ lote: x.codigo, tipo: x.tipo, kg: +x.kgPorUnidad, fecha: x.fechaProduccion, precio: +x.precio, stock: +x.stock, desc: x.descripcion || '', foto: x.fotoUrl || '', origen: x.loteOrigen || '' });
  const loteOut = p => ({ codigo: p.lote, tipo: p.tipo, kgPorUnidad: p.kg, fechaProduccion: p.fecha, precio: p.precio, stock: p.stock, descripcion: p.desc || '', fotoUrl: p.foto || null, loteOrigen: p.origen || null });
  const pedido = o => ({
    id: String(o.id), num: o.numero, fecha: o.fecha,
    email: o.cliente ? o.cliente.email : '', name: o.cliente ? o.cliente.nombre : 'Venta directa',
    items: (o.items || []).map(i => ({ lote: i.lote, qty: +i.cantidad, precio: +i.precio, tipo: i.tipo, kg: +i.kgPorUnidad })),
    subtotal: +o.subtotal, envio: +o.envio, total: +o.total, ...(+o.descuento ? { descuento: +o.descuento, cupon: o.cupon } : {}),
    pago: o.pago && o.pago.metodo !== 'directa' ? o.pago : null, dir: o.direccion || null, estado: o.estado, hist: o.historial || {},
  });
  const sesion = r => ({ ...usuario(r.usuario), token: r.token });

  /* Copia en memoria de lo que vino del servidor: la página la lee sin esperar */
  const cache = { lotes: [], pedidos: [] };
  const lotes = {
    listar: async () => (cache.lotes = (await req('GET', '/lotes')).map(lote)),
    trazabilidad: codigo => req('GET', '/lotes/' + enc(codigo)),   // { ...lote, etapas:[{nombre, fecha, detalle}], huella, verificado, blockchain }
    crear: p => req('POST', '/lotes', loteOut(p)).then(lote),
    actualizar: p => req('PUT', '/lotes/' + enc(p.lote), loteOut(p)).then(lote),
    eliminar: codigo => req('DELETE', '/lotes/' + enc(codigo)),
  };
  const pedidos = {
    listar: async () => (cache.pedidos = (await req('GET', '/pedidos')).map(pedido)),
    /* d = { items:[{lote, cantidad}], direccion, pago:{metodo, marca, last4}, cupon, descuento, ventaDirecta } */
    crear: d => req('POST', '/pedidos', d).then(pedido),
    cambiarEstado: (id, estado) => req('PATCH', '/pedidos/' + enc(id), { estado }).then(pedido),
    cancelar: id => req('POST', '/pedidos/' + enc(id) + '/cancelar').then(pedido),
  };
  const auth = {
    registro: d => req('POST', '/auth/registro', { nombre: d.name, email: d.email, telefono: d.phone, password: d.pass, ...(d.code ? { codigoAdmin: d.code } : {}) }).then(sesion),
    login: (usuarioOEmail, password) => req('POST', '/auth/login', { usuario: usuarioOEmail, password }).then(sesion),
    yo: () => req('GET', '/auth/yo').then(r => usuario(r.usuario || r)),
    salir: () => req('POST', '/auth/salir').catch(() => { }),
    recuperar: email => req('POST', '/auth/recuperar', { email }),
    restablecer: (email, codigo, password) => req('POST', '/auth/restablecer', { email, codigo, password }),
  };

  window.API = { online, base: BASE, ApiError, cache, auth, lotes, pedidos };
})();
