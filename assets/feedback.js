/* ==========================================================================
   Ensemble — feedbackmodus
   Aan:  voeg ?feedback toe aan de URL (blijft aan zolang het tabblad open is)
   Uit:  ?feedback=uit, of de knop "Stoppen" in de balk
   Werking: klik op een onderdeel van de pagina, schrijf je opmerking, verstuur.
   Inzendingen gaan naar Netlify Forms (formulier "feedback", zie index.html).
   Geen animaties of transitions, conform het design system.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'ensemble-feedback';
  var NAME_KEY = 'ensemble-feedback-naam';
  var VERSION = 'V6.9';

  function store(kind, fn) {
    try { return fn(window[kind]); } catch (e) { return null; }
  }

  var param = new URLSearchParams(location.search).get('feedback');
  if (param !== null) {
    if (param === 'uit' || param === 'off') store('sessionStorage', function (s) { s.removeItem(KEY); });
    else store('sessionStorage', function (s) { s.setItem(KEY, '1'); });
  }
  if (store('sessionStorage', function (s) { return s.getItem(KEY); }) !== '1') return;

  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'assets/feedback.css?v=' + VERSION;
  document.head.appendChild(css);

  var CATEGORIES = ['Tekst', 'Inhoud', 'Ontwerp', 'Werkt niet', 'Overig'];
  var picking = false;
  var hovered = null;
  var target = null;
  var sent = 0;

  /* ---------- helpers ---------- */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function isOwn(node) {
    return node && node.closest && node.closest('.fb-ui');
  }

  function selectorFor(node) {
    var parts = [];
    while (node && node.nodeType === 1 && node !== document.body) {
      if (node.id) { parts.unshift('#' + node.id); break; }
      var tag = node.tagName.toLowerCase();
      var cls = [].filter.call(node.classList, function (c) { return c.indexOf('fb-') !== 0; })[0];
      var part = tag + (cls ? '.' + cls : '');
      var sibs = node.parentNode ? [].filter.call(node.parentNode.children, function (s) { return s.tagName === node.tagName; }) : [];
      if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(node) + 1) + ')';
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  function sectionFor(node) {
    var sec = node && node.closest('section, header, footer');
    if (!sec) return { id: '', label: 'Algemeen' };
    var id = sec.id || (sec.classList.contains('hero') ? 'hero' : sec.tagName.toLowerCase());
    var h = sec.querySelector('h1, h2');
    var label = h ? (h.innerText || h.textContent).replace(/\s+/g, ' ').trim() : id;
    return { id: id, label: label };
  }

  function quoteFor(node) {
    if (!node) return '';
    var t = (node.getAttribute('alt') || node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > 160 ? t.slice(0, 157) + '…' : t;
  }

  /* ---------- UI ---------- */
  var bar = el('div', { class: 'fb-ui fb-bar', role: 'region', 'aria-label': 'Feedback' });
  var barText = el('p', { class: 'fb-bar-text', text: 'Feedbackmodus' });
  var pickBtn = el('button', { type: 'button', class: 'fb-btn fb-btn-primary', text: 'Klik een onderdeel aan' });
  var generalBtn = el('button', { type: 'button', class: 'fb-btn', text: 'Algemene opmerking' });
  var stopBtn = el('button', { type: 'button', class: 'fb-btn fb-btn-ghost', text: 'Stoppen' });
  bar.appendChild(barText);
  bar.appendChild(el('div', { class: 'fb-bar-actions' }, [pickBtn, generalBtn, stopBtn]));

  var panel = el('form', { class: 'fb-ui fb-panel', hidden: '', 'aria-label': 'Feedback schrijven' });
  var ctx = el('div', { class: 'fb-ctx' });
  var chips = el('fieldset', { class: 'fb-chips' }, [el('legend', { text: 'Soort' })]);
  CATEGORIES.forEach(function (c, i) {
    var id = 'fb-cat-' + i;
    var input = el('input', { type: 'radio', name: 'fb-cat', id: id, value: c });
    if (i === 0) input.checked = true;
    chips.appendChild(input);
    chips.appendChild(el('label', { for: id, text: c }));
  });
  var comment = el('textarea', { id: 'fb-comment', rows: '5', required: '', placeholder: 'Wat valt je op? Wat zou je anders doen?' });
  var name = el('input', { id: 'fb-name', type: 'text', autocomplete: 'name', placeholder: 'Je naam' });
  name.value = store('localStorage', function (s) { return s.getItem(NAME_KEY); }) || '';
  var status = el('p', { class: 'fb-status', role: 'status' });
  var sendBtn = el('button', { type: 'submit', class: 'fb-btn fb-btn-primary', text: 'Versturen' });
  var cancelBtn = el('button', { type: 'button', class: 'fb-btn fb-btn-ghost', text: 'Annuleren' });

  panel.appendChild(ctx);
  panel.appendChild(chips);
  panel.appendChild(el('label', { class: 'fb-label', for: 'fb-comment', text: 'Opmerking' }));
  panel.appendChild(comment);
  panel.appendChild(el('label', { class: 'fb-label', for: 'fb-name', text: 'Naam' }));
  panel.appendChild(name);
  panel.appendChild(status);
  panel.appendChild(el('div', { class: 'fb-panel-actions' }, [sendBtn, cancelBtn]));

  document.body.appendChild(bar);
  document.body.appendChild(panel);
  document.documentElement.classList.add('fb-active');

  function setBarText() {
    barText.textContent = picking
      ? 'Klik op het onderdeel waar je iets over wilt zeggen · Esc om te annuleren'
      : 'Feedbackmodus' + (sent ? ' · ' + sent + ' verstuurd, dank je!' : '');
  }

  function clearHover() {
    if (hovered) hovered.classList.remove('fb-hover');
    hovered = null;
  }

  function clearTarget() {
    if (target) target.classList.remove('fb-target');
    target = null;
  }

  function startPicking() {
    closePanel();
    picking = true;
    document.documentElement.classList.add('fb-picking');
    pickBtn.textContent = 'Annuleer aanwijzen';
    setBarText();
  }

  function stopPicking() {
    picking = false;
    clearHover();
    document.documentElement.classList.remove('fb-picking');
    pickBtn.textContent = 'Klik een onderdeel aan';
    setBarText();
  }

  function openPanel(node) {
    stopPicking();
    clearTarget();
    target = node;
    ctx.textContent = '';
    if (node) {
      node.classList.add('fb-target');
      var sec = sectionFor(node);
      ctx.appendChild(el('p', { class: 'fb-ctx-sec', text: sec.label }));
      var q = quoteFor(node);
      if (q) ctx.appendChild(el('p', { class: 'fb-ctx-quote', text: '“' + q + '”' }));
    } else {
      ctx.appendChild(el('p', { class: 'fb-ctx-sec', text: 'Algemene opmerking over de pagina' }));
    }
    status.textContent = '';
    panel.hidden = false;
    comment.focus();
  }

  function closePanel() {
    panel.hidden = true;
    clearTarget();
  }

  /* ---------- aanwijzen ---------- */
  document.addEventListener('mouseover', function (e) {
    if (!picking || isOwn(e.target)) return;
    clearHover();
    hovered = e.target;
    hovered.classList.add('fb-hover');
  });

  document.addEventListener('click', function (e) {
    if (!picking || isOwn(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    openPanel(e.target);
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (picking) stopPicking();
    else if (!panel.hidden) closePanel();
  });

  pickBtn.addEventListener('click', function () { picking ? stopPicking() : startPicking(); });
  generalBtn.addEventListener('click', function () { openPanel(null); });
  cancelBtn.addEventListener('click', closePanel);
  stopBtn.addEventListener('click', function () {
    store('sessionStorage', function (s) { s.removeItem(KEY); });
    stopPicking();
    closePanel();
    bar.remove();
    panel.remove();
    document.documentElement.classList.remove('fb-active');
  });

  /* ---------- versturen ---------- */
  panel.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = comment.value.trim();
    if (!text) { comment.focus(); return; }
    var who = name.value.trim();
    store('localStorage', function (s) { s.setItem(NAME_KEY, who); });

    var sec = sectionFor(target);
    var cat = panel.querySelector('input[name="fb-cat"]:checked');
    var data = {
      'form-name': 'feedback',
      naam: who,
      soort: cat ? cat.value : '',
      opmerking: text,
      sectie: sec.id,
      sectietitel: sec.label,
      element: target ? selectorFor(target) : '',
      citaat: quoteFor(target),
      pagina: location.pathname,
      versie: VERSION,
      scherm: window.innerWidth + '×' + window.innerHeight,
      moment: new Date().toISOString()
    };

    sendBtn.disabled = true;
    status.textContent = 'Versturen…';
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString()
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      sent += 1;
      comment.value = '';
      closePanel();
      setBarText();
    }).catch(function () {
      status.textContent = 'Versturen lukte niet. Je tekst staat er nog; probeer het opnieuw. (Lokaal werkt versturen niet, alleen op withensemble.nl.)';
    }).then(function () {
      sendBtn.disabled = false;
    });
  });
})();
