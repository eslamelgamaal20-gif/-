/* ==========================================================================
   EMG — compositionPreview.js
   واجهة المعاينة داخل لوحة النتيجة (نفس الشكل والاختيارات الموجودة):
     • يرسم حاوية المعاينة ويسلّمها لمحرك WebGL (scene3d.js) ليرسم المشهد الحقيقي
     • يكتب شرح كل اختيار جنب المعاينة (الكاميرا، اللقطة، الإضاءة، العمق...)
     • كاشف التعارضات الذي يمنع التوليد عند اختيارات متضاربة
     • قصة الصورة (تُدمج في البرومبت كسياق، وليست إعداداً للمعاينة)
   ملاحظة: كل ما يخص المعاينة لا يدخل البرومبت، إلا الاختيارات الأصلية للبرومبت.
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});

  function trim(s) { return String(s == null ? '' : s).trim(); }

  /* ---------------- جداول النص العربي ---------------- */
  var RATIO_AR = { '1:1': 'مربع', '4:5': 'إنستجرام', '3:4': 'كلاسيكي', '2:3': 'بوستر', '9:16': 'ستوري', '16:9': 'عريض', '21:9': 'سينمائي' };
  var POS_AR = { 'Left': 'يسار الكادر', 'Right': 'يمين الكادر', 'Center': 'منتصف الكادر', 'Upper Third': 'الثلث العلوي', 'Lower Third': 'الثلث السفلي' };
  var SHOT_AR = { 'Extreme Close-up': 'قريب جداً', 'Close-up': 'قريب', 'Medium Shot': 'متوسط', 'Medium Full Shot': 'متوسط كامل', 'Full Shot': 'كامل', 'Wide Shot': 'واسع' };
  var FRAME_AR = { 'Full Body': 'جسم كامل', '3/4 Body': 'ثلاثة أرباع الجسم', 'Half Body': 'نصف الجسم', 'Waist Up': 'من الخصر لأعلى', 'Portrait': 'بورتريه', 'Close-up': 'وجه قريب', 'Extreme Close-up': 'وجه قريب جداً', 'Wide Shot': 'مشهد واسع' };
  var DIST_AR = { 'Very Close': 'قريبة جداً', 'Close': 'قريبة', 'Medium': 'متوسطة', 'Far': 'بعيدة' };
  var ANGLE_AR = {
    'Eye Level': 'مستوى العين', 'Low Angle': 'زاوية منخفضة', 'High Angle': 'زاوية مرتفعة',
    "Bird's Eye View": 'عين الطائر', "Worm's Eye View": 'عين الدودة', 'POV': 'POV (عين الشخص)',
    'Over-the-Shoulder': 'من فوق الكتف', 'Dutch Angle': 'زاوية مائلة', 'Long Shot': 'لقطة بعيدة',
    'Top Down': 'من الأعلى مباشرة', 'Side Angle': 'جانبية', 'Back Angle': 'من الخلف',
    'Framed Shot': 'لقطة مؤطّرة', 'Orbit': 'مدارية', '3/4 Angle': 'ثلاثة أرباع', 'Front Angle': 'أمامية'
  };
  var PERSP_AR = { 'Natural Perspective': 'طبيعي', 'Wide Perspective': 'واسع', 'Compressed Perspective': 'مضغوط', 'Cinematic Perspective': 'سينمائي' };
  var DOF_AR = { 'Deep Focus': 'حاد كامل', 'Natural Depth': 'عمق طبيعي', 'Moderate Depth': 'عمق متوسط', 'Shallow Depth of Field': 'عمق ضحل', 'Extreme Bokeh': 'بوكيه قوي', 'Cinematic Bokeh': 'بوكيه سينمائي' };
  var BGD_AR = { 'Flat': 'مسطحة', 'Minimal Depth': 'طبقتان', 'Natural Depth': 'ثلاث طبقات', 'Deep Environment': 'بيئة عميقة', 'Cinematic Depth': 'عمق سينمائي' };
  var DIR_AR = { 'Front': 'من الأمام', 'Left': 'من اليسار', 'Right': 'من اليمين', 'Top': 'من الأعلى', 'Back': 'من الخلف', 'Top Left': 'من أعلى اليسار', 'Top Right': 'من أعلى اليمين', 'Side': 'جانبي' };
  var KIND_AR = {
    flat: 'بلا ظلال تقريباً', loop: 'ظل أنف صغير مائل على الخد', rembrandt: 'مثلث ضوء على الخد المظلل',
    split: 'نصف الوجه في الظل', rim: 'حافة مضيئة حول الجسم', silhouette: 'الجسم داكن أمام الضوء',
    butterfly: 'ظل فراشة تحت الأنف', side: 'ظل واضح على جانب واحد', hard: 'ظلال حادة واضحة',
    front: 'إضاءة أمامية متساوية', top: 'ظل تحت الحاجبين والأنف', soft: 'ظلال ناعمة متدرجة'
  };
  var LIGHT_KIND = {
    'Flat Light': 'flat', 'Loop Light': 'loop', 'Rembrandt Light': 'rembrandt', 'Split Light': 'split',
    'Rim Light': 'rim', 'Silhouette Lighting': 'silhouette', 'Butterfly Light': 'butterfly',
    'Soft Light': 'soft', 'Hard Light': 'hard', 'Strong Directional Light': 'side', 'Dramatic Light': 'side',
    'Cinematic Light': 'side', 'Backlight': 'rim', 'Side Light': 'side', 'Front Light': 'front', 'Top Light': 'top',
    'Golden Hour': 'soft', 'Neon Light': 'soft', 'Studio Light': 'soft', 'Natural Daylight': 'soft'
  };
  var KIND_DIR = { rembrandt: 'Top Left', split: 'Left', loop: 'Top Left', side: 'Left', hard: 'Left', butterfly: 'Front', front: 'Front', flat: 'Front', top: 'Top', rim: 'Back', silhouette: 'Back', soft: 'Top Left' };
  var COLOR_T = { 'Warm': '#ffb36b', 'Neutral': '#fff3e0', 'Cool': '#a8d4ff', 'Mixed': '#ffd9a8' };
  var COLOR_NAME = { '#ffb36b': 'دافئ', '#fff3e0': 'محايد', '#a8d4ff': 'بارد', '#ffd9a8': 'مختلط', '#ff6fd8': 'نيون', '#fff6d6': 'خلفي مضيء' };
  var LIGHT_TINT_AR = { 'Red': 'أحمر', 'Blue': 'أزرق', 'Green': 'أخضر', 'Pink': 'وردي', 'Yellow': 'أصفر', 'Warm': 'دافئ', 'Cool': 'بارد' };
  var SHADOW_AR = { 'Soft': 'ناعم', 'Medium': 'متوسط', 'Strong': 'قوي', 'Dramatic': 'درامي' };
  var POWER_AR = { 'Soft': 'خافتة', 'Medium': 'متوسطة', 'Strong': 'قوية', 'Very Strong': 'قوية جداً' };
  var SHADOW_LEN_AR = {
    'Golden Hour': 'طويل جداً', 'Rim Light': 'متوسط', 'Backlight': 'طويل', 'Silhouette Lighting': 'طويل',
    'Top Light': 'قصير', 'Flat Light': 'قصير جداً', 'Front Light': 'قصير', 'Natural Daylight': 'متوسط',
    'Studio Light': 'قصير', 'Soft Light': 'متوسط', 'Rembrandt Light': 'متوسط', 'Split Light': 'طويل',
    'Side Light': 'طويل', 'Hard Light': 'متوسط', 'Strong Directional Light': 'متوسط', 'Dramatic Light': 'طويل',
    'Cinematic Light': 'متوسط', 'Loop Light': 'متوسط', 'Butterfly Light': 'قصير', 'Neon Light': 'طويل'
  };
  var SEC_AR = { 'Rim Light': 'إطار', 'Backlight': 'خلفية', 'Fill Light': 'تعبئة', 'Hair Light': 'شعر', 'Practical Lights': 'مصادر المشهد' };
  var CAM_DESC = {
    'Eye Level': 'مستوى عين الشخص، شكل طبيعي متوازن بلا تشويه',
    'Low Angle': 'الكاميرا أسفل الشخص فيبان أطول وأقوى، والجسم يبان من تحت',
    'High Angle': 'الكاميرا فوق الشخص فيبان أصغر، والرأس يميل للأسفل',
    "Bird's Eye View": 'من فوق بزاوية كبيرة، تظهر الرأس والكتفين وما حولهم',
    "Worm's Eye View": 'من الأرض للأعلى، الشخص ضخم ومهيب والسقف يبان',
    'POV': 'ترى من عين الشخص، واليدان ظاهرتان في المقدمة',
    'Over-the-Shoulder': 'كتف المصور في المقدمة والشخص مائل ثلاثة أرباع للكاميرا',
    'Dutch Angle': 'الأفق مائل فيعطي توتراً وحركة',
    'Long Shot': 'الشخص صغير داخل المشهد الكامل',
    'Top Down': 'من الأعلى مباشرة، الشخص يبان مسطحاً بلا وجه',
    'Side Angle': 'بروفايل جانبي، الجسم أنحف والوجه جانبي',
    'Back Angle': 'ظهر الشخص، الشعر يغطي الرأس بلا وجه',
    'Framed Shot': 'الشخص داخل إطار طبيعي مثل باب أو نافذة',
    'Orbit': 'الكاميرا تدور حول الشخص، حركة سينمائية',
    '3/4 Angle': 'ثلاثة أرباع، أفضل زاوية لإبراز الوجه والجسم معاً',
    'Front Angle': 'واجهة مباشرة، الشخص يواجه الكاميرا تماماً'
  };
  var LENS_DESC = {
    '14mm': 'فائقة الاتساع، تكبّر ما قرب وتشوّه الأطراف (الرأس يبان أكبر من الجسم)',
    '24mm': 'واسعة، تُظهر المحيط وتكبّر الأطراف قليلاً',
    '35mm': 'قريبة من رؤية العين مع بيئة واضحة',
    '50mm': 'طبيعية، بلا تشويه ملحوظ',
    '85mm': 'بورتريه: ضغط الخلفية وملامح متناسقة',
    '105mm': 'تقريب مع ضغط الخلفية',
    '135mm': 'تقريب قوي وخلفية مضغوطة وناعمة',
    '200mm': 'تقريب شديد، الجسم يبان مسطحاً ويقل التشويه',
    'Macro': 'تفاصيل دقيقة جداً وعمق ميدان ضيق جداً'
  };
  var APER_DESC = {
    'Deep Focus': 'فتحة ضيقة (f/11 فأكثر): كل شيء حاد من الأمام للخلف',
    'Natural Depth': 'فتحة متوسطة (f/5.6): خلفية خفيفة الضبابية',
    'Moderate Depth': 'فتحة (f/4): الشخص حاد والخلفية ناعمة قليلاً',
    'Shallow Depth of Field': 'فتحة واسعة (f/2): الشخص حاد والخلفية ضبابية',
    'Extreme Bokeh': 'فتحة واسعة جداً (f/1.4): ضبابية قوية ودوائر ضوء',
    'Cinematic Bokeh': 'فتحة واسعة (f/1.8): بوكيه سينمائي ناعم'
  };
  var ACT_AR = { 'Watching': 'مشاهدة', 'Using': 'استخدام', 'Looking At': 'نظر', 'Talking To': 'حديث', 'Holding': 'إمساك', 'Reaching': 'مد اليد' };
  var GAZE_AR = { 'At Camera': 'نحو الكاميرا', 'Away': 'بعيداً عن الكاميرا', 'Right': 'لليمين', 'Left': 'لليسار', 'Up': 'للأعلى', 'Down': 'للأسفل', 'Over Shoulder': 'فوق الكتف' };
  var OBJ_AR = { 'Television': 'تلفزيون', 'Monitor': 'شاشة كمبيوتر', 'Laptop': 'لابتوب', 'Product': 'منتج', 'Another Person': 'شخص آخر', 'Phone': 'موبايل', 'Window': 'نافذة', 'Custom': 'عنصر مخصص' };
  var PLACE_DEG = { 'Front': 0, 'Front Left': -40, 'Front Right': 40, 'Left': -90, 'Right': 90, 'Behind': 180, 'Above': 0, 'Below': 0 };
  var DEF_PLACE = { 'Television': 'Front', 'Monitor': 'Front', 'Laptop': 'Front', 'Product': 'Front', 'Another Person': 'Front Right', 'Phone': 'Front', 'Window': 'Front', 'Custom': 'Front' };
  var OBJ_TYPE = { 'Television': 'tv', 'Monitor': 'screen', 'Laptop': 'laptop', 'Product': 'product', 'Another Person': 'person', 'Phone': 'phone', 'Window': 'window', 'Custom': 'custom' };

  /* ---------------- تصنيفات الاختيارات ---------------- */
  function subjectMode(st) {
    var t = trim(st.subjectType);
    if (t === 'Person + Product') return 'both';
    if (t === 'Product' || t === 'Object') return 'product';
    return 'person';
  }
  function personCount(st) {
    var t = trim(st.subjectType);
    if (t === 'Two People') return 2;
    if (t === 'Group') return 3;
    if (t === 'Person' && Number(st.peopleCount) > 1) return Math.min(3, Number(st.peopleCount));
    return 1;
  }
  var AGE_AR = { 'Child': 'طفل', 'Teen': 'مراهق', 'Young Adult': 'شاب', 'Adult': 'بالغ', 'Middle-aged': 'منتصف العمر', 'Elderly': 'كبير السن' };
  function personKind(st) {
    var age = trim(st.age) || 'Adult';
    if (age === 'Custom') age = 'Adult';
    var g = st.gender === 'Woman' ? 'woman' : (st.gender === 'Man' ? 'man' : 'neutral');
    var child = age === 'Child', teen = age === 'Teen', elderly = age === 'Elderly';
    var label;
    if (child) label = g === 'woman' ? 'بنت' : (g === 'man' ? 'ولد' : 'طفل');
    else if (teen) label = g === 'woman' ? 'مراهقة' : 'مراهق';
    else if (g === 'woman') label = 'سيدة';
    else if (g === 'man') label = 'رجل';
    else label = 'شخص';
    return { age: age, g: g, child: child, teen: teen, elderly: elderly, label: label, ageAr: AGE_AR[age] || '' };
  }
  function productKind(st) {
    var shape = PS.Models ? PS.Models.productShape(st) : 'box';
    return { shape: shape, placement: trim(st.productPlacement) };
  }

  /* ---------------- حالة الإضاءة (تُستخدم في الشرح) ---------------- */
  function lightInfo(st) {
    var type = trim(st.lightingType);
    var kind = LIGHT_KIND[type] || '';
    var dir = trim(st.lightDirection) || KIND_DIR[kind] || 'Front';
    if (!kind) kind = dir === 'Back' ? 'rim' : (dir === 'Top' ? 'top' : (dir === 'Front' ? 'front' : 'side'));
    var color = COLOR_T[st.colorTemp] || '#fff3e0';
    if (type === 'Golden Hour') color = '#ffb36b';
    if (type === 'Neon Light') color = '#ff6fd8';
    if (kind === 'rim' || kind === 'silhouette') color = '#fff6d6';
    var tint = LIGHT_TINT_AR[st.lightColor] ? st.lightColor : '';
    return {
      type: type, kind: kind, dir: dir,
      tintName: tint ? LIGHT_TINT_AR[tint] : '',
      colorName: COLOR_NAME[color] || 'محايد',
      power: POWER_AR[st.lightIntensity] || 'متوسطة',
      shadowName: SHADOW_AR[st.shadowStrength] || 'متوسط',
      shadowLen: SHADOW_LEN_AR[type] || 'متوسط'
    };
  }

  /* ---------------- الشرح المكتوب جنب المعاينة ---------------- */
  function resolveObject(st, sp) {
    var key = (st.spatialObject && st.spatialObject !== 'Auto') ? st.spatialObject : '';
    if (!key) {
      try {
        var det = PS.Spatial && PS.Spatial.detect ? PS.Spatial.detect(trim(st.mainIdea) + ' ' + trim(st.subjectDetails)) : null;
        if (det && det.object) key = det.object;
      } catch (e) { key = ''; }
    }
    if (!key && sp && sp.action) {
      key = sp.action === 'Talking To' ? 'Another Person' : (sp.action === 'Using' ? 'Laptop' : (sp.action === 'Watching' ? 'Television' : 'Product'));
    }
    if (!key) return null;
    var placeKey = (st.spatialPlacement && st.spatialPlacement !== 'Auto') ? st.spatialPlacement : (DEF_PLACE[key] || 'Front');
    var P = PLACE_DEG[placeKey] != null ? PLACE_DEG[placeKey] : 0;
    return { key: key, type: OBJ_TYPE[key] || 'custom', P: P, placeKey: placeKey, behind: Math.abs(P) >= 135, name: OBJ_AR[key] || '' };
  }
  function spatialInfo(st) {
    var out = { action: '', gazeOwned: false, behind: false };
    try {
      var r = PS.Spatial && PS.Spatial.buildSpatialCompositionPrompt ? PS.Spatial.buildSpatialCompositionPrompt(st, {}) : null;
      if (r && r.active) { out.action = r.action || ''; out.gazeOwned = !!r.gazeOwned; out.behind = !!r.behind; }
    } catch (e) { /* noop */ }
    return out;
  }

  function describe(st, cam, L, O, sp, mode, pk, k) {
    var ratio = st.aspectRatio || '3:4';
    var fr = FRAME_AR[st.bodyFraming] || SHOT_AR[st.shotType] || 'غير محدد';
    var lines = [];
    if (mode === 'product') {
      lines.push('<b>الموضوع:</b> منتج · ' + (pk.shape === 'bottle' ? 'زجاجة' : (pk.shape === 'cup' ? 'كوب' : (pk.shape === 'phone' ? 'موبايل' : 'علبة'))) + ' · ' + (pk.placement || 'وسط الكادر'));
    } else if (mode === 'both') {
      lines.push('<b>الموضوع:</b> ' + k.label + ' + منتج' + (k.ageAr ? ' · ' + k.ageAr : ''));
    } else {
      lines.push('<b>الموضوع:</b> ' + k.label + (k.ageAr ? ' · ' + k.ageAr : '') + (personCount(st) > 1 ? ' · ' + personCount(st) + ' أشخاص' : ''));
    }
    lines.push('<b>الكادر:</b> ' + ratio + ' (' + (RATIO_AR[ratio] || '') + ') · ' + (POS_AR[st.subjectPosition] || 'منتصف الكادر') + ' · اللقطة: ' + fr);
    lines.push('<b>الكاميرا:</b> ' + cam.label +
      (st.cameraDistance ? ' · ' + (DIST_AR[st.cameraDistance] || '') : '') +
      (st.cameraPerspective ? ' · ' + (PERSP_AR[st.cameraPerspective] || '') : '') +
      (st.lens ? ' · ' + st.lens : ''));
    if (O && mode !== 'product') {
      var pos = O.behind ? 'خلف الشخص' : (O.P === 0 ? 'أمامه' : (O.P > 0 ? 'على يمينه' : 'على يساره'));
      lines.push('<b>العنصر:</b> ' + (OBJ_AR[O.key] || '') + ' · ' + pos + (sp.action ? ' · الفعل: ' + (ACT_AR[sp.action] || '') : ''));
    }
    if (mode !== 'product' && st.gazeDirection && st.gazeDirection !== 'Off') {
      lines.push('<b>النظر:</b> ' + (GAZE_AR[st.gazeDirection] || st.gazeDirection));
    }
    return lines;
  }
  function effectLines(st, cam, L, D) {
    var out = [];
    out.push('<b>الضوء:</b> ' + (DIR_AR[L.dir] || '') + ' · شدته ' + L.power + ' · ' + (L.tintName ? 'لون ' + L.tintName : 'لون ' + L.colorName));
    out.push('<b>الظل على الجسم:</b> ' + (KIND_AR[L.kind] || '') + ' · درجته ' + L.shadowName);
    out.push('<b>الظل على الأرض:</b> طوله ' + L.shadowLen + ' ويتجه عكس مصدر الضوء');
    var SEC = trim(st.secondaryLight);
    if (SEC) out.push('<b>الإضاءة الثانوية:</b> ' + (SEC_AR[SEC] || SEC) + ' · مصدر مستقل يضيء الحواف والتعبئة');
    out.push('<b>شكل الكاميرا:</b> ' + (CAM_DESC[cam.key] || ''));
    out.push('<b>العدسة:</b> ' + (LENS_DESC[trim(st.lens)] || 'غير محددة'));
    out.push('<b>الفتحة والعمق:</b> ' + (APER_DESC[D.dof] || 'غير محددة'));
    return out;
  }

  /* ---------------- البطاقة: حاوية المحرك + الشرح ---------------- */
  function render(st, prefs) {
    prefs = prefs || {};
    var mode = subjectMode(st);
    var sp = spatialInfo(st);
    var O = resolveObject(st, sp);
    var pk = productKind(st), k = personKind(st);
    var L = lightInfo(st);
    var cam = { key: st.cameraAngle || 'Eye Level', label: ANGLE_AR[st.cameraAngle || 'Eye Level'] || '' };
    var D = { dof: trim(st.dof) };
    var lines = describe(st, cam, L, O, sp, mode, pk, k).concat(effectLines(st, cam, L, D));
    var legend = prefs.mode === 'diag'
      ? '<div class="pv-legend"><span class="pv-sw pv-red"></span>مناطق مضاءة <span class="pv-sw pv-green"></span>مناطق ظل</div>'
      : '';
    return '<div class="cp-wrap">' +
      '<div class="pv3d-wrap">' +
      '<div class="pv3d" data-pv3d title="اسحب لتدوير الكاميرا حول الشخص · دبل كليك لإعادة الضبط"></div>' +
      '<div class="pv3d-guides' + (prefs.guides ? '' : ' hidden') + '"></div>' +
      '</div>' +
      '<div class="pv3d-hint">اسحب لتدوير الكاميرا · دبل كليك لإعادة الضبط</div>' +
      legend +
      '<div class="cp-lines">' + lines.map(function (l) { return '<div>' + l + '</div>'; }).join('') + '</div>' +
      '<div class="cp-note">مشهد ثلاثي الأبعاد حقيقي: الكاميرا والعدسة والإضاءة والظلال تُحسب فعلياً. هذه معاينة توضيحية وليست الصورة النهائية.</div>' +
      '</div>';
  }

  /* يشغّل المحرك داخل الحاوية بعد وضع الـHTML في اللوحة */
  function mount(box, st, prefs) {
    if (!box || !PS.Scene3D) return;
    var el = box.querySelector('[data-pv3d]');
    if (!el) return;
    var sp = spatialInfo(st);
    PS.Scene3D.mount(el, {
      st: st, prefs: prefs || {}, O: resolveObject(st, sp), sp: sp, mode: subjectMode(st)
    });
  }

  /* ---------------- كاشف التعارضات (يمنع التوليد عند تضارب الاختيارات) ---------------- */
  function conflicts(st) {
    var out = [];
    var fr = st.bodyFraming, sh = st.shotType, dist = st.cameraDistance, ang = st.cameraAngle;
    var lens = st.lens, persp = st.cameraPerspective, dof = st.dof, pos = st.subjectPosition;
    var comp = st.composition, ltype = st.lightingType, ldir = st.lightDirection;
    var ident = st.identity && st.identity !== 'Off';
    var wideFr = ['Full Body', 'Wide Shot'].indexOf(fr) !== -1;
    var closeFr = ['Portrait', 'Close-up', 'Extreme Close-up'].indexOf(fr) !== -1;
    var closeSh = ['Extreme Close-up', 'Close-up'].indexOf(sh) !== -1;
    var wideSh = ['Wide Shot', 'Full Shot'].indexOf(sh) !== -1;
    var kind = LIGHT_KIND[ltype] || '';
    var mode = subjectMode(st);

    if (fr && sh && ((wideFr && closeSh) || (closeFr && wideSh))) {
      out.push('إطار الجسد «' + fr + '» يتعارض مع نوع اللقطة «' + sh + '». اختر واحداً منهما.');
    }
    if (dist === 'Far' && closeFr) out.push('مسافة «بعيدة» لا تنتج وجهاً قريباً. غيّر المسافة أو إطار الجسد.');
    if (dist === 'Very Close' && wideFr) out.push('مسافة «قريبة جداً» لا تسمح بجسم كامل في الكادر.');
    if (['14mm', '24mm'].indexOf(lens) !== -1 && closeSh) out.push('عدسة ' + lens + ' واسعة جداً مع لقطة قريبة تشوّه الوجه. استخدم 50mm أو 85mm.');
    if (['135mm', '200mm'].indexOf(lens) !== -1 && wideSh) out.push('عدسة ' + lens + ' طويلة جداً مع لقطة واسعة لا تعمل عملياً.');
    if (lens === 'Macro' && (fr === 'Full Body' || sh === 'Wide Shot')) out.push('عدسة ماكرو لا تناسب اللقطة الواسعة أو الجسم الكامل.');
    if (persp === 'Wide Perspective' && ['85mm', '105mm', '135mm', '200mm'].indexOf(lens) !== -1) out.push('منظور «واسع» يتعارض مع عدسة طويلة ' + lens + '.');
    if (persp === 'Compressed Perspective' && ['14mm', '24mm'].indexOf(lens) !== -1) out.push('منظور «مضغوط» لا يتحقق مع عدسة واسعة ' + lens + '.');
    if (ang === "Worm's Eye View" && (fr === 'Portrait' || sh === 'Close-up')) out.push('زاوية «عين الدودة» مع بورتريه قريب تشوّه الوجه.');
    if (ang === 'Top Down' && (fr === 'Portrait' || sh === 'Close-up')) out.push('لقطة «من فوق» لا تُظهر الوجه في البورتريه.');
    if (ang === 'Back Angle' && ident) out.push('زاوية خلفية تخفي الوجه ويتعارض مع حفظ الهوية.');
    if (ang === 'POV' && ['Full Body', '3/4 Body', 'Wide Shot'].indexOf(fr) !== -1) out.push('وضع POV يُظهر عين الشخص واليدين فقط، ولا يتسع لجسم كامل.');
    if (['Extreme Bokeh', 'Cinematic Bokeh'].indexOf(dof) !== -1 && st.bgDepth === 'Flat') out.push('بوكيه قوي على خلفية مسطحة لن يظهر أثره.');
    if (dof === 'Deep Focus' && lens === 'Macro') out.push('عمق ميدان حاد مع عدسة ماكرو غير ممكن عملياً.');
    if (comp === 'Centered Composition' && pos && pos !== 'Center') out.push('تكوين «متمركز» يتعارض مع وضع الموضوع «' + (POS_AR[pos] || pos) + '».');
    if (st.aspectRatio === '9:16' && fr === 'Full Body' && sh === 'Extreme Close-up') out.push('ستوري عمودي مع لقطة قريبة جداً وجسم كامل — الإطار لا يتسع.');
    if (kind === 'silhouette' && ident) out.push('إضاءة الظل (Silhouette) تُخفي ملامح الوجه، ويتعارض مع حفظ الهوية.');
    if (ltype === 'Flat Light' && st.shadowStrength === 'Dramatic') out.push('إضاءة مسطحة بلا ظلال تتعارض مع ظل «درامي».');
    if (['Rembrandt Light', 'Butterfly Light', 'Loop Light', 'Split Light'].indexOf(ltype) !== -1 && ldir === 'Back') {
      out.push('إضاءة «' + ltype + '» تحتاج ضوءاً أمامياً جزئياً، ولا تتوافق مع اتجاه «خلفي».');
    }
    if (['Rim Light', 'Backlight', 'Silhouette Lighting'].indexOf(ltype) !== -1 && ldir === 'Front') {
      out.push('إضاءة «' + ltype + '» من الخلف تتعارض مع اتجاه أمامي.');
    }

    /* الكاميرا على جهة العنصر الذي ينظر إليه الشخص: سيبدو كأنه ينظر للكاميرا */
    var sp = spatialInfo(st), O = resolveObject(st, sp);
    var cyaw = PS.Scene3D ? PS.Scene3D.cameraYaw(ang || 'Eye Level') : null;
    if (O && sp.action && !O.behind && O.type !== 'person' && cyaw !== null && mode !== 'product') {
      var diff = Math.abs(((cyaw - O.P) % 360 + 540) % 360 - 180);
      if (diff < 50) {
        out.push('الكاميرا على نفس جهة «' + (OBJ_AR[O.key] || 'العنصر') + '»، فسيبدو الشخص كأنه ينظر للكاميرا بدل العنصر. اختر زاوية جانبية (Side) أو ثلاثة أرباع (3/4) أو من الخلف.');
      }
    }

    var beard = trim(st.beard);
    if (mode !== 'product' && beard && beard !== 'None' && beard !== 'Custom') {
      if (st.age === 'Child') out.push('اللحية لا تناسب «طفل». اختر بدون لحية.');
      if (st.gender === 'Woman') out.push('اللحية لا تناسب «سيدة». اختر بدون لحية أو غيّر النوع.');
    }
    return out;
  }

  /* ---------------- قصة الصورة: سياق يُدمج في البرومبت ---------------- */
  function storyNote(st) {
    var s = trim(st.imageStory);
    if (!s) return '';
    return 'The overall purpose of this image: ' + s.replace(/\.$/, '') + '. Every composition, expression and lighting choice should serve this purpose.';
  }

  PS.CompositionPreview = {
    render: render,
    mount: mount,
    conflicts: conflicts,
    storyNote: storyNote,
    lightInfo: lightInfo
  };
})();
