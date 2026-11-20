// @vitest-environment jsdom
// 本一覧画面で、ほかの画面へ移動して戻ってきても状態が残ることの単体テスト。
// テストケースの一覧は tests/bookListState/cases.md
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookListStateProvider } from '../state/BookListStateProvider';
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

function makeBook(overrides: Partial<Book> & Pick<Book, 'id'>): Book {
  return {
    title: `本${overrides.id}`,
    authors: `著者${overrides.id}`,
    location: '横浜13F',
    is_restricted: 0,
    status: 'available',
    borrower_name: null,
    borrowed_at: null,
    created_at: '2026-11-01 00:00:00',
    ...overrides,
  };
}

const BOOKS = [
  makeBook({ id: 1, title: 'リーダブルコード', authors: 'Dustin Boswell' }),
  makeBook({ id: 2, title: '達人プログラマー', authors: 'David Thomas', location: '横浜13F' }),
  makeBook({ id: 3, title: '達人プログラマー', authors: 'David Thomas', location: '虎ノ門20F' }),
  makeBook({ id: 4, title: 'テスト駆動開発', authors: 'Kent Beck' }),
];

// fetch の作り物。呼ばれるたびに、responses の順に応答する（足りなくなったら最後のものを使う）
function mockFetch(...responses: (() => Promise<Response>)[]) {
  let count = 0;
  const fetchMock = vi.fn(() => responses[Math.min(count++, responses.length - 1)]());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const respond = () => Promise.resolve(Response.json(BOOKS));

// 応答を返す時を、テストの中で決められる fetch の応答
function deferredResponse() {
  let resolve!: () => void;
  const promise = new Promise<Response>((r) => {
    resolve = () => r(Response.json(BOOKS));
  });
  return { respond: () => promise, resolve };
}

// jsdom には画面のスクロールが無いので、スクロール位置と scrollTo を作り物にする
let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
  vi.stubGlobal('scrollY', 0);
});
// 画面をスクロールしたことにする
function scrollWindow(y: number) {
  vi.stubGlobal('scrollY', y);
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// メニューの代わりのリンクと、本一覧・本詳細・貸出一覧の画面（本詳細・貸出一覧は代わりの画面）を置く
function AppForTest() {
  return (
    <MemoryRouter initialEntries={['/books']}>
      <nav>
        <Link to="/loans">メニュー：借りている本</Link>
        <Link to="/books">メニュー：本一覧</Link>
      </nav>
      <Routes>
        <Route path="/books" element={<BookListPage />} />
        <Route
          path="/books/:bookId"
          element={
            <>
              <p>本詳細画面（テスト用）</p>
              <Link to="/books">戻る</Link>
            </>
          }
        />
        <Route path="/loans" element={<p>貸出一覧画面（テスト用）</p>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderApp() {
  return render(
    <BookListStateProvider>
      <AppForTest />
    </BookListStateProvider>,
  );
}

const getSearchBox = () =>
  screen.getByRole('searchbox', { name: '題名・著者で絞り込む' }) as HTMLInputElement;
const findGroupRow = (title: string) => screen.findByRole('button', { name: new RegExp(title) });
const rowTitles = () =>
  [...document.querySelectorAll('.book-list > li .book-row__title')].map((el) => el.textContent);

// 本詳細画面へ移動し、戻るリンクで本一覧画面へ戻る
async function goToDetailAndBack(rowName: RegExp) {
  await userEvent.click(await screen.findByRole('link', { name: rowName }));
  await screen.findByText('本詳細画面（テスト用）');
  await userEvent.click(screen.getByRole('link', { name: '戻る' }));
}

describe('BookListPage の状態の保持', () => {
  it('KS-11: 検索してから本詳細画面へ移動して戻ると、検索の文字と絞り込んだ結果が残る', async () => {
    mockFetch(respond);
    renderApp();
    await findGroupRow('達人プログラマー');
    await userEvent.type(getSearchBox(), 'リーダブル');
    expect(rowTitles()).toEqual(['リーダブルコード']);

    await goToDetailAndBack(/リーダブルコード/);

    await screen.findByRole('link', { name: /リーダブルコード/ });
    expect(getSearchBox().value).toBe('リーダブル');
    expect(rowTitles()).toEqual(['リーダブルコード']);
  });

  it('KS-12: まとまりを開いてから本詳細画面へ移動して戻ると、開いたままになっている', async () => {
    mockFetch(respond);
    renderApp();
    await userEvent.click(await findGroupRow('達人プログラマー'));
    expect((await findGroupRow('達人プログラマー')).getAttribute('aria-expanded')).toBe('true');

    await goToDetailAndBack(/置き場所：虎ノ門20F/);

    const group = await findGroupRow('達人プログラマー');
    expect(group.getAttribute('aria-expanded')).toBe('true');
    // 開いた行（置き場所ごとの行）が、離れる前と同じく出ている
    const copies = screen.getByRole('list', { name: '達人プログラマーの2冊' });
    expect(
      within(copies)
        .getAllByRole('link')
        .map((row) => row.textContent),
    ).toEqual([
      expect.stringMatching(/^置き場所：横浜13F/),
      expect.stringMatching(/^置き場所：虎ノ門20F/),
    ]);
  });

  it('KS-13: 貸出一覧画面を通ってメニューから戻っても、文字と開いたまとまりが残る', async () => {
    mockFetch(respond);
    renderApp();
    await findGroupRow('達人プログラマー');
    await userEvent.type(getSearchBox(), '達人');
    await userEvent.click(await findGroupRow('達人プログラマー'));

    await userEvent.click(screen.getByRole('link', { name: 'メニュー：借りている本' }));
    await screen.findByText('貸出一覧画面（テスト用）');
    await userEvent.click(screen.getByRole('link', { name: 'メニュー：本一覧' }));

    const group = await findGroupRow('達人プログラマー');
    expect(getSearchBox().value).toBe('達人');
    expect(group.getAttribute('aria-expanded')).toBe('true');
    expect(rowTitles()).toEqual(['達人プログラマー']);
  });

  it('KS-14: スクロールしてから本詳細画面へ移動して戻ると、読み込み後に同じ位置へ戻す', async () => {
    mockFetch(respond);
    renderApp();
    await findGroupRow('達人プログラマー');
    scrollWindow(640);

    await userEvent.click(screen.getByRole('link', { name: /テスト駆動開発/ }));
    await screen.findByText('本詳細画面（テスト用）');
    // 本詳細画面では、本一覧のスクロール位置を覚えない
    scrollWindow(0);
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole('link', { name: '戻る' }));

    await findGroupRow('達人プログラマー');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 640);
  });

  it('KS-15: 戻ったあと一覧を読み込んでいるあいだは、スクロール位置を戻さない', async () => {
    const second = deferredResponse();
    mockFetch(respond, second.respond);
    renderApp();
    await findGroupRow('達人プログラマー');
    scrollWindow(300);

    await goToDetailAndBack(/テスト駆動開発/);
    scrollTo.mockClear();

    expect(await screen.findByText('読み込み中…')).toBeTruthy();
    expect(scrollTo).not.toHaveBeenCalled();

    await act(async () => second.resolve());
    await findGroupRow('達人プログラマー');
    expect(scrollTo).toHaveBeenCalledWith(0, 300);
  });

  it('KS-16: 読み込み中にスクロール位置が詰められても、覚えた位置へ戻す', async () => {
    const second = deferredResponse();
    mockFetch(respond, second.respond);
    renderApp();
    await findGroupRow('達人プログラマー');
    scrollWindow(500);

    await goToDetailAndBack(/テスト駆動開発/);
    await screen.findByText('読み込み中…');
    // 読み込み中は画面が短いので、ブラウザがスクロール位置を 0 に詰めたことにする
    scrollWindow(0);
    scrollTo.mockClear();

    await act(async () => second.resolve());
    await findGroupRow('達人プログラマー');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 500);
  });

  it('KS-17: Provider を作り直すと（読み込み直したとき）、初めの状態に戻る', async () => {
    mockFetch(respond);
    const { unmount } = renderApp();
    await findGroupRow('達人プログラマー');
    await userEvent.type(getSearchBox(), '達人');
    await userEvent.click(await findGroupRow('達人プログラマー'));
    scrollWindow(200);
    unmount();
    scrollTo.mockClear();

    renderApp();
    const group = await findGroupRow('達人プログラマー');
    expect(getSearchBox().value).toBe('');
    expect(group.getAttribute('aria-expanded')).toBe('false');
    expect(rowTitles()).toEqual(['リーダブルコード', '達人プログラマー', 'テスト駆動開発']);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0));
  });
});
