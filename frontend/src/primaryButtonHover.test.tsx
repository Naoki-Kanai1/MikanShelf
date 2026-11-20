// @vitest-environment jsdom
// 画面のメインのボタン（借りる・返す）にホバーを付けたことの単体テスト。テストケースの一覧は tests/primaryButtonHover/cases.md
// CSS のファイルを直接読むため、このテストだけ Node の型を使う
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookDetail from './BookDetail';
import LoanDetail from './LoanDetail';

// BookDetail.css を jsdom に読ませて、決まり（選び方ごとの CSSStyleRule）を取り出す。
// Vitest では CSS を import すると中身が空になるため、ファイルを直接読む（テストはリポジトリのルートで実行する）
const css = readFileSync(resolve(process.cwd(), 'frontend/src/BookDetail.css'), 'utf8');

function cssRule(selector: string): CSSStyleRule | undefined {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  const rules = Array.from(style.sheet!.cssRules) as CSSStyleRule[];
  style.remove();
  return rules.find((r) => r.selectorText === selector);
}

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

const borrowedLoan = {
  id: 5,
  book_id: 1,
  title: 'テスト駆動開発',
  authors: 'Kent Beck',
  location: '3階 書架A',
  status: 'borrowed',
  borrower_name: '田中',
  borrowed_at: '2026-11-10 01:00:00',
  returned_at: null,
  on_shelf_count: 0,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('.primary-button のホバー（BookDetail.css）', () => {
  it('PH-01: マウスを重ねたとき、文字の色を背景に 16% 重ねる', () => {
    const rule = cssRule('.primary-button:hover:not(:disabled)');
    expect(rule).toBeDefined();
    expect(rule!.style.getPropertyValue('background').replace(/\s+/g, ' ')).toBe(
      'color-mix(in srgb, var(--color-on-primary) 16%, var(--color-primary))',
    );
  });

  it('PH-02: 押せないときはホバーの対象外で、押せないときの背景はそのまま', () => {
    expect(cssRule('.primary-button:hover')).toBeUndefined();
    const disabled = cssRule('.primary-button:disabled');
    expect(disabled!.style.getPropertyValue('background')).toBe('var(--color-disabled)');
  });
});

describe('ホバーの対象のボタン', () => {
  it('PH-03: 本詳細（借りられる本）の「借りる」は .primary-button で、押せる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(book)),
    );
    render(
      <MemoryRouter>
        <BookDetail bookId={1} />
      </MemoryRouter>,
    );
    const button = await screen.findByRole('button', { name: '借りる' });
    expect(button.className).toBe('primary-button');
    expect(button).not.toHaveProperty('disabled', true);
  });

  it('PH-04: 本詳細（貸出中の本）のボタンは .primary-button で、押せない', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ ...book, status: 'borrowed', borrower_name: '田中', on_shelf_count: 0 }),
      ),
    );
    const view = render(
      <MemoryRouter>
        <BookDetail bookId={1} />
      </MemoryRouter>,
    );
    await screen.findByText(book.title);
    const button = view.container.querySelector<HTMLButtonElement>('.primary-button')!;
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(true);
  });

  it('PH-05: 貸出詳細（貸出中）の「返す」は .primary-button で、押せる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(borrowedLoan)),
    );
    render(
      <MemoryRouter>
        <LoanDetail loanId={5} />
      </MemoryRouter>,
    );
    const button = await screen.findByRole('button', { name: '返す' });
    expect(button.className).toBe('primary-button');
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });
});
