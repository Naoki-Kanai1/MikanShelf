// 初期データの置き場所と、古い置き場所の書き換え（migrateOldLocations）の単体テスト。
// テストケースの一覧は tests/seedLocations/cases.md
// DB は vitest.config.ts の設定でメモリ上の使い捨てのもの（初期データ入り）になる。
// DB を書き換えるテストは、ほかのテストに影響しないよう、最後に ROLLBACK で元に戻す
import { describe, expect, it } from 'vitest';
import { db, migrateOldLocations, seedBooks } from './db';

const LOC_13F = '横浜 13F 共用';
const LOC_14F = '横浜 14F SD部';
const LOC_TORANOMON = '虎ノ門 20F 共用';
const LOC_SHINKAWA = '新川 777F 共用';

type Book = { id: number; title: string; location: string; is_restricted: 0 | 1 };

const allBooks = () =>
  db.prepare('SELECT id, title, location, is_restricted FROM books ORDER BY id').all() as Book[];

const bookById = (id: number) =>
  db.prepare('SELECT id, title, location, is_restricted FROM books WHERE id = ?').get(id) as Book;

// 題名の n 冊目（ID の小さい順）
const nthCopy = (title: string, nth: number) =>
  (
    db
      .prepare('SELECT id, title, location, is_restricted FROM books WHERE title = ? ORDER BY id')
      .all(title) as Book[]
  )[nth - 1];

// fn を実行したあと、DB を元に戻す
function withRollback(fn: () => void) {
  db.exec('BEGIN');
  try {
    fn();
  } finally {
    db.exec('ROLLBACK');
  }
}

// 初期データの本を、すべて古い置き場所の名前・貸出可能に戻す
function revertToOldLocations() {
  db.prepare(`UPDATE books SET location = '3階 書架A', is_restricted = 0`).run();
}

// 初期データどおりの [置き場所, 持ち出し禁止] を、題名の n 冊目の順に並べたもの
function expectedFromSeed() {
  return seedBooks.map(([title, , location, isRestricted]) => ({ title, location, isRestricted }));
}

