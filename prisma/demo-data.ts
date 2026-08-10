// Realistic (clearly-marked) demo content for seeding. All items are fictional
// samples for demonstration only — never presented as real news (spec §84).

export const DEMO_SOURCES = [
  { name: 'डेमो भारत समाचार', slug: 'demo-bharat', type: 'RSS', category: 'india', trust: 82, priority: 88, official: false },
  { name: 'डेमो राजस्थान पत्रिका', slug: 'demo-raj', type: 'RSS', category: 'rajasthan', trust: 80, priority: 85, official: false },
  { name: 'डेमो सरकारी सूचना (PIB शैली)', slug: 'demo-gov', type: 'GOV', category: 'government-schemes', trust: 95, priority: 95, official: true },
  { name: 'डेमो बिज़नेस लाइन', slug: 'demo-biz', type: 'RSS', category: 'business', trust: 78, priority: 80, official: false },
  { name: 'डेमो टेक डेली', slug: 'demo-tech', type: 'API', category: 'technology', trust: 76, priority: 78, official: false },
  { name: 'डेमो स्पोर्ट्स नाउ', slug: 'demo-sports', type: 'RSS', category: 'sports', trust: 75, priority: 76, official: false },
  { name: 'डेमो वर्ल्ड वायर', slug: 'demo-world', type: 'RSS', category: 'world', trust: 79, priority: 77, official: false },
  { name: 'डेमो एजुकेशन बोर्ड फीड', slug: 'demo-edu', type: 'GOV', category: 'education', trust: 90, priority: 82, official: true },
  { name: 'डेमो मौसम विभाग', slug: 'demo-weather', type: 'GOV', category: 'weather', trust: 92, priority: 84, official: true },
  { name: 'डेमो एंटरटेनमेंट बज़', slug: 'demo-ent', type: 'RSS', category: 'entertainment', trust: 70, priority: 66, official: false },
  { name: 'डेमो हेल्थ रिपोर्ट', slug: 'demo-health', type: 'RSS', category: 'health', trust: 81, priority: 78, official: false },
  { name: 'डेमो कृषि जगत', slug: 'demo-agri', type: 'RSS', category: 'agriculture', trust: 77, priority: 74, official: false },
];

export const DEMO_AUTHORS = [
  { name: 'ApneNews संपादकीय डेस्क', slug: 'editorial-desk', bio: 'AI-सहायता प्राप्त संपादकीय टीम जो स्रोत तथ्यों के आधार पर मौलिक रिपोर्ट तैयार करती है।', aiAssisted: true },
  { name: 'राजस्थान डेस्क', slug: 'rajasthan-desk', bio: 'राजस्थान की स्थानीय खबरों पर केंद्रित संपादकीय डेस्क।', aiAssisted: true },
  { name: 'बिज़नेस डेस्क', slug: 'business-desk', bio: 'अर्थव्यवस्था, बाज़ार और कारोबार की कवरेज।', aiAssisted: true },
  { name: 'स्पोर्ट्स डेस्क', slug: 'sports-desk', bio: 'खेल जगत की ताज़ा अपडेट।', aiAssisted: true },
];

type Template = { category: string; source: string; breaking?: boolean; titles: string[]; excerpt: string };

