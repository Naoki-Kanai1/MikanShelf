// 本一覧に出す本を決める関数の単体テスト。テストケースの一覧は tests/filterByConditions/cases.md
import { describe, expect, it } from 'vitest';
import { filterBookList } from './filterBookList';
import type { BookFilterConditions } from './filterByConditions';

type TestBook = {
  id: number;
  title: string;
  authors: string;
  location: string;
  is_restricted: 0 | 1;
  status: 'available' | 'borrowed';
};

const book = (
  id: number,
  title: string,
  location: string,
  status: TestBook['status'] = 'available',
  is_restricted: 0 | 1 = 0,
): TestBook => ({ id, title, authors: `${title}の著者`, location, status, is_restricted });

const Y14 = '横浜 14F SD部';
const SHIN = '新川 3F 共用';

// リーダブルコード: 14F に借用中1冊・棚に1冊、新川に棚に1冊。達人プログラマー: 14F に棚に1冊
const BOOKS: TestBook[] = [
  book(1, 'リーダブルコード', Y14, 'borrowed'),
  book(2, '達人プログラマー', Y14),
  book(3, 'リーダブルコード', Y14),
  book(4, 'リーダブルコード', SHIN),
];

const NONE: BookFilterConditions = { locations: [], status: null };
const ids = (books: TestBook[]) => books.map((b) => b.id);

describe('filterBookList', () => {
  it('FC-44: 条件も文字も空なら、全ての本をもとの順のまま返す', () => {
    expect(ids(filterBookList(BOOKS, '', NONE))).toEqual([1, 2, 3, 4]);
  });

  it('FC-47: 置き場所で絞ると、その置き場所の冊だけを、状態に関係なく全て残す', () => {
    expect(ids(filterBookList(BOOKS, '', { ...NONE, locations: [Y14] }))).toEqual([1, 2, 3]);
  });

  it('FC-48: 条件と文字の両方に合う本だけを残し、その本の同じ置き場所の冊も残す', () => {
    const result = filterBookList(BOOKS, 'リーダブル', { ...NONE, locations: [Y14] });
    expect(ids(result)).toEqual([1, 3]);
  });

  it('FC-49: どの本も合わなければ、空の配列を返す', () => {
    expect(filterBookList(BOOKS, '存在しない題名', NONE)).toEqual([]);
  });

  it('FC-98: 状態「借りられる」で絞ると、同じ本・同じ置き場所でも、借用中・持ち出し禁止の冊は残さない', () => {
    const books: TestBook[] = [
      book(1, 'A', Y14, 'borrowed'),
      book(2, 'A', Y14, 'available', 1),
      book(3, 'A', Y14),
      book(4, 'B', Y14, 'available', 1),
    ];
    expect(ids(filterBookList(books, '', { ...NONE, status: 'available' }))).toEqual([3]);
  });
});
