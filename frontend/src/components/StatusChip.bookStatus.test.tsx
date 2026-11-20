// @vitest-environment jsdom
// 状態の印（StatusChip）の見直しの単体テスト。テストケースの一覧は tests/bookStatusChip/cases.md
import { cleanup, render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import StatusChip from './StatusChip';

afterEach(() => {
  cleanup();
});

// 印の要素（いちばん外側の span）を取り出す
const renderChip = (props: ComponentProps<typeof StatusChip>) =>
  render(<StatusChip {...props} />).container.firstElementChild as HTMLElement;

describe('StatusChip（状態の印の見直し）', () => {
  it('SC-01: borrowed のときは「誰かが借用中」を表示し、「貸出中」とは出さない', () => {
    const chip = renderChip({ status: 'borrowed' });
    expect(chip.textContent).toBe('誰かが借用中');
    expect(chip.textContent).not.toContain('貸出中');
    expect(chip.classList.contains('status-chip--borrowed')).toBe(true);
  });

  it('SC-02: 持ち出し禁止でも borrowed のデータなら、実際の状態の「誰かが借用中」を表示する', () => {
    const chip = renderChip({ status: 'borrowed', restricted: true });
    expect(chip.textContent).toBe('誰かが借用中');
  });

  it('SC-03: 3つの状態のどれにも、共通の status-chip のクラスが付く', () => {
    const cases: ComponentProps<typeof StatusChip>[] = [
      { status: 'available' },
      { status: 'borrowed' },
      { status: 'available', restricted: true },
    ];
    for (const props of cases) {
      expect(renderChip(props).classList.contains('status-chip')).toBe(true);
      cleanup();
    }
  });
});
