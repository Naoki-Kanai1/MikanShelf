// @vitest-environment jsdom
// 本詳細画面が共通のアイコン・文を使うことの単体テスト。テストケースの一覧は tests/applyCommonStyle/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookDetail from './BookDetail';
import { BookIcon } from './components/icons';

const book = {
  id: 1,
  title: 'テスト駆動開発',
  authors: 'Kent Beck',
  location: '3階 書架A',
  is_restricted: 0,
  status: 'available',
  borrower_name: null,
  on_shelf_count: 1,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <BookDetail bookId={1} />
    </MemoryRouter>,
  );
}

// 「この棚にある冊数」などの見出しから、その行のアイコン（.info-icon）を取り出す
const iconOf = (label: string) =>
  screen.getByText(label).closest('.info-row')!.querySelector('.info-icon')!;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BookDetail の共通のスタイル', () => {
  it('CS-04: 情報のカードの4つのアイコンは共通のアイコンで、「この棚にある冊数」は BookIcon と同じ形', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(book)),
    );
    const view = renderPage();
    await screen.findByText(book.title);

    const svgs = Array.from(view.container.querySelectorAll('.info-icon svg'));
    expect(svgs).toHaveLength(4);
    for (const svg of svgs) expect(svg.getAttribute('class')).toBe('icon');

    const expected = render(<BookIcon />).container.innerHTML;
    expect(iconOf('この棚にある冊数').innerHTML).toBe(expected);
  });

  it('CS-05: 応答が返ってくる前は、「読み込み中…」を .page-message で出す', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );
    renderPage();
    expect(screen.getByText('読み込み中…').className).toBe('page-message');
  });

  it('CS-06: 本を読み込んだあとは、「読み込み中…」を出さない', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(book)),
    );
    renderPage();
    await screen.findByText(book.title);
    expect(screen.queryByText('読み込み中…')).toBeNull();
  });

  it('CS-07: 読み込めなかったときは、エラーの文を role="alert" の赤の .page-message で出す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('本の情報を取得できませんでした');
    expect(alert.className).toBe('page-message page-message--error');
    expect(screen.queryByText('読み込み中…')).toBeNull();
  });
});
