// @vitest-environment jsdom
// タブレット・PC 版のメニュー（NavigationRail）の単体テスト。テストケースの一覧は tests/responsiveLayout/cases.md
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import NavigationRail from './NavigationRail';

afterEach(() => {
  cleanup();
});

// path の画面を開いているときのメニューを表示し、メニューの中のリンクを返す
function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavigationRail />
    </MemoryRouter>,
  );
  return within(screen.getByRole('navigation', { name: 'メニュー' })).getAllByRole('link');
}

describe('NavigationRail', () => {
  it('RL-08: 3項目が、下のメニューと同じ順・同じリンク先で並ぶ', () => {
    const links = renderAt('/books');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/books',
      '/loans',
      '/requests',
    ]);
    // 改行（<br>）は文字に含まれないので、名前はつながって見える
    expect(links.map((link) => link.textContent)).toEqual([
      '本一覧',
      '借りている本',
      '蔵書リクエスト',
    ]);
  });

  it('RL-09: 「蔵書リクエスト」は「蔵書」と「リクエスト」の間で改行する', () => {
    const label = renderAt('/books')[2].querySelector('.navigation-rail__label');
    expect(label?.innerHTML).toBe('蔵書<br>リクエスト');
  });

  it('RL-10: 改行の指定がない「本一覧」「借りている本」は、そのままの名前を出す', () => {
    const links = renderAt('/books');
    for (const [index, name] of [
      [0, '本一覧'],
      [1, '借りている本'],
    ] as const) {
      const label = links[index].querySelector('.navigation-rail__label');
      expect(label?.innerHTML).toBe(name);
    }
  });

  it('RL-11: 貸出詳細（/loans/2）を開いているときは「借りている本」だけが選択中になる', () => {
    const selected = renderAt('/loans/2')
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.textContent);
    expect(selected).toEqual(['借りている本']);
  });

  it('RL-12: 各項目に、印（アイコン）が1つずつ付く', () => {
    for (const link of renderAt('/books')) {
      expect(link.querySelectorAll('svg')).toHaveLength(1);
    }
  });
});
