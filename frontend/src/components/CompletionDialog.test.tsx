// @vitest-environment jsdom
// 完了ダイアログの単体テスト。テストケースの一覧は tests/completionDialog/cases.md
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../test/dialogPolyfill';
import CompletionDialog from './CompletionDialog';

installDialogPolyfill();

function renderDialog() {
  const ref = createRef<HTMLDialogElement>();
  const onClose = vi.fn();
  const view = render(<CompletionDialog ref={ref} message="本を借りました！" onClose={onClose} />);
  return { ref, onClose, view };
}

afterEach(() => {
  cleanup();
});

describe('CompletionDialog', () => {
  it('CP-01: 開くと、メッセージ、チェックマークのアイコン、「OK」ボタンを表示する', () => {
    const { ref, view } = renderDialog();
    ref.current!.showModal();
    expect(ref.current!.open).toBe(true);
    expect(screen.getByRole('dialog', { name: '本を借りました！' })).toBeTruthy();
    expect(screen.getByText('本を借りました！')).toBeTruthy();
    expect(view.container.querySelector('.completion-dialog__icon svg')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'OK' })).toBeTruthy();
  });

  it('CP-02: 開く前は、ダイアログは閉じていて onClose は呼ばれない', () => {
    const { ref, onClose } = renderDialog();
    expect(ref.current!.open).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('CP-03: 「OK」を押すと、ダイアログが閉じて onClose が1回呼ばれる', async () => {
    const { ref, onClose } = renderDialog();
    ref.current!.showModal();
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(ref.current!.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('CP-04: OK を押さずに閉じても（Esc キー）、ダイアログが閉じて onClose が1回呼ばれる', () => {
    const { ref, onClose } = renderDialog();
    ref.current!.showModal();
    // ブラウザーは Esc キーで close() と同じ閉じ方をする
    ref.current!.close();
    expect(ref.current!.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
