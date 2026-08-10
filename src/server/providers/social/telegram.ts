import type { SocialProvider, SocialResult } from '../types';

// Telegram channel automation (spec §38). Disabled unless a bot token +
// channel id are configured. Never posts without credentials (spec §37).

const enabled =
  process.env.TELEGRAM_ENABLED === 'true' &&
  !!process.env.TELEGRAM_BOT_TOKEN &&
  !!process.env.TELEGRAM_CHANNEL_ID;

export const telegramProvider: SocialProvider = {
  name: 'telegram',
  platform: 'TELEGRAM',
  enabled,
  async post(content: string, url: string): Promise<SocialResult> {
    if (!enabled) return { ok: false, error: 'Telegram not configured' };
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN!;
      const chatId = process.env.TELEGRAM_CHANNEL_ID!;
      const text = `${content}\n\n${url}`;
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
      });
      const data = await res.json();
      if (!data.ok) return { ok: false, error: data.description || 'Telegram error' };
      return { ok: true, externalId: String(data.result?.message_id ?? '') };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};
