import { describe, it, expect } from 'vitest';
import { titleSimilarity, jaccard, fingerprint, fingerprintSimilarity, tokenize } from '@/lib/similarity';

// Duplicate-detection primitives (spec §5).
describe('similarity', () => {
  it('detects identical titles as fully similar', () => {
    expect(titleSimilarity('सरकार ने योजना शुरू की', 'सरकार ने योजना शुरू की')).toBe(1);
  });

  it('scores unrelated titles low', () => {
    expect(titleSimilarity('क्रिकेट मैच में जीत', 'शेयर बाजार में गिरावट')).toBeLessThan(0.5);
  });

  it('jaccard high for near-duplicate text, low for different', () => {
    const a = 'सरकार ने नई आवास योजना की घोषणा की जिससे लाखों लोगों को लाभ मिलेगा';
    const b = 'सरकार ने नई आवास योजना की घोषणा की जिससे करोड़ों लोगों को फायदा';
    const c = 'भारतीय टीम ने रोमांचक मुकाबले में शानदार जीत दर्ज की';
    expect(jaccard(a, b)).toBeGreaterThan(jaccard(a, c));
    expect(jaccard(a, c)).toBeLessThan(0.3);
  });

  it('fingerprint of same content is identical, near-dup is close', () => {
    const fpA = fingerprint('breaking news government announces relief package today');
    const fpB = fingerprint('breaking news government announces relief package today');
    const fpC = fingerprint('sports team wins the final match in last over');
    expect(fpA).toBe(fpB);
    expect(fingerprintSimilarity(fpA, fpB)).toBe(1);
    expect(fingerprintSimilarity(fpA, fpC)).toBeLessThan(0.85);
  });

  it('tokenize removes stopwords', () => {
    const tokens = tokenize('the government और सरकार announced a scheme');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('और');
    expect(tokens).toContain('government');
  });
});
