/* ==========================================================================
   EMG — scene3d.js
   محرك المعاينة ثلاثية الأبعاد (WebGL عبر three.js الموجودة داخل vendor/).
   نفس اللوحة والاختيارات الموجودة؛ هذا الملف يحوّل الاختيارات إلى مشهد حقيقي:

   • الكاميرا: موضع واتجاه حقيقيان (زاوية)، بعد بؤري حقيقي (عدسة)، إطار حسب
     نوع اللقطة (نسبة من ارتفاع الموضوع)، وإزاحة العدسة لموضع الموضوع.
   • الإضاءة: مصدر اتجاهي حقيقي (اتجاه/ارتفاع/نعومة/شدة/لون) + مصدر ثانوي
     مستقل + إضاءة تعبئة. الظلال من shadow map (وليست رسومات).
   • العمق: BokehPass حقيقي حسب التركيز والفتحة.
   • عرض الضوء والظل: post-process على الرندر نفسه (أحمر=مضاء، أخضر=ظل).
   • المنتج والشخص والعناصر: مجسمات من models3d.js.

   قاعدة: هذه الإعدادات للمعاينة فقط؛ لا تدخل البرومبت.
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});
  var DEG = Math.PI / 180;
  function TH() { return window.THREE; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function wrap(a) { return ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; }
  function hex(c) { c = String(c || '').trim(); if (!/^#?[0-9a-f]{6}$/i.test(c)) return null; return c.charAt(0) === '#' ? c : '#' + c; }
  function mixHex(a, b, t) {
    var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
    var r = Math.round(((A >> 16) & 255) * (1 - t) + ((B >> 16) & 255) * t);
    var g = Math.round(((A >> 8) & 255) * (1 - t) + ((B >> 8) & 255) * t);
    var bl = Math.round((A & 255) * (1 - t) + (B & 255) * t);
    return '#' + [r, g, bl].map(function (v) { var s = v.toString(16); return s.length < 2 ? '0' + s : s; }).join('');
  }
  function darkenHex(c, t) { return mixHex(c, '#000000', t); }

  /* ---------------- الكاميرا: زوايا حقيقية (الارتفاع بوحدة ارتفاع الموضوع) ---------------- */
  var VIEW = {
    'Eye Level': { yaw: 0, camH: 0.9, dist: 1 },
    'Front Angle': { yaw: 0, camH: 0.8, dist: 1 },
    '3/4 Angle': { yaw: 45, camH: 0.9, dist: 1 },
    'Side Angle': { yaw: 90, camH: 0.9, dist: 1 },
    'Back Angle': { yaw: 180, camH: 0.9, dist: 1 },
    'Low Angle': { yaw: 0, camH: 0.32, dist: 1.02 },
    'High Angle': { yaw: 0, camH: 1.6, dist: 1.05 },
    "Bird's Eye View": { yaw: 0, camH: 3.2, dist: 1.25 },
    "Worm's Eye View": { yaw: 0, camH: 0.05, dist: 0.8 },
    'Top Down': { yaw: 0, camH: 5, dist: 1.4, top: true },
    'POV': { yaw: 0, camH: 0.9, dist: 1, pov: true },
    'Over-the-Shoulder': { yaw: 150, camH: 1.45, dist: 0.9, shoulder: true },
    'Dutch Angle': { yaw: 0, camH: 0.9, dist: 1, roll: 14 * DEG },
    'Long Shot': { yaw: 0, camH: 0.9, dist: 2.2 },
    'Framed Shot': { yaw: 0, camH: 0.9, dist: 1, framed: true },
    'Orbit': { yaw: 60, camH: 1.25, dist: 1.1 }
  };

  /* ---------------- اللقطة: نطاق الارتفاع المرئي كنسبة من ارتفاع الهدف ---------------- */
  var FRAME = {
    xclose: [0.8, 1.02], close: [0.68, 1.02], waist: [0.48, 1.02],
    three: [0.28, 1.02], full: [-0.02, 1.03], wide: [-0.5, 1.5]
  };
  var FRAME_PRODUCT = {
    xclose: [0.2, 0.8], close: [0.08, 0.92], waist: [-0.1, 1.1],
    three: [-0.45, 1.45], full: [-0.9, 1.9], wide: [-1.4, 2.4]
  };
  var BODY_KEY = { 'Full Body': 'full', '3/4 Body': 'three', 'Half Body': 'waist', 'Waist Up': 'waist', 'Portrait': 'close', 'Close-up': 'close', 'Extreme Close-up': 'xclose', 'Wide Shot': 'wide' };
  var SHOT_KEY = { 'Extreme Close-up': 'xclose', 'Close-up': 'close', 'Medium Shot': 'waist', 'Medium Full Shot': 'three', 'Full Shot': 'full', 'Wide Shot': 'wide' };
  var DIST_MUL = { 'Very Close': 0.75, 'Close': 0.9, 'Medium': 1.15, 'Far': 1.6 };
  var SENSOR_H = 24;      /* مم: ارتفاع فورمات 35mm */
  var NEUTRAL_LENS = 50;

  /* ---------------- الإضاءة: مصدر أساسي لكل نوع ---------------- */
  var KEY = {
    'Flat Light': { flat: true },
    'Loop Light': { az: 35, el: 35, soft: 0.5, k: 1 },
    'Rembrandt Light': { az: 50, el: 42, soft: 0.35, k: 1.05 },
    'Split Light': { az: 90, el: 14, soft: 0.15, k: 1.15 },
    'Rim Light': { az: 180, el: 24, soft: 0.25, k: 1.0 },
    'Silhouette Lighting': { az: 180, el: 8, soft: 0.2, k: 2.4, silhouette: true },
    'Butterfly Light': { az: 0, el: 62, soft: 0.4, k: 1.1 },
    'Soft Light': { az: 30, el: 35, soft: 0.95, k: 0.85 },
    'Hard Light': { az: 30, el: 35, soft: 0.05, k: 1.4 },
    'Strong Directional Light': { az: 40, el: 30, soft: 0.1, k: 1.45 },
    'Dramatic Light': { az: 90, el: 20, soft: 0.12, k: 1.5 },
    'Cinematic Light': { az: 45, el: 25, soft: 0.45, k: 1.2 },
    'Backlight': { az: 180, el: 18, soft: 0.3, k: 1.5 },
    'Side Light': { az: 90, el: 10, soft: 0.25, k: 1.2 },
    'Front Light': { az: 0, el: 18, soft: 0.6, k: 1.1 },
    'Top Light': { az: 0, el: 82, soft: 0.3, k: 1.3 },
    'Golden Hour': { az: 70, el: 12, soft: 0.5, k: 1.3, color: '#ffb36b' },
    'Neon Light': { neon: true },
    'Studio Light': { az: 25, el: 35, soft: 0.85, k: 1.1 },
    'Natural Daylight': { az: 30, el: 55, soft: 0.5, k: 1.1, sky: '#cfe3ff' }
  };
  var DIRS = { 'Front': [0, 15], 'Left': [-70, 30], 'Right': [70, 30], 'Top': [0, 80], 'Back': [180, 25], 'Top Left': [-40, 55], 'Top Right': [40, 55], 'Side': [-90, 15] };
  var INTENS = { 'Soft': 0.5, 'Medium': 0.85, 'Strong': 1.2, 'Very Strong': 1.6 };
  var FILL = { 'Soft': 0.95, 'Medium': 0.7, 'Strong': 0.45, 'Dramatic': 0.25 };
  var SHADOW_DARK = { 'Soft': 0.22, 'Medium': 0.34, 'Strong': 0.46, 'Dramatic': 0.6 };
  var TEMP = { 'Warm': '#ffb36b', 'Neutral': '#fff4e6', 'Cool': '#bcd9ff', 'Mixed': '#ffd9a8' };
  var TINT = { 'Red': '#ff3b3b', 'Blue': '#3b7bff', 'Green': '#3bd671', 'Pink': '#ff6fd8', 'Yellow': '#ffe066', 'Warm': '#ffb36b', 'Cool': '#9fd3ff' };
  var SECONDARY = {
    'Rim Light': { az: 150, el: 22, k: 1.3, color: '#fff2dc' },
    'Backlight': { az: 180, el: 15, k: 1.5, color: '#ffffff' },
    'Fill Light': { az: -40, el: 10, k: 0.6, color: '#cfe0ff' },
    'Hair Light': { az: 180, el: 75, k: 0.9, color: '#ffffff' },
    'Practical Lights': { point: [1.1, 0.5, 0.9], k: 1.2, color: '#ffb36b' }
  };

  /* ---------------- الخلفية والعمق ---------------- */
  var BG = {
    'Clean Studio': '#e8e6e1', 'Luxury Interior': '#d8c8b6', 'Modern Office': '#dfe3e6', 'Urban Street': '#3d434b',
    'City': '#2f3640', 'Nature': '#cfe0c8', 'Forest': '#4f6b4a', 'Beach': '#e6d7b8', 'Desert': '#e9cfa8',
    'Industrial': '#6b6f75', 'Minimal': '#eeeeee', 'Dark Background': '#1e1e24', 'White Background': '#ffffff',
    'Black Background': '#0b0b0c', 'Gradient Background': '#c9ccd1', 'Luxury Hotel': '#2f2a26', 'Restaurant': '#5a3f30',
    'Home Interior': '#e0cdb5', 'Shopping Area': '#d8d0c8', 'Architecture': '#bdbdbd', 'Custom': '#e8e6e1'
  };
  var DOF = { 'Deep Focus': 0, 'Natural Depth': 0.3, 'Moderate Depth': 0.6, 'Shallow Depth of Field': 1.0, 'Extreme Bokeh': 1.6, 'Cinematic Bokeh': 1.3 };
  var DIST_SPATIAL = { 'Arm Length': 0.6, 'Close': 0.9, 'Medium': 1.4, 'Far': 2.2 };
  var DEF_DIST = { 'Television': 1.9, 'Window': 1.8, 'Monitor': 0.6, 'Laptop': 0.6, 'Phone': 0.6, 'Another Person': 0.9, 'Product': 0.9, 'Custom': 1.0 };

  var DIAG_SHADER = {
    uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.7 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float uStrength; varying vec2 vUv;' +
      'void main(){ vec4 c = texture2D(tDiffuse, vUv);' +
      ' float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));' +
      ' float t = smoothstep(0.12, 0.6, l);' +
      ' vec3 g = vec3(0.10, 0.80, 0.32); vec3 r = vec3(1.0, 0.22, 0.18);' +
      ' vec3 col = mix(g, r, t); vec3 gray = vec3(clamp(l, 0.0, 1.0));' +
      ' gl_FragColor = vec4(mix(gray, col, uStrength), 1.0); }'
  };

  /* ==========================================================================
     الحالة العامة للمحرك (renderer واحد يُعاد استخدامه)
     ========================================================================== */
  var st3 = { renderer: null, composer: null, canvas: null, out: null, diag: null,
    matDiag: null, matShadow: null, tex: null, yawOff: 0, pitchOff: 0, lastAngle: '',
    lastEl: null, lastArgs: null, lastW: 0, lastH: 0, raf: 0, sizeKey: '' };

  function available() { return !!(window.THREE && window.THREE.WebGLRenderer && PS.Models); }

  /* ---------------- مساعدات التوجيه ---------------- */
  function dirVec(azDeg, elDeg) {
    var T = TH(), a = azDeg * DEG, e = elDeg * DEG;
    return new T.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  }
  function frameKeyOf(st) {
    return BODY_KEY[st.bodyFraming] || SHOT_KEY[st.shotType] || 'waist';
  }
  function lensOf(st) {
    if (st.lens === 'Macro') return 100;
    var n = parseFloat(st.lens);
    return n > 0 ? n : NEUTRAL_LENS;
  }
  function bodyYawFor(st, O, sp, camYaw) {
    var facing = st.spatialBodyFacing || 'Auto';
    var P = O && O.P != null ? O.P * DEG : null;
    if (facing === 'Toward Object' && P != null) return P;
    if (facing === 'Toward Camera') return camYaw;
    if (facing === 'Away From Camera') return camYaw + Math.PI;
    if (facing === 'Three Quarter') return camYaw + Math.PI / 4;
    if (sp && sp.action && P != null && O.key !== 'Product') return P;
    return 0;
  }
  function headAimFor(st, O, sp, bodyYaw, camYaw) {
    var g = st.gazeDirection || 'Off';
    if (sp && sp.gazeOwned && O && O.P != null && O.key !== 'Product') {
      var rel = wrap(O.P * DEG - bodyYaw);
      rel = O.behind ? clamp(rel, -2.6, 2.6) : clamp(rel, -1.2, 1.2);
      var down = (O.key === 'Laptop' || O.key === 'Monitor' || O.key === 'Phone') ? 0.35 : 0;
      return { yaw: rel, pitch: down };
    }
    if (g === 'Right') return { yaw: 0.5, pitch: 0 };
    if (g === 'Left') return { yaw: -0.5, pitch: 0 };
    if (g === 'Up') return { yaw: 0, pitch: -0.3 };
    if (g === 'Down') return { yaw: 0, pitch: 0.3 };
    if (g === 'Over Shoulder') return { yaw: 2.4, pitch: 0 };
    if (g === 'Away') return { yaw: 0.35, pitch: -0.05 };
    if (g === 'At Camera') return { yaw: clamp(wrap(camYaw - bodyYaw), -1, 1), pitch: 0 };
    return { yaw: 0, pitch: 0 };
  }
  function distanceFor(st, O) {
    return DIST_SPATIAL[st.spatialDistance] || DEF_DIST[O.key] || 1.0;
  }

  /* ==========================================================================
     computeCamera: الكاميرا الحقيقية
     p: { target, boxH, boxW, frame:[b,t], lens, distMul, angleKey, yawOff, pitchOff,
          subjX, subjY, aspect, W, H, negSpace, eye, eyeFwd }
     ========================================================================== */
  function computeCamera(p) {
    var T = TH();
    var V = VIEW[p.angleKey] || VIEW['Eye Level'];
    var lens = p.lens || NEUTRAL_LENS;
    var fov50 = 2 * Math.atan((SENSOR_H / 2) / NEUTRAL_LENS);
    var frameH = (p.frame[1] - p.frame[0]) * p.boxH * 1.12;
    var distH = (frameH / 2) / Math.tan(fov50 / 2);
    var distW = (p.boxW * 1.3 / 2) / (Math.tan(fov50 / 2) * p.aspect);
    /* عرض الموضوع يحدد البعد فقط عندما تشمل اللقطة الجسم كاملاً؛ اللقطات القريبة تُحسب بالارتفاع */
    var dist50 = p.frame[0] <= 0.05 ? Math.max(distH, distW, 0.05) : Math.max(distH, 0.05);
    var dist = dist50 * (lens / NEUTRAL_LENS) * (p.distMul || 1) * (V.dist || 1) * (p.negSpace ? 1.2 : 1);

    var target = p.target.clone();
    var camPos, up = new T.Vector3(0, 1, 0);
    var look = target;
    if (V.pov && p.eye) {
      camPos = p.eye.clone().add(p.eyeFwd.clone().multiplyScalar(0.14));
      look = p.eye.clone().add(p.eyeFwd.clone().multiplyScalar(2));
    } else if (V.top) {
      camPos = target.clone().add(new T.Vector3(0, dist, 0.0001));
      up = new T.Vector3(0, 0, -1);
    } else {
      var camY = (p.baseY || 0) + V.camH * p.boxH;
      var pitch = Math.asin(clamp((camY - target.y) / dist, -0.98, 0.98)) + (p.pitchOff || 0);
      pitch = clamp(pitch, -1.4, 1.4);
      var yaw = (V.yaw || 0) * DEG + (p.yawOff || 0);
      var hd = dist * Math.cos(pitch);
      camPos = new T.Vector3(target.x + Math.sin(yaw) * hd, target.y + dist * Math.sin(pitch), target.z + Math.cos(yaw) * hd);
    }

    var cam = new T.PerspectiveCamera(2 * Math.atan((SENSOR_H / 2) / lens) / DEG, p.aspect, 0.05, 80);
    cam.position.copy(camPos);
    cam.up.copy(up);
    cam.lookAt(look);
    if (V.roll) cam.rotateZ(V.roll);
    /* إزاحة العدسة لموضع الموضوع داخل الكادر (بدون تغيير المنظور) */
    var sx = p.subjX != null ? p.subjX : 0.5, sy = p.subjY != null ? p.subjY : 0.5;
    if (sx !== 0.5 || sy !== 0.5) {
      cam.setViewOffset(p.W, p.H, (0.5 - sx) * p.W, (0.5 - sy) * p.H, p.W, p.H);
    }
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    return { camera: cam, dist: dist, target: look, roll: V.roll || 0, V: V };
  }

  /* ==========================================================================
     الإضاءة الحقيقية: أساسية (ظلال) + ثانوية + تعبئة
     ========================================================================== */
  function addLights(scene, st, target, radius) {
    var T = TH();
    var K = KEY[st.lightingType] || KEY['Soft Light'];
    var inten = INTENS[st.lightIntensity] || 0.85;
    var fillAmt = FILL[st.shadowStrength] != null ? FILL[st.shadowStrength] : 0.7;
    if (K.flat) fillAmt = 1.4;
    if (K.silhouette) fillAmt = 0.05;
    var hemi = new T.HemisphereLight(K.sky || '#e9eef5', '#3a3028', 0.25 + 0.9 * fillAmt);
    scene.add(hemi);

    var created = { key: null };
    if (K.neon) {
      var p1 = new T.PointLight('#ff3fd2', 6 * inten, radius * 6, 1.5);
      p1.position.set(-radius * 1.5, radius * 0.9, radius * 1.2);
      var p2 = new T.PointLight('#3fe6ff', 6 * inten, radius * 6, 1.5);
      p2.position.set(radius * 1.5, radius * 0.9, radius * 1.2);
      scene.add(p1, p2);
    } else if (!K.flat) {
      var az = K.az || 0, el = K.el || 30;
      var dir = DIRS[st.lightDirection];
      if (dir) { az = dir[0]; el = dir[1]; }
      var keyColor = new T.Color(hex(TINT[st.lightColor]) || K.color || TEMP[st.colorTemp] || '#fff4e6');
      var key = new T.DirectionalLight(keyColor, 2.6 * (K.k || 1) * inten);
      key.position.copy(target).add(dirVec(az, el).multiplyScalar(radius * 3));
      key.target.position.copy(target);
      scene.add(key, key.target);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      var sc = key.shadow.camera;
      sc.left = -radius * 1.6; sc.right = radius * 1.6; sc.top = radius * 1.6; sc.bottom = -radius * 1.6;
      sc.near = 0.1; sc.far = radius * 8; sc.updateProjectionMatrix();
      key.shadow.bias = -0.0005;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 1 + (K.soft || 0.3) * 10;
      created.key = key;
    }

    var S = SECONDARY[st.secondaryLight];
    if (S) {
      if (S.point) {
        var pl = new T.PointLight(S.color, 3 * S.k, radius * 8, 1.4);
        pl.position.set(S.point[0] * radius, S.point[1] * radius, S.point[2] * radius);
        scene.add(pl);
      } else {
        var sl = new T.DirectionalLight(new T.Color(S.color), 1.6 * S.k);
        sl.position.copy(target).add(dirVec(S.az, S.el).multiplyScalar(radius * 3));
        sl.target.position.copy(target);
        scene.add(sl, sl.target);
      }
    }
    return created;
  }

  /* ---------------- الأرضية وظلال التلامس والخلفية ---------------- */
  /* تدرج شعاعي للظل تحت الأقدام، محسوب بالكود (بدون canvas) ليعمل في أي بيئة */
  function radialTexture() {
    if (st3.tex) return st3.tex;
    var T = TH(), N = 64, data = new Uint8Array(N * N * 4);
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var dx = (x + 0.5) / N * 2 - 1, dy = (y + 0.5) / N * 2 - 1;
        var r = Math.sqrt(dx * dx + dy * dy);
        var a = r >= 1 ? 0 : (r < 0.5 ? 0.92 - 0.3 * (r / 0.5) : 0.62 * (1 - (r - 0.5) / 0.5));
        var i = (y * N + x) * 4;
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = Math.round(clamp(a, 0, 1) * 255);
      }
    }
    var tex = new T.DataTexture(data, N, N, T.RGBAFormat);
    tex.needsUpdate = true;
    st3.tex = tex;
    return tex;
  }
  function contactShadow(scene, x, z, size, strength, list) {
    var T = TH();
    var tex = radialTexture();
    var m = new T.Mesh(new T.PlaneGeometry(size, size), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: strength, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.002, z);
    scene.add(m);
    list.push(m);
  }
  function addEnvironment(scene, st, bgHex, wide, radius, contacts, feet) {
    var T = TH();
    var dark = SHADOW_DARK[st.shadowStrength] || 0.34;
    var floor;
    if (wide) {
      floor = new T.Mesh(new T.PlaneGeometry(60, 60), new T.MeshStandardMaterial({ color: darkenHex(bgHex, 0.25), roughness: 0.9 }));
      var wall = new T.Mesh(new T.PlaneGeometry(60, 14), new T.MeshStandardMaterial({ color: bgHex, roughness: 0.95 }));
      wall.position.set(0, 7, -radius * 1.8);
      wall.receiveShadow = true;
      scene.add(wall);
    } else {
      floor = new T.Mesh(new T.PlaneGeometry(60, 60), new T.ShadowMaterial({ opacity: dark + 0.1 }));
    }
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    feet.forEach(function (f) { contactShadow(scene, f.x, f.z, f.size, dark + 0.2, contacts); });
  }

  /* ==========================================================================
     بناء المشهد كاملاً من الاختيارات
     ========================================================================== */
  function buildAll(args, W, H) {
    var T = TH(), M = PS.Models;
    var st = args.st, mode = args.mode || 'person';
    var O = args.O || null, sp = args.sp || {};
    var camKey = st.cameraAngle || 'Eye Level';
    var V = VIEW[camKey] || VIEW['Eye Level'];
    var yawOff = args.yawOff || 0, pitchOff = args.pitchOff || 0;
    var camYaw = (V.pov || V.top) ? 0 : ((V.yaw || 0) * DEG + yawOff);
    var hasPerson = mode !== 'product';
    var holding = mode === 'both' && st.productPlacement === 'Hand-held';
    var kind = M.kindOf(st);
    var shape = M.productShape(st);
    var frameKey = frameKeyOf(st);
    var wide = frameKey === 'wide';

    var scene = new T.Scene();
    var bgHex = (args.neutral || mode === 'diag' || mode === 'shadow') ? '#101214' : bgColorOf(st);
    scene.background = new T.Color(bgHex);
    var contacts = [], feet = [];
    var group = [];   /* كل المجموعات الخاصة بالموضوع (للإطار وحساب الحجم) */
    var model = null, product = null, props = [];

    if (hasPerson) {
      model = M.character(st, { idx: 0 });
      var bodyYaw = bodyYawFor(st, O, sp, camYaw);
      var aim = headAimFor(st, O, sp, bodyYaw, camYaw);
      model.root.rotation.set(0, bodyYaw, 0);
      M.poseModel(model, M.poseSpecFor(st, kind, { holding: holding, headYaw: aim.yaw, headPitch: aim.pitch }));
      scene.add(model.root);
      model.root.updateMatrixWorld(true);
      group.push(model.root);
      feet.push({ x: 0, z: 0, size: 0.75 });
    }

    /* ----- المنتج ----- */
    if (mode === 'product') {
      var surf = M.buildSurface(st.productPlacement, st.productSurface);
      product = M.buildProduct(shape);
      var pg = new T.Group();
      pg.add(surf.group);
      product.group.position.y = surf.top;
      if (st.productPlacement === 'Flat Lay') {
        product.group.rotation.z = Math.PI / 2;
        product.group.position.y = surf.top + 0.06;
      }
      if (st.productPlacement === 'Floating') product.group.position.y = 0.5;
      pg.add(product.group);
      scene.add(pg);
      props.push(pg);
      feet.push({ x: 0, z: 0, size: 0.5 });
    } else if (mode === 'both') {
      if (holding && model) {
        var hw = new T.Vector3();
        model.arms.R.hand.getWorldPosition(hw);
        product = M.buildProduct(shape);
        product.group.position.set(hw.x, hw.y - product.height * 0.5, hw.z);
        product.group.rotation.y = model.root.rotation.y;
        scene.add(product.group);
        props.push(product.group);
      } else {
        var side = 0.5, sa = 40 * DEG;
        var surf2 = M.buildSurface('', st.productSurface);
        surf2.group.position.set(Math.sin(sa) * 0.5, 0, Math.cos(sa) * 0.5);
        product = M.buildProduct(shape);
        product.group.position.set(surf2.group.position.x, surf2.top, surf2.group.position.z);
        var tg = new T.Group();
        tg.add(surf2.group); tg.add(product.group);
        scene.add(tg);
        props.push(tg);
        feet.push({ x: Math.sin(sa) * side, z: Math.cos(sa) * side, size: 0.4 });
      }
    }

    /* ----- العنصر في المشهد (تلفزيون، شاشة، لابتوب...) ----- */
    if (O && hasPerson && !(mode === 'both' && O.key === 'Product')) {
      var og = M.buildObject(O.key, st, 0);
      M.placeObject(og, O.P || 0, distanceFor(st, O));
      scene.add(og);
      props.push(og);
    }

    /* ----- الإطار: الموضوع الذي تُحسب عليه اللقطة ----- */
    var personBox = model ? new T.Box3().setFromObject(model.root) : null;
    var propBox = product ? new T.Box3().setFromObject(product.group) : null;
    var unionBox = new T.Box3();
    group.concat(props).forEach(function (o) { unionBox.union(new T.Box3().setFromObject(o)); });
    var focusBox, frame;
    if (mode === 'product') { focusBox = propBox; frame = FRAME_PRODUCT[frameKey] || FRAME_PRODUCT.waist; }
    else if (mode === 'both' && (frameKey === 'full' || frameKey === 'wide' || frameKey === 'three')) { focusBox = unionBox; frame = FRAME[frameKey]; }
    else { focusBox = personBox; frame = FRAME[frameKey] || FRAME.waist; }
    if (!focusBox || focusBox.isEmpty()) focusBox = unionBox.isEmpty() ? new T.Box3(new T.Vector3(-0.3, 0, -0.3), new T.Vector3(0.3, 1, 0.3)) : unionBox;

    var bh = Math.max(0.01, focusBox.max.y - focusBox.min.y), bw = Math.max(0.01, focusBox.max.x - focusBox.min.x);
    var cx = (focusBox.min.x + focusBox.max.x) / 2, cz = (focusBox.min.z + focusBox.max.z) / 2;
    var cy = focusBox.min.y + ((frame[0] + frame[1]) / 2) * bh;
    var target = new T.Vector3(cx, cy, cz);

    /* موضع الموضوع داخل الكادر (إزاحة عدسة) */
    var subjX = 0.5, subjY = 0.5;
    if (st.subjectPosition === 'Left') subjX = 0.34;
    else if (st.subjectPosition === 'Right') subjX = 0.66;
    else if (st.subjectPosition === 'Upper Third') subjY = 0.36;
    else if (st.subjectPosition === 'Lower Third') subjY = 0.66;
    else if (st.composition === 'Rule of Thirds') subjX = 0.36;

    /* نقطة العين للـ POV */
    var eye = null, eyeFwd = null;
    if (V.pov && model) {
      eye = new T.Vector3();
      eyeFwd = new T.Vector3();
      model.head.getWorldPosition(eye);
      model.head.getWorldDirection(eyeFwd);
    }

    var cam = computeCamera({
      target: target, boxH: bh, boxW: bw, frame: frame, lens: lensOf(st),
      distMul: DIST_MUL[st.cameraDistance] || 1, angleKey: camKey, yawOff: yawOff, pitchOff: pitchOff,
      baseY: focusBox.min.y,
      subjX: subjX, subjY: subjY, aspect: W / H, W: W, H: H, negSpace: st.composition === 'Negative Space',
      eye: eye, eyeFwd: eyeFwd
    });

    /* الإضاءة والظلال */
    var radius = Math.max(0.35, Math.max(bw, bh) * 0.7);
    addLights(scene, st, target, radius);
    addEnvironment(scene, st, bgHex, wide, radius, contacts, feet);

    /* إطار الباب (Framed Shot) وكتف المصور (Over-the-Shoulder): أجسام حقيقية بين الكاميرا والموضوع */
    if (V.framed) addDoorFrame(scene, cam);
    if (V.shoulder) addShoulder(scene, cam);

    /* عمق الميدان الحقيقي */
    var dk = DOF[st.dof] || 0;
    var dof = { focus: cam.dist, aperture: dk > 0 ? 0.02 * dk * (lensOf(st) / NEUTRAL_LENS) : 0 };
    return { scene: scene, camera: cam.camera, dof: dof, contacts: contacts, bgHex: bgHex, person: model ? model.root : null, head: model ? model.head : null, product: product ? product.group : null, objects: props };
  }

  function addDoorFrame(scene, cam) {
    var T = TH();
    var fwd = new T.Vector3();
    var dF = cam.dist * 0.45;
    cam.camera.getWorldDirection(fwd);
    var fov = cam.camera.fov * DEG;
    var vh = 2 * dF * Math.tan(fov / 2), vw = vh * cam.camera.aspect;
    var g = new T.Group();
    var mt = new T.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.7 });
    var t = 0.12;
    var inner = { w: vw * 0.7, h: vh * 0.7 };
    var mk = function (w, h, x, y) { var m = new T.Mesh(new T.BoxGeometry(w, h, 0.05), mt); m.position.set(x, y, 0); m.castShadow = true; g.add(m); };
    mk(vw + t, t, 0, inner.h / 2 + t / 2);
    mk(vw + t, t, 0, -inner.h / 2 - t / 2);
    mk(t, vh + t, inner.w / 2 + t / 2, 0);
    mk(t, vh + t, -inner.w / 2 - t / 2, 0);
    g.position.copy(cam.camera.position).add(fwd.clone().multiplyScalar(dF));
    g.quaternion.copy(cam.camera.quaternion);
    scene.add(g);
  }
  function addShoulder(scene, cam) {
    var T = TH();
    var m = new T.Mesh(new T.SphereGeometry(1, 20, 14), new T.MeshStandardMaterial({ color: '#1e2226', roughness: 0.9 }));
    var fwd = new T.Vector3();
    cam.camera.getWorldDirection(fwd);
    var right = new T.Vector3().crossVectors(fwd, cam.camera.up).normalize();
    m.scale.set(0.32, 0.26, 0.4);
    m.position.copy(cam.camera.position).add(fwd.clone().multiplyScalar(0.25)).add(right.clone().multiplyScalar(-0.2)).add(cam.camera.up.clone().multiplyScalar(-0.2));
    m.castShadow = true;
    scene.add(m);
  }

  function bgColorOf(st) {
    var c = BG[st.background] || BG['Clean Studio'];
    if (st.background === 'Gradient Background' && hex(st.gradientColor1) && hex(st.gradientColor2)) {
      c = mixHex(hex(st.gradientColor1), hex(st.gradientColor2), 0.5);
    }
    return c;
  }

  /* ==========================================================================
     الرسم: renderer واحد، وعرض حسب الوضع
     ========================================================================== */
  function ensureRenderer(pr) {
    var T = TH();
    if (st3.renderer) return;
    st3.canvas = document.createElement('canvas');
    st3.canvas.className = 'pv3d-canvas';
    st3.renderer = new T.WebGLRenderer({ canvas: st3.canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    st3.renderer.setPixelRatio(pr);
    st3.renderer.shadowMap.enabled = true;
    st3.renderer.shadowMap.type = T.PCFShadowMap;
    st3.composer = new T.EffectComposer(st3.renderer);
    st3.out = new T.OutputPass();
    st3.diag = new T.ShaderPass(DIAG_SHADER);
    st3.matDiag = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    st3.matShadow = new T.MeshStandardMaterial({ color: '#b9bcc0', roughness: 0.9 });
  }

  function renderScene(args, W, H) {
    var T = TH();
    var pr = Math.min(window.devicePixelRatio || 1, 1.5);
    ensureRenderer(pr);
    var sizeKey = W + 'x' + H + 'x' + pr;
    if (st3.sizeKey !== sizeKey) {
      st3.renderer.setPixelRatio(pr);
      st3.renderer.setSize(W, H, false);
      st3.composer.setPixelRatio(pr);
      st3.composer.setSize(W, H);
      st3.sizeKey = sizeKey;
    }
    var b = buildAll(args, W, H);
    var prefs = args.prefs || {};
    var mode = prefs.mode || 'natural';
    var show = mode === 'natural';
    b.contacts.forEach(function (m) { m.visible = show; });

    var rp = new T.RenderPass(b.scene, b.camera);
    var passes = [rp];
    var bokeh = null;
    if (mode === 'diag') rp.overrideMaterial = st3.matDiag;
    if (mode === 'shadow') rp.overrideMaterial = st3.matShadow;
    if (mode === 'natural' && b.dof.aperture > 0) {
      bokeh = new T.BokehPass(b.scene, b.camera, { focus: b.dof.focus, aperture: b.dof.aperture, maxblur: 0.012 });
      passes.push(bokeh);
    }
    if (mode === 'diag') {
      st3.diag.uniforms.uStrength.value = clamp(prefs.strength || 0.7, 0.15, 1);
      passes.push(st3.diag);
    }
    passes.push(st3.out);
    st3.composer.passes = passes;
    st3.composer.render();
    if (bokeh && bokeh.dispose) bokeh.dispose();
    return b;
  }

  /* ==========================================================================
     الربط مع اللوحة: mount / تفاعل / إعادة ضبط
     ========================================================================== */
  function sizeFor(st, el) {
    var parts = String(st.aspectRatio || '3:4').split(':');
    var rw = Number(parts[0]) || 3, rh = Number(parts[1]) || 4;
    var w = Math.min(300, Math.max(200, el.clientWidth || 260));
    var h = Math.round(w * rh / rw);
    if (h > 380) { h = 380; w = Math.round(h * rw / rh); }
    return { w: w, h: h };
  }

  function mount(el, args) {
    if (!el) return;
    if (!available()) {
      el.innerHTML = '<div class="pv3d-off">المعاينة ثلاثية الأبعاد تحتاج WebGL ومكتبة three.js داخل مجلد الإضافة. البرومبت يعمل بشكل طبيعي بدونها.</div>';
      return;
    }
    if (st3.lastAngle !== (args.st.cameraAngle || '')) {
      st3.yawOff = 0; st3.pitchOff = 0; st3.lastAngle = args.st.cameraAngle || '';
    }
    st3.lastEl = el; st3.lastArgs = args;
    var s = sizeFor(args.st, el);
    st3.lastW = s.w; st3.lastH = s.h;
    bindStage(el);
    draw(el, args, s.w, s.h);
  }

  function draw(el, args, w, h) {
    try {
      ensureRenderer(Math.min(window.devicePixelRatio || 1, 1.5));
      el.innerHTML = '';
      el.appendChild(st3.canvas);
      st3.canvas.style.width = w + 'px';
      st3.canvas.style.height = h + 'px';
      var a = Object.assign({}, args, { yawOff: st3.yawOff, pitchOff: st3.pitchOff });
      renderScene(a, w, h);
      el.classList.add('pv3d-ready');
    } catch (e) {
      console.error('[Scene3D]', e);
      el.innerHTML = '<div class="pv3d-off">تعذّر رسم المعاينة ثلاثية الأبعاد: ' + (e && e.message ? e.message : e) +
        '. البرومبت يعمل بشكل طبيعي.</div>';
    }
  }

  function scheduleRedraw() {
    if (st3.raf) return;
    st3.raf = requestAnimationFrame(function () {
      st3.raf = 0;
      if (st3.lastEl && st3.lastEl.isConnected && st3.lastArgs) draw(st3.lastEl, st3.lastArgs, st3.lastW, st3.lastH);
    });
  }

  function bindStage(el) {
    if (el._pv3dBound) return;
    el._pv3dBound = true;
    var drag = null;
    el.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY };
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag = { x: e.clientX, y: e.clientY };
      st3.yawOff += dx * 0.012;
      st3.pitchOff = clamp(st3.pitchOff + dy * 0.006, -0.6, 0.6);
      scheduleRedraw();
    });
    var end = function () { drag = null; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', function () { resetView(); });
  }

  function resetView() {
    st3.yawOff = 0;
    st3.pitchOff = 0;
    scheduleRedraw();
  }

  /* زاوية الكاميرا بالدرجات (تُستخدم في كاشف التعارض مع موضع العنصر) */
  function cameraYaw(key) {
    var V = VIEW[key];
    if (!V || V.pov || V.top) return null;
    return V.yaw || 0;
  }

  PS.Scene3D = {
    mount: mount,
    resetView: resetView,
    available: available,
    cameraYaw: cameraYaw,
    VIEW: VIEW,
    _internal: { buildAll: buildAll, computeCamera: computeCamera, addLights: addLights, lensOf: lensOf, frameKeyOf: frameKeyOf }
  };
})();
