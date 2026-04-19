import { describe, expect, it } from 'vitest';
import {
  crawlerContactPhoneDigitsLikelyYYYYMMDD,
} from '../config/crawler-contact-extraction.js';

describe('crawlerContactPhoneDigitsLikelyYYYYMMDD', () => {
  it('flags 8-digit YYYYMMDD calendar-like runs', () => {
    expect(crawlerContactPhoneDigitsLikelyYYYYMMDD('20260326')).toBe(true);
    expect(crawlerContactPhoneDigitsLikelyYYYYMMDD('20260322')).toBe(true);
    expect(crawlerContactPhoneDigitsLikelyYYYYMMDD('20260311')).toBe(true);
    expect(crawlerContactPhoneDigitsLikelyYYYYMMDD('20260212')).toBe(true);
    expect(crawlerContactPhoneDigitsLikelyYYYYMMDD('+20260326')).toBe(true);
  });

  it('does not flag valid-length phones that are not date-shaped', () => {
    expect(crawlerContactPhoneDigitsLikelyYYYYMMDD('53137260')).toBe(false);
    expect(crawlerContactPhoneDigitsLikelyYYYYMMDD('00256256')).toBe(false);
    expect(crawlerContactPhoneDigitsLikelyYYYYMMDD('34612345678')).toBe(false);
  });

  it('does not flag 8-digit numbers with impossible month/day fields', () => {
    expect(crawlerContactPhoneDigitsLikelyYYYYMMDD('20261301')).toBe(false);
    expect(crawlerContactPhoneDigitsLikelyYYYYMMDD('20260299')).toBe(false);
  });
});
