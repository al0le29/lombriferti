/* SHA-256. Usa el del navegador y, si no esta disponible (p. ej. al abrir por http://192.168.x.x en el celular), un respaldo en JS. */
function sha256js(ascii) {
  const rr = (v, a) => (v >>> a) | (v << (32 - a)), max = Math.pow(2, 32);
  let result = '', i, j; const words = [], bits = ascii.length * 8, k = [], comp = {}; let hash = [], pc = 0;
  for (let c = 2; pc < 64; c++) if (!comp[c]) { for (i = 0; i < 313; i += c) comp[i] = c; hash[pc] = (Math.pow(c, .5) * max) | 0; k[pc++] = (Math.pow(c, 1 / 3) * max) | 0; }
  ascii += '\x80'; while (ascii.length % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
  words[words.length] = (bits / max) | 0; words[words.length] = bits;
  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16), old = hash; hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
      const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
        (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; result += (b < 16 ? '0' : '') + b.toString(16); }
  return result;
}
async function sha(t) {
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  return sha256js(unescape(encodeURIComponent(t)));
}

/* ---- Sesiones (guardadas en este navegador) ---- */
function deviceName() {
  const u = navigator.userAgent;
  const os = /Windows/.test(u) ? 'Windows' : /Android/.test(u) ? 'Android' : /iPhone|iPad/.test(u) ? 'iOS' : /Mac/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : 'Dispositivo';
  const br = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'Navegador';
  return br + ' en ' + os;
}
const allSessions = () => JSON.parse(localStorage.getItem('lf_sessions') || '[]');
function addSession(email) {
  const sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const l = allSessions(); l.push({ sid, email, device: deviceName(), fecha: new Date().toISOString() });
  localStorage.setItem('lf_sessions', JSON.stringify(l));
  return sid;
}
function dropSession(sid) { localStorage.setItem('lf_sessions', JSON.stringify(allSessions().filter(s => s.sid !== sid))); }

/* Huella del lote: SHA-256 de todos los datos que muestra el QR (si se cambia uno, ya no coincide). */
const loteHash = (p, venta) => sha([p.lote, p.tipo, p.kg, p.fecha, venta || ''].concat(p.origen ? [p.origen] : []).join('|'));
