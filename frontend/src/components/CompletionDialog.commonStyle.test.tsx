// @vitest-environment jsdom
// 完了ダイアログが共通のアイコンを使うことの単体テスト。テストケースの一覧は tests/applyCommonStyle/cases.md
import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { installDialogPolyfill } from '../test/dialogPolyfill';
import CompletionDialog from './CompletionDialog';
import { CheckCircleIcon } from './icons';

installDialogPolyfill();

afterEach(() => {
  cleanup();
});

describe('CompletionDialog の共通のスタイル', () => {
  it('CS-12: チェックマークは共通の CheckCircleIcon（class="icon"、同じ形）', () => {
    const expected = render(<CheckCircleIcon />).container.innerHTML;
    cleanup();

    const ref = createRef<HTMLDialogElement>();
    const view = render(
      <CompletionDialog ref={ref} message="本を借りました！" onClose={() => {}} />,
    );
    ref.current!.showModal();
    const icon = view.container.querySelector('.completion-dialog__icon')!;
    expect(icon.querySelector('svg')!.getAttribute('class')).toBe('icon');
    expect(icon.innerHTML).toBe(expected);
  });
});
