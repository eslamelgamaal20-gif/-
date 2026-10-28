/* ==========================================================================
   Prompt Studio — index.js (UI Manager)
   Builds the panel from PS.Schema, keeps the UI <-> state in sync, and wires
   every button to the engine / storage / presets / history modules.
   ========================================================================== */
(function () {
  'use strict';
  var PS = window.PS;
  function $(id) { return document.getElementById(id); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function show(el, visible) { if (!el) return; if (visible) el.classList.remove('hidden'); else el.classList.add('hidden'); }
  function div(cls, text) { var d = document.createElement('div'); if (cls) d.className = cls; if (text !== undefined) d.textContent = text; return d; }

  var SETTINGS_KEY = 'settings';
  var WORKING_KEY = 'working';
  var DEFAULT_SETTINGS = {
    defaultIdentity: 'Off', defaultSkin: '', defaultQuality: 'Standard',
    promptLanguage: 'English', outputFormat: 'Paragraphs',
    autoSaveHistory: true, maxHistory: 50, template: PS.Schema.DEFAULT_TEMPLATE
  };

  var settings = clone(DEFAULT_SETTINGS);
  var state = {};
  var fieldEls = {};    // id -> { f, wrap, input, chips }
  var sectionEls = {};  // id -> { sec, wrap, head, body, badge, chev, open }
  var lastGenerated = '';
  var lastNegative = '';
  var libTab = 'history';
  var saveTimer = null;

  /* إعدادات العرض للمعاينة فقط. مخزنة في مفتاح منفصل وغير موجودة في state،
     لذلك لا تؤثر على البرومبت ولا تدخل في الحفظ أو الـ presets. */
  var PREVIEW_KEY = 'preview';
  var DEFAULT_PREVIEW = { visible: true, mode: 'natural', strength: 0.7, guides: false };
  var previewPrefs = clone(DEFAULT_PREVIEW);
  function loadPreviewPrefs() {
    try {
      var p = PS.Storage.get(PREVIEW_KEY, null);
      previewPrefs = p ? Object.assign(clone(DEFAULT_PREVIEW), p) : clone(DEFAULT_PREVIEW);
    } catch (e) { previewPrefs = clone(DEFAULT_PREVIEW); }
  }
  function savePreviewPrefs() {
    try { PS.Storage.set(PREVIEW_KEY, previewPrefs); } catch (e) { console.warn('[Preview] prefs not saved', e); }
  }

  /* ====================== helpers: activation, toast, modal ====================== */
  function onAct(el, fn) {
    if (!el) { console.warn('[UI] missing element for handler'); return; }
    el.addEventListener('click', function (e) { fn(e); });
    el._act = fn;
  }

  var toastTimer = null;
  function toast(msg, type) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast' + (type ? ' ' + type : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { show(t, false); }, type === 'error' ? 3800 : 2000);
  }

  var modalResolve = null;
  function openModal(o) {
    return new Promise(function (resolve) {
      $('modalTitle').textContent = o.title || '';
      $('modalMsg').textContent = o.msg || '';
      show($('modalMsg'), !!o.msg);
      var inp = $('modalInput');
      if (o.input) { show(inp, true); inp.value = o.value || ''; inp.placeholder = o.placeholder || ''; setTimeout(function () { try { inp.focus(); } catch (e) { /* noop */ } }, 60); }
      else show(inp, false);
      $('modalOk').textContent = o.okText || 'موافق';
      show($('modal'), true);
      modalResolve = function (ok) {
        show($('modal'), false);
        modalResolve = null;
        if (o.input) resolve(ok ? inp.value : null); else resolve(!!ok);
      };
    });
  }
  function confirmBox(title, msg, okText) { return openModal({ title: title, msg: msg, okText: okText || 'تأكيد' }); }
  function promptBox(title, value, placeholder) { return openModal({ title: title, input: true, value: value, placeholder: placeholder, okText: 'حفظ' }); }

  function safe(fn) {
    return function () {
      try { var r = fn.apply(null, arguments); if (r && r.catch) r.catch(function (e) { console.error(e); toast(e.message || String(e), 'error'); }); }
      catch (e) { console.error(e); toast(e.message || String(e), 'error'); }
    };
  }

  /* ====================== settings & working state ====================== */
  function loadSettings() {
    try { settings = Object.assign(clone(DEFAULT_SETTINGS), PS.Storage.get(SETTINGS_KEY, {}) || {}); }
    catch (e) { settings = clone(DEFAULT_SETTINGS); toast(e.message, 'error'); }
  }
  function mergeState(base, src) {
    Object.keys(src || {}).forEach(function (k) { if (base.hasOwnProperty(k)) base[k] = clone(src[k]); });
    return base;
  }
  function persistWorking() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        // الصورة المرفعة قد تكون كبيرة — لا نحفظها في التخزين المؤقت
        // (تبقى في الذاكرة أثناء الجلسة فقط) حتى لا نتجاوز حصة التخزين.
        var snap = { state: JSON.parse(JSON.stringify(state)), output: $('output').value, last: lastGenerated };
        if (snap.state && snap.state.refImageData && snap.state.refImageData.length > 900000) {
          snap.state.refImageData = '';
          snap.state.refImageName = '';
        }
        if (snap.state && snap.state.refImages && snap.state.refImages.length) {
          snap.state.refImages = snap.state.refImages.filter(function (im) { return im && im.data && im.data.length <= 400000; });
        }
        PS.Storage.set(WORKING_KEY, snap);
      }
      catch (e) { console.warn('[UI] working state not saved', e); }
    }, 400);
  }

  /* ====================== build form from schema ====================== */
  function buildSections() {
    /* كل قسم يُوضع في التبويب المناسب له (الفكرة / التفاصيل / الأسلوب) */
    var TAB_HOST = {
      reference: 'sec-idea', edit: 'sec-idea', designHidden: 'sec-idea',
      subject: 'sec-details', product: 'sec-details', body: 'sec-details', appearance: 'sec-details',
      clothing: 'sec-details', spatial: 'sec-details', background: 'sec-details', lighting: 'sec-details', camera: 'sec-details',
      style: 'sec-style', skin: 'sec-style', color: 'sec-style', dof: 'sec-style', quality: 'sec-style', custom: 'sec-style', negative: 'sec-style'
    };
    ['sec-idea', 'sec-details', 'sec-style'].forEach(function (hid) { var h = $(hid); if (h) h.innerHTML = ''; });
    PS.Schema.sections.forEach(function (sec) {
      var wrap = div('section');
      var head = div('section-head');
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      var chev = div('chev'); chev.textContent = '▸';
      var title = div('section-title', sec.title);
      var badge = div('badge hidden');
      var reset = div('reset-link', 'تصفير');
      reset.setAttribute('role', 'button');
      reset.setAttribute('tabindex', '0');
      reset.setAttribute('title', 'تصفير هذا القسم فقط');
      head.appendChild(chev); head.appendChild(title); head.appendChild(badge); head.appendChild(reset);
      var body = div('section-body');
      sec.fields.forEach(function (f) { body.appendChild(buildField(f)); });
      wrap.appendChild(head); wrap.appendChild(body);
      var host = $(TAB_HOST[sec.id] || 'sec-details');
      if (host) host.appendChild(wrap);

      var entry = { sec: sec, wrap: wrap, head: head, body: body, badge: badge, chev: chev, open: !!sec.open };
      sectionEls[sec.id] = entry;
      setOpen(entry, entry.open);
      onAct(head, function () { setOpen(entry, !entry.open); });
      reset.addEventListener('click', function (e) { e.stopPropagation(); resetSection(sec.id); });
      reset._act = function () { resetSection(sec.id); };
    });
  }

  function setOpen(entry, open) {
    entry.open = open;
    show(entry.body, open);
    entry.chev.textContent = open ? '▾' : '▸';
    entry.head.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function buildField(f) {
    var wrap = div('field');
    var entry = { f: f, wrap: wrap, input: null, chips: {} };
    fieldEls[f.id] = entry;

    if (f.type === 'hidden') { return wrap; }

    if (f.type === 'images' || f.type === 'image') {
      var ilabel = div('field-label');
      ilabel.appendChild(document.createTextNode(f.label));
      if (f.tip) {
        var itip = div('tip', '?');
        itip.setAttribute('title', f.tip);
        itip.setAttribute('role', 'button');
        itip.setAttribute('tabindex', '0');
        onAct(itip, function () { toast(f.tip); });
        ilabel.appendChild(itip);
      }
      wrap.appendChild(ilabel);
      var drop = div('img-drop');
      var fileInp = document.createElement('input');
      fileInp.type = 'file'; fileInp.accept = 'image/*'; fileInp.multiple = true;
      fileInp.className = 'hidden';
      var ph = div('img-ph', '📷 اضغط لاختيار صورة (يمكن أكثر من صورة مرجعية)');
      var listEl = div('img-list');
      drop.appendChild(ph); drop.appendChild(listEl); drop.appendChild(fileInp);
      onAct(drop, function () { fileInp.click(); });
      fileInp.addEventListener('change', function () {
        var files = fileInp.files;
        if (!files || !files.length) return;
        var added = 0;
        var pending = files.length;
        for (var fi = 0; fi < files.length; fi++) {
          (function (file) {
            var reader = new FileReader();
            reader.onload = function (ev) {
              state.refImages = (state.refImages || []).slice();
              state.refImages.push({ data: ev.target.result, name: file.name });
              added++;
              if (--pending === 0) {
                if (!state.identity || state.identity === 'Off') {
                  state.identity = 'Strict'; renderField('identity');
                }
                renderField(f.id); refreshUI(); onChange();
                toast('تم رفع ' + added + ' صورة مرجعية — سيحافظ المحرك على ملامح كل شخص', 'success');
                fileInp.value = '';
              }
            };
            reader.onerror = function () {
              if (--pending === 0) { toast('تعذّر قراءة بعض الصور.', 'error'); fileInp.value = ''; }
            };
            reader.readAsDataURL(file);
          })(files[fi]);
        }
      });
      wrap.appendChild(drop);
      entry.input = drop;
      entry._imgList = listEl;
      entry._imgPh = ph;
      return wrap;
    }

    if (f.type === 'toggle') {
      var row = document.createElement('label');
      row.className = 'toggle-row';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.addEventListener('change', function () { state[f.id] = !!cb.checked; onChange(); });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(f.label));
      wrap.appendChild(row);
      entry.input = cb;
      return wrap;
    }

    var label = div('field-label');
    label.appendChild(document.createTextNode(f.label));
    if (f.tip) {
      var tip = div('tip', '?');
      tip.setAttribute('title', f.tip);
      tip.setAttribute('role', 'button');
      tip.setAttribute('tabindex', '0');
      tip.setAttribute('aria-label', 'Help: ' + f.tip);
      onAct(tip, function () { toast(f.tip); });
      label.appendChild(tip);
    }
    wrap.appendChild(label);

    if (f.type === 'select') {
      var s = document.createElement('select');
      s.setAttribute('aria-label', f.label);
      if (f.def === undefined) addOption(s, '__none', '— بدون —');
      f.options.forEach(function (o) { addOption(s, o, PS.Schema.optLabel(f, o)); });
      s.addEventListener('change', function () {
        var val = readSelect(s);
        state[f.id] = val === '__none' ? '' : val;
        if (f.id === 'gender') { applyGenderOptions(); }
        if (f.id === 'lens' && state.lens) applyLensLink(state.lens);
        if (['lens', 'cameraAngle', 'shotType', 'dof'].indexOf(f.id) !== -1 && PS.DesignLibrary) {
          var camMsg = PS.DesignLibrary.cameraWarning(state);
          if (camMsg) toast(camMsg, 'error');
        }
        onChange();
      });
      wrap.appendChild(s);
      entry.input = s;
    } else if (f.type === 'multi') {
      var chips = div('chips');
      f.options.forEach(function (o) {
        var c = div('chip', PS.Schema.optLabel(f, o));
        c.setAttribute('role', 'button');
        c.setAttribute('tabindex', '0');
        onAct(c, function () {
          var arr = state[f.id] = (state[f.id] || []).slice();
          var i = arr.indexOf(o);
          if (i >= 0) arr.splice(i, 1); else arr.push(o);
          renderField(f.id);
          onChange();
        });
        chips.appendChild(c);
        entry.chips[o] = c;
      });
      wrap.appendChild(chips);
    } else if (f.type === 'textarea') {
      var ta = document.createElement('textarea');
      ta.className = 'ta-' + (f.rows || 3); // explicit heights (UXP 4.x ignores rows)
      ta.setAttribute('dir', 'auto');
      ta.setAttribute('aria-label', f.label);
      if (f.placeholder) ta.placeholder = f.placeholder;
      ta.addEventListener('input', function () { state[f.id] = ta.value; onChange(true); });
      wrap.appendChild(ta);
      entry.input = ta;
    } else {
      var inp = document.createElement('input');
      inp.type = f.type === 'number' ? 'number' : 'text';
      if (f.type === 'number') { if (f.min !== undefined) inp.min = f.min; if (f.max !== undefined) inp.max = f.max; }
      inp.setAttribute('dir', 'auto');
      inp.setAttribute('aria-label', f.label);
      if (f.placeholder) inp.placeholder = f.placeholder;
      inp.addEventListener('input', function () { state[f.id] = inp.value; onChange(true); });
      wrap.appendChild(inp);
      entry.input = inp;
    }
    return wrap;
  }

  function addOption(sel, value, label) {
    var o = document.createElement('option');
    o.setAttribute('value', value);
    o.value = value; o.textContent = label;
    sel.appendChild(o);
  }

  /* Robust <select> helpers — older UXP (Photoshop 2021) does not always
     honour select.value, so we go through the option elements directly. */
  function selectOptions(sel) { return sel.querySelectorAll('option'); }
  function readSelect(sel) {
    var opts = selectOptions(sel), i = sel.selectedIndex;
    if (i !== undefined && i !== null && i >= 0 && opts[i]) return opts[i].getAttribute('value');
    return sel.value;
  }
  function setSelect(sel, value) {
    var opts = selectOptions(sel), idx = 0;
    for (var i = 0; i < opts.length; i++) {
      var match = opts[i].getAttribute('value') === value;
      if (match) idx = i;
      try { opts[i].selected = match; } catch (e) { /* noop */ }
    }
    try { sel.selectedIndex = idx; } catch (e) { /* noop */ }
    try { sel.value = value; } catch (e) { /* noop */ }
  }

  /* Replaces CSS :last-child (unreliable in UXP 4.x) for button rows. */
  function markLast(root) {
    var rows = (root || document).querySelectorAll('.btn-row');
    for (var i = 0; i < rows.length; i++) {
      var kids = rows[i].children;
      if (kids.length) kids[kids.length - 1].classList.add('last');
    }
  }

  /* ====================== render state -> UI ====================== */
  function renderField(id) {
    var e = fieldEls[id]; if (!e) return;
    var f = e.f, v = state[id];
    if (f.type === 'hidden') { return; }
    if (f.type === 'images' || f.type === 'image') {
      var list = e._imgList, phEl = e._imgPh;
      if (!list) return;
      var arr = v || [];
      list.innerHTML = '';
      if (phEl) show(phEl, !arr.length);
      arr.forEach(function (item, idx) {
        var row = div('img-row');
        var th = document.createElement('img');
        th.className = 'img-thumb-small';
        th.src = item.data;
        var nm = div('img-name', item.name || ('مرجع ' + (idx + 1)));
        var rm = div('img-rm', '✕');
        rm.setAttribute('role', 'button'); rm.setAttribute('tabindex', '0');
        onAct(rm, function (e2) {
          e2.stopPropagation();
          var cur = (state.refImages || []).slice();
          cur.splice(idx, 1);
          state.refImages = cur;
          renderField(f.id); refreshUI(); onChange();
        });
        row.appendChild(th); row.appendChild(nm); row.appendChild(rm);
        list.appendChild(row);
      });
      return;
    }
    if (f.type === 'multi') {
      var arr = v || [];
      Object.keys(e.chips).forEach(function (o) {
        var c = e.chips[o];
        if (arr.indexOf(o) !== -1) c.classList.add('active'); else c.classList.remove('active');
        c.setAttribute('aria-pressed', arr.indexOf(o) !== -1 ? 'true' : 'false');
      });
    } else if (f.type === 'toggle') {
      e.input.checked = !!v;
    } else if (f.type === 'select') {
      setSelect(e.input, v ? v : (f.def === undefined ? '__none' : f.def));
    } else {
      if (e.input.value !== String(v == null ? '' : v)) e.input.value = v == null ? '' : v;
    }
  }
  function renderValues() {
    Object.keys(fieldEls).forEach(renderField);
    refreshUI();
    var mi = $('mainIdea');
    if (mi && document.activeElement !== mi && mi.value !== (state.mainIdea || '')) mi.value = state.mainIdea || '';
    try { if (PS.DesignLibrary && PS.DesignLibrary.refresh) PS.DesignLibrary.refresh(); } catch (e) { /* noop */ }
  }

  function countFilled(sec) {
    var defaults = PS.Schema.defaultState(settings), n = 0;
    sec.fields.forEach(function (f) {
      if (f.companion || !PS.Schema.isFieldVisible(f, state)) return;
      if (JSON.stringify(state[f.id]) !== JSON.stringify(defaults[f.id])) n++;
    });
    return n;
  }

  function refreshUI() {
    try { refreshComposePreview(); } catch (e) { console.warn('[Preview]', e); }
    Object.keys(sectionEls).forEach(function (id) {
      var e = sectionEls[id];
      show(e.wrap, PS.Schema.isSectionVisible(e.sec, state));
      var n = countFilled(e.sec);
      e.badge.textContent = String(n);
      show(e.badge, n > 0);
    });
    Object.keys(fieldEls).forEach(function (id) {
      var e = fieldEls[id];
      show(e.wrap, PS.Schema.isFieldVisible(e.f, state));
    });
    if (state.mode === 'Editing') { $('modeEditing').classList.add('active'); $('modeGeneration').classList.remove('active'); }
    else { $('modeGeneration').classList.add('active'); $('modeEditing').classList.remove('active'); }
  }

  function onChange(textOnly) {
    if (!textOnly) refreshUI();
    else {
      // keep badges fresh without re-rendering inputs (avoids caret jumps)
      Object.keys(sectionEls).forEach(function (id) {
        var e = sectionEls[id], n = countFilled(e.sec);
        e.badge.textContent = String(n); show(e.badge, n > 0);
      });
    }
    persistWorking();
  }

  function resetSection(secId) {
    var sec = PS.Schema.findSection(secId);
    var defaults = PS.Schema.defaultState(settings);
    sec.fields.forEach(function (f) { state[f.id] = clone(defaults[f.id]); });
    renderValues();
    persistWorking();
    toast('تم تصفير قسم: ' + sec.title);
  }

  /* ====================== main actions ====================== */
  function showWarnings(list) {
    var box = $('warnings');
    box.innerHTML = '';
    (list || []).forEach(function (w) { box.appendChild(div('', '⚠ ' + w)); });
    show(box, list && list.length > 0);
  }
  function updateCount() {
    var v = $('output').value;
    $('charCount').textContent = v ? v.length + ' حرف · ' + (v.trim().split(/\s+/).length) + ' كلمة' : '';
  }

  function doGenerate() {
    var r;
    try { r = PS.PromptEngine.generate(state, settings); }
    catch (e) { console.error('[Engine]', e); toast('خطأ في محرك البروميت: ' + e.message, 'error'); return; }
    if (!r.ok) { toast(r.error, 'error'); return; }
    $('output').value = r.prompt;
    lastGenerated = r.prompt;
    showWarnings(r.warnings);
    updateCount();
    persistWorking();
    if (settings.autoSaveHistory) {
      try { PS.History.add(r.prompt, clone(state), settings.maxHistory); }
      catch (e) { toast(e.message, 'error'); return; }
    }
    showTab('result');
    toast(r.warnings.length ? 'تم توليد البروميت · تم حل ' + r.warnings.length + ' تعارض' : 'تم توليد البروميت', 'success');
  }

  function doRegenerate() {
    var cur = $('output').value;
    if (cur && cur !== lastGenerated) {
      return confirmBox('استبدال التعديلات اليدوية؟', 'لقد عدّلت البروميت يدوياً. إعادة التوليد ستستبدل تعديلاتك.', 'إعادة التوليد')
        .then(function (ok) { if (ok) doGenerate(); });
    }
    doGenerate();
  }

  function doCopy() {
    var fmt = state.copyFormat || 'prompt';
    var text = $('output').value.trim();
    var neg = (lastNegative || '').trim();
    if (fmt === 'negative') text = neg ? 'Negative prompt: ' + neg : '';
    else if (fmt === 'both') text = (text + (neg ? '\n\nNegative prompt: ' + neg : '')).trim();
    else if (fmt === 'json') text = JSON.stringify({ prompt: $('output').value.trim(), negative: neg, model: state.targetModel || 'Universal' }, null, 2);
    if (!text) { toast('لا يوجد نسخ — ولّد بروميت أولاً.', 'error'); return; }
    return PS.Storage.copyText(text).then(function () { toast('تم النسخ (' + fmt + ')', 'success'); })
      .catch(function (e) {
        console.error('[Clipboard]', e);
        // Fallback for builds without clipboard API: select the text for manual copy.
        try { var o = $('output'); o.focus(); if (o.select) o.select(); } catch (err) { /* noop */ }
        toast('النسخ التلقائي غير متاح في هذه النسخة من فوتوشوب. النص مُحدد — اضغط Ctrl/Cmd+C.', 'error');
      });
  }

  function doEdit() {
    var o = $('output');
    try { o.focus(); var n = o.value.length; o.setSelectionRange && o.setSelectionRange(n, n); } catch (e) { /* noop */ }
    toast('عدّل بحرية — النسخ يستخدم نصك المعدّل دائماً');
  }

  function doFavorite() {
    var text = $('output').value.trim();
    if (!text) { toast('ولّد بروميت أولاً.', 'error'); return; }
    if (PS.Favorites.contains(text)) { toast('موجود في المفضلة بالفعل'); return; }
    PS.Favorites.add(text, clone(state), 500);
    toast('تمت الإضافة للمفضلة ★', 'success');
  }

  function doSaveHistory() {
    var text = $('output').value.trim();
    if (!text) { toast('ولّد بروميت أولاً.', 'error'); return; }
    PS.History.add(text, clone(state), settings.maxHistory);
    toast('تم الحفظ في السجل', 'success');
  }

  function changedCount() {
    var d = PS.Schema.defaultState(settings), n = 0;
    Object.keys(d).forEach(function (k) { if (JSON.stringify(state[k]) !== JSON.stringify(d[k])) n++; });
    return n;
  }

  function doClear() {
    var needConfirm = changedCount() > 3 || $('output').value.trim().length > 0;
    var p = needConfirm ? confirmBox('مسح كل شيء؟', 'سيتم إعادة ضبط كل الاختيارات والتعليمات المخصصة والبروميت المولد إلى الوضع الافتراضي.', 'مسح') : Promise.resolve(true);
    return p.then(function (ok) {
      if (!ok) return;
      var mode = state.mode;
      state = PS.Schema.defaultState(settings);
      state.mode = mode;
      $('output').value = ''; lastGenerated = '';
      showWarnings([]); updateCount();
      renderValues(); persistWorking();
      toast('تم المسح');
    });
  }

  function doRandomize() {
    state = PS.Randomizer.randomize(state, settings);
    applyGenderOptions();
    renderValues(); persistWorking();
    toast('تم التوليد العشوائي الذكي — إعدادات متناسقة');
  }

  /* ====================== Smart Logic: جملة عربية → بروميت احترافي ====================== */
  function doSmartLogic() {
    var txt = ($('smartText') && $('smartText').value || '').trim();
    if (!txt) { toast('اكتب جملة بالعربي أولاً — مثال: خليه واقف قدام عربية بالليل.', 'error'); return; }
    var r;
    try { r = PS.PromptEngine.smartLogic(txt, settings); }
    catch (e) { console.error('[SmartLogic]', e); toast('خطأ في المنطق الذكي: ' + e.message, 'error'); return; }
    if (!r.ok) { toast(r.error, 'error'); return; }
    $('output').value = r.prompt;
    lastGenerated = r.prompt;
    showWarnings(r.warnings);
    updateCount(); persistWorking();
    showTab('result');
    toast('تم تحويل جملتك لبروميت احترافي كامل ✨', 'success');
  }

  /* يستخرج إشارات الـ smart logic ويملأ الحقول المتاحة بها */
  function doSmartExtract() {
    var txt = ($('smartText') && $('smartText').value || '').trim();
    if (!txt) { toast('اكتب جملة بالعربي أولاً.', 'error'); return; }
    var changed = [];
    if (/عربية|سيارة|كار|\bcar\b/i.test(txt)) { state.subjectType = 'Object'; changed.push('نوع الموضوع'); }
    if (/واقف|وقف|standing/i.test(txt)) { state.pose = (state.pose || []).concat(['Standing']); changed.push('الوضعية'); }
    if (/ماسك|يمسك|تمسك|بيمسك|holding|holds/i.test(txt)) {
      state.pose = (state.pose || []).concat(['Holding Object']);
      var objMap = [[/كوب|قهوة|قهوه|coffee|cup/i, 'a cup of coffee'], [/كتاب|book/i, 'a book'], [/موبايل|تليفون|هاتف|phone/i, 'a phone'], [/شنطة|شنطه|bag/i, 'a bag'], [/نظارة|نظاره|glasses/i, 'a pair of glasses'], [/عطر|perfume/i, 'a perfume bottle'], [/سيف|sword/i, 'a sword'], [/ميكروفون|microphone/i, 'a microphone']];
      for (var oi = 0; oi < objMap.length; oi++) { if (objMap[oi][0].test(txt)) { state.heldObject = objMap[oi][1]; break; } }
      if (!state.heldObject) state.heldObject = 'an object held naturally in hand';
      changed.push('الشيء الممسوك');
    }
    if (/قاعد|قاعدة|جالس|sitting/i.test(txt)) { state.pose = (state.pose || []).concat(['Sitting']); changed.push('الوضعية'); }
    if (/ماشي|يمشي|walking/i.test(txt)) { state.pose = (state.pose || []).concat(['Walking']); changed.push('الوضعية'); }
    if (/ليل|بالليل|night/i.test(txt)) { state.lightingType = 'Neon Light'; state.colorTemp = 'Warm'; state.colorGrading = (state.colorGrading || []).concat(['Cinematic']); changed.push('الإضاءة الليلية'); }
    if (/صباح|نهار|day\b/i.test(txt)) { state.lightingType = 'Natural Daylight'; changed.push('إضاءة النهار'); }
    if (/غروب|sunset/i.test(txt)) { state.lightingType = 'Golden Hour'; changed.push('ساعة ذهبية'); }
    if (/مطر|مطرة|rain/i.test(txt)) { state.foreground = 'rain droplets'; changed.push('أمطار أمامية'); }
    if (/شاطئ|بحر|beach|sea/i.test(txt)) { state.background = 'Beach'; changed.push('الخلفية'); }
    if (/مدينة|شارع|street|city/i.test(txt)) { state.background = 'Urban Street'; changed.push('الخلفية'); }
    if (/صحراء|desert/i.test(txt)) { state.background = 'Desert'; changed.push('الخلفية'); }
    if (/غابة|شجر|forest|trees/i.test(txt)) { state.background = 'Forest'; changed.push('الخلفية'); }
    if (/مقهى|قهوة|cafe|coffee/i.test(txt)) { state.background = 'Restaurant'; changed.push('الخلفية'); }
    renderValues(); persistWorking();
    if (changed.length) toast('تم استخراج: ' + changed.join('، '), 'success');
    else toast('لم أجد إشارات واضحة لاستخراجها — استخدم "حوّل لبروميت" مباشرة.', 'error');
  }

  /* ربط تلقائي بين العدسة والتفاصيل المرتبطة بها */
  var LENS_LINK = {
    '14mm': { cameraPerspective: 'Wide Perspective', cameraDistance: 'Far', photoStyle: null },
    '24mm': { cameraPerspective: 'Wide Perspective', cameraDistance: 'Medium', photoStyle: null },
    '35mm': { cameraPerspective: 'Natural Perspective', cameraDistance: 'Medium', photoStyle: null },
    '50mm': { cameraPerspective: 'Natural Perspective', cameraDistance: 'Medium', photoStyle: null },
    '85mm': { cameraPerspective: 'Natural Perspective', cameraDistance: 'Close', bodyFraming: 'Portrait', photoStyle: 'Portrait Photography' },
    '105mm': { cameraPerspective: 'Compressed Perspective', cameraDistance: 'Close', bodyFraming: 'Portrait', photoStyle: null },
    '135mm': { cameraPerspective: 'Compressed Perspective', cameraDistance: 'Close', bodyFraming: 'Portrait', photoStyle: null },
    '200mm': { cameraPerspective: 'Compressed Perspective', cameraDistance: 'Far', bodyFraming: 'Portrait', photoStyle: null },
    'Macro': { cameraPerspective: 'Natural Perspective', cameraDistance: 'Very Close', photoStyle: 'Product Photography' }
  };
  function applyLensLink(lens) {
    var link = LENS_LINK[lens];
    if (!link) return;
    var auto = [];
    Object.keys(link).forEach(function (k) {
      var want = link[k];
      if (!want) return;
      if (!state[k]) { state[k] = want; auto.push(want); renderField(k); }
    });
    if (auto.length) toast('تم ربط العدسة تلقائياً: ' + auto.join('، '), 'success');
  }

  /* ربط النوع (رجل/سيدة) بخيارات التسريحة والإكسسوارات */
  function fieldDef(sectionId, id) {
    var sec = PS.Schema.findSection(sectionId);
    if (!sec) return null;
    for (var i = 0; i < sec.fields.length; i++) if (sec.fields[i].id === id) return sec.fields[i];
    return null;
  }
  function repopulateSelect(fieldId, options) {
    var e = fieldEls[fieldId];
    if (!e || e.f.type !== 'select') return;
    var sel = e.input, f = e.f;
    var cur = state[fieldId];
    sel.innerHTML = '';
    if (f.def === undefined) addOption(sel, '__none', '— بدون —');
    options.forEach(function (o) { addOption(sel, o, PS.Schema.optLabel(f, o)); });
    setSelect(sel, cur ? cur : (f.def === undefined ? '__none' : f.def));
    if (f.def === undefined && !cur) state[fieldId] = '';
  }
  function filterChips(fieldId, allowed) {
    var e = fieldEls[fieldId];
    if (!e || !e.chips) return;
    Object.keys(e.chips).forEach(function (o) {
      var c = e.chips[o];
      c.style.display = (!allowed || allowed.indexOf(o) !== -1) ? '' : 'none';
    });
  }
  function applyGenderOptions() {
    var G = PS.Schema.GENDERED;
    if (!G) return;
    var g = state.gender;
    var hf = fieldDef('appearance', 'hairStyle');
    var af = fieldDef('appearance', 'accessories');
    var hairOpts = g === 'Man' ? G.hairStyle.Man : (g === 'Woman' ? G.hairStyle.Woman : (hf ? hf.options : null));
    if (hf && hairOpts) {
      if (state.hairStyle && hairOpts.indexOf(state.hairStyle) === -1) state.hairStyle = '';
      repopulateSelect('hairStyle', hairOpts);
    }
    if (af) filterChips('accessories', g === 'Man' ? G.accessories.Man : (g === 'Woman' ? G.accessories.Woman : null));
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode === 'Editing') { var e = sectionEls.edit; if (e) setOpen(e, true); }
    refreshUI(); persistWorking();
  }

  /* ====================== presets ====================== */
  function populatePresets(selectId) {
    var sel = $('presetSelect');
    sel.innerHTML = '';
    addOption(sel, '__none', '— اختر إعداداً محفوظاً —');
    var all;
    try { all = PS.Presets.all(); } catch (e) { toast(e.message, 'error'); all = []; }
    all.forEach(function (p) { addOption(sel, p.id, (p.builtIn ? '★ ' : '• ') + p.name); });
    setSelect(sel, selectId || '__none');
  }
  function selectedPreset() {
    var id = readSelect($('presetSelect'));
    return id && id !== '__none' ? PS.Presets.find(id) : null;
  }
  function applyPresetState(pState) {
    var keepText = { customText: state.customText, customPriority: state.customPriority, editText: state.editText, negativeExtra: state.negativeExtra,
      refImageData: state.refImageData, refImageName: state.refImageName, refMatchBody: state.refMatchBody, refMatchPose: state.refMatchPose,
      refImages: state.refImages, gradientColor1: state.gradientColor1, gradientColor2: state.gradientColor2, textSpace: state.textSpace, textSpaceContent: state.textSpaceContent,
      designIdea: state.designIdea, targetModel: state.targetModel, copyFormat: state.copyFormat, imageStory: state.imageStory };
    var base = PS.Schema.defaultState(settings);
    base.mode = state.mode;
    mergeState(base, pState);
    Object.keys(keepText).forEach(function (k) { if (pState[k] === undefined) base[k] = keepText[k]; });
    state = base;
    applyGenderOptions();
    renderValues(); persistWorking();
  }
  function presetLoad() {
    var p = selectedPreset();
    if (!p) { toast('اختر إعداداً محفوظاً أولاً.', 'error'); return; }
    applyPresetState(p.state);
    toast('تم تحميل الإعداد: ' + p.name, 'success');
  }
  function presetSave() {
    var cur = selectedPreset();
    return promptBox('حفظ الإعداد', cur && !cur.builtIn ? cur.name : '', 'اسم الإعداد').then(function (name) {
      if (name === null) return;
      var saved = PS.Presets.save(name, clone(state));
      populatePresets(saved.id);
      toast('تم حفظ الإعداد: ' + saved.name, 'success');
    });
  }
  function presetRename() {
    var p = selectedPreset();
    if (!p) { toast('اختر إعداداً محفوظاً أولاً.', 'error'); return; }
    if (p.builtIn) { toast('الإعدادات المدمجة لا يمكن إعادة تسميتها. احفظ نسخة أولاً.', 'error'); return; }
    return promptBox('إعادة تسمية الإعداد', p.name).then(function (name) {
      if (name === null) return;
      PS.Presets.rename(p.id, name);
      populatePresets(p.id);
      toast('تمت إعادة التسمية', 'success');
    });
  }
  function presetDelete() {
    var p = selectedPreset();
    if (!p) { toast('اختر إعداداً محفوظاً أولاً.', 'error'); return; }
    if (p.builtIn) { toast('الإعدادات المدمجة لا يمكن حذفها.', 'error'); return; }
    return confirmBox('حذف الإعداد؟', 'سيتم حذف "' + p.name + '" نهائياً.', 'حذف').then(function (ok) {
      if (!ok) return;
      PS.Presets.remove(p.id);
      populatePresets();
      toast('تم الحذف');
    });
  }
  function presetExport() {
    if (!PS.Presets.userPresets().length) { toast('لا توجد إعدادات محفوظة للتصدير بعد. احفظ إعداداً أولاً.', 'error'); return; }
    return PS.Storage.saveTextFile('prompt-studio-presets.json', PS.Presets.exportJSON()).then(function (ok) {
      if (ok) toast('تم تصدير الإعدادات', 'success');
    });
  }
  function presetImport() {
    return PS.Storage.openTextFile().then(function (text) {
      if (text === null || text === undefined) return;
      var n = PS.Presets.importJSON(text);
      populatePresets();
      toast(n ? ('تم استيراد ' + n + ' إعداد') : 'فشل الاستيراد', n ? 'success' : 'error');
    });
  }

  /* ====================== library: history / favorites / settings ====================== */
  function openLibrary(tab) {
    libTab = tab;
    show($('mainView'), false);
    show($('libraryView'), true);
    renderLibrary();
  }
  function closeLibrary() {
    show($('libraryView'), false);
    show($('mainView'), true);
  }

  function renderLibrary() {
    ['History', 'Favorites', 'Settings'].forEach(function (t) {
      var el = $('tab' + t);
      if (t.toLowerCase() === libTab) el.classList.add('active'); else el.classList.remove('active');
    });
    var root = $('libraryContent');
    root.innerHTML = '';
    try {
      if (libTab === 'settings') renderSettings(root);
      else renderItems(root, libTab === 'history' ? PS.History : PS.Favorites, libTab === 'history');
    } catch (e) { console.error(e); root.appendChild(div('empty', 'خطأ في التخزين: ' + e.message)); }
    markLast(root);
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    function p(n) { return n < 10 ? '0' + n : n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function smallBtn(label, fn, cls) {
    var b = div('btn ghost' + (cls ? ' ' + cls : ''), label);
    b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0');
    onAct(b, safe(fn));
    return b;
  }

  function renderItems(root, store, isHistory) {
    var items = store.list();
    var top = div('card');
    top.appendChild(div('card-title', (isHistory ? 'السجل' : 'المفضلة') + ' · ' + items.length + (isHistory ? ' / ' + settings.maxHistory : '')));
    if (items.length) {
      var row = div('btn-row small');
      row.appendChild(smallBtn(isHistory ? 'مسح السجل' : 'مسح المفضلة', function () {
        return confirmBox('مسح الكل؟', 'سيتم حذف كل العناصر من ' + (isHistory ? 'السجل' : 'المفضلة') + '.', 'مسح').then(function (ok) {
          if (ok) { store.clear(); renderLibrary(); toast('تم المسح'); }
        });
      }, 'danger'));
      top.appendChild(row);
    }
    root.appendChild(top);
    if (!items.length) {
      root.appendChild(div('empty', isHistory ? 'لا توجد بروميتات بعد. البروميتات المولدة تظهر هنا تلقائياً (من الإعدادات).' : 'لا توجد مفضلات بعد. استخدم "★ أضف للمفضلة" أسفل البروميت المولد.'));
      return;
    }
    items.forEach(function (it) {
      var card = div('item');
      card.appendChild(div('item-meta', fmtDate(it.date) + (it.state && it.state.mode === 'Editing' ? ' · Editing' : ' · Generation')));
      var prev = div('item-preview', it.prompt.length > 220 ? it.prompt.slice(0, 220) + '…' : it.prompt);
      prev.setAttribute('dir', 'auto');
      card.appendChild(prev);
      var row = div('btn-row small');
      row.appendChild(smallBtn('فتح', function () {
        if (it.state) applyPresetState(it.state);
        $('output').value = it.prompt; lastGenerated = it.prompt;
        showWarnings([]); updateCount(); persistWorking();
        closeLibrary();
        showTab('result');
        toast('تم فتح البروميت');
      }));
      row.appendChild(smallBtn('نسخ', function () {
        return PS.Storage.copyText(it.prompt).then(function () { toast('تم نسخ البروميت', 'success'); });
      }));
      if (isHistory) {
        row.appendChild(smallBtn('★', function () {
          if (PS.Favorites.contains(it.prompt)) { toast('موجود في المفضلة بالفعل'); return; }
          PS.Favorites.add(it.prompt, it.state, 500); toast('تمت الإضافة للمفضلة ★', 'success');
        }));
      }
      row.appendChild(smallBtn('حذف', function () { store.remove(it.id); renderLibrary(); toast('تم الحذف'); }, 'danger'));
      card.appendChild(row);
      root.appendChild(card);
    });
  }

  function settingSelect(root, label, key, options, tip) {
    var f = div('field');
    var l = div('field-label', label); f.appendChild(l);
    var s = document.createElement('select');
    options.forEach(function (o) { addOption(s, o[0] === '' ? '__none' : o[0], o[1]); });
    setSelect(s, settings[key] ? settings[key] : '__none');
    s.addEventListener('change', function () { var val = readSelect(s); settings[key] = val === '__none' ? '' : val; });
    f.appendChild(s);
    if (tip) f.appendChild(div('tip-text', tip));
    root.appendChild(f);
  }

  function renderSettings(root) {
    var card = div('card');
    card.appendChild(div('card-title', 'الإعدادات'));
    settingSelect(card, 'مستوى حفظ الهوية الافتراضي', 'defaultIdentity', [['Off', 'مغلق'], ['Normal', 'عادية'], ['Strict', 'قوية'], ['Very Strict', 'قصوى']]);
    settingSelect(card, 'نمط البشرة الافتراضي', 'defaultSkin', [['', '— بدون —'], ['Natural', 'طبيعي'], ['Detailed', 'مفصّل'], ['Highly Detailed', 'مفصّل جدًا'], ['Raw', 'خام'], ['Clean but Natural', 'نظيف لكن طبيعي']]);
    settingSelect(card, 'جودة الافتراضية', 'defaultQuality', Object.keys(PS.Schema.qualityProfiles).map(function (k) { return [k, k + (PS.Schema.qualityProfiles[k].length ? ' (' + PS.Schema.qualityProfiles[k].join(', ') + ')' : '')]; }));
    settingSelect(card, 'لغة البروميت الافتراضية', 'promptLanguage', [['English', 'الإنجليزية (العربي بين علامات اقتباس + ملاحظة تفسير)'], ['Original', 'الإنجليزية + النص الأصلي كما كُتب (بدون ملاحظة)']],
      'البروميت يُكتب دائماً بالإنجليزية. التعليمات العربية أو المختلطة تُنقل كما هي حرفياً حتى لا يضيع معناها (بدون استخدام أي واجهة ترجمة خارجية).');
    settingSelect(card, 'تنسيق الإخراج', 'outputFormat', [['Paragraphs', 'فقرات'], ['Single Paragraph', 'فقرة واحدة']]);

    var f1 = div('field');
    var lab = document.createElement('label'); lab.className = 'toggle-row';
    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!settings.autoSaveHistory;
    cb.addEventListener('change', function () { settings.autoSaveHistory = !!cb.checked; });
    lab.appendChild(cb); lab.appendChild(document.createTextNode('حفظ تلقائي في السجل عند التوليد'));
    f1.appendChild(lab); card.appendChild(f1);

    var f2 = div('field');
    f2.appendChild(div('field-label', 'أقصى عدد عناصر السجل (5–200)'));
    var num = document.createElement('input'); num.type = 'number'; num.min = 5; num.max = 200; num.value = settings.maxHistory;
    num.addEventListener('input', function () { settings.maxHistory = num.value; });
    f2.appendChild(num); card.appendChild(f2);

    var f3 = div('field');
    f3.appendChild(div('field-label', 'قالب البروميت (متقدم)'));
    var ta = document.createElement('textarea'); ta.className = 'ta-9'; ta.value = settings.template;
    ta.addEventListener('input', function () { settings.template = ta.value; });
    f3.appendChild(ta);
    f3.appendChild(div('tip-text', 'الرموز: [TASK] [IDENTITY] [SUBJECT] [APPEARANCE] [POSE] [CLOTHING] [ENVIRONMENT] [LIGHTING] [CAMERA] [DOF] [STYLE] [SKIN] [COLOR] [QUALITY] [PRESERVE] [CUSTOM] [NEGATIVE]. الرموز في نفس السطر تشكّل فقرة واحدة.'));
    card.appendChild(f3);

    var row = div('btn-row');
    row.appendChild(smallBtn('إعادة ضبط القالب', function () { settings.template = PS.Schema.DEFAULT_TEMPLATE; ta.value = settings.template; toast('تمت إعادة ضبط القالب (اضغط حفظ الإعدادات)'); }));
    var saveBtn = div('btn primary', 'حفظ الإعدادات');
    saveBtn.setAttribute('role', 'button'); saveBtn.setAttribute('tabindex', '0');
    onAct(saveBtn, safe(saveSettings));
    row.appendChild(saveBtn);
    card.appendChild(row);
    root.appendChild(card);
  }

  function saveSettings() {
    var max = parseInt(settings.maxHistory, 10);
    if (isNaN(max)) max = 50;
    settings.maxHistory = Math.max(5, Math.min(200, max));
    if (!/\[[A-Z]+\]/.test(settings.template || '')) throw new Error('يجب أن يحتوي القالب على رمز واحد على الأقل مثل [TASK].');
    PS.Storage.set(SETTINGS_KEY, settings);
    PS.History.trim(settings.maxHistory);
    renderLibrary();
    refreshUI();
    toast('تم حفظ الإعدادات', 'success');
  }

  /* ====================== wiring ====================== */
  function wire() {
    onAct($('modeGeneration'), function () { setMode('Generation'); });
    onAct($('modeEditing'), function () { setMode('Editing'); });
    onAct($('btnSettings'), function () { openLibrary('settings'); });

    onAct($('btnGenerate'), safe(doGenerate));
    onAct($('btnCopy'), safe(doCopy));
    onAct($('btnRandom'), safe(doRandomize));
    onAct($('btnClear'), safe(doClear));

    onAct($('btnHistory'), function () { openLibrary('history'); });
    onAct($('btnFavorites'), function () { openLibrary('favorites'); });

    onAct($('btnSmart'), safe(doSmartLogic));
    onAct($('btnSmartToFields'), safe(doSmartExtract));

    var is = $('imageStory');
    if (is) {
      is.value = state.imageStory || '';
      is.addEventListener('input', function () { state.imageStory = is.value; persistWorking(); refreshComposePreview(); });
    }

    var mi = $('mainIdea');
    if (mi) {
      mi.value = state.mainIdea || '';
      mi.addEventListener('input', function () { state.mainIdea = mi.value; persistWorking(); refreshComposePreview(); });
    }

    /* ضوابط المعاينة: منفصلة تماماً عن اختيارات البرومبت */
    syncPreviewUI();
    var pvT = $('pvToggle');
    if (pvT) onAct(pvT, function () {
      previewPrefs.visible = !previewPrefs.visible;
      savePreviewPrefs(); syncPreviewUI(); refreshComposePreview();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-pvmode]'), function (b) {
      onAct(b, function () {
        previewPrefs.mode = b.getAttribute('data-pvmode');
        savePreviewPrefs(); syncPreviewUI(); refreshComposePreview();
      });
    });
    var pvS = $('pvStrength');
    if (pvS) pvS.addEventListener('input', function () {
      previewPrefs.strength = Number(pvS.value) / 100;
      savePreviewPrefs(); refreshComposePreview();
    });
    var pvG = $('pvGuides');
    if (pvG) pvG.addEventListener('change', function () {
      previewPrefs.guides = !!pvG.checked;
      savePreviewPrefs(); refreshComposePreview();
    });
    var pvR = $('pvReset');
    if (pvR) onAct(pvR, function () {
      previewPrefs = clone(DEFAULT_PREVIEW);
      if (PS.Scene3D && PS.Scene3D.resetView) PS.Scene3D.resetView();
      savePreviewPrefs(); syncPreviewUI(); refreshComposePreview();
      toast('تمت إعادة ضبط المعاينة (اختيارات البرومبت لم تتغير)', 'success');
    });

    /* موديل الهدف + صيغة النسخ */
    var tm = $('targetModel');
    if (tm) {
      tm.value = state.targetModel || 'Universal';
      tm.addEventListener('change', function () { state.targetModel = tm.value; persistWorking(); });
    }
    var cf = $('copyFormat');
    if (cf) {
      cf.value = state.copyFormat || 'prompt';
      cf.addEventListener('change', function () { state.copyFormat = cf.value; persistWorking(); });
    }

    /* التبويبات (الفكرة / التفاصيل / الأسلوب / النتيجة) وأزرار «التالي» */
    Array.prototype.forEach.call(document.querySelectorAll('[data-tab],[data-go]'), function (el) {
      var target = el.getAttribute('data-tab') || el.getAttribute('data-go');
      var go = function () { showTab(target); };
      el.addEventListener('click', go);
      el._act = go;
    });
    showTab('idea');

    /* الكروت القابلة للطي/الإظهار */
    Array.prototype.forEach.call(document.querySelectorAll('.card-head[data-toggle]'), function (hd) {
      var tog = function () {
        var card = document.getElementById(hd.getAttribute('data-toggle'));
        if (card) card.classList.toggle('collapsed');
      };
      hd.addEventListener('click', tog);
      hd._act = tog;
    });

    onAct($('btnPresetLoad'), safe(presetLoad));
    onAct($('btnPresetSave'), safe(presetSave));
    onAct($('btnPresetRename'), safe(presetRename));
    onAct($('btnPresetDelete'), safe(presetDelete));
    onAct($('btnPresetExport'), safe(presetExport));
    onAct($('btnPresetImport'), safe(presetImport));

    onAct($('btnOutCopy'), safe(doCopy));
    onAct($('btnOutEdit'), safe(doEdit));
    onAct($('btnOutRegen'), safe(doRegenerate));
    onAct($('btnOutFav'), safe(doFavorite));
    onAct($('btnOutHistory'), safe(doSaveHistory));

    onAct($('btnBack'), closeLibrary);
    onAct($('tabHistory'), function () { libTab = 'history'; renderLibrary(); });
    onAct($('tabFavorites'), function () { libTab = 'favorites'; renderLibrary(); });
    onAct($('tabSettings'), function () { libTab = 'settings'; renderLibrary(); });

    onAct($('modalOk'), function () { if (modalResolve) modalResolve(true); });
    onAct($('modalCancel'), function () { if (modalResolve) modalResolve(false); });

    $('output').addEventListener('input', function () { updateCount(); persistWorking(); });

    document.addEventListener('keydown', function (e) {
      var tgt = e.target;
      if (modalResolve) {
        if (e.key === 'Escape') { e.preventDefault(); modalResolve(false); return; }
        if (e.key === 'Enter' && tgt && tgt.id === 'modalInput') { e.preventDefault(); modalResolve(true); return; }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); safe(doGenerate)(); return; }
      if (e.key === 'Escape' && !$('libraryView').classList.contains('hidden')) { closeLibrary(); return; }
      if ((e.key === 'Enter' || e.key === ' ') && tgt && tgt.getAttribute && tgt.getAttribute('role') === 'button' && tgt._act) {
        e.preventDefault();
        tgt._act(e);
      }
    });
  }

  /* ====================== معاينة التكوين النهائي ====================== */
  function syncPreviewUI() {
    var body = $('pvBody'), t = $('pvToggle');
    if (body) show(body, previewPrefs.visible);
    if (t) t.textContent = previewPrefs.visible ? 'إخفاء المعاينة' : 'إظهار المعاينة';
    Array.prototype.forEach.call(document.querySelectorAll('[data-pvmode]'), function (b) {
      if (b.getAttribute('data-pvmode') === previewPrefs.mode) b.classList.add('active');
      else b.classList.remove('active');
    });
    var s = $('pvStrength'); if (s) s.value = String(Math.round(previewPrefs.strength * 100));
    var g = $('pvGuides'); if (g) g.checked = !!previewPrefs.guides;
  }
  function refreshComposePreview() {
    var box = $('composePreview');
    if (!box || !PS.CompositionPreview) return;
    /* إذا كانت المعاينة مخفية نتوقف عن الرسم تماماً (توفير أداء) */
    if (!previewPrefs.visible) { box.innerHTML = ''; return; }
    var html = PS.CompositionPreview.render(state, previewPrefs);
    var clashes = PS.CompositionPreview.conflicts(state);
    var warn = clashes.length
      ? '<div class="cp-clash">⛔ تعارض في الاختيارات — لن يُولَّد البروميت حتى تعدّله:<br>• ' + clashes.join('<br>• ') + '</div>'
      : '';
    box.innerHTML = html + warn;
    /* تشغيل المشهد ثلاثي الأبعاد داخل الحاوية الجديدة */
    try { PS.CompositionPreview.mount(box, state, previewPrefs); }
    catch (e) { console.error("[Preview]", e); }
  }

  /* ====================== تبديل التبويبات ====================== */
  var TABS = ['idea', 'details', 'style', 'result'];
  function showTab(id) {
    if (TABS.indexOf(id) === -1) return;
    if (id === 'result') refreshComposePreview();
    TABS.forEach(function (t) {
      show($('pane-' + t), t === id);
      var b = $('tab-' + t);
      if (b) { if (t === id) b.classList.add('active'); else b.classList.remove('active'); }
    });
    try { $('mainScroll').scrollTop = 0; } catch (e) { /* noop */ }
  }

  /* ====================== init ====================== */
  function init() {
    loadSettings();
    state = PS.Schema.defaultState(settings);
    var working = null;
    try { working = PS.Storage.get(WORKING_KEY, null); } catch (e) { toast(e.message, 'error'); }
    if (working && working.state) mergeState(state, working.state);
    buildSections();
    wire();
    loadPreviewPrefs();
    syncPreviewUI();
    var dsHost = $('designStudio');
    if (PS.DesignLibrary) {
      try {
        PS.DesignLibrary.init({
          getState: function () { return state; },
          mutate: function (fn) { fn(state); renderValues(); persistWorking(); },
          toast: toast
        });
      } catch (e) {
        console.warn('[DesignStudio]', e);
        if (dsHost) dsHost.innerHTML = '<div style="color:#ffb09c;font-size:12px;line-height:1.6">تعذّر تحميل الاستوديو: ' + (e && e.message) + '</div>';
      }
      /* لو المحتوى لسه فاضي (مثلاً الملف ناقص) وضّح للمستخدم */
      if (dsHost && !dsHost.children.length) {
        dsHost.innerHTML = '<div style="color:#b09a88;font-size:12px;line-height:1.6">لم يُحمّل محتوى الاستوديو. تأكد من وجود الملف <b>js/designLibrary.js</b> داخل مجلد الإضافة ثم أعد تشغيل فوتوشوب.</div>';
      }
    } else if (dsHost) {
      dsHost.innerHTML = '<div style="color:#ffb09c;font-size:12px;line-height:1.6">الملف <b>js/designLibrary.js</b> غير موجود — انسخه إلى مجلد الإضافة ثم أعد تشغيل فوتوشوب.</div>';
    }
    renderValues();
    populatePresets();
    if (working && working.output) { $('output').value = working.output; lastGenerated = working.last || ''; updateCount(); }
    markLast(document);
    var uxpVer = '';
    try { uxpVer = ' UXP ' + require('uxp').versions.uxp; } catch (e) { /* browser */ }
    console.log('[Prompt Studio] ready' + (PS.Storage.isUXP ? ' (Photoshop' + uxpVer + ')' : (PS.Storage.isCEP ? ' (Photoshop CEP panel)' : ' (browser preview)')) + ' · storage: ' + PS.Storage.backend());
    if (PS.Storage.backend() === 'memory') toast('Persistent storage unavailable — presets/history will last until Photoshop closes.', 'error');
  }

  function fail(e) {
    console.error('[Prompt Studio] init failed', e);
    document.body.innerHTML = '<div style="padding:12px;color:#ff8f88;font-family:sans-serif">Prompt Studio failed to start: ' + (e && e.message) + '<br>Open the UXP Developer Tool → Debug to see details.</div>';
  }

  // Storage must be ready first (Photoshop 2021 may use the data-folder file backend).
  PS.Storage.init().then(function () {
    try { init(); } catch (e) { fail(e); }
  }, fail);
})();
