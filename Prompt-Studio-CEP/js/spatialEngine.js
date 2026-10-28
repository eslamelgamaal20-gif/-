/* ==========================================================================
   EMG — spatialEngine.js
   Spatial Scene Composition
   ---------------------------------------------------------------------------
   يبني العلاقة المكانية بين الشخص والعنصر قبل صياغة البروميت:
     1. Detect   : يستنتج العنصر والفعل من الفكرة (عربي/إنجليزي) إن لم يحددهما المستخدم
     2. Place    : يحدد موضع العنصر ومسافته وارتفاعه بالنسبة للشخص
     3. Orient   : يحدد اتجاه الجسم والرأس والعينين حسب الفعل
     4. Camera   : يحدد زاوية الكاميرا بحيث يظهر الشخص والعنصر معاً
     5. Review   : يراجع التعارضات (موضع/جسم/رأس/كاميرا/حركة) مع أولوية الفعل
     6. Compose  : يكتب فقرة إنجليزية مكانية متكاملة لـ buildSpatialCompositionPrompt()
   النموذج: تقريبي مستوٍ (top-view). الاتجاهات بالدرجات:
     0 = أمام الشخص، +90 = يمينه، -90 = يساره، 180 = خلفه.
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});

  /* أقصى زاوية يبقى فيها العنصر داخل الكادر (بالدرجات من محور الكاميرا) */
  var VIS = 110;

  /* ---------------- أدوات هندسية ---------------- */
  function angDiff(a, b) {
    var d = (((a - b) % 360) + 540) % 360 - 180;
    return Math.abs(d);
  }
  function sign(x) { return x < 0 ? -1 : 1; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function hasAr(s) { return /[\u0600-\u06FF]/.test(s || ''); }
  function toEn(s) {
    s = String(s || '').trim();
    if (!s) return '';
    try { return hasAr(s) && PS.PromptEngine && PS.PromptEngine.translate ? PS.PromptEngine.translate(s) : s; }
    catch (e) { return s; }
  }

  /* ---------------- مواضع العناصر (درجات من وجه الشخص) ---------------- */
  var PLACE = {
    'Front': 0, 'Front Left': -40, 'Front Right': 40,
    'Left': -90, 'Right': 90, 'Behind': 180, 'Above': 0, 'Below': 0
  };

  /* ---------------- المسافات ---------------- */
  var DIST = {
    'Arm Length': 'within arm\'s reach, about 0.6 meters away',
    'Close': 'about 1.5 meters away',
    'Medium': 'about 2.5 meters away',
    'Far': 'about 4 meters away'
  };

  /* ---------------- العناصر ---------------- */
  var OBJECTS = {
    'Television': { en: 'the television', home: 'mounted on the wall', height: 'at eye level', surface: 'center of the screen', place: 'Front', dist: 'Medium' },
    'Monitor': { en: 'the computer monitor', home: 'on a desk', height: 'at seated eye level', surface: 'center of the screen', place: 'Front', dist: 'Arm Length' },
    'Laptop': { en: 'the laptop', home: 'open on a desk', height: 'at desk height', surface: 'laptop screen', place: 'Front', dist: 'Arm Length' },
    'Product': { en: 'the product', home: 'placed on a table', height: 'at chest height', surface: 'front face of the product', place: 'Front', dist: 'Close' },
    'Another Person': { en: 'the other person', home: 'standing nearby', height: 'at eye level', surface: 'face of the other person', place: 'Front Right', dist: 'Close' },
    'Phone': { en: 'the phone', home: 'held near the body', height: 'at chest height', surface: 'phone screen', place: 'Front', dist: 'Arm Length' },
    'Window': { en: 'the window', home: 'set into the wall', height: 'at eye level', surface: 'view through the window', place: 'Front', dist: 'Medium' },
    'Custom': { en: 'the main object', home: 'in the scene', height: 'at a natural height', surface: 'main surface of the object', place: 'Front', dist: 'Close' }
  };

  /* ---------------- الأفعال: اتجاه الجسم والنظر والحركة ---------------- */
  var ACTIONS = {
    'Watching': { person: false, drop: true, body: '{S}\'s torso, shoulders and hips are oriented toward {o}, settled and relaxed while watching.', gaze: null },
    'Using': { person: false, drop: true, body: '{S}\'s torso and hips face {o} squarely, with both hands resting on the keyboard or device.', gaze: null },
    'Looking At': { person: false, drop: false, body: '{S}\'s torso turns toward {o} with clear, focused attention.', gaze: null },
    'Talking To': { person: true, drop: true, body: '{S}\'s torso and shoulders angle about 45 degrees toward {o}, engaged in a natural conversation.', gaze: 'the face of the other person' },
    'Holding': { person: false, drop: false, body: '{S}\'s torso is turned toward {o} while holding it in one hand, with a believable, anatomically correct grip.', gaze: null },
    'Reaching': { person: false, drop: false, body: '{S}\'s near arm reaches out toward {o}, with the torso angled toward it.', gaze: null }
  };
  var ACT_AR = {
    'Watching': 'المشاهدة', 'Using': 'الاستخدام', 'Looking At': 'النظر',
    'Talking To': 'الحديث', 'Holding': 'الإمساك', 'Reaching': 'مدّ اليد'
  };
  var GAZE_AR = {
    'At Camera': 'نحو الكاميرا', 'Away': 'بعيداً', 'Right': 'لليمين', 'Left': 'لليسار',
    'Up': 'للأعلى', 'Down': 'للأسفل', 'Over Shoulder': 'فوق الكتف'
  };

  /* ---------------- زوايا الكاميرا ---------------- */
  var CAM_KIND = { 'Side Angle': 'side', '3/4 Angle': 'three', 'Back Angle': 'back', 'Over-the-Shoulder': 'back' };

  function cameraBearing(angleKey, P) {
    var side = P >= 0 ? 1 : -1;
    var kind = CAM_KIND[angleKey] || 'front';
    if (kind === 'side') return 90 * side;
    if (kind === 'three') return 45 * side;
    if (kind === 'back') return 180;
    return 0;
  }

  /* ---------------- الكشف التلقائي من الفكرة (عربي/إنجليزي) ---------------- */
  var DET_OBJ = [
    [/television|\btv\b|تلفز|تليفز|تلفاز/i, 'Television'],
    [/laptop|lap ?top|لابتوب|لاب توب|كمبيوتر محمول/i, 'Laptop'],
    [/monitor|شاشة كمبيوتر|كمبيوتر مكتب/i, 'Monitor'],
    [/product|bottle|perfume|منتج|زجاجة|علبة|عطر/i, 'Product'],
    [/another person|other person|second person|شخص (تاني|ثاني|آخر|اخر)|صديق|صديقه|زميل|زميلة|زميله/i, 'Another Person'],
    [/phone|smartphone|موبايل|جوال|هاتف/i, 'Phone'],
    [/window|نافذة|شباك/i, 'Window']
  ];
  var DET_ACT = [
    [/talk|speak|convers|chat|يتحدث|بيتحدث|يتكلم|بيتكلم|يكلم|بيكلم|محادث/i, 'Talking To'],
    [/watch|يشاهد|بيشاهد|يتفرج|بيتفرج|شاهد/i, 'Watching'],
    [/\buse|using|typing|types|يستخدم|بيستخدم|يكتب|بيكتب|يشتغل على/i, 'Using'],
    [/hold|holds|holding|ماسك|يمسك|بيمسك|ممسك/i, 'Holding'],
    [/reach|يمد|بيمد/i, 'Reaching'],
    [/look|gaz|stare|ينظر|بينظر|بيبص|يبص|تبص|تنظر|نظر/i, 'Looking At']
  ];

  function detect(text) {
    var raw = String(text || '');
    var en = '';
    if (hasAr(raw) && PS.PromptEngine && PS.PromptEngine.translate) {
      try { en = PS.PromptEngine.translate(raw); } catch (e) { en = ''; }
    }
    var all = raw + ' | ' + en;
    var res = { object: '', action: '' };
    DET_OBJ.some(function (d) { if (d[0].test(all)) { res.object = d[1]; return true; } return false; });
    DET_ACT.some(function (d) { if (d[0].test(all)) { res.action = d[1]; return true; } return false; });
    return res;
  }

  /* يحدد الشخص: رجل / سيدة / الموضوع العام */
  function detectSubject(st) {
    if (st.gender === 'Man') return 'the man';
    if (st.gender === 'Woman') return 'the woman';
    var t = String(st.mainIdea || '') + ' ' + String(st.subjectDetails || '');
    if (/(^|\s)(ال)?(رجل|راجل|ولد|شاب|رجالة)(\s|$)|\b(man|boy|male)\b/i.test(t)) return 'the man';
    if (/(^|\s)(ال)?(ست|سيدة|امرأة|بنت|فتاة|شابة)(\s|$)|\b(woman|girl|female|lady)\b/i.test(t)) return 'the woman';
    return 'the subject';
  }

  /* ---------------- حل الكاميرا والجسم ---------------- */

  /* اتجاه الجسم حسب الوضع المختار والفعل */
  function bodyFor(C, P, interactionOn, bodyMode, behind) {
    if (bodyMode === 'Toward Camera') return C;
    if (bodyMode === 'Away From Camera') return C + 180;
    if (bodyMode === 'Three Quarter') return angDiff(C + 45, P) <= angDiff(C - 45, P) ? C + 45 : C - 45;
    if (bodyMode === 'Toward Object') return P;
    if (!interactionOn) return 0;
    return behind ? 0 : P;
  }

  /* يبحث عن زاوية كاميرا تُظهر العنصر، وتعطي الشخص زاوية ثلاثية الأرباع */
  function solveCamera(P, interactionOn, bodyMode, behind) {
    var best = null;
    for (var c = -180; c < 180; c += 15) {
      var B = bodyFor(c, P, interactionOn, bodyMode, behind);
      var vis = angDiff(P, c + 180) <= VIS;
      var score = (vis ? 0 : 1000) + Math.abs(angDiff(B, c) - 60);
      if (P !== 0 && sign(c) === sign(P)) score += 12; // تفضيل أن تكون الكاميرا على الجانب المقابل للعنصر
      if (best === null || score < best.score) best = { C: c, score: score };
    }
    return best;
  }

  /* أقرب موضع مرئي للعنصر عندما تكون الكاميرا ثابتة */
  function nearestVisible(P, C) {
    var cands = [0, 40, -40, 90, -90, 135, -135, 180];
    var best = null;
    cands.forEach(function (c) {
      if (angDiff(c, C + 180) > VIS) return;
      var d = angDiff(c, P);
      if (best === null || d < best.d) best = { c: c, d: d };
    });
    return best ? best.c : P;
  }

  function gazeCompatible(g, P, vert, behind) {
    if (g === 'Right') return P > 20;
    if (g === 'Left') return P < -20;
    if (g === 'Up') return vert === 'Above';
    if (g === 'Down') return vert === 'Below';
    if (g === 'Over Shoulder') return behind;
    if (g === 'Away') return true;
    return false; // At Camera لا يتوافق مع النظر إلى عنصر
  }

  /* ---------------- صياغة الوصف المكاني ---------------- */
  function placeText(P, vert, subj) {
    if (vert === 'Above') return 'above ' + subj;
    if (vert === 'Below') return 'below ' + subj + ' at waist level';
    var a = Math.abs(P);
    var s = P > 0 ? subj + '\'s right' : subj + '\'s left';
    if (a < 15) return 'directly in front of ' + subj;
    if (a < 60) return 'diagonally in front of ' + subj + ', on ' + s;
    if (a < 135) return 'off to the side of ' + subj + ', on ' + s;
    return 'directly behind ' + subj;
  }

  function camText(C, subj) {
    var a = Math.abs(C);
    var s = C > 0 ? subj + '\'s right' : subj + '\'s left';
    if (a <= 20) return 'directly in front of ' + subj;
    if (a <= 80) return 'at a three-quarter angle on ' + s;
    if (a <= 120) return 'at the side of ' + subj + ' on ' + s + ', shooting in profile';
    return 'behind ' + subj;
  }

  function bodyView(B, C) {
    var d = angDiff(B, C);
    if (d <= 30) return 'facing the camera';
    if (d <= 80) return 'turned three-quarters toward the camera';
    if (d <= 120) return 'in profile to the camera';
    return 'turned away from the camera';
  }

  function fill(str, M) {
    return str.replace(/\{S\}/g, cap(M.subj)).replace(/\{o\}/g, M.objName);
  }

  /* ---------------- بناء النموذج + المراجعة الداخلية ---------------- */
  function buildModel(st, ctx) {
    var warnings = [];
    var warn = function (m) { if (warnings.indexOf(m) === -1) warnings.push(m); };

    /* 1. الاستنتاج: إن لم يحدد المستخدم العنصر/الفعل، نستنتجهما من الفكرة */
    var det = detect((st.mainIdea || '') + ' ' + (st.subjectDetails || ''));
    var objExplicit = !!st.spatialObject && st.spatialObject !== 'Auto';
    var actExplicit = !!st.spatialInteraction && st.spatialInteraction !== 'Auto';
    var objKey = objExplicit ? st.spatialObject : (det.object || '');
    var act = actExplicit ? st.spatialInteraction : (det.action || '');
    if (!objKey && !act) return null;
    if (!objKey) {
      objKey = act === 'Talking To' ? 'Another Person' : act === 'Using' ? 'Laptop'
        : act === 'Watching' ? 'Television' : 'Product';
    }
    if (act === 'Talking To' && !objExplicit) objKey = 'Another Person';

    var O = OBJECTS[objKey] || OBJECTS.Product;
    var objName = O.en;
    if (objKey === 'Custom') {
      var cn = toEn(st.spatialObjectCustom).replace(/^(the|a|an)\s+/i, '').toLowerCase();
      objName = cn ? 'the ' + cn : 'the main object';
    }

    /* 2. الموضع والمسافة */
    var placeExplicit = !!st.spatialPlacement && st.spatialPlacement !== 'Auto';
    var placeKey = placeExplicit ? st.spatialPlacement : O.place;
    var P = PLACE[placeKey] || 0;
    var vert = (placeKey === 'Above' || placeKey === 'Below') ? placeKey : '';
    var distKey = st.spatialDistance && st.spatialDistance !== 'Auto' ? st.spatialDistance : O.dist;

    /* 3. الفعل والجسم */
    var bodyMode = st.spatialBodyFacing || 'Auto';
    var interactionOn = !!(act && ACTIONS[act]);
    var A = interactionOn ? ACTIONS[act] : null;
    var behindP = angDiff(P, 0) > 120;

    /* 4. الكاميرا */
    var C, Pf = P;
    if (st.cameraAngle) {
      C = cameraBearing(st.cameraAngle, P);
      if (angDiff(P, C + 180) > VIS) {
        if (!placeExplicit) {
          Pf = nearestVisible(P, C);
          warn('زاوية الكاميرا المختارة تضع ' + objName + ' خارج الكادر، فتم نقله إلى جانب الشخص ليظهر بوضوح.');
        } else {
          warn('موضع ' + objName + ' المختار يدوياً خارج مجال الكاميرا المختارة — راجع الزاوية أو الموضع.');
        }
      }
    } else {
      C = solveCamera(P, interactionOn, bodyMode, behindP).C;
    }

    /* 5. المراجعة الداخلية */
    var behind = interactionOn && angDiff(Pf, 0) > 120;
    var B = bodyFor(C, Pf, interactionOn, bodyMode, behind);

    if (behind && interactionOn) {
      warn(objName.charAt(0).toUpperCase() + objName.slice(1) + ' خلف الشخص — سيلتفت الرأس للخلف فوق الكتف للنظر إليه، والجسم يبقى للأمام.');
    }
    if (interactionOn && (bodyMode === 'Toward Camera' || bodyMode === 'Away From Camera') && angDiff(B, Pf) > 100) {
      B = behind ? 0 : Pf;
      warn('تم تعديل اتجاه جسم الشخص ليواجه ' + objName + ' لأن فعل "' + ACT_AR[act] + '" يتطلب ذلك (تعارض مع "' +
        (bodyMode === 'Toward Camera' ? 'نحو الكاميرا' : 'بعيداً عن الكاميرا') + '").');
    }

    var gaze = st.gazeDirection || 'Off';
    if (interactionOn && gaze !== 'Off' && !gazeCompatible(gaze, Pf, vert, behind)) {
      warn('تم توجيه النظر نحو ' + objName + ' ليتوافق مع فعل "' + ACT_AR[act] + '" بدلاً من "' + (GAZE_AR[gaze] || gaze) + '".');
    }

    var moving = (st.pose || []).some(function (p) { return p === 'Walking' || p === 'Running'; });
    var dropMotion = !!(interactionOn && A.drop && moving);
    if (dropMotion) warn('تم إلغاء المشي/الجري لأن فعل "' + ACT_AR[act] + '" يتطلب ثبات الجسم ليظهر بوضوح.');

    return {
      O: O, objName: objName, Pf: Pf, vert: vert, distKey: distKey,
      act: act, interactionOn: interactionOn, A: A,
      C: C, B: B, behind: behind, dropMotion: dropMotion,
      subj: detectSubject(st), warnings: warnings
    };
  }

  /* يكتب الفقرة الإنجليزية المكانية */
  function buildText(M) {
    var O = M.O, o = M.objName, s = M.subj, out = [];

    out.push(cap(o) + ' is ' + O.home + ', ' + placeText(M.Pf, M.vert, s) + ', ' +
      (DIST[M.distKey] || DIST.Medium) + ', ' + O.height + '.');

    if (M.interactionOn) {
      if (M.behind) {
        out.push(fill('{S}\'s torso stays oriented forward while the head turns back over the shoulder toward {o}.', M));
      } else {
        out.push(fill(M.A.body, M));
      }
      var target = M.A.gaze || ('the ' + O.surface);
      var headTxt;
      if (M.behind) headTxt = 'back over the shoulder toward ' + o;
      else if (Math.abs(M.Pf) < 20) headTxt = 'slightly toward ' + o + ', with the neck aligned naturally';
      else headTxt = 'toward ' + o + ', with the neck aligned naturally with the torso';
      out.push(fill('{S}\'s head is turned ' + headTxt + ' and the eyes lock onto ' + target +
        '; the line of sight runs straight from the eyes to that point and ends there, with nothing else in the frame competing for attention.', M));
    }

    out.push('The camera sits ' + camText(M.C, s) + '; from there ' + s + '\'s body appears ' +
      bodyView(M.B, M.C) + ' and ' + o + ' stays visible in the same frame.');

    var tail = 'Keep ' + s + ', ' + o + ', the camera angle and the room layout in one consistent spatial composition, with no unrelated body orientation or gaze direction';
    if (M.dropMotion) tail += ', and keep the body still so the action reads clearly';
    out.push(tail + '.');

    return out.join(' ');
  }

  /* ==========================================================================
     الدالة الرئيسية: buildSpatialCompositionPrompt(st, ctx)
     ترجع: { active, text, gazeOwned, dropMotion, behind, action, warnings }
     - gazeOwned: الفعل يملك اتجاه النظر (يُتجاهل gazeDirection العام)
     - dropMotion: تم إلغاء المشي/الجري
     - warnings: تعارضات تم حلها وتُعرض للمستخدم
     ========================================================================== */
  function buildSpatialCompositionPrompt(st, ctx) {
    var inactive = { active: false, text: '', gazeOwned: false, dropMotion: false, behind: false, action: '', warnings: [] };
    if (!st || (ctx && (ctx.product || ctx.editing))) return inactive;
    var M = buildModel(st, ctx || {});
    if (!M) return inactive;
    return {
      active: true,
      text: buildText(M),
      gazeOwned: M.interactionOn,
      dropMotion: M.dropMotion,
      behind: M.behind,
      action: M.interactionOn ? M.act : '',
      warnings: M.warnings
    };
  }

  PS.Spatial = {
    buildSpatialCompositionPrompt: buildSpatialCompositionPrompt,
    detect: detect,
    angDiff: angDiff
  };
})();
