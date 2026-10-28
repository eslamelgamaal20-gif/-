/* ==========================================================================
   Prompt Studio — randomizer.js
   Smart Randomize: picks a coherent visual "theme" and draws compatible
   options from it, so it never mixes e.g. Beach + Clean Studio or
   Deep Focus + Extreme Bokeh. Keeps mode, subject, identity and custom text.
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function maybe(p) { return Math.random() < p; }

  var THEMES = [
    { name: 'Studio', bg: ['Clean Studio', 'Gradient Background', 'Dark Background', 'White Background', 'Black Background'], depth: ['Flat', 'Minimal Depth'],
      light: ['Studio Light', 'Soft Light', 'Strong Directional Light', 'Dramatic Light', 'Hard Light'], temp: ['Neutral', 'Warm', 'Cool'],
      style: ['Studio Photography', 'Portrait Photography', 'Fashion Photography', 'Commercial Photography'],
      dof: ['Moderate Depth', 'Natural Depth', 'Shallow Depth of Field'], color: [['Neutral'], ['High Contrast'], ['Editorial Look'], ['Natural', 'Low Contrast']],
      cloth: ['Minimal', 'Editorial', 'Formal', 'Casual'], mat: ['Cotton', 'Wool', 'Silk'], fit: ['Tailored', 'Regular', 'Slim'], shoes: ['Formal Shoes', 'Loafers', 'Sneakers'] },
    { name: 'Urban', bg: ['Urban Street', 'City', 'Industrial', 'Architecture'], depth: ['Natural Depth', 'Deep Environment', 'Cinematic Depth'],
      light: ['Natural Daylight', 'Golden Hour', 'Hard Light', 'Neon Light', 'Cinematic Light'], temp: ['Neutral', 'Mixed', 'Cool'],
      style: ['Cinematic Photography', 'Editorial Photography', 'Lifestyle Photography', 'Fashion Photography'],
      dof: ['Shallow Depth of Field', 'Cinematic Bokeh', 'Moderate Depth'], color: [['Cinematic'], ['Film Look', 'Muted'], ['Cinematic', 'High Contrast'], ['Cool', 'Muted']],
      cloth: ['Streetwear', 'Casual', 'Sportswear'], mat: ['Denim', 'Cotton', 'Leather', 'Technical Fabric'], fit: ['Oversized', 'Relaxed', 'Regular'], shoes: ['Sneakers', 'Boots'] },
    { name: 'Luxury', bg: ['Luxury Interior', 'Luxury Hotel', 'Restaurant', 'Modern Office'], depth: ['Natural Depth', 'Deep Environment'],
      light: ['Strong Directional Light', 'Soft Light', 'Cinematic Light', 'Dramatic Light'], temp: ['Warm', 'Neutral'],
      style: ['Luxury Photography', 'Advertising Photography', 'Editorial Photography', 'Commercial Photography'],
      dof: ['Shallow Depth of Field', 'Moderate Depth'], color: [['Luxury Look', 'Warm'], ['Cinematic', 'Warm'], ['Editorial Look'], ['Natural', 'High Contrast']],
      cloth: ['Luxury', 'Formal', 'Business'], mat: ['Wool', 'Silk', 'Satin', 'Leather'], fit: ['Tailored', 'Slim'], shoes: ['Loafers', 'Formal Shoes'] },
    { name: 'Nature', bg: ['Nature', 'Forest', 'Beach', 'Desert'], depth: ['Natural Depth', 'Deep Environment'],
      light: ['Golden Hour', 'Natural Daylight', 'Backlight', 'Soft Light'], temp: ['Warm', 'Neutral'],
      style: ['Lifestyle Photography', 'Portrait Photography', 'Documentary Photography', 'Editorial Photography'],
      dof: ['Shallow Depth of Field', 'Natural Depth', 'Extreme Bokeh'], color: [['Natural', 'Warm'], ['Film Look'], ['Vibrant'], ['Muted', 'Warm']],
      cloth: ['Casual', 'Minimal', 'Traditional'], mat: ['Linen', 'Cotton'], fit: ['Relaxed', 'Regular', 'Oversized'], shoes: ['Sandals', 'Sneakers', 'Boots'] }
  ];

  var IMPLIED = { 'Side Light': ['Left', 'Right', 'Side'], 'Front Light': ['Front'], 'Top Light': ['Top'], 'Backlight': ['Back'], 'Rim Light': ['Back'] };
  var FRAMING = { close: ['Portrait', 'Close-up'], mid: ['Waist Up', 'Half Body', '3/4 Body'], wide: ['Full Body'] };
  var LENS = { close: ['85mm', '105mm'], mid: ['50mm', '85mm'], wide: ['24mm', '35mm', '50mm'] };

  function randomize(current, settings) {
    var base = PS.Schema.defaultState(settings);
    var keep = ['mode', 'subjectType', 'peopleCount', 'subjectDetails', 'subjectTypeCustom', 'identity', 'referenceNote', 'allowedChanges', 'customText', 'customPriority', 'negativeExtra', 'autoNegative', 'editOps', 'editText', 'refImageData', 'refImageName', 'refMatchBody', 'refMatchPose', 'refImages', 'textSpace', 'textSpaceContent', 'gradientColor1', 'gradientColor2', 'designPrimary', 'designExtras', 'designIdea', 'gender', 'gazeDirection', 'mainIdea', 'targetModel', 'copyFormat', 'spatialObject', 'spatialObjectCustom', 'spatialInteraction', 'spatialPlacement', 'spatialDistance', 'spatialBodyFacing'];
    keep.forEach(function (k) { if (current[k] !== undefined) base[k] = JSON.parse(JSON.stringify(current[k])); });
    var s = base;
    if (!s.subjectType) s.subjectType = 'Person';
    var product = PS.Schema.isProduct(s);
    var theme = product ? pick([THEMES[0], THEMES[2]]) : pick(THEMES);

    s.background = pick(theme.bg);
    s.bgDepth = pick(theme.depth);
    s.lightingType = pick(theme.light);
    if (IMPLIED[s.lightingType]) s.lightDirection = maybe(0.5) ? pick(IMPLIED[s.lightingType]) : '';
    else s.lightDirection = pick(['Top Left', 'Top Right', 'Left', 'Right', 'Front']);
    s.lightIntensity = s.lightingType === 'Soft Light' ? pick(['Soft', 'Medium']) : pick(['Medium', 'Strong']);
    s.shadowStrength = s.lightingType === 'Soft Light' ? pick(['Soft', 'Medium']) : pick(['Medium', 'Strong', 'Dramatic']);
    s.colorTemp = s.lightingType === 'Golden Hour' ? 'Warm' : (s.lightingType === 'Neon Light' ? 'Mixed' : pick(theme.temp));
    if (maybe(0.4)) s.secondaryLight = pick(['Rim Light', 'Fill Light', 'Hair Light'].filter(function (x) { return x !== s.lightingType; }));
    s.colorGrading = pick(theme.color).slice();
    s.dof = pick(theme.dof);
    if (s.bgDepth === 'Flat' && /Bokeh/.test(s.dof)) s.dof = 'Moderate Depth';
    s.cameraAngle = pick(['Eye Level', 'Eye Level', 'Low Angle', '3/4 Angle', 'High Angle']);
    s.quality = pick([['Ultra Photorealistic', '8K', 'Sharp Details', 'Realistic Materials'], ['Photorealistic', '4K', 'Sharp Details'], ['Ultra Photorealistic', 'Ultra Detailed', 'Sharp Details']]);

    if (product) {
      s.photoStyle = pick(['Product Photography', 'Commercial Photography', 'Advertising Photography']);
      s.productPlacement = pick(['Centered Hero', 'Floating', 'On Pedestal', 'Flat Lay']);
      s.productSurface = s.productPlacement === 'Floating' ? '' : pick(['Marble', 'Wood', 'Concrete', 'Seamless Paper', 'Glass']);
      s.productFocus = pick([['Label Clarity', 'Material Texture'], ['Reflections Control', 'Material Texture'], ['Packaging Detail', 'Label Clarity']]);
      s.lens = pick(['50mm', '85mm', '105mm']);
      if (s.productPlacement === 'Flat Lay') s.cameraAngle = "Bird's Eye View";
      s.composition = pick(['Centered', 'Rule of Thirds', 'Symmetrical']);
    } else {
      s.photoStyle = pick(theme.style);
      var grp = pick(['close', 'mid', 'mid', 'wide']);
      s.bodyFraming = pick(FRAMING[grp]);
      s.lens = pick(LENS[grp]);
      var posture = pick(grp === 'close' ? ['Sitting', 'Standing'] : ['Standing', 'Standing', 'Walking', 'Sitting', 'Leaning']);
      var pose = [posture];
      if (maybe(0.35)) pose.push('Looking Over Shoulder');
      if (maybe(0.5)) pose.push(pick(posture === 'Walking' ? ['Hands in Pockets', 'Both Hands Visible'] : ['Arms Crossed', 'Hands in Pockets', 'Hand on Face', 'Both Hands Visible']));
      pose.push(pick(['Relaxed Pose', 'Natural Pose', 'Editorial Pose', 'Dynamic Pose']));
      s.pose = pose;
      s.expression = pick(['Confident', 'Natural', 'Serious', 'Thoughtful', 'Relaxed', 'Smiling']);
      s.clothingStyle = pick(theme.cloth);
      s.material = pick(theme.mat);
      s.fit = pick(theme.fit);
      s.clothingColor = maybe(0.6) ? pick(['Black', 'White', 'Navy', 'Gray', 'Beige', 'Earth Tones', 'Monochrome', 'Olive']) : '';
      if (grp === 'wide') s.shoes = pick(theme.shoes);
      s.skinTexture = pick(['Natural', 'Detailed', 'Clean but Natural', 'Highly Detailed']);
      s.retouch = pick(['Natural', 'Professional', 'Premium']);
      s.filmGrain = 'Auto';
    }
    return s;
  }

  PS.Randomizer = { randomize: randomize, themes: THEMES };
})();
