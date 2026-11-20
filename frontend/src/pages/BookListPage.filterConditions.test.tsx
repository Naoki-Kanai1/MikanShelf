// @vitest-environment jsdom
// 本一覧画面の、場所・ステータスでの絞り込みの単体テスト。テストケースの一覧は tests/filterByConditions/cases.md
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookListStateProvider } from '../state/BookListStateProvider';
import { installDialogPolyfill } from '../test/dialogPolyfill';
import BookListPage from './BookListPage';

installDialogPolyfill();

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

function makeBook(overrides: Partial<Book> & Pick<Book, 'id' | 'title' | 'location'>): Book {
  return {
    authors: `著者${overrides.id}`,
    is_restricted: 0,
    status: 'available',
    borrower_name: null,
    borrowed_at: null,
    created_at: '2026-11-01 00:00:00',
    ...overrides,
  };
}

// 題名はどれも違うので、まとまりにはならず1冊ずつの行になる
const BOOKS: Book[] = [
  makeBook({ id: 1, title: 'リーダブルコード', location: '横浜 14F SD部' }),
  makeBook({ id: 2, title: 'Clean Code', location: '新川 3F 共用', is_restricted: 1 }),
  makeBook({ id: 3, title: 'コードコンプリート', location: '新川 3F 共用' }),
  makeBook({ id: 4, title: '人月の神話', location: '横浜 14F SD部', is_restricted: 1 }),
  makeBook({
    id: 5,
    title: 'テスト駆動開発',
    location: '横浜 14F SD部',
    status: 'borrowed',
    borrower_name: '佐藤',
    borrowed_at: '2026-11-10 00:00:00',
  }),
];
// BOOKS の置き場所（重複なし・名前の順）。絞り込みの選択肢にこの順で出る
const LOCATIONS = ['新川 3F 共用', '横浜 14F SD部'];

// fetch の作り物（本物のサーバーには通信しない）。本の一覧だけを返す
function mockFetch(books: Book[] = BOOKS) {
  const fetchMock = vi.fn(async () => Response.json(books));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  vi.stubGlobal('scrollTo', vi.fn());
  return render(
    <BookListStateProvider>
      <MemoryRouter initialEntries={['/books']}>
        <Routes>
          <Route path="/books" element={<BookListPage />} />
          <Route
            path="/books/:bookId"
            element={
              <>
                <p>本詳細画面（テスト用）</p>
                <Link to="/books">本一覧へ戻る</Link>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </BookListStateProvider>,
  );
}

// 一覧に出ている本の題名
const shownTitles = () =>
  Array.from(document.querySelectorAll('.book-list .book-row__title')).map((el) => el.textContent);

// 狭い画面で使う、検索ボックスの右端のボタン
const filterButton = () => screen.getByRole('button', { name: /場所・ステータスで絞り込む/ });
// 広い画面で、検索ボックスの下に直接並べる選択肢（jsdom では CSS で隠さないので、いつも見える）
const inlineFilter = () => screen.getByRole('region', { name: '場所・ステータスで絞り込む' });
const inlineFilterOrNull = () =>
  screen.queryByRole('region', { name: '場所・ステータスで絞り込む' });

// ボタンを押してモーダルを開き、モーダルを返す
async function openFilter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(filterButton());
  return screen.getByRole('dialog', { name: '絞り込み' });
}

