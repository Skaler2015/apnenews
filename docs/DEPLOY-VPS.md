# ApneNews — Hostinger VPS पर Deploy + Auto-Deploy (हिंदी गाइड)

यह गाइड ApneNews (Next.js app) को **Hostinger VPS** पर चलाने और **हर git push पर
अपने-आप update** करने का पूरा तरीका है।

> **ज़रूरी:** यह shared hosting के `public_html` / GIT पैनल पर नहीं चलेगा। इसके लिए
> **Hostinger VPS (KVM प्लान, Ubuntu 22/24)** चाहिए — hPanel sidebar में **VPS**
> सेक्शन से लें।

नतीजा: `https://apnenews.in` पर लाइव साइट + admin पैनल, और आप जब भी कोड push करेंगे,
GitHub Actions खुद VPS पर build करके deploy कर देगा।

---

## पूरा फ़्लो एक नज़र में

```
आप कोड push करते हैं (GitHub)
        ↓
GitHub Actions (deploy.yml) VPS में SSH करता है
        ↓
scripts/deploy.sh चलता है: git pull → npm ci → prisma → build → pm2 reload
        ↓
PM2 Next.js सर्वर को port 3000 पर रीस्टार्ट करता है
        ↓
Nginx (port 80/443) → 3000 पर proxy → apnenews.in लाइव
```

---

## Step 0 — ज़रूरी चीज़ें

- Hostinger **VPS** (Ubuntu 22.04/24.04), उसका **IP address** और **root SSH पासवर्ड**
  (hPanel → VPS → आपका सर्वर → SSH details)।
- GitHub रेपो: `Skaler2015/apnenews` (private) — आपका।
- डोमेन: `apnenews.in` (Hostinger में ही)।

पूरे डॉक में **branch = `main`** माना गया है (production branch)। नीचे "Step 9" में
बताया है कि मौजूदा काम को `main` पर कैसे लाएँ।

---

## Step 1 — VPS से जुड़ें (SSH)

अपने कंप्यूटर के टर्मिनल (या Hostinger Browser terminal) में:

```bash
ssh root@YOUR_VPS_IP
```

`YOUR_VPS_IP` की जगह अपना VPS IP डालें। पहली बार `yes` लिखें, फिर पासवर्ड।

---

## Step 2 — सर्वर तैयार करें (Node, PM2, Nginx, Git)

VPS पर ये कमांड एक-एक करके चलाएँ:

```bash
# सिस्टम अपडेट
apt update && apt -y upgrade

# Node.js 20 (LTS) इंस्टॉल
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx

# PM2 (process manager) ग्लोबली
npm install -g pm2

# चेक
node -v && npm -v && pm2 -v
```

---

## Step 3 — रेपो के लिए Deploy Key (private repo access)

VPS को private रेपो पढ़ने की अनुमति चाहिए। एक SSH deploy key बनाएँ:

```bash
ssh-keygen -t ed25519 -C "apnenews-vps" -f ~/.ssh/apnenews_deploy -N ""
cat ~/.ssh/apnenews_deploy.pub
```

ऊपर जो public key दिखे उसे **कॉपी** करें, फिर:

1. GitHub → रेपो `Skaler2015/apnenews` → **Settings → Deploy keys → Add deploy key**
2. Title: `hostinger-vps`, key paste करें, **Allow write access** ज़रूरी नहीं — रहने दें।
3. Add.

अब VPS को बताएँ कि GitHub से बात करते समय यही key इस्तेमाल करे:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/apnenews_deploy
  IdentitiesOnly yes
EOF
```

---

## Step 4 — ऐप क्लोन करें

```bash
mkdir -p /var/www
cd /var/www
git clone git@github.com:Skaler2015/apnenews.git apnenews
cd /var/www/apnenews
git checkout main    # production branch
```

> अगर अभी आपका कोड सिर्फ़ `claude/hindi-news-platform-gx0zrz` branch पर है और `main`
> खाली/नहीं है, तो पहले **Step 9** करके कोड `main` पर ले आएँ, फिर ऊपर का
> `git checkout main` चलेगा।

---

## Step 5 — `.env` बनाएँ (सीक्रेट्स)

```bash
cd /var/www/apnenews
cp .env.example .env
# मज़बूत सीक्रेट्स जनरेट करें:
echo "AUTH_SECRET=$(openssl rand -hex 32)"
echo "CRON_SECRET=$(openssl rand -hex 32)"
nano .env
```

`.env` में कम से कम ये सेट करें:

```dotenv
APP_URL="https://apnenews.in"
NODE_ENV="production"

