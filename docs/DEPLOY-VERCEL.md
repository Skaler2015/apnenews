# ApneNews — Vercel पर Deploy (मुफ़्त, हर git push पर auto-update) — हिंदी गाइड

यह सबसे आसान तरीका है। ~15 मिनट में `apnenews.in` लाइव हो जाएगा, और आप जब भी कोड
बदलेंगे, वेबसाइट अपने-आप update हो जाएगी।

**3 चीज़ें इस्तेमाल होंगी (तीनों मुफ़्त):**
1. **Neon** — मुफ़्त PostgreSQL डेटाबेस
2. **Vercel** — app होस्ट करेगा + GitHub से auto-deploy
3. **Hostinger** — सिर्फ़ डोमेन `apnenews.in` के लिए (DNS point करेंगे; ईमेल पर कोई असर नहीं)

---

## Step 1 — मुफ़्त डेटाबेस बनाएँ (Neon)

1. [https://neon.tech](https://neon.tech) खोलें → **Sign up** (GitHub से लॉगिन आसान)।
2. **Create project** → नाम `apnenews`, region कोई पास वाला (जैसे Singapore/Frankfurt)।
3. बनने के बाद **Connection string** दिखेगी। आपको **दो** चाहिए — ऊपर एक टॉगल/ड्रॉपडाउन होता है:
   - **Pooled connection** (host में `-pooler` होता है) → यह **`DATABASE_URL`** है।
   - **Direct connection** (बिना `-pooler`) → यह **`DIRECT_URL`** है।
   - अगर "Connection pooling" का चेकबॉक्स दिखे: एक बार ON करके URL कॉपी करें (= DATABASE_URL),
     एक बार OFF करके कॉपी करें (= DIRECT_URL)।

दोनों strings कहीं नोट कर लें (जैसे `postgresql://user:pass@ep-xxx-pooler.../apnenews?sslmode=require`)।

> टेबल्स अपने-आप बन जाएँगी — deploy के समय build उन्हें बना देता है। आपको कुछ मैन्युअल नहीं करना।

---

## Step 2 — Vercel पर app import करें

1. [https://vercel.com](https://vercel.com) → **Sign up / Log in with GitHub**।
2. **Add New… → Project** → GitHub से `Skaler2015/apnenews` चुनें → **Import**।
3. Framework अपने-आप **Next.js** पहचान लेगा — कुछ बदलने की ज़रूरत नहीं।
4. **Environment Variables** सेक्शन खोलें और ये सब जोड़ें (Name = Value):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon की **pooled** string |
| `DIRECT_URL` | Neon की **direct** string |
| `AUTH_SECRET` | कोई लंबा random text (नीचे टिप) |
| `CRON_SECRET` | कोई लंबा random text (अलग वाला) |
| `ADMIN_EMAIL` | `admin@apnenews.in` |
| `ADMIN_PASSWORD` | कोई मज़बूत पासवर्ड (याद रखें) |
| `APP_URL` | `https://apnenews.in` |
| `AI_PROVIDER` | `mock` |

> **random text कैसे बनाएँ:** [https://www.random.org/strings](https://www.random.org/strings) या
> बस लंबा उलझा हुआ text टाइप कर दें। `AUTH_SECRET` और `CRON_SECRET` अलग-अलग रखें।

5. **Deploy** दबाएँ → 2–4 मिनट में build पूरा।

### ⚠️ Branch की बात (ज़रूरी)
अभी आपका कोड `claude/hindi-news-platform-gx0zrz` branch पर है। Vercel डिफ़ॉल्ट रूप से
`main` branch deploy करता है। दो में से एक करें:
- **आसान:** Vercel → आपका Project → **Settings → Git → Production Branch** → वहाँ
  `claude/hindi-news-platform-gx0zrz` सेट करके **Save**, फिर **Deployments → Redeploy**। या
- कोड को GitHub पर `main` में merge कर दें (मैं PR बना सकता हूँ — बस बोलें)।

---

## Step 3 — एक बार Setup चलाएँ (admin + शुरुआती खबरें)

Deploy होने के बाद Vercel एक URL देगा (जैसे `https://apnenews-xxxx.vercel.app`)।
ब्राउज़र में यह खोलें (अपना `CRON_SECRET` डालकर):

```
https://apnenews-xxxx.vercel.app/api/setup?secret=YOUR_CRON_SECRET
```

यह एक बार में बना देगा: admin अकाउंट, 25 श्रेणियाँ, स्रोत, और ~20 शुरुआती डेमो लेख।
सफल होने पर JSON में `"ok":true` दिखेगा।

> ज़्यादा डेमो कंटेंट चाहिए तो `&rounds=3&publish=40` जोड़ दें।

अब admin खोलें: `https://apnenews-xxxx.vercel.app/admin` →
`ADMIN_EMAIL` / `ADMIN_PASSWORD` से लॉगिन → **पासवर्ड तुरंत बदलें/सुरक्षित रखें**।

---

## Step 4 — अपना डोमेन apnenews.in जोड़ें

1. Vercel → Project → **Settings → Domains** → `apnenews.in` टाइप करके **Add** →
   फिर `www.apnenews.in` भी Add करें।
2. Vercel आपको **DNS records दिखाएगा** (आम तौर पर):
   - `apnenews.in` (apex) → **A record** → `76.76.21.21`
   - `www` → **CNAME** → `cname.vercel-dns.com`
   > जो Vercel दिखाए, **वही** मानें (कभी-कभी अलग हो सकता है)।
3. Hostinger hPanel → **Domains → apnenews.in → DNS Zone Editor** → ऊपर वाले records
   जोड़ें/बदलें। पुराने conflicting A/CNAME (जो Hostinger hosting की तरफ़ थे) हटा दें।
   **MX records (ईमेल) मत छेड़ें।**
4. 5–30 मिनट में Vercel पर domain "Valid" हो जाएगा और HTTPS (SSL) अपने-आप लग जाएगा।

अब `https://apnenews.in` पर आपकी साइट लाइव! 🎉

---

## Step 5 — खबरें अपने-आप आती-छपती रहें (मुफ़्त automation)

Vercel के फ्री प्लान का अपना cron दिन में एक बार ही चलता है — इसलिए हम **GitHub Actions**
से हर 15 मिनट पर pipeline चला देंगे (बिल्कुल मुफ़्त; फाइल `.github/workflows/cron.yml`
पहले से रेपो में है)।

GitHub → रेपो `Skaler2015/apnenews` → **Settings → Secrets and variables → Actions →
New repository secret** → ये 2 जोड़ें:

| Secret | Value |
|---|---|
| `SITE_URL` | `https://apnenews.in` |
| `CRON_SECRET` | वही जो Vercel में डाला था |

बस! अब हर ~15 मिनट में खुद खबरें process/publish होती रहेंगी।
(चेक करने के लिए: GitHub → **Actions** टैब।)

> विकल्प: चाहें तो [cron-job.org](https://cron-job.org) (मुफ़्त) पर जाकर हर 15 मिनट पर
> `https://apnenews.in/api/cron/pipeline` को POST करने का job भी बना सकते हैं
> (Header: `Authorization: Bearer YOUR_CRON_SECRET`)।

---

## Step 6 — अब से क्या होगा (auto-deploy)

आप कोड में जो भी बदलाव करके GitHub पर push करेंगे (उसी branch पर जो Production है),
**Vercel अपने-आप build करके साइट update कर देगा** — कुछ और करने की ज़रूरत नहीं।
Vercel → Deployments टैब में हर deploy दिखता है।

---

## ✅ आख़िरी चेकलिस्ट

- [ ] Neon DB बनी, दोनों URLs कॉपी हुए
- [ ] Vercel में सारे env vars डाले, Deploy सफल
- [ ] Production Branch सही सेट (या main पर merge)
- [ ] `/api/setup?secret=…` एक बार चलाया → admin + खबरें बनीं
- [ ] `/admin` लॉगिन हुआ, पासवर्ड सुरक्षित
- [ ] apnenews.in domain जोड़ा + Hostinger DNS अपडेट किया
- [ ] GitHub Secrets (SITE_URL, CRON_SECRET) → automation चालू

---

## 🔧 आम दिक्कतें

| समस्या | हल |
|---|---|
| Build फ़ेल: database connection | `DATABASE_URL`/`DIRECT_URL` सही Neon strings हैं? दोनों डाले? |
| साइट खुलती है पर खबरें नहीं | `/api/setup?secret=…` चलाया? या admin में "पूरी पाइपलाइन चलाएँ" दबाएँ |
| `/api/setup` पर 401 | URL में `?secret=` = आपका `CRON_SECRET` होना चाहिए |
| domain "Invalid Configuration" | Hostinger DNS में Vercel वाले A/CNAME records; 30 मिनट रुकें |
| Vercel पुराना branch deploy कर रहा | Settings → Git → Production Branch ठीक करें |
| automation नहीं चल रहा | GitHub → Actions टैब; SITE_URL + CRON_SECRET secrets डले हैं? |

किसी भी step पर अटकें — स्क्रीनशॉट/एरर यहाँ भेज दें, मैं ठीक करा दूँगा। 🙂
