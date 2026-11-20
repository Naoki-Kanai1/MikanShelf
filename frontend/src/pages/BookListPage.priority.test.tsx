// @vitest-environment jsdom
// 本一覧画面で、置き場所の行から開く本を状態の順で選ぶことの単体テスト。テストケースの一覧は tests/borrowablePriority/cases.md
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

// テスト用の本。同じ題名・著者・置き場所で、必要な項目だけ上書きして使う
function makeBook(overrides: Partial<Book> & Pick<Book, 'id'>): Book {
  return {
    title: 'ドメイン駆動設計',
    authors: 'Eric Evans',
    location: '虎ノ門 20F',
    is_restricted: 0,
    status: 'available',
    borrower_name: null,
    borrowed_at: null,
    created_at: '2026-11-01 00:00:00',
    ...overrides,
  };
}

// fetch を作り物に差し替えて本一覧画面を開き、まとまりを開いて置き場所の行のリンクを返す
async function openLocationRow(books: Book[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(books)),
  );
  render(
    <MemoryRouter>
      <BookListPage />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: /ドメイン駆動設計/ }));
  return screen.getByRole('link', { name: /置き場所：虎ノ門 20F/ });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// 行の中の状態の印の文字を並べる
const chipTexts = (row: HTMLElement) =>
  Array.from(row.querySelectorAll('.status-chip')).map((c) => c.textContent);

const borrowed = {
  status: 'borrowed' as const,
  borrower_name: '山田',
  borrowed_at: '2026-11-10 00:00:00',
};

describe('BookListPage（置き場所の行から開く本）', () => {
  it('BP-09: 持ち出し禁止の本が先でも、棚にある（借りられる）本の詳細へ移動する', async () => {
    const link = await openLocationRow([
      makeBook({ id: 1, is_restricted: 1 }),
      makeBook({ id: 2 }),
    ]);
    expect(link.getAttribute('href')).toBe('/books/2');
  });

  it('BP-10: 貸出中の本と持ち出し禁止の本だけのときは、持ち出し禁止の本の詳細へ移動する', async () => {
    const link = await openLocationRow([
      makeBook({
        id: 1,
        status: 'borrowed',
        borrower_name: '山田',
        borrowed_at: '2026-11-10 00:00:00',
      }),
      makeBook({ id: 2, is_restricted: 1 }),
    ]);
    expect(link.getAttribute('href')).toBe('/books/2');
  });
});

describe('BookListPage（状態の印）', () => {
  it('BP-11: 持ち出し禁止の本と貸出中の本だけの置き場所は「持ち出し禁止」', async () => {
    const link = await openLocationRow([
      makeBook({ id: 1, is_restricted: 1 }),
      makeBook({ id: 2, ...borrowed }),
    ]);
    expect(chipTexts(link)).toEqual(['持ち出し禁止']);
  });

  it('BP-12: 持ち出し禁止の本と棚にある本がある置き場所は「棚にある」', async () => {
    const link = await openLocationRow([
      makeBook({ id: 1, is_restricted: 1 }),
      makeBook({ id: 2 }),
    ]);
    expect(chipTexts(link)).toEqual(['棚にある']);
  });

  it('BP-13: 持ち出し禁止の本と貸出中の本だけのまとまりの行は「持ち出し禁止」', async () => {
    await openLocationRow([
      makeBook({ id: 1, ...borrowed }),
      makeBook({ id: 2, is_restricted: 1 }),
    ]);
    const group = screen.getByRole('button', { name: /ドメイン駆動設計/ });
    expect(chipTexts(group)).toEqual(['持ち出し禁止']);
  });

  it('BP-14: 全て貸出中のときだけ「誰かが借用中」', async () => {
    const link = await openLocationRow([
      makeBook({ id: 1, ...borrowed }),
      makeBook({ id: 2, ...borrowed }),
    ]);
    const group = screen.getByRole('button', { name: /ドメイン駆動設計/ });
    expect(chipTexts(group)).toEqual(['誰かが借用中']);
    expect(chipTexts(link)).toEqual(['誰かが借用中']);
  });

  it('BP-15: 貸出中の本と棚にある本がある置き場所は「棚にある」', async () => {
    const link = await openLocationRow([makeBook({ id: 1, ...borrowed }), makeBook({ id: 2 })]);
    expect(chipTexts(link)).toEqual(['棚にある']);
  });
});
