// 本一覧画面で、画面を離れても残しておく状態と、その変え方。
// 状態そのものは BookListStateProvider.tsx の Provider が持つ（アプリ内を移動しているあいだだけ残る）。
//
// 絞り込みの条件を足すときは、
// 1. BookListState にフィールドを足し、initialBookListState に初めの値を書く
// 2. BookListAction にアクションを足し、bookListReducer で扱う
// 3. BookListPage で、state の値を使って絞り込み、dispatch で変える
// だけで、画面を移動しても条件が残る。

import type { BookFilterStatus } from '../utils/filterByConditions';

export type BookListState = {
  // 検索ボックスに入っている文字
  keyword: string;
  // 開いているまとまり（groupBooks の BookGroup.key）
  expandedKeys: readonly string[];
  // 絞り込みで選んでいる置き場所（選んだ順）。空のときは置き場所で絞り込まない
  locations: readonly string[];
  // 絞り込みで選んでいる状態（1つだけ）。null（「すべて」）のときは状態で絞り込まない
  status: BookFilterStatus | null;
};

export const initialBookListState: BookListState = {
  keyword: '',
  expandedKeys: [],
  locations: [],
  status: null,
};

export type BookListAction =
  // 検索ボックスの文字を変える
  | { type: 'setKeyword'; keyword: string }
  // まとまりを開く・閉じる（開いていれば閉じ、閉じていれば開く）
  | { type: 'toggleExpanded'; key: string }
  // 絞り込みの置き場所を選ぶ・外す（選んでいれば外し、選んでいなければ選ぶ）
  | { type: 'toggleLocation'; location: string }
  // 絞り込みの状態を選ぶ。null は「すべて」（状態で絞り込まない）
  | { type: 'setStatus'; status: BookFilterStatus | null }
  // 絞り込みの置き場所を全て外し、状態を「すべて」に戻す（検索の文字と開いたまとまりはそのまま）
  | { type: 'clearConditions' }
  // 初めの状態に戻す
  | { type: 'reset' };

// 配列に value があれば取り除き、無ければ後ろに足した新しい配列を返す
const toggle = <T>(values: readonly T[], value: T): readonly T[] =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value];

/**
 * 本一覧画面の状態を、アクションに合わせて変えた新しい状態を返す。もとの状態は書き換えない。
 * 検索の文字や絞り込みの条件を変えても、開いているまとまりは閉じない。
 */
export function bookListReducer(state: BookListState, action: BookListAction): BookListState {
  switch (action.type) {
    case 'setKeyword':
      return { ...state, keyword: action.keyword };
    case 'toggleExpanded':
      return { ...state, expandedKeys: toggle(state.expandedKeys, action.key) };
    case 'toggleLocation':
      return { ...state, locations: toggle(state.locations, action.location) };
    case 'setStatus':
      return { ...state, status: action.status };
    case 'clearConditions':
      return { ...state, locations: [], status: null };
    case 'reset':
      return initialBookListState;
  }
}
