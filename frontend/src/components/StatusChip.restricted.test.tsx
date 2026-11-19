// @vitest-environment jsdom
// 状態の印（StatusChip）の「持ち出し禁止」の単体テスト。テストケースの一覧は tests/bookListRestrictedLabel/cases.md
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

describe('StatusChip（持ち出し禁止）', () => {
  it('RL-01: 棚にあって持ち出し禁止のときは「持ち出し禁止」だけを表示し、restricted のクラスが付く', () => {
    const chip = renderChip({ status: 'available', restricted: true });
    expect(chip.textContent).toBe('持ち出し禁止');
    expect(chip.className).toBe('status-chip status-chip--restricted');
  });

  it('RL-02: 持ち出し禁止でも貸出中のデータなら、実際の状態の「貸出中」を表示する', () => {
    const chip = renderChip({ status: 'borrowed', restricted: true });
    expect(chip.textContent).toBe('貸出中');
    expect(chip.className).toBe('status-chip status-chip--borrowed');
  });

  it('RL-03: restricted を渡さない、または false のときは、今までどおり「棚にある」を表示する', () => {
    const omitted = renderChip({ status: 'available' });
    expect(omitted.textContent).toBe('棚にある');
    expect(omitted.className).toBe('status-chip status-chip--available');
    cleanup();
    const no = renderChip({ status: 'available', restricted: false });
    expect(no.textContent).toBe('棚にある');
    expect(no.className).toBe('status-chip status-chip--available');
  });

  it('RL-04: 持ち出し禁止の印にも、色だけでなくアイコンが1つ付き、className はもとのクラスに加えて付く', () => {
    const chip = renderChip({
      status: 'available',
      restricted: true,
      className: 'book-row__status',
    });
    expect(chip.querySelectorAll('svg')).toHaveLength(1);
    expect(chip.className).toBe('status-chip status-chip--restricted book-row__status');
  });
});