# सबसे आसान: SQLite (VPS की डिस्क पर फ़ाइल — बढ़िया चलती है)
DATABASE_URL="file:/var/www/apnenews/prod.db"

AUTH_SECRET="<ऊपर जनरेट की हुई>"
CRON_SECRET="<ऊपर जनरेट की हुई>"

# पहला एडमिन (seed के लिए) — बाद में पासवर्ड बदल लें
ADMIN_EMAIL="admin@apnenews.in"
ADMIN_PASSWORD="<कोई मज़बूत पासवर्ड>"

# बिना API key के भी सब चलेगा; असली AI के लिए बाद में भरें
AI_PROVIDER="mock"
```

`nano` में सेव: `Ctrl+O`, `Enter`, फिर `Ctrl+X`।

> **Postgres चाहिए?** VPS पर `apt install -y postgresql` करके DB बनाएँ, फिर
> `prisma/schema.prisma` में `provider = "postgresql"` कर दें और `DATABASE_URL`
> को postgres URL पर सेट करें। शुरुआत के लिए SQLite ही सुझाव है।

---

## Step 6 — पहला Build + चालू करें

```bash
cd /var/www/apnenews
npm ci
npx prisma generate
npx prisma db push
npm run db:seed        # डेमो डेटा + पहला एडमिन (चाहें तो छोड़ सकते हैं)
npm run build

# PM2 से स्टार्ट
pm2 start ecosystem.config.js
pm2 save
pm2 startup            # जो कमांड दिखे उसे कॉपी करके चलाएँ (रीबूट पर auto-start)
```

चेक करें कि लोकल पोर्ट पर चल रहा है:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000   # 200 आना चाहिए
pm2 status
```

---

## Step 7 — Nginx + HTTPS (SSL)

```bash
# हमारी दी हुई Nginx कॉन्फ़िग लगाएँ
cp /var/www/apnenews/deploy/nginx.conf.example /etc/nginx/sites-available/apnenews
ln -sf /etc/nginx/sites-available/apnenews /etc/nginx/sites-enabled/apnenews
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

अब **Step 8 (DNS)** पूरा होने के बाद, फ्री HTTPS:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d apnenews.in -d www.apnenews.in
```

Certbot अपने-आप SSL लगा देगा और http→https redirect कर देगा।

---

## Step 8 — DNS: apnenews.in को VPS पर पॉइंट करें

Hostinger hPanel में:

1. **Domains → apnenews.in → DNS / Nameservers → DNS Zone Editor**
2. ये records बनाएँ/बदलें (VPS का IP डालें):

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `YOUR_VPS_IP` | 3600 |
| A | `www` | `YOUR_VPS_IP` | 3600 |

पुराने conflicting A/CNAME records हटा दें। DNS फैलने में 5–30 मिनट लग सकते हैं।
फिर Step 7 का `certbot` चलाएँ।

---

## Step 9 — कोड को `main` branch पर लाएँ (एक बार)

अभी सारा काम `claude/hindi-news-platform-gx0zrz` branch पर है। Auto-deploy `main`
पर चलता है। GitHub पर merge करें:

- **आसान तरीका (GitHub वेबसाइट):** रेपो खोलें → "Compare & pull request" →
  base `main`, compare `claude/hindi-news-platform-gx0zrz` → **Create PR → Merge**।
- अगर `main` branch मौजूद ही नहीं है, तो GitHub पूछेगा — या मुझे बोलें, मैं PR बना
  दूँगा।

> नहीं चाहते `main` इस्तेमाल करना? तो `.github/workflows/deploy.yml` और Step 4 के
> `git checkout` में `main` की जगह अपनी branch का नाम डाल दें।

