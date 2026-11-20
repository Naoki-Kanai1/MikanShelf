// @vitest-environment jsdom
// 絞り込みの選択肢（場所・ステータス）の単体テスト。テストケースの一覧は tests/filterByConditions/cases.md
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookFilterFields from './BookFilterFields';

type Props = ComponentProps<typeof BookFilterFields>;

const makeProps = (overrides: Partial<Props> = {}): Props => ({
  layout: 'inline',
  locations: ['新川 3F 共用', '横浜 14F SD部'],
  selectedLocations: [],
  selectedStatus: null,
  onToggleLocation: vi.fn(),
  onSetStatus: vi.fn(),
  ...overrides,
});

const group = (name: string) => screen.getByRole('group', { name });
const labels = (inputs: HTMLElement[]) => inputs.map((c) => c.closest('label')?.textContent);
const checked = (inputs: HTMLElement[]) => inputs.map((c) => (c as HTMLInputElement).checked);

afterEach(() => {
  cleanup();
});

describe('BookFilterFields', () => {
  it('FC-26: 場所はチェックボックスで、選んだものだけチェックする', () => {
    render(<BookFilterFields {...makeProps({ selectedLocations: ['横浜 14F SD部'] })} />);
    const places = within(group('場所')).getAllByRole('checkbox');
    expect(labels(places)).toEqual(['新川 3F 共用', '横浜 14F SD部']);
    expect(checked(places)).toEqual([false, true]);
  });

  it('FC-99: ステータスは「すべて」「借りられる」の2つのラジオボタンで、選んだ1つだけを選ぶ', () => {
    render(<BookFilterFields {...makeProps({ selectedStatus: 'available' })} />);
    const radios = within(group('ステータス')).getAllByRole('radio');
    expect(labels(radios)).toEqual(['すべて', '借りられる']);
    expect(checked(radios)).toEqual([false, true]);
    // 同じ name のまとまりなので、ブラウザでも1つしか選べない
    expect(new Set(radios.map((r) => (r as HTMLInputElement).name)).size).toBe(1);
    expect(within(group('ステータス')).queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('FC-72: 状態が null のときは「すべて」を選ぶ', () => {
    render(<BookFilterFields {...makeProps()} />);
    expect((screen.getByRole('radio', { name: 'すべて' }) as HTMLInputElement).checked).toBe(true);
  });

  it('FC-77: 場所のチェックボックスを押すと、その値で onToggleLocation を呼ぶ', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<BookFilterFields {...props} />);
    await user.click(screen.getByRole('checkbox', { name: '横浜 14F SD部' }));
    expect(props.onToggleLocation).toHaveBeenCalledExactlyOnceWith('横浜 14F SD部');
  });

  it('FC-73: ラジオボタンを押すとその値で、「すべて」を押すと null で onSetStatus を呼ぶ', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const { rerender } = render(<BookFilterFields {...props} />);
    await user.click(screen.getByRole('radio', { name: '借りられる' }));
    // 選んだ状態を親から渡し直してから「すべて」を押す
    rerender(<BookFilterFields {...props} selectedStatus="available" />);
    await user.click(screen.getByRole('radio', { name: 'すべて' }));
    expect(props.onSetStatus).toHaveBeenNthCalledWith(1, 'available');
    expect(props.onSetStatus).toHaveBeenNthCalledWith(2, null);
  });

  it('FC-31: 選んでいるのに一覧に無い置き場所も、チェックした状態で並べる', () => {
    render(<BookFilterFields {...makeProps({ selectedLocations: ['旧書庫'] })} />);
    const places = within(group('場所')).getAllByRole('checkbox');
    expect(labels(places)).toEqual(['新川 3F 共用', '横浜 14F SD部', '旧書庫']);
    expect(checked(places)).toEqual([false, false, true]);
  });

  it('FC-29: 置き場所が0件なら「登録されている場所はありません。」', () => {
    render(<BookFilterFields {...makeProps({ locations: [] })} />);
    expect(within(group('場所')).getByText('登録されている場所はありません。')).toBeTruthy();
  });

  it('FC-74: 2つ並べても、ラジオボタンは別々のまとまりになる', () => {
    render(
      <>
        <BookFilterFields {...makeProps({ layout: 'inline' })} />
        <BookFilterFields {...makeProps({ layout: 'stacked' })} />
      </>,
    );
    const names = screen
      .getAllByRole('radio', { name: 'すべて' })
      .map((r) => (r as HTMLInputElement).name);
    expect(names).toHaveLength(2);
    expect(names[0]).not.toBe(names[1]);
  });

  it('FC-75: statusTrailing を渡すと、ステータスの行の最後に置く', () => {
    render(
      <BookFilterFields
        {...makeProps({ statusTrailing: <button type="button">すべて解除</button> })}
      />,
    );
    const button = within(group('ステータス')).getByRole('button', { name: 'すべて解除' });
    const radios = within(group('ステータス')).getAllByRole('radio');
    expect(
      radios.at(-1)!.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
