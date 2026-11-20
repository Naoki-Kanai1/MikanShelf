// @vitest-environment jsdom
// 本一覧画面の「持ち出し禁止」の印の単体テスト。テストケースの一覧は tests/bookListRestrictedLabel/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookListPage from './BookListPage';
import { BookListStateProvider } from '../state/BookListStateProvider';

type Book = {
  id: number;
  title: string;
  authors: string;
  location: string;
  is_restricted: 0 | 1;
  status: 'available' | 'borrowed';
  borrower_name: string | null;
  borrowed_at: string | null;
  created_at: string;
};

// テスト用の本。必要な項目だけ上書きして使う
function makeBook(overrides: Partial<Book> & Pick<Book, 'id'>): Book {
  return {
    title: `本${overrides.id}`,
    authors: `著者${overrides.id}`,
    location: '3階 書架A',
    is_restricted: 0,
    status: 'available',
    borrower_name: null,
    borrowed_at: null,
    created_at: '2026-11-01 00:00:00',
    ...overrides,
  };
}

// fetch を作り物に差し替えて、本一覧画面を開く（本物のサーバーには通信しない）
function renderWith(books: Book[]) {
  // jsdom には画面のスクロールが無いので、本一覧画面がスクロール位置を戻す処理は作り物にする
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(books)),
  );
  return render(
    <BookListStateProvider>
      <MemoryRouter>
        <BookListPage />
      </MemoryRouter>
    </BookListStateProvider>,
  );
}

// 題名から行（リンク）を探し、その行の状態の印をすべて返す
async function findChips(title: string) {
  const row = await screen.findByRole('link', { name: new RegExp(title) });
  return { row, chips: Array.from(row.querySelectorAll('.status-chip')) };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BookListPage（持ち出し禁止の印）', () => {
  it('RL-05: 持ち出し禁止の本の行では、状態の印は1つだけで「持ち出し禁止」になり、「借りられる」は無い', async () => {
    renderWith([makeBook({ id: 1, title: '禁止の本', is_restricted: 1, status: 'available' })]);
    const { row, chips } = await findChips('禁止の本');
    expect(chips.map((c) => c.textContent)).toEqual(['持ち出し禁止']);
    expect(row.textContent).not.toContain('借りられる');
  });

  it('RL-06: 持ち出し禁止でない本の行では「借りられる」「誰かが借用中」を出し、「持ち出し禁止」は無い', async () => {
    renderWith([
      makeBook({ id: 2, title: '棚の本', status: 'available' }),
      makeBook({ id: 3, title: '貸出中の本', status: 'borrowed' }),
    ]);
    const shelf = await findChips('棚の本');
    const lent = await findChips('貸出中の本');
    expect(shelf.chips.map((c) => c.textContent)).toEqual(['借りられる']);
    expect(lent.chips.map((c) => c.textContent)).toEqual(['誰かが借用中']);
    expect(shelf.row.textContent).not.toContain('持ち出し禁止');
    expect(lent.row.textContent).not.toContain('持ち出し禁止');
  });
});
