// @vitest-environment jsdom
// 本詳細画面の「借りる」と完了ダイアログの単体テスト。テストケースの一覧は tests/completionDialog/cases.md
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookDetail from './BookDetail';
import { installDialogPolyfill } from './test/dialogPolyfill';

installDialogPolyfill();

const BOOK = {
  id: 1,
  title: 'テスト駆動開発',
  authors: 'Kent Beck',
  location: '3階 書架A',
  is_restricted: 0,
  status: 'available',
  borrower_name: null,
};

// fetch を作り物に差し替える。本の取得には BOOK を返し、借りる API には borrowResponse を返す
function mockFetch(borrowResponse: () => Response) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/books/1/borrow' && init?.method === 'POST') return borrowResponse();
    if (url === '/api/books/1') return Response.json(BOOK);
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// 本詳細画面を開く。借りたあとの移動先として、貸出の詳細画面の代わりの目印を置く
function renderPage() {
  const view = render(
    <MemoryRouter initialEntries={['/books/1']}>
      <Routes>
        <Route path="/books/:bookId" element={<BookDetail bookId={1} />} />
        <Route path="/loans/9" element={<p>貸出の詳細画面（テスト用）</p>} />
      </Routes>
    </MemoryRouter>,
  );
  const dialog = () => view.container.querySelector('dialog');
  return { view, dialog };
}

const clickBorrow = async () => {
  await userEvent.click(await screen.findByRole('button', { name: '借りる' }));
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BookDetail の借りる', () => {
  it('CP-05: 「借りる」を押すと、確認ダイアログを出さずに POST /api/books/1/borrow を1回呼ぶ', async () => {
    const fetchMock = mockFetch(() => Response.json({ id: 9 }));
    renderPage();
    await clickBorrow();
    expect(screen.queryByText('この本を借りますか？')).toBeNull();
    const borrowCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/books/1/borrow');
    expect(borrowCalls).toHaveLength(1);
    expect(borrowCalls[0][1]?.method).toBe('POST');
  });

  it('CP-06: 借りられると「本を借りました！」のダイアログが開き、OK を押すまでは本の詳細画面のまま', async () => {
    mockFetch(() => Response.json({ id: 9 }));
    const { dialog } = renderPage();
    await clickBorrow();
    expect(await screen.findByText('本を借りました！')).toBeTruthy();
    expect(dialog()?.open).toBe(true);
    expect(screen.getByRole('heading', { name: 'テスト駆動開発' })).toBeTruthy();
    expect(screen.queryByText('貸出の詳細画面（テスト用）')).toBeNull();
  });

  it('CP-07: 完了ダイアログの「OK」を押すと、貸出の詳細画面（/loans/9）へ移動する', async () => {
    mockFetch(() => Response.json({ id: 9 }));
    const { dialog } = renderPage();
    await clickBorrow();
    await vi.waitFor(() => expect(dialog()?.open).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(await screen.findByText('貸出の詳細画面（テスト用）')).toBeTruthy();
  });

  it('CP-08: 完了ダイアログを OK を押さずに閉じても（Esc キー）、貸出の詳細画面へ移動する', async () => {
    mockFetch(() => Response.json({ id: 9 }));
    const { dialog } = renderPage();
    await clickBorrow();
    await vi.waitFor(() => expect(dialog()?.open).toBe(true));
    act(() => dialog()!.close());
    expect(await screen.findByText('貸出の詳細画面（テスト用）')).toBeTruthy();
  });

  it('CP-09: 409 のときは完了ダイアログを開かず、「この本はすでに貸出中です」を表示する', async () => {
    mockFetch(() => new Response(null, { status: 409 }));
    const { dialog } = renderPage();
    await clickBorrow();
    expect(await screen.findByText('この本はすでに貸出中です')).toBeTruthy();
    expect(dialog()?.open).toBe(false);
    expect(screen.queryByText('貸出の詳細画面（テスト用）')).toBeNull();
  });

  it('CP-10: 403 のときは完了ダイアログを開かず、「この本は持ち出し禁止のため貸出できません」を表示する', async () => {
    mockFetch(() => new Response(null, { status: 403 }));
    const { dialog } = renderPage();
    await clickBorrow();
    expect(await screen.findByText('この本は持ち出し禁止のため貸出できません')).toBeTruthy();
    expect(dialog()?.open).toBe(false);
    expect(screen.queryByText('貸出の詳細画面（テスト用）')).toBeNull();
  });

  it('CP-11: 500 のときは完了ダイアログを開かず、「借りられませんでした」を表示する', async () => {
    mockFetch(() => new Response(null, { status: 500 }));
    const { dialog } = renderPage();
    await clickBorrow();
    expect(await screen.findByText('借りられませんでした')).toBeTruthy();
    expect(dialog()?.open).toBe(false);
    expect(screen.queryByText('貸出の詳細画面（テスト用）')).toBeNull();
  });
});
