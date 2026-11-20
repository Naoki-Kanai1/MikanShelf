// @vitest-environment jsdom
// 貸出詳細画面が共通のアイコン・文を使うことの単体テスト。テストケースの一覧は tests/applyCommonStyle/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoanDetail from './LoanDetail';

const returnedLoan = {
  id: 5,
  book_id: 1,
  title: 'テスト駆動開発',
  authors: 'Kent Beck',
  location: '3階 書架A',
  status: 'returned',
  borrower_name: '田中',
  borrowed_at: '2026-11-10 01:00:00',
  returned_at: '2026-11-12 01:00:00',
  on_shelf_count: 1,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <LoanDetail loanId={5} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoanDetail の共通のスタイル', () => {
  it('CS-08: 情報のカードの5つのアイコンと「本の詳細を見る」の「›」は、共通のアイコン', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(returnedLoan)),
    );
    const view = renderPage();
    await screen.findByText(returnedLoan.title);

    const svgs = Array.from(view.container.querySelectorAll('.info-icon svg'));
    expect(svgs).toHaveLength(5);
    for (const svg of svgs) expect(svg.getAttribute('class')).toBe('icon');

    const chevron = screen.getByRole('link', { name: '本の詳細を見る' }).querySelector('svg')!;
    expect(chevron.getAttribute('class')).toBe('icon');
  });

  it('CS-09: 「返した日」のチェックは、「返却済み」の印のチェックとまったく同じ形', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(returnedLoan)),
    );
    renderPage();
    const label = await screen.findByText('返した日');
    const dateCheck = label.closest('.info-row')!.querySelector('.info-icon svg')!;
    const chipCheck = screen.getByText('返却済み').querySelector('svg')!;
    expect(dateCheck.outerHTML).toBe(chipCheck.outerHTML);
  });

  it('CS-10: 応答が返ってくる前は、「読み込み中…」を .page-message で出し、画面の名前は空', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );
    renderPage();
    expect(screen.getByText('読み込み中…').className).toBe('page-message');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('');
  });

  it('CS-11: 貸出が見つからないときは、「貸出が見つかりません」を role="alert" の赤の .page-message で出す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 404 })),
    );
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('貸出が見つかりません');
    expect(alert.className).toBe('page-message page-message--error');
    expect(screen.queryByText('読み込み中…')).toBeNull();
  });
});