// 本の一覧を読み込み終えるまで待つ
const waitLoaded = () => screen.findByText('リーダブルコード');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BookListPage（狭い画面: 検索ボックスの右端のボタンとモーダル）', () => {
  it('FC-78: ボタンでモーダルが開き、本の一覧の置き場所を重複なしで並べる（API は本の一覧だけ呼ぶ）', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch();
    renderPage();
    await waitLoaded();

    // ボタンは検索ボックスの帯の中の、入力欄より後ろにある
    const search = screen.getByRole('searchbox', { name: '題名・著者で絞り込む' });
    expect(search.closest('.book-search__field')!.lastElementChild).toBe(filterButton());

    const dialog = await openFilter(user);
    const places = within(dialog).getAllByRole('checkbox');
    expect(places.map((c) => c.closest('label')?.textContent)).toEqual(LOCATIONS);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/books');
  });

  it('FC-35: 場所を1つチェックすると、その場所の本だけを出す', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderPage();
    await waitLoaded();
    const dialog = await openFilter(user);
    await user.click(within(dialog).getByRole('checkbox', { name: '新川 3F 共用' }));
    expect(shownTitles()).toEqual(['Clean Code', 'コードコンプリート']);
  });

  it('FC-101: ステータス「借りられる」を選ぶと、借用中・持ち出し禁止の本を除いて出す', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderPage();
    await waitLoaded();
    const dialog = await openFilter(user);
    await user.click(within(dialog).getByRole('radio', { name: '借りられる' }));
    expect(shownTitles()).toEqual(['リーダブルコード', 'コードコンプリート']);
  });

  it('FC-37: 場所の条件と検索の文字の両方に合う本だけを出す', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderPage();
    await waitLoaded();
    const dialog = await openFilter(user);
    await user.click(within(dialog).getByRole('checkbox', { name: '横浜 14F SD部' }));
    await user.click(within(dialog).getByRole('button', { name: '閉じる' }));

    await user.type(screen.getByRole('searchbox'), 'コード');
    // 「コード」を含む本は 1・2・3 だが、横浜 14F SD部 にあるのは 1 だけ
    expect(shownTitles()).toEqual(['リーダブルコード']);
  });

  it('FC-38: 条件を選ぶとボタンに数が出て、「すべて解除」で全ての本に戻る', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderPage();
    await waitLoaded();
    expect(filterButton().hasAttribute('data-active')).toBe(false);

    const dialog = await openFilter(user);
    await user.click(within(dialog).getByRole('checkbox', { name: '横浜 14F SD部' }));
    await user.click(within(dialog).getByRole('radio', { name: '借りられる' }));
    expect(shownTitles()).toEqual(['リーダブルコード']);
    expect(filterButton().getAttribute('aria-label')).toBe(
      '場所・ステータスで絞り込む（2件の条件で絞り込み中）',
    );
    expect(filterButton().hasAttribute('data-active')).toBe(true);
    expect(filterButton().textContent).toBe('2');

    await user.click(within(dialog).getByRole('button', { name: 'すべて解除' }));
    expect(shownTitles()).toHaveLength(BOOKS.length);
    expect(filterButton().getAttribute('aria-label')).toBe('場所・ステータスで絞り込む');
    expect(
      (within(dialog).getByRole('radio', { name: 'すべて' }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it('FC-40: 条件を選んでから本詳細画面へ移動して戻っても、同じ条件で絞り込んだまま', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderPage();
    await waitLoaded();
    const dialog = await openFilter(user);
    await user.click(within(dialog).getByRole('checkbox', { name: '新川 3F 共用' }));
    await user.click(within(dialog).getByRole('radio', { name: '借りられる' }));
    await user.click(within(dialog).getByRole('button', { name: '閉じる' }));
    expect(shownTitles()).toEqual(['コードコンプリート']);

    await user.click(screen.getByRole('link', { name: /コードコンプリート/ }));
    await user.click(await screen.findByRole('link', { name: '本一覧へ戻る' }));
    await screen.findByText('コードコンプリート');
    expect(shownTitles()).toEqual(['コードコンプリート']);

    const reopened = await openFilter(user);
    const place = within(reopened).getByRole('checkbox', { name: '新川 3F 共用' });
    const status = within(reopened).getByRole('radio', { name: '借りられる' });
    expect((place as HTMLInputElement).checked).toBe(true);
    expect((status as HTMLInputElement).checked).toBe(true);
  });

  it('FC-41: 条件に合う本が無いときは「条件に合う本は見つかりませんでした。」', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderPage();
    await waitLoaded();
    const dialog = await openFilter(user);
    await user.click(within(dialog).getByRole('checkbox', { name: '新川 3F 共用' }));
    await user.click(within(dialog).getByRole('radio', { name: '借りられる' }));
    await user.click(within(dialog).getByRole('button', { name: '閉じる' }));
    // 新川で借りられるのはコードコンプリートだけ。「リーダブル」はその題名に無い
    await user.type(screen.getByRole('searchbox'), 'リーダブル');
    expect(screen.getByText('条件に合う本は見つかりませんでした。')).toBeTruthy();
    expect(shownTitles()).toEqual([]);
  });

  it('FC-79: 本の一覧の読み込み中は、ボタンを押せず、選択肢も出さない', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );
    renderPage();
    expect((filterButton() as HTMLButtonElement).disabled).toBe(true);
    expect(inlineFilterOrNull()).toBeNull();
  });

  it('FC-80: 本の一覧を読み込めなかったときは、ボタンを押せず、選択肢も出さない', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    renderPage();
    await screen.findByRole('alert');
    expect((filterButton() as HTMLButtonElement).disabled).toBe(true);
    expect(inlineFilterOrNull()).toBeNull();
  });
});

