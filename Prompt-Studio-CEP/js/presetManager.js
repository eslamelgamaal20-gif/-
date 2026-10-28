/* ==========================================================================
   Prompt Studio — presetManager.js
   Built-in presets (read-only) + user presets (saved locally),
   rename / delete / export / import (JSON).
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});
  var KEY = 'presets';

  var BUILT_IN = [
    { id: 'b_cinematic_portrait', name: 'بورتريه سينمائي', builtIn: true, state: {
      subjectType: 'Person', identity: 'Strict', bodyFraming: 'Portrait', pose: ['Natural Pose'], expression: 'Thoughtful',
      background: 'Dark Background', bgDepth: 'Minimal Depth', lightingType: 'Cinematic Light', lightDirection: 'Top Left', lightIntensity: 'Medium', shadowStrength: 'Dramatic', colorTemp: 'Mixed', secondaryLight: 'Rim Light',
      cameraAngle: 'Eye Level', lens: '85mm', cameraDistance: 'Close', photoStyle: 'Cinematic Photography', skinTexture: 'Detailed', retouch: 'Natural', filmGrain: 'Subtle',
      colorGrading: ['Cinematic', 'High Contrast'], dof: 'Shallow Depth of Field', quality: ['Ultra Photorealistic', '8K', 'Sharp Details'] } },
    { id: 'b_luxury_campaign', name: 'حملة فاخرة', builtIn: true, state: {
      subjectType: 'Person', identity: 'Very Strict', bodyFraming: '3/4 Body', pose: ['Standing', 'Hands in Pockets', 'Editorial Pose'], expression: 'Confident',
      clothingStyle: 'Luxury', clothingColor: 'Black', material: 'Wool', fit: 'Tailored', shoes: 'Loafers',
      background: 'Luxury Hotel', bgDepth: 'Natural Depth', lightingType: 'Strong Directional Light', lightDirection: 'Top Right', shadowStrength: 'Strong', colorTemp: 'Warm',
      cameraAngle: 'Eye Level', lens: '85mm', photoStyle: 'Luxury Photography', skinTexture: 'Detailed', retouch: 'Premium',
      colorGrading: ['Luxury Look', 'Warm'], dof: 'Shallow Depth of Field', quality: ['Ultra Photorealistic', '8K', 'Realistic Materials', 'Sharp Details'] } },
    { id: 'b_fashion_editorial', name: 'تحريري أزياء', builtIn: true, state: {
      subjectType: 'Person', bodyFraming: 'Full Body', pose: ['Standing', 'Looking Over Shoulder', 'Editorial Pose'], expression: 'Serious',
      clothingStyle: 'Editorial', fit: 'Oversized', background: 'Gradient Background', bgDepth: 'Flat', lightingType: 'Hard Light', lightDirection: 'Left', shadowStrength: 'Strong', colorTemp: 'Neutral',
      cameraAngle: 'Low Angle', lens: '50mm', photoStyle: 'Fashion Photography', skinTexture: 'Highly Detailed', retouch: 'Editorial',
      colorGrading: ['Editorial Look', 'Muted'], dof: 'Moderate Depth', quality: ['Photorealistic', '4K', 'Sharp Details', 'Realistic Materials'] } },
    { id: 'b_commercial_product', name: 'منتج تجاري', builtIn: true, state: {
      subjectType: 'Product', productPlacement: 'Centered Hero', productSurface: 'Marble', productFocus: ['Label Clarity', 'Material Texture', 'Reflections Control'],
      background: 'Gradient Background', bgDepth: 'Minimal Depth', lightingType: 'Studio Light', secondaryLight: 'Rim Light', lightIntensity: 'Medium', shadowStrength: 'Soft', colorTemp: 'Neutral',
      cameraAngle: '3/4 Angle', lens: '105mm', composition: 'Centered', aspectRatio: '1:1', photoStyle: 'Product Photography',
      colorGrading: ['Natural', 'High Contrast'], dof: 'Moderate Depth', quality: ['Ultra Photorealistic', '8K', 'Sharp Details', 'Realistic Materials'] } },
    { id: 'b_natural_portrait', name: 'بورتريه طبيعي', builtIn: true, state: {
      subjectType: 'Person', identity: 'Strict', bodyFraming: 'Waist Up', pose: ['Relaxed Pose', 'Natural Pose'], expression: 'Smiling',
      clothingStyle: 'Casual', material: 'Linen', background: 'Nature', bgDepth: 'Natural Depth', lightingType: 'Natural Daylight', lightIntensity: 'Soft', shadowStrength: 'Soft', colorTemp: 'Warm',
      cameraAngle: 'Eye Level', lens: '85mm', photoStyle: 'Portrait Photography', skinTexture: 'Natural', retouch: 'Natural',
      colorGrading: ['Natural', 'Warm'], dof: 'Shallow Depth of Field', quality: ['Photorealistic', 'High Quality', 'Sharp Details'] } },
    { id: 'b_studio_portrait', name: 'بورتريه استوديو', builtIn: true, state: {
      subjectType: 'Person', identity: 'Very Strict', bodyFraming: 'Portrait', pose: ['Natural Pose'], expression: 'Confident',
      background: 'Clean Studio', bgDepth: 'Flat', lightingType: 'Studio Light', lightDirection: 'Top Left', lightIntensity: 'Medium', shadowStrength: 'Medium', colorTemp: 'Neutral', secondaryLight: 'Hair Light',
      cameraAngle: 'Eye Level', lens: '85mm', photoStyle: 'Studio Photography', skinTexture: 'Clean but Natural', retouch: 'Professional',
      colorGrading: ['Neutral'], dof: 'Moderate Depth', quality: ['Ultra Photorealistic', '8K', 'Sharp Details'] } },
    { id: 'b_cinematic_fashion', name: 'أزياء سينمائية', builtIn: true, state: {
      subjectType: 'Person', bodyFraming: 'Full Body', pose: ['Walking', 'Dynamic Pose'], expression: 'Confident',
      clothingStyle: 'Streetwear', material: 'Leather', fit: 'Relaxed', shoes: 'Boots',
      background: 'Urban Street', bgDepth: 'Cinematic Depth', lightingType: 'Neon Light', secondaryLight: 'Rim Light', shadowStrength: 'Strong', colorTemp: 'Mixed',
      cameraAngle: 'Low Angle', lens: '35mm', cameraPerspective: 'Cinematic Perspective', aspectRatio: '21:9', photoStyle: 'Cinematic Photography', skinTexture: 'Detailed', retouch: 'Natural', filmGrain: 'Subtle',
      colorGrading: ['Cinematic', 'Film Look'], dof: 'Cinematic Bokeh', quality: ['Ultra Photorealistic', '8K', 'Sharp Details'] } },
    { id: 'b_realistic_advertising', name: 'إعلان واقعي', builtIn: true, state: {
      subjectType: 'Person', identity: 'Strict', bodyFraming: 'Half Body', pose: ['Standing', 'Holding Object', 'Natural Pose'], heldObject: 'the advertised product, label facing the camera', expression: 'Happy',
      clothingStyle: 'Casual', clothingColor: 'White', fit: 'Regular',
      background: 'Home Interior', bgDepth: 'Natural Depth', lightingType: 'Soft Light', lightDirection: 'Left', lightIntensity: 'Medium', shadowStrength: 'Soft', colorTemp: 'Warm',
      cameraAngle: 'Eye Level', lens: '50mm', composition: 'Negative Space Right', photoStyle: 'Advertising Photography', skinTexture: 'Natural', retouch: 'Professional',
      colorGrading: ['Vibrant', 'Warm'], dof: 'Moderate Depth', quality: ['Photorealistic', '4K', 'Realistic Hands', 'Sharp Details'] } }
  ];

  function uid() { return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* نزيل الصور المرفعة الكبيرة قبل حفظ الإعدادات (تبقى في الذاكرة أثناء الجلسة). */
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

  var Presets = {
    userPresets: function () { return PS.Storage.get(KEY, []) || []; },
    all: function () { return BUILT_IN.concat(this.userPresets()); },
    find: function (id) { var a = this.all(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; },
    nameExists: function (name, exceptId) {
      var n = name.trim().toLowerCase();
      return this.all().some(function (p) { return p.name.toLowerCase() === n && p.id !== exceptId; });
    },
    save: function (name, state) {
      name = String(name || '').trim();
      if (!name) throw new Error('اسم الإعداد لا يمكن أن يكون فارغاً.');
      state = sanitizeState(state);
      var list = this.userPresets();
      var existing = list.filter(function (p) { return p.name.toLowerCase() === name.toLowerCase(); })[0];
      if (existing) { existing.state = state; existing.updated = Date.now(); }
      else {
        if (BUILT_IN.some(function (p) { return p.name.toLowerCase() === name.toLowerCase(); })) throw new Error('"' + name + '" اسم إعداد مدمج. اختر اسماً آخر.');
        existing = { id: uid(), name: name, state: state, created: Date.now() };
        list.push(existing);
      }
      PS.Storage.set(KEY, list);
      return existing;
    },
    rename: function (id, newName) {
      newName = String(newName || '').trim();
      if (!newName) throw new Error('Preset name cannot be empty.');
      var p = this.find(id);
      if (!p) throw new Error('Preset not found.');
      if (p.builtIn) throw new Error('Built-in presets cannot be renamed. Save a copy first.');
      if (this.nameExists(newName, id)) throw new Error('A preset named "' + newName + '" already exists.');
      var list = this.userPresets();
      list.forEach(function (x) { if (x.id === id) x.name = newName; });
      PS.Storage.set(KEY, list);
    },
    remove: function (id) {
      var p = this.find(id);
      if (!p) throw new Error('Preset not found.');
      if (p.builtIn) throw new Error('Built-in presets cannot be deleted.');
      PS.Storage.set(KEY, this.userPresets().filter(function (x) { return x.id !== id; }));
    },
    exportJSON: function () {
      return JSON.stringify({ app: 'Prompt Studio', type: 'presets', version: 1, exported: new Date().toISOString(), presets: this.userPresets() }, null, 2);
    },
    importJSON: function (text) {
      var data;
      try { data = JSON.parse(text); } catch (e) { throw new Error('The file is not valid JSON.'); }
      var arr = Array.isArray(data) ? data : data && data.presets;
      if (!Array.isArray(arr)) throw new Error('No presets found in this file.');
      var list = this.userPresets(), self = this, count = 0;
      arr.forEach(function (p) {
        if (!p || typeof p.name !== 'string' || typeof p.state !== 'object') return;
        var name = p.name.trim() || 'Imported preset';
        while (self.nameExists(name) || list.some(function (x) { return x.name.toLowerCase() === name.toLowerCase(); })) name += ' (imported)';
        list.push({ id: uid(), name: name, state: p.state, created: Date.now() });
        count++;
      });
      PS.Storage.set(KEY, list);
      return count;
    }
  };

  PS.Presets = Presets;
})();
