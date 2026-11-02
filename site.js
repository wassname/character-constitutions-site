// Tag-layout preview: show names on hover, keyboard focus or tap. -- PI/Sol
const tagTips = [...document.querySelectorAll('[data-tag-tip]')];
const hideTagTip = button => button.removeAttribute('data-tip-open');
const showTagTip = button => {
  tagTips.filter(other => other !== button).forEach(hideTagTip);
  button.setAttribute('data-tip-open', '');
  const label = button.querySelector('.tag-name');
  label.style.setProperty('--tip-shift', '0px');
  const rect = label.getBoundingClientRect();
  const shift = Math.max(8 - rect.left, Math.min(0, innerWidth - 8 - rect.right));
  label.style.setProperty('--tip-shift', `${shift}px`);
};
tagTips.forEach(button => {
  button.addEventListener('mouseenter', () => showTagTip(button));
  button.addEventListener('mouseleave', () => {
    if (document.activeElement === button) return;
    hideTagTip(button);
    if (tagTips.includes(document.activeElement)) showTagTip(document.activeElement);
  });
  button.addEventListener('focus', () => showTagTip(button));
  button.addEventListener('blur', () => hideTagTip(button));
  button.addEventListener('click', () => showTagTip(button));
});
if (tagTips.length) {
  document.addEventListener('keydown', event => { if (event.key === 'Escape') tagTips.forEach(hideTagTip); });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('[data-tag-tip]')) tagTips.forEach(hideTagTip); });
}

// Tag search includes full names and historical abbreviations. -- PI/Sol
const tagSearch = document.querySelector('[data-tag-search]');
if (tagSearch) {
  const entries = [...document.querySelectorAll('[data-tag-search-text]')];
  const filterTags = () => {
    const query = tagSearch.value.trim().toLowerCase();
    entries.forEach(entry => { entry.hidden = !entry.dataset.tagSearchText.includes(query); });
    document.querySelector('[data-tag-results]').textContent = `${entries.filter(entry => !entry.hidden).length} of ${entries.length} tags`;
  };
  tagSearch.addEventListener('input', filterTags);
  filterTags();
}

// Question pages: pick two models to compare (A defaults to the base model). The choice is kept in the URL (?a=..&b=..).
const picks = [...document.querySelectorAll('select[data-pick]')];
if (picks.length) {
  const p = new URLSearchParams(location.search);
  picks.forEach(s => { s.value = p.get(s.dataset.pick) || s.dataset.default; });
  const apply = () => {
    const [a, b] = picks.map(s => s.value), cmp = document.querySelector('.compare');
    cmp.querySelectorAll('.grid').forEach(g => {
      g.querySelectorAll('.col').forEach(c => c.hidden = true);
      [a, b].forEach((m, i) => { const c = g.querySelector(`.col[data-model="${m}"]`); if (c) { c.hidden = false; c.style.order = i; } });
    });
    cmp.style.setProperty('--n', a === b ? 1 : 2);
    const u = new URL(location); u.searchParams.set('a', a); u.searchParams.set('b', b); history.replaceState(null, '', u);
  };
  picks.forEach(s => s.addEventListener('change', apply));
  apply();
}

// Questions page: search question text and every reply (search.json); shows matches with a snippet, linked to the reply.
const qs = document.querySelector('[data-qsearch]');
if (qs) {
  const base = new URL('.', document.querySelector('link[href*="style.css"]').href).href;
  let idx = null;
  const esc = s => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const run = () => {
    const t = qs.value.trim().toLowerCase(), out = document.querySelector('[data-qhits]'), list = document.querySelector('[data-qlist]');
    if (t.length < 3) { out.innerHTML = ''; list.hidden = false; return; }
    list.hidden = true;
    const hits = idx.filter(d => d.text.toLowerCase().includes(t));
    out.innerHTML = `<p class="by">${hits.length} matches</p>` + hits.slice(0, 60).map(d => {
      const i = d.text.toLowerCase().indexOf(t), a = Math.max(0, i - 90), b = Math.min(d.text.length, i + t.length + 90);
      const snip = (a ? '…' : '') + esc(d.text.slice(a, i)) + '<mark>' + esc(d.text.slice(i, i + t.length)) + '</mark>' + esc(d.text.slice(i + t.length, b)) + (b < d.text.length ? '…' : '');
      return `<div class="hit"><a href="${base}${d.href}">${esc(d.title)}</a> <span class="by">${esc(d.who)}${d.turn ? ' · turn ' + d.turn : ''}</span><p>${snip}</p></div>`;
    }).join('');
  };
  const go = async () => { idx = idx || await (await fetch(base + 'search.json')).json(); run();
    const u = new URL(location); qs.value ? u.searchParams.set('s', qs.value) : u.searchParams.delete('s'); history.replaceState(null, '', u); };
  qs.addEventListener('input', go);
  const s0 = new URLSearchParams(location.search).get('s'); if (s0) { qs.value = s0; go(); }  // ?s=term links to a search
}

// Fold long replies to their first part, with a fade and a "Show all" button; once open, a line along the left margin folds
// them again (it stays on screen however far you scroll), and so does a "Show less" button that sticks to the bottom.
// Without JavaScript every reply is shown in full.
const addBar = (box, fold) => {
  const bar = document.createElement('span');
  bar.className = 'fold-bar'; bar.title = 'Fold';
  bar.addEventListener('click', e => { e.stopPropagation(); fold(); if (box.getBoundingClientRect().top < 0) box.scrollIntoView({block: 'start'}); });
  box.prepend(bar);
};
document.querySelectorAll('.reply-body').forEach(b => {
  if (b.classList.contains('elided') || b.scrollHeight < 560) return;
  b.classList.add('folded');
  const btn = document.createElement('button');
  btn.className = 'unfold'; btn.textContent = 'Show all';
  const set = f => { b.classList.toggle('folded', f); btn.textContent = f ? 'Show all' : 'Show less'; btn.classList.toggle('sticky', !f); };
  btn.addEventListener('click', () => set(!b.classList.contains('folded')));
  addBar(b, () => set(true));
  b.after(btn);
});
document.querySelectorAll('details.elide').forEach(d => addBar(d, () => { d.open = false; }));

// Hidden sentences inside a paragraph: a [...] button shows them in place.
document.querySelectorAll('.hide-s').forEach(h => {
  const b = document.createElement('button');
  b.className = 'show-s'; b.textContent = '[…]'; b.title = 'Show the hidden sentences';
  b.addEventListener('click', () => { h.classList.add('shown'); b.remove(); });
  h.before(b);
});
