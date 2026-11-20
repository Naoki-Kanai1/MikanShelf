// @vitest-environment jsdom
// 絞り込みのモーダル（狭い画面で使う）の単体テスト。テストケースの一覧は tests/filterByConditions/cases.md
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../test/dialogPolyfill';
import BookFilterDialog from './BookFilterDialog';

installDialogPolyfill();

type Props = ComponentProps<typeof BookFilterDialog>;

// モーダルを開いた状態で表示する。必要な項目だけ上書きして使う
function renderDialog(overrides: Partial<Props> = {}) {
  const ref = createRef<HTMLDialogElement>();
  const props: Props = {
    ref,
    open: true,
    onClose: vi.fn(),
    locations: ['新川 3F 共用', '横浜 14F SD部'],
    selectedLocations: [],
    selectedStatus: null,
    onToggleLocation: vi.fn(),
    onSetStatus: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  render(<BookFilterDialog {...props} />);
  if (props.open) ref.current?.showModal();
  return { props, ref };
}

afterEach(() => {
  cleanup();
});

describe('BookFilterDialog', () => {
  it('FC-25: 閉じているときは、題名も選択肢も描かない', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('絞り込み')).toBeNull();
    expect(screen.queryAllByRole('checkbox', { hidden: true })).toHaveLength(0);
    expect(screen.queryAllByRole('radio', { hidden: true })).toHaveLength(0);
  });

  it('FC-100: 開いているときは、題名と場所のチェックボックス・ステータスのラジオボタン2つを出す', () => {
    renderDialog({ selectedLocations: ['横浜 14F SD部'], selectedStatus: 'available' });
    const dialog = screen.getByRole('dialog', { name: '絞り込み' });
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(2);
    expect(within(dialog).getAllByRole('radio')).toHaveLength(2);
    expect(
      (within(dialog).getByRole('radio', { name: '借りられる' }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it('FC-30: 選択肢を押すと、その値で onToggleLocation・onSetStatus を呼ぶ', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();
    await user.click(screen.getByRole('checkbox', { name: '横浜 14F SD部' }));
    await user.click(screen.getByRole('radio', { name: '借りられる' }));
    expect(props.onToggleLocation).toHaveBeenCalledExactlyOnceWith('横浜 14F SD部');
    expect(props.onSetStatus).toHaveBeenCalledExactlyOnceWith('available');
  });

  it('FC-32: 何も選んでいないと「すべて解除」は押せず、選んでいると押せて onClear を呼ぶ', async () => {
    const user = userEvent.setup();
    renderDialog();
    expect((screen.getByRole('button', { name: 'すべて解除' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    cleanup();

    const { props } = renderDialog({ selectedStatus: 'available' });
    const clear = screen.getByRole('button', { name: 'すべて解除' }) as HTMLButtonElement;
    expect(clear.disabled).toBe(false);
    await user.click(clear);
    expect(props.onClear).toHaveBeenCalledOnce();
  });

  it('FC-33: 「閉じる」を押すと、ダイアログが閉じて onClose を呼ぶ', async () => {
    const user = userEvent.setup();
    const { props, ref } = renderDialog();
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(ref.current?.open).toBe(false);
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('FC-42: 中身の余白を押しても閉じず、背景（<dialog> そのもの）を押すと閉じる', async () => {
    const user = userEvent.setup();
    const { props, ref } = renderDialog();
    const dialog = screen.getByRole('dialog', { name: '絞り込み' });
    await user.click(dialog.querySelector('.book-filter-dialog__panel')!);
    await user.click(screen.getByRole('heading', { name: '絞り込み' }));
    expect(ref.current?.open).toBe(true);
    expect(props.onClose).not.toHaveBeenCalled();

    await user.click(dialog);
    expect(ref.current?.open).toBe(false);
    expect(props.onClose).toHaveBeenCalledOnce();
  });
});
