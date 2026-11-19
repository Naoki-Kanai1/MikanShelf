// @vitest-environment jsdom
// 貸出一覧画面の単体テスト。テストケースの一覧は tests/loanList/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoanListPage from './LoanListPage';

type Loan = {
  id: number;
  book_id: number;
  title: string;
  authors: string;
  location: string;
  status: 'borrowed' | 'returned';
  borrower_name: string;
  borrowed_at: string;
  returned_at: string | null;
};

// テスト用の貸出。必要な項目だけ上書きして使う
function makeLoan(overrides: Partial<Loan> & Pick<Loan, 'id'>): Loan {
  return {
    book_id: overrides.id,
    title: `本${overrides.id}`,
    authors: `著者${overrides.id}`,
    location: '3階 書架A',
    status: 'borrowed',
    borrower_name: 'テスト太郎',
    borrowed_at: '2026-11-01 01:00:00',
    returned_at: null,
    ...overrides,
  };
}

// fetch を作り物に差し替える（本物のサーバーには通信しない）
function mockFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const respondWith = (loans: Loan[]) => mockFetch(async () => Response.json(loans));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/loans']}>
      <Routes>
        <Route path="/loans" element={<LoanListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const chip = (name: string) => screen.getByRole('button', { name });
const pressedChips = () =>
  screen
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent);

const BORROWED = makeLoan({ id: 1, title: '貸出中の本A', status: 'borrowed' });
const RETURNED = makeLoan({
  id: 2,
  title: '返却済みの本B',
  status: 'returned',
  returned_at: '2026-11-05 01:00:00',
});

const ERROR_MESSAGE = '貸出の一覧を読み込めませんでした。時間をおいて、もう一度開いてください。';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoanListPage', () => {
  it('LL-01: 画面を開くと、GET /api/loans を1回だけ呼ぶ', async () => {
    const fetchMock = respondWith([BORROWED]);
    renderPage();
    await screen.findByText('貸出中の本A');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/loans');
  });

  it('LL-02: 画面の名前「借りている本」を見出しとして表示する', async () => {
    respondWith([]);
    renderPage();
    expect(screen.getByRole('heading', { name: '借りている本' })).toBeTruthy();
  });

  it('LL-03: 絞り込みのチップを「いま借りている本」「返却済みの本」「すべて」の順に表示し、古い名前は表示しない', () => {
    respondWith([]);
    renderPage();
    const group = screen.getByRole('group', { name: '表示する貸出' });
    const labels = Array.from(group.querySelectorAll('button')).map((b) => b.textContent);
    expect(labels).toEqual(['いま借りている本', '返却済みの本', 'すべて']);
    expect(screen.queryByText('貸出中のみ')).toBeNull();
    expect(screen.queryByText('返却済みのみ')).toBeNull();
  });

  it('LL-04: 画面を開いた直後は「いま借りている本」だけが選ばれている', () => {
    respondWith([]);
    renderPage();
    expect(chip('いま借りている本').getAttribute('aria-pressed')).toBe('true');
    expect(pressedChips()).toEqual(['いま借りている本']);
  });

  it('LL-05: 応答が返ってくるまでは「読み込み中…」と画面の名前を表示し、一覧は表示しない', () => {
    mockFetch(() => new Promise<Response>(() => {}));
    renderPage();
    expect(screen.getByText('読み込み中…')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '借りている本' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('LL-06: 初めの状態では、貸出中の本だけを表示する', async () => {
    respondWith([BORROWED, RETURNED]);
    renderPage();
    expect(await screen.findByText('貸出中の本A')).toBeTruthy();
    expect(screen.queryByText('返却済みの本B')).toBeNull();
  });

  it('LL-07: 「返却済みの本」を押すと、返却済みの本だけを表示し、そのチップだけが選ばれる', async () => {
    respondWith([BORROWED, RETURNED]);
    renderPage();
    await screen.findByText('貸出中の本A');
    await userEvent.click(chip('返却済みの本'));
    expect(screen.getByText('返却済みの本B')).toBeTruthy();
    expect(screen.queryByText('貸出中の本A')).toBeNull();
    expect(pressedChips()).toEqual(['返却済みの本']);
  });

  it('LL-08: 「すべて」を押すと、2件とも表示し、そのチップだけが選ばれる', async () => {
    respondWith([BORROWED, RETURNED]);
    renderPage();
    await screen.findByText('貸出中の本A');
    await userEvent.click(chip('すべて'));
    expect(screen.getByText('貸出中の本A')).toBeTruthy();
    expect(screen.getByText('返却済みの本B')).toBeTruthy();
    expect(pressedChips()).toEqual(['すべて']);
  });

  it('LL-09: 行のリンク先が /loans/:id で、題名と借りた日（日本時間）を表示する', async () => {
    respondWith([makeLoan({ id: 5, title: 'リーダブルコード', borrowed_at: '2026-11-18 15:30:00' })]);
    renderPage();
    const row = await screen.findByRole('link', { name: /リーダブルコード/ });
    expect(row.getAttribute('href')).toBe('/loans/5');
    expect(row.textContent).toContain('借りた日 2026年11月19日');
  });

  it('LL-10: 貸出中の本がないときは「いま借りている本はありません。」を表示し、一覧は表示しない', async () => {
    respondWith([RETURNED]);
    renderPage();
    expect(await screen.findByText('いま借りている本はありません。')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('LL-11: 返却済みの本がないときに「返却済みの本」を押すと「返却済みの本はまだありません。」を表示する', async () => {
    respondWith([BORROWED]);
    renderPage();
    await screen.findByText('貸出中の本A');
    await userEvent.click(chip('返却済みの本'));
    expect(screen.getByText('返却済みの本はまだありません。')).toBeTruthy();
  });

  it('LL-12: 0件のときに「すべて」を押すと「借りた本はまだありません。」を表示する', async () => {
    respondWith([]);
    renderPage();
    await screen.findByText('いま借りている本はありません。');
    await userEvent.click(chip('すべて'));
    expect(screen.getByText('借りた本はまだありません。')).toBeTruthy();
  });

  it('LL-13: API がエラー（HTTP 500）を返すと、エラーの文を alert として画面の名前と表示する', async () => {
    mockFetch(async () => new Response('error', { status: 500 }));
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(ERROR_MESSAGE);
    expect(screen.getByRole('heading', { name: '借りている本' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('LL-14: 通信に失敗すると、LL-13 と同じエラーの文を表示する', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(ERROR_MESSAGE);
  });
});
