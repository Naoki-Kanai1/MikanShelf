// @vitest-environment jsdom
// 貸出詳細画面の「返す」と完了ダイアログの単体テスト。テストケースの一覧は tests/completionDialog/cases.md
import { act, cleanup, render, screen } from '@testing-library/react';
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
};
const RETURNED_LOAN = {
  ...BORROWED_LOAN,
  status: 'returned',
  returned_at: '2026-11-19 01:00:00',
};

const RETURNED_NOTICE = 'この本は返却済みです。もう一度読むときは、本の詳細から借りられます。';

// fetch を作り物に差し替える。貸出の取得には getLoan()、返す API には returnResponse() を返す
function mockFetch(returnResponse: () => Response, getLoan: () => object = () => BORROWED_LOAN) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/loans/5/return' && init?.method === 'POST') return returnResponse();
    if (url === '/api/loans/5') return Response.json(getLoan());
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  const view = render(
    <MemoryRouter initialEntries={['/loans/5']}>
      <LoanDetail loanId={5} />
    </MemoryRouter>,
  );
  const dialog = () => view.container.querySelector('dialog');
  return { view, dialog };
}

const clickReturn = async () => {
  await userEvent.click(await screen.findByRole('button', { name: '返す' }));
};

// 返却済みの表示になっていることを確かめる
const expectReturnedView = async () => {
  expect(await screen.findByText(RETURNED_NOTICE)).toBeTruthy();
  expect(screen.queryByRole('button', { name: '返す' })).toBeNull();
  expect(screen.getByText('返却済み')).toBeTruthy();
  expect(screen.getByText('返した日')).toBeTruthy();
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoanDetail の返す', () => {
  it('CP-12: 「返す」を押すと、確認ダイアログを出さずに POST /api/loans/5/return を1回呼ぶ', async () => {
    const fetchMock = mockFetch(() => Response.json(RETURNED_LOAN));
    renderPage();
    await clickReturn();
    expect(screen.queryByText('この本を返しますか？')).toBeNull();
    const returnCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/loans/5/return');
    expect(returnCalls).toHaveLength(1);
    expect(returnCalls[0][1]?.method).toBe('POST');
  });

  it('CP-13: 返せると「本を返しました！」のダイアログが開き、OK を押すまでは貸出中の表示のまま', async () => {
    mockFetch(() => Response.json(RETURNED_LOAN));
    const { dialog } = renderPage();
    await clickReturn();
    expect(await screen.findByText('本を返しました！')).toBeTruthy();
    expect(dialog()?.open).toBe(true);
    expect(screen.getByRole('button', { name: '返す' })).toBeTruthy();
    expect(screen.queryByText(RETURNED_NOTICE)).toBeNull();
  });

  it('CP-14: 完了ダイアログの「OK」を押すと、返却済みの表示に切り替わる', async () => {
    mockFetch(() => Response.json(RETURNED_LOAN));
    const { dialog } = renderPage();
    await clickReturn();
    await vi.waitFor(() => expect(dialog()?.open).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(dialog()?.open).toBe(false);
    await expectReturnedView();
  });

  it('CP-15: 完了ダイアログを OK を押さずに閉じても（Esc キー）、返却済みの表示に切り替わる', async () => {
    mockFetch(() => Response.json(RETURNED_LOAN));
    const { dialog } = renderPage();
    await clickReturn();
    await vi.waitFor(() => expect(dialog()?.open).toBe(true));
    act(() => dialog()!.close());
    await expectReturnedView();
  });

  it('CP-16: 409 のときは完了ダイアログを開かず、「この本はすでに返却済みです」と取り直した返却済みの表示にする', async () => {
    let loan: object = BORROWED_LOAN;
    mockFetch(
      () => {
        // ほかの画面で先に返された
        loan = RETURNED_LOAN;
        return new Response(null, { status: 409 });
      },
      () => loan,
    );
    const { dialog } = renderPage();
    await clickReturn();
    expect(await screen.findByText('この本はすでに返却済みです')).toBeTruthy();
    expect(dialog()?.open).toBe(false);
    await expectReturnedView();
  });

  it('CP-17: 500 のときは完了ダイアログを開かず、「返却できませんでした」を表示する', async () => {
    mockFetch(() => new Response(null, { status: 500 }));
    const { dialog } = renderPage();
    await clickReturn();
    expect(await screen.findByText('返却できませんでした')).toBeTruthy();
    expect(dialog()?.open).toBe(false);
    expect(screen.getByRole('button', { name: '返す' })).toBeTruthy();
  });
});
