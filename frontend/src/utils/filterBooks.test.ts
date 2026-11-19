// 本一覧の絞り込みの単体テスト。テストケースの一覧は tests/searchBooks/cases.md
import { describe, expect, it } from 'vitest';
import { filterBooks } from './filterBooks';

type TestBook = { id: number; title: string; authors: string };

const BOOKS: TestBook[] = [
  { id: 1, title: 'リーダブルコード', authors: 'Dustin Boswell、Trevor Foucher' },
  { id: 2, title: '達人プログラマー', authors: 'David Thomas、Andrew Hunt' },
  { id: 3, title: 'オブジェクト指向UIデザイン', authors: 'ソシオメディア株式会社' },
  { id: 4, title: 'Readable Tests', authors: 'テスト 太郎' },
];

const ids = (books: TestBook[]) => books.map((b) => b.id);

describe('filterBooks', () => {
  it('SB-01: 題名の一部で、題名にその文字を含む本だけを返す', () => {
    expect(ids(filterBooks(BOOKS, 'プログラマー'))).toEqual([2]);
  });

  it('SB-02: 著者の一部で、著者にその文字を含む本だけを返す', () => {
    expect(ids(filterBooks(BOOKS, 'Hunt'))).toEqual([2]);
  });

  it('SB-03: 複数の著者のうち2人目の名前の一部でも見つかる', () => {
    expect(ids(filterBooks(BOOKS, 'Fouch'))).toEqual([1]);
  });

  it('SB-04: 題名に含む本と著者に含む本を、両方もとの順のまま返す', () => {
    const books: TestBook[] = [
      { id: 10, title: 'デザインの本', authors: '山田' },
      { id: 11, title: '料理の本', authors: 'デザイン 花子' },
      { id: 12, title: '旅の本', authors: '佐藤' },
    ];
    expect(ids(filterBooks(books, 'デザイン'))).toEqual([10, 11]);
  });

  it('SB-05: 英字の大文字・小文字を区別しない', () => {
    expect(ids(filterBooks(BOOKS, 'readable'))).toEqual([4]);
    expect(ids(filterBooks(BOOKS, 'DUSTIN'))).toEqual([1]);
  });

  it('SB-06: 全角・半角を区別しない', () => {
    expect(ids(filterBooks(BOOKS, 'ＵＩ'))).toEqual([3]);
    expect(ids(filterBooks(BOOKS, 'ﾃｽﾄ'))).toEqual([4]);
  });

  it('SB-07: 空の文字のときは、全ての本をもとの順のまま返す', () => {
    expect(ids(filterBooks(BOOKS, ''))).toEqual([1, 2, 3, 4]);
  });

  it('SB-08: 空白だけのときは、全ての本を返す', () => {
    expect(ids(filterBooks(BOOKS, '   '))).toEqual([1, 2, 3, 4]);
    expect(ids(filterBooks(BOOKS, '　'))).toEqual([1, 2, 3, 4]);
  });

  it('SB-09: 前後の空白を無視して絞り込む', () => {
    expect(ids(filterBooks(BOOKS, ' 達人 '))).toEqual([2]);
    expect(ids(filterBooks(BOOKS, '　達人　'))).toEqual([2]);
  });

  it('SB-10: 題名の全体と同じ文字で、その本を返す', () => {
    expect(ids(filterBooks(BOOKS, 'リーダブルコード'))).toEqual([1]);
  });

  it('SB-11: どの本にも含まれない文字のときは、空の一覧を返す', () => {
    expect(filterBooks(BOOKS, '存在しない題名')).toEqual([]);
  });

  it('SB-12: 本が0冊のときは、空の一覧を返す', () => {
    expect(filterBooks([], '達人')).toEqual([]);
    expect(filterBooks([], '')).toEqual([]);
  });

  it('SB-13: もとの一覧は変えず、別の配列を返す', () => {
    const original = [...BOOKS];
    const all = filterBooks(BOOKS, '');
    const some = filterBooks(BOOKS, '達人');
    expect(BOOKS).toEqual(original);
    expect(all).not.toBe(BOOKS);
    expect(some).not.toBe(BOOKS);
  });

  it('SB-14: 正規表現で特別な意味を持つ記号も、文字のまま探す', () => {
    const books: TestBook[] = [
      { id: 20, title: 'C++入門', authors: '鈴木' },
      { id: 21, title: 'C言語入門', authors: '高橋' },
      { id: 22, title: 'Node.js 実践', authors: '田中' },
    ];
    expect(ids(filterBooks(books, 'C++'))).toEqual([20]);
    expect(ids(filterBooks(books, '.'))).toEqual([22]);
  });

  it('SB-22: 姓と名の間に空白がある著者を、空白なしで探しても見つかる', () => {
    expect(ids(filterBooks(BOOKS, 'DustinBoswell'))).toEqual([1]);
    expect(ids(filterBooks(BOOKS, 'stinBos'))).toEqual([1]);
  });

  it('SB-23: 空白の無い著者を、空白ありで探しても見つかる', () => {
    const books: TestBook[] = [{ id: 30, title: '本', authors: '山田太郎' }];
    expect(ids(filterBooks(books, '山田 太郎'))).toEqual([30]);
    expect(ids(filterBooks(books, '山田　太郎'))).toEqual([30]);
  });

  it('SB-24: 空白ありで探すときは、半角・全角・空白の数が違っても見つかる', () => {
    expect(ids(filterBooks(BOOKS, 'Dustin Boswell'))).toEqual([1]);
    expect(ids(filterBooks(BOOKS, 'Dustin　Boswell'))).toEqual([1]);
    expect(ids(filterBooks(BOOKS, 'Dustin   Boswell'))).toEqual([1]);
    expect(ids(filterBooks(BOOKS, 'テスト太郎'))).toEqual([4]);
  });

  it('SB-25: 題名の空白も無視する', () => {
    expect(ids(filterBooks(BOOKS, 'ReadableTests'))).toEqual([4]);
    expect(ids(filterBooks(BOOKS, 'リーダブル コード'))).toEqual([1]);
  });

  it('SB-26: 2人の著者の名前をまたぐ文字では見つからない', () => {
    expect(filterBooks(BOOKS, 'Boswell、Trevor')).toEqual([]);
    expect(filterBooks(BOOKS, 'BoswellTrevor')).toEqual([]);
    expect(filterBooks(BOOKS, 'Thomas、')).toEqual([]);
  });

  it('SB-27: 「、」だけで探すと、題名に「、」を含む本だけを返す', () => {
    const books: TestBook[] = [
      { id: 40, title: '走れ、メロス', authors: '太宰治' },
      { id: 41, title: '共著の本', authors: '佐藤、鈴木' },
    ];
    expect(ids(filterBooks(books, '、'))).toEqual([40]);
  });

  it('SB-28: 半角の区切り「､」も、全角の「、」と同じく区切りとして扱う', () => {
    const books: TestBook[] = [{ id: 50, title: '本', authors: 'Dustin Boswell､Trevor Foucher' }];
    expect(filterBooks(books, 'BoswellTrevor')).toEqual([]);
    expect(ids(filterBooks(books, 'TrevorFoucher'))).toEqual([50]);
  });
});
