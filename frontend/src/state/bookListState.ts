// 本一覧画面で、画面を離れても残しておく状態と、その変え方。
// 状態そのものは BookListStateProvider.tsx の Provider が持つ（アプリ内を移動しているあいだだけ残る）。
//
// 絞り込みの条件（置き場所・貸出の状態など）を足すときは、
// 1. BookListState にフィールドを足し、initialBookListState に初めの値を書く
// 2. BookListAction にアクションを足し、bookListReducer で扱う
// 3. BookListPage で、state の値を使って絞り込み、dispatch で変える
// だけで、画面を移動しても条件が残る。

export type BookListState = {
  // 検索ボックスに入っている文字
  keyword: string;
  // 開いているまとまり（groupBooks の BookGroup.key）
  expandedKeys: readonly string[];
};

export const initialBookListState: BookListState = {
  keyword: '',
  expandedKeys: [],
};

export type BookListAction =
  // 検索ボックスの文字を変える
  | { type: 'setKeyword'; keyword: string }
  // まとまりを開く・閉じる（開いていれば閉じ、閉じていれば開く）
  | { type: 'toggleExpanded'; key: string }
  // 初めの状態に戻す
  | { type: 'reset' };

/**
 * 本一覧画面の状態を、アクションに合わせて変えた新しい状態を返す。もとの状態は書き換えない。
 * 検索の文字を変えても、開いているまとまりは閉じない。
 */
export function bookListReducer(state: BookListState, action: BookListAction): BookListState {
  switch (action.type) {
    case 'setKeyword':
      return { ...state, keyword: action.keyword };
    case 'toggleExpanded':
      return {
        ...state,
        expandedKeys: state.expandedKeys.includes(action.key)
          ? state.expandedKeys.filter((key) => key !== action.key)
          : [...state.expandedKeys, action.key],
      };
    case 'reset':
      return initialBookListState;
  }
}
