import { createContext, useContext, type ActionDispatch, type RefObject } from 'react';
import type { BookListAction, BookListState } from './bookListState';

export type BookListStateValue = {
  state: BookListState;
  dispatch: ActionDispatch<[action: BookListAction]>;
  // 本一覧画面を最後に見ていたときの縦のスクロール位置。
  // スクロールのたびに画面を描き直さないよう、state には入れずに ref で持つ
  scrollYRef: RefObject<number>;
};

// 値は BookListStateProvider.tsx の Provider が入れる。Provider の外では null
export const BookListStateContext = createContext<BookListStateValue | null>(null);

// 本一覧画面の状態を使う。BookListStateProvider の中でだけ呼べる
export function useBookListState(): BookListStateValue {
  const value = useContext(BookListStateContext);
  if (value === null) {
    throw new Error('useBookListState は BookListStateProvider の中で使ってください');
  }
  return value;
}
