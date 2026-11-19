// @vitest-environment jsdom
// 貸出詳細画面の「全フロアの残り冊数」の単体テスト。テストケースの一覧は tests/bookStock/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoanDetail from './LoanDetail';
import { installDialogPolyfill } from './test/dialogPolyfill';

installDialogPolyfill();

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
  on_shelf_count: number;
};

// テスト用の貸出（貸出中）。必要な項目だけ上書きして使う
function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 1,
    book_id: 1,
    title: 'リーダブルコード',
    authors: 'Dustin Boswell、Trevor Foucher',
    location: '3階 書架A',
    status: 'borrowed',
    borrower_name: '田中',
    borrowed_at: '2026-11-02 01:00:00',
    returned_at: null,
    on_shelf_count: 2,
    ...overrides,
  };
}

// API を作り物に差し替える。GET の応答と、返却（POST）の応答を別に決められる
function mockApi(loan: Loan, returned?: Loan) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
    Response.json(init?.method === 'POST' ? returned : loan),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LoanDetail loanId={1} />
    </MemoryRouter>,
  );
}

const labels = () =>
  Array.from(document.querySelectorAll('.info-label')).map((el) => el.textContent);

const valueOf = (label: string) =>
  screen.getByText(label).parentElement?.querySelector('.info-value')?.textContent;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoanDetail', () => {
  it('BS-12: on_shelf_count が 3 なら、「全フロアの残り冊数」に「3冊」と表示する', async () => {
    mockApi(makeLoan({ on_shelf_count: 3 }));
    renderPage();
    expect(await screen.findByText('全フロアの残り冊数')).toBeTruthy();
    expect(valueOf('全フロアの残り冊数')).toBe('3冊');
  });

  it('BS-13: on_shelf_count が 0 なら「0冊」と表示する', async () => {
    mockApi(makeLoan({ on_shelf_count: 0 }));
    renderPage();
    await screen.findByText('全フロアの残り冊数');
    expect(valueOf('全フロアの残り冊数')).toBe('0冊');
  });

  it('BS-14: 「全フロアの残り冊数」は「状態」のすぐ下に並ぶ', async () => {
    mockApi(makeLoan());
    renderPage();
    await screen.findByText('全フロアの残り冊数');
    expect(labels()).toEqual(['借りた場所', '状態', '全フロアの残り冊数', '借りた日']);
  });

  it('BS-15: 本を返し、完了ダイアログの「OK」を押すと、返却の応答の冊数（1冊）に表示が変わる', async () => {
    const fetchMock = mockApi(
      makeLoan({ on_shelf_count: 0 }),
      makeLoan({ status: 'returned', returned_at: '2026-11-19 01:00:00', on_shelf_count: 1 }),
    );
    renderPage();
    await screen.findByText('全フロアの残り冊数');
    expect(valueOf('全フロアの残り冊数')).toBe('0冊');

    await userEvent.click(screen.getByRole('button', { name: '返す' }));
    expect(await screen.findByText('本を返しました！')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/loans/1/return', { method: 'POST' });
    // OK を押すまでは、返す前の表示のまま
    expect(valueOf('全フロアの残り冊数')).toBe('0冊');

    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(await screen.findByText('返した日')).toBeTruthy();
    expect(valueOf('全フロアの残り冊数')).toBe('1冊');
  });
});
