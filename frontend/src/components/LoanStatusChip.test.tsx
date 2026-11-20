// @vitest-environment jsdom
// 貸出の状態の印（LoanStatusChip）の単体テスト。テストケースの一覧は tests/bookStatusChip/cases.md
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LoanStatusChip from './LoanStatusChip';

afterEach(() => {
  cleanup();
});

const renderChip = (status: 'borrowed' | 'returned') =>
  render(<LoanStatusChip status={status} />).container.firstElementChild as HTMLElement;

describe('LoanStatusChip', () => {
  it('SC-08: borrowed のときは「あなたが借りています」を表示し、「貸出中」とは出さない', () => {
    const chip = renderChip('borrowed');
    expect(chip.textContent).toBe('あなたが借りています');
    expect(chip.textContent).not.toContain('貸出中');
    expect(chip.classList.contains('loan-status-chip--borrowed')).toBe(true);
  });

  it('SC-11: borrowed のときはアイコンを付けない', () => {
    expect(renderChip('borrowed').querySelectorAll('svg')).toHaveLength(0);
  });

  it('SC-09: returned のときは今までどおり「返却済み」を表示する', () => {
    expect(renderChip('returned').textContent).toBe('返却済み');
  });

  it('SC-12: どちらの状態にも、大きさをそろえる共通の loan-status-chip のクラスが付く', () => {
    expect(renderChip('borrowed').classList.contains('loan-status-chip')).toBe(true);
    cleanup();
    expect(renderChip('returned').classList.contains('loan-status-chip')).toBe(true);
  });
});
