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
  window.spineFollow = follow;

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
})();
