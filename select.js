/* Lista desplegable propia: reemplaza la lista nativa del navegador (que no se puede estilizar) en todos los <select>.
   Uso: enhanceSelect(select). Si cambias el valor por codigo: select.dispatchEvent(new Event('lf-sync')). */
const lfEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lfNorm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
document.addEventListener('click', e => document.querySelectorAll('.dd-sel .dd-menu:not([hidden])').forEach(m => { if (!m.parentNode.contains(e.target)) { m.hidden = true; m.previousElementSibling.setAttribute('aria-expanded', 'false'); } }));
function enhanceSelect(sel) {
  if (sel.dataset.dd) return; sel.dataset.dd = '1'; sel.hidden = true;
  const wrap = document.createElement('div'); wrap.className = 'dd dd-sel';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="dd-val"></span><span class="dd-arrow" aria-hidden="true">▾</span>';
  const menu = document.createElement('ul'); menu.className = 'dd-menu'; menu.setAttribute('role', 'listbox'); menu.hidden = true;
  const lab = sel.closest('label'); btn.setAttribute('aria-label', lab ? lab.firstChild.textContent.trim() : (sel.getAttribute('aria-label') || ''));
  wrap.append(btn, menu); sel.after(wrap);
  let items = [], typed = '', typedAt = 0;
  const render = () => {
    const cur = sel.options[sel.selectedIndex];
    btn.querySelector('.dd-val').textContent = cur ? cur.text : '';
    btn.classList.toggle('ph', !sel.value);
    menu.innerHTML = [...sel.options].filter(o => o.value !== '').map(o => `<li role="option" tabindex="-1" data-v="${lfEsc(o.value)}" aria-selected="${o.value === sel.value}">${lfEsc(o.text)}</li>`).join('');
    items = [...menu.children];
    items.forEach(li => li.onclick = () => choose(li));
  };
  const close = back => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (back) btn.focus(); };
  const choose = li => { sel.value = li.dataset.v; sel.dispatchEvent(new Event('change', { bubbles: true })); render(); close(true); };
  const open = () => {
    const r = btn.getBoundingClientRect(), below = innerHeight - r.bottom - (innerWidth <= 760 ? 84 : 16), up = below < 220 && r.top > below;
    menu.classList.toggle('up', up); menu.style.maxHeight = Math.max(150, Math.min(300, (up ? r.top : below) - 8)) + 'px';
    menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
    const on = items.find(li => li.getAttribute('aria-selected') === 'true') || items[0];
    if (on) { on.focus({ preventScroll: true }); on.scrollIntoView({ block: 'nearest' }); }
  };
  btn.onclick = () => menu.hidden ? open() : close();
  btn.onkeydown = e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (menu.hidden) open(); } };
  menu.onkeydown = e => {
    const i = items.indexOf(document.activeElement), go = n => { e.preventDefault(); const t = items[(n + items.length) % items.length]; t.focus(); t.scrollIntoView({ block: 'nearest' }); };
    if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i - 1); else if (e.key === 'Home') go(0); else if (e.key === 'End') go(items.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i >= 0) choose(items[i]); }
    else if (e.key === 'Escape' || e.key === 'Tab') close(true);
    else if (e.key.length === 1) {      // escribir letras salta a la opcion que empieza con ellas
      typed = (Date.now() - typedAt > 700 ? '' : typed) + lfNorm(e.key); typedAt = Date.now();
      const t = items.find(li => lfNorm(li.textContent).startsWith(typed)); if (t) { t.focus(); t.scrollIntoView({ block: 'nearest' }); }
    }
  };
  sel.addEventListener('lf-sync', render);
  render();
}
