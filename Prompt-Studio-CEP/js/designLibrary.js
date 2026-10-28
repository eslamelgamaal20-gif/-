/* ==========================================================================
   EMG — designLibrary.js
   مكتبة أنواع التصميم الإعلاني + محوّلها إلى بروميت بصري احترافي +
   نظام التوافق والتحذيرات + مولّد الاتجاه الإبداعي التلقائي.
   كل خيار: [الاسم العربي, وصف 3 كلمات, تعليمة تنفيذ بصرية بالإنجليزية]
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});

  var CATS = [
    {
      id: 'concept', title: 'الإعلانات المفاهيمية والأفكار الإبداعية', options: [
        ['تصميم قائم على الظلال', 'ظلال تصنع الفكرة', 'shadow-led concept: render the subject or product in strong silhouette with a long cast shadow whose shape itself forms the advertising idea — the shadow reveals a recognizable shape or symbol that carries the message'],
        ['الاستعارة البصرية', 'صورة تحمل معنى', 'visual metaphor: connect the product to a familiar object through a single striking visual analogy, so the viewer reads the meaning instantly without any text'],
        ['الخداع البصري', 'مشهد يخدع العين', 'optical illusion: build one impossible visual trick where two readings of the same image coexist, executed with precise alignment so the illusion reads cleanly at a glance'],
        ['الإعلان السريالي', 'واقع يكسر المنطق', 'surreal advertising scene: break the laws of physics deliberately — impossible scale, gravity or context — while keeping materials, light and shadows physically believable'],
        ['التعريض المزدوج', 'صورتان داخل صورة', 'double exposure: blend two scenes into one silhouette — the product or person outline filled with a second meaningful environment'],
        ['المساحة السلبية', 'الفراغ يصنع المعنى', 'negative-space concept: let the empty space around the subject form a hidden shape or direction that delivers the message'],
        ['التضاد البصري', 'عناصر تصنع التناقض', 'visual contrast concept: pair two opposing elements — hard vs soft, tiny vs huge, dark vs bright — to make one clear idea dominant'],
        ['الرمزية البصرية', 'رموز تحمل رسائل', 'symbolic concept: use one universally readable symbol beside the product to communicate the promise visually'],
        ['تحويل الأشياء', 'عنصر يتحول لآخر', 'object metamorphosis: morph one material or object into another in a single continuous transformation'],
        ['التشبيه البصري', 'منتج يشبه شيئًا', 'visual simile: shape or place the product so it clearly resembles another familiar object, keeping both forms readable'],
        ['المفاجأة البصرية', 'تفصيل غير متوقع', 'visual surprise: keep the composition classic, then break it with one unexpected detail placed where the eye lands second'],
        ['المقارنة البصرية', 'فكرتان متقابلتان بوضوح', 'before/after visual comparison: split the frame into two clearly divided states that read instantly as a transformation'],
        ['المبالغة الإعلانية', 'حجم يتجاوز الواقع', 'hyperbolic exaggeration: amplify one product benefit to an impossible visual scale while keeping the rendering realistic'],
        ['اللعب بالأحجام', 'أحجام غير منطقية', 'scale play: mix wildly different sizes in one scene — giant product, tiny people — with consistent lighting so it still feels real'],
        ['القصة داخل صورة', 'مشهد يحكي قصة', 'story-in-one-frame: compose a single frozen moment that implies a clear before and after, with readable body language and staging'],
        ['الإعلان القائم على المفارقة', 'توقعات تنقلب فجأة', 'paradox advertising: set up a familiar expectation in the composition, then invert it with one clever visual twist'],
        ['الدمج بين العناصر', 'عناصر تصنع فكرة', 'element fusion: physically merge the product with a second object into one seamless hybrid form'],
        ['الإعلان القائم على اللغز', 'فكرة تحتاج اكتشافًا', 'puzzle-based ad: hide a second layer of meaning that the viewer discovers on a second look, without harming the first impression']
      ]
    },
    {
      id: 'motion', title: 'الحركة والديناميكية', options: [
        ['مسارات الحركة', 'خطوط توحي بالسرعة', 'motion trails: draw clean directional streaks behind moving elements to imply fast movement through the still frame'],
        ['الإنسان أثناء الحركة', 'حركة بشرية ديناميكية', 'human in motion: capture the body mid-action with believable weight shift, fabric movement and natural balance'],
        ['تجميد الحركة', 'لحظة ثابتة مثيرة', 'frozen action: freeze a high-energy moment at its peak — hair, fabric and particles suspended mid-air with sharp detail'],
        ['ضبابية الحركة', 'حركة تبدو سريعة', 'motion blur: apply realistic directional blur to moving parts only, keeping the subject sharp for a fast cinematic feel'],
        ['الحركة المتعددة', 'مراحل حركة متتابعة', 'sequential motion: repeat the same subject in progressive phases across one frame to show a movement sequence'],
        ['الحركة الانفجارية', 'عناصر تنطلق للخارج', 'explosive motion: launch elements radially outward from the center with physics-based speed and debris direction'],
        ['التكوين القطري', 'زوايا تمنح ديناميكية', 'diagonal composition: build the whole frame on strong diagonal lines that create tension and forward energy'],
        ['الطيران والتحليق', 'عناصر معلقة بالهواء', 'flying composition: suspend the subject or product mid-air with a believable arc, tilt and floating fabric'],
        ['تطاير العناصر', 'عناصر تتناثر حول', 'scattering elements: swirl small particles, petals, powder or fragments around the subject with natural density falloff'],
        ['الحركة الدائرية', 'حركة تلفت الانتباه', 'circular motion: arrange elements in a rotating sweep around the subject so the eye circles the frame'],
        ['تأثير السرعة', 'إحساس بصري سريع', 'speed effect: combine streaking background lines, tilted horizon and directional blur for a strong velocity feel'],
        ['الحركة المتجمدة', 'حركة متوقفة فجأة', 'abrupt stop: freeze a fast motion at the exact instant of impact or halt, with elements still reacting around it'],
        ['التفاعل مع المنتج', 'شخص يتفاعل طبيعيًا', 'natural product interaction: show a person genuinely using or touching the product with correct hand contact and believable body tension'],
        ['الحركة الرياضية', 'أداء رياضي قوي', 'athletic motion: capture peak sports performance with accurate muscle tension, dynamic silhouette and airborne energy'],
        ['الحركة السينمائية', 'لقطة مليئة بالحركة', 'cinematic motion: combine tracking energy, atmospheric elements and dramatic timing into one film-still frame']
      ]
    },
    {
      id: 'perspective', title: 'المنظور والتكوين ثلاثي الأبعاد', options: [
        ['المنظور القسري', 'منظور يغير الأحجام', 'forced perspective: bend apparent size relationships so distant and near elements read at impossible relative scales, executed with one consistent vanishing point'],
        ['المنظور المبالغ فيه', 'عمق بصري مبالغ', 'exaggerated perspective: stretch depth with a wide lens so foreground elements dominate and the space feels dramatic'],
        ['المجسمات الضخمة', 'منتج بحجم عملاق', 'giant product: scale the product to monument size within a real environment, with correct reflections, shadows and tiny human scale cues'],
        ['الإنسان المصغر', 'شخص بحجم صغير', 'miniaturized person: render the person at tiny scale inside a normal-sized world with macro-level detail and believable contact shadows'],
        ['المسرح الهندسي ثلاثي الأبعاد', 'أشكال تصنع مسرحًا', '3D geometric stage: build the set from clean geometric platforms, arches and blocks that stage the subject like a theatre'],
        ['البيئة أحادية اللون ثلاثي الأبعاد', 'لون يصنع مساحة', 'monochrome 3D environment: construct the entire space from one color family in matte 3D surfaces so the subject defines the scene'],
        ['الغرفة اللونية المجسمة', 'جدران بأبعاد واضحة', 'volumetric color room: place the subject inside a physical room where each surface carries a distinct tone with clear corner depth'],
        ['منظور الأيزومتريك', 'زاوية هندسية ثابتة', 'isometric view: render the scene from a fixed 45-degree technical angle with parallel lines and no perspective distortion'],
        ['العمق متعدد الطبقات', 'طبقات تصنع عمقًا', 'multi-layer depth: stack clearly separated foreground, midground and background planes with atmospheric separation'],
        ['العناصر العائمة', 'أشياء تطفو بصريًا', 'floating elements: suspend objects weightlessly around the subject with consistent soft shadows proving their height'],
        ['منصة عرض المنتج', 'منتج فوق منصة', 'product pedestal: present the subject on a clean raised platform with a deliberate step between stage and space'],
        ['المنظور من الأعلى', 'مشهد من الأعلى', 'top-down view: look straight down onto a carefully laid-out flat composition with graphic clarity'],
        ['المنظور من الأسفل', 'زاوية تمنح الهيبة', 'low heroic view: shoot upward from ground level so the subject towers with power and scale'],
        ['المنظور القريب جدًا', 'عنصر يملأ الإطار', 'extreme close perspective: let one element fill nearly the entire frame with edge-to-edge detail'],
        ['المشهد المقطعي', 'داخل العنصر ظاهر', 'cross-section view: cut the subject open visually to reveal internal layers with clean technical edges'],
        ['العرض التفجيري', 'أجزاء منفصلة متباعدة', 'exploded view: separate the product components into floating ordered layers with precise spacing like a technical breakdown'],
        ['المجسمات المتداخلة', 'أشكال تتداخل مكانيًا', 'interlocking solids: weave geometric volumes through each other with real depth occlusion'],
        ['التكوين المعماري', 'مساحات تشبه المباني', 'architectural composition: organize the frame like modern architecture — planes, voids and structural lines'],
        ['المشهد داخل إطار', 'عالم داخل إطار', 'scene inside a frame: build a complete world contained within a visible physical frame or window'],
        ['تأثير النفق', 'عمق يقود العين', 'tunnel effect: repeat concentric shapes receding into depth to pull the eye straight to the subject']
      ]
    },
    {
      id: 'graphic', title: 'الأساليب الجرافيكية والتصميمية', options: [
        ['تصميم الزجاج الشفاف', 'شفافية وطبقات ناعمة', 'glassmorphism: layer frosted translucent panels with soft light bleed, subtle borders and blurred depth behind the product'],
        ['التصميم أحادي اللون', 'لون واحد مسيطر', 'monochrome design: build the entire image from one hue with value steps only, so shape and light carry the composition'],
        ['التصميم السويسري', 'نظام بسيط ومنظم', 'Swiss design: strict grid alignment, restrained typography space and objective clarity in every element placement'],
        ['التصميم البسيط', 'عناصر قليلة مؤثرة', 'minimal design: strip the frame to one subject, one background and one accent — nothing decorative survives'],
        ['التصميم التحريري', 'تكوين يشبه المجلات', 'editorial design: compose like a premium magazine spread with deliberate asymmetric balance and generous margins'],
        ['التصميم الوحشي', 'أشكال جريئة وخشنة', 'brutalist design: raw concrete textures, heavy blocky forms and unpolished honest geometry'],
        ['تصميم الكولاج', 'صور وطبقات متداخلة', 'collage design: overlap torn photographic layers, paper edges and cut-outs into one assembled composition'],
        ['تصميم الريترو', 'روح بصرية قديمة', 'retro design: revive a vintage era with period-correct colors, props, print texture and faded warmth'],
        ['تصميم المستقبل القديم', 'مستقبل بروح قديمة', 'retro-futurism: imagine the future through an old lens — analog panels, chunky tech and aged optimism'],
        ['تصميم الألفينات', 'ألوان جريئة لامعة', 'Y2K design: glossy chrome, electric gradients and millennium-era optimism with shiny plastic surfaces'],
        ['تصميم الباوهاوس', 'أشكال هندسية واضحة', 'Bauhaus design: pure circles, squares and triangles in primary colors with functional geometric order'],
        ['تصميم الطباعة الجريئة', 'حروف كبيرة مسيطرة', 'bold typography design: let oversized type dominate the composition as a graphic element beside the product'],
        ['تصميم الشبكات', 'محاذاة دقيقة ومنضبطة', 'grid design: align every element to a visible modular grid with mathematical precision'],
        ['تصميم المساحات البيضاء', 'فراغات تمنح تنفسًا', 'white-space design: let large clean empty areas breathe around a small perfectly placed subject'],
        ['تصميم الألوان المتضادة', 'ألوان متباينة قوية', 'high-contrast color design: clash two saturated opposing colors so the product pops hard against its field'],
        ['تصميم اللونين', 'لونان يصنعان تباينًا', 'duotone design: map the whole image into exactly two colors for a strong graphic identity'],
        ['تصميم التدرجات', 'ألوان تنساب تدريجيًا', 'gradient design: bathe the scene in smooth multi-stop color transitions flowing behind crisp subject edges'],
        ['تصميم الأشكال السائلة', 'أشكال ناعمة متدفقة', 'liquid shapes design: surround the subject with soft flowing blob forms that feel poured and organic'],
        ['تصميم الكروم المعدني', 'انعكاسات معدنية لامعة', 'chrome design: wrap surfaces in polished liquid metal with mirror-like environment reflections'],
        ['تصميم الهولوجرام', 'ألوان ضوئية مستقبلية', 'hologram design: project iridescent scan-line light and spectral color fringing into the air'],
        ['تصميم ثلاثي الأبعاد', 'أشكال بعمق واقعي', '3D design: render every element as a physically lit three-dimensional object with soft studio shadows'],
        ['تصميم الطباعة التجريبية', 'حروف بتكوين مبتكر', 'experimental typography design: break and重组 type into an inventive composition that still stays readable'],
        ['تصميم الملصقات', 'تكوين ملصق جريء', 'poster design: build a bold poster-like composition with one dominant visual and strong graphic hierarchy'],
        ['تصميم القصاصات الورقية', 'طبقات ورقية ملموسة', 'paper-cut design: stack flat cut paper layers with visible thickness, soft drop shadows and handcrafted edges'],
        ['تصميم الرسوم المسطحة', 'أشكال مسطحة واضحة', 'flat illustration design: use clean flat shapes, no gradients and crisp outlines in a modern vector look'],
        ['تصميم الخطوط التجريدية', 'خطوط تصنع التكوين', 'abstract line design: let expressive drawn lines structure the composition around the subject'],
        ['تصميم الأشكال المتكررة', 'نمط بصري متكرر', 'repeating pattern design: tile identical graphic units into a rhythmic field with one deliberate break'],
        ['تصميم الحداثة البصرية', 'تكوين عصري متوازن', 'modern visual design: balance contemporary forms, refined color and clean light into a current premium look']
      ]
    },
    {
      id: 'product', title: 'أساليب عرض المنتجات', options: [
        ['المنتج بطل المشهد', 'المنتج محور التكوين', 'hero product: place the product dead-center as the single dominant subject with supporting elements subservient to it'],
        ['المنتج داخل بيئته', 'منتج ضمن سياقه', 'in-context product: show the product in its real use environment so the scene explains its purpose'],
        ['المنتج فوق قاعدة', 'منتج فوق منصة', 'elevated product: raise the product on a clean base with a clear visual hierarchy step'],
        ['التصوير المقرب للمنتج', 'تفاصيل دقيقة جدًا', 'macro product shot: fill the frame with the product surface revealing fine textures and crisp edges'],
        ['المنتج مع الأشكال', 'أشكال تحيط بالمنتج', 'product with geometric props: compose supporting shapes around the product to guide the eye and add rhythm'],
        ['المنتج داخل مشهد خيالي', 'منتج ضمن خيال', 'product in a fantasy scene: stage the product inside an imaginative constructed world with believable materials'],
        ['المنتج المعلق', 'منتج يطفو بالهواء', 'floating product: levitate the product with a natural hover shadow and subtle surrounding air movement'],
        ['المنتج وسط الانفجار', 'عناصر تنطلق حوله', 'explosion around product: burst matching ingredients or fragments outward while the product stays razor sharp'],
        ['المنتج وسط السوائل', 'سوائل تحيط بالمنتج', 'liquid surround: wrap the product in splashing liquid with realistic surface tension and droplets'],
        ['المنتج وسط الرذاذ', 'قطرات تحيط بالمنتج', 'mist surround: envelope the product in fine airborne droplets catching the light'],
        ['المنتج مع الانعكاسات', 'انعكاسات تبرز المنتج', 'reflection hero: mirror the product on a glossy surface so the reflection completes the composition'],
        ['المنتج داخل صندوق', 'منتج داخل إطار', 'product in a box: contain the product inside an open cube or frame that focuses all attention'],
        ['المنتج مع عناصر عملاقة', 'عناصر ضخمة تحيط', 'giant surrounding elements: dwarf the product\'s world with enormous matching objects behind it'],
        ['المنتج في مشهد مصغر', 'عالم صغير متكامل', 'miniature world: build a tiny complete landscape around the product at macro scale'],
        ['المنتج مع خامات', 'خامات تبرز الملمس', 'material story: press the product against contrasting raw materials that amplify its texture'],
        ['المنتج في مشهد طبيعي', 'بيئة طبيعية متناسقة', 'natural product scene: place the product in an organic outdoor setting with matching mood'],
        ['المنتج مع عناصر طائرة', 'عناصر معلقة حوله', 'flying elements: orbit weightless matching pieces around the product with consistent shadows'],
        ['المنتج بتكوين متوازن', 'توازن بصري واضح', 'balanced product composition: distribute visual weight evenly for a calm, premium stability']
      ]
    },
    {
      id: 'people', title: 'الأشخاص والبورتريه الإعلاني', options: [
        ['البورتريه السينمائي', 'شخص بإضاءة درامية', 'cinematic portrait: light the person like a film still — motivated key, deep falloff and narrative mood'],
        ['البورتريه التحريري', 'مظهر مجلات احترافي', 'editorial portrait: style the person with premium wardrobe and magazine-grade grooming and light'],
        ['البورتريه عالي الموضة', 'أناقة بصرية جريئة', 'high-fashion portrait: push avant-garde styling, extreme posing and bold beauty direction'],
        ['الشخص وسط العناصر', 'عناصر تحيط بالشخص', 'person among elements: surround the subject with themed objects that interact with their space'],
        ['الشخص مع الظل', 'ظل يصنع معنى', 'shadow-bearing portrait: let the person\'s cast shadow become a second meaningful figure in the frame'],
        ['الشخص داخل مشهد سريالي', 'شخص وسط خيال', 'surreal portrait: place the person in an impossible environment that still lights and reflects realistically'],
        ['الشخص في منظور قسري', 'منظور يغير الحجم', 'forced-perspective person: distort the person\'s apparent scale against nearby objects with clean alignment'],
        ['الشخص مع حركة', 'وضعية مليئة بالحركة', 'dynamic portrait: capture the person in active motion with fabric, hair and balance reacting naturally'],
        ['البورتريه البسيط', 'شخص بخلفية هادئة', 'simple portrait: one person, one clean background, one light — nothing competes with the face'],
        ['البورتريه أحادي اللون', 'لون يوحد المشهد', 'monochrome portrait: unify person and background into one color family so expression dominates'],
        ['الشخص وسط الأشكال', 'أشكال تصنع إطارًا', 'person framed by shapes: use graphic forms to build a visual frame around the subject'],
        ['الشخص مع انعكاساته', 'انعكاسات تضاعف الحضور', 'mirrored person: double the subject through glass or water reflection with realistic distortion'],
        ['الشخص في لقطة واسعة', 'شخص ضمن مساحة', 'person in a wide frame: place the small figure inside a large environment that tells the story'],
        ['الشخص مع إضاءة حادة', 'إضاءة تبرز التفاصيل', 'hard-light portrait: carve the face with crisp directional light revealing texture and structure'],
        ['البورتريه بتكوين غير تقليدي', 'تكوين يكسر المألوف', 'unconventional portrait: break standard portrait framing with tilted, cropped or off-center placement']
      ]
    },
    {
      id: 'background', title: 'الخلفيات والمؤثرات البصرية', options: [
        ['خلفية التدرج اللوني', 'ألوان تنساب بهدوء', 'gradient background: flow two or three tones smoothly behind the subject with a clean focal falloff'],
        ['الخلفية الهندسية', 'أشكال بترتيب هندسي', 'geometric background: tile precise shapes into a structured field behind the subject'],
        ['الخلفية المعمارية', 'مساحات بأبعاد واقعية', 'architectural background: build believable modern structures and voids that frame the subject'],
        ['الخلفية أحادية اللون', 'لون موحد للمشهد', 'solid-tone background: use one uninterrupted color field so all attention lands on the subject'],
        ['الخلفية متعددة الطبقات', 'طبقات تصنع عمقًا', 'layered background: stack distinct receding planes with atmospheric separation'],
        ['خلفية الضباب', 'ضباب يمنح غموضًا', 'fog background: fill the depth with soft mist that fades elements into mystery'],
        ['خلفية الجسيمات', 'نقاط تملأ المشهد', 'particle background: drift fine specks through the air catching light for texture and depth'],
        ['خلفية الضوء الحجمي', 'أشعة تمنح ععمقًا', 'volumetric light background: cut visible light shafts through the atmosphere toward the subject'],
        ['خلفية الانعكاسات', 'سطوح تعكس الضوء', 'reflective background: mirror the scene across glossy surfaces to double its depth'],
        ['الخلفية السائلة', 'تموجات ناعمة متدفقة', 'liquid background: undulate soft flowing waves of color behind the subject'],
        ['الخلفية المعدنية', 'خامة معدنية لامعة', 'metallic background: sweep brushed or polished metal surfaces with environment reflections'],
        ['الخلفية الورقية', 'ملمس ورقي واضح', 'paper background: hang textured paper with visible fibers, curls and soft shadows'],
        ['الخلفية المستقبلية', 'عناصر توحي بالمستقبل', 'futuristic background: build a sleek high-tech environment with clean glow lines and depth'],
        ['الخلفية الطبيعية', 'عناصر طبيعية متناغمة', 'natural background: compose organic outdoor elements into a harmonious setting'],
        ['الخلفية المسرحية', 'مساحة تشبه المسرح', 'theatrical background: stage the scene like a set with curtains, platforms and dramatic space'],
        ['الخلفية ذات الإطارات', 'إطارات تصنع العمق', 'framed background: nest receding frames or openings that tunnel attention toward the subject'],
        ['الخلفية المتكررة', 'نمط متكرر ومنظم', 'repeating background: pattern identical units in a disciplined rhythm with one intentional break'],
        ['الخلفية ذات الظلال', 'ظلال ترسم المساحات', 'shadow-cast background: let cast shadows draw graphic shapes across the backdrop planes']
      ]
    },
    {
      id: 'lighting', title: 'تقنيات الإضاءة والمعالجة الفنية', options: [
        ['الإضاءة الدرامية', 'ظلال قوية عميقة', 'dramatic lighting: carve the scene with a hard key and deep controlled shadows'],
        ['الإضاءة الحادة', 'ضوء مباشر قوي', 'hard lighting: use one crisp direct source producing sharp-edged shadows and bold contrast'],
        ['الإضاءة الناعمة', 'ضوء ناعم متوازن', 'soft lighting: wrap the subject in large diffused light with gentle shadow transitions'],
        ['الإضاءة الخلفية', 'ضوء خلف العنصر', 'backlighting: place the source behind the subject to create a bright separating rim'],
        ['الإضاءة المحيطية', 'وهج يحيط بالعناصر', 'glow lighting: surround the subject with a soft luminous aura bleeding into the air'],
        ['الإضاءة الملونة', 'ألوان ضوئية واضحة', 'colored lighting: paint the scene with two or three distinct colored sources'],
        ['الإضاءة الحجمية', 'أشعة تخترق الهواء', 'volumetric lighting: render visible light beams cutting through haze toward the subject'],
        ['الإضاءة المتباينة', 'نور وظل متضادان', 'chiaroscuro lighting: split the frame into strong zones of light and darkness'],
        ['تأثير التوهج', 'وهج ضوئي ناعم', 'bloom effect: let bright highlights glow with a soft realistic halation'],
        ['تأثير الهالة', 'هالة تحيط بالعنصر', 'halo effect: draw a complete luminous ring of light around the subject contour'],
        ['تأثير الحواف المضيئة', 'حواف مضيئة واضحة', 'glowing edges: trace the subject outline with clean bright rim lines'],
        ['المعالجة السينمائية', 'ألوان سينمائية متناسقة', 'cinematic grade: apply a film-inspired color grade with rich shadows and controlled highlights'],
        ['المعالجة أحادية اللون', 'درجات لون موحدة', 'monochrome grade: compress the palette into one hue family with clean tonal steps'],
        ['المعالجة عالية التباين', 'تفاصيل وتباين قويان', 'high-contrast grade: push deep blacks and crisp whites while protecting midtone detail'],
        ['المعالجة الحبيبية', 'حبيبات فيلم طبيعية', 'film-grain grade: overlay subtle analog grain that responds to light and shadow'],
        ['المعالجة فائقة الواقعية', 'تفاصيل واقعية دقيقة', 'hyperreal grade: maximize micro-detail, true textures and accurate light response across every surface']
      ]
    }
  ];

  /* خريطة مسطحة: اسم الخيار → الوصف */
  var FLAT = {};
  CATS.forEach(function (c) {
    c.options.forEach(function (o) { FLAT[o[0]] = { cat: c.id, desc: o[1], en: o[2] }; });
  });

  /* أزواج متوافقة يقترحها النظام */
  var SYNERGY = [
    ['تصميم قائم على الظلال', 'التصميم أحادي اللون'],
    ['المنظور القسري', 'المجسمات الضخمة'],
    ['مسارات الحركة', 'العناصر العائمة'],
    ['تصميم الزجاج الشفاف', 'تصميم التدرجات'],
    ['التصميم السويسري', 'تصميم المساحات البيضاء'],
    ['الاستعارة البصرية', 'المساحة السلبية'],
    ['المنتج بطل المشهد', 'المسرح الهندسي ثلاثي الأبعاد'],
    ['الإضاءة الحجمية', 'خلفية الضباب'],
    ['تصميم الكروم المعدني', 'تصميم الألفينات'],
    ['المنتج المعلق', 'الإضاءة الخلفية'],
    ['البورتريه السينمائي', 'المعالجة السينمائية'],
    ['الخلفية التدرج اللوني', 'تصميم التدرجات']
  ];

  /* تعارضات: [أ, ب, السبب, الاقتراح] */
  var CONFLICTS = [
    ['التصميم أحادي اللون', 'تصميم الألوان المتضادة', 'أحدهما يوحّد الألوان والآخر يتصادم بها', 'اختر الأحادي مع تدرج لوني ناعم بدل التضاد'],
    ['التصميم أحادي اللون', 'الإضاءة الملونة', 'الإضاءة الملونة تكسر وحدة اللون الواحد', 'استخدم إضاءة درامية بلون واحد بدل الملونة'],
    ['ضبابية الحركة', 'تجميد الحركة', 'إحداهما تظهر الحركة والثانية توقفها', 'تجميد الحركة + مسارات الحركة في الخلفية'],
    ['المنتج المعلق', 'المنتج فوق قاعدة', 'منتج يطفو ولا يقف فوق منصة', 'اختر المعلق مع إضاءة خلفية لتعزيز الطيران'],
    ['التصميم البسيط', 'تصميم الأشكال المتكررة', 'النمط المتكرر يزدحم مع حدها البساطة', 'استخدم نمطاً واحداً خفيفاً في الخلفية فقط'],
    ['الإعلان السريالي', 'البورتريه البسيط', 'البساطة تتعارض مع كسر المنطق', 'الإعلان السريالي + بورتريه سينمائي'],
    ['الخداع البصري', 'المنظور من الأعلى', 'الخداع يحتاج زاوية تخدمه', 'الخداع البصري + منظور قسري'],
    ['المعالجة أحادية اللون', 'المعالجة عالية التباين', 'تعارض فيزياء الألوان', 'الأحادي + تباين عالي الدرجة نفسها فقط'],
    ['الخلفية الطبيعية', 'الخلفية المستقبلية', 'بيتان زمنيتان متناقضتان', 'اختر واحدة وابنِ حولها باقي العناصر']
  ];

  /* مولّد الاتجاه الإبداعي: [كلمات مفتاحية, عنوان عربي, ملخص عربي متعدد النقاط, بروميت إنجليزي, نوع أساسي, أنواع إضافية] */
  var IDEAS = [
    { re: /عطر|perfume|fragrance|cologne/i, title: 'زجاجة العطر كبوابة عالم',
      ar: 'الفكرة: زجاجة العطر تبدو كأنها مصدر لعالم كامل من الروائح — تتصاعد من فوّهتها سحابة من الألوان والعناصر الطبيعية (زهور، فواكه، نسيم) تشكل مشهداً كاملاً.\nالتنفيذ: المنتج بطل المشهد + المنظور القسري + تصميم التدرجات + تطاير العناصر + الإضاءة الحجمية. المنظور من الأسفل قليلاً لمنح الزجاجة حجماً ملحمياً، مع إضاءة خلفية تجعل السائل داخل الزجاجة يتوهج.',
      en: 'The perfume bottle acts as a portal to a complete world of scent: a dense cloud of colored mist, floating flowers and fruit elements erupts from the nozzle and forms a full scene. Use a hero product composition with slightly forced low perspective to give the bottle monumental scale, volumetric light through the mist, scattering elements orbiting the glass, and a gradient atmosphere — keep the bottle shape, cap and liquid perfectly true to the real product.',
      primary: 'المنتج بطل المشهد', extras: ['المنظور القسري', 'تصميم التدرجات', 'تطاير العناصر', 'الإضاءة الحجمية'] },
    { re: /سيارة|عربية|car|auto|vehicle/i, title: 'السيارة تشق الليل',
      ar: 'الفكرة: السيارة تتحرك بسرعة عبر مدينة ليلية، ومسارات الضوء تمتد خلفها كخطوط نيون ترسم شكل الطريق.\nالتنفيذ: مسارات الحركة + تأثير السرعة + المعالجة السينمائية + الخلفية المستقبلية + الإضاءة الملونة. زاوية منخفضة قريبة من الأرض مع ضبابية حركة في الخلفية ووضوح تام للسيارة.',
      en: 'The car tears through a night city with long neon light trails streaming behind it like drawn speed lines. Use low-angle close framing near the ground, directional motion blur only on the background, a razor-sharp car body with crisp paint reflections, colored city lighting and a cinematic grade — keep the car model, proportions and design exactly as the real vehicle.',
      primary: 'مسارات الحركة', extras: ['تأثير السرعة', 'المعالجة السينمائية', 'الخلفية المستقبلية', 'الإضاءة الملونة'] },
    { re: /قهوة|طعام|أكل|food|coffee|drink|عصير|burger|pizza/i, title: 'انفجار المكونات',
      ar: 'الفكرة: المنتج في قلب انفجار مكوّناته الطبيعية — القطرات والبخار والقطع تتطاير حوله في لحظة مجمّدة.\nالتنفيذ: المنتج وسط الانفجار + تجميد الحركة + الخلفية ذات الظلال + الإضاءة الدرامية + المعالجة فائقة الواقعية. لقطة قريبة مع عمق ميدان ضحل.',
      en: 'The product sits at the center of a frozen explosion of its own natural ingredients — droplets, steam and fragments suspended mid-air at peak energy. Use a close product shot with shallow depth of field, a single hard dramatic key carving crisp shadows on a shadow-cast backdrop, hyperreal texture on every droplet, and keep the product packaging and form untouched and sharp.',
      primary: 'المنتج وسط الانفجار', extras: ['تجميد الحركة', 'الخلفية ذات الظلال', 'الإضاءة الدرامية', 'المعالجة فائقة الواقعية'] },
    { re: /تجميل|مكياج|بشرة|skin|cosmetic|beauty|كريم/i, title: 'نقاء مطلق',
      ar: 'الفكرة: عالم نقي من الزجاج والضوء — المنتج يطفو داخله بشفافية كاملة تُبرز نقاء التركيبة.\nالتنفيذ: تصميم الزجاج الشفاف + المنتج المعلق + الإضاءة الناعمة + تأثير التوهج + تصميم المساحات البيضاء + الخلفية التدرج اللوني. إضاءة ناعمة ملتفة مع حواف مضيئة.',
      en: 'A world of pure glass and light: the product floats inside translucent frosted layers with complete transparency revealing the purity of the formula. Wrap the scene in soft diffused lighting with glowing edges and gentle bloom, generous white space, a subtle gradient field, and a floating hero placement — keep the bottle silhouette, label area and texture exactly as the real product.',
      primary: 'تصميم الزجاج الشفاف', extras: ['المنتج المعلق', 'الإضاءة الناعمة', 'تأثير التوهج', 'تصميم المساحات البيضاء'] },
    { re: /لعبة|game|gيم/i, title: 'لحظة الصدام',
      ar: 'الفكرة: عالم اللعبة يتوقف عند ذروة المواجهة — العناصر تتطاير والبطل في وضعية انطلاق.\nالتنفيذ: الحركة الانفجارية + البورتريه السينمائي + العمق متعدد الطبقات + الإضاءة الملونة + تأثير السرعة. تكوين قطري يمنح الطاقة.',
      en: 'The game world freezes at the peak of confrontation — elements flying outward while the character is captured mid-launch. Use an explosive motion composition on a strong diagonal, cinematic character lighting with colored rim sources, multi-layer depth with debris planes, speed streaks in the background, and keep the character design and costume fully consistent with the original identity.',
      primary: 'الحركة الانفجارية', extras: ['التكوين القطري', 'الإضاءة الملونة', 'العمق متعدد الطبقات', 'تأثير السرعة'] },
    { re: /سياحة|سفر|ترavel|travel|فندق|destination|مدينة سياحية/i, title: 'الوجهة تستقبلك',
      ar: 'الفكرة: الوجهة تُعرض كأنها تفتح باباً لك — الإطار يقود العين من الفراغ إلى قلب المشهد.\nالتنفيذ: المشهد داخل إطار + المنظور من الأعلى + خلفية الضوء الحجمي + المعالجة السينمائية + التكوين المتوازن. ضوء ذهبي وسحابة ضباب خفيفة تمنح عمقاً.',
      en: 'The destination opens like a doorway for the viewer: receding frames tunnel the eye into the heart of the scene. Use a top-down reveal with volumetric golden light shafts, soft atmospheric fog building depth, a cinematic grade with warm shadows, a balanced composition with breathing room, and keep the landmark architecture geographically accurate.',
      primary: 'المشهد داخل إطار', extras: ['المنظور من الأعلى', 'خلفية الضوء الحجمي', 'المعالجة السينمائية', 'خلفية الضباب'] },
    { re: /ساعة|watch|مجوهرات|jewel|ذهب|فضة/i, title: 'تفاصيل تُعظّم',
      ar: 'الفكرة: عالم مصغّر يدور حول التفاصيل الدقيقة — كل سنّ وملمس يظهر بحجم ملحمي.\nالتنفيذ: التصوير المقرب للمنتج + المنظور القريب جدًا + المنتج مع خامات + الإضاءة الحاد + المعالجة فائقة الواقعية + المنتج بطل المشهد. انعكاس سطحي نظيف تحت المنتج.',
      en: 'A miniature world orbits around precision detail — every gear, facet and texture revealed at monumental scale. Use an extreme macro product shot with hard crisp lighting carving micro-shadows across raw contrasting materials, a clean surface reflection beneath, hyperreal grading protecting every highlight, and keep the product geometry and finish flawlessly accurate.',
      primary: 'التصوير المقرب للمنتج', extras: ['المنظور القريب جدًا', 'المنتج مع خامات', 'الإضاءة الحاد', 'المعالجة فائقة الواقعية'] },
    { re: /أزياء|فاشن|fashion|ملابس|dress|قميص/i, title: 'حركة القماش',
      ar: 'الفكرة: الشخصية في حركة، والقماش يرسم شكلاً جمالياً في الهواء.\nالتنفيذ: الحركة السينمائية + البورتريه عالي الموضة + الخلفية المسرحية + الإضاءة الدرامية + تكوين قطري + المعالجة أحادية اللون. عرض تحريري جريء.',
      en: 'The person moves and the fabric draws a sculptural form in the air. Capture cinematic fabric motion frozen at its most elegant arc, high-fashion styling, a theatrical staged backdrop, dramatic directional light with deep falloff, a dynamic diagonal composition and a refined monochrome grade — keep the model identity and garment design exactly consistent.',
      primary: 'الحركة السينمائية', extras: ['البورتريه عالي الموضة', 'الخلفية المسرحية', 'الإضاءة الدرامية', 'المعالجة أحادية اللون'] },
    { re: /جوال|موبايل|هاتف|tech|تقنية|لابتوب|حاسوب|phone|laptop/i, title: 'مستقبل بين يديك',
      ar: 'الفكرة: الجهاز يتوسط عمقاً مستقبلياً من الضوء والهندسة.\nالتنفيذ: المنتج بطل المشهد + الخلفية المستقبلية + خلفية الضوء الحجمي + تصميم الهولوجرام + المنظور القريب جدًا + الإضاءة المحيطية. خطوط ضوء نظيفة تقود العين.',
      en: 'The device stands at the center of a futuristic depth of light and geometry: clean glow lines tunnel toward it, holographic color fringing floats in the air, volumetric beams cut the haze and a glow aura separates it from the space. Use a close hero framing, precise screen content clarity, and keep the device body, buttons and proportions exactly as the real product.',
      primary: 'المنتج بطل المشهد', extras: ['الخلفية المستقبلية', 'تصميم الهولوجرام', 'خلفية الضوء الحجمي', 'الإضاءة المحيطية'] },
    { re: /.*/, title: 'فكرة عالمية مرنة',
      ar: 'الفكرة: منتجك هو مصدر العالم المحيط به — العناصر تخرج من هويته البصرية وتحيط به.\nالتنفيذ: الاستعارة البصرية + المنتج بطل المشهد + العناصر العائمة + خلفية التدرج اللوني + الإضاءة الناعمة + المعالجة فائقة الواقعية. تركيز بصري كامل مع مساحة تنفّس.',
      en: 'The product is the source of the world around it: visual elements emerge from its own identity and orbit it in a weightless composition. Use a visual metaphor carried by floating elements, a hero product placement, a smooth gradient atmosphere, soft wrapped lighting and hyperreal grading — keep generous breathing room and never alter the product\'s true form.',
      primary: 'الاستعارة البصرية', extras: ['المنتج بطل المشهد', 'العناصر العائمة', 'خلفية التدرج اللوني', 'الإضاءة الناعمة'] }
  ];

  function tr(txt) {
    try { if (PS.PromptEngine && PS.PromptEngine.translate) return PS.PromptEngine.translate(txt); }
    catch (e) { /* noop */ }
    return txt;
  }

  /* --------- بناء وصف بصري من الاختيارات --------- */
  function build(st, ctx) {
    var primary = st.designPrimary || '';
    var extras = (st.designExtras || []).slice();
    var idea = (st.designIdea || '').trim();
    if (!primary && !extras.length && !idea) return '';
    var out = [];
    var warnings = [];
    var warn = function (m) { if (ctx && ctx.warn) ctx.warn(m); else if (warnings.indexOf(m) === -1) warnings.push(m); };

    /* التعارضات */
    var chosen = (primary ? [primary] : []).concat(extras);
    CONFLICTS.forEach(function (c) {
      if (chosen.indexOf(c[0]) !== -1 && chosen.indexOf(c[1]) !== -1) {
        warn('تعارض تصميمي: «' + c[0] + '» و«' + c[1] + '» — ' + c[2] + '. الاقتراح: ' + c[3] + '. (الأولوية للنوع الأساسي)');
        extras = extras.filter(function (x) { return x !== c[1]; });
      }
    });

    if (primary && FLAT[primary]) {
      out.push('Creative advertising direction — ' + primary + ': ' + FLAT[primary].en + '.');
    }
    if (extras.length) {
      var exEn = extras.filter(function (x) { return FLAT[x]; }).map(function (x) { return FLAT[x].en; });
      if (exEn.length) out.push('Supporting visual devices (apply as execution details without overriding the main concept): ' + exEn.join('; ') + '.');
    }

    /* سياق الموضوع */
    var isProduct = ['Product', 'Object'].indexOf(st.subjectType) !== -1;
    var isPerson = ['Person', 'Two People', 'Group', 'Character', 'Person + Product'].indexOf(st.subjectType) !== -1 || (st.refImages && st.refImages.length);
    if (isProduct) out.push('Keep the advertised product completely faithful: exact shape, proportions, materials, colors, labels and finish — the concept stages it, never redesigns it.');
    if (isPerson && st.refImages && st.refImages.length) out.push('Preserve the reference identity, facial features and body proportions exactly while applying this concept.');
    out.push('Result must read as a professional advertising key visual: one clear focal hierarchy, deliberate placement of every element, believable materials, physically coherent light and shadows, and no text, logos or watermarks unless the user explicitly requested them.');

    if (idea) out.push('Custom creative idea (it must drive the composition; translate its intent faithfully): "' + tr(idea) + '"');
    return out.join(' ');
  }

  /* --------- مولّد الاتجاه الإبداعي --------- */
  function generateIdea(subjectText) {
    var txt = String(subjectText || '');
    for (var i = 0; i < IDEAS.length; i++) {
      if (IDEAS[i].re.test(txt)) return IDEAS[i];
    }
    return IDEAS[IDEAS.length - 1];
  }

  /* --------- تحذيرات الكاميرا (عدسة/زاوية/لقطة) --------- */
  var CAM_WARNINGS = [
    { test: function (s) { return ['14mm', '24mm'].indexOf(s.lens) !== -1 && ['Extreme Close-up', 'Close-up'].indexOf(s.shotType) !== -1; },
      msg: '⚠ العدسة ' } 
  ];
  function cameraWarning(s) {
    var lens = s.lens, angle = s.cameraAngle, shot = s.shotType, framing = s.bodyFraming;
    if (['14mm', '24mm'].indexOf(lens) !== -1 && ['Extreme Close-up', 'Close-up'].indexOf(shot) !== -1) {
      return 'العدسة ' + lens + ' فائقة الاتساع مع لقطة قريبة تُشوّه الملامح وتمدّد الوجه — يُفضّل 50mm أو 85mm لهذه اللقطة.';
    }
    if (['135mm', '200mm'].indexOf(lens) !== -1 && shot === 'Wide Shot') {
      return 'العدسة ' + lens + ' طويلة جداً مع لقطة واسعة (غير عملية في التصوير الحقيقي) — يُفضّل 24mm أو 35mm.';
    }
    if (lens === 'Macro' && (shot === 'Wide Shot' || framing === 'Full Body')) {
      return 'عدسة ماكرو لا تناسب اللقطة الواسعة أو الجسم الكامل — يُفضّل 35mm أو 50mm.';
    }
    if (angle === "Worm's Eye View" && (framing === 'Portrait' || shot === 'Close-up')) {
      return 'زاوية عين الدودة مع بورتريه قريب تشوّه ملامح الوجه وتكسر الهوية — يُفضّل Low Angle بسيطة أو مستوى العين.';
    }
    if (angle === 'Top Down' && (framing === 'Portrait' || shot === 'Close-up')) {
      return 'اللقطة العلوية من الأعلى لا تناسب البورتريه الوجهي (تظهر الجبهة فقط) — يُفضّل Wide Shot أو لقطة منتج.';
    }
    if (angle === 'Dutch Angle' && s.identity && s.identity !== 'Off') {
      return 'الزاوية المائلة (Dutch) تقلّل دقة تطابق الهوية مع الصورة المرجعية — يُفضّل مستوى العين مع فعّل حفظ الهوية.';
    }
    if (angle === 'Back Angle' && s.identity && s.identity !== 'Off') {
      return 'الزاوية الخلفية تخفي الوجه فتتعارض مع حفظ الهوية — يُفضّل 3/4 Angle أو Over-the-Shoulder.';
    }
    if (['Extreme Bokeh', 'Cinematic Bokeh'].indexOf(s.dof) !== -1 && s.bgDepth === 'Flat') {
      return 'البوكيه القوي لا يظهر أثره على خلفية مسطحة (Flat) — يُفضّل عمق طبيعي أو خلفية بيئة عميقة.';
    }
    return null;
  }

  /* ================= واجهة استوديو الأفكار ================= */
  var api = null, catActive = 'all', searchQ = '', els = {};

  function selectedSet() {
    var st = api.getState();
    var set = {};
    if ( st.designPrimary) set[st.designPrimary] = 'primary';
    (st.designExtras || []).forEach(function (x) { set[x] = 'extra'; });
    return set;
  }

  function optionRow(name, kind) {
    var info = FLAT[name];
    var row = document.createElement('div');
    row.className = 'ds-opt' + (kind === 'primary' ? ' primary' : (kind === 'extra' ? ' extra' : ''));
    var radio = document.createElement('div');
    radio.className = 'ds-dot';
    radio.setAttribute('title', 'اجعله النوع الأساسي');
    radio.setAttribute('role', 'button'); radio.setAttribute('tabindex', '0');
    var nameEl = document.createElement('div');
    nameEl.className = 'ds-name';
    nameEl.textContent = name;
    var descEl = document.createElement('div');
    descEl.className = 'ds-desc';
    descEl.textContent = info ? info.desc : '';
    var textWrap = document.createElement('div');
    textWrap.className = 'ds-text';
    textWrap.appendChild(nameEl); textWrap.appendChild(descEl);
    var plus = document.createElement('div');
    plus.className = 'ds-plus';
    plus.textContent = kind === 'extra' ? '✓' : '+';
    plus.setAttribute('title', 'أضفه كنوع متوافق إضافي');
    plus.setAttribute('role', 'button'); plus.setAttribute('tabindex', '0');
    row.appendChild(radio); row.appendChild(textWrap); row.appendChild(plus);

    function setPrimary() {
      api.mutate(function (st) { st.designPrimary = (st.designPrimary === name) ? '' : name; });
    }
    function toggleExtra() {
      api.mutate(function (st) {
        var arr = (st.designExtras || []).slice();
        var i = arr.indexOf(name);
        if (i >= 0) arr.splice(i, 1); else { if (st.designPrimary === name) st.designPrimary = ''; arr.push(name); }
        st.designExtras = arr;
      });
    }
    radio.addEventListener('click', setPrimary);
    radio._act = setPrimary;
    plus.addEventListener('click', function (e) { e.stopPropagation(); toggleExtra(); });
    plus._act = toggleExtra;
    return row;
  }

  function renderOptions() {
    var box = els.options; if (!box) return;
    box.innerHTML = '';
    var set = selectedSet();
    var q = searchQ.trim();
    var cats = CATS.filter(function (c) { return catActive === 'all' || c.id === catActive; });
    var any = false;
    cats.forEach(function (c) {
      var list = c.options.filter(function (o) {
        if (!q) return true;
        return (o[0] + ' ' + o[1]).indexOf(q) !== -1;
      });
      if (!list.length) return;
      any = true;
      var head = document.createElement('div');
      head.className = 'ds-cat-head';
      head.textContent = c.title;
      box.appendChild(head);
      list.forEach(function (o) { box.appendChild(optionRow(o[0], set[o[0]])); });
    });
    if (!any) {
      var empty = document.createElement('div');
      empty.className = 'ds-empty';
      empty.textContent = 'لا توجد نتائج مطابقة — جرّب كلمة أخرى مثل: ظلال، منتج، تدرج، إضاءة';
      box.appendChild(empty);
    }
  }

  function renderPreview() {
    var st = api.getState();
    var txt = '';
    try { txt = build(st, null); } catch (e) { txt = ''; }
    var warnBox = els.warnings;
    if (warnBox) {
      var cam = cameraWarning(st);
      var chosen = (st.designPrimary ? [st.designPrimary] : []).concat(st.designExtras || []);
      var cf = [];
      CONFLICTS.forEach(function (c) { if (chosen.indexOf(c[0]) !== -1 && chosen.indexOf(c[1]) !== -1) cf.push('⚠ ' + c[0] + ' + ' + c[1] + ' — ' + c[2] + '. الاقتراح: ' + c[3]); });
      if (cam) cf.unshift('⚠ ' + cam);
      warnBox.innerHTML = '';
      cf.forEach(function (w) {
        var d = document.createElement('div');
        d.textContent = w;
        warnBox.appendChild(d);
      });
      warnBox.style.display = cf.length ? 'block' : 'none';
    }
    if (els.preview) {
      els.preview.textContent = txt || 'اختر نوعاً أساسياً (الدائرة) أو إضافياً (+) لترى معاينة كيف سيفهم الذكاء الاصطناعي فكرتك قبل التوليد.';
    }
  }

  function renderCats() {
    var box = els.cats; if (!box) return;
    box.innerHTML = '';
    var all = [['all', 'الكل']].concat(CATS.map(function (c) { return [c.id, c.title]; }));
    all.forEach(function (c) {
      var b = document.createElement('div');
      b.className = 'ds-cat' + (catActive === c[0] ? ' active' : '');
      b.textContent = c[1];
      b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0');
      b.addEventListener('click', function () { catActive = c[0]; renderCats(); renderOptions(); });
      box.appendChild(b);
    });
  }

  function refreshDesign() { renderOptions(); renderPreview(); }

  function doIdea() {
    var st = api.getState();
    var src = (st.subjectDetails || '') + ' ' + (st.customText || '') + ' ' + (st.productPlacement ? 'product' : '') + ' ' + (st.clothingStyle || '');
    var idea = generateIdea(src);
    api.mutate(function (s) {
      s.designPrimary = idea.primary;
      s.designExtras = idea.extras.slice();
      s.designIdea = idea.ar;
    });
    if (els.idea) els.idea.value = idea.ar;
    refreshDesign();
    api.toast('💡 اقتراح: ' + idea.title + ' — راجع المعاينة ثم عدّلตาม رغبتك', 'success');
  }

  function doReset() {
    api.mutate(function (s) { s.designPrimary = ''; s.designExtras = []; s.designIdea = ''; });
    if (els.idea) els.idea.value = '';
    refreshDesign();
    api.toast('تمت إعادة ضبط استوديو الأفكار');
  }

  function buildUI() {
    var host = document.getElementById('designStudio');
    if (!host) return;
    /* بحث */
    var search = document.createElement('input');
    search.className = 'ds-search';
    search.placeholder = '🔍 ابحث عن أسلوب... مثال: ظلال، منتج، تدرج، إضاءة، منظور';
    search.addEventListener('input', function () { searchQ = search.value; renderOptions(); });
    host.appendChild(search);
    /* الفئات */
    els.cats = document.createElement('div');
    els.cats.className = 'ds-cats';
    host.appendChild(els.cats);
    /* الخيارات */
    els.options = document.createElement('div');
    els.options.className = 'ds-options';
    host.appendChild(els.options);
    /* فكرة خاصة */
    var ideaLabel = document.createElement('div');
    ideaLabel.className = 'ds-label';
    ideaLabel.textContent = 'فكرتك الخاصة (اختياري — تُدمج في الاتجاه)';
    host.appendChild(ideaLabel);
    els.idea = document.createElement('textarea');
    els.idea.className = 'ta-4';
    els.idea.setAttribute('dir', 'auto');
    els.idea.placeholder = 'مثال: زجاجة العطر تبدو كأنها بوابة لعالم من الزهور المتلاحقة...';
    els.idea.addEventListener('input', function () { api.mutate(function (s) { s.designIdea = els.idea.value; }); });
    host.appendChild(els.idea);
    /* أزرار */
    var row = document.createElement('div');
    row.className = 'btn-row small';
    var bIdea = document.createElement('div');
    bIdea.className = 'btn primary';
    bIdea.textContent = '💡 ابتكر لي فكرة إبداعية';
    bIdea.setAttribute('role', 'button'); bIdea.setAttribute('tabindex', '0');
    bIdea.addEventListener('click', doIdea);
    bIdea._act = doIdea;
    var bReset = document.createElement('div');
    bReset.className = 'btn ghost';
    bReset.textContent = 'إعادة ضبط الاختيارات';
    bReset.setAttribute('role', 'button'); bReset.setAttribute('tabindex', '0');
    bReset.addEventListener('click', doReset);
    bReset._act = doReset;
    row.appendChild(bIdea); row.appendChild(bReset);
    row.lastChild.classList.add('last');
    host.appendChild(row);
    /* تحذيرات */
    els.warnings = document.createElement('div');
    els.warnings.className = 'ds-warnings';
    els.warnings.style.display = 'none';
    host.appendChild(els.warnings);
    /* معاينة */
    var pLabel = document.createElement('div');
    pLabel.className = 'ds-label';
    pLabel.textContent = 'معاينة: هكذا سيُفهم الإعلان في البروميت';
    host.appendChild(pLabel);
    els.preview = document.createElement('div');
    els.preview.className = 'ds-preview';
    host.appendChild(els.preview);
  }

  PS.DesignLibrary = {
    categories: CATS, flat: FLAT, build: build, conflicts: CONFLICTS, synergy: SYNERGY,
    generateIdea: generateIdea, cameraWarning: cameraWarning,
    init: function (a) { api = a; buildUI(); renderCats(); renderOptions(); renderPreview(); },
    refresh: function () { refreshDesign(); }
  };
})();
