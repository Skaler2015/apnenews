// Provider factory (spec §76). Selects concrete providers from env config.
// Every provider degrades gracefully to a keyless default.

import type { AiProvider, NewsProvider, ImageProvider, SocialProvider } from './types';
import { mockAiProvider } from './ai/mock';
import { anthropicAiProvider } from './ai/anthropic';
import { rssNewsProvider } from './news/rss';
import { placeholderImageProvider } from './image/placeholder';
import { telegramProvider } from './social/telegram';

export function getAiProvider(): AiProvider {
  switch ((process.env.AI_PROVIDER || 'mock').toLowerCase()) {
    case 'anthropic':
      return anthropicAiProvider;
    // 'openai' could be added here following the same interface.
    default:
      return mockAiProvider;
  }
}

export function getNewsProvider(): NewsProvider {
  // Only RSS is implemented by default; NewsAPI etc. plug in here.
  return rssNewsProvider;
}

export function getImageProvider(): ImageProvider {
  // Placeholder (deterministic SVG) is the safe default that never uses
  // copyrighted imagery (spec §16/§17).
  return placeholderImageProvider;
}

export function getSocialProviders(): SocialProvider[] {
  return [telegramProvider].filter((p) => p.enabled);
}

export * from './types';
