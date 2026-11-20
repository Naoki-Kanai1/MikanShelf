// @vitest-environment jsdom
// 本一覧画面の、絞り込みを画面の上に残す帯の単体テスト。テストケースの一覧は tests/stickyBookSearch/cases.md
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookListStateProvider } from '../state/BookListStateProvider';
import BookListPage from './BookListPage';

const BOOKS = [
  {
    id: 1,
    title: 'リーダブルコード',
    authors: 'Dustin Boswell',
    location: '横浜 14F SD部',
    is_restricted: 0,
    status: 'available',
    borrower_name: null,
    borrowed_at: null,
    created_at: '2026-11-01 00:00:00',
  },
];

// ResizeObserver の作り物。監視している要素と、大きさが変わったことを知らせる関数を持つ
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  targets: Element[] = [];
  disconnected = false;
  constructor(private callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  // 監視している要素の高さを height にして、大きさが変わったことを知らせる（jsdom では offsetHeight がいつも 0）
  resize(height: number) {
    for (const target of this.targets) {
      Object.defineProperty(target, 'offsetHeight', { configurable: true, value: height });
    }
    act(() => this.callback([], this as unknown as ResizeObserver));
  }
}

function renderPage() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(BOOKS)),
  );
  vi.stubGlobal('scrollTo', vi.fn());
  return render(
    <BookListStateProvider>
      <MemoryRouter initialEntries={['/books']}>
        <Routes>
          <Route path="/books" element={<BookListPage />} />
        </Routes>
      </MemoryRouter>
    </BookListStateProvider>,
  );
}

function band() {
  return document.querySelector('.book-search')!;
}

function scrollPaddingTop() {
  return document.documentElement.style.scrollPaddingTop;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  FakeResizeObserver.instances = [];
  document.documentElement.style.removeProperty('scroll-padding-top');
});

describe('BookListPage（絞り込みを画面の上に残す帯）', () => {
  it('SS-01: 検索ボックスと、場所・ステータスの選択肢が、どちらも同じ帯の中にある', async () => {
    renderPage();
    await screen.findByText('リーダブルコード');
    const search = screen.getByRole('search');
    expect(search).toBe(band());
    expect(search.contains(screen.getByRole('searchbox', { name: '題名・著者で絞り込む' }))).toBe(
      true,
    );
    expect(
      search.contains(screen.getByRole('region', { name: '場所・ステータスで絞り込む' })),
    ).toBe(true);
  });

  it('SS-02: 画面を開くと、帯の大きさの監視を始める', async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    renderPage();
    await screen.findByText('リーダブルコード');
    expect(FakeResizeObserver.instances).toHaveLength(1);
    expect(FakeResizeObserver.instances[0].targets).toEqual([band()]);
  });

  it('SS-03: 帯の高さが 72px なら、scroll-padding-top を 72px にする', async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    renderPage();
    await screen.findByText('リーダブルコード');
    FakeResizeObserver.instances[0].resize(72);
    expect(scrollPaddingTop()).toBe('72px');
  });

  it('SS-04: 帯の高さが 72px から 204px に変わると、scroll-padding-top も 204px に変える', async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    renderPage();
    await screen.findByText('リーダブルコード');
    const observer = FakeResizeObserver.instances[0];
    observer.resize(72);
    observer.resize(204);
    expect(scrollPaddingTop()).toBe('204px');
  });

  it('SS-05: 画面を離れると、監視をやめ、scroll-padding-top を消す', async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const { unmount } = renderPage();
    await screen.findByText('リーダブルコード');
    const observer = FakeResizeObserver.instances[0];
    observer.resize(72);
    unmount();
    expect(observer.disconnected).toBe(true);
    expect(scrollPaddingTop()).toBe('');
  });

  it('SS-06: ResizeObserver が無い環境でも、エラーにならずに一覧を表示し、scroll-padding-top を付けない', async () => {
    vi.stubGlobal('ResizeObserver', undefined);
    renderPage();
    expect(await screen.findByText('リーダブルコード')).toBeTruthy();
    expect(scrollPaddingTop()).toBe('');
  });
});