// Each template yields several realistic sample headlines with a factual-style
// excerpt the mock AI can rephrase (with numbers/dates/entities to extract).
export const DEMO_TEMPLATES: Template[] = [
  {
    category: 'government-schemes',
    source: 'demo-gov',
    titles: [
      'राज्य सरकार ने नई ग्रामीण आवास योजना की घोषणा की',
      'सरकार ने किसानों के लिए ब्याज मुक्त ऋण सीमा बढ़ाई',
      'नई छात्रवृत्ति योजना के तहत 2 लाख विद्यार्थियों को लाभ',
    ],
    excerpt:
      'सरकार ने 15 अगस्त 2026 को एक नई योजना की घोषणा की जिसके तहत लगभग 2 लाख लाभार्थियों को सहायता दी जाएगी। योजना पर कुल 1200 करोड़ रुपये खर्च होंगे और यह अगले वित्त वर्ष से लागू होगी। संबंधित विभाग ने कहा कि पात्रता मानदंड जल्द जारी किए जाएंगे।',
  },
  {
    category: 'rajasthan',
    source: 'demo-raj',
    titles: [
      'जयपुर में मेट्रो विस्तार परियोजना को मंज़ूरी',
      'सीकर में नए मेडिकल कॉलेज का शिलान्यास',
      'राजस्थान में इस सप्ताह बदलेगा मौसम, कई जिलों में बारिश',
    ],
    excerpt:
      'राजस्थान के जयपुर में एक बड़ी बुनियादी ढांचा परियोजना को मंज़ूरी मिली है जिस पर करीब 850 करोड़ रुपये की लागत आएगी। परियोजना 2028 तक पूरी होने का लक्ष्य है और इससे रोज़ाना लाखों यात्रियों को लाभ मिलेगा।',
  },
  {
    category: 'india',
    source: 'demo-bharat',
    breaking: true,
    titles: [
      'बड़ी खबर: संसद के मॉनसून सत्र में अहम विधेयक पेश',
      'देशभर में नई शिक्षा नीति के अगले चरण की शुरुआत',
      'राष्ट्रीय राजमार्ग परियोजना के तहत 500 किमी सड़कें तैयार',
    ],
    excerpt:
      'नई दिल्ली में आज एक महत्वपूर्ण घोषणा हुई। सरकार ने बताया कि परियोजना के पहले चरण में 500 किलोमीटर सड़कें बनकर तैयार हो गई हैं और इस पर 12000 करोड़ रुपये खर्च हुए हैं। दूसरा चरण 2027 में शुरू होगा।',
  },
  {
    category: 'business',
    source: 'demo-biz',
    titles: [
      'सेंसेक्स में तेज़ी, निवेशकों की संपत्ति बढ़ी',
      'नई मैन्युफैक्चरिंग नीति से रोज़गार के अवसर',
      'स्टार्टअप्स के लिए नया फंडिंग कार्यक्रम शुरू',
    ],
    excerpt:
      'शेयर बाज़ार में आज कारोबार के दौरान प्रमुख सूचकांक में करीब 1.8 प्रतिशत की बढ़त दर्ज की गई। विश्लेषकों के अनुसार यह तेज़ी मज़बूत तिमाही नतीजों और वैश्विक संकेतों के कारण रही। बैंकिंग और आईटी शेयरों में सबसे अधिक खरीदारी देखी गई।',
  },
  {
    category: 'technology',
    source: 'demo-tech',
    titles: [
      'नए स्मार्टफोन में मिलेंगे बेहतर AI फीचर्स',
      'भारत में 5G नेटवर्क का तेज़ी से विस्तार',
      'डिजिटल भुगतान में रिकॉर्ड बढ़ोतरी',
    ],
    excerpt:
      'तकनीक क्षेत्र में एक नई पेशकश सामने आई है जिसमें उपयोगकर्ताओं को बेहतर प्रदर्शन और सुरक्षा मिलने का दावा किया गया है। कंपनी के अनुसार यह उत्पाद अगले महीने बाज़ार में उपलब्ध होगा और इसकी शुरुआती कीमत प्रतिस्पर्धी रखी गई है।',
  },
  {
    category: 'sports',
    source: 'demo-sports',
    titles: [
      'भारतीय टीम ने रोमांचक मुक़ाबले में दर्ज की जीत',
      'युवा खिलाड़ी ने बनाया नया राष्ट्रीय रिकॉर्ड',
      'आगामी सीरीज़ के लिए टीम की घोषणा',
    ],
    excerpt:
      'खेल के मैदान पर आज एक रोमांचक मुक़ाबला देखने को मिला जहाँ टीम ने आख़िरी क्षणों में जीत हासिल की। खिलाड़ी के शानदार प्रदर्शन की सराहना की जा रही है। अगला मुक़ाबला इसी सप्ताह खेला जाएगा।',
  },
  {
    category: 'education',
    source: 'demo-edu',
    titles: [
      'बोर्ड परीक्षा की तारीख़ें घोषित, तैयारी शुरू',
      'विश्वविद्यालय में नए पाठ्यक्रमों में दाख़िला शुरू',
      'छात्रों के लिए नई डिजिटल लर्निंग पहल',
    ],
    excerpt:
      'शिक्षा बोर्ड ने आगामी परीक्षाओं का कार्यक्रम जारी कर दिया है। परीक्षाएँ अगले वर्ष फरवरी में शुरू होंगी और परिणाम मई तक घोषित किए जाएंगे। बोर्ड ने विद्यार्थियों को समय पर तैयारी करने की सलाह दी है।',
  },
  {
    category: 'jobs',
    source: 'demo-gov',
    titles: [
      'सरकारी विभाग में 5000 पदों पर भर्ती की घोषणा',
      'रेलवे में नई भर्ती प्रक्रिया शुरू',
      'बैंकिंग क्षेत्र में क्लर्क पदों के लिए आवेदन',
    ],
    excerpt:
      'एक सरकारी विभाग ने कुल 5000 रिक्त पदों पर भर्ती की घोषणा की है। आवेदन प्रक्रिया अगले सप्ताह से शुरू होगी और पात्र उम्मीदवार आधिकारिक पोर्टल के माध्यम से आवेदन कर सकेंगे। चयन लिखित परीक्षा के आधार पर होगा।',
  },
  {
    category: 'weather',
    source: 'demo-weather',
    titles: [
      'अगले 48 घंटों में कई जिलों में भारी बारिश का अनुमान',
      'तापमान में गिरावट, ठंड बढ़ने के आसार',
    ],
    excerpt:
      'मौसम विभाग ने अगले 48 घंटों के लिए कई ज़िलों में बारिश का पूर्वानुमान जारी किया है। विभाग ने नागरिकों से सतर्क रहने और आवश्यक सावधानी बरतने की अपील की है।',
  },
  {
    category: 'health',
    source: 'demo-health',
    titles: [
      'मौसमी बीमारियों से बचाव के लिए स्वास्थ्य विभाग की सलाह',
      'नए स्वास्थ्य केंद्रों से ग्रामीण क्षेत्रों को लाभ',
    ],
    excerpt:
      'स्वास्थ्य विशेषज्ञों ने मौसम बदलने के साथ सावधानी बरतने की सलाह दी है। उन्होंने संतुलित आहार, पर्याप्त पानी और साफ़-सफ़ाई पर ज़ोर दिया। किसी भी लक्षण पर चिकित्सक से सलाह लेने की सिफ़ारिश की गई है।',
  },
  {
    category: 'entertainment',
    source: 'demo-ent',
    titles: [
      'आगामी फिल्म का ट्रेलर रिलीज़, दर्शकों में उत्साह',
      'संगीत समारोह में जुटे कलाकार',
    ],
    excerpt:
      'मनोरंजन जगत से एक नई पेशकश सामने आई है जिसे दर्शकों की अच्छी प्रतिक्रिया मिल रही है। निर्माताओं ने बताया कि यह अगले महीने रिलीज़ होगी।',
  },
  {
    category: 'agriculture',
    source: 'demo-agri',
    titles: [
      'रबी फसल के लिए किसानों को बीज पर सब्सिडी',
      'कृषि मंडियों में नई सुविधाओं की शुरुआत',
    ],
    excerpt:
      'कृषि विभाग ने किसानों के लिए बीज और उर्वरक पर सब्सिडी की घोषणा की है। इससे लगभग 3 लाख किसानों को लाभ मिलने का अनुमान है। योजना इसी सीज़न से लागू होगी।',
  },
  {
    category: 'world',
    source: 'demo-world',
    titles: [
      'वैश्विक जलवायु सम्मेलन में अहम प्रस्ताव पारित',
      'अंतरराष्ट्रीय व्यापार समझौते पर बनी सहमति',
    ],
    excerpt:
      'एक अंतरराष्ट्रीय सम्मेलन में कई देशों के प्रतिनिधियों ने हिस्सा लिया और महत्वपूर्ण मुद्दों पर सहमति बनी। प्रस्ताव के तहत आने वाले वर्षों में ठोस कदम उठाने की बात कही गई।',
  },
];
