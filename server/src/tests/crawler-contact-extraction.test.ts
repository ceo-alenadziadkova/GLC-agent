import { describe, expect, it } from 'vitest';
import {
  CRAWLER_PHONE_PLAIN_MAX_DIGITS,
  crawlerContactPhoneDigitsLikelyYYYYMMDD,
  crawlerContactPhoneDigitsLikelyUnixTimestamp,
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

describe('crawlerContactPhoneDigitsLikelyUnixTimestamp', () => {
  it('flags 10-digit unix second timestamps', () => {
    expect(crawlerContactPhoneDigitsLikelyUnixTimestamp('1776690092')).toBe(true);
  });

  it('flags 13-digit unix millisecond timestamps', () => {
    expect(crawlerContactPhoneDigitsLikelyUnixTimestamp('1776693600000')).toBe(true);
  });

  it('does not flag regular phone-like values', () => {
    expect(crawlerContactPhoneDigitsLikelyUnixTimestamp('+375293022277')).toBe(false);
    expect(crawlerContactPhoneDigitsLikelyUnixTimestamp('651765591')).toBe(false);
  });
});

describe('crawler phone plain-number policy', () => {
  it('keeps plain-digit local numbers bounded', () => {
    expect(CRAWLER_PHONE_PLAIN_MAX_DIGITS).toBe(11);
  });
});