---

## Step 10 — Auto-Deploy चालू करें (GitHub Actions Secrets)

GitHub → रेपो → **Settings → Secrets and variables → Actions → New repository secret**।
ये 4 secrets जोड़ें:

| Secret नाम | Value |
|---|---|
| `VPS_HOST` | आपका VPS IP |
| `VPS_USER` | `root` (या आपका SSH user) |
| `VPS_PORT` | `22` (डिफ़ॉल्ट; अलग हो तो वही) |
| `VPS_SSH_KEY` | नीचे देखें ↓ |

**`VPS_SSH_KEY`** = एक SSH private key जिससे GitHub Actions आपके VPS में लॉगिन कर सके।
VPS पर बनाएँ और authorize करें:

```bash
ssh-keygen -t ed25519 -C "gh-actions" -f ~/.ssh/gh_actions -N ""
cat ~/.ssh/gh_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/gh_actions          # यह PRIVATE key — पूरा कॉपी करें
```

आख़िरी कमांड का पूरा आउटपुट (`-----BEGIN ... END-----` समेत) `VPS_SSH_KEY` secret में
paste करें।

**बस!** अब जब भी `main` पर push होगा, Actions खुद VPS पर deploy कर देगा।
(GitHub → रेपो → **Actions** टैब में लाइव प्रोग्रेस दिखेगा।)

पहली बार खुद ट्रिगर करने के लिए: Actions टैब → "Deploy to Hostinger VPS" →
**Run workflow**।

---

## Step 11 — Automation Cron (खबरें अपने-आप आती/छपती रहें)

VPS पर `crontab -e` खोलें और ये लाइनें डालें (`SECRET` = आपका `CRON_SECRET`):

```cron
*/15 * * * *  curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://apnenews.in/api/cron/fetch-news    >/dev/null
*/5  * * * *  curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://apnenews.in/api/cron/process-news  >/dev/null
*/10 * * * *  curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://apnenews.in/api/cron/publish-queue >/dev/null
0    * * * *  curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://apnenews.in/api/cron/update-trending>/dev/null
0    3 * * *  curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://apnenews.in/api/cron/cleanup-old-data>/dev/null
```

(पूरी लिस्ट `crontab.example` में है।)

---

## ✅ वेरिफ़ाई करें

- `https://apnenews.in` — होमपेज खुलना चाहिए।
- `https://apnenews.in/admin` — एडमिन लॉगिन (आपका `ADMIN_EMAIL`/पासवर्ड)।
- **पासवर्ड तुरंत बदलें** production में।
- टेस्ट auto-deploy: कोई छोटा बदलाव करके `main` पर push करें → Actions टैब देखें →
  कुछ मिनट में साइट अपडेट।

---

## 🔧 आम दिक्कतें

| समस्या | हल |
|---|---|
| `curl 127.0.0.1:3000` काम नहीं करता | `pm2 logs apnenews` देखें; `.env` सही है? `npm run build` दोबारा |
| साइट 502 (Bad Gateway) | Next चालू नहीं — `pm2 restart apnenews`; Nginx `nginx -t` |
| Actions deploy फ़ेल | `VPS_SSH_KEY`/host/user secrets चेक करें; VPS पर key authorized है? |
| `npm ci` एरर | lockfile मौजूद है (committed); Node 20 है? `node -v` |
| DB एरर | `npx prisma db push` फिर से; `.env` का `DATABASE_URL` सही path |
| डोमेन नहीं खुलता | DNS A records + propagation; `certbot` SSL |
| मेमोरी कम (build टूटता) | छोटे VPS पर swap जोड़ें, या Actions में build करके सिर्फ़ artifact भेजें |

---

## रोज़मर्रा के कमांड

```bash
pm2 status                 # ऐप की स्थिति
pm2 logs apnenews          # लाइव लॉग
pm2 restart apnenews       # रीस्टार्ट
bash scripts/deploy.sh     # मैन्युअल deploy (VPS पर)
```

किसी भी step पर अटकें तो एरर का स्क्रीनशॉट/टेक्स्ट भेजें — मैं ठीक करा दूँगा।
