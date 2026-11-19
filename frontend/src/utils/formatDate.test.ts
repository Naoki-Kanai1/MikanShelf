// formatDate の単体テスト。テストケースの一覧は tests/formatDate/cases.md
import { describe, expect, it } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('FD-01: UTC の日時を、日本時間の「YYYY年M月D日」にする', () => {
    expect(formatDate('2026-11-02 03:00:00')).toBe('2026年11月2日');
  });

  it('FD-02: UTC では前の日でも、日本時間で日付が変わっていれば次の日にする', () => {
    // UTC の 15:00 は日本時間の翌日 0:00
    expect(formatDate('2026-11-01 15:00:00')).toBe('2026年11月2日');
  });

  it('FD-03: 年の変わり目でも、日本時間の年と月日にする', () => {
    expect(formatDate('2026-12-31 15:00:00')).toBe('2027年1月1日');
  });

  it('FD-04: 月と日は 0 を付けずに出す', () => {
    expect(formatDate('2026-01-05 00:00:00')).toBe('2026年1月5日');
  });

  it('FD-05: 日時として読めない文字は、そのまま返す', () => {
    expect(formatDate('不明')).toBe('不明');
  });

  it('FD-06: 空の文字は、そのまま返す', () => {
    expect(formatDate('')).toBe('');
  });
});
