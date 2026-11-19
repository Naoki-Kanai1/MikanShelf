// @vitest-environment jsdom
// 本一覧画面の単体テスト。テストケースの一覧は tests/bookList/cases.md
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
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

// fetch を作り物に差し替える（本物のサーバーには通信しない）
function mockFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const respondWith = (books: Book[]) => mockFetch(async () => Response.json(books));

// 本一覧画面を開く。行を押したときの移動先として、本詳細画面の代わりの目印を置く
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/books']}>
      <Routes>
        <Route path="/books" element={<BookListPage />} />
        <Route path="/books/:bookId" element={<p>本詳細画面（テスト用）</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

// 一覧の行（リンク）を、題名から探す
const findRow = (title: string) => screen.findByRole('link', { name: new RegExp(title) });

const ERROR_MESSAGE = '本の一覧を読み込めませんでした。時間をおいて、もう一度開いてください。';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BookListPage', () => {
  it('BL-01: 画面を開くと、GET /api/books を1回だけ呼ぶ', async () => {
    const fetchMock = respondWith([makeBook({ id: 1 })]);
    renderPage();
    await findRow('本1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/books');
  });

  it('BL-02: 応答が返ってくるまでは「読み込み中…」と画面の名前を表示し、一覧は表示しない', () => {
    // いつまでも応答が返ってこない
    mockFetch(() => new Promise<Response>(() => {}));
    renderPage();
    expect(screen.getByText('読み込み中…')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '本' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('BL-03: 本の題名と著者を、API が返した順に表示する', async () => {
    respondWith([
      makeBook({ id: 1, title: 'リーダブルコード', authors: 'Dustin Boswell' }),
      makeBook({ id: 2, title: '達人プログラマー', authors: 'David Thomas' }),
      makeBook({ id: 3, title: 'テスト駆動開発', authors: 'Kent Beck' }),
    ]);
    renderPage();
    await findRow('リーダブルコード');
    const rows = screen.getAllByRole('link');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^リーダブルコードDustin Boswell/),
      expect.stringMatching(/^達人プログラマーDavid Thomas/),
      expect.stringMatching(/^テスト駆動開発Kent Beck/),
    ]);
  });

  it('BL-04: 各行のリンク先は、その本の本詳細画面（/books/:id）', async () => {
    respondWith([makeBook({ id: 1 }), makeBook({ id: 7 })]);
    renderPage();
    expect((await findRow('本1')).getAttribute('href')).toBe('/books/1');
    expect((await findRow('本7')).getAttribute('href')).toBe('/books/7');
  });

  it('BL-05: 本の行を押すと、本詳細画面へ移動する', async () => {
    respondWith([makeBook({ id: 7, title: 'ドメイン駆動設計' })]);
    renderPage();
    await userEvent.click(await findRow('ドメイン駆動設計'));
    expect(await screen.findByText('本詳細画面（テスト用）')).toBeTruthy();
  });

  it('BL-06: 状態が available の本は「棚にある」、borrowed の本は「貸出中」を表示する', async () => {
    respondWith([
      makeBook({ id: 1, title: '棚の本', status: 'available' }),
      makeBook({ id: 2, title: '貸出中の本', status: 'borrowed' }),
    ]);
    renderPage();
    const available = await findRow('棚の本');
    const borrowed = await findRow('貸出中の本');
    expect(within(available).getByText('棚にある')).toBeTruthy();
    expect(within(available).queryByText('貸出中')).toBeNull();
    expect(within(borrowed).getByText('貸出中')).toBeTruthy();
    expect(within(borrowed).queryByText('棚にある')).toBeNull();
  });

  it('BL-07: 持ち出し禁止（is_restricted が 1）の本にだけ「持ち出し禁止」を表示する', async () => {
    respondWith([
      makeBook({ id: 1, title: '禁止の本', is_restricted: 1 }),
      makeBook({ id: 2, title: 'ふつうの本', is_restricted: 0 }),
    ]);
    renderPage();
    expect(within(await findRow('禁止の本')).getByText('持ち出し禁止')).toBeTruthy();
    expect(within(await findRow('ふつうの本')).queryByText('持ち出し禁止')).toBeNull();
  });

  it('BL-08: 本が0冊のときは、案内の文と画面の名前を表示し、一覧は表示しない', async () => {
    respondWith([]);
    renderPage();
    expect(await screen.findByText('登録されている本はまだありません。')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '本' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('BL-09: API がエラー（HTTP 500）を返したときは、エラーの文と画面の名前を表示する', async () => {
    mockFetch(async () => new Response('error', { status: 500 }));
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toBe(ERROR_MESSAGE);
    expect(screen.getByRole('heading', { name: '本' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('BL-10: 通信に失敗したときも、エラーの文を表示する', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toBe(ERROR_MESSAGE);
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('BL-11: 題名と著者がとても長くても、省略せずに表示する', async () => {
    const title = 'あ'.repeat(200);
    const authors = ['Eric Evans', '今関剛（監訳）', '和智右桂', '牧野祐子（翻訳）'].join('、');
    respondWith([makeBook({ id: 1, title, authors })]);
    renderPage();
    expect(await screen.findByText(title)).toBeTruthy();
    expect(screen.getByText(authors)).toBeTruthy();
  });
});
