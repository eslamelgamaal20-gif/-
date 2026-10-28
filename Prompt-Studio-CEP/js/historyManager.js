/* ==========================================================================
   Prompt Studio — historyManager.js
   Prompt history (capped) and favorites. Both store the prompt text plus
   the state used to create it, so items can be re-opened.
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});

  function uid() { return 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* الصور المرفعة كبيرة الحجم — نزيلها قبل الحفظ حتى لا نتجاوز حصة التخزين
     (تبقى في الذاكرة أثناء الجلسة فقط). */
  function sanitizeState(state) {
    try {
      var s = JSON.parse(JSON.stringify(state || {}));
      if (s.refImageData && s.refImageData.length > 400000) {
        s.refImageData = '';
        s.refImageName = '';
      }
      if (s.refImages && s.refImages.length) {
        s.refImages = s.refImages.filter(function (im) { return im && im.data && im.data.length <= 300000; });
      }
      return s;
    } catch (e) { return state; }
  }

  function makeList(key) {
    return {
      list: function () { return PS.Storage.get(key, []) || []; },
      add: function (prompt, state, max) {
        var items = this.list();
        if (items.length && items[0].prompt === prompt) return items[0]; // skip exact duplicate
        var item = { id: uid(), prompt: prompt, state: sanitizeState(state), date: Date.now() };
        items.unshift(item);
        if (max && items.length > max) items = items.slice(0, max);
        PS.Storage.set(key, items);
        return item;
      },
      find: function (id) { return this.list().filter(function (x) { return x.id === id; })[0] || null; },
      remove: function (id) { PS.Storage.set(key, this.list().filter(function (x) { return x.id !== id; })); },
      clear: function () { PS.Storage.set(key, []); },
      trim: function (max) { var items = this.list(); if (items.length > max) PS.Storage.set(key, items.slice(0, max)); },
      contains: function (prompt) { return this.list().some(function (x) { return x.prompt === prompt; }); }
    };
  }

  PS.History = makeList('history');
  PS.Favorites = makeList('favorites');
})();
