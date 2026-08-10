import { getSettings } from '@/lib/settings';
import { saveAutomationSettings } from '../actions';

export const dynamic = 'force-dynamic';

function Toggle({ name, label, checked, hint }: { name: string; label: string; checked: boolean; hint?: string }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-[var(--border)] px-3 py-2.5">
      <span>
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-[var(--text-soft)]">{hint}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={checked} className="h-5 w-5 accent-[var(--brand)]" />
    </label>
  );
}

export default async function AutomationPage() {
  const s = await getSettings();
  return (
    <form action={saveAutomationSettings} className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">ऑटोमेशन सेटिंग्स</h1>
        <button className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white">सहेजें</button>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-black uppercase">मास्टर स्विच</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle name="automationEnabled" label="ऑटोमेशन चालू" checked={s.automationEnabled} hint="पूरी पाइपलाइन का मास्टर स्विच" />
          <Toggle name="autoAiProcessing" label="ऑटो AI प्रोसेसिंग" checked={s.autoAiProcessing} />
          <Toggle name="autoFactValidation" label="ऑटो फैक्ट वैलिडेशन" checked={s.autoFactValidation} />
          <Toggle name="autoImage" label="ऑटो इमेज" checked={s.autoImage} />
          <Toggle name="autoSeo" label="ऑटो SEO" checked={s.autoSeo} />
          <Toggle name="autoPublishing" label="ऑटो पब्लिशिंग" checked={s.autoPublishing} />
          <Toggle name="breakingNewsEnabled" label="ब्रेकिंग न्यूज़" checked={s.breakingNewsEnabled} />
          <Toggle name="duplicateProtection" label="डुप्लिकेट सुरक्षा" checked={s.duplicateProtection} />
          <Toggle name="smartPublishing" label="स्मार्ट पब्लिशिंग मोड" checked={s.smartPublishing} />
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-black uppercase">दैनिक लक्ष्य व अंतराल</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="न्यूनतम/दिन" name="dailyMin" value={s.dailyMin} />
          <Field label="अधिकतम/दिन" name="dailyMax" value={s.dailyMax} />
          <Field label="फेच अंतराल (मिनट)" name="fetchIntervalMinutes" value={s.fetchIntervalMinutes} />
          <Field label="पब्लिश अंतराल (मिनट)" name="publishIntervalMinutes" value={s.publishIntervalMinutes} />
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-black uppercase">समीक्षा मोड व थ्रेशोल्ड (§43)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">प्रकाशन मोड</span>
            <select name="publishMode" defaultValue={s.publishMode} className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
              <option value="AUTO">AUTO — स्वतः प्रकाशित</option>
              <option value="HYBRID">HYBRID — कॉन्फिडेंस आधारित</option>
              <option value="REVIEW">REVIEW — हर लेख समीक्षा</option>
            </select>
          </label>
          <Field label="ऑटो-पब्लिश कॉन्फिडेंस ≥" name="autoPublishConfidence" value={s.autoPublishConfidence} />
          <Field label="समीक्षा कॉन्फिडेंस ≥" name="reviewConfidence" value={s.reviewConfidence} />
        </div>
        <p className="mt-2 text-xs text-[var(--text-soft)]">HYBRID: कॉन्फिडेंस ≥ ऑटो-पब्लिश → प्रकाशित; ≥ समीक्षा → समीक्षा; अन्यथा अस्वीकार/होल्ड।</p>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-black uppercase">सोशल व ब्रेकिंग टिकर</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle name="telegramEnabled" label="टेलीग्राम ऑटो-पोस्ट" checked={s.telegramEnabled} hint="बिना क्रेडेंशियल के निष्क्रिय रहेगा" />
          <Toggle name="socialEnabled" label="सोशल ऑटो-पोस्ट" checked={s.socialEnabled} />
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-semibold">ब्रेकिंग टिकर टेक्स्ट (वैकल्पिक)</span>
          <input name="breakingTickerText" defaultValue={s.breakingTickerText} className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        </label>
      </section>

      <button className="rounded-md bg-brand px-6 py-2.5 font-semibold text-white">सेटिंग्स सहेजें</button>
    </form>
  );
}

function Field({ label, name, value }: { label: string; name: string; value: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <input type="number" name={name} defaultValue={value} className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
    </label>
  );
}
