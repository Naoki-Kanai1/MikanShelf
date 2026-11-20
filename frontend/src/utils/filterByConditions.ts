// 本一覧の絞り込みの条件（置き場所・状態）。検索の文字での絞り込み（filterBooks.ts）と組み合わせて使う。

// 絞り込みに使う本の状態。「借りられる」（貸出中でも持ち出し禁止でもない）だけを選べる
export type BookFilterStatus = 'available';

// 絞り込みの欄に並べる順と、表示する名前（この前に「すべて」を置く）。名前は状態の印（components/StatusChip）と同じ
export const BOOK_FILTER_STATUSES: readonly { value: BookFilterStatus; label: string }[] = [
  { value: 'available', label: '借りられる' },
];

// 置き場所と貸出の状況を持つものなら何でも絞り込める（本一覧の Book など）
export type Filterable = {
  location: string;
  is_restricted: 0 | 1;
  status: 'available' | 'borrowed';
};

export type BookFilterConditions = {
  // 残す置き場所。空のときは置き場所で絞り込まない
  locations: readonly string[];
  // 残す状態（1つだけ選べる）。null（「すべて」）のときは状態で絞り込まない
  status: BookFilterStatus | null;
};

/**
 * 本1冊が借りられるか（状態の印が「借りられる」になるか）を返す。
 * 貸出中でなく（棚にあり）、持ち出し禁止でもない本だけが借りられる。
 */
export const isBorrowable = (book: Filterable): boolean =>
  book.status === 'available' && book.is_restricted !== 1;

/**
 * 条件に合う本だけを、もとの順のまま返す。
 * 置き場所は選んだどれかと全く同じ文字なら合う（「または」）。状態は「借りられる」を選ぶと、借りられる本だけが合う。
 * 置き場所と状態の両方を選んだときは、両方に合う本だけを残す（「かつ」）。
 */
export function filterByConditions<T extends Filterable>(
  books: readonly T[],
  conditions: BookFilterConditions,
): T[] {
  const { locations, status } = conditions;
  return books.filter(
    (book) =>
      (locations.length === 0 || locations.includes(book.location)) &&
      (status === null || isBorrowable(book)),
  );
}

// 選んでいる条件の数（絞り込みのボタンに出す）。状態は「すべて」以外を選んでいれば1つと数える
export const countConditions = (conditions: BookFilterConditions) =>
  conditions.locations.length + (conditions.status === null ? 0 : 1);

// 名前の順（文字コードの順）
const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * 本の一覧にある置き場所を、重複なしで名前の順（文字コードの順）に返す（絞り込みの選択肢に使う）。
 * 本の一覧（GET /api/books）は DB の全ての本なので、DB にある全ての置き場所になる。
 */
export function collectLocations(books: readonly Pick<Filterable, 'location'>[]): string[] {
  return [...new Set(books.map((book) => book.location))].sort(byCodePoint);
}
