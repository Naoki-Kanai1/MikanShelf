// @vitest-environment jsdom
// 本詳細画面の「棚にある冊数」の単体テスト。テストケースの一覧は tests/bookStock/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookDetail from './BookDetail';
import { installDialogPolyfill } from './test/dialogPolyfill';

installDialogPolyfill();

type Book = {
  id: number;
  title: string;
  authors: string;
  location: string;
  is_restricted: 0 | 1;
  status: 'available' | 'borrowed';
  borrower_name: string | null;
  on_shelf_count: number;
};

// テスト用の本。必要な項目だけ上書きして使う
function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 1,
    title: 'リーダブルコード',
    authors: 'Dustin Boswell、Trevor Foucher',
    location: '3階 書架A',
    is_restricted: 0,
    status: 'available',
    borrower_name: null,
    on_shelf_count: 1,
    ...overrides,
  };
}

// GET /api/books/:id を作り物に差し替える（本物のサーバーには通信しない）
function respondWith(book: Book) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(book)),
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BookDetail bookId={1} />
    </MemoryRouter>,
  );
}

// 情報カードの項目の見出しを、上から順に並べる
const labels = () =>
  Array.from(document.querySelectorAll('.info-label')).map((el) => el.textContent);

// 見出しの隣に表示している値
const valueOf = (label: string) =>
  screen.getByText(label).parentElement?.querySelector('.info-value')?.textContent;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BookDetail', () => {
  it('BS-09: on_shelf_count が 2 なら、「棚にある冊数」に「2冊」と表示する', async () => {
    respondWith(makeBook({ on_shelf_count: 2 }));
    renderPage();
    expect(await screen.findByText('棚にある冊数')).toBeTruthy();
    expect(valueOf('棚にある冊数')).toBe('2冊');
  });

  it('BS-10: on_shelf_count が 0 なら「0冊」と表示する', async () => {
    respondWith(makeBook({ status: 'borrowed', borrower_name: '佐藤', on_shelf_count: 0 }));
    renderPage();
    await screen.findByText('棚にある冊数');
    expect(valueOf('棚にある冊数')).toBe('0冊');
  });

  it('BS-11: 「棚にある冊数」は「状態」のすぐ下に並ぶ', async () => {
    respondWith(makeBook());
    renderPage();
    await screen.findByText('棚にある冊数');
    expect(labels()).toEqual(['置き場所', '状態', '棚にある冊数', 'いま借りている人']);
  });
});
