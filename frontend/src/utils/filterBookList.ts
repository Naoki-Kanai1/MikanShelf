// 本一覧に出す本を決める。検索の文字（filterBooks.ts）と、置き場所・状態の条件（filterByConditions.ts）を組み合わせる。
import { filterBooks } from './filterBooks';
import {
  filterByConditions,
  type BookFilterConditions,
  type Filterable,
} from './filterByConditions';
import type { Groupable } from './groupBooks';

type Listable = Groupable & Filterable;

/**
 * 条件（置き場所・状態）と検索の文字の両方に合う本だけを、もとの順のまま返す。
 * 同じ本・同じ置き場所の冊でも、条件に合わない状態の冊は残さない。条件も文字も空のときは、全ての本を返す。
 */
export function filterBookList<T extends Listable>(
  books: readonly T[],
  keyword: string,
  conditions: BookFilterConditions,
): T[] {
  return filterBooks(filterByConditions(books, conditions), keyword);
}
