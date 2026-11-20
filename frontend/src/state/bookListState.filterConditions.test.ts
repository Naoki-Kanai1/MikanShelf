// 本一覧画面の状態のうち、場所・ステータスの絞り込みの条件の変え方の単体テスト。
// テストケースの一覧は tests/filterByConditions/cases.md
import { describe, expect, it } from 'vitest';
import {
  bookListReducer,
  initialBookListState,
  type BookListAction,
  type BookListState,
} from './bookListState';

const withState = (overrides: Partial<BookListState>): BookListState => ({
  ...initialBookListState,
  ...overrides,
});

describe('bookListReducer（絞り込みの条件）', () => {
  it('FC-17: toggleLocation で選んでいない置き場所を、選んだ順に足す', () => {
    const a = bookListReducer(initialBookListState, { type: 'toggleLocation', location: 'A' });
    const ab = bookListReducer(a, { type: 'toggleLocation', location: 'B' });
    expect(a.locations).toEqual(['A']);
    expect(ab.locations).toEqual(['A', 'B']);
  });

  it('FC-18: 選んでいる置き場所に toggleLocation すると外れる', () => {
    const next = bookListReducer(withState({ locations: ['A'] }), {
      type: 'toggleLocation',
      location: 'A',
    });
    expect(next.locations).toEqual([]);
  });

  it('FC-68: 初めの状態は「すべて」で、setStatus で状態を1つ選ぶ', () => {
    expect(initialBookListState.status).toBeNull();
    const next = bookListReducer(initialBookListState, { type: 'setStatus', status: 'available' });
    expect(next.status).toBe('available');
  });

  it('FC-70: setStatus に null（「すべて」）を渡すと、状態で絞り込まなくなる', () => {
    const next = bookListReducer(withState({ status: 'available' }), {
      type: 'setStatus',
      status: null,
    });
    expect(next.status).toBeNull();
  });

  it('FC-21: clearConditions で置き場所を外して状態を「すべて」に戻し、文字と開いたまとまりは残す', () => {
    const next = bookListReducer(
      withState({
        keyword: 'コード',
        expandedKeys: ['a'],
        locations: ['A', 'B'],
        status: 'available',
      }),
      { type: 'clearConditions' },
    );
    expect(next).toEqual({ keyword: 'コード', expandedKeys: ['a'], locations: [], status: null });
  });

  it('FC-22: 条件を変えても文字・開いたまとまりは変えず、もとの状態を書き換えない', () => {
    const state = withState({
      keyword: 'コード',
      expandedKeys: ['a'],
      locations: ['A'],
      status: 'available',
    });
    const snapshot = structuredClone(state);
    const actions: BookListAction[] = [
      { type: 'toggleLocation', location: 'A' },
      { type: 'toggleLocation', location: 'B' },
      { type: 'setStatus', status: 'available' },
      { type: 'setStatus', status: null },
      { type: 'clearConditions' },
    ];
    for (const action of actions) {
      const next = bookListReducer(state, action);
      expect(next).not.toBe(state);
      expect(next.keyword).toBe('コード');
      expect(next.expandedKeys).toEqual(['a']);
    }
    expect(state).toEqual(snapshot);
  });
});
