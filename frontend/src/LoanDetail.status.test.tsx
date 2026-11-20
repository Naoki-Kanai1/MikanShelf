// @vitest-environment jsdom
// 貸出詳細画面の「状態」の欄の単体テスト。テストケースの一覧は tests/bookStatusChip/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoanDetail from './LoanDetail';

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoanDetail の状態の欄', () => {
  it('SC-10: 借りている貸出では、「状態」の欄の印は「あなたが借りています」', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(BORROWED_LOAN)),
    );
    render(
      <MemoryRouter>
        <LoanDetail loanId={5} />
      </MemoryRouter>,
    );
    const label = await screen.findByText('状態');
    const chips = label.parentElement!.querySelectorAll('.status-chip');
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toBe('あなたが借りています');
  });
});
