// @vitest-environment jsdom
// 状態の印（StatusChip）の単体テスト。テストケースの一覧は tests/bookList/cases.md
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

describe('StatusChip', () => {
  it('BL-12: available のときは「借りられる」を表示し、available のクラスが付く', () => {
    const chip = renderChip({ status: 'available' });
    expect(chip.textContent).toBe('借りられる');
    expect(chip.classList.contains('status-chip--available')).toBe(true);
    expect(chip.classList.contains('status-chip--borrowed')).toBe(false);
  });

  it('BL-13: borrowed のときは「誰かが借用中」を表示し、borrowed のクラスが付く', () => {
    const chip = renderChip({ status: 'borrowed' });
    expect(chip.textContent).toBe('誰かが借用中');
    expect(chip.classList.contains('status-chip--borrowed')).toBe(true);
    expect(chip.classList.contains('status-chip--available')).toBe(false);
  });

  it('BL-14: className を渡すと、もとのクラスに加えて付く', () => {
    const chip = renderChip({ status: 'borrowed', className: 'book-row__status' });
    expect(chip.className).toBe('status-chip status-chip--borrowed book-row__status');
  });

  it('BL-15: className を渡さないときは、末尾に余分な空白が付かない', () => {
    const chip = renderChip({ status: 'available' });
    expect(chip.className).toBe('status-chip status-chip--available');
  });

  it('BL-16: どちらの状態でも、色だけでなく印（アイコン）が付く', () => {
    expect(renderChip({ status: 'available' }).querySelectorAll('svg')).toHaveLength(1);
    cleanup();
    expect(renderChip({ status: 'borrowed' }).querySelectorAll('svg')).toHaveLength(1);
  });
});
