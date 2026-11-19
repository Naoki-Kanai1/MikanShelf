// 本一覧の絞り込み。題名・著者のどちらかに、入力した文字が含まれる本を残す（部分一致）。

// 著者が複数のときの区切り（DB の authors は「、」区切りの1行）
const AUTHOR_SEPARATOR = '、';

/**
 * 比べる前に文字の形をそろえる。
 * - 全角・半角の英数字や記号、半角カナを同じものとして扱う（NFKC）
 * - 英字の大文字・小文字を区別しない
 * - 空白（半角・全角とも）を全て取り除く。「Dustin Boswell」を「DustinBoswell」でも見つけられるようにする
 */
export const normalizeForSearch = (text: string) =>
  text.normalize('NFKC').toLowerCase().replace(/\s/g, '');

// 題名と著者を持つものなら何でも絞り込める（本一覧の Book など）
type Searchable = { title: string; authors: string };

// 本が `target`（形をそろえた入力）に合うか
function matches(book: Searchable, target: string): boolean {
  if (normalizeForSearch(book.title).includes(target)) return true;
  // 著者は1人ずつ比べる。区切りの「、」は探す対象に含めない
  // （「、」で探しても合わず、2人の名前をまたいだ文字でも合わない）
  return book.authors
    .normalize('NFKC')
    .split(AUTHOR_SEPARATOR)
    .some((author) => normalizeForSearch(author).includes(target));
}

/**
 * 題名か著者に `keyword` を含む本だけを、もとの順のまま返す。
 * 空白は入力・本の側とも無視する。`keyword` が空（空白だけを含む）のときは全ての本を返す。
 */
export function filterBooks<T extends Searchable>(books: readonly T[], keyword: string): T[] {
  const target = normalizeForSearch(keyword);
  if (target === '') return [...books];
  return books.filter((book) => matches(book, target));
}
