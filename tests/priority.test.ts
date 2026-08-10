import { describe, it, expect } from 'vitest';
import { computePriority, detectBreaking, isOfficialContent, targetWordCount } from '@/server/services/priority';

// Priority engine (spec §6) + length targeting (spec §9).
describe('priority engine', () => {
  it('flags breaking keywords', () => {
    expect(detectBreaking('ब्रेकिंग: बड़ी खबर आई')).toBe(true);
    expect(detectBreaking('सामान्य मौसम अपडेट')).toBe(false);
  });

  it('detects official content', () => {
    expect(isOfficialContent('सरकार ने अधिसूचना जारी की')).toBe(true);
    expect(isOfficialContent('फिल्म का ट्रेलर रिलीज़')).toBe(false);
  });

  it('breaking news gets very high priority', () => {
    const score = computePriority({
      title: 'ब्रेकिंग: भूकंप के झटके',
      sourceTrust: 80,
      isOfficial: false,
      publishedAt: new Date(),
      categorySlug: 'india',
      duplicateScore: 0,
    });
    expect(score).toBeGreaterThanOrEqual(92);
  });

  it('official announcement scores high', () => {
    const score = computePriority({
      title: 'सरकार की नई योजना की घोषणा',
      sourceTrust: 95,
      isOfficial: true,
      publishedAt: new Date(),
      categorySlug: 'government-schemes',
      duplicateScore: 0,
    });
    expect(score).toBeGreaterThanOrEqual(88);
  });

  it('duplicate probability lowers priority', () => {
    const base = { title: 'सामान्य खबर', sourceTrust: 70, isOfficial: false, publishedAt: new Date(), categorySlug: 'latest' };
    const fresh = computePriority({ ...base, duplicateScore: 0 });
    const dup = computePriority({ ...base, duplicateScore: 90 });
    expect(dup).toBeLessThan(fresh);
  });

  it('stays within 0..100', () => {
    const s = computePriority({ title: 'x', sourceTrust: 200, isOfficial: true, publishedAt: new Date(), duplicateScore: -50 });
    expect(s).toBeLessThanOrEqual(100);
    expect(s).toBeGreaterThanOrEqual(0);
  });

  it('length targets match importance', () => {
    expect(targetWordCount(60, true)).toBeLessThan(targetWordCount(90, false));
    expect(targetWordCount(90, false)).toBeGreaterThanOrEqual(1000);
  });
});
