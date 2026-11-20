// @vitest-environment jsdom
// 本一覧・貸出一覧の読み込み中・エラー・0件の文が、共通の .page-message を使うことの単体テスト。
// テストケースの一覧は tests/applyCommonStyle/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookListStateProvider } from '../state/BookListStateProvider';
import BookListPage from './BookListPage';
import LoanListPage from './LoanListPage';

function renderBookList() {
  // jsdom には画面のスクロールが無いので、本一覧画面がスクロール位置を戻す処理は作り物にする
  vi.stubGlobal('scrollTo', vi.fn());
  return render(
    <BookListStateProvider>
      <MemoryRouter>
        <BookListPage />
      </MemoryRouter>
    </BookListStateProvider>,
  );
}

function renderLoanList() {
  return render(
    <MemoryRouter>
      <LoanListPage />
    </MemoryRouter>,
  );
}

const pending = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  );
const failing = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 500 })),
  );
const empty = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json([])),
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('一覧画面の文の共通のスタイル', () => {
  it('CS-13: 本一覧の読み込み中・エラー・0件の文は、どれも共通の .page-message', async () => {
    pending();
    renderBookList();
    expect(screen.getByText('読み込み中…').className).toBe('page-message');
    cleanup();

    failing();
    renderBookList();
    expect((await screen.findByRole('alert')).className).toBe('page-message');
    cleanup();

    empty();
    const view = renderBookList();
    expect((await screen.findByText('登録されている本はまだありません。')).className).toBe(
      'page-message',
    );
    expect(view.container.querySelector('.book-list-page__message')).toBeNull();
  });

  it('CS-14: 貸出一覧の読み込み中・エラー・0件の文は、どれも共通の .page-message', async () => {
    pending();
    renderLoanList();
    expect(screen.getByText('読み込み中…').className).toBe('page-message');
    cleanup();

    failing();
    renderLoanList();
    expect((await screen.findByRole('alert')).className).toBe('page-message');
    cleanup();

    empty();
    const view = renderLoanList();
    expect((await screen.findByText('いま借りている本はありません。')).className).toBe(
      'page-message',
    );
    expect(view.container.querySelector('.loan-list-page__message')).toBeNull();
  });
});
