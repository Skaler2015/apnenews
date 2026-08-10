import type { ImageProvider, ImageInput, ImageResult } from '../types';
import { sha256 } from '@/lib/utils';

// Deterministic, copyright-safe image provider (spec §16/§17). It renders a
// neutral editorial SVG banner (category-coloured gradient + title) as a data
// URI — no real photos, no fake logos, no misleading imagery. Real providers
// (Unsplash licensed / AI generation) implement the same interface.

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] || c));
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur.trim());
  return lines.slice(0, maxLines);
}

function buildSvg(input: ImageInput, w: number, h: number): string {
  const seed = sha256(input.title).slice(0, 6);
  const c1 = input.categoryColor || '#c8102e';
  const c2 = `#${seed}`;
  const lines = wrapText(input.title, Math.floor(w / 22), 3);
  const tspans = lines
    .map((line, i) => `<tspan x="60" dy="${i === 0 ? 0 : 46}">${escapeXml(line)}</tspan>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="#000" opacity="0.28"/>
  <text x="60" y="70" font-family="sans-serif" font-size="22" fill="#ffffff" opacity="0.85" letter-spacing="2">${escapeXml(
    input.categoryName.toUpperCase(),
  )}</text>
  <text x="60" y="${Math.round(h / 2)}" font-family="sans-serif" font-weight="700" font-size="40" fill="#ffffff">${tspans}</text>
  <text x="60" y="${h - 40}" font-family="sans-serif" font-size="18" fill="#ffffff" opacity="0.8">ApneNews · संपादकीय प्रतीकात्मक चित्र</text>
</svg>`;
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const placeholderImageProvider: ImageProvider = {
  name: 'placeholder',
  async generate(input: ImageInput): Promise<ImageResult> {
    const w = 1200;
    const h = 675; // 16:9 social/featured
    const svg = buildSvg(input, w, h);
    return {
      url: toDataUri(svg),
      altText: `${input.title} — प्रतीकात्मक संपादकीय चित्र`,
      caption: 'प्रतीकात्मक चित्र (AI/संपादकीय)',
      credit: 'ApneNews Editorial',
      provider: 'placeholder',
      width: w,
      height: h,
    };
  },
};
