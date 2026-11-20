import { useReducer, useRef, type ReactNode } from 'react';
import { BookListStateContext } from './BookListStateContext';
import { bookListReducer, initialBookListState } from './bookListState';

// 本一覧画面の状態を持つ。ルートより上（App.tsx）に置くので、本一覧画面を離れても状態が残る。
// ブラウザで読み込み直したときは、初めの状態に戻る
export function BookListStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookListReducer, initialBookListState);
  const scrollYRef = useRef(0);
  return (
    <BookListStateContext value={{ state, dispatch, scrollYRef }}>{children}</BookListStateContext>
  );
}
