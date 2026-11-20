// @vitest-environment jsdom
// 本詳細画面・貸出詳細画面の「状態」の欄のアイコンの単体テスト。テストケースの一覧は tests/statusIcon/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookDetail from './BookDetail';
import LoanDetail from './LoanDetail';

// 開いた本のアイコンの、左右のページの線
const OPEN_BOOK_PATHS = [
  'M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z',
  'M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z',
];
// 前の貸出詳細の、矢印2本のアイコン
const OLD_SWAP_PATH = 'M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4';

const makeBook = (overrides: { is_restricted: 0 | 1; status: 'available' | 'borrowed' }) => ({
  id: 1,
  title: 'テスト駆動開発',
  authors: 'Kent Beck',
  location: '3階 書架A',
  borrower_name: overrides.status === 'borrowed' ? '佐藤' : null,
  on_shelf_count: overrides.status === 'borrowed' ? 0 : 1,
  ...overrides,
});

const makeLoan = (status: 'borrowed' | 'returned') => ({
  id: 5,
  book_id: 1,
  title: 'テスト駆動開発',
  authors: 'Kent Beck',
  location: '3階 書架A',
  status,
  borrower_name: '田中',
  borrowed_at: '2026-11-10 01:00:00',
  returned_at: status === 'returned' ? '2026-11-12 01:00:00' : null,
  on_shelf_count: 1,
});

function stubFetch(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(body)),
  );
}

function renderBookDetail(book: ReturnType<typeof makeBook>) {
  stubFetch(book);
  render(
    <MemoryRouter>
      <BookDetail bookId={1} />
    </MemoryRouter>,
  );
}

function renderLoanDetail(loan: ReturnType<typeof makeLoan>) {
  stubFetch(loan);
  render(
    <MemoryRouter>
      <LoanDetail loanId={5} />
    </MemoryRouter>,
  );
}

// 「状態」の欄（.info-row）のアイコン（.info-icon の svg）を取り出す
async function findStatusIcon() {
  const label = await screen.findByText('状態');
  const row = label.closest('.info-row')!;
  const svg = row.querySelector('.info-icon svg');
  expect(svg).not.toBeNull();
  return svg as SVGSVGElement;
}

function pathsOf(svg: SVGSVGElement) {
  return Array.from(svg.querySelectorAll('path')).map((p) => p.getAttribute('d'));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BookDetail の状態の欄のアイコン', () => {
  it('SI-01: 棚にある本では、「状態」の欄のアイコンが開いた本の形', async () => {
    renderBookDetail(makeBook({ is_restricted: 0, status: 'available' }));
    expect(pathsOf(await findStatusIcon())).toEqual(OPEN_BOOK_PATHS);
  });

  it('SI-02: 前の四角に横線の本のアイコン（rect）は出さない', async () => {
    renderBookDetail(makeBook({ is_restricted: 0, status: 'available' }));
    const svg = await findStatusIcon();
    expect(svg.querySelector('rect')).toBeNull();
  });

  it('SI-03: 誰かが借用中の本・持ち出し禁止の本でも、同じ開いた本のアイコンを出す', async () => {
    renderBookDetail(makeBook({ is_restricted: 0, status: 'borrowed' }));
    expect(pathsOf(await findStatusIcon())).toEqual(OPEN_BOOK_PATHS);
    cleanup();

    renderBookDetail(makeBook({ is_restricted: 1, status: 'available' }));
    expect(pathsOf(await findStatusIcon())).toEqual(OPEN_BOOK_PATHS);
  });
});

describe('LoanDetail の状態の欄のアイコン', () => {
  it('SI-04: 借りている貸出では、「状態」の欄のアイコンが開いた本の形', async () => {
    renderLoanDetail(makeLoan('borrowed'));
    expect(pathsOf(await findStatusIcon())).toEqual(OPEN_BOOK_PATHS);
  });

  it('SI-05: 前の矢印2本のアイコンは出さない', async () => {
    renderLoanDetail(makeLoan('borrowed'));
    expect(pathsOf(await findStatusIcon())).not.toContain(OLD_SWAP_PATH);
  });

  it('SI-06: 返却済みの貸出でも、同じ開いた本のアイコンを出す', async () => {
    renderLoanDetail(makeLoan('returned'));
    expect(pathsOf(await findStatusIcon())).toEqual(OPEN_BOOK_PATHS);
  });

  it('SI-07: 本詳細と貸出詳細の「状態」の欄のアイコンが、まったく同じ形', async () => {
    renderBookDetail(makeBook({ is_restricted: 0, status: 'available' }));
    const bookIcon = (await findStatusIcon()).outerHTML;
    cleanup();

    renderLoanDetail(makeLoan('borrowed'));
    const loanIcon = (await findStatusIcon()).outerHTML;
    expect(loanIcon).toBe(bookIcon);
  });
});