describe('seedBooks（初期データ）', () => {
  it('SL-01: 置き場所は4種類だけ', () => {
    const locations = new Set(allBooks().map((b) => b.location));
    expect([...locations].sort()).toEqual([LOC_SHINKAWA, LOC_TORANOMON, LOC_13F, LOC_14F].sort());
  });

  it('SL-02: 置き場所ごとの冊数と持ち出し禁止の冊数', () => {
    const rows = db
      .prepare(
        `SELECT location, COUNT(*) AS total, SUM(is_restricted) AS restricted
         FROM books GROUP BY location`,
      )
      .all() as { location: string; total: number; restricted: number }[];
    const byLocation = Object.fromEntries(rows.map((r) => [r.location, [r.total, r.restricted]]));
    expect(byLocation).toEqual({
      [LOC_13F]: [10, 10],
      [LOC_14F]: [33, 3],
      [LOC_TORANOMON]: [14, 6],
      [LOC_SHINKAWA]: [13, 6],
    });
    expect(allBooks()).toHaveLength(70);
  });

  it('SL-03: 13F は10タイトルが1冊ずつで、すべて持ち出し禁止。ID は 61〜70', () => {
    const magazines = allBooks().filter((b) => b.location === LOC_13F);
    expect(magazines.map((b) => b.id)).toEqual([61, 62, 63, 64, 65, 66, 67, 68, 69, 70]);
    expect(new Set(magazines.map((b) => b.title)).size).toBe(10);
    expect(magazines.every((b) => b.is_restricted === 1)).toBe(true);
    for (const m of magazines) {
      expect(allBooks().filter((b) => b.title === m.title)).toHaveLength(1);
    }
  });

  it('SL-04: 同じ置き場所に、持ち出し禁止の本と貸出可能な本の両方がある題名', () => {
    const mixed = (title: string, location: string) =>
      new Set(
        allBooks()
          .filter((b) => b.title === title && b.location === location)
          .map((b) => b.is_restricted),
      );
    expect(mixed('テスト駆動開発', LOC_TORANOMON)).toEqual(new Set([0, 1]));
    expect(mixed('ドメイン駆動設計', LOC_TORANOMON)).toEqual(new Set([0, 1]));
    expect(mixed('イシューからはじめよ', LOC_TORANOMON)).toEqual(new Set([0, 1]));
    expect(mixed('リファクタリング', LOC_SHINKAWA)).toEqual(new Set([0, 1]));
  });

  it('SL-05: 初期データで貸出中の本は、すべて 14F の貸出可能な本', () => {
    const borrowed = db
      .prepare(
        `SELECT b.id, b.title, b.location, b.is_restricted FROM loans l
         JOIN books b ON b.id = l.book_id WHERE l.status = 'borrowed'`,
      )
      .all() as Book[];
    expect(borrowed.length).toBeGreaterThan(0);
    for (const b of borrowed) {
      expect(b.location).toBe(LOC_14F);
      expect(b.is_restricted).toBe(0);
    }
  });

  it('SL-06: 各タイトルの1冊目（ID 1〜20）はすべて 14F で、題名ごとの冊数は1〜5冊', () => {
    const firsts = allBooks().filter((b) => b.id <= 20);
    expect(firsts).toHaveLength(20);
    expect(firsts.every((b) => b.location === LOC_14F)).toBe(true);
    for (const f of firsts) {
      const n = allBooks().filter((b) => b.title === f.title).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});

describe('migrateOldLocations', () => {
  it('SL-07: 古い置き場所の名前の本が、初期データどおりに書き換わる', () => {
    withRollback(() => {
      // 貸出中の本は持ち出し禁止を変えないので、この確かめでは貸出を返却済みにしておく
      db.prepare(
        `UPDATE loans SET status = 'returned', returned_at = '2026-11-19 00:00:00' WHERE status = 'borrowed'`,
      ).run();
      revertToOldLocations();
      migrateOldLocations(db, seedBooks);

      const seen = new Map<string, number>();
      for (const { title, location, isRestricted } of expectedFromSeed()) {
        const nth = (seen.get(title) ?? 0) + 1;
        seen.set(title, nth);
        const copy = nthCopy(title, nth);
        expect([title, nth, copy.location, copy.is_restricted]).toEqual([
          title,
          nth,
          location,
          isRestricted,
        ]);
      }
    });
  });

  it('SL-08: 貸出中の本は、置き場所だけ書き換わり、持ち出し禁止は変わらない', () => {
    withRollback(() => {
      // リーダブルコードの4冊目は、初期データでは新川の持ち出し禁止の本
      const copy = nthCopy('リーダブルコード', 4);
      db.prepare(`UPDATE books SET location = '3階 書架D', is_restricted = 0 WHERE id = ?`).run(
        copy.id,
      );
      db.prepare(
        `INSERT INTO loans (book_id, user_id, status)
         VALUES (?, (SELECT id FROM users WHERE account_id = 'emp0010'), 'borrowed')`,
      ).run(copy.id);
      migrateOldLocations(db, seedBooks);

      const after = bookById(copy.id);
      expect(after.location).toBe(LOC_SHINKAWA);
      expect(after.is_restricted).toBe(0);
    });
  });

  it('SL-09: 新しい置き場所の名前になっている本は変わらない', () => {
    withRollback(() => {
      // 初期データとは違う値にしておき、書き換えられないことを確かめる
      const copy = nthCopy('Clean Code', 2);
      db.prepare(`UPDATE books SET location = ?, is_restricted = 1 WHERE id = ?`).run(
        LOC_TORANOMON,
        copy.id,
      );
      const before = allBooks();
      migrateOldLocations(db, seedBooks);
      expect(allBooks()).toEqual(before);
    });
  });

  it('SL-10: 2回続けて呼んでも、1回目のあとと同じ', () => {
    withRollback(() => {
      revertToOldLocations();
      migrateOldLocations(db, seedBooks);
      const once = allBooks();
      migrateOldLocations(db, seedBooks);
      expect(allBooks()).toEqual(once);
    });
  });

  it('SL-11: 初期データにない題名の本は変わらない', () => {
    withRollback(() => {
      const id = Number(
        db
          .prepare(
            `INSERT INTO books (title, authors, location, is_restricted)
             VALUES ('SL-11の本', 'テスト著者', '3階 書架A', 0)`,
          )
          .run().lastInsertRowid,
      );
      migrateOldLocations(db, seedBooks);
      expect(bookById(id)).toEqual({
        id,
        title: 'SL-11の本',
        location: '3階 書架A',
        is_restricted: 0,
      });
    });
  });

  it('SL-12: 古い名前に似ているが形が違う置き場所は変わらない', () => {
    withRollback(() => {
      const a = nthCopy('リーダブルコード', 2);
      const b = nthCopy('リーダブルコード', 3);
      db.prepare(`UPDATE books SET location = '3階書架A' WHERE id = ?`).run(a.id);
      db.prepare(`UPDATE books SET location = '13階 書架A' WHERE id = ?`).run(b.id);
      migrateOldLocations(db, seedBooks);
      expect(bookById(a.id).location).toBe('3階書架A');
      expect(bookById(b.id).location).toBe('13階 書架A');
    });
  });
});
