/* Pre-visit form for Dr. Gorup's patients: neck or low back, one answer per question.
   Builds a one-page summary for the office, with the imaging and records checklist.
   Nothing is saved or sent anywhere. */
(function () {
  'use strict';
  var root = document.getElementById('intake');
  if (!root) return;
  var DOC = root.getAttribute('data-doc') || 'Dr. Gorup';
  var SHORT = root.getAttribute('data-short') || 'Dr. Gorup';
  var CONTACT = root.getAttribute('data-contact') || '';
  var form = document.getElementById('intake-form');
  var body = document.getElementById('sum-body');
  var actions = document.getElementById('sum-actions');
  var statusEl = document.getElementById('sum-status');
  var bar = document.getElementById('prog-bar');
  var progTxt = document.getElementById('prog-txt');
  var floatBtn = document.getElementById('float-sum');
  var box = document.getElementById('summary');
  var nameEl = document.getElementById('f_name');
  var inView = false, any = false;

  var txt = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };
  var all = function (sel, ctx) { return Array.prototype.slice.call((ctx || form).querySelectorAll(sel)); };
  var one = function (key) { var c = form.querySelector('input[name="' + key + '"]:checked'); return c ? c.value : ''; };
  var many = function (key) { return all('input[name="' + key + '"]:checked').map(function (c) { return c.value; }); };
  var field = function (key) { var f = document.getElementById('f_' + key); return f ? txt(f.value) : ''; };

  /* ---- show follow-up questions only when they apply; clear them when they stop applying ---- */
  var conditionals = function () {
    all('[data-show-if]').forEach(function (el) {
      var p = el.getAttribute('data-show-if').split('=');
      var show = p[1].split('|').indexOf(one(p[0])) !== -1;
      if (!show && !el.hidden) {
        all('input', el).forEach(function (i) { if (i.type === 'text') i.value = ''; else i.checked = false; });
        all('textarea', el).forEach(function (i) { i.value = ''; });
      }
      el.hidden = !show;
    });
  };
  var marks = function () {
    all('label.opt, label.pick').forEach(function (l) { var i = l.querySelector('input'); l.classList.toggle('on', !!(i && i.checked)); });
  };
  /* cap the suggested questions so people choose instead of tapping everything */
  var cap = function () {
    var fsEl = form.querySelector('fieldset[data-cap]');
    if (!fsEl) return;
    var max = parseInt(fsEl.getAttribute('data-cap'), 10) || 3;
    var boxes = all('input', fsEl), n = boxes.filter(function (b) { return b.checked; }).length;
    boxes.forEach(function (b) {
      var off = !b.checked && n >= max;
      b.disabled = off;
      b.parentNode.classList.toggle('dis', off);
    });
    var note = document.getElementById('askcap');
    if (note) note.textContent = n >= max ? 'You picked ' + max + '. Untick one to pick a different question.' : (max - n) + (max - n === 1 ? ' pick left' : ' picks left');
  };
  var progress = function () {
    var sets = all('fieldset[data-count]').filter(function (f) { return !f.closest('[hidden]'); });
    var done = sets.filter(function (f) { return f.querySelector('input:checked'); }).length;
    bar.style.width = (sets.length ? Math.round(100 * done / sets.length) : 0) + '%';
    progTxt.textContent = done + ' of ' + sets.length + ' questions answered';
  };

  /* ---- which part of the spine: the form, the tab links and the summary follow it ---- */
  var SPINE = { 'Neck': 'neck', 'Low back': 'lower-back' };
  var panelFor = function () {
    var s = one('spine');
    return s ? form.querySelector('.spine-panel[data-show-if="spine=' + s + '"]') : null;
  };

  /* ---- the summary ---- */
  var el = function (tag, cls, t) { var n = document.createElement(tag); if (cls) n.className = cls; if (t != null) n.textContent = t; return n; };
  var today = function () { try { return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return ''; } };
  var add = function (list, k, v) { if (v) list.push([k, v]); };

  var model = function () {
    var panel = panelFor(), m = { spine: one('spine'), goal: field('goal'), asks: [] };
    m.any = !!m.spine;
    m.pain = []; m.hist = []; m.care = []; m.core = []; m.other = []; m.todo = []; m.scores = [];
    if (panel) {
      var P = panel.getAttribute('data-prefix');
      m.area = panel.getAttribute('data-area');
      m.areaLong = panel.getAttribute('data-area-long');
      m.scores = [[panel.getAttribute('data-s1'), one(P + 'now')], [panel.getAttribute('data-s2'), one(P + 'limb')]];
      var flagFs = form.querySelector('fieldset[data-key="' + P + 'flag"]');
      m.flag = one(P + 'flag') === 'Yes' ? flagFs.getAttribute('data-flagtext') : '';
      add(m.pain, 'Side', one(P + 'side'));
      add(m.pain, 'Where', many(P + 'where').join(', '));
      add(m.pain, 'Symptoms', many(P + 'sym').join(', '));
      add(m.pain, 'How long', one(P + 'dur'));
      add(m.pain, 'Limits daily life', one(P + 'limit'));

      var s = one(P + 'surg');
      if (s === 'Yes') {
        var parts = ['Yes'], w = one(P + 'surg_where'), yr = field(P + 'surg_year');
        if (w) parts.push(w);
        if (yr) parts.push(yr);
        s = parts.join(' · ');
      }
      add(m.hist, 'Past neck or back surgery', s);
      var h = many(P + 'health');
      add(m.hist, 'Health items', h.join(', '));

      add(m.care, 'How long', one(P + 'care'));
      all('fieldset[data-group="tried"]', panel).forEach(function (f) {
        var k = f.getAttribute('data-key'), v = one(k);
        if (!v) return;
        if (k === P + 'tr_esi' && v === 'Helped' && one(P + 'esi_dur')) v += ' (relief lasted ' + one(P + 'esi_dur').toLowerCase() + ')';
        m.care.push([f.getAttribute('data-short'), v]);
      });
      add(m.care, 'Notes', field(P + 'care_note'));

      all('fieldset[data-group="img"]', panel).forEach(function (f) {
        var k = f.getAttribute('data-key'), st = one(k), wh = field(k + '_where');
        var v = st ? (st === 'Have it' && wh ? 'Have it · ' + wh : st) : 'Not answered';
        var row = [f.getAttribute('data-short'), v, st === 'Have it'];
        if (f.getAttribute('data-core')) {
          m.core.push(row);
          if (st !== 'Have it') m.todo.push(f.getAttribute('data-short'));
        } else m.other.push(row);
      });
      m.recs = one(P + 'recs');
    }
    many('ask').forEach(function (q) { m.asks.push(q); });
    if (field('own_q')) m.asks.push(field('own_q'));
    return m;
  };

  var dl = function (rows, cls) {
    var d = el('dl', 'sd' + (cls ? ' ' + cls : ''));
    rows.forEach(function (r) {
      d.appendChild(el('dt', '', r[0]));
      var dd = el('dd', r[2] === true ? 'ok' : (r[1] === 'Not answered' ? 'na' : ''), r[1]);
      d.appendChild(dd);
    });
    return d;
  };

  var render = function () {
    var m = model();
    any = m.any;
    body.textContent = '';
    if (actions) actions.hidden = !any;
    if (floatBtn) floatBtn.hidden = !(any && !inView);
    if (!any) { body.appendChild(el('p', 'sum-empty', 'Choose neck or low back above, then answer the questions. Your summary appears here.')); return; }
    var nm = field('name');
    body.appendChild(el('p', 'sum-meta', (nm ? 'Patient: ' + nm + ' · ' : '') + 'Prepared ' + today()));
    var ar = el('p', 'sum-arearow'); ar.appendChild(el('span', 'sum-area', m.area)); ar.appendChild(el('span', 'sum-long', m.areaLong + ' review'));
    body.appendChild(ar);
    if (m.flag) {
      var fl = el('div', 'sum-flag'); fl.appendChild(el('b', '', 'Review first. ')); fl.appendChild(document.createTextNode('The patient reports ' + m.flag + '.'));
      body.appendChild(fl);
    }
    if (m.scores[0][1] || m.scores[1][1]) {
      var sc = el('div', 'sum-scores');
      m.scores.forEach(function (x) {
        var c = el('div', 'sum-score'); c.appendChild(el('b', '', x[0]));
        if (x[1]) { c.appendChild(el('span', '', x[1])); c.appendChild(el('small', '', ' / 10')); } else { c.appendChild(el('span', '', '–')); }
        sc.appendChild(c);
      });
      body.appendChild(sc);
    }
    var block = function (title, node) { body.appendChild(el('h3', 'sh', title)); body.appendChild(node); };
    if (m.pain.length) block('Symptoms', dl(m.pain));
    var imgBox = el('div', 'sum-img');
    imgBox.appendChild(dl(m.core));
    if (m.other.length) { imgBox.appendChild(el('p', 'sum-subhead', 'Other studies')); imgBox.appendChild(dl(m.other)); }
    if (m.recs) imgBox.appendChild(dl([['Getting records', m.recs]]));
    if (m.todo.length) {
      var td = el('p', 'sum-todo'); td.appendChild(el('b', '', 'Not yet on hand: ')); td.appendChild(document.createTextNode(m.todo.join(', ')));
      imgBox.appendChild(td);
    }
    block('Imaging and records', imgBox);
    if (m.care.length) block('Care without surgery', dl(m.care, 'two'));
    if (m.goal) m.hist.push(['Wants to do again', m.goal]);
    if (m.hist.length) block('History, health and goals', dl(m.hist));
    if (m.asks.length) {
      var ol = el('ol', 'sq'); m.asks.forEach(function (q) { ol.appendChild(el('li', '', q)); });
      block('My questions for ' + SHORT, ol);
    }
    var br = el('p', 'sum-bring'); br.appendChild(el('b', '', 'Bring: ')); br.appendChild(document.createTextNode('your imaging discs or reports, a list of your medicines with doses, vitamins and supplements, and your insurance card.'));
    body.appendChild(br);
    body.appendChild(el('p', 'sum-foot', 'Reported by the patient on a website. This is not a medical record.'));
  };

  var asText = function () {
    var m = model(), nm = field('name'), L = [];
    L.push('Pre-visit summary for ' + DOC);
    if (CONTACT) L.push(CONTACT);
    L.push((nm ? 'Patient: ' + nm + ' · ' : '') + 'Prepared ' + today());
    if (m.area) L.push(m.area + ' (' + m.areaLong + ' review)');
    L.push('');
    if (m.flag) L.push('REVIEW FIRST: the patient reports ' + m.flag + '.', '');
    if (m.scores.length && (m.scores[0][1] || m.scores[1][1])) {
      L.push(m.scores[0][0] + ': ' + (m.scores[0][1] ? m.scores[0][1] + '/10' : 'not answered') + '. ' + m.scores[1][0] + ': ' + (m.scores[1][1] ? m.scores[1][1] + '/10' : 'not answered') + '.', '');
    }
    var sec = function (title, rows) { if (!rows.length) return; L.push(title.toUpperCase()); rows.forEach(function (r) { L.push('- ' + r[0] + ': ' + r[1]); }); L.push(''); };
    sec('Symptoms', m.pain);
    sec('Imaging and records', m.core.concat(m.other, m.recs ? [['Getting records', m.recs]] : []));
    if (m.todo.length) { L.push('Not yet on hand: ' + m.todo.join(', '), ''); }
    sec('Care without surgery', m.care);
    sec('History and health', m.hist);
    if (m.goal) { L.push('WHAT I WANT TO DO AGAIN'); L.push('- ' + m.goal); L.push(''); }
    if (m.asks.length) { L.push('MY QUESTIONS FOR ' + SHORT.toUpperCase()); m.asks.forEach(function (q, i) { L.push((i + 1) + '. ' + q); }); L.push(''); }
    L.push('Bring: imaging discs or reports, medicine list with doses, insurance card.', 'Reported by the patient. Not a medical record.');
    return L.join('\n');
  };

  var lastSpine = '';
  var update = function () {
    conditionals(); marks(); cap(); progress(); render();
    var s = one('spine');
    if (s !== lastSpine) {
      lastSpine = s;
      if (s && window.spineFollow) window.spineFollow(SPINE[s]);
      if (s) { try { history.replaceState(null, '', location.pathname + '?spine=' + SPINE[s]); } catch (e) {} }
    }
  };
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.type === 'checkbox' && t.checked) {
      var fsEl = t.closest('fieldset');
      if (t.hasAttribute('data-none')) all('input', fsEl).forEach(function (i) { if (i !== t) i.checked = false; });
      else { var n = fsEl && fsEl.querySelector('input[data-none]'); if (n) n.checked = false; }
    }
    update();
  });
  form.addEventListener('input', render);
  if (nameEl) nameEl.addEventListener('input', render);

  if ('IntersectionObserver' in window && box) {
    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (floatBtn) floatBtn.hidden = !(any && !inView); }, { threshold: 0.05 }).observe(box);
  }

  var timer;
  var say = function (t) { statusEl.textContent = t; clearTimeout(timer); timer = setTimeout(function () { statusEl.textContent = ''; }, 3500); };
  document.getElementById('print-sum').addEventListener('click', function () { window.print(); });
  var copyBtn = document.getElementById('copy-sum');
  var okMsg = 'Copied. You can paste it into a message or a note.';
  copyBtn.addEventListener('click', function () {
    var t = asText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { say(okMsg); }, function () { say('Could not copy. Use Print instead.'); });
    } else {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); say(okMsg); } catch (e) { say('Could not copy. Use Print instead.'); }
      document.body.removeChild(ta);
    }
  });
  var shareBtn = document.getElementById('share-sum');
  if (navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', function () { navigator.share({ title: 'Pre-visit summary for ' + DOC, text: asText() }).catch(function () {}); });
  } else {
    copyBtn.classList.remove('ghost');
  }
  document.getElementById('reset-form').addEventListener('click', function () {
    form.reset(); if (nameEl) nameEl.value = '';
    lastSpine = '';
    update(); say('Cleared.'); window.scrollTo({ top: 0, behavior: 'auto' });
  });

  /* arriving from a guide page: the part of the spine is already chosen */
  try {
    var q = new URLSearchParams(location.search).get('spine');
    var want = q === 'neck' ? 'Neck' : (q === 'lower-back' ? 'Low back' : '');
    if (want) { var r = form.querySelector('input[name="spine"][value="' + want + '"]'); if (r) r.checked = true; }
  } catch (e) {}
  update();
})();
