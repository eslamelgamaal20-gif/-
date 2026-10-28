/* ==========================================================================
   EMG — schema.js  (Arabic UI schema)
   تعريف كل الأقسام والحقول بالعربية. القيم (values) تفضل إنجليزية حتى يعمل
   محرك البروميت بالإنجليزية بدون تغيير. واجهة المستخدم تُعرض بالعربية.
   لإضافة خيار جديد: أضفه للقائمة options ثم اكتب معناه في الحالة ar.
   ========================================================================== */
(function () {
  'use strict';
  var PS = (window.PS = window.PS || {});

  var HUMAN_TYPES = ['Person', 'Two People', 'Group', 'Character', 'Person + Product'];
  var PRODUCT_TYPES = ['Product', 'Object'];

  function isProduct(s) { return PRODUCT_TYPES.indexOf(s.subjectType) !== -1; }
  function isMultiPerson(s) {
    return s.subjectType === 'Two People' || s.subjectType === 'Group' ||
      (s.subjectType === 'Person' && Number(s.peopleCount) > 1);
  }

  var sections = [
    {
      id: 'reference', title: 'المرجع والهوية', open: true,
      fields: [
        { id: 'refImages', label: 'صور شخصية مرجعية (يمكن أكثر من صورة)', type: 'images',
          tip: 'ارفع صورة واحدة أو أكثر لأشخاص مرجعيين — المحرك يحافظ على ملامح كل شخص وبنية جسمه ووضعيته في الناتج.' },
        { id: 'buildAppearance', label: 'بناء الشخصية من الصفر (إظهار خيارات المظهر)', type: 'toggle', def: false,
          showIf: function (s) { return (s.refImages && s.refImages.length > 0); },
          tip: 'عند رفع صورة مرجعية تختفي خيارات المظهر تلقائياً (الوش، الشعر، اللحية، البشرة كلها تاخذ من الصورة). فعّل هذا الخيار فقط لو عايز تغيّر المظهر بنفسك.' },
        { id: 'identity', label: 'قوة حفظ الهوية', type: 'select',
          options: ['Off', 'Normal', 'Strict', 'Very Strict'],
          ar: { 'Off': 'مغلق · توليد عادي', 'Normal': 'عادية · ملامح عامة', 'Strict': 'قوية · ملامح ثابتة', 'Very Strict': 'قصوى · أقصى ثبات ممكن' },
          def: 'Off',
          tip: 'مدى حفظ المحرك لهوية الشخص المرجعي. القصوى تضمن أقصى ثبات ممكن لأرقام الوجه — لكن لا يوجد موديل ذكاء اصطناعي يضمن تطابق 100%.' },
        { id: 'referenceNote', label: 'وصف مختصر للمرجع (اختياري)', type: 'text',
          placeholder: 'مثال: الرجل في الصورة المرفقة',
          tip: 'وصف قصير اختياري لمن/ما هو المرجع.' },
        { id: 'refMatchBody', label: 'مطابقة جسم الشخص المرجعي', type: 'toggle', def: true,
          tip: 'عند التفعيل يضيف المحرك تعليمات للحفاظ على نسب جسم الشخص وطوله وبنية جسمه كما في الصورة المرجعية.' },
        { id: 'refMatchPose', label: 'مطابقة وضعية الجسد والتقاطة', type: 'toggle', def: false,
          tip: 'عند التفعيل يضيف المحرك تعليمات لمحاكاة وضعية الجسد وتقاطع الأيدي كما في الصورة المرجعية.' },
        { id: 'allowedChanges', label: 'تغييرات مسموحة صراحة', type: 'multi',
          options: ['Hairstyle', 'Hair Color', 'Beard', 'Age', 'Body Shape'],
          ar: { 'Hairstyle': 'تسريحة الشعر · تغيير مسموح', 'Hair Color': 'لون الشعر · تغيير مسموح', 'Beard': 'اللحية · تغيير مسموح', 'Age': 'العمر · تغيير مسموح', 'Body Shape': 'شكل الجسم · تغيير مسموح' },
          showIf: function (s) { return s.identity !== 'Off' && !isProduct(s); },
          tip: 'خصائص الهوية التي تريد تغييرها صراحةً. أي شيء آخر يُحفظ كما هو.' }
      ]
    },
    {
      id: 'edit', title: 'تعليمات التعديل',
      showIf: function (s) { return s.mode === 'Editing'; },
      fields: [
        { id: 'editOps', label: 'عمليات التعديل', type: 'multi',
          options: ['Replace Object', 'Remove Object', 'Change Clothing', 'Change Background', 'Change Pose', 'Change Lighting', 'Change Camera', 'Preserve Everything Else'],
          ar: { 'Replace Object': 'استبدال عنصر · تبديل كامل', 'Remove Object': 'إزالة عنصر · مسح نظيف', 'Change Clothing': 'تغيير الملابس · بدلة جديدة', 'Change Background': 'تغيير الخلفية · بيئة جديدة', 'Change Pose': 'تغيير الوضعية · وضع جديد', 'Change Lighting': 'تغيير الإضاءة · مزاج جديد', 'Change Camera': 'تغيير الكاميرا · زاوية جديدة', 'Preserve Everything Else': 'الحفاظ على الباقي · عدم تغيير باقي العناصر' },
          def: ['Preserve Everything Else'],
          tip: 'نوع التغيير المطلوب. المحرك يحافظ على كل ما لم تطلبه.' },
        { id: 'editText', label: 'ما الذي يجب تغييره؟', type: 'textarea', rows: 4,
          placeholder: 'اكتب التعليمة بالعربية أو الإنجليزية أو مختلط.\nمثال: استبدل الشخص الذي يرتدي القميص الأسود بالشخص الذي يرتدي القميص الأخضر مع الحفاظ على باقي الأشخاص والخلفية كما هي.',
          tip: 'صِف التعديل بدقة. النص يُنقل كما هو حتى لا يضيع معناه.' }
      ]
    },
    {
      id: 'subject', title: 'الشخصية / الموضوع',
      fields: [
        { id: 'subjectType', label: 'نوع الموضوع', type: 'select',
          options: ['Person', 'Two People', 'Group', 'Person + Product', 'Product', 'Character', 'Object', 'Custom'],
          ar: { 'Person': 'شخص واحد · بطل المشهد', 'Two People': 'شخصان · تفاعل بينهما', 'Group': 'مجموعة · حشد وسياق', 'Person + Product': 'شخص + منتج · يظهر الاتنين', 'Product': 'منتج · تركيز تجاري', 'Character': 'شخصية خيالية · تصميم', 'Object': 'عنصر · تفصيل مجسم', 'Custom': 'مخصص · وصف حر' },
          tip: 'يتحكم في الأقسام الظاهرة (مثال: المنتج يخفي البشرة والشعر).' },
        { id: 'peopleCount', label: 'عدد الأشخاص', type: 'number', min: 1, max: 30,
          showIf: function (s) { return s.subjectType === 'Person' || s.subjectType === 'Group'; },
          tip: 'اتركه فارغاً للإعداد الافتراضي.' },
        { id: 'subjectDetails', label: 'تفاصيل إضافية عن الموضوع (اختياري)', type: 'text',
          placeholder: 'مثال: رجل واثق في الثلاثينات / زجاجة عطر سوداء مطفأة' }
      ]
    },
    {
      id: 'product', title: 'تفاصيل المنتج',
      showIf: function (s) { return isProduct(s); },
      fields: [
        { id: 'productPlacement', label: 'مكان وضع المنتج', type: 'select',
          options: ['Centered Hero', 'Floating', 'On Pedestal', 'Flat Lay', 'Hand-held', 'In Use', 'Custom'],
          ar: { 'Centered Hero': 'منتصب المنتصف · بطل المشهد', 'Floating': 'عائم · ديناميكية وحركة', 'On Pedestal': 'على قاعدة · فخامة عرض', 'Flat Lay': 'من الأعلى · تنظيم وترتيب', 'Hand-held': 'في اليد · استخدام حقيقي', 'In Use': 'قيد الاستخدام · وظيفة واضحة', 'Custom': 'مخصص · وضع حر' } },
        { id: 'productSurface', label: 'السطح', type: 'select',
          options: ['Seamless Paper', 'Marble', 'Wood', 'Glass', 'Concrete', 'Fabric', 'Water Surface', 'Custom'],
          ar: { 'Seamless Paper': 'ورق متصل · نقاء تجاري', 'Marble': 'رخام · فخامة وبريق', 'Wood': 'خشب · دفء طبيعي', 'Glass': 'زجاج · شفافية وانعكاس', 'Concrete': 'خرسانة · خشونة حضرية', 'Fabric': 'قماش · نعومة وطي', 'Water Surface': 'سطح ماء · انعكاسات حية', 'Custom': 'مخصص · أي سطح' } },
        { id: 'productFocus', label: 'التركيز', type: 'multi',
          options: ['Label Clarity', 'Material Texture', 'Reflections Control', 'Packaging Detail', 'Scale Accuracy'],
          ar: { 'Label Clarity': 'وضوح الملصق · قراءة كاملة', 'Material Texture': 'خامة الملمس · تفاصيل ملموسة', 'Reflections Control': 'تحكم الانعكاسات · نظافة بصرية', 'Packaging Detail': 'تفاصيل التغليف · احترافية', 'Scale Accuracy': 'دقة المقياس · حجم صحيح' } }
      ]
    },
    {
      id: 'body', title: 'الجسد والوضعية', human: true,
      fields: [
        { id: 'bodyFraming', label: 'إطار الجسد', type: 'select',
          options: ['Full Body', '3/4 Body', 'Half Body', 'Waist Up', 'Portrait', 'Close-up', 'Extreme Close-up', 'Wide Shot'],
          ar: { 'Full Body': 'كامل · رؤية من الرأس للقدم', '3/4 Body': 'ثلاثة أرباع · ملاءمة متوازنة', 'Half Body': 'نصف الجسم · تفاصيل أوضح', 'Waist Up': 'من الخصر · تركيز وحضور', 'Portrait': 'بورتريه · تفاصيل الوجه', 'Close-up': 'قريبة · مشاع مباشرة', 'Extreme Close-up': 'قريبة جدًا · نسيج فائق', 'Wide Shot': 'واسعة · سياق وبيئة' } },
        { id: 'gazeDirection', label: 'اتجاه النظر / الرأس', type: 'select', def: 'Off',
          options: ['Off', 'At Camera', 'Away', 'Right', 'Left', 'Up', 'Down', 'Over Shoulder'],
          ar: { 'Off': 'بدون تحديد', 'At Camera': 'نحو الكاميرا · تواصل مباشر', 'Away': 'بعيد عن الكاميرا · حلم وتأمل', 'Right': 'لليمين · فضول يمين', 'Left': 'لليسار · نظر لليسار', 'Up': 'للاعلى · أمل وتفكر', 'Down': 'للأسفل · خجل وتفكير', 'Over Shoulder': 'خلفه · فوق الكتف' },
          tip: 'يحدد إلى أين ينظر الشخص أو يدير رأسه — قدام (الكاميرا) ولا وراه ولا يمين ولا شمال.' },
        { id: 'pose', label: 'الوضعية (اختيار متعدد)', type: 'multi',
          options: ['Standing', 'Sitting', 'Walking', 'Running', 'Leaning', 'Kneeling', 'Lying Down', 'Looking Over Shoulder', 'Arms Crossed', 'Hands in Pockets', 'Hand on Face', 'Holding Object', 'One Hand Raised', 'Both Hands Visible', 'Relaxed Pose', 'Dynamic Pose', 'Editorial Pose', 'Natural Pose', 'Custom Pose'],
          ar: { 'Standing': 'واقف · ثبات وهيبة', 'Sitting': 'قاعد · راحة طبيعية', 'Walking': 'مشي · حركة حية', 'Running': 'جري · طاقة وديناميكية', 'Leaning': 'مستند · استرخاء وثقة', 'Kneeling': 'راكع · تواضع وقوة', 'Lying Down': 'ممدود · استلقاء هادئ', 'Looking Over Shoulder': 'ينظر من فوق الكتف · جاذبية', 'Arms Crossed': 'ذراعان متقاطعتان · ثقة وحدها', 'Hands in Pockets': 'اليدين في الجيوب · كاجوال', 'Hand on Face': 'يد على الوجه · تأمل', 'Holding Object': 'يمسك شيئًا · تفاعل حقيقي', 'One Hand Raised': 'يد مرفوعة · ترحيب وإشارة', 'Both Hands Visible': 'اليدان ظاهرتان · سلامتان وتفاصيل', 'Relaxed Pose': 'مريحة · غير متكلفة', 'Dynamic Pose': 'ديناميكية · طاقة وحركة', 'Editorial Pose': 'تحريريرة · أزياء عالية', 'Natural Pose': 'طبيعية · عفوية صادقة', 'Custom Pose': 'مخصصة · وصفك الحر' },
          tip: 'يمكن دمج وضعيات متوافقة. في التعارض (مثل واقف + قاعد) يُحتفظ بالأختيار الأخير.' },
        { id: 'heldObject', label: 'الشيء الممسوك', type: 'text', placeholder: 'مثال: كوب قهوة في اليد اليمنى',
          showIf: function (s) { return (s.pose || []).indexOf('Holding Object') !== -1; } },
        { id: 'envInteraction', label: 'تفاعل الشخصية مع البيئة', type: 'select',
          options: ['Off', 'Touching Wall', 'Leaning on Surface', 'Walking Through', 'Sitting on Ground', 'Hand in Water', 'Opening Door', 'Holding Prop', 'Looking Around'],
          ar: {
            'Off': 'بدون تفاعل',
            'Touching Wall': 'يلمس الحائط — تلامس حقيقي · ارتباط بالمكان',
            'Leaning on Surface': 'مستند لسطح — راحة طبيعية · جسد واقعي',
            'Walking Through': 'يمشي داخل المشهد — حركة حية · عمق سردي',
            'Sitting on Ground': 'قاعدة على الأرض — استرخاء · اتصال بالأرض',
            'Hand in Water': 'يد في الماء — انعكاسات وترشيح · حياة',
            'Opening Door': 'يفتح باب — فضول وحركة · قصة',
            'Holding Prop': 'يمسك أدوة — تفاعل حقيقي · وظيفة',
            'Looking Around': 'ينظر حوله — فضول وانتباه · بيئة حية'
          },
          tip: 'يضيف تعليمات لتفاعل الشخصية مع محيطها (تلامس، حركة، جاذبية، انعكاسات) بدل وقفتها بشكل ساكن.' }
      ]
    },
    {
      id: 'spatial', title: 'المشهد المكاني (الموضع والاتجاه)',
      showIf: function (s) { return !isProduct(s) && s.mode !== 'Editing'; },
      fields: [
        { id: 'spatialObject', label: 'العنصر في المشهد', type: 'select', def: 'Auto',
          options: ['Auto', 'Television', 'Monitor', 'Laptop', 'Product', 'Another Person', 'Phone', 'Window', 'Custom'],
          ar: { 'Auto': 'تلقائي · يُستنتج من الفكرة', 'Television': 'تلفزيون · على الحائط', 'Monitor': 'شاشة كمبيوتر · على مكتب', 'Laptop': 'لابتوب · على طاولة', 'Product': 'منتج · على طاولة', 'Another Person': 'شخص آخر · بجانبه', 'Phone': 'موبايل · في اليد', 'Window': 'نافذة · على الحائط', 'Custom': 'مخصص · عنصر آخر' },
          tip: 'العنصر الذي يتفاعل معه الشخص. لو تركته تلقائي يُستنتج من الفكرة الرئيسية (يشاهد تلفزيون، يستخدم لابتوب، ينظر لمنتج...).' },
        { id: 'spatialInteraction', label: 'الفعل بين الشخص والعنصر', type: 'select', def: 'Auto',
          options: ['Auto', 'Watching', 'Using', 'Looking At', 'Talking To', 'Holding', 'Reaching'],
          ar: { 'Auto': 'تلقائي · يُستنتج من الفكرة', 'Watching': 'يشاهد · عينه على الشاشة', 'Using': 'يستخدم · يداه على الجهاز', 'Looking At': 'ينظر إلى · انتباه مركز', 'Talking To': 'يتحدث مع · وجهه نحو الآخر', 'Holding': 'يمسك · قبضة طبيعية', 'Reaching': 'يمد يده · نحو العنصر' },
          tip: 'يحدد اتجاه الجسم والرأس والعينين وخط النظر بدقة.' },
        { id: 'spatialPlacement', label: 'موضع العنصر بالنسبة للشخص', type: 'select', def: 'Auto',
          options: ['Auto', 'Front', 'Front Left', 'Front Right', 'Left', 'Right', 'Behind', 'Above', 'Below'],
          ar: { 'Auto': 'تلقائي · مناسب للمشهد', 'Front': 'أمامه · مباشرة', 'Front Left': 'أمامه يسار · قطري', 'Front Right': 'أمامه يمين · قطري', 'Left': 'يساره · جانبي', 'Right': 'يمينه · جانبي', 'Behind': 'خلفه · يلتفت للخلف', 'Above': 'فوقه · مستوى أعلى', 'Below': 'تحته · مستوى منخفض' },
          tip: 'مكان العنصر بالنسبة لوجه الشخص. لو اخترت موضعاً يتعارض مع الكاميرا، النظام يعدّله بأقل تغيير ويخبرك.' },
        { id: 'spatialDistance', label: 'المسافة بينهما', type: 'select', def: 'Auto',
          options: ['Auto', 'Arm Length', 'Close', 'Medium', 'Far'],
          ar: { 'Auto': 'تلقائي · حسب العنصر', 'Arm Length': 'ذراع · قريب جداً', 'Close': 'قريب · متر ونص', 'Medium': 'متوسط · مترين ونص', 'Far': 'بعيد · ٤ أمتار' },
          tip: 'المسافة التقريبية بين الشخص والعنصر.' },
        { id: 'spatialBodyFacing', label: 'اتجاه جسم الشخص', type: 'select', def: 'Auto',
          options: ['Auto', 'Toward Object', 'Toward Camera', 'Away From Camera', 'Three Quarter'],
          ar: { 'Auto': 'تلقائي · نحو العنصر', 'Toward Object': 'نحو العنصر · ملتفت له', 'Toward Camera': 'نحو الكاميرا · وجهه للمصور', 'Away From Camera': 'بعيداً عن الكاميرا · ظهره', 'Three Quarter': 'ثلاثة أرباع · وسط' },
          tip: 'لو اخترت "نحو الكاميرا" والعنصر خلفه أو بعيد عن الكاميرا، النظام يصحح الاتجاه تلقائياً ويخبرك.' }
      ]
    },
    {
      id: 'appearance', title: 'المظهر', human: true,
      fields: [
        { id: 'gender', label: 'النوع (رجل / سيدة)', type: 'select', options: ['Off', 'Man', 'Woman'], def: 'Off',
          ar: { 'Off': 'بدون تحديد · خيارات عامة', 'Man': 'رجل · يظهر خيارات الرجال', 'Woman': 'سيدة · يظهر خيارات السيدات' },
          tip: 'اختيار "رجل" يظهر التسريحات واللحية والإكسسوارات الرجالية، و"سيدة" يظهر التسريحات الأنثوية والمجوهرات والمكياج.' },
        { id: 'age', label: 'العمر', type: 'select', options: ['Child', 'Teen', 'Young Adult', 'Adult', 'Middle-aged', 'Elderly', 'Custom'],
          ar: { 'Child': 'طفل · براءة ونعومة', 'Teen': 'مراهق · حيوية شبابية', 'Young Adult': 'شاب · طاقة وحيوية', 'Adult': 'بالغ · نضج وثبات', 'Middle-aged': 'منتصف العمر · خبرة ووقار', 'Elderly': 'مسن · حكمة وتجاعيد', 'Custom': 'مخصص · وصف دقيق' } },
        { id: 'hairStyle', label: 'تسريحة الشعر', type: 'select', options: ['Short', 'Medium', 'Long', 'Curly', 'Wavy', 'Straight', 'Messy', 'Slick Back', 'Fade', 'Buzz Cut', 'Bob', 'Ponytail', 'Custom'],
          ar: { 'Short': 'قصير · نظافة وعملية', 'Medium': 'متوسط · مرونة تنسيق', 'Long': 'طويل · أنوثة وجاذبية', 'Curly': 'كيرلي · حجم وحركة', 'Wavy': 'مموّج · نعومة رومانسية', 'Straight': 'مفرود · سلاسة وترتيب', 'Messy': 'مشعث · عفوي وجريء', 'Slick Back': 'مسحوب للخلف · أناقة حادة', 'Fade': 'فيد · حدود حادة وشباب', 'Buzz Cut': 'قصير جدًا · رجولة وقوة', 'Bob': 'بوب · كلاسيكي أنيق', 'Ponytail': 'ذيل حصان · عملي رياضي', 'Custom': 'مخصص · أي تسريحة' } },
        { id: 'hairColor', label: 'لون الشعر', type: 'select', options: ['Black', 'Dark Brown', 'Brown', 'Blonde', 'Red', 'Gray', 'White', 'Custom'],
          ar: { 'Black': 'أسود · عمق وغموض', 'Dark Brown': 'بني داكن · دفء هادئ', 'Brown': 'بني · طبيعية تامة', 'Blonde': 'أشقر · إشراق وشباب', 'Red': 'أحمر · حيوية وجرأة', 'Gray': 'رمادي · نضج أنيق', 'White': 'أبيض · حكمة ووقار', 'Custom': 'مخصص · أي لون' } },
        { id: 'beard', label: 'اللحية (رجال)', type: 'select', options: ['None', 'Stubble', 'Short Beard', 'Full Beard', 'Long Beard', 'Mustache', 'Custom'],
          showIf: function (s) { return s.gender !== 'Woman'; },
          ar: { 'None': 'بدون · وجه نظيف', 'Stubble': 'خفيفة · رجولة يومية', 'Short Beard': 'قصيرة · مرتّبة وأنيقة', 'Full Beard': 'كاملة · حضور وقوة', 'Long Beard': 'طويلة · حكمة ووقار', 'Mustache': 'شارب · طابع كلاسيكي', 'Custom': 'مخصص · أي شكل' } },
        { id: 'skinTone', label: 'لون البشرة', type: 'select', options: ['Fair', 'Light', 'Medium', 'Tan', 'Brown', 'Deep Brown', 'Custom'],
          ar: { 'Fair': 'فاتح جدًا · شفافية ونعومة', 'Light': 'فاتح · نعومة ونقاء', 'Medium': 'متوسط · توازن طبيعي', 'Tan': 'أسمر · دفء شمسي', 'Brown': 'بني · عمق دافئ', 'Deep Brown': 'بني داكن · ثراء وحضور', 'Custom': 'مخصص · أي درجة' } },
        { id: 'expression', label: 'التعبير الوجهي', type: 'select', options: ['Neutral', 'Serious', 'Happy', 'Smiling', 'Confident', 'Relaxed', 'Thoughtful', 'Dramatic', 'Natural', 'Custom'],
          ar: { 'Neutral': 'محايد · هدوء وغموض', 'Serious': 'جاد · تركيز وقوة', 'Happy': 'سعيد · إيجابية دافئة', 'Smiling': 'ابتسامة · جاذبية طبيعية', 'Confident': 'واثق · حضور قوي', 'Relaxed': 'مسترخٍ · راحة تامة', 'Thoughtful': 'تأملي · عمق داخلي', 'Dramatic': 'درامي · مشاع قوية', 'Natural': 'طبيعي · غير مصطنع', 'Custom': 'مخصص · أي تعبير' } },
        { id: 'makeup', label: 'المكياج (سيدات)', type: 'select', options: ['Off', 'Natural', 'Glam', 'Bold', 'Editorial'], def: 'Off',
          ar: { 'Off': 'بدون مكياج', 'Natural': 'طبيعي · لمسة خفيفة', 'Glam': 'جذاب · إشراق وأناقة', 'Bold': 'جريء · ألوان قوية', 'Editorial': 'تحريري · مزاج مجلة' },
          showIf: function (s) { return s.gender === 'Woman'; },
          tip: 'مكياج السيدات — يظهر فقط عند اختيار "سيدة".' },
        { id: 'accessories', label: 'الإكسسوارات', type: 'multi', options: ['Glasses', 'Sunglasses', 'Watch', 'Hat', 'Cap', 'Jewelry', 'Earrings', 'Scarf', 'None', 'Custom'],
          ar: { 'Glasses': 'نظارة طبية · ذكاء ووقار', 'Sunglasses': 'نظارة شمسية · كول وجاذبية', 'Watch': 'ساعة · أناقة وتفاصيل', 'Hat': 'قبعة · طابع مميز', 'Cap': 'كاب · شباب ورياضة', 'Jewelry': 'مجوهرات · فخامة وبريق', 'Earrings': 'أقراط · لمسة أنثوية', 'Scarf': 'وشاح · دفء وستايل', 'None': 'بدون · بساطة نظيفة', 'Custom': 'مخصص · أي إكسسوار' } }
      ]
    },
    {
      id: 'clothing', title: 'الملابس', human: true,
      fields: [
        { id: 'clothingStyle', label: 'الستايل', type: 'select', options: ['Casual', 'Formal', 'Streetwear', 'Sportswear', 'Traditional', 'Luxury', 'Editorial', 'Business', 'Minimal', 'Custom'],
          ar: { 'Casual': 'كاجوال · راحة يومية', 'Formal': 'رسمية · وقار وأناقة', 'Streetwear': 'ستريت وير · جرأة حضرية', 'Sportswear': 'رياضي · حيوية وحركة', 'Traditional': 'تقليدية · هوية وأصالة', 'Luxury': 'فاخرة · تفخر وبريق', 'Editorial': 'تحريرية · أزياء عالية', 'Business': 'شركات · احترافية وثبات', 'Minimal': 'مينيمال · نظافة بسيطة', 'Custom': 'مخصص · وصف حر' } },
        { id: 'clothingColor', label: 'اللون', type: 'select', options: ['Black', 'White', 'Navy', 'Gray', 'Beige', 'Brown', 'Olive', 'Burgundy', 'Earth Tones', 'Monochrome', 'Pastel', 'Custom'],
          ar: { 'Black': 'أسود · أناقة كلاسيكية', 'White': 'أبيض · نظافة ونقاء', 'Navy': 'كحلي · رسمية دافئة', 'Gray': 'رمادي · حياد أنيق', 'Beige': 'بيج · نعومة ترابية', 'Brown': 'بني · دفء طبيعي', 'Olive': 'زيتي · طابع عسكري', 'Burgundy': 'خمري · فخامة عميقة', 'Earth Tones': 'ألوان ترابية · استقرار وهدوء', 'Monochrome': 'أحادي · تدرج راقٍ', 'Pastel': 'باستيل · نعومة فاتحة', 'Custom': 'مخصص · أي لون' } },
        { id: 'material', label: 'الخامة', type: 'select', options: ['Cotton', 'Linen', 'Denim', 'Leather', 'Wool', 'Silk', 'Satin', 'Technical Fabric', 'Custom'],
          ar: { 'Cotton': 'قطن · نعومة وتهوية', 'Linen': 'كتان · خفة صيفية', 'Denim': 'دنيم · متانة وشباب', 'Leather': 'جلد · جرأة وقوة', 'Wool': 'صوف · دفء فاخر', 'Silk': 'حرير · انسيابية ولمعان', 'Satin': 'ساتان · لمعان أنثوي', 'Technical Fabric': 'تقني · أداء وعملية', 'Custom': 'مخصص · أي خامة' } },
        { id: 'fit', label: 'القَصّة', type: 'select', options: ['Slim', 'Regular', 'Oversized', 'Relaxed', 'Tailored', 'Custom'],
          ar: { 'Slim': 'ضيقة · رسم الجسم', 'Regular': 'عادية · ملاءمة مريحة', 'Oversized': 'واسعة كبيرة · ترند حضري', 'Relaxed': 'مريحة · راحة تامة', 'Tailored': 'مفصّلة · خياطة احترافية', 'Custom': 'مخصص · أي قَصّة' } },
        { id: 'shoes', label: 'الحذاء', type: 'select', options: ['Sneakers', 'Formal Shoes', 'Boots', 'Loafers', 'Sandals', 'Traditional Shoes', 'Custom'],
          ar: { 'Sneakers': 'رياضي · راحة وشباب', 'Formal Shoes': 'رسمي · أناقة كاملة', 'Boots': 'بوت · قوة وطابع', 'Loafers': 'لوفير · راحة أنيقة', 'Sandals': 'صندل · خفة صيفية', 'Traditional Shoes': 'تقليدي · أصالة وتاريخ', 'Custom': 'مخصص · أي نوع' } },
        { id: 'clothingAccessories', label: 'إكسسوارات إضافية', type: 'text', placeholder: 'مثال: حزام جلد، مربعة حريرية' }
      ]
    },
    {
      id: 'background', title: 'الخلفية / المكان',
      fields: [
        { id: 'background', label: 'البيئة', type: 'select', options: ['Clean Studio', 'Luxury Interior', 'Modern Office', 'Urban Street', 'City', 'Nature', 'Forest', 'Beach', 'Desert', 'Industrial', 'Minimal', 'Dark Background', 'White Background', 'Black Background', 'Gradient Background', 'Luxury Hotel', 'Restaurant', 'Home Interior', 'Shopping Area', 'Architecture', 'Custom'],
          ar: { 'Clean Studio': 'استوديو نظيف · خلفية نقية', 'Luxury Interior': 'داخلية فاخرة · رفاهية وهدوء', 'Modern Office': 'مكتب حديث · احترافية', 'Urban Street': 'شارع حضري · نبض مدينة', 'City': 'مدينة · أفق معماري', 'Nature': 'طبيعة · خضرة وهواء', 'Forest': 'غابة · عمق أخضر وظلال', 'Beach': 'شاطئ · رمل وموج', 'Desert': 'صحراء · رمال وشمس', 'Industrial': 'صناعي · خشونة وقوة', 'Minimal': 'بسيط · تركيز تام', 'Dark Background': 'داكنة · دراما وعزل', 'White Background': 'بيضاء · نقاء تجاري', 'Black Background': 'سوداء · عمق وفخامة', 'Gradient Background': 'متدرجة · تدرّج لوني ناعم', 'Luxury Hotel': 'فندق فاخر · ترف عالٍ', 'Restaurant': 'مطعم · أجواء دافئة', 'Home Interior': 'داخل منزل · راحة ودفء', 'Shopping Area': 'منطقة تسوق · حياة وزحام', 'Architecture': 'عمارة · خطوط وهندسة', 'Custom': 'مخصص · أي مكان' } },
        { id: 'gradientColor1', label: 'كود لون التدرّج الأول (أعلى)', type: 'text', placeholder: 'مثال: #8A5A22 أو #0A1A2F',
          showIf: function (s) { return s.background === 'Gradient Background'; },
          tip: 'اكتب كود اللون بصيغة HEX. يُستخدم مع اللون الثاني لإنشاء تدرّج سلس بينهما.' },
        { id: 'gradientColor2', label: 'كود لون التدرّج الثاني (أسفل)', type: 'text', placeholder: 'مثال: #C8873F أو #1E2A3A',
          showIf: function (s) { return s.background === 'Gradient Background'; },
          tip: 'اكتب كود اللون بصيغة HEX. الخلفية ستتدرّج بين اللون الأول والثاني.' },
        { id: 'textSpace', label: 'مساحة فارغة للنص', type: 'select', options: ['Off', 'Left', 'Right', 'Top', 'Bottom'],
          ar: { 'Off': 'بدون', 'Left': 'فراغ يسار (للنص)', 'Right': 'فراغ يمين (للنص)', 'Top': 'فراغ أعلى (للعنوان)', 'Bottom': 'فراغ أسفل (للسطر التوضيحي)' },
          def: 'Off',
          tip: 'يخلي المنطقة المحددة فاضية تماماً عشان تحط عليها نص أو لوجو في فوتوشوب بعد كده.' },
        { id: 'textSpaceContent', label: 'النص الذي سيوضع (اختياري — للتوضيح)', type: 'text', placeholder: 'مثال: اسم العلامة التجارية أو شعار',
          showIf: function (s) { return s.textSpace && s.textSpace !== 'Off'; },
          tip: 'البروميت يوضّح للموديل إن المكان ده متروك للنص، والبروميت النهائي يظل إنجليزي.' },
        { id: 'bgDepth', label: 'عمق الخلفية', type: 'select', options: ['Flat', 'Minimal Depth', 'Natural Depth', 'Deep Environment', 'Cinematic Depth'],
          ar: { 'Flat': 'مسطحة · بلا عمق', 'Minimal Depth': 'عمق بسيط · هدوء بصري', 'Natural Depth': 'عمق طبيعي · واقعية', 'Deep Environment': 'بيئة عميقة · انغماس تام', 'Cinematic Depth': 'عمق سينمائي · طبقات' } },
        { id: 'bgPerspective', label: 'المنظور', type: 'select', options: ['Natural', 'Wide', 'Compressed', 'Cinematic'],
          ar: { 'Natural': 'طبيعي · بدون تشويه', 'Wide': 'واسع · اتساع مساحي', 'Compressed': 'مضغوط · تقارب الطبقات', 'Cinematic': 'سينمائي · مزاج فيلم' } },
        { id: 'foreground', label: 'عناصر المقدمة', type: 'text', placeholder: 'مثال: نباتات خارج تركيز' },
        { id: 'bgElements', label: 'عناصر الخلفية', type: 'text', placeholder: 'مثال: إضاءة بوكيه دافئة في المدينة' }
      ]
    },
    {
      id: 'lighting', title: 'الإضاءة',
      fields: [
        { id: 'lightingType', label: 'نوع الإضاءة', type: 'select',
          options: ['Flat Light', 'Loop Light', 'Rembrandt Light', 'Split Light', 'Rim Light', 'Silhouette Lighting', 'Butterfly Light', 'Soft Light', 'Hard Light', 'Strong Directional Light', 'Dramatic Light', 'Cinematic Light', 'Backlight', 'Side Light', 'Front Light', 'Top Light', 'Golden Hour', 'Neon Light', 'Studio Light', 'Natural Daylight'],
          ar: {
            'Flat Light': 'إضاءة مسطحة — بلا ظلال تقريبًا · تفاصيل واضحة',
            'Loop Light': 'إضاءة حلقة — ظل أنف صغير · واقعية طبيعية',
            'Rembrandt Light': 'إضاءة ريمبرانت — مثلث الضوء على الخد · درامية أنيقة',
            'Split Light': 'إضاءة منقسمة — نصف وجه في الظل · تباين عالي',
            'Rim Light': 'إضاءة إطار — حدود ضوئية مشرقة · فصل عن الخلفية',
            'Silhouette Lighting': 'إضاءة ظل شخصية — الجسم داكن أمام ضوء · غموض',
            'Butterfly Light': 'إضاءة فراشة — ظل تحت الأنف · جمالية فائقة',
            'Soft Light': 'إضاءة ناعمة — ظلال متدرّجة · ملامح هادئة',
            'Hard Light': 'إضاءة قوية — ظلال حادة واضحة · دراما قوية',
            'Strong Directional Light': 'إضاءة اتجاهية قوية — شدة عالية · نقوش واضحة',
            'Dramatic Light': 'إضاءة درامية — تباين عالٍ · مزاج قوي',
            'Cinematic Light': 'إضاءة سينمائية — مزاج فيلم · ألوان غنية',
            'Backlight': 'إضاءة خلفية — هالة مضيئة · عمق وفصل',
            'Side Light': 'إضاءة جانبية — نحت تفاصيل الوجه · نسيج واضح',
            'Front Light': 'إضاءة أمامية — إضاءة متساوية · وضوح كامل',
            'Top Light': 'إضاءة علوية — ظل تحت الحاجب · حضور قوي',
            'Golden Hour': 'ساعة ذهبية — دفء الغروب · وهج ذهبي',
            'Neon Light': 'إضاءة نيون — ألوان مشبعة · أجواء ليلية حضرية',
            'Studio Light': 'إضاءة استوديو — تحكم كامل · نظافة احترافية',
            'Natural Daylight': 'ضوء نهاري طبيعي — توازن حقيقي · ألوان صادقة'
          } },
        { id: 'secondaryLight', label: 'إضاءة ثانوية', type: 'select', options: ['Rim Light', 'Backlight', 'Fill Light', 'Hair Light', 'Practical Lights'],
          ar: { 'Rim Light': 'إضاءة إطار · فصل وتحديد', 'Backlight': 'إضاءة خلفية · هالة مضيئة', 'Fill Light': 'تعبئة · ملء الظلال', 'Hair Light': 'إضاءة شعر · لمعان وفصل', 'Practical Lights': 'مصادر المشهد · واقعية ودفء' } },
        { id: 'lightDirection', label: 'اتجاه الضوء', type: 'select', options: ['Front', 'Left', 'Right', 'Top', 'Back', 'Top Left', 'Top Right', 'Side'],
          ar: { 'Front': 'أمامي · إضاءة متساوية', 'Left': 'يسار · نحت الوجه يمينًا', 'Right': 'يمين · نحت الوجه يسارًا', 'Top': 'علوي · ظل تحت الحاجب', 'Back': 'خلفي · هالة مضيئة', 'Top Left': 'أعلى يسار · ظلال متوازنة', 'Top Right': 'أعلى يمين · إضاءة درامية', 'Side': 'جانبي · نحت وتفاصيل' } },
        { id: 'lightIntensity', label: 'الشدة', type: 'select', options: ['Soft', 'Medium', 'Strong', 'Very Strong'],
          ar: { 'Soft': 'خافتة · نعومة وهدوء', 'Medium': 'متوسطة · توازن طبيعي', 'Strong': 'قوية · حضور ونقوش', 'Very Strong': 'جداً قوية · إثارة بصرية' } },
        { id: 'shadowStrength', label: 'قوة الظل', type: 'select', options: ['Soft', 'Medium', 'Strong', 'Dramatic'],
          ar: { 'Soft': 'ناعم · تدرّج هادئ', 'Medium': 'متوسط · عمق طبيعي', 'Strong': 'قوي · نحت ودراما', 'Dramatic': 'درامي · تباين عالٍ' } },
        { id: 'colorTemp', label: 'حرارة اللون', type: 'select', options: ['Warm', 'Neutral', 'Cool', 'Mixed'],
          ar: { 'Warm': 'دافئ · مزاج رومانسي', 'Neutral': 'محايد · ألوان صادقة', 'Cool': 'بارد · مزاج هادئ', 'Mixed': 'مختلط · تباين لوني' } },
        { id: 'lightColor', label: 'لون الضوء المؤثر (يصبغ الشخص والمنتج)', type: 'select', def: 'Auto',
          options: ['Auto', 'Red', 'Blue', 'Green', 'Pink', 'Yellow', 'Warm', 'Cool'],
          ar: { 'Auto': 'تلقائي · حسب حرارة اللون', 'Red': 'أحمر · يصبغ الجسم بالأحمر', 'Blue': 'أزرق · ظلال زرقاء', 'Green': 'أخضر · صبغة خضراء', 'Pink': 'وردي · ناعم وحالم', 'Yellow': 'أصفر · دفء مشع', 'Warm': 'دافئ · برتقالي ذهبي', 'Cool': 'بارد · أزرق خفيف' },
          tip: 'لون الضوء اللي يقع على الشخص والمنتج. الجانب المواجه للضوء يأخذ اللون بقوة، والظل يتلون بنفس اللون.' }
      ]
    },
    {
      id: 'camera', title: 'الكاميرا',
      fields: [
        { id: 'shotType', label: 'نوع اللقطة', type: 'select', options: ['Extreme Close-up', 'Close-up', 'Medium Shot', 'Medium Full Shot', 'Full Shot', 'Wide Shot'],
          ar: { 'Extreme Close-up': 'قريبة جدًا · تفاصيل وجه', 'Close-up': 'قريبة · مشاع مباشرة', 'Medium Shot': 'متوسطة · توازن جسد ووجه', 'Medium Full Shot': 'متوسطة-كاملة · جسد وملابس', 'Full Shot': 'كاملة · رؤية من الرأس للقدم', 'Wide Shot': 'واسعة · بيئة وسياق' },
          tip: 'إذا كان إطار الجسد محدداً، فهو يأخذ الأولوية على نوع اللقطة.' },
        { id: 'cameraAngle', label: 'زاوية الكاميرا', type: 'select',
          options: ['Eye Level', 'Low Angle', 'High Angle', "Bird's Eye View", "Worm's Eye View", 'POV', 'Over-the-Shoulder', 'Dutch Angle', 'Long Shot', 'Top Down', 'Side Angle', 'Back Angle', 'Framed Shot', 'Orbit'],
          ar: {
            'Eye Level': 'مستوى العين — تعاطف مباشر · واقعية',
            'Low Angle': 'زاوية منخفضة — هيمنة وقوة · حجم أكبر',
            'High Angle': 'زاوية مرتفعة — صغر وتأمل · رؤية عامة',
            "Bird's Eye View": 'رؤية عين الطائر — من فوق مباشرة · مخطط شامل',
            "Worm's Eye View": 'رؤية عين الدودة — من الأسفل للأعلى · ملحمية',
            'POV': 'منظور POV — عين المشاهد · تفاعل مباشر',
            'Over-the-Shoulder': 'من فوق الكتف — حضور خفي · سرد بصري',
            'Dutch Angle': 'زاوية مائلة — توتر وقلق · إثارة',
            'Long Shot': 'لقطة بعيدة — سياق واسع · بيئة كاملة',
            'Top Down': 'لقطة علوية — من الأعلى للأعلى · تنظيم',
            'Side Angle': 'زاوية جانبية — ملف الظل · أناقة',
            'Back Angle': 'زاوية خلفية — غموض وهوية مخفية · فضول',
            'Framed Shot': 'لطرة مؤطّرة — إطار داخل الإطار · عمق',
            'Orbit': 'زاوية مدارية — دوران حول الموضوع · سينمائية'
          } },
        { id: 'lens', label: 'العدسة', type: 'select', options: ['14mm', '24mm', '35mm', '50mm', '85mm', '135mm', '200mm', '105mm', 'Macro'],
          ar: {
            '14mm': '14 مم — أوسع من كل شيء · تشويه درامي',
            '24mm': '24 مم — واسعة سينمائية · بيئة حاضرة',
            '35mm': '35 مم — قصة واقعية · الحياة اليومية',
            '50mm': '50 مم — رؤية بشرية طبيعية · صدق',
            '85mm': '85 مم — بورتريه كلاسيكي · بوكيه ناعم',
            '135mm': '135 مم — عزل قوي · خلفية حريرية',
            '200mm': '200 مم — ضغط مسافات · طبقات متقاربة',
            '105mm': '105 مم — تفصيل دقيق · تلوفوتو مرن',
            'Macro': 'ماكرو — أقصى تفاصيل · عالم صغير'
          },
          tip: 'اختيار العدسة يضبط تلقائياً التفاصيل المرتبطة بها (زاوية/مسافة/بوكيه) إذا كانت فارغة.' },
        { id: 'cameraDistance', label: 'المسافة', type: 'select', options: ['Very Close', 'Close', 'Medium', 'Far'],
          ar: { 'Very Close': 'قريبة جدًا · تفاصيل فائقة', 'Close': 'قريبة · حضور مباشر', 'Medium': 'متوسطة · توازن طبيعي', 'Far': 'بعيدة · سياق واسع' } },
        { id: 'cameraPerspective', label: 'منظور الكاميرا', type: 'select', options: ['Natural Perspective', 'Wide Perspective', 'Compressed Perspective', 'Cinematic Perspective'],
          ar: { 'Natural Perspective': 'طبيعي · رؤية بشرية', 'Wide Perspective': 'واسع · اتساع وتشويه خفيف', 'Compressed Perspective': 'مضغوط · تقارب سينمائي', 'Cinematic Perspective': 'سينمائي · عمق ملحمي' } },
        { id: 'composition', label: 'تكوين الصورة', type: 'select',
          options: ['Rule of Thirds', 'Centered Composition', 'Symmetrical', 'Negative Space', 'Leading Lines', 'Visual Hierarchy', 'Subject Placement', 'Headroom', 'Look Room', 'Breathing Room', 'Balance', 'Depth', 'Layering'],
          ar: {
            'Rule of Thirds': 'قانون الأثلاث — نقاط الاهتمام · توازن طبيعي',
            'Centered Composition': 'تكوين متمركز — محور قوة · ثبات وحضور',
            'Symmetrical': 'تكوين متناظر — انعكاس مثالي · رسمية أنيقة',
            'Negative Space': 'مساحة سالبة — فراغ ذكي · تركيز أعلى',
            'Leading Lines': 'خطوط توجيه — إيقاع بصري · عمق داخل الإطار',
            'Visual Hierarchy': 'تسلسل بصري — العين تتحرك بترتيب · سرد واضح',
            'Subject Placement': 'وضع الموضوع — تحكم بالمركز البصري · دقة',
            'Headroom': 'مساحة فوق الرأس — تنفّس صحيح · احترافية',
            'Look Room': 'مساحة النظر — اتجاه النظرة · حرية حكي',
            'Breathing Room': 'مساحة تنفّس — هواء حول الموضوع · راحة بصرية',
            'Balance': 'توازن بصري — ثقل موزّع · استقرار',
            'Depth': 'عمق — طبقات أمامية وخلفية · ثلاثية الأبعاد',
            'Layering': 'تراكب الطبقات — مقدمة ووسط وخلفية · سينمائية'
          } },
        { id: 'subjectPosition', label: 'وضعية الموضوع داخل الكادر', type: 'select',
          options: ['Left', 'Center', 'Right', 'Upper Third', 'Lower Third'],
          ar: {
            'Left': 'يسار الكادر — مساحة فراغ يمين · للنص',
            'Center': 'منتصف الكادر — تركيز مباشر · توازن',
            'Right': 'يمين الكادر — مساحة فراغ يسار · للنص',
            'Upper Third': 'الثلث العلوي — أفق مرتفع · علو وهيبة',
            'Lower Third': 'الثلث السفلي — قاعدة ثابتة · تأريخ وثبات'
          },
          tip: 'إضافة المساحة الفارغة لوضع النص: اختر يسار/يمين مع تفعيل مساحة النص في قسم الخلفية.' },
        { id: 'aspectRatio', label: 'نسبة الأبعاد', type: 'select', options: ['1:1', '4:5', '3:4', '2:3', '9:16', '16:9', '21:9'],
          ar: { '1:1': 'مربع · سوشيال ميديا', '4:5': 'إنستجرام · رأسي مثالي', '3:4': 'كلاسيكي · طباعة', '2:3': 'بوستر · رأسي طويل', '9:16': 'ستوري · موبايل عمودي', '16:9': 'عريضة · شاشات وعروض', '21:9': 'سينمائية · عرض واسع جداً' } }
      ]
    },
    {
      id: 'style', title: 'ستايل التصوير',
      fields: [
        { id: 'photoStyle', label: 'الستايل', type: 'select', options: ['Ultra Photorealistic', 'Commercial Photography', 'Fashion Photography', 'Editorial Photography', 'Cinematic Photography', 'Studio Photography', 'Advertising Photography', 'Documentary Photography', 'Luxury Photography', 'Product Photography', 'Lifestyle Photography', 'Portrait Photography', 'Custom'],
          ar: { 'Ultra Photorealistic': 'واقعي فائق · لا يُفرق عن حقيقية', 'Commercial Photography': 'تجاري · بيع وتسويق', 'Fashion Photography': 'أزياء · أناقة وستايل', 'Editorial Photography': 'تحريري · مجلة وقصة', 'Cinematic Photography': 'سينمائي · مزاج أفلام', 'Studio Photography': 'استوديو · تحكم كامل', 'Advertising Photography': 'إعلاني · جاذبية بيع', 'Documentary Photography': 'وثائقي · صدق ولحظة', 'Luxury Photography': 'فاخر · ترف وبريق', 'Product Photography': 'منتجات · تركيز تجاري', 'Lifestyle Photography': 'نمط حياة · طبيعة يومية', 'Portrait Photography': 'بورتريه · شخصية وحضور', 'Custom': 'مخصص · وصف حر' } }
      ]
    },
    {
      id: 'skin', title: 'البشرة والريتش', human: true,
      fields: [
        { id: 'skinTexture', label: 'ملمس البشرة', type: 'select', options: ['Natural', 'Detailed', 'Highly Detailed', 'Raw', 'Clean but Natural'],
          ar: { 'Natural': 'طبيعي · مسامات حقيقية', 'Detailed': 'مفصّل · نسيج واضح', 'Highly Detailed': 'مفصّل جدًا · فائق الدقة', 'Raw': 'خام · بدون معالجة', 'Clean but Natural': 'نظيف طبيعي · مثالي واقعي' } },
        { id: 'retouch', label: 'الريتش', type: 'select', options: ['None', 'Natural', 'Professional', 'Premium', 'Editorial'],
          ar: { 'None': 'بدون · خام 100%', 'Natural': 'طبيعي · لمسة خفيفة', 'Professional': 'احترافي · مسامات محفوظة', 'Premium': 'ممتاز · فخامة تحريرية', 'Editorial': 'تحريري · مزاج مجلة' } },
        { id: 'filmGrain', label: 'حبيبات الفيلم', type: 'select', options: ['Auto', 'None', 'Subtle', 'Noticeable'], def: 'Auto',
          ar: { 'Auto': 'تلقائي · حسب الإضاءة', 'None': 'بدون · نظافة رقمية', 'Subtle': 'خفيفة · طابع فيلم', 'Noticeable': 'واضحة · نوستالجيا قوية' } }
      ]
    },
    {
      id: 'color', title: 'تدرّج الألوان',
      fields: [
        { id: 'colorGrading', label: 'التدرّج (اختيار متعدد)', type: 'multi', options: ['Natural', 'Cinematic', 'Warm', 'Cool', 'High Contrast', 'Low Contrast', 'Muted', 'Vibrant', 'Film Look', 'Editorial Look', 'Luxury Look', 'Neutral'],
          ar: { 'Natural': 'طبيعي · ألوان صادقة', 'Cinematic': 'سينمائي · مزاج أفلام', 'Warm': 'دافئ · دفء ذهبي', 'Cool': 'بارد · هدوء أزرق', 'High Contrast': 'تباين عالٍ · جرأة', 'Low Contrast': 'تباين منخفض · نعومة', 'Muted': 'خافت · هدوء راقٍ', 'Vibrant': 'حيوي · ألوان مشبعة', 'Film Look': 'فيلم · نوستالجيا', 'Editorial Look': 'تحريري · مزاج مجلة', 'Luxury Look': 'فاخر · ترف لوني', 'Neutral': 'محايد · توازن تام' },
          tip: 'في التعارض (دافئ/بارد، تباين عالي/منخفض، خافت/حيوي) يُحتفظ بالأختيار الأخير.' }
      ]
    },
    {
      id: 'dof', title: 'عمق الميدان',
      fields: [
        { id: 'dof', label: 'عمق الميدان', type: 'select', options: ['Deep Focus', 'Natural Depth', 'Moderate Depth', 'Shallow Depth of Field', 'Extreme Bokeh', 'Cinematic Bokeh'],
          ar: { 'Deep Focus': 'عمق حاد · كل شيء واضح', 'Natural Depth': 'عمق طبيعي · واقعية', 'Moderate Depth': 'عمق متوسط · توازن', 'Shallow Depth of Field': 'ضحل · بوكيه ناعم', 'Extreme Bokeh': 'بوكيه قوي · خلفية مذابة', 'Cinematic Bokeh': 'بوكيه سينمائي · أضواء دائرية' } }
      ]
    },
    {
      id: 'quality', title: 'الجودة',
      fields: [
        { id: 'quality', label: 'الجودة (اختيار متعدد)', type: 'multi', options: ['High Quality', 'Ultra Detailed', 'Photorealistic', 'Ultra Photorealistic', '4K', '8K', 'Professional Photography', 'Sharp Details', 'Realistic Materials', 'Realistic Hands', 'Realistic Eyes', 'Detailed Hair', 'Accurate Anatomy'],
          ar: { 'High Quality': 'جودة عالية · تفاصيل نظيفة', 'Ultra Detailed': 'تفاصيل فائق · أدق الخيوط', 'Photorealistic': 'واقعي · كأنه صورة حقيقية', 'Ultra Photorealistic': 'واقعي فائق · لا يُصدق', '4K': '4K · دقة عالية', '8K': '8K · دقة فائقة', 'Professional Photography': 'احترافي · سينمائي ومرتب', 'Sharp Details': 'حادة · وضوح تام', 'Realistic Materials': 'خامات واقعية · ملموسية', 'Realistic Hands': 'أيادٍ واقعية · تشريح صحيح', 'Realistic Eyes': 'عيون واقعية · انعكاسات حية', 'Detailed Hair': 'شعر مفصّل · خيوط حقيقية', 'Accurate Anatomy': 'تشريح دقيق · بلا تشوّه' },
          tip: 'يتم إزالة التكرارات تلقائياً (8K تستبدل 4K، والواقعي الفائق تستبدل الواقعي).' }
      ]
    },
    {
      id: 'custom', title: 'تعليمات مخصصة',
      fields: [
        { id: 'customText', label: 'اكتب تعليماتك هنا (بالعربية)', type: 'textarea', rows: 5,
          placeholder: 'اكتب أي تعليمة إضافية بالعربية أو الإنجليزية. كل جملة في سطر أفضل.\nمثال: الشخص ماسك النظارة بإيده اليمين وبيبص بعيد عن الكاميرا\nمثال: خلي الشخص واقف ناحية اليمين مع ترك مساحة فارغة على اليسار\nمثال: حافظ على الخلفية الأصلية بدون أي تغيير',
          tip: 'كل جملة تُوضع في المكان الصحيح من البروميت (الوضعية، الخلفية، الكاميرا...). النص غير المصنّف يبقى في قسم التعليمات المخصصة كما هو بالضبط.' },
        { id: 'customPriority', label: 'أولوية التعليمات', type: 'select', options: ['Normal', 'High', 'Critical'], def: 'Normal',
          ar: { 'Normal': 'عادية · تدمج مع الخيارات', 'High': 'عالية · تتفوق عند التعارض', 'Critical': 'حرجة · تُحفظ حرفياً' },
          tip: 'عادية: تُدمج مع الخيارات. عالية: تتفوق على الخيارات عند التعارض. حرجة: تُنقل كما هي حرفياً بدون اختصار.' }
      ]
    },
    {
      id: 'designHidden', title: 'استوديو الأفكار الإعلانية',
      showIf: function () { return false; },
      fields: [
        { id: 'mainIdea', label: 'الفكرة الرئيسية', type: 'hidden' },
        { id: 'imageStory', label: 'قصة الصورة / الهدف منها', type: 'hidden' },
        { id: 'targetModel', label: 'موديل الهدف', type: 'hidden', def: 'Universal' },
        { id: 'copyFormat', label: 'صيغة النسخ', type: 'hidden', def: 'prompt' },
        { id: 'designPrimary', label: 'النوع الأساسي', type: 'hidden' },
        { id: 'designExtras', label: 'أنواع إضافية', type: 'hidden', def: [] },
        { id: 'designIdea', label: 'فكرة خاصة', type: 'hidden' }
      ]
    },
    {
      id: 'negative', title: 'البروميت السلبي',
      fields: [
        { id: 'autoNegative', label: 'توليد بروميت سلبي تلقائي من الخيارات', type: 'toggle', def: true },
        { id: 'negativeExtra', label: 'بروميت سلبي إضافي', type: 'textarea', rows: 3, placeholder: 'افصل بين العناصر بفاصلة أو سطر جديد، مثال: إضاءة فلاش قوية، وهج عدسة' }
      ]
    }
  ];

  /* Auto-create companion "Custom" text inputs for any option starting with "Custom".
     label companion = Arabic label + " — مخصص". */
  sections.forEach(function (sec) {
    var extra = [];
    sec.fields.forEach(function (f) {
      if (!f.options) return;
      var customOpt = null;
      f.options.forEach(function (o) { if (o.indexOf('Custom') === 0) customOpt = o; });
      if (!customOpt) return;
      f.customOption = customOpt;
      var baseAr = (f.ar && f.ar[customOpt]) ? f.ar[customOpt].replace(/\s*\(.*\)$/, '') : f.label.replace(/\s*\(.*\)$/, '');
      extra.push({ after: f.id, field: {
        id: f.id + 'Custom', label: baseAr + ' — مخصص', type: 'text', companion: true,
        placeholder: 'اكتب هنا…',
        showIf: (function (fid, type, opt) {
          return function (s) {
            return type === 'multi' ? (s[fid] || []).indexOf(opt) !== -1 : s[fid] === opt;
          };
        })(f.id, f.type, customOpt)
      } });
    });
    extra.forEach(function (e) {
      for (var i = 0; i < sec.fields.length; i++) {
        if (sec.fields[i].id === e.after) { sec.fields.splice(i + 1, 0, e.field); break; }
      }
    });
  });

  /* Returns Arabic display text for an option value of a field. */
  function optLabel(f, value) {
    if (f && f.ar && f.ar[value] !== undefined) return f.ar[value];
    return value;
  }

  /** Returns a fresh default state, applying user settings defaults. */
  function defaultState(settings) {
    var st = { mode: 'Generation' };
    sections.forEach(function (sec) {
      sec.fields.forEach(function (f) {
        if (f.type === 'image') { st[f.id] = ''; return; }
        if (f.type === 'images') { st[f.id] = []; return; }
        if (f.type === 'multi') st[f.id] = f.def ? f.def.slice() : [];
        else if (f.type === 'toggle') st[f.id] = f.def !== undefined ? f.def : false;
        else if (Array.isArray(f.def)) st[f.id] = f.def.slice(); /* لا نشارك مصفوفة الافتراضي */
        else st[f.id] = f.def !== undefined ? f.def : '';
      });
    });
    if (settings) {
      if (settings.defaultIdentity) st.identity = settings.defaultIdentity;
      if (settings.defaultSkin) st.skinTexture = settings.defaultSkin;
      var q = PS.Schema.qualityProfiles[settings.defaultQuality];
      if (q) st.quality = q.slice();
    }
    return st;
  }

  function isSectionVisible(sec, s) {
    // "شخص + منتج": قسم المنتج يظهر مع أقسام الشخص معاً
    if (sec.id === 'product' && s.subjectType === 'Person + Product') return true;
    if (sec.showIf && !sec.showIf(s)) return false;
    if (sec.human && isProduct(s)) return false;
    // مع وجود صورة مرجعية: قسم المظهر مخفي حتى يفعّل المستخدم "بناء الشخصية من الصفر"
    if (sec.id === 'appearance' && (s.refImages && s.refImages.length > 0) && !s.buildAppearance) return false;
    return true;
  }

  function isFieldVisible(f, s) { return !f.showIf || !!f.showIf(s); }

  function findSection(id) {
    for (var i = 0; i < sections.length; i++) if (sections[i].id === id) return sections[i];
    return null;
  }

  /* خيارات مخصصة حسب النوع: التسريحة والإكسسوارات */
  var GENDERED = {
    hairStyle: {
      Man: ['Short', 'Medium', 'Curly', 'Wavy', 'Straight', 'Messy', 'Slick Back', 'Fade', 'Buzz Cut', 'Custom'],
      Woman: ['Long', 'Medium', 'Curly', 'Wavy', 'Straight', 'Bob', 'Ponytail', 'Messy', 'Custom']
    },
    accessories: {
      Man: ['Glasses', 'Sunglasses', 'Watch', 'Hat', 'Cap', 'None', 'Custom'],
      Woman: ['Glasses', 'Sunglasses', 'Jewelry', 'Earrings', 'Scarf', 'Hat', 'None', 'Custom']
    }
  };

  PS.Schema = {
    sections: sections,
    HUMAN_TYPES: HUMAN_TYPES,
    PRODUCT_TYPES: PRODUCT_TYPES,
    GENDERED: GENDERED,
    isProduct: isProduct,
    isMultiPerson: isMultiPerson,
    optLabel: optLabel,
    defaultState: defaultState,
    isSectionVisible: isSectionVisible,
    isFieldVisible: isFieldVisible,
    findSection: findSection,
    qualityProfiles: {
      'None': [],
      'Standard': ['High Quality', 'Sharp Details'],
      'Photoreal 4K': ['Photorealistic', '4K', 'Sharp Details', 'Realistic Materials'],
      'Ultra 8K': ['Ultra Photorealistic', '8K', 'Ultra Detailed', 'Sharp Details', 'Realistic Materials']
    },
    DEFAULT_TEMPLATE:
      '[TASK] [IDENTITY]\n' +
      '[SUBJECT] [APPEARANCE] [POSE] [SPATIAL] [CLOTHING]\n' +
      '[DESIGN]\n' +
      '[ENVIRONMENT]\n' +
      '[LIGHTING]\n' +
      '[CAMERA] [DOF]\n' +
      '[STYLE] [SKIN]\n' +
      '[COLOR] [QUALITY]\n' +
      '[PRESERVE]\n' +
      '[CUSTOM]\n' +
      '[NEGATIVE]'
  };
})();
