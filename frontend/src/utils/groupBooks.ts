// 本一覧で、同じ題名・同じ著者の本（同じ本が何冊もあるとき）を1つにまとめる。
import { normalizeForSearch } from './filterBooks';

// 代表の1冊を選ぶのに使う項目
type Representable = { status: 'available' | 'borrowed'; is_restricted: 0 | 1 };

type Groupable = Representable & { title: string; authors: string };

/**
 * 何冊かの本から、代表（行を押したときに開く本）を1冊選ぶ。
 * 状態の優先順は「棚にある（借りられる）→ 持ち出し禁止 → 誰かが借用中」。同じ順位の本が何冊もあれば、最初の1冊。
 */
function pickRepresentative<T extends Representable>(list: readonly T[]): T {
  return (
    list.find((book) => book.status === 'available' && book.is_restricted !== 1) ??
    list.find((book) => book.status === 'available') ??
    list[0]
  );
}

export type BookGroup<T> = {
  // まとまりを見分ける文字（React の key にも使う）
  key: string;
  // 一覧に代表として出す1冊。「棚にある（借りられる）→ 持ち出し禁止 → 誰かが借用中」の順で、最初の1冊
  representative: T;
  // まとまりに入る本。もとの順のまま
  books: T[];
};

// 同じ本かを決める文字。空白・全角半角・大文字小文字の違いは同じとみなす
const groupKey = (book: Groupable) =>
  `${normalizeForSearch(book.title)}\u0000${normalizeForSearch(book.authors)}`;

/**
 * 題名と著者がどちらも同じ本を1つのまとまりにする。
 * まとまりの並びは、それぞれの最初の1冊が `books` に出てくる順。1冊だけの本も、1冊のまとまりになる。
 */
export function groupBooks<T extends Groupable>(books: readonly T[]): BookGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const book of books) {
    const key = groupKey(book);
    const list = groups.get(key);
    if (list) list.push(book);
    else groups.set(key, [book]);
  }
  return [...groups].map(([key, list]) => ({
    key,
    representative: pickRepresentative(list),
    books: list,
  }));
}

type Locatable = Representable & { location: string };

export type LocationGroup<T> = {
  // 置き場所（この文字が全く同じ本を1つにまとめる）
  location: string;
  // 行を押したときに開く1冊。「棚にある（借りられる）→ 持ち出し禁止 → 誰かが借用中」の順で、最初の1冊
  representative: T;
  // この置き場所にある本。もとの順のまま
  books: T[];
  // この置き場所の本のうち、棚にある冊数
  availableCount: number;
};

/**
 * 同じ本のまとまりを開いたときの行を作る。置き場所が全く同じ本を1つにまとめる。
 * 並びは、それぞれの置き場所の最初の1冊が `books` に出てくる順。
 */
export function groupByLocation<T extends Locatable>(books: readonly T[]): LocationGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const book of books) {
    const list = groups.get(book.location);
    if (list) list.push(book);
    else groups.set(book.location, [book]);
  }
  return [...groups].map(([location, list]) => {
    const available = list.filter((book) => book.status === 'available');
    return {
      location,
      representative: pickRepresentative(list),
      books: list,
      availableCount: available.length,
    };
  });
}
