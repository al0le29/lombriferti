/* Animacion de bienvenida: plantas que crecen. Solo se muestra:
   - al entrar por primera vez al sitio (index.html), una vez por visita del navegador;
   - al llegar a la pantalla de iniciar sesion (login.html) sin tener sesion.
   No se muestra al volver desde verificar.html, tras iniciar sesion ni al recargar por un cambio de perfil (lf_noIntro). */
(function () {
  const isLogin = /login\.html$/.test(location.pathname);
  try {
    if (sessionStorage.getItem('lf_noIntro')) { sessionStorage.removeItem('lf_noIntro'); return; }
    if ((isLogin && localStorage.getItem('lf_session')) || sessionStorage.getItem('lf_seen')) return;
    sessionStorage.setItem('lf_seen', '1');
  } catch (e) {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const f = document.createElement('link'); f.rel = 'stylesheet';
  f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Playfair+Display:ital,wght@0,600;1,400&display=swap';
  document.head.append(f);

  const st = document.createElement('style');
  st.textContent = `
  #lfIntro{--i-bg:#111a13;--i-h:#fff;--i-p:#b7c4c7;--i-acc:#52b788;--i-tag:rgba(82,183,136,.15);--i-tagb:rgba(82,183,136,.4);position:fixed;inset:0;z-index:10000;background:var(--i-bg);color:var(--i-h);font-family:'Inter',system-ui,sans-serif;overflow:hidden;transition:opacity .8s ease}
  #lfIntro.out{opacity:0;pointer-events:none}
  #lfIntro canvas{position:absolute;inset:0;width:100%;height:100%}
  #lfIntro .lf-hero{position:relative;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 20px}
  #lfIntro .lf-badge{background:var(--i-tag);border:1px solid var(--i-tagb);color:var(--i-acc);padding:6px 16px;border-radius:50px;font-size:.85rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;opacity:0;animation:lfDown 1s .5s forwards}
  #lfIntro h1{font-family:'Playfair Display',Georgia,serif;font-size:clamp(1.9rem,5vw,5rem);font-weight:600;margin:0 0 15px;color:var(--i-h);text-shadow:0 4px 20px rgba(0,0,0,.6);opacity:0;animation:lfUp 1s .8s forwards}
  #lfIntro h1 span{color:var(--i-acc);font-style:italic}
  #lfIntro p{font-size:clamp(1rem,1.5vw,1.25rem);max-width:600px;color:var(--i-p);margin:0;line-height:1.6;opacity:0;animation:lfUp 1s 1.1s forwards}
  #lfIntro.light{--i-bg:#f3f8f1;--i-h:#22372a;--i-p:#6b7f70;--i-acc:#2f7a3f;--i-tag:rgba(47,122,63,.1);--i-tagb:rgba(47,122,63,.35)}
  #lfIntro.light h1{text-shadow:none}
  @media(max-width:600px){#lfIntro .lf-hero{padding:0 22px 14vh}#lfIntro .lf-badge{font-size:.7rem;letter-spacing:1.2px;margin-bottom:16px}#lfIntro p{font-size:.95rem}}
  @keyframes lfDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:none}}
  @keyframes lfUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}`;
  document.head.append(st);

  const box = document.createElement('div'); box.id = 'lfIntro'; box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<canvas></canvas><div class="lf-hero"><span class="lf-badge">Composta hoy, un mejor mañana</span>
    <h1>Haz crecer tu cosecha con <span>Lombriferti</span></h1>
    <p>Fertilizantes orgánicos de composta y lombrices para estimular el desarrollo radicular y maximizar el rendimiento natural de tus cultivos.</p></div>`;
  document.documentElement.append(box);

  const light = document.documentElement.dataset.theme === 'light';
  if (light) box.classList.add('light');
  const C = light ? { stem: '#6fae7c', leaf: '#2f7a3f', part: '47,122,63' } : { stem: '#2d6a4f', leaf: '#52b788', part: '82,183,136' };
  const canvas = box.querySelector('canvas'), ctx = canvas.getContext('2d');
  let K = 1;   // escala de las plantas segun el tamaño de pantalla
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; K = Math.max(0.4, Math.min(1, innerWidth / 900, innerHeight / 650)); };
  addEventListener('resize', resize); resize();

  const MAX = 160, PER_SEC = 48, HOLD = 1200;      // la planta crece en ~3.3 s y se queda ~1.2 s antes de entrar
  const particles = Array.from({ length: 40 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2.5 + 1, speed: Math.random() * 0.6 + 0.2, op: Math.random() * 0.6 + 0.2 }));

  function branch(x, y, len, ang, depth, step) {
    if (depth === 0 || step <= 0) return;
    const ex = x + len * Math.sin(ang), ey = y - len * Math.cos(ang);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey);
    ctx.strokeStyle = C.stem; ctx.lineWidth = depth * 1.8 * Math.max(0.6, K); ctx.lineCap = 'round'; ctx.stroke();
    if (depth === 1) { ctx.beginPath(); ctx.arc(ex, ey, 6 * Math.max(0.7, K), 0, Math.PI * 2); ctx.fillStyle = C.leaf; ctx.fill(); }
    const sub = step - 12;
    if (sub > 0) { branch(ex, ey, len * 0.75, ang + 0.4, depth - 1, sub); branch(ex, ey, len * 0.75, ang - 0.4, depth - 1, sub); }
  }

  let t0 = 0, raf = 0, last = 0, closing = false;
  function frame(now) {
    if (!t0) t0 = last = now;
    const dt = Math.min(now - last, 50) / 16.67; last = now;
    const w = canvas.width, h = canvas.height, progress = Math.min(MAX, (now - t0) / 1000 * PER_SEC);
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => { p.y -= p.speed * dt; if (p.y < 0) p.y = h; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(${C.part},${p.op})`; ctx.fill(); });
    branch(w * 0.15, h, 130 * K, 0.3, 5, progress);
    branch(w * 0.85, h, 130 * K, -0.3, 5, progress);
    branch(w * 0.45, h, 100 * K, 0.1, 4, progress);
    branch(w * 0.55, h, 100 * K, -0.1, 4, progress);
    if (progress >= MAX && now - t0 > MAX / PER_SEC * 1000 + HOLD) return finish();
    raf = requestAnimationFrame(frame);
  }
  function finish() {
    if (closing) return; closing = true;
    cancelAnimationFrame(raf); box.classList.add('out');
    setTimeout(() => { box.remove(); st.remove(); removeEventListener('resize', resize); }, 900);
  }
  raf = requestAnimationFrame(frame);
})();
