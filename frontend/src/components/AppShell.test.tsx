// @vitest-environment jsdom
// 共通の枠（AppShell）の単体テスト。テストケースの一覧は tests/responsiveLayout/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import AppShell from './AppShell';

afterEach(() => {
  cleanup();
});

// 枠の中に、テスト用の画面（本・貸出）を置いて開く
function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/books" element={<p>本の画面（テスト用）</p>} />
          <Route path="/loans" element={<p>貸出の画面（テスト用）</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('RL-13: 開いた画面の中身を main の中に表示する', () => {
    renderShell('/books');
    expect(screen.getByRole('main').textContent).toBe('本の画面（テスト用）');
  });

  it('RL-14: 枠の中に、下のメニューと左のメニューの両方を置く', () => {
    const { container } = renderShell('/books');
    // 画面の幅による切り替えは、AppShell.css がこのクラス名を使って行う
    const shell = container.querySelector('.app-shell');
    expect(shell).not.toBeNull();
    expect(shell?.querySelectorAll(':scope > .navigation-bar')).toHaveLength(1);
    expect(shell?.querySelectorAll(':scope > .navigation-rail')).toHaveLength(1);
    expect(screen.getAllByRole('navigation', { name: 'メニュー' })).toHaveLength(2);
  });

  it('RL-15: メニューで別の画面に移動すると、main の中身だけが変わる', async () => {
    const { container } = renderShell('/books');
    const bar = container.querySelector('.navigation-bar') as HTMLElement;
    const rail = container.querySelector('.navigation-rail') as HTMLElement;

    await userEvent.click(screen.getAllByRole('link', { name: '借りている本' })[0]);

    expect(screen.getByRole('main').textContent).toBe('貸出の画面（テスト用）');
    // メニューは作り直されず、同じものが残っている
    expect(container.querySelector('.navigation-bar')).toBe(bar);
    expect(container.querySelector('.navigation-rail')).toBe(rail);
  });
});
