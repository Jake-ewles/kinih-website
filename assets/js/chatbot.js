/* Kinih FAQ chatbot. Runs fully in the browser: matches the question against a knowledge base
   (EN / FR / AR, plus common Darija words) and answers in the visitor's current language. */
(function () {
  var L = function () { return window.currentLang || 'en'; };

  var ACTIONS = {
    book:     { href: 'contact.html', icon: 'fa-calendar-check', en: 'Book free assessment', fr: 'Réserver le bilan gratuit', ar: 'احجز التقييم المجاني' },
    pricing:  { href: 'pricing.html', icon: 'fa-tag', en: 'See pricing', fr: 'Voir les tarifs', ar: 'شاهد الأسعار' },
    programs: { href: 'programs.html', icon: 'fa-dumbbell', en: 'See programs', fr: 'Voir les programmes', ar: 'شاهد البرامج' },
    coaches:  { href: 'coaches.html', icon: 'fa-user', en: 'Meet the coaches', fr: 'Voir les coachs', ar: 'تعرف على المدربين' },
    results:  { href: 'results.html', icon: 'fa-chart-line', en: 'See results', fr: 'Voir les résultats', ar: 'شاهد النتائج' },
    map:      { href: 'https://www.google.com/maps/search/?api=1&query=Rue+des+Orangers+Ain+Sebaa+Casablanca', icon: 'fa-location-dot', en: 'Open in Maps', fr: 'Ouvrir dans Maps', ar: 'افتح الخريطة' },
    call:     { href: 'tel:+212645678594', icon: 'fa-phone', en: 'Call us', fr: 'Appeler', ar: 'اتصل بنا' },
    whatsapp: { href: 'https://wa.me/212645678594', icon: 'fa-whatsapp', brand: true, en: 'WhatsApp', fr: 'WhatsApp', ar: 'واتساب' }
  };

  // k: keywords (any language). A leading "=" means whole-word match only.
  var KB = [
    { id: 'hours', k: ['hour', 'open', 'close', 'closing', 'opening', 'what time', 'when', 'sunday', 'weekend', 'ramadan', 'horaire', 'heure', 'ouvert', 'ouvre', 'ferme', 'dimanche', 'quand', 'ساعات', 'الساعة', 'وقت', 'مفتوح', 'تفتح', 'تغلق', 'متى', 'امتى', 'الأحد'],
      q: { en: 'What are your opening hours?', fr: 'Quels sont vos horaires ?', ar: 'ما هي ساعات العمل؟' },
      a: { en: 'Kinih is open <b>every day, 4 AM to 10 PM</b>, weekends included. Early birds and late trainers are both covered.',
           fr: 'Kinih est ouvert <b>tous les jours de 4h à 22h</b>, week-end compris. Que vous soyez matinal ou du soir, la salle est ouverte.',
           ar: 'كينيه مفتوح <b>كل يوم من 4 صباحًا إلى 10 مساءً</b>، بما في ذلك عطلة نهاية الأسبوع.' },
      act: ['book'] },
    { id: 'location', k: ['where', 'address', 'location', 'located', 'find you', 'directions', 'map', 'ain sebaa', 'adresse', 'situe', 'trouver', 'localisation', 'عنوان', 'أين', 'اين', 'فين', 'مكان', 'موقع', 'خريطة', 'عين السبع'],
      q: { en: 'Where is the gym located?', fr: 'Où se trouve la salle ?', ar: 'أين توجد الصالة؟' },
      a: { en: 'We are at <b>1034 Rue des Orangers, Aïn Sebaâ, Casablanca</b>. Easy to reach from Sidi Bernoussi, Hay Mohammadi, Roches Noires and Sidi Moumen.',
           fr: 'Nous sommes au <b>1034 Rue des Orangers, Aïn Sebaâ, Casablanca</b>. Facile d\'accès depuis Sidi Bernoussi, Hay Mohammadi, Roches Noires et Sidi Moumen.',
           ar: 'نحن في <b>1034 شارع البرتقال، عين السبع، الدار البيضاء</b>. قريبون من سيدي البرنوصي والحي المحمدي والصخور السوداء وسيدي مومن.' },
      act: ['map', 'call'] },
    { id: 'prices', k: ['price', 'cost', 'how much', 'fee', 'monthly', 'membership', 'subscription', 'expensive', 'cheap', '=mad', 'dirham', 'prix', 'tarif', 'combien', 'abonnement', 'cher', 'mois', 'ثمن', 'سعر', 'اسعار', 'أسعار', 'بشحال', 'شحال', '=كم', 'اشتراك', 'درهم', 'غالي'],
      q: { en: 'How much does it cost?', fr: 'Combien ça coûte ?', ar: 'كم ثمن الاشتراك؟' },
      a: { en: 'Three monthly plans, no setup fee:<br>• <b>Self-Guided</b>: 300 MAD<br>• <b>Coached</b>: 500 MAD (most popular)<br>• <b>Premium 1-on-1</b>: 1000 MAD<br>The price you see is everything you pay.',
           fr: 'Trois formules mensuelles, sans frais d\'inscription :<br>• <b>Autonome</b> : 300 DH<br>• <b>Coaché</b> : 500 DH (la plus choisie)<br>• <b>Premium individuel</b> : 1000 DH<br>Le prix affiché est le prix payé.',
           ar: 'ثلاث خطط شهرية بدون رسوم تسجيل:<br>• <b>تدريب ذاتي</b>: 300 درهم<br>• <b>بمرافقة مدرب</b>: 500 درهم (الأكثر طلبًا)<br>• <b>بريميوم فردي</b>: 1000 درهم<br>السعر المعروض هو كل ما تدفعه.' },
      act: ['pricing', 'book'] },
    { id: 'plans', k: ['difference', 'compare', 'which plan', 'best plan', 'premium', 'coached', 'self-guided', 'self guided', 'difference', 'formule', 'quelle formule', 'autonome', 'coache', 'فرق', 'الفرق', 'بريميوم', 'أي خطة', 'اي خطة', 'خطة'],
      q: { en: 'What is the difference between the plans?', fr: 'Quelle différence entre les formules ?', ar: 'ما الفرق بين الخطط؟' },
      a: { en: '<b>Self-Guided</b> gives you the gym, a starter plan and a monthly check-in. <b>Coached</b> adds a custom plan, weekly coach check-ins and nutrition guidance. <b>Premium 1-on-1</b> adds in-person sessions, direct messaging with your coach and priority scheduling. Most members pick Coached.',
           fr: '<b>Autonome</b> : la salle, un plan de départ et un bilan mensuel. <b>Coaché</b> ajoute un plan sur mesure, un point hebdomadaire avec le coach et un suivi nutritionnel. <b>Premium individuel</b> ajoute les séances en présentiel, la messagerie directe et la réservation prioritaire. La plupart choisissent Coaché.',
           ar: '<b>التدريب الذاتي</b>: الصالة وخطة أولية ومتابعة شهرية. <b>بمرافقة مدرب</b>: خطة مخصصة ومتابعة أسبوعية وإرشاد غذائي. <b>بريميوم فردي</b>: حصص حضورية وتواصل مباشر مع المدرب وأولوية في الحجز. أغلب الأعضاء يختارون خطة المدرب.' },
      act: ['pricing'] },
    { id: 'free', k: ['free', 'assessment', 'trial', '=try', 'test', 'first visit', 'visit', 'bilan', 'gratuit', 'essai', 'essayer', 'offert', 'تقييم', 'مجاني', 'مجانا', 'فابور', 'تجربة', 'نجرب'],
      q: { en: 'Is the first assessment free?', fr: 'Le premier bilan est-il gratuit ?', ar: 'هل التقييم الأول مجاني؟' },
      a: { en: 'Yes. Your <b>first assessment is free</b> and there is no commitment. A coach reviews your movement, goals and lifestyle, then shows you around the gym.',
           fr: 'Oui. Votre <b>premier bilan est gratuit</b> et sans engagement. Un coach évalue votre mobilité, vos objectifs et votre mode de vie, puis vous fait visiter la salle.',
           ar: 'نعم. <b>التقييم الأول مجاني</b> وبدون أي التزام. يقيم المدرب حركتك وأهدافك ونمط حياتك، ثم يعرفك على الصالة.' },
      act: ['book'] },
    { id: 'booking', k: ['book', 'reserve', 'appointment', 'sign up', 'signup', 'join', 'register', 'start', 'enroll', 'reserver', 'inscri', 'rendez', 'commencer', 'rejoindre', 'حجز', 'احجز', 'أحجز', 'تسجيل', 'سجل', 'موعد', 'نبدا', 'أبدأ', 'ابدأ'],
      q: { en: 'How do I book or sign up?', fr: 'Comment réserver ou m\'inscrire ?', ar: 'كيف أحجز أو أسجل؟' },
      a: { en: 'Fill in the short form on the contact page (name, phone, goal, preferred day). A coach calls you to confirm your free assessment. You can also call or WhatsApp us directly.',
           fr: 'Remplissez le petit formulaire de la page contact (nom, téléphone, objectif, jour souhaité). Un coach vous appelle pour confirmer votre bilan gratuit. Vous pouvez aussi nous appeler ou nous écrire sur WhatsApp.',
           ar: 'املأ النموذج القصير في صفحة الاتصال (الاسم، الهاتف، الهدف، اليوم المفضل). سيتصل بك مدرب لتأكيد تقييمك المجاني. ويمكنك أيضًا الاتصال بنا أو مراسلتنا على واتساب.' },
      act: ['book', 'whatsapp'] },
    { id: 'payment', k: ['pay', 'payment', 'card', 'cash', 'online', 'credit', 'visa', 'payer', 'paiement', 'carte', 'especes', 'en ligne', 'دفع', 'ادفع', 'أدفع', 'بطاقة', 'كاش', 'نقد', 'نخلص', 'الخلاص'],
      q: { en: 'How can I pay?', fr: 'Comment payer ?', ar: 'كيف أدفع؟' },
      a: { en: 'You pay <b>at the front desk</b> when you visit, in cash or by bank card. There is no online payment, so booking your assessment costs nothing.',
           fr: 'Vous payez <b>à l\'accueil</b> lors de votre visite, en espèces ou par carte bancaire. Aucun paiement en ligne : réserver votre bilan ne coûte rien.',
           ar: 'تدفع <b>في الاستقبال</b> عند زيارتك، نقدًا أو ببطاقة بنكية. لا يوجد دفع عبر الإنترنت، وحجز التقييم مجاني.' } },
    { id: 'program', k: ['program', 'lose weight', 'weight loss', 'fat', 'slim', 'lean', 'muscle', 'bulk', 'mass', 'strength', 'stronger', 'programme', 'maigrir', 'perdre', 'poids', 'mincir', 'gras', 'masse', 'force', 'برنامج', 'وزن', 'تنحيف', 'دهون', 'نحف', 'عضلات', 'ضخامة', 'كتلة', 'قوة'],
      q: { en: 'Which program is right for me?', fr: 'Quel programme me convient ?', ar: 'أي برنامج يناسبني؟' },
      a: { en: 'It depends on your goal:<br>• <b>Lean &amp; Lighter</b> to lose fat with habits that last<br>• <b>Stronger &amp; Bigger</b> to build muscle and strength<br>• <b>Nutrition Coaching</b> if your training is fine but results stalled<br>Not sure? The free assessment helps you choose.',
           fr: 'Tout dépend de votre objectif :<br>• <b>Perte de poids</b> pour perdre du gras durablement<br>• <b>Prise de muscle</b> pour gagner en muscle et en force<br>• <b>Coaching nutrition</b> si vous stagnez malgré l\'entraînement<br>Vous hésitez ? Le bilan gratuit vous aide à choisir.',
           ar: 'حسب هدفك:<br>• <b>أخف وزنًا</b> لخسارة الدهون بعادات تدوم<br>• <b>أقوى وأضخم</b> لبناء العضلات والقوة<br>• <b>التدريب الغذائي</b> إذا توقفت نتائجك رغم التدريب<br>غير متأكد؟ التقييم المجاني يساعدك على الاختيار.' },
      act: ['programs', 'book'] },
    { id: 'beginner', k: ['beginner', 'first time', 'never', 'new to', 'out of shape', 'unfit', 'scared', 'nervous', 'debutant', 'jamais', 'premiere fois', 'pas sportif', 'مبتدئ', 'أول مرة', 'اول مرة', 'عمري ما', 'خايف'],
      q: { en: 'I am a beginner. Is Kinih for me?', fr: 'Je suis débutant, Kinih est pour moi ?', ar: 'أنا مبتدئ، هل كينيه مناسب لي؟' },
      a: { en: 'Absolutely. Many members start with zero gym experience. Your coach starts from your level, teaches you the right technique and builds up step by step. Nobody trains alone or guesses.',
           fr: 'Bien sûr. Beaucoup de membres commencent sans aucune expérience. Votre coach part de votre niveau, vous apprend la bonne technique et progresse étape par étape avec vous.',
           ar: 'بالتأكيد. كثير من الأعضاء بدؤوا بدون أي خبرة. مدربك يبدأ من مستواك، يعلمك التقنية الصحيحة ويتقدم معك خطوة بخطوة.' },
      act: ['book'] },
    { id: 'coaches', k: ['coach', 'trainer', 'instructor', '=who', 'karim', 'hanao', 'djelil', 'personal training', 'entraineur', 'qui', 'مدرب', 'كوتش', 'المدربين', 'كريم', 'جليل'],
      q: { en: 'Who are the coaches?', fr: 'Qui sont les coachs ?', ar: 'من هم المدربون؟' },
      a: { en: 'Three specialists:<br>• <b>Karim Ali</b>: weight loss, 8 years coaching<br>• <b>Hanao Ibhraim</b>: strength and muscle, 5 years<br>• <b>Djelil Baba</b>: nutrition, 5 years<br>You can ask for a specific coach when you book.',
           fr: 'Trois spécialistes :<br>• <b>Karim Ali</b> : perte de poids, 8 ans d\'expérience<br>• <b>Hanao Ibhraim</b> : force et muscle, 5 ans<br>• <b>Djelil Baba</b> : nutrition, 5 ans<br>Vous pouvez demander un coach précis en réservant.',
           ar: 'ثلاثة متخصصين:<br>• <b>كريم علي</b>: خسارة الوزن، 8 سنوات خبرة<br>• <b>هناو إبراهيم</b>: القوة والعضلات، 5 سنوات<br>• <b>جليل بابا</b>: التغذية، 5 سنوات<br>يمكنك طلب مدرب معين عند الحجز.' },
      act: ['coaches'] },
    { id: 'nutrition', k: ['diet', 'food', 'nutrition', 'meal', '=eat', 'calorie', 'protein', 'supplement', 'regime', 'alimentation', 'manger', 'repas', 'proteine', 'تغذية', 'أكل', 'اكل', 'حمية', 'ريجيم', 'بروتين', 'وجبات'],
      q: { en: 'Do you help with nutrition?', fr: 'Aidez-vous pour la nutrition ?', ar: 'هل تساعدون في التغذية؟' },
      a: { en: 'Yes. Nutrition guidance is included in the Coached and Premium plans. You get portions matched to your goal and simple meal ideas built around food you already enjoy, reviewed with your coach every week. No crash diets.',
           fr: 'Oui. Le suivi nutritionnel est inclus dans les formules Coaché et Premium : des portions adaptées à votre objectif et des idées de repas simples, revues chaque semaine avec votre coach. Pas de régime express.',
           ar: 'نعم. الإرشاد الغذائي مشمول في خطتي المدرب والبريميوم: كميات تناسب هدفك وأفكار وجبات بسيطة من الأكل الذي تحبه، تراجع مع مدربك كل أسبوع. بدون حميات قاسية.' },
      act: ['programs'] },
    { id: 'contract', k: ['contract', 'cancel', 'commitment', 'engagement', 'stop', 'freeze', 'pause', 'long term', 'contrat', 'annuler', 'resilier', 'arreter', 'عقد', 'التزام', 'إلغاء', 'الغاء', 'توقف', 'نوقف'],
      q: { en: 'Is there a contract or commitment?', fr: 'Y a-t-il un engagement ?', ar: 'هل يوجد عقد أو التزام؟' },
      a: { en: 'No long contract. Plans are <b>month to month</b>, with no setup fee. You can stop at the end of any month by telling the front desk.',
           fr: 'Pas de long contrat. Les formules sont <b>mensuelles</b>, sans frais d\'inscription. Vous pouvez arrêter à la fin de n\'importe quel mois en prévenant l\'accueil.',
           ar: 'لا يوجد عقد طويل. الخطط <b>شهرية</b> وبدون رسوم تسجيل. يمكنك التوقف في نهاية أي شهر بإخبار الاستقبال.' } },
    { id: 'classes', k: ['class', 'schedule', 'group', 'circuit', 'session', 'timetable', 'cours', 'planning', 'collectif', 'seance', 'حصة', 'حصص', 'جدول', 'كلاس', 'جماعي'],
      q: { en: 'Do you have group classes?', fr: 'Proposez-vous des cours collectifs ?', ar: 'هل لديكم حصص جماعية؟' },
      a: { en: 'Yes. <b>Fat-Loss Circuit</b> runs Mon, Wed and Fri at 6:00 and Sat at 9:00. <b>Strength Foundations</b> runs Mon and Fri at 17:00 and Sat at 11:00. 1-on-1 slots are by booking and the open gym runs 4:00 to 22:00 daily.',
           fr: 'Oui. <b>Circuit perte de gras</b> : lun, mer et ven à 6h, sam à 9h. <b>Fondamentaux de force</b> : lun et ven à 17h, sam à 11h. Coaching individuel sur réservation, salle libre de 4h à 22h tous les jours.',
           ar: 'نعم. <b>حصة حرق الدهون</b>: الإثنين والأربعاء والجمعة 6:00 والسبت 9:00. <b>أساسيات القوة</b>: الإثنين والجمعة 17:00 والسبت 11:00. التدريب الفردي بالحجز، والصالة مفتوحة يوميًا من 4:00 إلى 22:00.' },
      act: ['programs'] },
    { id: 'facilities', k: ['locker', 'shower', 'changing', 'equipment', 'machine', 'cardio', 'weights', 'dumbbell', 'facilit', 'clean', 'vestiaire', 'douche', 'equipement', 'poids', 'propre', 'ملابس', 'دوش', 'حمام', 'خزانة', 'معدات', 'أجهزة', 'اجهزة', 'كارديو', 'نظيف'],
      q: { en: 'What equipment and facilities do you have?', fr: 'Quels équipements avez-vous ?', ar: 'ما هي المعدات والمرافق؟' },
      a: { en: 'A full strength floor with racks, benches and free weights, a cardio area, a private 1-on-1 coaching zone, and clean locker rooms. You can see photos on the home page.',
           fr: 'Un plateau de musculation complet (racks, bancs, poids libres), un espace cardio, une zone de coaching individuel et des vestiaires propres. Les photos sont sur la page d\'accueil.',
           ar: 'منطقة قوة كاملة بأجهزة ومقاعد وأوزان حرة، ومنطقة كارديو، ومساحة للتدريب الفردي، وغرف ملابس نظيفة. الصور موجودة في الصفحة الرئيسية.' } },
    { id: 'women', k: ['women', 'woman', 'female', 'ladies', 'girl', 'femme', 'fille', 'dame', 'نساء', 'بنات', 'سيدات', 'امرأة', 'المرأة'],
      q: { en: 'Is Kinih good for women?', fr: 'Kinih convient-il aux femmes ?', ar: 'هل كينيه مناسب للنساء؟' },
      a: { en: 'Yes, Kinih welcomes everyone. Our coaches build plans for women and men, for fat loss or strength. When you book, you can tell us if you prefer a specific coach.',
           fr: 'Oui, Kinih accueille tout le monde. Nos coachs construisent des plans pour les femmes comme pour les hommes. En réservant, vous pouvez préciser le coach que vous préférez.',
           ar: 'نعم، كينيه يرحب بالجميع. مدربونا يصممون خططًا للنساء والرجال. عند الحجز يمكنك إخبارنا إن كنت تفضلين مدربًا معينًا.' },
      act: ['book'] },
    { id: 'bring', k: ['bring', 'wear', 'clothes', 'towel', 'shoes', 'what do i need', 'apporter', 'tenue', 'serviette', 'chaussure', 'أحضر', 'احضر', 'ألبس', 'البس', 'منشفة', 'حذاء', 'نجيب'],
      q: { en: 'What should I bring?', fr: 'Que dois-je apporter ?', ar: 'ماذا أحضر معي؟' },
      a: { en: 'Comfortable sports clothes, clean training shoes, a towel and a water bottle. For your assessment, just come as you are, 10 minutes early.',
           fr: 'Une tenue de sport confortable, des chaussures propres, une serviette et une bouteille d\'eau. Pour le bilan, venez simplement 10 minutes en avance.',
           ar: 'ملابس رياضية مريحة، حذاء رياضي نظيف، منشفة وقارورة ماء. للتقييم، تعال فقط قبل موعدك بـ 10 دقائق.' } },
    { id: '=age', k: ['=age', '=old', 'kid', 'child', 'teen', 'young', 'minimum', 'senior', 'enfant', 'ado', 'jeune', 'عمر', '=سن', 'أطفال', 'اطفال', 'مراهق', 'صغير'],
      q: { en: 'Is there a minimum age?', fr: 'Y a-t-il un âge minimum ?', ar: 'هل يوجد حد أدنى للعمر؟' },
      a: { en: 'Members must be <b>16 or older</b>. Under 18s need a parent or guardian to sign up with them. There is no maximum age: coaches adapt every plan to your level.',
           fr: 'Il faut avoir <b>16 ans ou plus</b>. Les moins de 18 ans s\'inscrivent avec un parent. Pas d\'âge maximum : les coachs adaptent chaque plan à votre niveau.',
           ar: 'يجب أن يكون العمر <b>16 سنة أو أكثر</b>. من هم دون 18 سنة يسجلون مع أحد الوالدين. لا يوجد حد أقصى للعمر، فالمدربون يكيفون الخطة مع مستواك.' } },
    { id: 'parking', k: ['parking', 'park', '=car', 'tram', '=bus', 'transport', 'stationnement', 'garer', 'voiture', 'موقف', 'سيارة', 'باركينغ', 'طوبيس', 'ترام'],
      q: { en: 'Is there parking nearby?', fr: 'Peut-on se garer ?', ar: 'هل يوجد موقف سيارات؟' },
      a: { en: 'Yes, there is street parking around Rue des Orangers. If you are coming for the first time, call us and we will guide you.',
           fr: 'Oui, il y a du stationnement dans les rues autour de la Rue des Orangers. Pour une première visite, appelez-nous et on vous guide.',
           ar: 'نعم، يوجد مكان لركن السيارات في الشوارع المحيطة بشارع البرتقال. في زيارتك الأولى اتصل بنا وسنرشدك.' },
      act: ['map', 'call'] },
    { id: 'results', k: ['result', 'how long', 'how fast', 'weeks', 'see change', 'progress', 'guarantee', 'resultat', 'combien de temps', 'progres', 'نتائج', 'نتيجة', 'متى أرى', 'كم من الوقت', 'تقدم'],
      q: { en: 'How fast will I see results?', fr: 'En combien de temps voit-on des résultats ?', ar: 'متى سأرى النتائج؟' },
      a: { en: 'Most members notice a difference within <b>4 to 8 weeks</b> when they follow the plan. Because everything is tracked (weight, measurements, lifts, photos), you see your progress in numbers, not guesses.',
           fr: 'La plupart des membres voient une différence en <b>4 à 8 semaines</b> en suivant le plan. Tout est mesuré (poids, mensurations, charges, photos), donc vous voyez vos progrès en chiffres.',
           ar: 'أغلب الأعضاء يلاحظون فرقًا خلال <b>4 إلى 8 أسابيع</b> عند الالتزام بالخطة. وبما أن كل شيء يقاس (الوزن، القياسات، الأوزان، الصور)، سترى تقدمك بالأرقام.' },
      act: ['results'] },
    { id: 'contact', k: ['phone', 'call', 'number', 'email', 'whatsapp', 'contact', 'human', 'someone', 'talk', 'telephone', 'appeler', 'numero', 'parler', 'هاتف', 'رقم', 'اتصال', 'اتصل', 'واتساب', 'إيميل', 'ايميل', 'نتكلم'],
      q: { en: 'How can I contact you?', fr: 'Comment vous contacter ?', ar: 'كيف أتواصل معكم؟' },
      a: { en: 'Call or WhatsApp us on <b dir="ltr">+212 6 45 67 85 94</b>, or email <b>kinih@yahoo.com</b>. The front desk answers every day from 4 AM to 10 PM.',
           fr: 'Appelez-nous ou écrivez sur WhatsApp au <b dir="ltr">+212 6 45 67 85 94</b>, ou par email à <b>kinih@yahoo.com</b>. L\'accueil répond tous les jours de 4h à 22h.',
           ar: 'اتصل بنا أو راسلنا على واتساب <b dir="ltr">+212 6 45 67 85 94</b>، أو عبر البريد <b>kinih@yahoo.com</b>. الاستقبال يرد كل يوم من 4 صباحًا إلى 10 مساءً.' },
      act: ['call', 'whatsapp'] }
  ];

  var SMALL = {
    greet: { k: ['=hi', '=hello', '=hey', 'salam', 'bonjour', '=salut', 'bonsoir', 'مرحبا', 'السلام', 'سلام', 'أهلا', 'اهلا'],
      a: { en: 'Hi! How can I help you today?', fr: 'Bonjour ! Comment puis-je vous aider ?', ar: 'أهلًا! كيف يمكنني مساعدتك؟' } },
    thanks: { k: ['thank', 'thx', '=merci', 'shukran', 'choukran', 'شكرا', 'شكرًا', 'بارك الله'],
      a: { en: 'You are welcome! Anything else you want to know?', fr: 'Avec plaisir ! Autre chose ?', ar: 'العفو! هل تريد معرفة شيء آخر؟' } }
  };

  var UI = {
    welcome: { en: 'Hi, I am the Kinih assistant. Ask me anything about prices, hours, programs, coaches or booking.',
               fr: 'Bonjour, je suis l\'assistant Kinih. Posez-moi vos questions sur les tarifs, les horaires, les programmes, les coachs ou la réservation.',
               ar: 'مرحبًا، أنا مساعد كينيه. اسألني عن الأسعار أو الساعات أو البرامج أو المدربين أو الحجز.' },
    popular: { en: 'Popular questions:', fr: 'Questions fréquentes :', ar: 'أسئلة شائعة:' },
    fallback: { en: 'I am not sure about that one. A coach can answer you directly by phone or WhatsApp. You can also try one of these questions:',
                fr: 'Je ne suis pas sûr de pouvoir répondre à cela. Un coach peut vous répondre directement par téléphone ou WhatsApp. Vous pouvez aussi essayer une de ces questions :',
                ar: 'لست متأكدًا من الإجابة. يمكن لمدرب أن يجيبك مباشرة عبر الهاتف أو واتساب. أو جرب أحد هذه الأسئلة:' }
  };
  var STARTERS = ['prices', 'hours', 'free', 'program', 'location'];

  function norm(s) {
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[ً-ْـ]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  function score(text, keys) {
    var t = ' ' + text + ' ', s = 0;
    keys.forEach(function (k) {
      var whole = k.charAt(0) === '=';
      var nk = norm(whole ? k.slice(1) : k);
      if (!nk) return;
      if (whole ? t.indexOf(' ' + nk + ' ') !== -1 : t.indexOf(nk) !== -1) s += 1 + nk.length / 6;
    });
    return s;
  }
  function findAnswer(q) {
    var t = norm(q), best = null, bestS = 0;
    KB.forEach(function (item) { var s = score(t, item.k); if (s > bestS) { bestS = s; best = item; } });
    if (best && bestS >= 1.5) return best;
    if (score(t, SMALL.thanks.k) > 0) return { small: 'thanks' };
    if (score(t, SMALL.greet.k) > 0) return { small: 'greet' };
    return null;
  }

  // ----- UI -----
  var wrap = document.createElement('div');
  wrap.innerHTML =
    '<div class="chat-hint" id="chatHint"></div>' +
    '<button class="chat-launch" id="chatLaunch" aria-label="Chat"><i class="fa-solid fa-comments"></i><span class="ping"></span></button>' +
    '<div class="chat-panel" id="chatPanel" role="dialog" aria-label="Kinih assistant">' +
      '<div class="chat-head"><div class="chat-avatar">K</div><div><strong id="chatName"></strong><small id="chatStatus"></small></div>' +
        '<button class="chat-close" id="chatClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="chat-body" id="chatBody" data-lenis-prevent></div>' +
      '<div class="chips" id="chatChips"></div>' +
      '<form class="chat-form" id="chatForm"><input id="chatInput" autocomplete="off"><button type="submit" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button></form>' +
      '<div class="chat-foot" id="chatFoot"></div>' +
    '</div>';
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

  var panel = document.getElementById('chatPanel'), body = document.getElementById('chatBody'),
      chips = document.getElementById('chatChips'), input = document.getElementById('chatInput'),
      launch = document.getElementById('chatLaunch'), hint = document.getElementById('chatHint');
  var asked = {}, started = false;

  function tr(key) { return (T[L()] || T.en)[key] || ''; }
  function applyTexts() {
    document.getElementById('chatName').textContent = tr('chat.name');
    document.getElementById('chatStatus').textContent = tr('chat.status');
    document.getElementById('chatFoot').innerHTML = tr('chat.foot');
    input.placeholder = tr('chat.ph');
    hint.textContent = tr('chat.hint');
  }
  function scrollDown() { body.scrollTop = body.scrollHeight; }
  function addMsg(html, who, actions) {
    var m = document.createElement('div');
    m.className = 'msg ' + who;
    if (who === 'user') m.textContent = html; else m.innerHTML = html;
    if (actions && actions.length) {
      var row = document.createElement('div'); row.className = 'msg-actions';
      actions.forEach(function (id) {
        var a = ACTIONS[id]; if (!a) return;
        var el = document.createElement('a');
        el.href = a.href;
        if (/^https?:/.test(a.href)) { el.target = '_blank'; el.rel = 'noopener'; }
        el.innerHTML = '<i class="' + (a.brand ? 'fa-brands ' : 'fa-solid ') + a.icon + '"></i>' + a[L()];
        row.appendChild(el);
      });
      m.appendChild(row);
    }
    body.appendChild(m); scrollDown();
  }
  function renderChips(ids) {
    chips.innerHTML = '';
    ids.forEach(function (id) {
      var item = KB.filter(function (x) { return x.id === id; })[0]; if (!item) return;
      var b = document.createElement('button'); b.type = 'button';
      b.textContent = item.q[L()];
      b.addEventListener('click', function () { ask(item.q[L()]); });
      chips.appendChild(b);
    });
  }
  function nextChips(exclude) {
    var pool = STARTERS.concat(KB.map(function (x) { return x.id; }));
    var out = [];
    pool.forEach(function (id) { if (out.length < 3 && id !== exclude && !asked[id] && out.indexOf(id) === -1) out.push(id); });
    return out;
  }
  function reply(q) {
    var typing = document.createElement('div');
    typing.className = 'msg bot typing'; typing.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(typing); scrollDown();
    setTimeout(function () {
      typing.remove();
      var hit = findAnswer(q), lang = L();
      if (hit && hit.small) { addMsg(SMALL[hit.small].a[lang], 'bot'); renderChips(nextChips()); return; }
      if (hit) { asked[hit.id] = true; addMsg(hit.a[lang], 'bot', hit.act); renderChips(nextChips(hit.id)); return; }
      addMsg(UI.fallback[lang], 'bot', ['call', 'whatsapp']);
      renderChips(nextChips());
    }, 550 + Math.random() * 450);
  }
  function ask(q) {
    q = (q || '').trim(); if (!q) return;
    addMsg(q, 'user'); input.value = ''; chips.innerHTML = '';
    reply(q);
  }
  function start() {
    body.innerHTML = ''; asked = {};
    addMsg(UI.welcome[L()], 'bot');
    addMsg(UI.popular[L()], 'bot');
    renderChips(STARTERS);
    started = true;
  }
  function openChat() {
    panel.classList.add('open'); hint.classList.remove('show');
    launch.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    if (!started) start();
    try { sessionStorage.setItem('kinih_chat_seen', '1'); } catch (e) {}
    setTimeout(function () { input.focus(); }, 300);
  }
  function closeChat() {
    panel.classList.remove('open');
    launch.innerHTML = '<i class="fa-solid fa-comments"></i>';
  }
  launch.addEventListener('click', function () { panel.classList.contains('open') ? closeChat() : openChat(); });
  hint.addEventListener('click', openChat);
  document.getElementById('chatClose').addEventListener('click', closeChat);
  document.getElementById('chatForm').addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeChat(); });
  document.addEventListener('kinih:lang', function () { applyTexts(); if (started) start(); });

  applyTexts();
  var seen = false;
  try { seen = !!sessionStorage.getItem('kinih_chat_seen'); } catch (e) {}
  if (!seen) setTimeout(function () { if (!panel.classList.contains('open')) hint.classList.add('show'); }, 4000);
})();
