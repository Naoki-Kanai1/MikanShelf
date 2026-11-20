// @vitest-environment jsdom
// スマホ版のメニュー（NavigationBar）の単体テスト。テストケースの一覧は tests/responsiveLayout/cases.md
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import NavigationBar from './NavigationBar';

afterEach(() => {
  cleanup();
});

// path の画面を開いているときのメニューを表示し、メニューの中のリンクを返す
function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavigationBar />
    </MemoryRouter>,
  );
  return within(screen.getByRole('navigation', { name: 'メニュー' })).getAllByRole('link');
}

// 選択中（aria-current="page"）の項目の名前
const selectedLabels = (links: HTMLElement[]) =>
  links.filter((link) => link.getAttribute('aria-current') === 'page').map((l) => l.textContent);

describe('NavigationBar', () => {
  it('RL-01: 「メニュー」のナビゲーションに、本一覧・借りている本・蔵書リクエストの順に並ぶ', () => {
    const links = renderAt('/books');
    expect(links.map((link) => link.textContent)).toEqual([
      '本一覧',
      '借りている本',
      '蔵書リクエスト',
    ]);
  });

  it('RL-02: リンク先は /books、/loans、/requests', () => {
    const links = renderAt('/books');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/books',
      '/loans',
      '/requests',
    ]);
  });

  it('RL-03: /books を開いているときは「本一覧」だけが選択中になる', () => {
    const links = renderAt('/books');
    expect(selectedLabels(links)).toEqual(['本一覧']);
    expect(links[0].classList.contains('active')).toBe(true);
    expect(links[1].classList.contains('active')).toBe(false);
  });

  it('RL-04: 本詳細（/books/3）を開いているときも「本一覧」が選択中になる', () => {
    expect(selectedLabels(renderAt('/books/3'))).toEqual(['本一覧']);
  });

  it('RL-05: 貸出詳細（/loans/1）を開いているときは「借りている本」だけが選択中になる', () => {
    expect(selectedLabels(renderAt('/loans/1'))).toEqual(['借りている本']);
  });

  it('RL-06: ホーム（/）を開いているときは、どの項目も選択中にならない', () => {
    expect(selectedLabels(renderAt('/'))).toEqual([]);
  });

  it('RL-07: 各項目に、印（アイコン）が1つずつ付く', () => {
    for (const link of renderAt('/books')) {
      expect(link.querySelectorAll('svg')).toHaveLength(1);
    }
  });
});
