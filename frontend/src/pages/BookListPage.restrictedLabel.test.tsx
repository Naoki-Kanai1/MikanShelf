// @vitest-environment jsdom
// 本一覧画面の「持ち出し禁止」の位置の単体テスト。テストケースの一覧は tests/bookListRestrictedLabel/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookListPage from './BookListPage';

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
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(books)),
  );
  return render(
    <MemoryRouter>
      <BookListPage />
    </MemoryRouter>,
  );
}

// 題名から行（リンク）を探し、右側の箱（状態の印と持ち出し禁止を入れる箱）も返す
async function findRowParts(title: string) {
  const row = await screen.findByRole('link', { name: new RegExp(title) });
  const badges = row.querySelector('.book-row__badges');
  if (!badges) throw new Error('右側の箱（.book-row__badges）がありません');
  return { row, badges };
}

// 箱の中の、直下の要素の文字を順に並べる
const childTexts = (el: Element) => Array.from(el.children).map((c) => c.textContent?.trim());

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BookListPage（持ち出し禁止の位置）', () => {
  it('RL-01: 持ち出し禁止の本（棚にある）では、右側の箱に「棚にある」「持ち出し禁止」の順で並ぶ', async () => {
    renderWith([makeBook({ id: 1, title: '禁止の本', is_restricted: 1, status: 'available' })]);
    const { badges } = await findRowParts('禁止の本');
    expect(childTexts(badges)).toEqual(['棚にある', '持ち出し禁止']);
  });

  it('RL-02: 持ち出し禁止の本（貸出中）では、右側の箱に「貸出中」「持ち出し禁止」の順で並ぶ', async () => {
    renderWith([
      makeBook({ id: 2, title: '貸出中の禁止の本', is_restricted: 1, status: 'borrowed' }),
    ]);
    const { badges } = await findRowParts('貸出中の禁止の本');
    expect(childTexts(badges)).toEqual(['貸出中', '持ち出し禁止']);
  });

  it('RL-03: 「持ち出し禁止」は題名・著者と同じ並び（右側の箱の外）には置かれない', async () => {
    renderWith([makeBook({ id: 3, title: '禁止の本', is_restricted: 1 })]);
    const { row, badges } = await findRowParts('禁止の本');
    const restricted = row.querySelector('.book-row__restricted');
    expect(restricted?.parentElement).toBe(badges);
    // 行の直下にあるのは、題名・著者・右側の箱の3つだけ
    expect(Array.from(row.children).map((c) => c.className)).toEqual([
      'book-row__title',
      'book-row__authors',
      'book-row__badges',
    ]);
  });

  it('RL-04: 持ち出し禁止でない本では、右側の箱に状態の印だけがあり、「持ち出し禁止」は無い', async () => {
    renderWith([makeBook({ id: 4, title: 'ふつうの本', is_restricted: 0 })]);
    const { row, badges } = await findRowParts('ふつうの本');
    expect(childTexts(badges)).toEqual(['棚にある']);
    expect(row.textContent).not.toContain('持ち出し禁止');
  });
});
