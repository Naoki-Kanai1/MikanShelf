// 本一覧の場所・ステータスでの絞り込みの単体テスト。テストケースの一覧は tests/filterByConditions/cases.md
import { describe, expect, it } from 'vitest';
import {
  collectLocations,
  countConditions,
  filterByConditions,
  isBorrowable,
  type BookFilterConditions,
} from './filterByConditions';

type TestBook = {
  id: number;
  location: string;
  is_restricted: 0 | 1;
  status: 'available' | 'borrowed';
};

const book = (
  id: number,
  location: string,
  status: TestBook['status'] = 'available',
  is_restricted: 0 | 1 = 0,
): TestBook => ({ id, location, status, is_restricted });

const BOOKS: TestBook[] = [
  book(1, '横浜 14F SD部'),
  book(2, '虎ノ門 20F 共用', 'available', 1),
  book(3, '新川 3F 共用', 'borrowed'),
  book(4, '横浜 14F SD部', 'available', 1),
  book(5, '虎ノ門 20F 共用'),
  book(6, '横浜 14F SD部', 'borrowed'),
];

const NONE: BookFilterConditions = { locations: [], status: null };
const ids = (books: TestBook[]) => books.map((b) => b.id);

describe('isBorrowable', () => {
  it('FC-93: 棚にあり持ち出し禁止ではない本は借りられる', () => {
    expect(isBorrowable(book(1, 'A'))).toBe(true);
  });

  it('FC-94: 棚にあっても持ち出し禁止の本は借りられない', () => {
    expect(isBorrowable(book(1, 'A', 'available', 1))).toBe(false);
  });

  it('FC-95: 貸出中の本は（持ち出し禁止でも）借りられない', () => {
    expect(isBorrowable(book(1, 'A', 'borrowed'))).toBe(false);
    expect(isBorrowable(book(1, 'A', 'borrowed', 1))).toBe(false);
  });
});

describe('filterByConditions', () => {
  it('FC-05: 置き場所が空・状態が「すべて」なら、全ての本をもとの順のまま新しい配列で返す', () => {
    const result = filterByConditions(BOOKS, NONE);
    expect(ids(result)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result).not.toBe(BOOKS);
  });

  it('FC-06: 置き場所を1つ選ぶと、その置き場所の本だけを返す', () => {
    expect(ids(filterByConditions(BOOKS, { ...NONE, locations: ['横浜 14F SD部'] }))).toEqual([
      1, 4, 6,
    ]);
  });

  it('FC-07: 置き場所を2つ選ぶと、どちらかの置き場所の本をもとの順で返す', () => {
    const result = filterByConditions(BOOKS, {
      ...NONE,
      locations: ['新川 3F 共用', '虎ノ門 20F 共用'],
    });
    expect(ids(result)).toEqual([2, 3, 5]);
  });

  it('FC-96: 状態「借りられる」を選ぶと、借用中・持ち出し禁止の本を除いて返す', () => {
    expect(ids(filterByConditions(BOOKS, { ...NONE, status: 'available' }))).toEqual([1, 5]);
  });

  it('FC-97: 置き場所と状態の両方を選ぶと、両方に合う本だけを返す', () => {
    const result = filterByConditions(BOOKS, {
      locations: ['横浜 14F SD部'],
      status: 'available',
    });
    expect(ids(result)).toEqual([1]);
  });

  it('FC-11: どの本にも無い置き場所を選ぶと、空の配列を返す', () => {
    expect(filterByConditions(BOOKS, { ...NONE, locations: ['大阪'] })).toEqual([]);
  });

  it('FC-12: 置き場所は全く同じ文字のときだけ合い、一部だけ同じでは合わない', () => {
    expect(filterByConditions(BOOKS, { ...NONE, locations: ['横浜 14F'] })).toEqual([]);
    expect(filterByConditions(BOOKS, { ...NONE, locations: ['横浜'] })).toEqual([]);
  });

  it('FC-13: 本が0冊なら、空の配列を返す', () => {
    expect(filterByConditions([], { locations: ['横浜 14F SD部'], status: 'available' })).toEqual(
      [],
    );
    expect(filterByConditions([], NONE)).toEqual([]);
  });

  it('FC-14: もとの配列・本を書き換えない', () => {
    const books = structuredClone(BOOKS);
    const conditions: BookFilterConditions = { locations: ['横浜 14F SD部'], status: 'available' };
    const snapshot = structuredClone({ books, conditions });
    filterByConditions(books, conditions);
    filterByConditions(books, NONE);
    expect({ books, conditions }).toEqual(snapshot);
  });
});

describe('countConditions', () => {
  it('FC-15: 何も選んでいない（状態は「すべて」）なら 0', () => {
    expect(countConditions(NONE)).toBe(0);
  });

  it('FC-16: 置き場所2つ・状態1つを選ぶと 3', () => {
    expect(countConditions({ locations: ['A', 'B'], status: 'available' })).toBe(3);
  });
});

describe('collectLocations', () => {
  it('FC-65: 本の置き場所を、重複なしで名前の順に返す', () => {
    expect(collectLocations(BOOKS)).toEqual(['新川 3F 共用', '横浜 14F SD部', '虎ノ門 20F 共用']);
  });

  it('FC-66: 本が0冊なら、空の配列を返す', () => {
    expect(collectLocations([])).toEqual([]);
  });

  it('FC-67: 文字が少しでも違う置き場所は、別の置き場所として返す', () => {
    const books = [book(1, '横浜 14F'), book(2, '横浜 14F SD部'), book(3, '横浜 14F')];
    expect(collectLocations(books)).toEqual(['横浜 14F', '横浜 14F SD部']);
  });
});
