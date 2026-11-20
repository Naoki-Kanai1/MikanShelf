// @vitest-environment jsdom
// 本詳細画面の「状態」の欄の単体テスト。テストケースの一覧は tests/bookStatusChip/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookDetail from './BookDetail';

const makeBook = (overrides: { is_restricted: 0 | 1; status: 'available' | 'borrowed' }) => ({
  id: 1,
  title: 'テスト駆動開発',
  authors: 'Kent Beck',
  location: '3階 書架A',
  borrower_name: overrides.status === 'borrowed' ? '佐藤' : null,
  on_shelf_count: overrides.status === 'borrowed' ? 0 : 1,
  ...overrides,
});

// 本の取得 API を作り物に差し替えて、本詳細画面を開く
function renderWith(book: ReturnType<typeof makeBook>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(book)),
  );
  render(
    <MemoryRouter>
      <BookDetail bookId={1} />
    </MemoryRouter>,
  );
}

// 「状態」の欄にある印（.status-chip）を取り出す
async function findStatusChip() {
  const label = await screen.findByText('状態');
  const chips = label.parentElement!.querySelectorAll('.status-chip');
  expect(chips).toHaveLength(1);
  return chips[0] as HTMLElement;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BookDetail の状態の欄', () => {
  it('SC-04: 持ち出し禁止で棚にある本は「持ち出し禁止」を出し、「借りられる」は出さない', async () => {
    renderWith(makeBook({ is_restricted: 1, status: 'available' }));
    const chip = await findStatusChip();
    expect(chip.textContent).toBe('持ち出し禁止');
    expect(chip.classList.contains('status-chip--restricted')).toBe(true);
    expect(screen.queryByText('借りられる')).toBeNull();
  });

  it('SC-05: 持ち出し禁止でなく棚にある本は「借りられる」を出す', async () => {
    renderWith(makeBook({ is_restricted: 0, status: 'available' }));
    expect((await findStatusChip()).textContent).toBe('借りられる');
  });

  it('SC-06: 持ち出し禁止でなく借りられている本は「誰かが借用中」を出す', async () => {
    renderWith(makeBook({ is_restricted: 0, status: 'borrowed' }));
    expect((await findStatusChip()).textContent).toBe('誰かが借用中');
  });

  it('SC-07: 持ち出し禁止なのに借りられているデータでは、実際の状態の「誰かが借用中」を出す', async () => {
    renderWith(makeBook({ is_restricted: 1, status: 'borrowed' }));
    expect((await findStatusChip()).textContent).toBe('誰かが借用中');
  });
});
