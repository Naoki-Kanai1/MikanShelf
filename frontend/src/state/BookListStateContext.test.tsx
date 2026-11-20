// @vitest-environment jsdom
// 本一覧画面の状態を使う hook の単体テスト。テストケースの一覧は tests/bookListState/cases.md
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBookListState } from './BookListStateContext';
import { BookListStateProvider } from './BookListStateProvider';
import { initialBookListState } from './bookListState';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useBookListState', () => {
  it('KS-09: BookListStateProvider の外で呼ぶと Error を投げる', () => {
    // React が投げられた Error をコンソールに出すので、テストの出力を汚さないよう黙らせる
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useBookListState())).toThrow(
      'useBookListState は BookListStateProvider の中で使ってください',
    );
  });

  it('KS-10: BookListStateProvider の中で呼ぶと、初めの状態を返す', () => {
    const { result } = renderHook(() => useBookListState(), {
      wrapper: BookListStateProvider,
    });
    expect(result.current.state).toEqual(initialBookListState);
    expect(result.current.scrollYRef.current).toBe(0);
    expect(typeof result.current.dispatch).toBe('function');
  });
});
