// 同じ本のまとまりの単体テスト。テストケースの一覧は tests/searchBooks/cases.md
import { describe, expect, it } from 'vitest';
import { groupBooks, groupByLocation } from './groupBooks';

type TestBook = {
  id: number;
  title: string;
  authors: string;
  status: 'available' | 'borrowed';
  is_restricted: 0 | 1;
};

const book = (
  id: number,
  title: string,
  authors: string,
  status: TestBook['status'] = 'available',
): TestBook => ({
  id,
  title,
  authors,
  status,
  is_restricted: 0,
});

// まとまりごとに、入っている本の id を並べる
const groupIds = (books: TestBook[]) => groupBooks(books).map((g) => g.books.map((b) => b.id));

describe('groupBooks', () => {
  it('SB-29: 同じ題名・著者の本を、1つのまとまりにもとの順で入れる', () => {
    const books = [
      book(1, 'リーダブルコード', 'Dustin Boswell'),
      book(2, '達人プログラマー', 'David Thomas'),
      book(3, 'リーダブルコード', 'Dustin Boswell'),
      book(4, 'リーダブルコード', 'Dustin Boswell'),
    ];
    expect(groupIds(books)).toEqual([[1, 3, 4], [2]]);
  });

  it('SB-30: 題名が同じでも著者が違えば、別々のまとまりになる', () => {
    expect(groupIds([book(1, '入門', '佐藤'), book(2, '入門', '鈴木')])).toEqual([[1], [2]]);
  });

  it('SB-31: 著者が同じでも題名が違えば、別々のまとまりになる', () => {
    expect(groupIds([book(1, '上巻', '佐藤'), book(2, '下巻', '佐藤')])).toEqual([[1], [2]]);
  });

  it('SB-32: まとまりは、それぞれの最初の1冊が出てくる順に並ぶ', () => {
    const books = [book(5, 'B', 'x'), book(6, 'A', 'x'), book(7, 'B', 'x'), book(8, 'C', 'x')];
    expect(groupBooks(books).map((g) => g.representative.title)).toEqual(['B', 'A', 'C']);
  });

  it('SB-33: 棚にある本と貸出中の本が混ざるときは、棚にある本のうち最初の1冊が代表', () => {
    const books = [
      book(1, '本', '著者', 'borrowed'),
      book(2, '本', '著者', 'available'),
      book(3, '本', '著者', 'available'),
    ];
    expect(groupBooks(books)[0].representative.id).toBe(2);
  });

  it('SB-34: 全て貸出中のときは、最初の1冊が代表', () => {
    const books = [book(1, '本', '著者', 'borrowed'), book(2, '本', '著者', 'borrowed')];
    expect(groupBooks(books)[0].representative.id).toBe(1);
  });

  it('SB-35: 1冊だけの本は、1冊のまとまりになり、代表はその本', () => {
    const only = book(9, '本', '著者');
    expect(groupBooks([only])).toEqual([
      { key: expect.any(String), representative: only, books: [only] },
    ]);
  });

  it('SB-36: 本が0冊のときは、空の一覧を返す', () => {
    expect(groupBooks([])).toEqual([]);
  });

  it('SB-37: 空白・全角半角・大文字小文字だけが違う題名・著者は、同じ本としてまとめる', () => {
    const books = [
      book(1, 'Readable Code', 'Dustin Boswell'),
      book(2, 'ReadableCode', 'Dustin　Boswell'),
      book(3, 'ＲＥＡＤＡＢＬＥ ＣＯＤＥ', 'dustin boswell'),
    ];
    expect(groupIds(books)).toEqual([[1, 2, 3]]);
  });
});

type Copy = {
  id: number;
  location: string;
  status: 'available' | 'borrowed';
  is_restricted: 0 | 1;
};
const copy = (id: number, location: string, status: Copy['status'] = 'available'): Copy => ({
  id,
  location,
  status,
  is_restricted: 0,
});

describe('groupByLocation', () => {
  it('SB-47: 置き場所が同じ本を1つにまとめ、置き場所の最初の1冊が出てくる順に並べる', () => {
    const groups = groupByLocation([
      copy(1, '3階 書架A'),
      copy(2, '4階 書架B'),
      copy(3, '3階 書架A'),
    ]);
    expect(groups.map((g) => [g.location, g.books.map((b) => b.id)])).toEqual([
      ['3階 書架A', [1, 3]],
      ['4階 書架B', [2]],
    ]);
  });

  it('SB-48: 棚にある冊数を数え、代表は棚にある本のうち最初の1冊', () => {
    const [group] = groupByLocation([
      copy(1, '3階 書架A', 'borrowed'),
      copy(2, '3階 書架A', 'available'),
      copy(3, '3階 書架A', 'available'),
    ]);
    expect(group.availableCount).toBe(2);
    expect(group.representative.id).toBe(2);
  });

  it('SB-49: 全て貸出中のときは、棚にある冊数が 0 で、代表は最初の1冊', () => {
    const [group] = groupByLocation([
      copy(4, '3階 書架A', 'borrowed'),
      copy(5, '3階 書架A', 'borrowed'),
    ]);
    expect(group.availableCount).toBe(0);
    expect(group.representative.id).toBe(4);
  });

  it('SB-50: 置き場所の文字が少しでも違えば、別々にする', () => {
    expect(
      groupByLocation([copy(1, '3階 書架A'), copy(2, '3階書架A')]).map((g) => g.location),
    ).toEqual(['3階 書架A', '3階書架A']);
  });

  it('SB-51: 本が0冊のときは、空の一覧を返す', () => {
    expect(groupByLocation([])).toEqual([]);
  });
});
