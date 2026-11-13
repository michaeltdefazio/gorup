(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var PAGE = { 'neck': 'neck.html', 'lower-back': 'lower-back.html' };

  var fromUrl = function () {
    try { var p = new URLSearchParams(location.search).get('spine'); return p === 'lower-back' || p === 'neck' ? p : null; } catch (e) { return null; }
  };

  /* ---- tab bar and next-step links follow the part of the spine you picked ---- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs a[data-tab]'));
  var carry = Array.prototype.slice.call(document.querySelectorAll('a[data-carry]'));
  var carryGuide = Array.prototype.slice.call(document.querySelectorAll('a[data-carry-guide]'));
  var follow = function (which) {
    tabs.forEach(function (a) {
      var t = a.getAttribute('data-tab');
      if (t === 'guide') a.setAttribute('href', PAGE[which]);
      else if (t === 'results' || t === 'recovery' || t === 'visit') a.setAttribute('href', t === 'visit' ? 'visit.html?spine=' + which : t + '.html?spine=' + which);
    });
    carry.forEach(function (a) { a.setAttribute('href', a.getAttribute('data-carry') + '?spine=' + which); });
    carryGuide.forEach(function (a) { a.setAttribute('href', PAGE[which]); });
  };

  /* ---- neck / low back switch (results and recovery pages) ---- */
  var seg = document.querySelector('[data-seg]');
  var initial = fromUrl();
  if (seg) {
    var btns = Array.prototype.slice.call(seg.querySelectorAll('button[data-pick]'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('[data-spine]'));
    var show = function (which, write) {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pick') === which ? 'true' : 'false'); });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-spine') !== which; });
      follow(which);
      if (write) { try { history.replaceState(null, '', location.pathname + '?spine=' + which); } catch (e) {} }
    };
    var topOfPanel = function () {
      var m = document.querySelector('main'), bar = document.querySelector('.topbar');
      var y = m.getBoundingClientRect().top + window.scrollY - (bar ? bar.offsetHeight : 0);
      if (window.scrollY > y) window.scrollTo(0, y);
    };
    btns.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-pick'), true); topOfPanel(); }); });
    show(initial || 'neck', false);
  } else if (initial) {
    follow(initial);
  }

  /* ---- questions to bring (visit page): nothing is saved or sent ---- */
  var tool = document.getElementById('visit-tool');
  if (tool) {
    var bringBox = Array.prototype.slice.call(tool.querySelectorAll('input[data-kind="bring"]'));
    var askBox = Array.prototype.slice.call(tool.querySelectorAll('input[data-kind="ask"]'));
    var custom = [];
    var out = document.getElementById('mylist-body');
    var count = document.getElementById('list-count');
    var floatBtn = document.getElementById('float-list');
    var listBox = document.getElementById('list');
    var inView = false, total = 0;
    var txt = function (s) { return String(s).replace(/\s+/g, ' ').trim(); };
    var plain = function () {
      var bring = bringBox.filter(function (c) { return c.checked; }).map(function (c) { return txt(c.getAttribute('data-label')) + ' (' + txt(c.getAttribute('data-detail')) + ')'; });
      var ask = askBox.filter(function (c) { return c.checked; }).map(function (c) { return txt(c.getAttribute('data-label')); }).concat(custom);
      return { bring: bring, ask: ask };
    };
    var syncFloat = function () { if (floatBtn) { floatBtn.hidden = !(total && !inView); } };
    var render = function () {
      var d = plain(), n = d.bring.length + d.ask.length;
      total = n;
      count.textContent = n ? '(' + n + ')' : '';
      if (floatBtn) { floatBtn.textContent = 'My list · ' + n; syncFloat(); }
      out.textContent = '';
      if (!n) { var e = document.createElement('p'); e.className = 'empty'; e.textContent = 'Tap the items above to build your list.'; out.appendChild(e); return; }
      var block = function (title, items, removable) {
        if (!items.length) return;
        var h = document.createElement('h3'); h.textContent = title; out.appendChild(h);
        var ul = document.createElement('ul');
        items.forEach(function (t, i) {
          var li = document.createElement('li'); li.appendChild(document.createTextNode(t));
          if (removable && removable(i)) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'rm'; b.textContent = 'Remove';
            b.setAttribute('aria-label', 'Remove: ' + t);
            b.addEventListener('click', function () { custom.splice(removable(i) - 1, 1); render(); });
            li.appendChild(b);
          }
          ul.appendChild(li);
        });
        out.appendChild(ul);
      };
      block('Bring', d.bring);
      var selected = askBox.filter(function (c) { return c.checked; }).length;
      block('Ask Dr. Gorup', d.ask, function (i) { return i >= selected ? i - selected + 1 : 0; });
    };
    if ('IntersectionObserver' in window && listBox) {
      new IntersectionObserver(function (es) { inView = es[0].isIntersecting; syncFloat(); }, { threshold: 0.05 }).observe(listBox);
    }
    var mark = function () { Array.prototype.forEach.call(tool.querySelectorAll('label.pick'), function (l) { var i = l.querySelector('input'); l.classList.toggle('on', !!(i && i.checked)); }); };
    tool.addEventListener('change', function () { mark(); render(); });
    var input = document.getElementById('own-q');
    var addOwn = function () {
      var v = txt(input.value); if (!v) { input.focus(); return; }
      custom.push(v); input.value = ''; render(); input.focus();
    };
    document.getElementById('add-q').addEventListener('click', addOwn);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addOwn(); } });
    var asText = function () {
      var d = plain(), lines = ['My list for my visit with Dr. Gorup', 'Indiana Spine Group · 765-446-5210 · 1345 Unity Place, Suite 310, Lafayette, IN 47905', ''];
      if (d.bring.length) { lines.push('Bring:'); d.bring.forEach(function (t) { lines.push('- ' + t); }); lines.push(''); }
      if (d.ask.length) { lines.push('Ask Dr. Gorup:'); d.ask.forEach(function (t) { lines.push('- ' + t); }); }
      return lines.join('\n');
    };
    var status = document.getElementById('list-status');
    var say = function (m) { status.textContent = m; setTimeout(function () { status.textContent = ''; }, 3500); };
    document.getElementById('print-list').addEventListener('click', function () { window.print(); });
    var copyBtn = document.getElementById('copy-list');
    copyBtn.addEventListener('click', function () {
      var t = asText();
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(function () { say('Copied. You can paste it into a message or a note.'); }, function () { say('Could not copy. Use Print instead.'); }); }
      else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); say('Copied. You can paste it into a message or a note.'); } catch (e) { say('Could not copy. Use Print instead.'); } document.body.removeChild(ta); }
    });
    var shareBtn = document.getElementById('share-list');
    if (navigator.share) {
      shareBtn.hidden = false;
      shareBtn.addEventListener('click', function () { navigator.share({ title: 'My list for my visit with Dr. Gorup', text: asText() }).catch(function () {}); });
    } else {
      copyBtn.classList.remove('ghost');
    }
    render();
  }
})();
