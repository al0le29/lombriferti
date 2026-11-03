/* Animacion de bienvenida: la lombriz sale de la tierra, forma el arco y le brota la planta (el logo);
   despues aparecen el nombre, la linea y el lema. Siempre se ve completa. Solo se muestra:
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
  f.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@600&display=swap';
  document.head.append(f);

  const st = document.createElement('style');
  st.textContent = `
  #lfIntro{--i-bg:#fafbf3;--i-a:#735a33;--i-b:#2f9a2b;--i-line:#9cc870;--i-tag:#75623f;position:fixed;inset:0;z-index:10000;background:var(--i-bg);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;transition:opacity .6s ease}
  #lfIntro.dark{--i-bg:#111a13;--i-a:#d2b07a;--i-b:#5cc24f;--i-line:#4f8a3a;--i-tag:#b9a27c}
  #lfIntro.out{opacity:0;pointer-events:none}
  #lfIntro svg{display:block;width:min(64vw,300px,42vh);height:auto}
  #lfIntro .wm{font-family:'Fredoka','Nunito',system-ui,sans-serif;font-weight:600;font-size:clamp(2.6rem,11vw,4.6rem);line-height:1;margin-top:clamp(14px,3vh,28px)}
  #lfIntro .wm span{display:inline-block;opacity:0;transform:translateY(18px)}
  #lfIntro .wm-a{color:var(--i-a)}#lfIntro .wm-b{color:var(--i-b)}
  #lfIntro .ln{width:0;height:3px;border-radius:3px;background:var(--i-line);margin:clamp(16px,3vh,26px) 0 clamp(12px,2.4vh,20px)}
  #lfIntro .tg{color:var(--i-tag);font:600 clamp(.68rem,2.9vw,1rem)/1.4 'Nunito',system-ui,sans-serif;text-transform:uppercase;letter-spacing:.4em;white-space:nowrap;opacity:0}
  #lfIntro.txt .wm-a{animation:lfUp .55s ease-out forwards}
  #lfIntro.txt .wm-b{animation:lfUp .55s ease-out .2s forwards}
  #lfIntro.txt .ln{animation:lfLine .5s ease-out .6s forwards}
  #lfIntro.txt .tg{animation:lfTag .7s ease-out .8s forwards}
  @keyframes lfUp{to{opacity:1;transform:none}}
  @keyframes lfLine{to{width:min(70px,18vw)}}
  @keyframes lfTag{from{letter-spacing:.4em}to{opacity:1;letter-spacing:.14em}}`;
  document.head.append(st);

  const box = document.createElement('div'); box.id = 'lfIntro'; box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<svg id="lfi-scene" viewBox="0 0 298 302" role="img" aria-label="Una lombriz sale de la tierra, forma un arco y de su lomo brota una planta con dos hojas.">
  <defs>
    <clipPath id="lfi-inside"><circle cx="150.5" cy="167.5" r="116"/></clipPath>
  </defs>
    <circle cx="150.5" cy="167.5" r="118" fill="#eff3e2"/>
  <g clip-path="url(#lfi-inside)">
    <g id="lfi-worm">
      <path id="lfi-stem" fill="none" stroke="#2e9f29" stroke-width="6.4"/>
      <path id="lfi-body" fill="#309e2b"/>
      <g id="lfi-bands" stroke="#93cb66" stroke-width="3" stroke-linecap="butt"></g>
      <g id="lfi-plant">
        <g id="lfi-leafL">
          <path d="M152.5,111.6 C153,92 136,76 104.5,75.6 C105,95 121,118 152.5,111.6Z" fill="#9dc966"/>
          <path d="M148,108.5 L111,80" stroke="#37a02c" stroke-width="2" stroke-linecap="round" fill="none"/>
        </g>
        <g id="lfi-leafR">
          <path d="M152.5,111.6 C153,92 168,76 200.5,75.6 C200,95 185,118 152.5,111.6Z" fill="#39c85c"/>
          <path d="M156.5,108.5 L194,79.5" stroke="#2fa537" stroke-width="2" stroke-linecap="round" fill="none"/>
        </g>
      </g>
      <g id="lfi-face">
        <g id="lfi-eyeL">
          <circle cx="202.6" cy="207.6" r="5.1" fill="#fdfdf6"/>
          <circle class="lfi-pupil" cx="202.8" cy="208.4" r="2.8" fill="#1d381c"/>
        </g>
        <g id="lfi-eyeR">
          <circle cx="216" cy="208" r="5.1" fill="#fdfdf6"/>
          <circle class="lfi-pupil" cx="216" cy="208.4" r="2.8" fill="#1d381c"/>
        </g>
        <path id="lfi-mouth" d="M202,216 Q208.2,222.6 214.6,215.6" fill="none" stroke="#124912" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>
    <g id="lfi-crumbs" fill="#705930"></g>
    <path id="lfi-soil" fill="#705930"/>
    <circle cx="124.5" cy="263" r="3.6" fill="#8a6e3f"/>
    <circle cx="149" cy="272" r="2.7" fill="#886d3f"/>
    <circle cx="173.5" cy="272" r="4" fill="#8b703d"/>
    <circle cx="213.5" cy="261" r="3" fill="#8c6c3d"/>
    <circle cx="107" cy="272" r="2.3" fill="#5e4624"/>
  </g>
  <circle cx="150.5" cy="167.5" r="120.4" fill="none" stroke="#c0d3a5" stroke-width="8.6"/>
</svg>
    <div class="wm"><span class="wm-a">Lombri</span><span class="wm-b">ferti</span></div><div class="ln"></div><div class="tg">Transformamos residuos en cosechas</div>`;
  if (document.documentElement.dataset.theme === 'dark') box.classList.add('dark');
  document.documentElement.append(box);
  const html = document.documentElement, prevOverflow = html.style.overflow;
  html.style.overflow = 'hidden';   // sin barra de desplazamiento mientras dura la animacion

  /* ---- Lombriz y brote (animacion por cuadros sobre el SVG) ---- */
  let render, END;
  (function () {
  var $ = function (id) { return box.querySelector("#lfi-" + id); };
  var TAU = Math.PI * 2; END = 6.4;

  // Línea central de la lombriz: bajo tierra, sube por la izquierda, arco, baja por la derecha.
  function cubic(a, b, c, d, u) {
    var v = 1 - u;
    return [
      v*v*v*a[0] + 3*v*v*u*b[0] + 3*v*u*u*c[0] + u*u*u*d[0],
      v*v*v*a[1] + 3*v*v*u*b[1] + 3*v*u*u*c[1] + u*u*u*d[1]
    ];
  }
  var pts = [], i;
  for (i = 0; i <= 40; i++) pts.push([95, 320 - i * 2]);
  for (i = 1; i <= 80; i++) pts.push(cubic([95,240],[95,200],[120,175],[151,175], i/80));
  for (i = 1; i <= 80; i++) pts.push(cubic([151,175],[182,175],[207.5,200],[207.5,240], i/80));
  var len = [0];
  for (i = 1; i < pts.length; i++) len.push(len[i-1] + Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]));

  function at(s) {
    s = Math.max(0, Math.min(len[len.length-1], s));
    var lo = 0, hi = len.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (len[m] <= s) lo = m; else hi = m; }
    var f = (s - len[lo]) / (len[hi] - len[lo] || 1);
    var ax = pts[lo][0], ay = pts[lo][1], bx = pts[hi][0], by = pts[hi][1];
    var dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1;
    return { x: ax + dx*f, y: ay + dy*f, tx: dx/n, ty: dy/n };
  }
  function nearest(x, y) {
    var best = 0, d = 1e9;
    for (var j = 0; j < pts.length; j++) {
      var e = Math.hypot(pts[j][0]-x, pts[j][1]-y);
      if (e < d) { d = e; best = j; }
    }
    return len[best];
  }
  // Pasa un punto al marco local de la línea central (a lo largo, a lo ancho).
  function toLocal(x, y, p) {
    var dx = x - p.x, dy = y - p.y;
    return [dx*p.tx + dy*p.ty, -dx*p.ty + dy*p.tx];
  }
  function fromLocal(l, p) {
    return [p.x + l[0]*p.tx - l[1]*p.ty, p.y + l[0]*p.ty + l[1]*p.tx];
  }

  var S_END = nearest(207.5, 238), S_FACE = nearest(200.3, 210), S_START = 55;
  var FACE_C = [209.2, 211.5];
  var faceLocal = toLocal(FACE_C[0], FACE_C[1], at(S_FACE));
  var faceAng = Math.atan2(at(S_FACE).ty, at(S_FACE).tx);

  var bandDefs = [
    [[83,227],[110,233]], [[94,196],[118,209]], [[119.5,171],[133.5,194]], [[183.6,171],[169.4,194]]
  ].map(function (b) {
    var mx = (b[0][0]+b[1][0])/2, my = (b[0][1]+b[1][1])/2, s = nearest(mx, my), p = at(s);
    var el = document.createElementNS("http://www.w3.org/2000/svg", "line");
    $("bands").appendChild(el);
    return { s: s, a: toLocal(b[0][0], b[0][1], p), b: toLocal(b[1][0], b[1][1], p), el: el };
  });

  // Migajas de tierra: determinísticas para que cada reproducción sea igual.
  var crumbDefs = [], rnd = function (n) { var v = Math.sin(n * 91.7) * 43758.5; return v - Math.floor(v); };
  function addCrumbs(n, t0, x0, spreadV, seed) {
    for (var k = 0; k < n; k++) {
      var el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      el.setAttribute("r", (1.3 + rnd(seed+k) * 1.6).toFixed(2));
      $("crumbs").appendChild(el);
      crumbDefs.push({
        el: el, t0: t0 + rnd(seed+k+.3) * .25,
        x: x0 + (rnd(seed+k+.5) - .5) * 26,
        vx: (rnd(seed+k+.7) - .5) * 70,
        vy: -(spreadV * .6 + rnd(seed+k+.9) * spreadV)
      });
    }
  }
  addCrumbs(12, .62, 95, 80, 1);
  addCrumbs(7, 3.05, 207, 46, 40);

  // Utilidades de tiempo
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ramp(a, b, t) { return clamp((t - a) / (b - a)); }
  function smooth(a, b, t) { var u = ramp(a, b, t); return u*u*(3 - 2*u); }
  function back(u) { var c = 1.9; u = u - 1; return 1 + (c+1)*u*u*u + c*u*u; }
  function gauss(x, c, w) { var d = (x-c)/w; return Math.exp(-d*d); }

  var soilBase = [[30,238],[60,238],[80,239.3],[100,240.3],[130,241.3],[150,241],[170,239.6],[200,239.4],[225,240.2],[245,240.6],[275,240.6]];
  function soilY(x) {
    for (var k = 1; k < soilBase.length; k++) {
      if (x <= soilBase[k][0]) {
        var a = soilBase[k-1], b = soilBase[k], u = (x-a[0])/(b[0]-a[0]);
        return a[1] + (b[1]-a[1])*u*u*(3-2*u);
      }
    }
    return soilBase[soilBase.length-1][1];
  }

  var S_TOP = nearest(151.2, 175);
  var eyeWhites = [$("eyeL").firstElementChild, $("eyeR").firstElementChild];

  function drawWorm(t) {
    // Avance de la lombriz: oruga a pulsos entre 0.6 s y 3.1 s.
    var u = ramp(.6, 3.1, t);
    var e = u < .5 ? 2*u*u : 1 - 2*(1-u)*(1-u);
    e = .55*e + .45*u + (u > 0 && u < 1 ? .018*Math.sin(TAU*4*u) : 0);
    var S = S_START + (S_END - S_START) * e;
    var shift = S_END - S;

    // Cuerpo con una onda que lo recorre mientras avanza y un bulto donde nace el tallo.
    var waveAmp = 1.3 * smooth(.6, 1, t) * (1 - smooth(2.8, 3.3, t));
    var sproutBump = 2.2 * smooth(3.75, 4, t) * (1 - smooth(4.2, 4.7, t));
    var left = [], right = [], tailS = Math.max(0, S - S_END), step = 3, s;
    for (s = tailS; s <= S; s += step) {
      var p = at(s);
      var hw = 14.5 + waveAmp * smooth(0, 34, S - s) * Math.sin(s*.11 - t*11) + sproutBump * gauss(s, S_TOP, 16);
      left.push((p.x + p.ty*hw).toFixed(2) + "," + (p.y - p.tx*hw).toFixed(2));
      right.unshift((p.x - p.ty*hw).toFixed(2) + "," + (p.y + p.tx*hw).toFixed(2));
    }
    var tip = at(S), capHw = 14.5, cap = [];
    for (i = 0; i <= 10; i++) {
      var a = Math.atan2(tip.ty, tip.tx) - Math.PI/2 + Math.PI * i/10;
      cap.push((tip.x + Math.cos(a)*capHw).toFixed(2) + "," + (tip.y + Math.sin(a)*capHw).toFixed(2));
    }
    $("body").setAttribute("d", "M" + left.concat(cap, right).join("L") + "Z");

    // Franjas
    bandDefs.forEach(function (b) {
      var bs = b.s - shift, p = at(bs), k = 1 - waveAmp / 14.5, A = fromLocal([b.a[0], b.a[1]*k], p), B = fromLocal([b.b[0], b.b[1]*k], p);
      b.el.setAttribute("x1", A[0].toFixed(2)); b.el.setAttribute("y1", A[1].toFixed(2));
      b.el.setAttribute("x2", B[0].toFixed(2)); b.el.setAttribute("y2", B[1].toFixed(2));
      b.el.setAttribute("visibility", bs > 40 ? "visible" : "hidden");
    });

    // Cara: cerca de la punta al viajar, y se asienta en su sitio final.
    var settleF = smooth(2.5, 3.1, t);
    var fs = S - (14 + (S_END - S_FACE - 14) * settleF);
    var fp = at(fs);
    var loc = [faceLocal[0] * settleF, faceLocal[1] * settleF];
    var fc = fromLocal(loc, fp);
    var ang = (Math.atan2(fp.ty, fp.tx) - faceAng) * .22 * (1 - settleF);
    var look = Math.sin(t*5) * 1.2 * (1 - settleF);
    $("face").setAttribute("transform",
      "translate(" + (fc[0]-FACE_C[0]).toFixed(2) + "," + (fc[1]-FACE_C[1]).toFixed(2) + ")" +
      " rotate(" + (ang*180/Math.PI + look*3).toFixed(2) + " " + FACE_C[0] + " " + FACE_C[1] + ")");

    // Parpadeos y mirada hacia arriba mientras brota la planta.
    var blink = 0;
    [3.45, 3.72, 5.75].forEach(function (b) { blink = Math.max(blink, gauss(t, b, .055)); });
    var sy = Math.max(.14, 1 - blink);
    var lid = sy < .4 ? "#1d381c" : "#fdfdf6";
    eyeWhites[0].setAttribute("fill", lid); eyeWhites[1].setAttribute("fill", lid);
    $("eyeL").setAttribute("transform", "translate(0 " + (207.6*(1-sy)).toFixed(2) + ") scale(1 " + sy.toFixed(3) + ")");
    $("eyeR").setAttribute("transform", "translate(0 " + (208*(1-sy)).toFixed(2) + ") scale(1 " + sy.toFixed(3) + ")");
    var up = smooth(3.8, 4.1, t) * (1 - smooth(5.15, 5.45, t));
    var pupils = box.querySelectorAll(".lfi-pupil");
    pupils[0].setAttribute("transform", "translate(" + (-1*up).toFixed(2) + " " + (-1.8*up).toFixed(2) + ")");
    pupils[1].setAttribute("transform", "translate(" + (-1.4*up).toFixed(2) + " " + (-1.6*up).toFixed(2) + ")");

    // Rebote al llegar.
    var q = t > 3.1 ? .035 * Math.sin((t-3.1)*16) * Math.exp(-(t-3.1)*6) : 0;
    $("worm").setAttribute("transform",
      "translate(151 240) scale(" + (1+q).toFixed(4) + " " + (1-q).toFixed(4) + ") translate(-151 -240)");

    // Tallo
    var g = smooth(3.95, 5, t);
    var sway = 4.5 * Math.sin((t-4)*7) * Math.exp(-Math.max(0, t-4.6)*3.4) * smooth(4.1, 4.6, t) * (1 - smooth(5.8, 6.2, t));
    var bx = 151.2, by = 165, ex = 152.5, ey = 111.6;
    var tx = bx + (ex-bx)*g + sway*g, ty = by + (ey-by)*g;
    var cx = (bx+tx)/2 - sway*.4, cy = (by+ty)/2;
    $("stem").setAttribute("d", "M" + bx + "," + by + " Q" + cx.toFixed(2) + "," + cy.toFixed(2) + " " + tx.toFixed(2) + "," + ty.toFixed(2));
    $("stem").setAttribute("visibility", g > 0 ? "visible" : "hidden");

    // Hojas: nacen cerradas y se abren con un pequeño rebote.
    var open = ramp(4.45, 5.35, t);
    var scale = open > 0 ? back(open) : 0;
    var rot = (1 - back(open)) * 58;
    var tilt = sway * 2.4;
    $("plant").setAttribute("transform", "translate(" + (tx-ex).toFixed(2) + " " + (ty-ey).toFixed(2) + ")");
    $("leafL").setAttribute("transform", "rotate(" + (rot+tilt).toFixed(2) + " 152.5 111.6) translate(152.5 111.6) scale(" + scale.toFixed(3) + ") translate(-152.5 -111.6)");
    $("leafR").setAttribute("transform", "rotate(" + (-rot+tilt).toFixed(2) + " 152.5 111.6) translate(152.5 111.6) scale(" + scale.toFixed(3) + ") translate(-152.5 -111.6)");
    $("plant").setAttribute("visibility", open > 0 ? "visible" : "hidden");

    // Tierra: se abomba antes de que salga la lombriz y donde apoya la cabeza.
    var tremble = smooth(.05, .55, t) * (1 - smooth(2.2, 3.1, t));
    var h1 = 8 * tremble + (t < .62 ? Math.sin(t*46) * .9 * smooth(.1, .4, t) : 0);
    var h2 = 3.5 * smooth(2.75, 3.1, t) * (1 - smooth(3.15, 3.6, t));
    var d = "M30,300";
    for (var x = 30; x <= 275; x += 3) {
      var y = soilY(x) - h1*gauss(x, 95, 27) - h2*gauss(x, 207.5, 24);
      d += "L" + x + "," + y.toFixed(2);
    }
    $("soil").setAttribute("d", d + "L275,300Z");

    // Migajas
    crumbDefs.forEach(function (c) {
      var dt = t - c.t0;
      if (dt <= 0 || dt > 1.1) { c.el.setAttribute("visibility", "hidden"); return; }
      c.el.setAttribute("visibility", "visible");
      c.el.setAttribute("cx", (c.x + c.vx*dt).toFixed(2));
      c.el.setAttribute("cy", (236 + c.vy*dt + 130*dt*dt).toFixed(2));
    });
  }

    render = drawWorm;
  })();

  /* ---- Linea de tiempo: lombriz (0 a 5.5 s), letras (5.5 a 7 s), pausa y salida ---- */
  const TEXT_AT = 5.5, OUT_AT = 7.9;
  let start = null, raf = 0, closing = false;
  function tick(now) {
    if (start === null) start = now;
    const t = (now - start) / 1000;
    render(Math.min(t, END));
    if (t >= TEXT_AT) box.classList.add('txt');
    if (t >= OUT_AT) return finish();
    raf = requestAnimationFrame(tick);
  }
  function finish() {
    if (closing) return; closing = true;
    cancelAnimationFrame(raf); box.classList.add('out');
    setTimeout(() => { box.remove(); st.remove(); html.style.overflow = prevOverflow; }, 650);
  }
  render(0);
  raf = requestAnimationFrame(tick);
})();
