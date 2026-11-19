// 「棚にある冊数」を数える関数の単体テスト。テストケースの一覧は tests/bookStock/cases.md
// DB は vitest.config.ts の設定でメモリ上の使い捨てのもの（初期データ入り）になる。
// 初期データと混ざらないよう、テストごとに専用の題名の本を入れて確かめる
import { describe, expect, it } from 'vitest';
import { countBooksOnShelf, countBooksOnShelfAtLocation } from './bookStock';
import { db } from './db';

const userId = (
  db.prepare(`SELECT id FROM users WHERE account_id = 'emp0001'`).get() as {
    id: number;
  }
).id;

// 本を1冊入れて、その ID を返す
function addBook(title: string, isRestricted: 0 | 1 = 0, location = 'テスト書架'): number {
  const result = db
    .prepare(
      `INSERT INTO books (title, authors, location, is_restricted) VALUES (?, 'テスト著者', ?, ?)`,
    )
    .run(title, location, isRestricted);
  return Number(result.lastInsertRowid);
}

// 本に貸出を入れる
function addLoan(bookId: number, status: 'borrowed' | 'returned') {
  db.prepare(`INSERT INTO loans (book_id, user_id, status, returned_at) VALUES (?, ?, ?, ?)`).run(
    bookId,
    userId,
    status,
    status === 'returned' ? '2026-11-10 00:00:00' : null,
  );
}

describe('countBooksOnShelf', () => {
  it('BS-01: 貸出のない本が1冊だけなら 1', () => {
    addBook('BS-01の本');
    expect(countBooksOnShelf('BS-01の本')).toBe(1);
  });

  it('BS-02: 3冊のうち1冊が貸出中なら 2', () => {
    const first = addBook('BS-02の本');
    addBook('BS-02の本');
    addBook('BS-02の本');
    addLoan(first, 'borrowed');
    expect(countBooksOnShelf('BS-02の本')).toBe(2);
  });

  it('BS-03: 2冊とも貸出中なら 0', () => {
    addLoan(addBook('BS-03の本'), 'borrowed');
    addLoan(addBook('BS-03の本'), 'borrowed');
    expect(countBooksOnShelf('BS-03の本')).toBe(0);
  });

  it('BS-04: 返却済みの貸出だけがある本は、棚にあるとして数える', () => {
    addLoan(addBook('BS-04の本'), 'returned');
    expect(countBooksOnShelf('BS-04の本')).toBe(1);
  });

  it('BS-05: 持ち出し禁止の本も数える', () => {
    addBook('BS-05の本', 0);
    addBook('BS-05の本', 1);
    expect(countBooksOnShelf('BS-05の本')).toBe(2);
  });

  it('BS-06: その題名の本がなければ 0', () => {
    expect(countBooksOnShelf('BS-06の、どこにもない本')).toBe(0);
  });

  it('BS-07: 題名が完全に同じ本だけを数える（前後に文字が付いた本、大文字小文字の違う本は数えない）', () => {
    addBook('BS-07 Book');
    addBook('BS-07 Book 第2版');
    addBook('新 BS-07 Book');
    addBook('BS-07 BOOK');
    expect(countBooksOnShelf('BS-07 Book')).toBe(1);
  });

  it('BS-08: 空の文字なら 0', () => {
    expect(countBooksOnShelf('')).toBe(0);
  });
});

describe('countBooksOnShelfAtLocation', () => {
  it('BS-16: 置き場所ごとに、その置き場所の棚にある冊数を返す', () => {
    addBook('BS-16の本', 0, '書架A');
    addBook('BS-16の本', 0, '書架A');
    addBook('BS-16の本', 0, '書架B');
    expect(countBooksOnShelfAtLocation('BS-16の本', '書架A')).toBe(2);
    expect(countBooksOnShelfAtLocation('BS-16の本', '書架B')).toBe(1);
  });

  it('BS-17: 貸出中の本と、ほかの置き場所の本は数えない', () => {
    addLoan(addBook('BS-17の本', 0, '書架A'), 'borrowed');
    addBook('BS-17の本', 0, '書架A');
    addBook('BS-17の本', 0, '書架B');
    expect(countBooksOnShelfAtLocation('BS-17の本', '書架A')).toBe(1);
  });

  it('BS-18: その置き場所の本が全て貸出中なら、ほかの置き場所に棚にある本があっても 0', () => {
    addLoan(addBook('BS-18の本', 0, '書架A'), 'borrowed');
    addLoan(addBook('BS-18の本', 0, '書架A'), 'borrowed');
    addBook('BS-18の本', 0, '書架B');
    expect(countBooksOnShelfAtLocation('BS-18の本', '書架A')).toBe(0);
  });

  it('BS-19: 持ち出し禁止の本と、返却済みの貸出だけがある本も数える', () => {
    addBook('BS-19の本', 1, '書架A');
    addLoan(addBook('BS-19の本', 0, '書架A'), 'returned');
    expect(countBooksOnShelfAtLocation('BS-19の本', '書架A')).toBe(2);
  });

  it('BS-20: その置き場所に同じ題名の本がなければ 0', () => {
    addBook('BS-20の本', 0, '書架B');
    expect(countBooksOnShelfAtLocation('BS-20の本', '書架A')).toBe(0);
  });

  it('BS-21: 題名も置き場所も完全に同じ本だけを数える', () => {
    addBook('BS-21の本', 0, '書架A');
    addBook('BS-21の本', 0, '書架 A');
    addBook('BS-21の本 第2版', 0, '書架A');
    expect(countBooksOnShelfAtLocation('BS-21の本', '書架A')).toBe(1);
  });
});