describe('BookListPage（広い画面: 検索ボックスの下に直接並べる選択肢）', () => {
  it('FC-102: 検索ボックスの下に、場所のチェックボックスとステータスのラジオボタン「すべて」「借りられる」（はじめは「すべて」）を並べる', async () => {
    mockFetch();
    renderPage();
    await waitLoaded();
    const inline = inlineFilter();
    // 検索ボックスと同じ帯（role="search"）の中で、入力欄より後ろ
    expect(inline.closest('[role="search"]')).toBe(screen.getByRole('search'));
    const places = within(inline).getAllByRole('checkbox');
    expect(places.map((c) => c.closest('label')?.textContent)).toEqual(LOCATIONS);
    const radios = within(inline).getAllByRole('radio');
    expect(radios.map((r) => r.closest('label')?.textContent)).toEqual(['すべて', '借りられる']);
    expect(radios.map((r) => (r as HTMLInputElement).checked)).toEqual([true, false]);
  });

  it('FC-82: 直接並べた選択肢で選ぶと一覧を絞り込み、モーダルにも同じ条件が出る', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderPage();
    await waitLoaded();
    await user.click(within(inlineFilter()).getByRole('checkbox', { name: '横浜 14F SD部' }));
    await user.click(within(inlineFilter()).getByRole('radio', { name: '借りられる' }));
    expect(shownTitles()).toEqual(['リーダブルコード']);

    const dialog = await openFilter(user);
    const place = within(dialog).getByRole('checkbox', { name: '横浜 14F SD部' });
    const status = within(dialog).getByRole('radio', { name: '借りられる' });
    expect((place as HTMLInputElement).checked).toBe(true);
    expect((status as HTMLInputElement).checked).toBe(true);
  });

  it('FC-103: 「借りられる」を選ぶと絞り込み、「すべて」を選ぶと状態で絞り込まなくなる', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderPage();
    await waitLoaded();
    const inline = inlineFilter();
    await user.click(within(inline).getByRole('radio', { name: '借りられる' }));
    expect(shownTitles()).toEqual(['リーダブルコード', 'コードコンプリート']);
    await user.click(within(inline).getByRole('radio', { name: 'すべて' }));
    expect(shownTitles()).toHaveLength(BOOKS.length);
    expect(
      within(inline)
        .getAllByRole('radio')
        .filter((r) => (r as HTMLInputElement).checked),
    ).toHaveLength(1);
  });

  it('FC-84: 「すべて解除」は条件を選んでいるときだけ押せて、押すと全ての本に戻る', async () => {
    const user = userEvent.setup();
    mockFetch();
    renderPage();
    await waitLoaded();
    const clear = () =>
      within(inlineFilter()).getByRole('button', { name: 'すべて解除' }) as HTMLButtonElement;
    expect(clear().disabled).toBe(true);

    await user.click(within(inlineFilter()).getByRole('checkbox', { name: '新川 3F 共用' }));
    await user.click(within(inlineFilter()).getByRole('radio', { name: '借りられる' }));
    expect(clear().disabled).toBe(false);
    await user.click(clear());
    expect(shownTitles()).toHaveLength(BOOKS.length);
    expect(
      (within(inlineFilter()).getByRole('radio', { name: 'すべて' }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(clear().disabled).toBe(true);
  });
});

// 同じ本が何冊もあるときの絞り込みを確かめる本。
// リーダブルコード: 14F に借用中1冊・棚に1冊、新川に棚に1冊
const COPIES: Book[] = [
  makeBook({
    id: 11,
    title: 'リーダブルコード',
    authors: 'Dustin Boswell',
    location: '横浜 14F SD部',
    status: 'borrowed',
    borrower_name: '佐藤',
    borrowed_at: '2026-11-10 00:00:00',
  }),
  makeBook({
    id: 12,
    title: 'リーダブルコード',
    authors: 'Dustin Boswell',
    location: '横浜 14F SD部',
  }),
  makeBook({
    id: 13,
    title: 'リーダブルコード',
    authors: 'Dustin Boswell',
    location: '新川 3F 共用',
  }),
];

// リーダブルコード: 14F に借用中1冊・棚に1冊、新川に借用中2冊
const BORROWED_COPIES: Book[] = [21, 22, 23, 24].map((id) =>
  makeBook({
    id,
    title: 'リーダブルコード',
    authors: 'Dustin Boswell',
    location: id <= 22 ? '横浜 14F SD部' : '新川 3F 共用',
    ...(id === 22
      ? {}
      : { status: 'borrowed', borrower_name: '佐藤', borrowed_at: '2026-11-10 00:00:00' }),
  }),
);

// ドメイン駆動設計: 14F に借りられる1冊・持ち出し禁止1冊・借用中1冊、虎ノ門に借りられる2冊・借用中1冊
const MIXED_COPIES: Book[] = [
  makeBook({ id: 31, title: 'ドメイン駆動設計', authors: 'Eric Evans', location: '横浜 14F SD部' }),
  makeBook({
    id: 32,
    title: 'ドメイン駆動設計',
    authors: 'Eric Evans',
    location: '横浜 14F SD部',
    is_restricted: 1,
  }),
  ...[33, 36].map((id) =>
    makeBook({
      id,
      title: 'ドメイン駆動設計',
      authors: 'Eric Evans',
      location: id === 33 ? '横浜 14F SD部' : '虎ノ門 20F 共用',
      status: 'borrowed',
      borrower_name: '佐藤',
      borrowed_at: '2026-11-10 00:00:00',
    }),
  ),
  ...[34, 35].map((id) =>
    makeBook({ id, title: 'ドメイン駆動設計', authors: 'Eric Evans', location: '虎ノ門 20F 共用' }),
  ),
];

const mockCopiesFetch = (books: Book[] = COPIES) => mockFetch(books);

describe('BookListPage（同じ本が何冊もあるときの絞り込み）', () => {
  it('FC-88: 条件なしで開くと、トグルは「全n冊」、置き場所ごとに「残りn冊」と、その置き場所の冊数「／m冊」を出す', async () => {
    const user = userEvent.setup();
    mockCopiesFetch(BORROWED_COPIES);
    renderPage();
    const group = await screen.findByRole('button', { name: /リーダブルコード/ });
    expect(within(group).getByText('全4冊')).toBeTruthy();
    await user.click(group);
    const rows = within(screen.getByRole('list', { name: 'リーダブルコードの4冊' })).getAllByRole(
      'link',
    );
    // 14F は借用中1冊・棚に1冊、新川は借用中2冊。行の冊数を足すと、まとまりの冊数になる
    expect(rows[0].textContent).toContain('残り1冊／2冊');
    expect(rows[1].textContent).toContain('残り0冊／2冊');
  });

  it('FC-104: 「借りられる」で絞ると、借用中・持ち出し禁止の冊は「全n冊」にも「残りn冊／m冊」にも数えない', async () => {
    const user = userEvent.setup();
    mockCopiesFetch(MIXED_COPIES);
    renderPage();
    await screen.findByText('ドメイン駆動設計');
    const dialog = await openFilter(user);
    await user.click(within(dialog).getByRole('radio', { name: '借りられる' }));
    await user.click(within(dialog).getByRole('button', { name: '閉じる' }));

    const group = screen.getByRole('button', { name: /ドメイン駆動設計/ });
    expect(within(group).getByText('全3冊')).toBeTruthy();
    await user.click(group);
    const rows = within(screen.getByRole('list', { name: 'ドメイン駆動設計の3冊' })).getAllByRole(
      'link',
    );
    // 14F は借りられる1冊だけ（持ち出し禁止・借用中の冊は数えず、行からも開かない）
    expect(rows[0].textContent).toContain('置き場所：横浜 14F SD部');
    expect(rows[0].textContent).toContain('残り1冊／1冊');
    expect(rows[0].textContent).not.toContain('持ち出し禁止');
    expect(rows[0].getAttribute('href')).toBe('/books/31');
    expect(rows[1].textContent).toContain('置き場所：虎ノ門 20F 共用');
    expect(rows[1].textContent).toContain('残り2冊／2冊');
  });

  it('FC-63: 状態で絞って条件に合う冊が1冊だけになると、その冊の1冊の行で出す', async () => {
    const user = userEvent.setup();
    mockCopiesFetch(BORROWED_COPIES);
    renderPage();
    await screen.findByText('リーダブルコード');
    const dialog = await openFilter(user);
    await user.click(within(dialog).getByRole('radio', { name: '借りられる' }));
    await user.click(within(dialog).getByRole('button', { name: '閉じる' }));

    const row = screen.getByRole('link', { name: /リーダブルコード/ });
    expect(row.getAttribute('href')).toBe('/books/22');
    expect(row.textContent).toContain('置き場所：横浜 14F SD部');
    expect(row.textContent).toContain('借りられる');
    expect(screen.queryByRole('button', { name: /リーダブルコード/ })).toBeNull();
  });

  it('FC-53: 置き場所で絞ると、その置き場所の冊だけを、状態に関係なく出す', async () => {
    const user = userEvent.setup();
    mockCopiesFetch();
    renderPage();
    await screen.findByText('リーダブルコード');
    const dialog = await openFilter(user);
    await user.click(within(dialog).getByRole('checkbox', { name: '新川 3F 共用' }));
    await user.click(within(dialog).getByRole('button', { name: '閉じる' }));

    // 新川には1冊だけなので、1冊の行（置き場所つき）になる
    const row = screen.getByRole('link', { name: /リーダブルコード/ });
    expect(row.textContent).toContain('置き場所：新川 3F 共用');
    expect(row.getAttribute('href')).toBe('/books/13');
    expect(document.querySelector('.book-list')!.textContent).not.toContain('横浜 14F SD部');
  });
});
