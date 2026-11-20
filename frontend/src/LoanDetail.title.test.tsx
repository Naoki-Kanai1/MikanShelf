// @vitest-environment jsdom
// 貸出詳細画面のタイトルの単体テスト。テストケースの一覧は tests/loanDetailTitle/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoanDetail from './LoanDetail';
import { installDialogPolyfill } from './test/dialogPolyfill';

installDialogPolyfill();

const BORROWED_LOAN = {
  id: 5,
  book_id: 1,
  title: 'テスト駆動開発',
  authors: 'Kent Beck',
  location: '3階 書架A',
  status: 'borrowed',
  borrower_name: '田中',
  borrowed_at: '2026-11-10 01:00:00',
  returned_at: null,
  on_shelf_count: 1,
};
const RETURNED_LOAN = {
  ...BORROWED_LOAN,
  status: 'returned',
  returned_at: '2026-11-19 01:00:00',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/loans/5']}>
      <LoanDetail loanId={5} />
    </MemoryRouter>,
  );
}

const title = () => screen.getByRole('heading', { level: 1 }).textContent;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoanDetail のタイトル', () => {
  it('LT-01: 借りている貸出では、タイトルは「借りている本の詳細」', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(BORROWED_LOAN)));
    renderPage();
    expect(
      await screen.findByRole('heading', { level: 1, name: '借りている本の詳細' }),
    ).toBeTruthy();
  });

  it('LT-02: 返却済みの貸出では、タイトルは「返却済みの本の詳細」', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(RETURNED_LOAN)));
    renderPage();
    expect(
      await screen.findByRole('heading', { level: 1, name: '返却済みの本の詳細' }),
    ).toBeTruthy();
  });

  it('LT-03: 読み込んでいる途中は、タイトルは空で「貸出の詳細」と出さない', () => {
    // 返事が来ない fetch
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    renderPage();
    expect(title()).toBe('');
    expect(screen.queryByText('貸出の詳細')).toBeNull();
  });

  it('LT-04: 貸出が見つからない（404）ときは、タイトルは空', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
    renderPage();
    expect(await screen.findByText('貸出が見つかりません')).toBeTruthy();
    expect(title()).toBe('');
  });

  it('LT-05: 返して完了ダイアログの OK を押すと、タイトルが「返却済みの本の詳細」に変わる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/loans/5/return' && init?.method === 'POST') {
          return Response.json(RETURNED_LOAN);
        }
        return Response.json(BORROWED_LOAN);
      }),
    );
    const view = renderPage();
    await userEvent.click(await screen.findByRole('button', { name: '返す' }));
    await vi.waitFor(() => expect(view.container.querySelector('dialog')?.open).toBe(true));
    expect(title()).toBe('借りている本の詳細');
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: '返却済みの本の詳細' }),
    ).toBeTruthy();
  });
});
