// @vitest-environment jsdom
// 本一覧画面の単体テスト。テストケースの一覧は tests/bookList/cases.md
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
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

// fetch を作り物に差し替える（本物のサーバーには通信しない）
function mockFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const respondWith = (books: Book[]) => mockFetch(async () => Response.json(books));

// 本一覧画面を開く。行を押したときの移動先として、本詳細画面の代わりの目印を置く
function renderPage() {
  // jsdom には画面のスクロールが無いので、本一覧画面がスクロール位置を戻す処理は作り物にする
  vi.stubGlobal('scrollTo', vi.fn());
  return render(
    <BookListStateProvider>
      <MemoryRouter initialEntries={['/books']}>
        <Routes>
          <Route path="/books" element={<BookListPage />} />
          <Route path="/books/:bookId" element={<p>本詳細画面（テスト用）</p>} />
        </Routes>
      </MemoryRouter>
    </BookListStateProvider>,
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
    expect(screen.getByRole('heading', { name: '本一覧' })).toBeTruthy();
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

  it('BL-06: 状態が available の本は「借りられる」、borrowed の本は「誰かが借用中」を表示する', async () => {
    respondWith([
      makeBook({ id: 1, title: '棚の本', status: 'available' }),
      makeBook({ id: 2, title: '貸出中の本', status: 'borrowed' }),
    ]);
    renderPage();
    const available = await findRow('棚の本');
    const borrowed = await findRow('貸出中の本');
    expect(within(available).getByText('借りられる')).toBeTruthy();
    expect(within(available).queryByText('誰かが借用中')).toBeNull();
    expect(within(borrowed).getByText('誰かが借用中')).toBeTruthy();
    expect(within(borrowed).queryByText('借りられる')).toBeNull();
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
    expect(screen.getByRole('heading', { name: '本一覧' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('BL-09: API がエラー（HTTP 500）を返したときは、エラーの文と画面の名前を表示する', async () => {
    mockFetch(async () => new Response('error', { status: 500 }));
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toBe(ERROR_MESSAGE);
    expect(screen.getByRole('heading', { name: '本一覧' })).toBeTruthy();
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

  it('BL-17: 1冊だけの本は、著者の下に置き場所を出す（どの幅でも）', async () => {
    respondWith([
      makeBook({ id: 1, title: 'SQLアンチパターン', location: '3階 書架D' }),
      makeBook({ id: 2, title: 'イシューからはじめよ', location: '4階 書架B' }),
    ]);
    renderPage();
    const first = await findRow('SQLアンチパターン');
    const second = await findRow('イシューからはじめよ');
    expect(first.querySelector('.book-row__place')?.textContent).toBe('置き場所：3階 書架D');
    expect(second.querySelector('.book-row__place')?.textContent).toBe('置き場所：4階 書架B');
  });
});

// 絞り込みの入力欄のテスト。テストケースの一覧は tests/searchBooks/cases.md
describe('BookListPage の絞り込み', () => {
  const BOOKS = [
    makeBook({ id: 1, title: 'リーダブルコード', authors: 'Dustin Boswell' }),
    makeBook({ id: 2, title: '達人プログラマー', authors: 'David Thomas、Andrew Hunt' }),
    makeBook({ id: 3, title: 'テスト駆動開発', authors: 'Kent Beck' }),
  ];
  const getSearchBox = () => screen.getByRole('searchbox', { name: '題名・著者で絞り込む' });
  const rowTitles = () =>
    screen.getAllByRole('link').map((row) => row.querySelector('.book-row__title')?.textContent);

  it('SB-15: 画面を開くと、空の入力欄と全ての本を表示する', async () => {
    respondWith(BOOKS);
    renderPage();
    await findRow('リーダブルコード');
    expect((getSearchBox() as HTMLInputElement).value).toBe('');
    expect(rowTitles()).toEqual(['リーダブルコード', '達人プログラマー', 'テスト駆動開発']);
  });

  it('SB-16: 題名の一部を入力すると、その文字を含む本だけを表示する', async () => {
    respondWith(BOOKS);
    renderPage();
    await findRow('リーダブルコード');
    await userEvent.type(getSearchBox(), 'プログラ');
    expect(rowTitles()).toEqual(['達人プログラマー']);
  });

  it('SB-17: 著者の一部を入力すると、その文字を含む本だけを表示する', async () => {
    respondWith(BOOKS);
    renderPage();
    await findRow('リーダブルコード');
    await userEvent.type(getSearchBox(), 'beck');
    expect(rowTitles()).toEqual(['テスト駆動開発']);
  });

  it('SB-18: どの本にも合わないときは、案内の文を表示し、一覧は表示しない', async () => {
    respondWith(BOOKS);
    renderPage();
    await findRow('リーダブルコード');
    await userEvent.type(getSearchBox(), '存在しない本');
    expect(screen.getByText('条件に合う本は見つかりませんでした。')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('SB-19: 入力した文字を消すと、全ての本をもとの順で表示し直す', async () => {
    respondWith(BOOKS);
    renderPage();
    await findRow('リーダブルコード');
    await userEvent.type(getSearchBox(), '達人');
    expect(rowTitles()).toEqual(['達人プログラマー']);
    await userEvent.clear(getSearchBox());
    expect(rowTitles()).toEqual(['リーダブルコード', '達人プログラマー', 'テスト駆動開発']);
  });

  it('SB-20: 入力しても、API は画面を開いたときの1回だけしか呼ばない', async () => {
    const fetchMock = respondWith(BOOKS);
    renderPage();
    await findRow('リーダブルコード');
    await userEvent.type(getSearchBox(), 'コード');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('SB-21: 読み込み中・エラーのときも入力欄を表示し、案内の文・エラーの文は変わらない', async () => {
    mockFetch(() => new Promise<Response>(() => {}));
    renderPage();
    expect(getSearchBox()).toBeTruthy();
    expect(screen.getByText('読み込み中…')).toBeTruthy();
    cleanup();

    mockFetch(async () => new Response('error', { status: 500 }));
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toBe(ERROR_MESSAGE);
    await userEvent.type(getSearchBox(), '達人');
    expect(screen.getByRole('alert').textContent).toBe(ERROR_MESSAGE);
  });

  it('SB-38: 姓と名の間に空白がある著者を、空白なしで入力しても表示する', async () => {
    respondWith(BOOKS);
    renderPage();
    await findRow('リーダブルコード');
    await userEvent.type(getSearchBox(), 'AndrewHunt');
    expect(rowTitles()).toEqual(['達人プログラマー']);
  });
});

// 同じ本のまとまりのテスト。テストケースの一覧は tests/searchBooks/cases.md
describe('BookListPage の同じ本のまとまり', () => {
  const READABLE = { title: 'リーダブルコード', authors: 'Dustin Boswell' };
  const COPIES = [
    makeBook({ id: 1, ...READABLE, location: '3階 書架A', status: 'borrowed' }),
    makeBook({ id: 2, title: '達人プログラマー', authors: 'David Thomas' }),
    makeBook({ id: 3, ...READABLE, location: '3階 書架B', status: 'available' }),
    makeBook({ id: 4, ...READABLE, location: '5階 書架C', status: 'borrowed', is_restricted: 1 }),
  ];
  const findGroupButton = () => screen.findByRole('button', { name: /リーダブルコード/ });
  const getSearchBox = () => screen.getByRole('searchbox', { name: '題名・著者で絞り込む' });
  const queryCopies = () => screen.queryByRole('list', { name: 'リーダブルコードの3冊' });

  it('SB-39: 同じ本が3冊あるときは1行にまとめ、「全3冊」を出し、閉じた状態で表示する', async () => {
    respondWith(COPIES);
    renderPage();
    const group = await findGroupButton();
    expect(
      screen
        .getAllByRole('listitem')
        .filter((li) => li.parentElement?.classList.contains('book-list')),
    ).toHaveLength(2);
    expect(within(group).getByText('全3冊')).toBeTruthy();
    expect(group.getAttribute('aria-expanded')).toBe('false');
    expect(queryCopies()).toBeNull();
    // 閉じたまとまりの行には、置き場所を出さない（1冊だけの本の行は、著者の下に置き場所を出す）
    expect(within(group).queryByText(/置き場所/)).toBeNull();
  });

  it('SB-40: まとまりの行を押すと開き、1冊ずつの置き場所と状態の印を行ごとに表示する', async () => {
    respondWith(COPIES);
    renderPage();
    const group = await findGroupButton();
    await userEvent.click(group);
    expect(group.getAttribute('aria-expanded')).toBe('true');
    const rows = within(queryCopies()!).getAllByRole('link');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/置き場所：3階 書架A.*誰かが借用中/),
      expect.stringMatching(/置き場所：3階 書架B.*借りられる/),
      expect.stringMatching(/置き場所：5階 書架C.*誰かが借用中/),
    ]);
  });

  it('SB-41: 開いた1冊の行は、その本の本詳細画面へのリンクで、押すと移動する', async () => {
    respondWith(COPIES);
    renderPage();
    await userEvent.click(await findGroupButton());
    const rows = within(queryCopies()!).getAllByRole('link');
    expect(rows.map((row) => row.getAttribute('href'))).toEqual([
      '/books/1',
      '/books/3',
      '/books/4',
    ]);
    await userEvent.click(rows[1]);
    expect(await screen.findByText('本詳細画面（テスト用）')).toBeTruthy();
  });

  it('SB-42: 開いたまとまりの行をもう一度押すと閉じる', async () => {
    respondWith(COPIES);
    renderPage();
    const group = await findGroupButton();
    await userEvent.click(group);
    await userEvent.click(group);
    expect(group.getAttribute('aria-expanded')).toBe('false');
    expect(queryCopies()).toBeNull();
  });

  it('SB-43: まとまりの行の印は、棚にある本があれば「借りられる」、全て貸出中なら「誰かが借用中」', async () => {
    respondWith([
      ...COPIES,
      makeBook({ id: 5, title: '人月の神話', authors: 'Frederick P. Brooks', status: 'borrowed' }),
      makeBook({ id: 6, title: '人月の神話', authors: 'Frederick P. Brooks', status: 'borrowed' }),
    ]);
    renderPage();
    const mixed = await findGroupButton();
    const allBorrowed = await screen.findByRole('button', { name: /人月の神話/ });
    expect(within(mixed).getByText('借りられる')).toBeTruthy();
    expect(within(mixed).queryByText('誰かが借用中')).toBeNull();
    expect(within(allBorrowed).getByText('誰かが借用中')).toBeTruthy();
    expect(within(allBorrowed).queryByText('借りられる')).toBeNull();
  });

  it('SB-44: まとまりの行の「持ち出し禁止」は全て持ち出し禁止のときだけ。開いた行には1冊ごとに出す', async () => {
    // 持ち出し禁止の本は借りられないので、棚にある状態にする（貸出中のときは「誰かが借用中」を出す決まり）
    respondWith([
      ...COPIES.map((book) => (book.id === 4 ? { ...book, status: 'available' as const } : book)),
      makeBook({ id: 5, title: '禁止の本', authors: 'X', is_restricted: 1 }),
      makeBook({ id: 6, title: '禁止の本', authors: 'X', is_restricted: 1 }),
    ]);
    renderPage();
    const partly = await findGroupButton();
    const all = await screen.findByRole('button', { name: /禁止の本/ });
    expect(within(partly).queryByText('持ち出し禁止')).toBeNull();
    expect(within(all).getByText('持ち出し禁止')).toBeTruthy();

    await userEvent.click(partly);
    const rows = within(queryCopies()!).getAllByRole('link');
    expect(rows.map((row) => within(row).queryByText('持ち出し禁止') !== null)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('SB-45: 1冊だけの本は、これまでどおりリンクの行で、冊数もボタンも出さない', async () => {
    respondWith(COPIES);
    renderPage();
    const single = await findRow('達人プログラマー');
    expect(single.getAttribute('href')).toBe('/books/2');
    expect(within(single).queryByText(/冊$/)).toBeNull();
    expect(screen.queryByRole('button', { name: /達人プログラマー/ })).toBeNull();
  });

  it('SB-46: まとまりの本を題名で絞り込んでも、まとまりのまま1行で表示する', async () => {
    respondWith(COPIES);
    renderPage();
    await findGroupButton();
    await userEvent.type(getSearchBox(), 'リーダブル');
    expect(screen.queryByRole('link', { name: /達人プログラマー/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: /リーダブルコード/ })).toHaveLength(1);
    expect(within(await findGroupButton()).getByText('全3冊')).toBeTruthy();
  });
});

// 開いたときの置き場所ごとの行のテスト。テストケースの一覧は tests/searchBooks/cases.md
describe('BookListPage の置き場所ごとの行', () => {
  const ISSUE = { title: 'イシューからはじめよ', authors: '安宅和人' };
  // 4階 書架B に3冊（貸出中1・棚にある2）、3階 書架B に1冊、5階 書架A に2冊（どちらも貸出中）
  const BOOKS = [
    makeBook({ id: 11, ...ISSUE, location: '4階 書架B', status: 'borrowed' }),
    makeBook({ id: 12, ...ISSUE, location: '3階 書架B', status: 'available' }),
    makeBook({ id: 13, ...ISSUE, location: '4階 書架B', status: 'available' }),
    makeBook({ id: 14, ...ISSUE, location: '4階 書架B', status: 'available' }),
    makeBook({ id: 15, ...ISSUE, location: '5階 書架A', status: 'borrowed' }),
    makeBook({ id: 16, ...ISSUE, location: '5階 書架A', status: 'borrowed' }),
  ];

  // まとまりを開いて、置き場所ごとの行を返す
  async function openCopies() {
    await userEvent.click(await screen.findByRole('button', { name: /イシューからはじめよ/ }));
    const list = screen.getByRole('list', { name: 'イシューからはじめよの6冊' });
    return within(list).getAllByRole('listitem');
  }
  const rowAt = (rows: HTMLElement[], location: string) =>
    rows.find((row) => row.textContent?.includes(`置き場所：${location}`))!;

  it('SB-52: 同じ置き場所の本は1行にまとめ、「借りられる」と「残り2冊」を出し、棚にある本へリンクする', async () => {
    respondWith(BOOKS);
    renderPage();
    const rows = await openCopies();
    expect(rows).toHaveLength(3);
    const row = rowAt(rows, '4階 書架B');
    expect(within(row).getByText('借りられる')).toBeTruthy();
    expect(within(row).getByText('残り2冊')).toBeTruthy();
    expect(within(row).getByRole('link').getAttribute('href')).toBe('/books/13');
  });

  it('SB-53: 同じ置き場所の本が全て貸出中なら「誰かが借用中」と「残り0冊」を出す', async () => {
    respondWith(BOOKS);
    renderPage();
    const row = rowAt(await openCopies(), '5階 書架A');
    expect(within(row).getByText('誰かが借用中')).toBeTruthy();
    expect(within(row).getByText('残り0冊')).toBeTruthy();
    expect(within(row).getByRole('link').getAttribute('href')).toBe('/books/15');
  });

  it('SB-54: 置き場所に1冊だけでも、棚にあれば「残り1冊」を出す', async () => {
    respondWith(BOOKS);
    renderPage();
    const row = rowAt(await openCopies(), '3階 書架B');
    expect(within(row).getByText('借りられる')).toBeTruthy();
    expect(within(row).getByText('残り1冊')).toBeTruthy();
    expect(within(row).getByRole('link').getAttribute('href')).toBe('/books/12');
  });

  it('SB-57: 置き場所に1冊だけで貸出中なら「誰かが借用中」と「残り0冊」を出す', async () => {
    respondWith([
      makeBook({ id: 31, ...ISSUE, location: '3階 書架B', status: 'borrowed' }),
      makeBook({ id: 32, ...ISSUE, location: '4階 書架B', status: 'available' }),
    ]);
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /イシューからはじめよ/ }));
    const rows = within(
      screen.getByRole('list', { name: 'イシューからはじめよの2冊' }),
    ).getAllByRole('listitem');
    const row = rowAt(rows, '3階 書架B');
    expect(within(row).getByText('誰かが借用中')).toBeTruthy();
    expect(within(row).getByText('残り0冊')).toBeTruthy();
  });

  it('SB-55: 「残りn冊」のある行はトグルではなくリンクで、押すと棚にある本の本詳細画面へ移動する', async () => {
    respondWith(BOOKS);
    renderPage();
    const row = rowAt(await openCopies(), '4階 書架B');
    expect(within(row).queryByRole('button')).toBeNull();
    expect(row.querySelector('[aria-expanded]')).toBeNull();
    await userEvent.click(within(row).getByRole('link'));
    expect(await screen.findByText('本詳細画面（テスト用）')).toBeTruthy();
  });

  it('SB-56: 同じ置き場所の本が全て持ち出し禁止のときだけ「持ち出し禁止」を出す', async () => {
    respondWith([
      makeBook({ id: 21, ...ISSUE, location: '3階 書架C', is_restricted: 1 }),
      makeBook({ id: 22, ...ISSUE, location: '3階 書架C', is_restricted: 1 }),
      makeBook({ id: 23, ...ISSUE, location: '4階 書架C', is_restricted: 1 }),
      makeBook({ id: 24, ...ISSUE, location: '4階 書架C', is_restricted: 0 }),
    ]);
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /イシューからはじめよ/ }));
    const rows = within(
      screen.getByRole('list', { name: 'イシューからはじめよの4冊' }),
    ).getAllByRole('listitem');
    expect(within(rowAt(rows, '3階 書架C')).getByText('持ち出し禁止')).toBeTruthy();
    expect(within(rowAt(rows, '4階 書架C')).queryByText('持ち出し禁止')).toBeNull();
  });
});
