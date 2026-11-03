/* Tema: 'light', 'dark' o automatico (sigue al sistema). Se guarda en lf_theme; sin valor = automatico.
   Al imprimir se conserva el tema de la pantalla (algunos navegadores simulan modo claro al preparar la impresion). */
(function () {
  const sys = matchMedia('(prefers-color-scheme: dark)');
  const stored = () => { try { return localStorage.getItem('lf_theme'); } catch (e) { return null; } };
  const mode = () => { const s = stored(); return s === 'light' || s === 'dark' ? s : 'auto'; };
  let printing = false, last = null;
  const eff = () => mode() === 'auto' ? (sys.matches ? 'dark' : 'light') : mode();
  function apply() {
    if (printing && last) return;            // no cambiar de tema mientras se imprime
    const t = last = eff();
    document.documentElement.dataset.theme = t;
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = t === 'dark' ? '#111a13' : '#2f7a3f';
  }
  function set(m) {
    try { if (m === 'auto') localStorage.removeItem('lf_theme'); else localStorage.setItem('lf_theme', m); } catch (e) {}
    apply();
  }
  window.lfTheme = { mode, set };
  apply();
  addEventListener('DOMContentLoaded', apply);
  addEventListener('beforeprint', () => { printing = true; });
  addEventListener('afterprint', () => { printing = false; apply(); });
  sys.addEventListener('change', () => { if (mode() === 'auto') apply(); });
})();
