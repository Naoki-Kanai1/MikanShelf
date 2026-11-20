// @vitest-environment jsdom
// 貸出一覧の絞り込みのタブを、画面の名前の下に置く変更の単体テスト。
// テストケースの一覧は tests/loanListFilterPosition/cases.md
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoanListPage from './LoanListPage';

// テストでは CSS を import しても中身が空になる（?raw でも同じ）ため、ファイルを直接読む
const css = readFileSync(resolve(__dirname, '../styles/LoanListPage.css'), 'utf8');

const BORROWED = {
  id: 1,
  book_id: 1,
  title: '貸出中の本A',
  authors: '著者A',
  location: '3階 書架A',
  status: 'borrowed',
  borrower_name: 'テスト太郎',
  borrowed_at: '2026-11-01 01:00:00',
  returned_at: null,
};

// fetch を作り物に差し替える（本物のサーバーには通信しない）
function mockFetch(impl: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/loans']}>
      <Routes>
        <Route path="/loans" element={<LoanListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// 画面の名前の帯（header）と、絞り込みのタブのまとまり
const header = () => screen.getByRole('heading', { name: '借りている本' }).closest('header')!;
const filter = () => screen.getByRole('group', { name: '表示する貸出' });

// a が b より前（画面の上）にあるか
const isBefore = (a: Node, b: Node) =>
  (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

// CSS の中から `@media (min-width: 840px) { ... }` の中身を取り出す
function expandedMediaBlock(source: string): string {
  const start = source.indexOf('@media (min-width: 840px)');
  if (start < 0) throw new Error('840px の @media が見つかりません');
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(open + 1, i);
  }
  throw new Error('840px の @media の終わりが見つかりません');
}

// 指定したセレクタだけのルールの中身（{ } の中）を全部取り出す
function rulesFor(source: string, selector: RegExp): string[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of withoutComments.matchAll(re)) {
    if (selector.test(m[1].trim())) rules.push(m[2]);
  }
  return rules;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoanListPage: 絞り込みのタブの位置', () => {
  it('FP-01: 画面の名前「借りている本」の帯のすぐ後ろ（下）に、絞り込みのタブのまとまりがある', () => {
    mockFetch(async () => Response.json([]));
    renderPage();
    expect(header().nextElementSibling).toBe(filter());
  });

  it('FP-02: 上から「画面の名前」「絞り込みのタブ」「一覧」の順に並ぶ', async () => {
    mockFetch(async () => Response.json([BORROWED]));
    renderPage();
    await screen.findByText('貸出中の本A');
    const list = screen.getByRole('list');
    expect(isBefore(header(), filter())).toBe(true);
    expect(isBefore(filter(), list)).toBe(true);
  });

  it('FP-03: 読み込み中も、画面の名前のすぐ後ろにタブがあり、その後ろに「読み込み中…」がある', () => {
    mockFetch(() => new Promise<Response>(() => {}));
    renderPage();
    expect(header().nextElementSibling).toBe(filter());
    expect(isBefore(filter(), screen.getByText('読み込み中…'))).toBe(true);
  });

  it('FP-04: エラーのときも、画面の名前のすぐ後ろにタブがあり、その後ろにエラーの文がある', async () => {
    mockFetch(async () => new Response('error', { status: 500 }));
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(header().nextElementSibling).toBe(filter());
    expect(isBefore(filter(), alert)).toBe(true);
  });
});

describe('LoanListPage.css: 絞り込みのタブの位置', () => {
  it('FP-05: 幅 840px 以上で、画面全体（.loan-list-page）を横に並べる grid にしていない', () => {
    const rules = rulesFor(expandedMediaBlock(css), /^\.loan-list-page$/);
    for (const body of rules) {
      expect(body).not.toMatch(/display\s*:\s*grid/);
      expect(body).not.toMatch(/grid-template-columns/);
    }
  });

  it('FP-06: 幅 840px 以上で、画面の名前とタブの置き場所（grid-column）を指定していない', () => {
    const rules = rulesFor(
      expandedMediaBlock(css),
      /\.loan-list-page\s*>\s*(\*|\.page-header|\.loan-filter)/,
    );
    expect(rules).toEqual([]);
  });

  it('FP-07: タブ（.loan-filter）の左右の余白は --page-padding-inline のままで、上書きしない', () => {
    const rules = rulesFor(css, /(^|\s|>)\.loan-filter$/);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatch(/padding\s*:\s*8px var\(--page-padding-inline\)/);
  });
});
