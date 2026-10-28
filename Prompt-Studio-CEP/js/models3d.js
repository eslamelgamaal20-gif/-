/* ==========================================================================
   EMG — models3d.js
   مجسمات ثلاثية الأبعاد حقيقية (THREE.Mesh) لكل ما يظهر في المعاينة:
     • الشخصيات: بنية مأخوذة من شيت "Lucia" (شعر متموج، جاكيت برتقالي، توب بيج،
       جينز تركواز، سنيكرز تركواز، عيون كبيرة وابتسامة كرتونية).
       الجنس والعمر والشعر والإكسسوارات والتعبير والحذاء والخامات تغيّر
       المجسم نفسه (هندسة وألوان وخامات) وليس اسم الاختيار فقط.
     • المنتجات: زجاجة (Lathe حقيقي)، كوب، علبة، موبايل.
     • الأسطح: منصة، طاولة، أرضية.
     • العناصر: تلفزيون، شاشة، لابتوب، نافذة، موبايل، شخص آخر.
   ملاحظة: المجسمات بُنيت من أشكال هندسية أولية (كبسولات وكرات ومجسمات
   دوارة)، وليست نموذجاً مصمماً فنياً؛ لذلك الملامح تقريبية حسب الشيت.
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});
  var DEG = Math.PI / 180;
  function TH() { return window.THREE; }

  /* ---------------- ألوان ومواد (مستخرجة من شيت الشخصية) ---------------- */
  var SKIN = { 'Fair': '#f6d6bf', 'Light': '#efc4a2', 'Medium': '#dca27a', 'Tan': '#c4845a', 'Brown': '#9b6442', 'Deep Brown': '#6e4429' };
  var DEF_SKIN = '#e3a077';
  var HAIR = { 'Black': '#17130f', 'Dark Brown': '#3a2418', 'Brown': '#6b4226', 'Blonde': '#d9b56a', 'Red': '#8a3a22', 'Gray': '#bfc2c6', 'White': '#e6e6e6' };
  var DEF_HAIR = '#7a4b2a';
  var CLOTH = { 'Black': '#2a2a2e', 'White': '#ece9e4', 'Beige': '#c9b08a', 'Navy': '#1f2f4a', 'Gray': '#6b7178', 'Brown': '#6b4a32', 'Olive': '#5b6237', 'Burgundy': '#6a1f2e', 'Earth Tones': '#9a7a55', 'Monochrome': '#4a4a4a', 'Pastel': '#e9c6d6' };
  var DEF_JACKET = '#f0a24a';
  var JEANS = '#2d6f7f';
  var SHOE = '#1f8c8c';
  var SHIRT = '#d8c8ad';
  var FABRIC_ROUGH = { 'Cotton': 0.8, 'Linen': 0.95, 'Denim': 0.9, 'Leather': 0.32, 'Wool': 0.98, 'Silk': 0.28, 'Satin': 0.22, 'Technical Fabric': 0.55, 'Custom': 0.7 };
  var SURFACE = { 'Seamless Paper': '#f1efe9', 'Marble': '#d8d3cc', 'Wood': '#8a6143', 'Glass': '#bfd7e0', 'Concrete': '#8c8f93', 'Fabric': '#d9c9b0', 'Water Surface': '#5d8ea8', 'Custom': '#c9c9c9' };

  /* تعابير الوجه (من خيارات "التعبير الوجهي" الموجودة): mouth>0 ابتسامة، <0 عبوس، brow حاجب */
  var EXPR = {
    'Neutral': { mouth: 0.08, brow: 0 }, 'Serious': { mouth: 0, brow: -0.6 }, 'Happy': { mouth: 0.9, brow: 0.5 },
    'Smiling': { mouth: 1, brow: 0.35 }, 'Confident': { mouth: 0.55, brow: 0.1 }, 'Relaxed': { mouth: 0.35, brow: 0 },
    'Thoughtful': { mouth: -0.1, brow: 0.4 }, 'Dramatic': { mouth: -0.6, brow: -0.8 }, 'Natural': { mouth: 0.3, brow: 0 },
    'Custom': { mouth: 0.2, brow: 0 }
  };

  /* مواضع الأذرع حسب "الوضعية" الموجودة: x = ميلان الكتف للأمام، z = للخارج، e = الكوع */
  var ARMS = {
    'Arms Crossed': { L: { x: -1.0, z: -0.9, e: -2.1 }, R: { x: -1.0, z: 0.9, e: -2.1 } },
    'Hands in Pockets': { L: { x: 0.5, z: 0.22, e: -1.0 }, R: { x: 0.5, z: -0.22, e: -1.0 } },
    'Hand on Face': { R: { x: -2.1, z: -0.25, e: -2.0 } },
    'One Hand Raised': { R: { x: -2.9, z: -0.15, e: -0.1 } },
    'Holding Object': { R: { x: -0.9, z: -0.3, e: -1.5 } },
    'Both Hands Visible': { L: { x: -0.9, z: 0.3, e: -1.3 }, R: { x: -0.9, z: -0.3, e: -1.3 } },
    'Dynamic Pose': { L: { x: -0.4, z: 0.5, e: -0.5 }, R: { x: 0.4, z: -0.3, e: -0.6 } },
    'POV': { L: { x: -1.2, z: 0.15, e: -1.2 }, R: { x: -1.2, z: -0.15, e: -1.2 } },
    'Walking': { L: { x: 0.3, z: 0.12, e: -0.4 }, R: { x: -0.3, z: -0.12, e: -0.4 } }
  };
  var ARMS_DEFAULT = { L: { x: 0.04, z: 0.12, e: -0.08 }, R: { x: 0.04, z: -0.12, e: -0.08 } };

  /* ---------------- أدوات ---------------- */
  function grp() { return new (TH().Group)(); }
  function mat(color, rough, metal, extra) {
    var o = { color: color, roughness: rough == null ? 0.6 : rough, metalness: metal || 0 };
    if (extra) { Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); }
    return new (TH().MeshStandardMaterial)(o);
  }
  function mesh(geo, m, x, y, z) {
    var o = new (TH().Mesh)(geo, m);
    o.castShadow = true; o.receiveShadow = true;
    if (x != null) o.position.set(x, y, z);
    return o;
  }
  function capsule(r, total) { return new (TH().CapsuleGeometry)(r, Math.max(0.002, total - 2 * r), 6, 12); }
  function sphere(r, w, h) { return new (TH().SphereGeometry)(r, w || 14, h || 10); }
  function boxG(w, h, d) { return new (TH().BoxGeometry)(w, h, d); }
  function cylG(rt, rb, h, s) { return new (TH().CylinderGeometry)(rt, rb, h, s || 16); }
  function torusG(r, t, rs, ts, arc) { return new (TH().TorusGeometry)(r, t, rs || 8, ts || 20, arc || Math.PI * 2); }
  function vec2(x, y) { return new (TH().Vector2)(x, y); }
  function vec3(x, y, z) { return new (TH().Vector3)(x, y, z); }
  /* مولّد أرقام عشوائية ثابت (نفس المدخل = نفس الشكل) */
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ---------------- تصنيف الشخص والبروفايل ---------------- */
  function kindOf(st) {
    var age = st.age || 'Adult';
    if (age === 'Custom') age = 'Adult';
    var g = st.gender === 'Woman' ? 'woman' : (st.gender === 'Man' ? 'man' : 'neutral');
    return { age: age, g: g, child: age === 'Child', teen: age === 'Teen', elderly: age === 'Elderly', middle: age === 'Middle-aged' };
  }
  /* أبعاد كل فئة عمرية وجنس. heightS = الطول، headS = حجم الرأس المطلق، hunch = انحناء */
  function profileOf(k) {
    var p = { heightS: 1, headS: 1, shoulderS: 1, hipS: 1, chestD: 1, waistS: 1, hunch: 0, grey: false };
    if (k.g === 'woman') { p.shoulderS = 0.92; p.hipS = 1.06; p.waistS = 0.9; }
    else if (k.g === 'man') { p.shoulderS = 1.12; p.chestD = 1.08; }
    if (k.child) { p.heightS = 0.72; p.headS = 0.95; p.shoulderS *= 0.82; p.hipS *= 0.9; }
    else if (k.teen) { p.heightS = 0.93; }
    else if (k.middle) { p.heightS = 0.98; p.waistS = 1.1; }
    else if (k.elderly) { p.heightS = 0.94; p.hunch = 0.16; p.grey = true; p.waistS = 1.08; }
    return p;
  }
  function paletteOf(st, idx) {
    return {
      skin: SKIN[st.skinTone] || DEF_SKIN,
      hair: HAIR[st.hairColor] || DEF_HAIR,
      jacket: CLOTH[st.clothingColor] || (idx === 1 ? '#4f7a6a' : DEF_JACKET),
      jeans: JEANS, shoe: SHOE, shirt: SHIRT, iris: idx === 1 ? '#3a5a4a' : '#6b3f22'
    };
  }
  function hairStyleOf(st, k) {
    var s = st.hairStyle || '';
    if (!s) {
      if (k.g === 'woman') s = 'Wavy';
      else if (k.g === 'man') s = 'Short';
      else s = 'Medium';
      if (k.child && k.g !== 'woman') s = 'Short';
    }
    return s;
  }

  /* ==========================================================================
     بناء الشخصية (cache حسب الاختيارات حتى لا نعيد بناء الهندسة في كل رسم)
     ========================================================================== */
  var CACHE = {}, CACHE_KEYS = [];
  function character(st, opt) {
    opt = opt || {};
    var k = kindOf(st), P = profileOf(k), pal = paletteOf(st, opt.idx || 0);
    var key = JSON.stringify([k, P, pal, hairStyleOf(st, k), st.beard, st.accessories, st.clothingStyle, st.material,
      st.shoes, st.expression, st.makeup, st.skinTone, st.hairColor, st.clothingColor, opt.idx || 0]);
    if (CACHE[key]) return CACHE[key];
    var m = buildCharacter(st, k, P, pal, opt);
    CACHE[key] = m; CACHE_KEYS.push(key);
    if (CACHE_KEYS.length > 8) { delete CACHE[CACHE_KEYS.shift()]; }
    return m;
  }

  function buildCharacter(st, k, P, pal, opt) {
    var T = TH();
    var root = grp();
    root.scale.set(1, P.heightS, 1);

    var rough = FABRIC_ROUGH[st.material] != null ? FABRIC_ROUGH[st.material] : 0.7;
    var jacketM = mat(pal.jacket, rough, st.material === 'Leather' ? 0.04 : 0);
    var cuffM = mat(new T.Color(pal.jacket).multiplyScalar(0.8), 0.8);
    var jeansM = mat(pal.jeans, 0.9);
    var shirtM = mat(pal.shirt, 0.85);
    var skinM = mat(pal.skin, 0.55);
    var hairM = mat(P.grey && !st.hairColor ? '#bfc2c6' : pal.hair, 0.5);
    var hairDouble = mat(P.grey && !st.hairColor ? '#bfc2c6' : pal.hair, 0.5, 0, { side: T.DoubleSide });
    var eyeWhite = mat('#fbfbfb', 0.3);
    var irisM = mat(pal.iris, 0.3);
    var pupilM = mat('#15110f', 0.2);
    var shineM = mat('#ffffff', 0.1);
    var darkM = mat('#1d1a18', 0.5);
    var goldM = mat('#d1a054', 0.28, 1);

    var shoeStyle = st.shoes || 'Sneakers';
    var shoeColor = SHOE, soleColor = '#f2f2f2', tall = false;
    if (shoeStyle === 'Formal Shoes') { shoeColor = '#1c1c1f'; soleColor = '#111111'; }
    else if (shoeStyle === 'Boots') { shoeColor = '#5a3a24'; soleColor = '#2a1d15'; tall = true; }
    else if (shoeStyle === 'Loafers' || shoeStyle === 'Traditional Shoes') { shoeColor = '#5b3b26'; soleColor = '#2a1d15'; }
    else if (shoeStyle === 'Sandals') { shoeColor = '#8a6a4a'; soleColor = '#8a6a4a'; }
    var shoeM = mat(shoeColor, 0.55), soleM = mat(soleColor, 0.6);

    /* ----- الساقان ----- */
    var legs = {};
    [-1, 1].forEach(function (s) {
      var key = s < 0 ? 'R' : 'L';
      var hip = grp();
      hip.position.set(s * 0.085 * P.hipS, 0.5, 0);
      root.add(hip);
      hip.add(mesh(capsule(0.072, 0.23), jeansM, 0, -0.115, 0));
      var knee = grp();
      knee.position.set(0, -0.23, 0);
      hip.add(knee);
      knee.add(mesh(capsule(0.058, 0.23), jeansM, 0, -0.115, 0));
      var shoe = grp();
      var body = mesh(sphere(1, 16, 12), shoeM, 0, -0.235, 0.04);
      body.scale.set(0.072, 0.036, 0.122);
      shoe.add(body);
      if (shoeStyle !== 'Sandals') shoe.add(mesh(boxG(0.14, 0.024, 0.24), soleM, 0, -0.26, 0.035));
      if (tall) shoe.add(mesh(cylG(0.062, 0.062, 0.12, 14), shoeM, 0, -0.14, 0));
      knee.add(shoe);
      legs[key] = { hip: hip, knee: knee };
    });

    /* ----- الجذع: pivot للانحناء، والجسم داخله بإحداثيات العالم ----- */
    var torso = grp();
    torso.position.set(0, 0.5, 0);
    root.add(torso);
    var tb = grp();
    tb.position.set(0, -0.5, 0);
    torso.add(tb);

    var jPts = [[0.001, 0.5], [0.1, 0.5], [0.118, 0.54], [0.13, 0.6], [0.14, 0.7], [0.152, 0.78], [0.135, 0.84], [0.09, 0.865], [0.001, 0.872]];
    var jacket = mesh(new T.LatheGeometry(jPts.map(function (p) { return vec2(p[0], p[1]); }), 28), jacketM);
    jacket.scale.set(P.shoulderS * (k.g === 'woman' ? 0.95 : 1), 1, 0.72 * P.chestD);
    tb.add(jacket);
    var shirtFront = mesh(boxG(0.1, 0.24, 0.02), shirtM, 0, 0.66, 0.09 * P.chestD);
    tb.add(shirtFront);
    tb.add(mesh(boxG(0.006, 0.22, 0.008), darkM, 0, 0.66, 0.1 * P.chestD));
    var collar = mesh(torusG(0.07, 0.018, 8, 20), jacketM, 0, 0.85, 0);
    collar.rotation.x = Math.PI / 2; collar.scale.set(P.shoulderS, 1, 0.72 * P.chestD);
    tb.add(collar);
    tb.add(mesh(cylG(0.05, 0.055, 0.09, 14), skinM, 0, 0.86, 0));

    /* ----- الذراعان ----- */
    var arms = {};
    [-1, 1].forEach(function (s) {
      var key = s < 0 ? 'R' : 'L';
      var sh = grp();
      sh.position.set(s * 0.165 * P.shoulderS, 0.78, 0);
      tb.add(sh);
      sh.add(mesh(capsule(0.05, 0.27), jacketM, 0, -0.135, 0));
      var el = grp();
      el.position.set(0, -0.27, 0);
      sh.add(el);
      el.add(mesh(capsule(0.044, 0.24), jacketM, 0, -0.12, 0));
      el.add(mesh(cylG(0.05, 0.046, 0.035, 14), cuffM, 0, -0.225, 0));
      var hand = mesh(sphere(1, 14, 10), skinM, 0, -0.275, 0);
      hand.scale.set(0.042, 0.06, 0.03);
      el.add(hand);
      var thumb = mesh(sphere(1, 10, 8), skinM, -s * 0.034, -0.258, 0.012);
      thumb.scale.set(0.012, 0.02, 0.012);
      el.add(thumb);
      if (key === 'L') {
        var watch = mesh(torusG(0.036, 0.008, 6, 16), goldM, 0, -0.2, 0);
        watch.rotation.x = Math.PI / 2;
        el.add(watch);
      }
      arms[key] = { sh: sh, el: el, hand: hand };
    });

    /* ----- الرأس (pivot بحجم headS مطلق) ----- */
    var head = grp();
    head.position.set(0, 0.885, 0);
    head.scale.set(P.headS, P.headS / P.heightS, P.headS);
    tb.add(head);
    var headMesh = mesh(sphere(0.115, 26, 18), skinM, 0, 0, 0);
    headMesh.scale.set(1, 1.04, 0.98);
    head.add(headMesh);
    [-1, 1].forEach(function (s) {
      var ear = mesh(sphere(0.026, 10, 8), skinM, s * 0.113, -0.01, 0);
      ear.scale.set(0.55, 1.1, 0.6);
      head.add(ear);
    });

    var expr = EXPR[st.expression] || EXPR.Neutral;
    var woman = k.g === 'woman';
    var makeup = st.makeup && st.makeup !== 'Off' ? st.makeup : '';
    [-1, 1].forEach(function (s) {
      var ew = mesh(sphere(0.031, 16, 12), eyeWhite, s * 0.045, 0.012, 0.1);
      ew.scale.set(1, 1.1, 0.55);
      head.add(ew);
      head.add(mesh(sphere(0.02, 14, 10), irisM, s * 0.045, 0.012, 0.118));
      head.add(mesh(sphere(0.011, 10, 8), pupilM, s * 0.045, 0.012, 0.132));
      head.add(mesh(sphere(0.005, 8, 6), shineM, s * 0.045 + 0.007, 0.02, 0.138));
      if (woman || makeup) {
        var lash = mesh(boxG(0.07, 0.007, 0.012), darkM, s * 0.045, 0.046, 0.1);
        lash.rotation.z = -s * 0.15;
        head.add(lash);
      }
      var brow = mesh(boxG(0.042, P.grey ? 0.007 : 0.009, 0.012), hairM, s * 0.045, 0.06 + 0.005 * expr.brow, 0.112);
      brow.rotation.z = -s * expr.brow * 0.5;
      head.add(brow);
      var cheek = mesh(sphere(0.022, 12, 10), mat(makeup ? '#e8827a' : '#e88f86', 0.6, 0, { transparent: true, opacity: woman || makeup ? 0.6 : 0.4 }), s * 0.072, -0.02, 0.09);
      cheek.scale.set(woman ? 1.2 : 1, 0.7, 0.5);
      head.add(cheek);
    });
    var nose = mesh(sphere(0.011, 10, 8), skinM, 0, -0.005, 0.118);
    nose.scale.set(1, 1.1, 0.8);
    head.add(nose);

    var mouthM = mat(makeup && woman ? '#b8505a' : '#9a4a44', 0.5);
    var mouth;
    if (Math.abs(expr.mouth) < 0.15) {
      mouth = mesh(boxG(0.034, 0.005, 0.01), mouthM, 0, -0.04, 0.112);
    } else {
      mouth = mesh(torusG(0.03, 0.0045, 8, 20, Math.PI), mouthM, 0, -0.035, 0.112);
      mouth.rotation.z = expr.mouth > 0 ? Math.PI : 0;
      mouth.scale.set(1, 0.5 + 0.5 * Math.min(1, Math.abs(expr.mouth)), 1);
    }
    head.add(mouth);

    /* ----- الشعر ----- */
    buildHair(head, hairM, hairDouble, st, k, P);

    /* ----- اللحية (رجال فقط) ----- */
    var beard = st.beard || '';
    if (k.g === 'man' && !k.child && beard && beard !== 'None' && beard !== 'Custom') {
      var bsz = { 'Stubble': 0.5, 'Short Beard': 0.9, 'Full Beard': 1.25, 'Long Beard': 1.6, 'Mustache': 0 }[beard] || 0;
      if (beard === 'Mustache') {
        head.add(mesh(boxG(0.04, 0.008, 0.012), hairM, 0, -0.027, 0.113));
      } else {
        var bm = mat(pal.hair, 0.8, 0, beard === 'Stubble' ? { transparent: true, opacity: 0.45 } : {});
        var bd = mesh(sphere(1, 14, 10), bm, 0, -0.06, 0.02);
        bd.scale.set(0.08, 0.05 + 0.04 * bsz, 0.06);
        head.add(bd);
      }
    }

    /* ----- الإكسسوارات (تُبنى من خيارات الإكسسوارات الموجودة) ----- */
    var acc = st.accessories || [];
    if (acc.indexOf('Glasses') !== -1 || acc.indexOf('Sunglasses') !== -1) {
      var sun = acc.indexOf('Sunglasses') !== -1;
      var frameM = mat('#1e1e22', 0.4);
      [-1, 1].forEach(function (s) {
        head.add(mesh(torusG(0.031, 0.0035, 8, 18), frameM, s * 0.045, 0.012, 0.13));
        if (sun) {
          var lens = mesh(sphere(0.033, 12, 8), mat('#101214', 0.1, 0, { transparent: true, opacity: 0.9 }), s * 0.045, 0.012, 0.13);
          lens.scale.set(1, 1, 0.2);
          head.add(lens);
        }
      });
      head.add(mesh(boxG(0.02, 0.003, 0.004), frameM, 0, 0.012, 0.13));
    }
    if (acc.indexOf('Hat') !== -1 || acc.indexOf('Cap') !== -1) {
      var capM = mat('#2b2d33', 0.7);
      var dome = mesh(new T.SphereGeometry(0.13, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0, 0.035, -0.005);
      head.add(dome);
      if (acc.indexOf('Hat') !== -1) head.add(mesh(cylG(0.16, 0.16, 0.008, 24), capM, 0, 0.034, 0));
      else head.add(mesh(boxG(0.1, 0.006, 0.07), capM, 0, 0.036, 0.11));
    }
    if (acc.indexOf('Earrings') !== -1 || (acc.indexOf('Jewelry') !== -1 && woman)) {
      [-1, 1].forEach(function (s) { head.add(mesh(sphere(0.012, 8, 6), goldM, s * 0.115, -0.035, 0)); });
    }
    if (acc.indexOf('Jewelry') !== -1) {
      var neck = mesh(torusG(0.07, 0.005, 6, 24), goldM, 0, 0.845, 0);
      neck.rotation.x = Math.PI / 2;
      tb.add(neck);
    }
    if (acc.indexOf('Scarf') !== -1) {
      var sc = mesh(torusG(0.075, 0.03, 10, 24), mat('#d8c8ad', 0.9), 0, 0.84, 0);
      sc.rotation.x = Math.PI / 2;
      tb.add(sc);
    }

    /* ----- النشاط: أحمر الشفاه وخط العين عبر الـ makeup (موجودة) ----- */

    var model = {
      root: root, torso: torso, tb: tb, head: head, legs: legs, arms: arms, mouth: mouth,
      P: P, k: k, pal: pal, handRKey: 'R', handLKey: 'L'
    };
    return model;
  }

  /* ---------------- الشعر: أنماط مبنية من الخيارات الموجودة ---------------- */
  function buildHair(head, hairM, hairDouble, st, k, P) {
    var T = TH();
    var s = hairStyleOf(st, k);
    var capR = 0.123, capTheta = 1.12, capZ = -0.012;
    if (s === 'Buzz Cut') { capR = 0.119; capTheta = 1.45; }
    if (s === 'Slick Back') capTheta = 1.22;
    if (s === 'Fade') capTheta = 1.0;
    if (s === 'Short' || s === 'Custom') capTheta = 1.06;

    var capG = new T.SphereGeometry(capR, 28, 18, 0, Math.PI * 2, 0, capTheta);
    if (s === 'Messy') {
      var r = rng(7), pos = capG.attributes.position, nrm = capG.attributes.normal;
      for (var i = 0; i < pos.count; i++) {
        var d = (r() - 0.5) * 0.02;
        pos.setXYZ(i, pos.getX(i) + nrm.getX(i) * d, pos.getY(i) + nrm.getY(i) * d, pos.getZ(i) + nrm.getZ(i) * d);
      }
      capG.computeVertexNormals();
    }
    head.add(mesh(capG, hairM, 0, 0.01, capZ));

    var len = 0, wave = 0, curtain = false;
    if (s === 'Long') { curtain = true; len = 0.42; wave = 0.3; }
    else if (s === 'Wavy') { curtain = true; len = 0.38; wave = 1; }
    else if (s === 'Curly') { curtain = true; len = 0.34; wave = 1.6; }
    else if (s === 'Straight') { curtain = true; len = 0.4; wave = 0; }
    else if (s === 'Medium') { curtain = true; len = 0.2; wave = 0.5; }
    else if (s === 'Bob') { curtain = true; len = 0.13; wave = 0; }

    if (curtain) head.add(curtainMesh(len, wave, hairDouble));

    if (s === 'Ponytail') {
      var pts = [vec3(0, 0.06, -0.1), vec3(0, 0.01, -0.15), vec3(0, -0.08, -0.17), vec3(0, -0.17, -0.15), vec3(0, -0.22, -0.1)];
      var curve = new T.CatmullRomCurve3(pts);
      head.add(mesh(new T.TubeGeometry(curve, 16, 0.022, 8, false), hairM));
      head.add(mesh(sphere(0.025, 10, 8), mat('#c8873f', 0.5), 0, 0.06, -0.1));
    }

    if (s === 'Curly') {
      var rc = rng(11);
      for (var c = 0; c < 26; c++) {
        var th = rc() * 1.1, ph = rc() * Math.PI * 2;
        var cx = capR * Math.sin(th) * Math.cos(ph), cy = capR * Math.cos(th) + 0.01, cz = capR * Math.sin(th) * Math.sin(ph) + capZ;
        head.add(mesh(sphere(0.03, 8, 6), hairM, cx, cy, cz));
      }
    }
  }

  /* خصلات الشعر الطويل: شريحة منحنية خلف الرأس مع موجات حقيقية في الهندسة */
  function curtainMesh(len, wave, m) {
    var T = TH();
    var g = new T.PlaneGeometry(1, 1, 12, 24);
    var p = g.attributes.position;
    var R = 0.122;
    for (var i = 0; i < p.count; i++) {
      var u = p.getX(i) + 0.5, v = 0.5 - p.getY(i);
      var th = (u - 0.5) * 2.7;
      var y = 0.04 - v * len;
      var w = wave * 0.012 * Math.sin(v * 10 + u * 4);
      var rr = R + w;
      p.setXYZ(i, rr * Math.sin(th), y, -0.02 - rr * Math.cos(th));
    }
    g.computeVertexNormals();
    return mesh(g, m);
  }

  /* ---------------- وضعيات الشخصية ---------------- */
  function setArm(a, spec) {
    a.sh.rotation.set(spec.x, 0, spec.z);
    a.el.rotation.set(spec.e, 0, 0);
  }

  /* spec: { sit, walk (0|1|2), lean, arms, headYaw, headPitch } */
  function poseModel(m, spec) {
    m.root.position.y = spec.sit ? -0.27 : 0;
    var L = m.legs.L, R = m.legs.R;
    if (spec.sit) {
      L.hip.rotation.set(-Math.PI / 2, 0, 0); R.hip.rotation.set(-Math.PI / 2, 0, 0);
      L.knee.rotation.set(Math.PI / 2, 0, 0); R.knee.rotation.set(Math.PI / 2, 0, 0);
    } else if (spec.walk === 2) {
      L.hip.rotation.set(0.85, 0, 0); L.knee.rotation.set(1.1, 0, 0);
      R.hip.rotation.set(-0.6, 0, 0); R.knee.rotation.set(0.15, 0, 0);
    } else if (spec.walk === 1) {
      L.hip.rotation.set(0.4, 0, 0); L.knee.rotation.set(0.15, 0, 0);
      R.hip.rotation.set(-0.4, 0, 0); R.knee.rotation.set(0.12, 0, 0);
    } else {
      L.hip.rotation.set(0, 0, 0); R.hip.rotation.set(0, 0, 0);
      L.knee.rotation.set(0, 0, 0); R.knee.rotation.set(0, 0, 0);
    }
    m.torso.rotation.set(spec.lean || 0, 0, 0);

    var set = ARMS[spec.arms] || {};
    setArm(m.arms.L, set.L || ARMS_DEFAULT.L);
    setArm(m.arms.R, set.R || ARMS_DEFAULT.R);
    m.head.rotation.set(spec.headPitch || 0, spec.headYaw || 0, 0, 'YXZ');
  }

  /* يحوّل الوضعيات الموجودة (pose) إلى spec للمجسم */
  function poseSpecFor(st, k, opts) {
    opts = opts || {};
    var pz = st.pose || [];
    var has = function (x) { return pz.indexOf(x) !== -1; };
    var spec = {
      sit: has('Sitting') || has('Kneeling'),
      walk: has('Running') ? 2 : (has('Walking') ? 1 : 0),
      lean: has('Leaning') ? 0.14 : 0,
      arms: null,
      headYaw: opts.headYaw || 0,
      headPitch: opts.headPitch || 0
    };
    if (has('Arms Crossed')) spec.arms = 'Arms Crossed';
    else if (has('Hand on Face')) spec.arms = 'Hand on Face';
    else if (has('Hands in Pockets')) spec.arms = 'Hands in Pockets';
    else if (has('One Hand Raised')) spec.arms = 'One Hand Raised';
    else if (has('Holding Object') || opts.holding) spec.arms = 'Holding Object';
    else if (has('Both Hands Visible')) spec.arms = 'Both Hands Visible';
    else if (has('Dynamic Pose')) spec.arms = 'Dynamic Pose';
    else if (spec.walk) spec.arms = 'Walking';
    if (has('Looking Over Shoulder') && !opts.headYaw) spec.headYaw = 2.3;
    if (k && k.elderly) spec.lean += 0.16;
    return spec;
  }

  /* ==========================================================================
     المنتجات والأسطح
     ========================================================================== */
  function productShape(st) {
    var txt = String(st.mainIdea || '') + ' ' + String(st.subjectDetails || '');
    if (/عطر|perfume|bottle|زجاج|cologne|fragrance|serum|سيروم|زيت|oil/i.test(txt)) return 'bottle';
    if (/كوب|cup|mug|coffee|قهوة/i.test(txt)) return 'cup';
    if (/موبايل|هاتف|phone|smartphone|جوال/i.test(txt)) return 'phone';
    return 'box';
  }

  function buildProduct(shape) {
    var T = TH();
    var g = grp();
    var h = 0.2;
    if (shape === 'bottle') {
      var glass = new T.MeshPhysicalMaterial({ color: '#a9d6e6', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.82, clearcoat: 1, clearcoatRoughness: 0.05 });
      var pts = [[0.001, 0], [0.05, 0], [0.058, 0.01], [0.062, 0.04], [0.062, 0.14], [0.056, 0.16], [0.03, 0.17], [0.028, 0.19], [0.028, 0.2], [0.001, 0.2]];
      g.add(mesh(new T.LatheGeometry(pts.map(function (p) { return vec2(p[0], p[1]); }), 32), glass));
      g.add(mesh(cylG(0.0625, 0.0625, 0.06, 32), mat('#f3ece0', 0.5), 0, 0.085, 0));
      g.add(mesh(cylG(0.03, 0.032, 0.045, 16), mat('#d1a054', 0.28, 1), 0, 0.2225, 0));
      h = 0.245;
    } else if (shape === 'cup') {
      var cpts = [[0.001, 0], [0.042, 0], [0.05, 0.1], [0.046, 0.1], [0.038, 0.012], [0.001, 0.012]];
      g.add(mesh(new T.LatheGeometry(cpts.map(function (p) { return vec2(p[0], p[1]); }), 32), mat('#f4f1ec', 0.35)));
      var handle = mesh(torusG(0.025, 0.007, 8, 16, Math.PI), mat('#f4f1ec', 0.35), 0.06, 0.06, 0);
      handle.rotation.z = -Math.PI / 2;
      g.add(handle);
      h = 0.1;
    } else if (shape === 'phone') {
      g.add(mesh(boxG(0.075, 0.15, 0.008), mat('#15191c', 0.25, 0.3), 0, 0.075, 0));
      g.add(mesh(boxG(0.066, 0.13, 0.001), new T.MeshBasicMaterial({ color: '#2c5d78' }), 0, 0.075, 0.0045));
      h = 0.15;
    } else {
      g.add(mesh(boxG(0.16, 0.2, 0.1), mat('#e9dfd0', 0.8), 0, 0.1, 0));
      g.add(mesh(boxG(0.12, 0.08, 0.002), mat('#c8873f', 0.6), 0, 0.12, 0.051));
      h = 0.2;
    }
    return { group: g, height: h };
  }

  /* سطح العرض: منصة أو طاولة. يعيد المجموعة وارتفاع السطح الذي يوضع عليه المنتج */
  function buildSurface(placement, surface) {
    var T = TH();
    var g = grp();
    var col = SURFACE[surface] || SURFACE.Marble;
    var top = 0;
    if (placement === 'On Pedestal') {
      g.add(mesh(cylG(0.09, 0.1, 0.12, 24), mat(col, 0.5)));
      top = 0.12;
    } else if (placement === 'Floating') {
      top = 0;
    } else {
      g.add(mesh(boxG(0.7, 0.03, 0.4), mat(col, 0.5), 0, 0.5, 0));
      [[-0.3, -0.16], [0.3, -0.16], [-0.3, 0.16], [0.3, 0.16]].forEach(function (q) {
        g.add(mesh(boxG(0.03, 0.5, 0.03), mat('#3a2c24', 0.6), q[0], 0.25, q[1]));
      });
      top = 0.515;
    }
    return { group: g, top: top };
  }

  /* ==========================================================================
     العناصر في المشهد (مواجهة للشخص، مبنية كمجسمات حقيقية)
     ========================================================================== */
  function buildObject(key, st, idx) {
    var T = TH();
    var g = grp();
    var scr = function (w, h, c) { return mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c || '#2a5f7b' })); };
    switch (key) {
      case 'Television':
        g.add(mesh(boxG(0.9, 0.52, 0.05), mat('#101214', 0.4), 0, 1.0, 0));
        g.add(scr(0.84, 0.46, '#2a5f7b').translateZ(0.027).translateY(1.0));
        break;
      case 'Monitor':
        g.add(mesh(boxG(0.6, 0.03, 0.3), mat('#8a6143', 0.5), 0, 0.72, 0));
        g.add(mesh(cylG(0.02, 0.02, 0.2, 10), mat('#3a4348', 0.4), 0, 0.82, 0));
        g.add(mesh(boxG(0.5, 0.3, 0.03), mat('#101214', 0.4), 0, 0.97, 0));
        g.add(scr(0.46, 0.26, '#2a5f7b').translateZ(0.017).translateY(0.97));
        break;
      case 'Laptop':
        g.add(mesh(boxG(0.6, 0.03, 0.3), mat('#8a6143', 0.5), 0, 0.72, 0));
        g.add(mesh(boxG(0.34, 0.02, 0.24), mat('#9aa2a8', 0.4), 0, 0.745, 0.02));
        var lid = mesh(boxG(0.34, 0.23, 0.012), mat('#9aa2a8', 0.4), 0, 0.87, -0.1);
        lid.rotation.x = -0.25;
        g.add(lid);
        var ls = scr(0.31, 0.19, '#2a5f7b');
        ls.position.set(0, 0.87, -0.094); ls.rotation.x = -0.25;
        g.add(ls);
        break;
      case 'Phone':
        g.add(mesh(boxG(0.08, 0.16, 0.01), mat('#15191c', 0.25, 0.3), 0, 0.82, 0));
        g.add(scr(0.07, 0.14, '#2c5d78').translateZ(0.0055).translateY(0.82));
        break;
      case 'Window':
        g.add(mesh(boxG(0.9, 1.1, 0.06), mat('#8a6143', 0.5), 0, 1.2, 0));
        g.add(scr(0.8, 1.0, '#bcd9e8').translateZ(0.031).translateY(1.2));
        break;
      case 'Another Person': {
        var other = character(st, { idx: 1 });
        poseModel(other, poseSpecFor(st, other.k, {}));
        g.add(other.root);
        break;
      }
      case 'Product': {
        var pr = buildProduct(productShape(st));
        g.add(pr.group);
        break;
      }
      default:
        g.add(mesh(sphere(0.15, 16, 12), mat('#c8873f', 0.6), 0, 0.4, 0));
    }
    return g;
  }

  /* موقع الشيء بالنسبة للشخص: angleDeg (0 = أمامه، +90 = يمينه، 180 = خلفه) والمسافة */
  function placeObject(group, angleDeg, dist) {
    var a = angleDeg * DEG;
    group.position.set(Math.sin(a) * dist, 0, Math.cos(a) * dist);
    group.lookAt(0, group.position.y, 0);
    return group;
  }

  PS.Models = {
    character: character,
    poseSpecFor: poseSpecFor,
    poseModel: poseModel,
    productShape: productShape,
    buildProduct: buildProduct,
    buildSurface: buildSurface,
    buildObject: buildObject,
    placeObject: placeObject,
    kindOf: kindOf,
    profileOf: profileOf
  };
})();
