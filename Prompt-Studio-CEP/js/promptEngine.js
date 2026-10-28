/* ==========================================================================
   Prompt Studio — promptEngine.js
   Pure logic (no DOM). Converts a state object into a natural, professional
   prompt + negative prompt + warnings. Pipeline:
     1. Resolve conflicts (keeps last-selected for multi fields, warns)
     2. Route custom instructions to the right section (AR/EN keywords)
     3. Build each token: [TASK] [IDENTITY] [SUBJECT] ... [NEGATIVE]
     4. Render through the template, dedupe and clean whitespace
   Future model adapters (Midjourney / SD / Flux / Gemini...) can post-process
   the result via PS.PromptEngine.adapters.
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});
  var S = function () { return PS.Schema; };

  /* ---------------- helpers ---------------- */
  function t(s) { return String(s == null ? '' : s).trim(); }
  function cap(s) { s = t(s); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function sentence(s) {
    s = t(s); if (!s) return '';
    s = cap(s);
    if (!/[.!?؟。"»)]$/.test(s)) s += '.';
    return s;
  }
  function joinList(arr, conj) {
    conj = conj || 'and';
    arr = arr.filter(function (x) { return !!t(x); });
    if (!arr.length) return '';
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr[0] + ' ' + conj + ' ' + arr[1];
    return arr.slice(0, -1).join(', ') + ', ' + conj + ' ' + arr[arr.length - 1];
  }
  function article(word) { return /^[aeiou8]/i.test(t(word)) ? 'an' : 'a'; }
  function hasArabic(s) { return /[\u0600-\u06FF]/.test(s || ''); }
  function lower(s) { return t(s).toLowerCase(); }

  /** Resolves a select value, replacing "Custom" by the companion text. */
  function sel(st, id) {
    var v = st[id];
    if (!v) return '';
    if (String(v).indexOf('Custom') === 0) return t(st[id + 'Custom']) ? 'CUSTOM:' + t(st[id + 'Custom']) : '';
    return v;
  }
  function isCustom(v) { return String(v).indexOf('CUSTOM:') === 0; }
  function customText(v) { return String(v).replace(/^CUSTOM:/, ''); }
  /** Map a value through a dictionary; custom text passes through. */
  function phrase(map, v, fallbackLower) {
    if (!v) return '';
    if (isCustom(v)) return customText(v);
    if (map[v] !== undefined) return map[v];
    return fallbackLower === false ? v : lower(v);
  }

  /** Keep only the last-selected item from each exclusive group. */
  function resolveExclusive(arr, groups, label, ctx) {
    var out = arr.slice();
    groups.forEach(function (g) {
      var picked = out.filter(function (x) { return g.indexOf(x) !== -1; });
      if (picked.length > 1) {
        var keep = picked[picked.length - 1];
        out = out.filter(function (x) { return g.indexOf(x) === -1 || x === keep; });
        ctx.warn(label + ': "' + picked.slice(0, -1).join('", "') + '" conflicts with "' + keep + '". Kept the last selection ("' + keep + '").');
      }
    });
    return out;
  }

  /* ---------------- phrase dictionaries ---------------- */
  var D = {
    framing: {
      'Full Body': 'a full-body shot showing the subject from head to toe',
      '3/4 Body': 'a three-quarter-length shot framed from the knees up',
      'Half Body': 'a half-body shot', 'Waist Up': 'a waist-up shot',
      'Portrait': 'a classic head-and-shoulders portrait',
      'Close-up': 'a close-up of the face and shoulders',
      'Extreme Close-up': 'an extreme close-up focused on facial detail',
      'Wide Shot': 'a wide shot that places the subject within the environment'
    },
    framingGroup: { 'Full Body': 'wide', 'Wide Shot': 'wide', '3/4 Body': 'mid', 'Half Body': 'mid', 'Waist Up': 'mid', 'Portrait': 'close', 'Close-up': 'close', 'Extreme Close-up': 'close' },
    shot: { 'Extreme Close-up': 'an extreme close-up shot', 'Close-up': 'a close-up shot', 'Medium Shot': 'a medium shot', 'Medium Full Shot': 'a medium full shot', 'Full Shot': 'a full shot', 'Wide Shot': 'a wide shot' },
    shotGroup: { 'Extreme Close-up': 'close', 'Close-up': 'close', 'Medium Shot': 'mid', 'Medium Full Shot': 'mid', 'Full Shot': 'wide', 'Wide Shot': 'wide' },
    posture: { 'Standing': 'standing', 'Sitting': 'sitting', 'Walking': 'walking naturally', 'Running': 'running', 'Kneeling': 'kneeling', 'Lying Down': 'lying down' },
    arms: { 'Arms Crossed': 'arms crossed over the chest', 'Hands in Pockets': 'hands resting in the pockets', 'Hand on Face': 'one hand gently touching the face', 'One Hand Raised': 'one hand raised', 'Both Hands Visible': 'both hands clearly visible' },
    poseStyle: { 'Relaxed Pose': 'relaxed', 'Dynamic Pose': 'dynamic', 'Editorial Pose': 'editorial', 'Natural Pose': 'natural' },
    age: { 'Child': 'a child', 'Teen': 'a teenager', 'Young Adult': 'a young adult', 'Adult': 'an adult', 'Middle-aged': 'a middle-aged adult', 'Elderly': 'an elderly person' },
    hairStyle: { 'Medium': 'medium-length', 'Messy': 'messy, textured', 'Slick Back': 'slicked-back', 'Fade': 'short faded', 'Buzz Cut': 'buzz-cut' },
    beard: { 'None': 'a clean-shaven face', 'Stubble': 'light stubble', 'Short Beard': 'a short, neatly groomed beard', 'Full Beard': 'a full beard', 'Long Beard': 'a long beard', 'Mustache': 'a mustache' },
    expression: { 'Neutral': 'a neutral expression', 'Serious': 'a serious expression', 'Happy': 'a happy expression', 'Smiling': 'a natural, genuine smile', 'Confident': 'a confident expression', 'Relaxed': 'a relaxed expression', 'Thoughtful': 'a thoughtful expression', 'Dramatic': 'an intense, dramatic expression', 'Natural': 'a natural, unforced expression' },
    accessories: { 'Glasses': 'eyeglasses', 'Sunglasses': 'sunglasses', 'Watch': 'a wristwatch', 'Hat': 'a hat', 'Cap': 'a cap', 'Jewelry': 'subtle jewelry', 'Earrings': 'earrings', 'Scarf': 'a scarf' },
    clothingStyle: { 'Casual': 'casual clothing', 'Formal': 'formal attire', 'Streetwear': 'streetwear', 'Sportswear': 'sportswear', 'Traditional': 'traditional clothing', 'Luxury': 'luxury designer clothing', 'Editorial': 'editorial fashion styling', 'Business': 'business attire', 'Minimal': 'minimalist clothing' },
    clothingColor: { 'Earth Tones': 'earth tones', 'Monochrome': 'a monochrome palette', 'Pastel': 'soft pastel tones' },
    material: { 'Technical Fabric': 'technical performance fabric', 'Wool': 'fine wool', 'Silk': 'smooth silk' },
    fit: { 'Slim': 'a slim fit', 'Regular': 'a regular fit', 'Oversized': 'an oversized fit', 'Relaxed': 'a relaxed fit', 'Tailored': 'a sharply tailored fit' },
    shoes: { 'Formal Shoes': 'polished formal shoes', 'Traditional Shoes': 'traditional footwear' },
    background: {
      'Clean Studio': 'a clean, professional photo studio with a seamless backdrop',
      'Luxury Interior': 'a luxurious interior with refined materials and elegant details',
      'Modern Office': 'a modern office with contemporary design',
      'Urban Street': 'an urban street with authentic city textures',
      'City': 'a vibrant city setting', 'Nature': 'a natural outdoor environment', 'Forest': 'a lush forest',
      'Beach': 'a beach with soft sand and the sea in the distance', 'Desert': 'a vast desert landscape',
      'Industrial': 'an industrial space with raw concrete and metal textures',
      'Minimal': 'a minimal, uncluttered setting', 'Dark Background': 'a dark, low-key background',
      'White Background': 'a pure white seamless background', 'Black Background': 'a solid black background',
      'Gradient Background': 'a smooth gradient studio background',
      'Luxury Hotel': 'an upscale luxury hotel interior', 'Restaurant': 'a stylish restaurant',
      'Home Interior': 'a warm, lived-in home interior', 'Shopping Area': 'a modern shopping area',
      'Architecture': 'a setting defined by striking architecture'
    },
    flatBackgrounds: ['Clean Studio', 'Minimal', 'Dark Background', 'White Background', 'Black Background', 'Gradient Background'],
    bgDepth: { 'Flat': 'kept flat and simple', 'Minimal Depth': 'with minimal depth', 'Natural Depth': 'with natural, realistic depth', 'Deep Environment': 'with a deep, layered environment', 'Cinematic Depth': 'with cinematic, layered depth' },
    bgPerspective: { 'Natural': 'natural perspective', 'Wide': 'a wide, expansive perspective', 'Compressed': 'compressed telephoto perspective', 'Cinematic': 'cinematic perspective' },
    lightingType: {
      'Flat Light': 'flat, even lighting with almost no shadows',
      'Loop Light': 'classic loop lighting with a small nose shadow',
      'Rembrandt Light': 'Rembrandt lighting with a triangle of light on the cheek',
      'Split Light': 'split lighting with half of the face in shadow',
      'Silhouette Lighting': 'silhouette lighting with the subject dark against a bright background',
      'Butterfly Light': 'butterfly lighting with a symmetrical shadow under the nose',
      'Soft Light': 'soft, diffused light', 'Hard Light': 'hard light with crisp edges',
      'Strong Directional Light': 'strong directional light', 'Dramatic Light': 'dramatic, high-contrast light',
      'Cinematic Light': 'cinematic, motivated light', 'Rim Light': 'rim light that outlines the subject',
      'Backlight': 'backlight', 'Side Light': 'side light', 'Front Light': 'even front light', 'Top Light': 'top light',
      'Golden Hour': 'warm golden-hour sunlight', 'Neon Light': 'colorful neon light',
      'Studio Light': 'professional studio lighting', 'Natural Daylight': 'natural daylight'
    },
    impliedDir: { 'Side Light': 'Side', 'Front Light': 'Front', 'Top Light': 'Top', 'Backlight': 'Back', 'Rim Light': 'Back' },
    lightDir: { 'Front': 'from the front', 'Left': 'from the left', 'Right': 'from the right', 'Top': 'from above', 'Back': 'from behind the subject', 'Top Left': 'from the upper left', 'Top Right': 'from the upper right', 'Side': 'from the side' },
    intensity: { 'Soft': 'gentle intensity', 'Medium': 'moderate intensity', 'Strong': 'strong intensity', 'Very Strong': 'very strong, punchy intensity' },
    shadow: { 'Soft': 'soft, gradual shadows', 'Medium': 'balanced shadows with natural falloff', 'Strong': 'strong, well-defined shadows', 'Dramatic': 'deep, dramatic shadows with controlled contrast' },
    temp: { 'Warm': 'a warm color temperature', 'Neutral': 'a neutral, true-to-life color temperature', 'Cool': 'a cool color temperature', 'Mixed': 'a mix of warm and cool light' },
    secondary: { 'Rim Light': 'a subtle rim light separating the subject from the background', 'Backlight': 'a gentle backlight', 'Fill Light': 'a soft fill light that opens up the shadows', 'Hair Light': 'a hair light adding separation', 'Practical Lights': 'practical light sources visible in the scene' },
    angle: {
      'Eye Level': 'at eye level', 'Low Angle': 'from a low angle looking slightly up', 'High Angle': 'from a high angle looking down',
      "Bird's Eye View": "from a bird's-eye view directly above", "Worm's Eye View": "from a worm's-eye view near the ground",
      'Dutch Angle': 'with a tilted Dutch angle', 'Over-the-Shoulder': 'from an over-the-shoulder viewpoint',
      'POV': 'from a first-person POV perspective',
      'Long Shot': 'as a long shot showing the subject small within the scene',
      'Top Down': 'shot straight down from directly above (top-down)',
      'Framed Shot': 'with the subject framed inside a natural frame (door, window, arch)',
      'Orbit': 'with a dynamic orbit camera circling the subject',
      'Side Angle': 'from a side angle', 'Front Angle': 'from a straight-on front angle', 'Back Angle': 'from behind the subject',
      '3/4 Angle': 'from a three-quarter angle'
    },
    lens: { '14mm': 'a 14mm ultra-wide lens', '24mm': 'a 24mm wide-angle lens', '35mm': 'a 35mm lens', '50mm': 'a 50mm standard lens', '85mm': 'an 85mm portrait lens', '135mm': 'a 135mm telephoto lens', '200mm': 'a 200mm telephoto lens', '105mm': 'a 105mm telephoto lens', 'Macro': 'a macro lens' },
    distance: { 'Very Close': 'very close to the subject', 'Close': 'close to the subject', 'Medium': 'at a medium distance', 'Far': 'from a distance' },
    camPersp: { 'Natural Perspective': 'natural perspective', 'Wide Perspective': 'a wide perspective', 'Compressed Perspective': 'compressed perspective', 'Cinematic Perspective': 'cinematic perspective' },
    composition: {
      'Rule of Thirds': 'Compose the shot using the rule of thirds, placing the subject on a power point',
      'Centered Composition': 'Center the subject in the frame for a strong, stable composition',
      'Negative Space': 'Use generous negative space so the subject breathes within the frame',
      'Symmetrical': 'Use a balanced, symmetrical composition',
      'Leading Lines': 'Use leading lines that guide the eye toward the subject',
      'Visual Hierarchy': 'Arrange elements so the eye moves from the subject to the supporting details in order',
      'Subject Placement': 'Place the subject deliberately in the frame to carry the visual weight',
      'Headroom': 'Keep correct headroom above the subject with no wasted space',
      'Look Room': 'Leave look room in the direction the subject is facing',
      'Breathing Room': 'Leave breathing room around the subject so nothing feels cramped',
      'Balance': 'Balance the visual weight across the frame',
      'Depth': 'Build depth with clear foreground, midground and background layers',
      'Layering': 'Layer foreground, subject and background elements to create a sense of depth'
    },
    style: {
      'Ultra Photorealistic': ['ultra-photorealistic', 'an image indistinguishable from a real photograph captured with a professional camera'],
      'Commercial Photography': ['high-end commercial', 'a polished, clean, brand-ready commercial aesthetic'],
      'Fashion Photography': ['high-fashion', 'refined fashion styling and magazine-quality polish'],
      'Editorial Photography': ['editorial', 'a storytelling editorial look with intentional styling and composition'],
      'Cinematic Photography': ['cinematic', 'a cinematic film-still atmosphere with a strong sense of mood'],
      'Studio Photography': ['professional studio', 'controlled, precise studio craftsmanship'],
      'Advertising Photography': ['premium advertising', 'a striking, campaign-ready advertising look'],
      'Documentary Photography': ['documentary-style', 'an authentic, candid documentary feel'],
      'Luxury Photography': ['luxury', 'an elegant, premium luxury aesthetic'],
      'Product Photography': ['professional product', 'precise product presentation with accurate shape, materials, and details'],
      'Lifestyle Photography': ['lifestyle', 'a natural, relatable lifestyle feel'],
      'Portrait Photography': ['professional portrait', "an expressive portrait that emphasizes the subject's character"]
    },
    dof: {
      'Deep Focus': 'Keep the entire scene in sharp focus with a deep depth of field.',
      'Natural Depth': 'Use a natural, realistic depth of field.',
      'Moderate Depth': 'Use a moderate depth of field that keeps the subject crisp while gently softening the background.',
      'Shallow Depth of Field': 'Use a shallow depth of field so the subject stays tack-sharp while the background falls into a soft, natural blur.',
      'Extreme Bokeh': 'Use a very shallow depth of field with creamy, pronounced bokeh behind the subject.',
      'Cinematic Bokeh': 'Use a cinematic shallow depth of field with smooth, oval-like bokeh highlights.'
    },
    color: { 'Natural': 'natural, true-to-life color', 'Cinematic': 'cinematic color grading', 'Warm': 'warm tones', 'Cool': 'cool tones', 'High Contrast': 'high contrast', 'Low Contrast': 'soft, low contrast', 'Muted': 'muted, desaturated tones', 'Vibrant': 'vibrant, rich colors', 'Film Look': 'an analog film look', 'Editorial Look': 'a refined editorial grade', 'Luxury Look': 'a rich, luxurious grade', 'Neutral': 'neutral color balance' },
    quality: { 'High Quality': 'high image quality', 'Ultra Detailed': 'ultra-fine detail', 'Photorealistic': 'photorealistic rendering', 'Ultra Photorealistic': 'ultra-photorealistic rendering', '4K': '4K-resolution detail', '8K': '8K-resolution detail', 'Professional Photography': 'professional photographic craftsmanship', 'Sharp Details': 'sharp details', 'Realistic Materials': 'realistic materials and textures', 'Realistic Hands': 'realistic, anatomically correct hands', 'Realistic Eyes': 'realistic, lifelike eyes', 'Detailed Hair': 'detailed, natural hair strands', 'Accurate Anatomy': 'accurate anatomy and proportions' },
    placement: { 'Centered Hero': 'presented as a centered hero shot', 'Floating': 'floating elegantly in mid-air', 'On Pedestal': 'displayed on a pedestal', 'Flat Lay': 'arranged as a top-down flat lay', 'Hand-held': 'held naturally in a hand', 'In Use': 'shown in realistic use' },
    surface: { 'Seamless Paper': 'on a seamless paper backdrop', 'Marble': 'on a polished marble surface', 'Wood': 'on a natural wood surface', 'Glass': 'on a reflective glass surface', 'Concrete': 'on a textured concrete surface', 'Fabric': 'on draped fabric', 'Water Surface': 'on a rippling water surface' },
    productFocus: { 'Label Clarity': 'crisp, legible labels', 'Material Texture': 'accurate material textures', 'Reflections Control': 'controlled, clean reflections', 'Packaging Detail': 'precise packaging details', 'Scale Accuracy': 'accurate real-world scale' },
    editOps: { 'Replace Object': 'replace the specified object', 'Remove Object': 'remove the specified object', 'Change Clothing': 'change the clothing', 'Change Background': 'change the background', 'Change Pose': 'change the pose', 'Change Lighting': 'change the lighting', 'Change Camera': 'change the camera angle and framing' }
  };

  /* ---------------- custom instruction router ---------------- */
  var ROUTES = [
    { cat: 'camera', words: ['camera', 'angle', 'lens', 'shot', 'framing', 'frame', 'zoom', 'composition', 'negative space', 'left side', 'right side', 'كاميرا', 'الكاميرا', 'زاوية', 'لقطة', 'عدسة', 'كادر', 'تكوين', 'مساحة', 'ناحية', 'على اليسار', 'على اليمين', 'منخفضة', 'مرتفعة'] },
    { cat: 'background', words: ['background', 'backdrop', 'environment', 'scene', 'location', 'setting', 'خلفية', 'الخلفية', 'المكان', 'مكان', 'بيئة', 'البيئة', 'المشهد'] },
    { cat: 'lighting', words: ['light', 'lighting', 'shadow', 'sunlight', 'إضاءة', 'اضاءة', 'الإضاءة', 'الاضاءة', 'ضوء', 'الضوء', 'نور', 'ظل', 'ظلال'] },
    { cat: 'clothing', words: ['wear', 'wearing', 'shirt', 't-shirt', 'jacket', 'suit', 'dress', 'clothes', 'clothing', 'outfit', 'pants', 'shoes', 'لبس', 'يلبس', 'لابس', 'ملابس', 'قميص', 'تيشيرت', 'بدلة', 'جاكيت', 'فستان', 'بنطلون', 'جزمة', 'حذاء'] },
    { cat: 'pose', words: ['holding', 'holds', 'hand', 'hands', 'pose', 'standing', 'sitting', 'looking', 'gaze', 'walking', 'arm', 'arms', 'leaning', 'ماسك', 'يمسك', 'ماسكة', 'بإيده', 'بايده', 'بيده', 'إيده', 'ايده', 'يده', 'واقف', 'جالس', 'قاعد', 'يبص', 'بيبص', 'ينظر', 'وضعية', 'يمشي', 'ماشي', 'ذراع', 'مسند'] },
    { cat: 'appearance', words: ['hair', 'beard', 'smile', 'expression', 'eyes', 'makeup', 'شعر', 'الشعر', 'دقن', 'ذقن', 'لحية', 'ابتسامة', 'يبتسم', 'تعبير', 'عيون', 'مكياج'] },
    { cat: 'identity', words: ['face', 'identity', 'facial', 'features', 'وش', 'وجه', 'الوجه', 'ملامح', 'هوية', 'الهوية'] },
    { cat: 'color', words: ['color grading', 'grade', 'tones', 'saturation', 'ألوان', 'الألوان', 'تشبع', 'تدرج'] }
  ];
  var PRESERVE_WORDS = ['as is', 'as it is', 'unchanged', 'keep the', 'keep it', 'preserve', "don't change", 'do not change', 'same', 'كما هي', 'كما هو', 'زي ما', 'بدون تغيير', 'حافظ', 'خلي الخلفية', 'متغيرش', 'لا تغير', 'نفس'];

  function splitInstructions(text) {
    // No regex lookbehind (not supported by older UXP JS engines in Photoshop 2021).
    return t(text).replace(/([.!?\u061F\u061B;])\s+/g, '$1\n').split(/\n+/).map(t).filter(Boolean);
  }
  function classify(seg) {
    var low = seg.toLowerCase();
    var best = null, bestScore = 0;
    ROUTES.forEach(function (r) {
      var score = 0;
      r.words.forEach(function (w) { if (low.indexOf(w) !== -1) score += w.length > 4 ? 2 : 1; });
      if (score > bestScore) { bestScore = score; best = r.cat; }
    });
    var preserve = PRESERVE_WORDS.some(function (w) { return low.indexOf(w) !== -1; });
    return { cat: best || 'other', preserve: preserve, text: seg };
  }
  /* ==========================================================================
     ARABIC → ENGLISH BUILT-IN TRANSLATOR (no external API)
     يضمن أن البروميت النهائي لا يحتوي أي حرف عربي: كل تعليمة عربية تُترجم
     داخل البلجن إلى إنجليزي عبر قاموس مصطلحات التصوير + نطق حرفي لباقي الكلمات.
     ========================================================================== */
  var AR_NORM = [
    [/[\u064B-\u0652\u0640]/g, ''],           // تشكيل وتشكيل
    [/أ|إ|آ/g, 'ا'], [/ة/g, 'ه'], [/ى/g, 'ي'], [/ؤ/g, 'و'], [/ئ/g, 'ي']
  ];
  function arNorm(s) {
    var out = String(s || '');
    for (var i = 0; i < AR_NORM.length; i++) out = out.replace(AR_NORM[i][0], AR_NORM[i][1]);
    return out;
  }
  /* قاموس عبارات ثم كلمات — الأطول أولاً */
  var AR_PHRASES = [
    ['بإيده اليمين', 'in his right hand'], ['بايده اليمين', 'in his right hand'], ['بإيده الشمال', 'in his left hand'], ['بايده الشمال', 'in his left hand'],
    ['بإيدها اليمين', 'in her right hand'], ['بإيدها الشمال', 'in her left hand'], ['بإيده', 'in his hand'], ['بايده', 'in his hand'], ['بإيديه', 'with both hands'],
    ['خليه يمسك', 'holding'], ['خليها تمسك', 'holding'], ['يمسك بويده', 'holding with his hand'], ['تمسك بايدها', 'holding with her hand'],
    ['عايز اشوف', 'I want to see'], ['عايز', 'I want'], ['عاوز', 'I want'], ['ابغى', 'I want'], ['ابغيه', 'I want it'], ['محتاج', 'I need'], ['من فضلك', 'please'],
    ['خليه', ''], ['خليها', ''], ['خلي', ''], ['مليح', 'good'], ['حلو', 'nice'],
    ['واقف قدام', 'standing in front of'], ['واقف ادام', 'standing in front of'], ['واقف بجانب', 'standing next to'], ['واقف جنب', 'standing next to'],
    ['قف قدام', 'standing in front of'], ['جالس قدام', 'sitting in front of'], ['قاعدة قدام', 'sitting in front of'],
    ['يدخل', 'entering'], ['يخرج', 'exiting'], ['يشرب', 'drinking'], ['يأكل', 'eating'], ['يكتب', 'writing'], ['يقرأ', 'reading'],
    ['يظهر', 'appearing'], ['بيبص للكاميرا', 'looking at the camera'], ['خليه يبص للكاميرا', 'looking at the camera'],
    ['بالليل', 'at night'], ['في الليل', 'at night'], ['اليل', 'the night'], ['صباحا', 'in the morning'], ['عند الغروب', 'at sunset'],
    ['من اليمين', 'from the right'], ['من اليسار', 'from the left'], ['ناحية اليمين', 'toward the right'], ['ناحية اليسار', 'toward the left'],
    ['شعر طويل', 'long hair'], ['شعر قصير', 'short hair'], ['لون ابيض', 'white color'], ['لون اسود', 'black color'],
    ['خلفية بيضاء', 'white background'], ['خلفية سوداء', 'black background'], ['خلفية زرقا', 'blue background'], ['خلفية خضراء', 'green background']
  ];
  var AR_WORDS = {
    'و':'and','او':'or','في':'in','على':'on','من':'from','الى':'to','عن':'about','مع':'with','بدون':'without','بين':'between',
    'هو':'he','هي':'she','هم':'they','انا':'I','شخص':'person','شخصا':'person','راجل':'man','رجل':'man','ست':'woman','امراه':'woman','انثي':'female','ذكر':'male',
    'ولد':'boy','طفل':'child','اطفال':'children','شباب':'young men','بنات':'girls','グループ':'group','مجموعة':'group',
    'واقف':'standing','وقف':'standing','قاعد':'sitting','جالس':'sitting','قاعدة':'sitting','مستند':'leaning','ماشي':'walking','يمشي':'walking','جري':'running','يركض':'running',
    'ماسك':'holding','يمسك':'holding','تمسك':'holding','بيمسك':'holding','بإيده':'in his hand','بايده':'in his hand','ايده':'hand','يده':'hand','إيده':'hand','بإيديه':'with both hands',
    'كوب':'cup','قهوه':'coffee','قهوة':'coffee','كتاب':'book','مobil':'phone','موبايل':'phone','تليفون':'phone','هاتف':'phone','شنطه':'bag','نظاره':'glasses','عطر':'perfume','ورد':'flowers','زهره':'flower','سيف':'sword','ميكروفون':'microphone','جوال':'phone',
    'عربية':'car','سياره':'car','كار':'car','دراجه':'bicycle','شجره':'tree','شجر':'trees','باب':'door','حائط':'wall','سقف':'ceiling','ارض':'ground','مطر':'rain','نار':'fire','ماء':'water','شمس':'sun','قمر':'moon','نجوم':'stars','غيوم':'clouds',
    'بيت':'house','منزل':'house','مكتب':'office','مطعم':'restaurant','مقهى':'cafe','محل':'shop','متجر':'store','شارع':'street','طريق':'road','مدينة':'city','قريه':'village','صحراء':'desert','بحر':'sea','شاطئ':'beach','غابه':'forest','جبل':'mountain',
    'ليل':'night','نهار':'day','مساء':'evening','صباح':'morning','غروب':'sunset','شروق':'sunrise','مطر':'rain','ضباب':'fog','ثلج':'snow',
    'ابيض':'white','اسود':'black','ازرق':'blue','اخضر':'green','احمر':'red','اصفر':'yellow','بني':'brown','رمادي':'gray','برتقالي':'orange','وردي':'pink','بنفسجي':'purple','ذهبي':'gold','فضي':'silver','كحلي':'navy','بيج':'beige',
    'قميص':'shirt','تيشيرت':'t-shirt','جاكيت':'jacket','معطف':'coat','فستان':'dress','بدله':'suit','بنطلون':'pants','شورت':'shorts','حذاء':'shoes','جزمه':'boots','قبعه':'cap','طاقيه':'hat','وشاح':'scarf','قفازات':'gloves',
    'كبير':'large','صغير':'small','طويل':'tall','قصير':'short','جميل':'beautiful','حلو':'nice','واقعي':'realistic','سينمائي':'cinematic','احترافي':'professional','واضح':'clear','غامق':'dark','فاتح':'light','قريب':'close','بعيد':'far','وسط':'center','يمين':'right','يسار':'left',
    'الشخص':'the person','الشخصيه':'the character','الورا':'behind','قدام':'in front','جنب':'next to','فوق':'above','تحت':'below','داخل':'inside','برا':'outside','الوجه':'face','الشعر':'hair','العيون':'eyes','الابتسامه':'smile','يبتسم':'smiling','ينظر':'looking','يبص':'looking','مبتسم':'smiling'
  };
  var AR_LETTERS = { 'ا':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ء':'','ؤ':'w','ئ':'y','أ':'a','إ':'i','آ':'a','ة':'a' };
  function arTransliterate(word) {
    var out = '';
    for (var i = 0; i < word.length; i++) {
      var ch = word.charAt(i);
      out += AR_LETTERS[ch] !== undefined ? AR_LETTERS[ch] : (/[a-z0-9]/i.test(ch) ? ch : '');
    }
    return out;
  }
  /** يترجم نص عربي بالكامل إلى إنجليزي (قاموس + نطق حرفي). لا يُرجع أي حرف عربي. */
  function translateAR(text) {
    var work = ' ' + arNorm(text) + ' ';
    /* 1) العبارات الأطول أولاً */
    AR_PHRASES.forEach(function (p) {
      var key = arNorm(p[0]);
      work = work.split(' ' + key + ' ').join(' §' + p[1] + ' §');
      work = work.split(key).join(' §' + p[1] + ' §');
    });
    /* 2) الكلمات */
    var tokens = work.split(/\s+/);
    var out = [];
    tokens.forEach(function (tok) {
      if (!tok) return;
      if (tok.charAt(0) === '§') { out.push(tok.replace(/§/g, '')); return; }
      var clean = tok.replace(/[.,!?،؛؟]/g, '');
      var prefix = '';
      if (clean.indexOf('ال') === 0 && clean.length > 3) { prefix = 'the '; clean = clean.slice(2); }
      if (AR_WORDS[clean] !== undefined) { out.push(prefix + AR_WORDS[clean]); return; }
      if (AR_WORDS[clean + 'ه'] !== undefined) { out.push(prefix + AR_WORDS[clean + 'ه']); return; }
      /* نطق حرفي لأي كلمة عربية غير معروفة */
      if (/[\u0600-\u06FF]/.test(clean)) { out.push(prefix + arTransliterate(clean)); return; }
      out.push(tok);
    });
    var res = out.join(' ').replace(/\s+/g, ' ').trim();
    /* تنظيف */
    res = res.replace(/\s+([.,!?])/g, '$1');
    return cap(res);
  }
  /** يترجم النص إذا كان عربياً؛ وإلا يعيده كما هو. */
  function toEn(txt) { return hasArabic(txt) ? translateAR(txt) : t(txt); }

  function renderInstruction(seg, priority, langMode) {
    var txt = t(seg);
    var en = hasArabic(txt) ? translateAR(txt) : txt;
    var holdMatch = /(holding|carry|carry|grip|hold)/i.test(en) || /(ماسك|يمسك|تمسك|بيمسك)/i.test(txt);
    if (priority === 'Critical') return 'CRITICAL — follow exactly as written, without omitting or reinterpreting: ' + sentence(en) + (holdMatch ? ' Render the object clearly with an anatomically correct, believable grip — fingers wrapped naturally around the object, correct hand proportions, visible contact between hand and object.' : '');
    if (priority === 'High') return 'Priority instruction (overrides any conflicting setting): ' + sentence(en) + (holdMatch ? ' Show the object held with a realistic, anatomically correct grip.' : '');
    var base = 'Additional instruction: ' + sentence(en);
    if (holdMatch) base += ' Ensure the grip is believable: natural finger placement, correct hand anatomy, and clear contact between hand and object.';
    return base;
  }

  /* ---------------- context ---------------- */
  function makeCtx(st, settings) {
    var schema = S();
    var product = schema.isProduct(st);
    var humanFieldIds = [];
    schema.sections.forEach(function (sec) { if (sec.human) sec.fields.forEach(function (f) { humanFieldIds.push(f.id); }); });
    var humanFilled = humanFieldIds.some(function (id) {
      var v = st[id]; if (id === 'filmGrain') return false;
      return Array.isArray(v) ? v.length > 0 : !!v;
    });
    var refCount = (st.refImages && st.refImages.length) || 0;
    var refImg = refCount > 0;
    var human = !product && (schema.HUMAN_TYPES.indexOf(st.subjectType) !== -1 ||
      st.identity !== 'Off' || refImg || humanFilled || (!st.subjectType && st.mode !== 'Editing'));
    var used = {};
    var ctx = {
      st: st, settings: settings || {}, product: product, human: human,
      refImg: refImg,
      plural: schema.isMultiPerson(st), editing: st.mode === 'Editing',
      identityOn: (st.identity && st.identity !== 'Off') || refImg,
      warnings: [], routed: {}, changed: {},
      warn: function (m) { if (ctx.warnings.indexOf(m) === -1) ctx.warnings.push(m); },
      once: function (key) { if (used[key]) return false; used[key] = true; return true; },
      visible: function (secId) { return schema.isSectionVisible(schema.findSection(secId), st); }
    };
    ctx.Subj = ctx.plural ? 'The subjects' : 'The subject';
    ctx.subjIs = ctx.plural ? 'The subjects are' : 'The subject is';
    return ctx;
  }
  function v(ctx, secId, id) { return ctx.visible(secId) ? sel(ctx.st, id) : ''; }
  function m(ctx, secId, id) { return ctx.visible(secId) ? (ctx.st[id] || []).slice() : []; }
  function routedFor(ctx, cat) { return (ctx.routed[cat] || []).join(' '); }

  /* ---------------- token builders ---------------- */
  function buildTask(ctx) {
    var st = ctx.st;
    var styleVal = sel(st, 'photoStyle');
    var q = m(ctx, 'quality', 'quality');
    var adj = '';
    if (styleVal && !isCustom(styleVal) && D.style[styleVal]) adj = D.style[styleVal][0];
    var realism = (styleVal === 'Ultra Photorealistic' || q.indexOf('Ultra Photorealistic') !== -1) ? 'ultra-photorealistic'
      : (q.indexOf('Photorealistic') !== -1 ? 'photorealistic' : '');
    if (realism) { ctx.once('realism'); }
    var adjs = [];
    if (realism && adj !== realism) adjs.push(realism);
    if (adj) adjs.push(adj);
    var framing = v(ctx, 'body', 'bodyFraming');
    var noun = 'photograph';
    if (ctx.human && (D.framingGroup[framing] === 'close')) noun = 'portrait';

    if (ctx.editing) {
      var out = ['Edit the provided reference image. Change only what is explicitly requested and preserve everything else exactly as it appears in the original.'];
      var ops = m(ctx, 'edit', 'editOps').filter(function (o) { return D.editOps[o]; });
      if (ops.length) out.push('Requested edits: ' + joinList(ops.map(function (o) { return D.editOps[o]; })) + '.');
      var et = t(st.editText);
      if (et) {
        var etEn = hasArabic(et) ? translateAR(et) : et.replace(/"/g, "'");
        out.push('Edit request (follow precisely and keep its full meaning): "' + etEn + '".');
      }
      if (ops.indexOf('Remove Object') !== -1) out.push('Reconstruct the area behind any removed object seamlessly, matching the surrounding textures, lighting, and perspective.');
      if (ops.indexOf('Replace Object') !== -1 || /replace|استبدل|بدل|غير/.test(et)) out.push("Match any replacement to the original scene's lighting, perspective, scale, color, and shadows so it looks naturally integrated.");
      if (adjs.length) out.push('The final result should look like ' + article(adjs[0]) + ' ' + adjs.join(', ') + ' photograph.');
      return out.join(' ');
    }

    var subj = subjectPhrase(ctx);
    var lead = adjs.length ? article(adjs[0]) + ' ' + adjs.join(', ') + ' ' + noun : article(noun) + ' ' + noun;
    if (!adjs.length && ctx.human) lead = 'a realistic ' + noun;
    /* الفكرة الرئيسية: الجملة الأساسية اللي يبنى عليها البروميت كله */
    var mainIdea = t(st.mainIdea);
    var mainEn = mainIdea ? (hasArabic(mainIdea) ? translateAR(mainIdea) : mainIdea) : '';
    if (mainEn) {
      if (ctx.identityOn) {
        return 'Create ' + lead + ' of ' + subj + '. Core scene (the main idea driving this image): ' + sentence(mainEn);
      }
      return 'Create ' + lead + ' of ' + mainEn.replace(/\.$/, '') + '.';
    }
    return 'Create ' + lead + ' of ' + subj + '.';
  }

  function subjectPhrase(ctx) {
    var st = ctx.st, type = st.subjectType, n = Number(st.peopleCount) || 0;
    var details = t(st.subjectDetails);
    var ref = ctx.identityOn;
    var p;
    if (type === 'Custom') p = t(st.subjectTypeCustom) || details || 'the described subject';
    else if (ctx.product) p = ref ? 'the reference ' + (type === 'Product' ? 'product' : 'object') : (details || (type === 'Product' ? 'a product' : 'an object'));
    else if (type === 'Two People') p = ref ? 'the two reference people' : 'two people';
    else if (type === 'Group') p = ref ? 'the reference group of people' : (n > 1 ? 'a group of ' + n + ' people' : 'a group of people');
    else if (type === 'Person' && n > 1) p = ref ? 'the ' + n + ' reference people' : n + ' people';
    else if (type === 'Character') p = ref ? 'the reference character' : 'a character';
    else if (type === 'Person + Product') p = ref ? 'the reference person together with the product' : 'a person together with a product';
    else p = ref ? 'the reference person' : (details && type !== 'Custom' ? details : 'a person');
    if (details && type !== 'Custom' && p.indexOf(details) === -1) p += ' (' + details + ')';
    if (t(st.referenceNote) && ref) p += ', ' + t(st.referenceNote);
    return p;
  }

  function allowedChanges(ctx) {
    var st = ctx.st, allowed = (st.allowedChanges || []).slice();
    if (ctx.visible('appearance')) {
      if (st.hairStyle && allowed.indexOf('Hairstyle') === -1) allowed.push('Hairstyle');
      if (st.hairColor && allowed.indexOf('Hair Color') === -1) allowed.push('Hair Color');
      if (st.beard && allowed.indexOf('Beard') === -1) allowed.push('Beard');
      if (st.age && allowed.indexOf('Age') === -1) allowed.push('Age');
    }
    return allowed;
  }

  function buildIdentity(ctx) {
    var st = ctx.st, out = [];
    if (ctx.identityOn) {
      if (ctx.refImg) {
        var nRefs = (st.refImages && st.refImages.length) || 1;
        if (nRefs > 1) {
          out.push('Use the ' + nRefs + ' attached reference images as the single source of truth for each subject\'s appearance and identity, matching every person to their own reference.');
        } else {
          out.push('Use the attached reference image as the single source of truth for the subject\'s appearance and identity.');
        }
      }
      if (ctx.product) {
        out.push('Preserve the exact design, shape, proportions, colors, materials, labels, and branding of the reference ' + (st.subjectType === 'Object' ? 'object' : 'product') + ' without alteration.');
      } else {
        var allowed = allowedChanges(ctx);
        var who = ctx.plural ? 'every reference person' : 'the reference person';
        var has = function (k) { return allowed.indexOf(k) !== -1; };
        if (st.identity === 'Very Strict') {
          var feats = ['facial structure and proportions', 'eye shape and spacing', 'eyebrows', 'nose shape', 'lips', 'jawline', 'cheek structure', 'ears', 'hairline'];
          if (!has('Hairstyle')) feats.push('hairstyle');
          if (!has('Hair Color')) feats.push('natural hair color');
          if (!has('Beard')) feats.push('beard pattern');
          if (!has('Age')) feats.push('apparent age');
          feats.push('distinctive facial characteristics');
          if (!has('Body Shape')) feats.push('body proportions');
          out.push('Preserve the exact identity and all defining characteristics of ' + who + ' with maximum fidelity.');
          out.push('Keep the ' + joinList(feats) + ' identical to the reference.');
          out.push("Do not change the person's identity, do not create a different face, do not alter facial proportions, and do not beautify the face unnaturally.");
          out.push('Identity preservation takes priority over every stylistic choice in this prompt.');
        } else if (st.identity === 'Strict') {
          var f2 = ['facial structure', 'facial proportions', 'eyes', 'nose', 'lips', 'jawline'];
          if (!has('Hairstyle')) f2.push('hairstyle');
          if (!has('Beard')) f2.push('beard pattern');
          if (!has('Age')) f2.push('apparent age');
          if (!has('Body Shape')) f2.push('body proportions');
          out.push('Preserve the identity of ' + who + ': keep the ' + joinList(f2) + ' consistent with the reference.');
          out.push('Do not create a different face or alter facial proportions.');
        } else {
          out.push('Use the reference image to keep ' + who + ' clearly recognizable, preserving the overall facial features' + (has('Hairstyle') ? '' : ', hairstyle') + (has('Age') ? '' : ', and apparent age') + '.');
        }
        if (allowed.length) out.push('The only permitted identity-related changes are: ' + joinList(allowed.map(lower)) + ', as described below; everything else stays true to the reference.');
        if (has('Age')) ctx.warn('Changing age while preserving identity can reduce identity fidelity.');
      }
      if (ctx.refImg && !ctx.product) {
        if (st.refMatchBody !== false) {
          out.push('Match the subject\'s body proportions, height, build and overall body shape to the reference image.');
        }
        if (st.refMatchPose) {
          out.push('Replicate the subject\'s body posture, limb positioning and hand placement as shown in the reference image.');
        }
      }
    }
    var r = routedFor(ctx, 'identity'); if (r) out.push(r);
    return out.join(' ');
  }

  function buildSubject(ctx) {
    var out = [];
    if (ctx.visible('product')) {
      var pl = phrase(D.placement, v(ctx, 'product', 'productPlacement'));
      var su = phrase(D.surface, v(ctx, 'product', 'productSurface'));
      var fo = m(ctx, 'product', 'productFocus').map(function (x) { return D.productFocus[x]; });
      var parts = [pl, su].filter(Boolean);
      if (parts.length || fo.length) {
        var s = 'The ' + (ctx.st.subjectType === 'Object' ? 'object' : 'product') + ' is ' + (parts.length ? parts.join(', ') : 'presented clearly');
        if (fo.length) s += ', with emphasis on ' + joinList(fo);
        out.push(sentence(s));
      }
    }
    if (ctx.plural && !ctx.editing) out.push('Give each person natural, distinct body language and believable interaction.');
    return out.join(' ');
  }

  function buildAppearance(ctx) {
    if (!ctx.visible('appearance')) return routedFor(ctx, 'appearance');
    var st = ctx.st, sensitive = [], free = [];
    var age = phrase(D.age, v(ctx, 'appearance', 'age'));
    var hs = v(ctx, 'appearance', 'hairStyle'), hc = v(ctx, 'appearance', 'hairColor');
    var color = hc ? lower(isCustom(hc) ? customText(hc) : hc) + ' ' : '';
    var hair = '';
    if (hs === 'Ponytail') hair = color + 'hair tied back in a ponytail';
    else if (hs === 'Bob') hair = article(color || 'b') + ' ' + color + 'bob haircut';
    else if (hs) hair = phrase(D.hairStyle, hs) + ' ' + color + 'hair';
    else if (hc) hair = color + 'hair';
    if (hair) sensitive.push(hair.replace(/\s+/g, ' ').trim());
    var beard = phrase(D.beard, v(ctx, 'appearance', 'beard')); if (beard) sensitive.push(beard);
    var tone = v(ctx, 'appearance', 'skinTone');
    if (tone) {
      var tp = isCustom(tone) ? customText(tone) : lower(tone);
      if (ctx.identityOn) ctx.warn('Skin tone is set while identity preservation is on — the reference skin tone usually works best for identity.');
      free.push(article(tp) + ' ' + tp + ' skin tone');
    }
    var expr = phrase(D.expression, v(ctx, 'appearance', 'expression')); if (expr) free.push(expr);
    var makeup = v(ctx, 'appearance', 'makeup');
    var makeupP = ({ 'Natural': 'natural, subtle makeup', 'Glam': 'glamorous makeup with a healthy glow', 'Bold': 'bold, striking makeup', 'Editorial': 'high-fashion editorial makeup' })[makeup] || '';
    if (makeupP) free.push(makeupP);
    var gender = v(ctx, 'appearance', 'gender');
    var genderP = gender === 'Man' ? 'a man' : gender === 'Woman' ? 'a woman' : '';
    var acc = m(ctx, 'appearance', 'accessories');
    acc = resolveExclusive(acc, [['Glasses', 'Sunglasses'], ['Hat', 'Cap']], 'Accessories', ctx);
    if (acc.indexOf('None') !== -1 && acc.length > 1) { acc = acc.filter(function (x) { return x !== 'None'; }); ctx.warn('Accessories: "None" was ignored because other accessories are selected.'); }
    var accP = acc.filter(function (x) { return x !== 'None'; }).map(function (x) { return x.indexOf('Custom') === 0 ? t(st.accessoriesCustom) : D.accessories[x]; }).filter(Boolean);

    var out = [];
    if (genderP && !ctx.identityOn) out.push(sentence('Clearly depict the subject as ' + genderP));
    if (ctx.identityOn) {
      var free2 = free.slice();
      var s1 = '';
      if (age || free2.length) s1 = ctx.Subj + (age ? (ctx.plural ? ' appear to be ' : ' appears to be ') + age : (ctx.plural ? ' have ' : ' has ')) + (free2.length ? (age ? ' with ' : '') + joinList(free2) : '');
      if (s1) out.push(sentence(s1));
      if (sensitive.length) out.push('Explicitly requested appearance changes (apply them while keeping the face itself unchanged): ' + joinList(sensitive) + '.');
    } else {
      var feats = sensitive.concat(free);
      if (age) out.push(sentence(ctx.Subj + (ctx.plural ? ' appear to be ' : ' appears to be ') + age + (feats.length ? ' with ' + joinList(feats) : '')));
      else if (feats.length) out.push(sentence(ctx.Subj + (ctx.plural ? ' have ' : ' has ') + joinList(feats)));
    }
    if (accP.length) out.push(sentence(ctx.Subj + (ctx.plural ? ' are' : ' is') + ' accessorized with ' + joinList(accP)));
    if (acc.length === 1 && acc[0] === 'None') out.push('No accessories.');
    var r = routedFor(ctx, 'appearance'); if (r) out.push(r);
    return out.join(' ');
  }

  function buildPose(ctx) {
    var r = routedFor(ctx, 'pose');
    if (!ctx.visible('body')) return r;
    var st = ctx.st;
    var pose = m(ctx, 'body', 'pose');
    pose = resolveExclusive(pose, [
      ['Standing', 'Sitting', 'Walking', 'Running', 'Kneeling', 'Lying Down'],
      ['Arms Crossed', 'Hands in Pockets', 'Hand on Face', 'Holding Object', 'One Hand Raised'],
      ['Relaxed Pose', 'Dynamic Pose']
    ], 'Pose', ctx);
    if (pose.indexOf('Both Hands Visible') !== -1 && (pose.indexOf('Hands in Pockets') !== -1 || pose.indexOf('Arms Crossed') !== -1)) {
      pose = pose.filter(function (x) { return x !== 'Both Hands Visible'; });
      ctx.warn('Pose: "Both Hands Visible" removed because the selected arm position hides the hands.');
    }
    var posture = '', head = '', arms = [], styles = [];
    pose.forEach(function (p) {
      if (D.posture[p] && !(ctx.spatial && ctx.spatial.dropMotion && (p === 'Walking' || p === 'Running'))) posture = D.posture[p];
      else if (p === 'Looking Over Shoulder' && !(ctx.spatial && ctx.spatial.gazeOwned && !ctx.spatial.behind)) head = 'looking back over the shoulder';
      else if (p === 'Holding Object' && !(ctx.spatial && ctx.spatial.action === 'Holding')) arms.push('holding ' + (t(st.heldObject) || 'an object') + ' with a believable, anatomically correct grip — fingers wrapped naturally around it, correct hand proportions, clear contact between hand and object, no extra or fused fingers');
      else if (D.arms[p]) arms.push(D.arms[p]);
      else if (D.poseStyle[p]) styles.push(D.poseStyle[p]);
    });
    if (pose.indexOf('Leaning') !== -1) posture = posture ? posture + ' while leaning casually' : 'leaning casually';
    if (posture === 'standing while leaning casually') posture = 'standing and leaning casually';
    var out = [];
    var core = [posture, head].filter(Boolean);
    if (core.length || arms.length || styles.length) {
      var s = core.length ? ctx.subjIs + ' ' + joinList(core) : ctx.subjIs + ' posed';
      if (arms.length) s += ', with ' + joinList(arms);
      if (styles.length) s += ', in ' + article(styles[0]) + ' ' + joinList(styles) + ' pose';
      out.push(sentence(s));
    }
    if (pose.indexOf('Custom Pose') !== -1 && t(st.poseCustom)) out.push('Pose details: ' + sentence(st.poseCustom));
    var envMap = {
      'Touching Wall': 'The subject interacts with the environment by resting a hand naturally against a wall or surface, with believable contact, weight and subtle shadow where the hand meets it.',
      'Leaning on Surface': 'The subject leans against a nearby surface with realistic weight distribution and natural body tension.',
      'Walking Through': 'The subject moves through the scene mid-stride, with natural motion, slight fabric movement and believable foot contact with the ground.',
      'Sitting on Ground': 'The subject sits on the ground with realistic weight, natural fold of clothing and contact shadows.',
      'Hand in Water': 'The subject trails a hand through water with realistic ripples, droplets and light refraction.',
      'Opening Door': 'The subject reaches for and opens a door with a believable grip and natural arm tension.',
      'Holding Prop': 'The subject holds a scene-appropriate prop with a natural, anatomically correct grip.',
      'Looking Around': 'The subject looks around the environment with engaged eyes and a natural head turn, clearly reacting to the surroundings.'
    };
    var envInt = st.envInteraction && envMap[st.envInteraction] ? envMap[st.envInteraction] : '';
    if (envInt) out.push(envInt);
    var gazeMap = {
      'At Camera': 'The subject looks directly into the camera lens with a steady, engaging gaze.',
      'Away': 'The subject looks away from the camera into the distance, as if lost in thought.',
      'Right': 'The subject turns their head and gazes off to the right side of the frame.',
      'Left': 'The subject turns their head and gazes off to the left side of the frame.',
      'Up': 'The subject lifts their chin and looks upward with a hopeful, thoughtful gaze.',
      'Down': 'The subject lowers their gaze downward in a modest, reflective mood.',
      'Over Shoulder': 'The subject looks back over their shoulder toward the camera, head turned behind them.'
    };
    /* إذا كان للفعل المكاني اتجاه نظر خاص به، يُتجاهل اتجاه النظر العام (لا تعارض) */
    if (!(ctx.spatial && ctx.spatial.gazeOwned) && st.gazeDirection && gazeMap[st.gazeDirection]) out.push(gazeMap[st.gazeDirection]);
    if (r) out.push(r);
    return out.join(' ');
  }

  function buildClothing(ctx) {
    var r = routedFor(ctx, 'clothing');
    if (!ctx.visible('clothing')) return r;
    var st = ctx.st;
    var style = phrase(D.clothingStyle, v(ctx, 'clothing', 'clothingStyle'));
    var color = phrase(D.clothingColor, v(ctx, 'clothing', 'clothingColor'));
    var mat = phrase(D.material, v(ctx, 'clothing', 'material'));
    var fit = phrase(D.fit, v(ctx, 'clothing', 'fit'));
    if (fit && v(ctx, 'clothing', 'fit') && isCustom(v(ctx, 'clothing', 'fit'))) fit = fit + ' fit';
    var shoes = phrase(D.shoes, v(ctx, 'clothing', 'shoes'));
    var acc = t(st.clothingAccessories);
    var out = [];
    if (style || color || mat || fit || shoes || acc) {
      var s = ctx.Subj + (ctx.plural ? ' wear ' : ' wears ') + (style || 'an outfit');
      if (color) s += ' in ' + color;
      if (mat) s += ', made of ' + mat;
      if (fit) s += ', with ' + fit;
      if (shoes) s += ', paired with ' + shoes;
      if (acc) s += ', and styled with ' + acc;
      out.push(sentence(s));
      if (ctx.once('fabric')) out.push('Render realistic fabric texture with natural folds and drape.');
      if (style === 'formal attire' && shoes === 'sneakers') ctx.warn('Clothing: Formal attire with sneakers is unusual — kept as requested.');
    }
    if (r) out.push(r);
    return out.join(' ');
  }

  function buildEnvironment(ctx) {
    var st = ctx.st, out = [];
    var bgv = sel(st, 'background');
    var bg = phrase(D.background, bgv);
    var depth = st.bgDepth;
    if (depth && D.flatBackgrounds.indexOf(bgv) !== -1 && (depth === 'Deep Environment' || depth === 'Cinematic Depth')) {
      ctx.warn('Background: "' + bgv + '" has no real depth, so "' + depth + '" was ignored.');
      depth = '';
    }
    var dp = D.bgDepth[depth] || '';
    var persp = st.bgPerspective;
    if (persp && st.cameraPerspective) {
      if (st.cameraPerspective.indexOf(persp) !== 0) ctx.warn('Perspective: Background "' + persp + '" differs from Camera "' + st.cameraPerspective + '". Camera perspective was used.');
      persp = '';
    }
    if (bg) {
      var s = (ctx.editing ? 'Change the setting to ' : 'Set the scene in ') + bg + (dp ? ', ' + dp : '');
      if (persp) s += ', seen with ' + D.bgPerspective[persp];
      out.push(sentence(s));
    } else if (dp || persp) {
      out.push(sentence('Render the environment ' + [dp, persp ? 'with ' + D.bgPerspective[persp] : ''].filter(Boolean).join(', ')));
    }
    if (bgv === 'Gradient Background') {
      var c1 = t(st.gradientColor1), c2 = t(st.gradientColor2);
      if (c1 && c2) {
        out.push('Use a smooth two-color gradient background blending ' + c1 + ' into ' + c2 + ', with a soft seamless transition between the two tones.');
      } else if (c1 || c2) {
        out.push('Use a smooth gradient background anchored on ' + (c1 || c2) + ' with a complementary darker tone.');
      }
    }
    if (t(st.foreground)) out.push('Include ' + t(st.foreground).replace(/\.$/, '') + ' in the foreground.');
    if (t(st.bgElements)) out.push('Include ' + t(st.bgElements).replace(/\.$/, '') + ' in the background.');
    var r = routedFor(ctx, 'background'); if (r) out.push(r);
    return out.join(' ');
  }

  function buildLighting(ctx) {
    var st = ctx.st, out = [];
    var type = st.lightingType, dir = st.lightDirection, inten = st.lightIntensity, sh = st.shadowStrength, temp = st.colorTemp, sec = st.secondaryLight;
    var typeP = D.lightingType[type] || '';
    var implied = D.impliedDir[type];
    if (implied && dir && implied !== dir && !(implied === 'Side' && (dir === 'Left' || dir === 'Right')) && !(implied === 'Top' && dir.indexOf('Top') === 0)) {
      ctx.warn('Lighting: "' + type + '" conflicts with direction "' + dir + '". The explicit direction was used.');
      typeP = 'directional light';
    }
    if (implied && dir === implied) dir = '';
    if (type === 'Soft Light' && sh === 'Dramatic') ctx.warn('Lighting: Soft Light with Dramatic shadows — interpreted as soft light with deep shadow falloff.');
    if (type === 'Soft Light' && (inten === 'Very Strong')) ctx.warn('Lighting: Soft Light at Very Strong intensity — interpreted as bright but diffused light.');
    if (type === 'Golden Hour' && temp === 'Cool') { ctx.warn('Lighting: Golden Hour is naturally warm; "Cool" temperature was ignored.'); temp = ''; }
    if (type === 'Golden Hour' && D.flatBackgrounds.indexOf(st.background) !== -1) ctx.warn('Lighting: Golden Hour in a studio background — interpreted as warm golden-hour style light.');
    if (type === 'Golden Hour' && temp === 'Warm') temp = '';
    if (sec === type) sec = '';
    var lcMap = { Red: 'red', Blue: 'blue', Green: 'green', Pink: 'pink', Yellow: 'yellow', Warm: 'warm amber', Cool: 'cool blue' };
    var lcP = lcMap[st.lightColor] || '';
    if (typeP || dir || inten || sh || temp || sec || lcP) {
      var s = 'Light the scene with ' + (typeP || 'a key light');
      if (dir) s += ' coming ' + D.lightDir[dir];
      if (inten) s += ' at ' + D.intensity[inten];
      if (sh) s += ', creating ' + D.shadow[sh];
      if (temp) s += ', with ' + D.temp[temp];
      if (sec) s += ', complemented by ' + D.secondary[sec];
      if (lcP) s += ', with a ' + lcP + ' colored light that tints the lit side of the subject and casts a matching colored tone into the shadows';
      out.push(sentence(s));
      if (ctx.human && (type === 'Hard Light' || type === 'Strong Directional Light' || type === 'Dramatic Light') && !sh) out.push('Keep the shadows controlled and flattering to facial structure.');
    }
    var r = routedFor(ctx, 'lighting'); if (r) out.push(r);
    return out.join(' ');
  }

  function buildCamera(ctx) {
    var st = ctx.st, out = [];
    var framing = v(ctx, 'body', 'bodyFraming');
    var shot = st.shotType;
    if (framing && shot) {
      if (D.framingGroup[framing] !== D.shotGroup[shot]) ctx.warn('Camera: Shot Type "' + shot + '" conflicts with Body Framing "' + framing + '". Body Framing was used.');
      shot = '';
    }
    var frame = framing ? D.framing[framing] : (shot ? D.shot[shot] : '');
    var lens = st.lens, persp = st.cameraPerspective || '', dist = st.cameraDistance;
    var grp = D.framingGroup[framing] || D.shotGroup[shot];
    if (lens === 'Macro' && grp === 'wide') { ctx.warn('Camera: Macro lens is unsuitable for wide/full-body framing and was ignored.'); lens = ''; }
    if (lens === '24mm' && persp === 'Compressed Perspective') { ctx.warn('Camera: a 24mm lens cannot produce compressed perspective. Perspective was ignored.'); persp = ''; }
    if ((lens === '105mm' || lens === '85mm') && persp === 'Wide Perspective') { ctx.warn('Camera: ' + lens + ' lens conflicts with Wide Perspective. Perspective was ignored.'); persp = ''; }
    if (dist === 'Far' && grp === 'close') { ctx.warn('Camera: "Far" distance conflicts with close-up framing. Distance was ignored.'); dist = ''; }
    if (st.cameraAngle === 'Back Angle' && ctx.identityOn && !ctx.product) ctx.warn('Camera: a back angle hides the face, which limits identity preservation.');
    if (!persp && st.bgPerspective && !st.cameraPerspective) persp = '';
    var angle = D.angle[st.cameraAngle] || '';
    if (frame || angle || lens || dist || persp) {
      var s = frame ? 'Frame the image as ' + frame : 'Capture the image';
      if (angle) s += frame ? ', captured ' + angle : ' ' + angle;
      if (lens) s += ', using ' + D.lens[lens];
      if (dist) s += ', positioned ' + D.distance[dist];
      if (persp) s += ', with ' + D.camPersp[persp];
      out.push(sentence(s));
    }
    if (st.composition && D.composition[st.composition]) out.push(sentence(D.composition[st.composition]));
    if (st.subjectPosition && st.subjectPosition !== 'Off') {
      var posMap = {
        'Left': 'Place the subject on the left side of the frame',
        'Center': 'Place the subject in the center of the frame',
        'Right': 'Place the subject on the right side of the frame',
        'Upper Third': 'Place the subject in the upper third of the frame',
        'Lower Third': 'Place the subject in the lower third of the frame'
      };
      if (posMap[st.subjectPosition]) {
        out.push(sentence(posMap[st.subjectPosition]));
        if (st.textSpace && st.textSpace !== 'Off') {
          var spaceSide = st.subjectPosition === 'Left' ? 'right' : (st.subjectPosition === 'Right' ? 'left' : (st.textSpace === 'Left' ? 'left' : (st.textSpace === 'Right' ? 'right' : st.textSpace.toLowerCase())));
          var tsNote = t(st.textSpaceContent) ? ' (reserved for: "' + t(st.textSpaceContent) + '")' : '';
          out.push('Leave the ' + spaceSide + ' area of the frame clean and empty' + tsNote + ' — no important subject details in that zone.');
        }
      }
    } else if (st.textSpace && st.textSpace !== 'Off') {
      var sideMap = { 'Left': 'left', 'Right': 'right', 'Top': 'top', 'Bottom': 'bottom' };
      var tsNote2 = t(st.textSpaceContent) ? ' (reserved for: "' + t(st.textSpaceContent) + '")' : '';
      out.push(sentence('Leave the ' + (sideMap[st.textSpace] || 'left') + ' area of the frame completely clear and empty' + tsNote2 + ', with no subject or busy detail there'));
    }
    if (st.aspectRatio) out.push('Use a ' + st.aspectRatio + ' aspect ratio.');
    var r = routedFor(ctx, 'camera'); if (r) out.push(r);
    return out.join(' ');
  }

  function buildDof(ctx) {
    var d = ctx.st.dof; if (!d) return '';
    if (ctx.st.lens === 'Macro' && d === 'Deep Focus') ctx.warn('Depth of Field: a macro lens rarely achieves deep focus — consider Moderate Depth.');
    if (D.flatBackgrounds.indexOf(ctx.st.background) !== -1 && (d === 'Extreme Bokeh' || d === 'Cinematic Bokeh')) ctx.warn('Depth of Field: bokeh has little visible effect on a plain studio background.');
    var s = D.dof[d];
    if (ctx.human && /shallow|bokeh/i.test(s)) s = s.replace(/\.$/, '') + ', keeping the eyes in critical focus.';
    return s;
  }

  function buildStyle(ctx) {
    var sv = sel(ctx.st, 'photoStyle'); if (!sv) return '';
    if (isCustom(sv)) return 'Photography style: ' + sentence(customText(sv));
    if (ctx.product && sv === 'Portrait Photography') ctx.warn('Style: Portrait Photography with a product subject — interpreted as a portrait-style product shot.');
    return 'The overall look should convey ' + D.style[sv][1] + '.';
  }

  function grainSentence(ctx) {
    var st = ctx.st, g = ctx.visible('skin') ? st.filmGrain : 'Auto';
    if (g === 'None') return '';
    if (g === 'Subtle') return 'Add subtle, natural film grain.';
    if (g === 'Noticeable') return 'Add visible analog film grain.';
    var cg = st.colorGrading || [];
    if (ctx.human && (cg.indexOf('Film Look') !== -1 || ['Cinematic Photography', 'Documentary Photography', 'Editorial Photography'].indexOf(st.photoStyle) !== -1)) return 'Add subtle film grain for an organic photographic feel.';
    return '';
  }

  function buildSkin(ctx) {
    if (!ctx.human || !ctx.visible('skin')) return '';
    var st = ctx.st, out = [];
    var texMap = { 'Natural': 'natural skin texture', 'Detailed': 'detailed, true-to-life skin texture', 'Highly Detailed': 'highly detailed skin texture', 'Raw': 'raw, unretouched skin texture with every natural detail intact', 'Clean but Natural': 'clean yet natural-looking skin texture' };
    var tex = texMap[st.skinTexture] || 'natural skin texture';
    var ret = st.retouch;
    if (ret === 'Professional' || ret === 'Premium' || ret === 'Editorial') {
      var lvl = { Professional: 'professional', Premium: 'premium, high-end', Editorial: 'editorial-grade' }[ret];
      out.push('Apply ' + lvl + ' realistic retouching while preserving ' + tex + ', visible realistic skin pores, fine facial details, subtle natural imperfections, and natural hair strands.');
      out.push('The skin should respond realistically to light, with lifelike eyes and realistic hands.');
    } else {
      if (ret === 'None') out.push('Do not apply any retouching.');
      else if (ret === 'Natural') out.push('Apply only light, natural retouching.');
      out.push('Render ' + tex + ' with realistic pores, fine facial details, natural imperfections, natural hair strands, realistic eyes, realistic hands, and a natural skin response to light.');
    }
    if (st.retouch === 'Raw' && ret === 'Premium') ctx.warn('Skin: Raw texture with Premium retouch — texture is kept raw, retouch kept subtle.');
    ['hairStrands', 'eyes', 'hands', 'skinTexture'].forEach(function (k) { ctx.once(k); });
    out.push('Avoid plastic, waxy, or airbrushed-looking skin, excessive smoothing, and any artificial beauty filter.');
    return out.join(' ');
  }

  function buildColor(ctx) {
    var st = ctx.st, out = [];
    var cg = (st.colorGrading || []).slice();
    cg = resolveExclusive(cg, [['Warm', 'Cool'], ['High Contrast', 'Low Contrast'], ['Muted', 'Vibrant']], 'Color Grading', ctx);
    if (cg.indexOf('Natural') !== -1 && cg.indexOf('Neutral') !== -1) cg = cg.filter(function (x) { return x !== 'Neutral'; });
    if (cg.indexOf('Warm') !== -1 && st.colorTemp === 'Cool') ctx.warn('Color: Warm grade with Cool light temperature — this creates a mixed look.');
    if (cg.indexOf('Cool') !== -1 && st.colorTemp === 'Warm') ctx.warn('Color: Cool grade with Warm light temperature — this creates a mixed look.');
    if (cg.length) {
      var items = cg.map(function (x) { return D.color[x]; });
      out.push(sentence(cg.indexOf('Cinematic') === 0 ? 'Apply ' + joinList(items) : 'Grade the colors with ' + joinList(items)));
    }
    var g = grainSentence(ctx); if (g && ctx.once('grain')) out.push(g);
    var r = routedFor(ctx, 'color'); if (r) out.push(r);
    return out.join(' ');
  }

  function buildQuality(ctx) {
    var q = (ctx.st.quality || []).slice();
    if (q.indexOf('8K') !== -1) q = q.filter(function (x) { return x !== '4K'; });
    if (q.indexOf('Ultra Photorealistic') !== -1) q = q.filter(function (x) { return x !== 'Photorealistic'; });
    if (ctx.st.photoStyle === 'Ultra Photorealistic' || ctx.st.photoStyle === 'Professional Photography') q = q.filter(function (x) { return x !== 'Ultra Photorealistic'; });
    var humanOnly = { 'Realistic Hands': 'hands', 'Realistic Eyes': 'eyes', 'Detailed Hair': 'hairStrands', 'Accurate Anatomy': null };
    var items = [];
    q.forEach(function (x) {
      // Realism words are already used in the opening sentence ([TASK]) — never repeat them.
      if (x === 'Photorealistic' || x === 'Ultra Photorealistic') return;
      if (humanOnly.hasOwnProperty(x)) {
        if (!ctx.human) return;
        if (humanOnly[x] && !ctx.once(humanOnly[x])) return;
      }
      items.push(D.quality[x]);
    });
    if (ctx.product && ctx.once('productQ')) items.push('accurate product shape and proportions');
    var extra = [];
    if (ctx.human) {
      extra.push('natural micro-contrast in skin and fabric');
      extra.push('realistic light falloff across surfaces');
    }
    extra.push('accurate material response to light');
    extra.push('full-frame camera clarity with clean, noise-free detail');
    var all = items.concat(extra);
    return all.length ? sentence('Ensure ' + joinList(all)) : '';
  }

  function buildPreserve(ctx) {
    if (!ctx.editing) return '';
    var st = ctx.st, ops = st.editOps || [], ch = ctx.changed;
    var has = function (o) { return ops.indexOf(o) !== -1; };
    var bgChange = ch.background || has('Change Background') || !!st.background || !!t(st.bgElements) || !!t(st.foreground);
    var lightChange = ch.lighting || has('Change Lighting') || !!st.lightingType || !!st.lightDirection || !!st.colorTemp || !!st.lightIntensity || !!st.shadowStrength;
    var camChange = ch.camera || has('Change Camera') || !!st.cameraAngle || !!st.lens || !!st.shotType || !!st.cameraDistance || !!st.composition;
    var poseChange = ch.pose || has('Change Pose') || (ctx.visible('body') && ((st.pose || []).length > 0 || !!st.bodyFraming));
    var clothChange = ch.clothing || has('Change Clothing') || (ctx.visible('clothing') && (!!st.clothingStyle || !!st.clothingColor || !!st.material || !!st.fit || !!st.shoes));
    var objChange = has('Replace Object') || has('Remove Object');
    var out = [];
    if (has('Preserve Everything Else') || !ops.length) {
      if (!camChange) out.push('Preserve the original composition, camera angle, and framing.');
      if (!bgChange) out.push('Preserve the original background.');
      if (!lightChange) out.push('Preserve the original lighting.');
      if (!poseChange && ctx.human) out.push('Preserve the original pose.');
      if (!clothChange && ctx.human) out.push('Preserve the original clothing.');
      if (ctx.human && !ctx.identityOn) out.push('Preserve facial identity and body proportions.');
      out.push(objChange ? 'Preserve the positions of all unaffected objects and people.' : 'Preserve object positions.');
    }
    out.push('Do not alter unrelated elements; change only the specified elements.');
    return out.join(' ');
  }

  function buildCustom(ctx) {
    var out = (ctx.routed.other || []).slice();
    var all = t(ctx.st.customText) + ' ' + t(ctx.st.editText);
    if (hasArabic(all)) out.push('All custom instructions have been translated faithfully; follow their exact meaning.');
    if (ctx.st.customPriority === 'Critical' && t(ctx.st.customText)) out.push('Every instruction marked CRITICAL is mandatory and must be preserved exactly.');
    return out.join(' ');
  }

  function buildNegative(ctx) {
    var st = ctx.st, list = [];
    if (st.autoNegative !== false) {
      var allowed = ctx.human ? allowedChanges(ctx) : [];
      if (ctx.identityOn && !ctx.product) {
        list.push('identity change', 'different face', 'altered facial features', 'changed facial proportions');
        if (allowed.indexOf('Age') === -1) list.push('age change');
        list.push('unnatural beautification');
      }
      if (ctx.identityOn && ctx.product) list.push('altered product design', 'changed branding');
      if (ctx.human) {
        list.push('plastic skin', 'waxy skin', 'excessive skin smoothing', 'airbrushed skin', 'fake pores', 'over-retouching', 'artificial beauty filter');
        list.push('unnatural anatomy', 'deformed hands', 'extra fingers', 'missing fingers', 'distorted eyes', 'asymmetrical facial distortion');
      }
      if (ctx.product) list.push('warped product shape', 'distorted labels', 'incorrect proportions');
      if (ctx.editing) list.push('altered unrelated elements', 'inconsistent lighting on edited areas', 'visible editing seams');
      if (st.dof === 'Deep Focus') list.push('background blur');
      if (/Shallow|Bokeh/.test(st.dof || '')) list.push('blurry subject');
      list.push('blurry details', 'low quality');
      if (ctx.product) list.push('unwanted text', 'extra logos', 'watermark');
      else list.push('text', 'logo', 'watermark');
    }
    t(st.negativeExtra).split(/[,\n،]+/).map(t).filter(Boolean).forEach(function (x) { list.push(x); });
    var seen = {}, out = [];
    list.forEach(function (x) { var k = x.toLowerCase(); if (!seen[k]) { seen[k] = true; out.push(x); } });
    return out.join(', ');
  }

  /* ---------------- main API ---------------- */
  function isEmpty(st, defaults) {
    var keys = Object.keys(defaults);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], a = st[k], b = defaults[k];
      if (k === 'mode') continue;
      if (Array.isArray(a) || Array.isArray(b)) { if (JSON.stringify(a || []) !== JSON.stringify(b || [])) return false; }
      else if ((a == null ? '' : a) !== (b == null ? '' : b)) return false;
    }
    return st.mode !== 'Editing' || !t(st.editText);
  }

  /** Main entry point. Returns {ok, error?, prompt, positive, negative, warnings}. */
  function generate(state, settings) {
    settings = settings || {};
    var st = JSON.parse(JSON.stringify(state || {}));

    /* كاشف التعارضات: يمنع التوليد عند اختيارات متضاربة ويشرح السبب */
    if (PS.CompositionPreview && st.mode !== 'Editing') {
      var clashes = PS.CompositionPreview.conflicts(st);
      if (clashes.length) {
        return { ok: false, error: 'تعارض في الاختيارات — عدّل أحدها قبل التوليد:\n• ' + clashes.join('\n• '), conflicts: clashes };
      }
    }
    var defaults = S().defaultState(settings);
    var hasUserInput = !isEmpty(st, defaults) || (st.mode === 'Editing' && t(st.editText));
    if (!hasUserInput && !(st.mode === 'Editing' && (st.editOps || []).length > 1)) {
      return { ok: false, error: 'اختر خياراً واحداً على الأقل أو أضف تعليمة مخصصة.' };
    }
    var ctx = makeCtx(st, settings);

    // Route custom instructions into the right sections.
    splitInstructions(st.customText).forEach(function (seg) {
      var c = classify(seg);
      if (!c.preserve && ctx.editing) ctx.changed[c.cat] = true;
      var cat = c.cat;
      if (c.preserve && ctx.editing && cat === 'other') cat = 'other';
      (ctx.routed[cat] = ctx.routed[cat] || []).push(renderInstruction(seg, st.customPriority, settings.promptLanguage));
    });
    if (ctx.editing && t(st.editText)) {
      splitInstructions(st.editText).forEach(function (seg) { var c = classify(seg); if (!c.preserve) ctx.changed[c.cat] = true; });
    }

    /* Spatial Scene Composition: العلاقة المكانية بين الشخص والعنصر قبل الصياغة */
    var spatial = { active: false, text: '', gazeOwned: false, dropMotion: false, behind: false, action: '', warnings: [] };
    try { if (PS.Spatial) spatial = PS.Spatial.buildSpatialCompositionPrompt(st, ctx) || spatial; }
    catch (e) { console.warn('[Spatial]', e); }
    (spatial.warnings || []).forEach(function (w) { ctx.warn(w); });
    ctx.spatial = spatial;

    /* قصة الصورة: تُدمج كسياق يوجّه كل القرارات */
    var storyLine = '';
    try { storyLine = (PS.CompositionPreview && PS.CompositionPreview.storyNote(st)) || ''; } catch (e) { storyLine = ''; }
    if (storyLine) ctx.routed.other = (ctx.routed.other || []).concat([storyLine]);

    var designBlock = '';
    try { designBlock = (PS.DesignLibrary && PS.DesignLibrary.build(st, ctx)) || ''; }
    catch (e) { console.warn('[Design]', e); }

    var tokens = {
      TASK: buildTask(ctx), IDENTITY: buildIdentity(ctx), SUBJECT: buildSubject(ctx),
      APPEARANCE: buildAppearance(ctx), POSE: buildPose(ctx), CLOTHING: buildClothing(ctx),
      DESIGN: designBlock, SPATIAL: spatial.text,
      ENVIRONMENT: buildEnvironment(ctx), LIGHTING: buildLighting(ctx), CAMERA: buildCamera(ctx),
      DOF: buildDof(ctx), STYLE: buildStyle(ctx), SKIN: buildSkin(ctx), COLOR: buildColor(ctx),
      QUALITY: buildQuality(ctx), PRESERVE: buildPreserve(ctx), CUSTOM: buildCustom(ctx)
    };
    /* توافق مع القوالب القديمة التي لا تحتوي [SPATIAL]: يُدمج الوصف المكاني مع الوضعية */
    if (spatial.text && (settings.template || S().DEFAULT_TEMPLATE).indexOf('[SPATIAL]') === -1) {
      tokens.POSE = (tokens.POSE ? tokens.POSE + ' ' : '') + spatial.text;
    }
    var negative = buildNegative(ctx);
    tokens.NEGATIVE = negative ? 'Negative prompt: ' + negative : '';

    var positive = render(settings.template || S().DEFAULT_TEMPLATE, tokens, settings.outputFormat);
    return { ok: true, prompt: positive, negative: negative, warnings: ctx.warnings, tokens: tokens };
  }

  function render(template, tokens, format) {
    if (template.indexOf('[NEGATIVE]') === -1) template += '\n[NEGATIVE]';
    var lines = template.split('\n').map(function (line) {
      return line.replace(/\[([A-Z]+)\]/g, function (_, k) { return tokens[k] !== undefined ? tokens[k] : ''; })
        .replace(/[ \t]+/g, ' ').replace(/\s+([.,])/g, '$1').trim();
    }).filter(Boolean);
    var negLine = lines.filter(function (l) { return l.indexOf('Negative prompt:') === 0; });
    var body = lines.filter(function (l) { return l.indexOf('Negative prompt:') !== 0; });
    var text = format === 'Single Paragraph' ? body.join(' ') : body.join('\n\n');
    if (negLine.length) text += '\n\n' + negLine.join(' ');
    return text.replace(/\.\./g, '.');
  }

  /* ==========================================================================
     SMART LOGIC — يحوّل جملة عربية بسيطة إلى بروميت احترافي كامل.
     المستخدم يكتب: "خليه واقف قدام عربية بالليل"
     المحرك يكتشف الموضوع/الوضعية/المكان/الوقت/الإضاءة ويضيف التفاصيل
     الناقصة (إضاءة، انعكاسات، ظلال، تكوين، كاميرا، واقعية) بدون ما يغيّر
     الطلب الأساسي.
     ========================================================================== */
  var SL = {
    /* (كلمة عربية/إنجليزية) → (فئة, قيمة إنجليزية للحقل أو نص مكمل) */
    subject: [
      { re: /\bعربية|سيارة|كار|car\b/i, en: 'a car', field: 'car' },
      { re: /\bعراقي|شخص|راجل|رجالة|ولد|شاب|man|person\b/i, en: 'a man', field: 'person' },
      { re: /\bست|امرأة|بنت|شابة|woman|girl\b/i, en: 'a woman', field: 'person' },
      { re: /\بطفل|baby|child\b/i, en: 'a child', field: 'person' },
      { re: /\bقطة|cat\b/i, en: 'a cat', field: 'animal' },
      { re: /\بكلب|dog\b/i, en: 'a dog', field: 'animal' },
      { re: /\bمقهى|coffee shop|cafe\b/i, en: 'a coffee shop', field: 'cafe' },
      { re: /\bشاطئ|بحر|sea|beach\b/i, en: 'a beach by the sea', field: 'beach' },
      { re: /\بمدينة|شارع|street|city\b/i, en: 'a city street', field: 'city' },
      { re: /\بصحراء|desert\b/i, en: 'a desert', field: 'desert' },
      { re: /\بغابة|forest|شجر|trees\b/i, en: 'a forest', field: 'forest' }
    ],
    pose: [
      { re: /\bواقف|وقف|يرجع|standing\b/i, en: 'standing' },
      { re: /\bقاعدة|قاعد|جالس|sitting\b/i, en: 'sitting' },
      { re: /\bماشي|يمشي|walking\b/i, en: 'walking' },
      { re: /\بجري|running\b/i, en: 'running' },
      { re: /\bمستند|leaning\b/i, en: 'leaning' }
    ],
    time: [
      { re: /\bليل|بالليل|مساء|ليلة|night|evening\b/i, en: 'at night' },
      { re: /\Bصباح|فجر|day\b/i, en: 'during the day' },
      { re: /\Bغروب|sunset|golden hour\b/i, en: 'at sunset' },
      { re: /\Bشروق|sunrise\b/i, en: 'at sunrise' }
    ],
    location: [
      { re: /\bقدام|أمام|بجانب|جنب|near|in front|next to\b/i, en: 'in front of' },
      { re: /\bورا|خلف|behind\b/i, en: 'behind' },
      { re: /\bجوه|داخل|inside\b/i, en: 'inside' },
      { re: /\bبرا|خارج|outside\b/i, en: 'outside' }
    ],
    holding: [
      { re: /\bماسك|يمسك|تمسك|بيمسك|بيتمسك|holding|holds|carry|carrying\b/i, en: 'holding' }
    ],
    objects: [
      { re: /\bكوب|قهوة|قهوه|coffee|cup\b/i, en: 'a cup of coffee' },
      { re: /\bكتاب|book\b/i, en: 'a book' },
      { re: /\bموبايل|تليفون|هاتف|phone\b/i, en: 'a phone' },
      { re: /\bشنطة|شنطه|bag\b/i, en: 'a bag' },
      { re: /\bنظارة|نظاره|glasses\b/i, en: 'a pair of glasses' },
      { re: /\bعطر|perfume\b/i, en: 'a perfume bottle' },
      { re: /\بورد|flowers?|زهرة|زهره\b/i, en: 'flowers' },
      { re: /\bسيف|sword\b/i, en: 'a sword' },
      { re: /\bميكروفون|microphone\b/i, en: 'a microphone' },
      { re: /\bمنتج|منتج advertisement|product\b/i, en: 'the product' }
    ],
    clothing: [
      { re: /\bقميص|shirt\b/i, en: 'a shirt' },
      { re: /\bتيشيرت|t-?shirt\b/i, en: 'a t-shirt' },
      { re: /\bجاكيت|jacket\b/i, en: 'a jacket' },
      { re: /\بعباية|abaya\b/i, en: 'an abaya' },
      { re: /\bبدلة|suit\b/i, en: 'a suit' }
    ]
  };

  function smartLogic(text, settings) {
    text = t(text);
    if (!text) return { ok: false, error: 'اكتب جملة أولاً — مثال: خليه واقف قدام عربية بالليل.' };

    var found = { subject: null, poses: [], time: null, location: null, clothing: null, other: [] };

    function testList(list) {
      for (var i = 0; i < list.length; i++) { if (list[i].re.test(text)) return list[i]; }
      return null;
    }

    SL.subject.forEach(function (o) { if (!found.subject && o.re.test(text)) found.subject = o; });
    SL.pose.forEach(function (o) { if (o.re.test(text)) found.poses.push(o.en); });
    found.time = testList(SL.time);
    found.location = testList(SL.location);
    found.clothing = testList(SL.clothing);
    found.holding = testList(SL.holding);
    found.heldObject = testList(SL.objects);

    /* 1. الموضوع الأساسي */
    var parts = [];
    var isPerson = found.subject && found.subject.field === 'person';
    var subjEn = found.subject ? found.subject.en : 'the subject';
    parts.push('Create an ultra-photorealistic image of ' + subjEn + '.');

    /* 2. الوضعية */
    if (found.poses.length) parts.push('The subject is ' + found.poses.join(' and ') + '.');

    /* 3. الموقع والبيئة */
    var sceneBits = [];
    if (found.location) sceneBits.push(found.location.en);
    var envName = found.subject ? found.subject.en : null;
    if (envName && !found.location) sceneBits.push('in front of');
    if (envName) sceneBits.push(envName);
    if (sceneBits.length && !(found.subject && found.subject.field === 'person' && !found.location)) {
      /* handled below */
    }

    /* 4. الوقت والإضاءة */
    var isNight = found.time && /night/i.test(found.time.en);
    var lightLine = '';
    if (isNight) {
      lightLine = 'Light the scene with realistic night lighting: soft ambient street lights, warm practical glow, strong rim light separating the subject from the dark background, believable falloff into deep shadows, and subtle light bloom.';
    } else if (found.time && /sunset/i.test(found.time.en)) {
      lightLine = 'Light the scene with warm golden-hour sunset light: long soft shadows, warm rim light, and gentle atmospheric haze.';
    } else if (found.time && /sunrise/i.test(found.time.en)) {
      lightLine = 'Light the scene with cool, soft sunrise light: gentle directional rays, long soft shadows and fresh morning haze.';
    } else if (found.time) {
      lightLine = 'Light the scene with natural daylight: soft directional key light, balanced fill and realistic ambient bounce.';
    } else {
      lightLine = 'Light the scene with cinematic, motivated lighting that matches the environment, with controlled shadows and realistic falloff.';
    }
    parts.push(lightLine);

    /* 5. المشهد (بيئة كاملة) */
    var sceneLine = 'Set the scene ' + (found.location ? found.location.en + ' ' : '') +
      (found.subject && found.subject.field !== 'person' ? found.subject.en : 'the subject') +
      (found.time ? ', ' + found.time.en : '') + '.';
    if (found.subject && found.subject.field === 'person') {
      sceneLine = 'Place the subject ' + (found.location ? found.location.en + ' ' : 'within ') +
        (found.subject.field === 'person' ? 'the environment' : found.subject.en) +
        (found.time ? ', ' + found.time.en : '') + ', integrated naturally into the surroundings.';
    }
    parts.push(sceneLine);

    /* 6. الملابس إن وجدت */
    if (found.clothing) parts.push('The subject wears ' + found.clothing.en + ' with realistic fabric texture and natural folds.');

    /* 6ب. الشيء الممسوك — تفاصيل قوية */
    if (found.holding) {
      var objEn = found.heldObject ? found.heldObject.en : 'an object';
      parts.push('The subject holds ' + objEn + ' in hand. Render the object clearly with an anatomically correct, believable grip: fingers wrapped naturally around the object, correct hand proportions, visible contact between hand and object, and no extra or fused fingers.');
    }

    /* 7. التفاصيل الذكية الناقصة */
    if (isNight) {
      parts.push('Add believable night-scene details: reflective surfaces catching the light, wet or glossy ground reflections if present, subtle atmospheric depth, and realistic light falloff into darkness.');
      parts.push('Keep the shadows deep but detailed — never crushed to pure black.');
    }
    if (isPerson) {
      parts.push('Render realistic skin texture with visible pores, natural hair strands, and anatomically correct hands and eyes.');
      parts.push('The subject interacts naturally with the environment — believable weight, contact shadows and body tension.');
    }
    if (found.subject && found.subject.field === 'car') {
      parts.push('Render the car with realistic paint reflections mirroring the surroundings, accurate chrome and glass reflections, and correct body proportions.');
    }
    parts.push('Use a composed cinematic framing with clear depth, natural perspective, and sharp subject detail against a softly separated background.');
    parts.push('Apply a subtle film grain and realistic color grading that supports the mood without looking filtered.');

    /* 8. الطلب الأصلي — مترجم للإنجليزية حتى لا يظهر أي حرف عربي في الناتج */
    var originalEn = hasArabic(text) ? translateAR(text) : text;
    parts.push('Original user request (must be honored exactly, never altered or shortened): "' + originalEn + '"');

    var prompt = parts.join('\n');
    var negative = 'identity change, different face, altered facial features, plastic skin, waxy skin, excessive skin smoothing, airbrushed skin, unnatural anatomy, deformed hands, extra fingers, missing fingers, distorted eyes, blurry details, low quality, text, watermark, logo';

    return { ok: true, prompt: prompt, negative: negative, warnings: [] };
  }

  /* ============ تكييف الصيغة حسب موديل الهدف ============ */
  function adaptToModel(prompt, negative, model, st) {
    if (!prompt) return prompt;
    model = model || 'Universal';
    var ar = (st && st.aspectRatio) ? String(st.aspectRatio) : '16:9';
    if (model === 'Midjourney') {
      var neg = String(negative || '').split(',').slice(0, 6).map(function (x) { return x.trim(); }).filter(Boolean).join(', ');
      return prompt + ' --ar ' + ar + ' --v 6.1 --style raw' + (neg ? ' --no ' + neg : '');
    }
    if (model === 'Flux') {
      return prompt + ' Compose the final frame as a coherent, physically plausible photograph with natural cinematic depth. Avoid any text, captions, logos or watermarks.';
    }
    if (model === 'Stable Diffusion XL') {
      return 'masterpiece, best quality, ultra-detailed, professional, ' + prompt + '\n\nNegative prompt: ' + (negative || 'text, watermark, logo');
    }
    if (model === 'DALL-E 3') {
      return prompt + ' Create the image with absolutely no text, captions, logos or watermarks anywhere in the frame.';
    }
    if (model === 'Nano Banana / GPT Image') {
      return prompt + ' Keep every element coherent and physically plausible with accurate lighting, consistent shadows and true material response. No text or watermarks unless explicitly requested.';
    }
    return prompt;
  }

  PS.PromptEngine = {
    generate: generate,
    classify: classify,
    splitInstructions: splitInstructions,
    smartLogic: smartLogic,
    translate: translateAR,
    adaptToModel: adaptToModel,
    /* Future: model-specific adapters, e.g. adapters.midjourney = fn(result) => string */
    adapters: {}
  };
})();
