// 本一覧画面の状態の変え方の単体テスト。テストケースの一覧は tests/bookListState/cases.md
import { describe, expect, it } from 'vitest';
import { bookListReducer, initialBookListState, type BookListState } from './bookListState';

const withState = (overrides: Partial<BookListState>): BookListState => ({
  ...initialBookListState,
  ...overrides,
});

describe('bookListReducer', () => {
  it('KS-01: setKeyword で検索の文字が変わり、開いたまとまりは空のまま', () => {
    const next = bookListReducer(initialBookListState, {
      type: 'setKeyword',
      keyword: 'リーダブル',
    });
    expect(next).toEqual({ keyword: 'リーダブル', expandedKeys: [] });
  });

  it('KS-02: setKeyword に空の文字を渡すと、検索の文字が空になる', () => {
    const next = bookListReducer(withState({ keyword: 'リーダブル' }), {
      type: 'setKeyword',
      keyword: '',
    });
    expect(next.keyword).toBe('');
  });

  it('KS-03: toggleExpanded で閉じているまとまりを開く', () => {
    const next = bookListReducer(initialBookListState, { type: 'toggleExpanded', key: 'a' });
    expect(next.expandedKeys).toEqual(['a']);
  });

  it('KS-04: 開いているまとまりに toggleExpanded すると閉じる（2回で元に戻る）', () => {
    const opened = bookListReducer(initialBookListState, { type: 'toggleExpanded', key: 'a' });
    const closed = bookListReducer(opened, { type: 'toggleExpanded', key: 'a' });
    expect(closed.expandedKeys).toEqual([]);
  });

  it('KS-05: 別のまとまりを開くと、両方開いた状態になる', () => {
    const next = bookListReducer(withState({ expandedKeys: ['a'] }), {
      type: 'toggleExpanded',
      key: 'b',
    });
    expect(next.expandedKeys).toEqual(['a', 'b']);
  });

  it('KS-06: 検索の文字を変えても、開いているまとまりは閉じない', () => {
    const next = bookListReducer(withState({ expandedKeys: ['a'] }), {
      type: 'setKeyword',
      keyword: 'コード',
    });
    expect(next.expandedKeys).toEqual(['a']);
  });

  it('KS-07: reset で初めの状態に戻る', () => {
    const next = bookListReducer(withState({ keyword: 'コード', expandedKeys: ['a', 'b'] }), {
      type: 'reset',
    });
    expect(next).toEqual({ keyword: '', expandedKeys: [] });
  });

  it('KS-08: もとの状態を書き換えず、新しい状態を返す', () => {
    const state = withState({ keyword: 'コード', expandedKeys: ['a'] });
    const snapshot = structuredClone(state);
    const results = [
      bookListReducer(state, { type: 'setKeyword', keyword: '本' }),
      bookListReducer(state, { type: 'toggleExpanded', key: 'a' }),
      bookListReducer(state, { type: 'toggleExpanded', key: 'b' }),
      bookListReducer(state, { type: 'reset' }),
    ];
    expect(state).toEqual(snapshot);
    for (const result of results) expect(result).not.toBe(state);
    expect(results[1].expandedKeys).not.toBe(state.expandedKeys);
    expect(results[2].expandedKeys).not.toBe(state.expandedKeys);
  });
});
