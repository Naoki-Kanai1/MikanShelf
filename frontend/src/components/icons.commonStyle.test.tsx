// @vitest-environment jsdom
// 詳細画面などから移した共通のアイコンの単体テスト。テストケースの一覧は tests/applyCommonStyle/cases.md
import { cleanup, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  LocationIcon,
  OpenBookIcon,
  PersonIcon,
} from './icons';

// 移す前に、各画面（BookDetail.tsx・LoanDetail.tsx・CompletionDialog.tsx）で書いていた線の形
const ICONS: [string, ComponentType, string[]][] = [
  [
    'LocationIcon',
    LocationIcon,
    [
      'path d=M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z',
      'circle cx=12 cy=9.5 r=2.5',
    ],
  ],
  [
    'OpenBookIcon',
    OpenBookIcon,
    [
      'path d=M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z',
      'path d=M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z',
    ],
  ],
  ['PersonIcon', PersonIcon, ['circle cx=12 cy=8 r=3.5', 'path d=M5 20a7 7 0 0 1 14 0']],
  [
    'CalendarIcon',
    CalendarIcon,
    ['rect x=4 y=5 width=16 height=16 rx=2', 'path d=M4 10h16M8 3v4M16 3v4'],
  ],
  ['ChevronRightIcon', ChevronRightIcon, ['path d=M9 6l6 6-6 6']],
  ['CheckCircleIcon', CheckCircleIcon, ['circle cx=12 cy=12 r=10', 'path d=M7.5 12.5l3 3 6-6.5']],
];

function renderIcon(Icon: ComponentType) {
  const { container } = render(<Icon />);
  return container.querySelector('svg')!;
}

// svg の中の図形を「タグ名 属性=値 …」の形の文字にする
const shapesOf = (svg: SVGSVGElement) =>
  Array.from(svg.children).map((el) =>
    [el.tagName, ...Array.from(el.attributes).map((a) => `${a.name}=${a.value}`)].join(' '),
  );

afterEach(() => {
  cleanup();
});

describe('共通のアイコン（icons.tsx）', () => {
  it('CS-01: 6つのアイコンは、どれも class="icon" の svg で、読み上げの対象から外している', () => {
    for (const [name, Icon] of ICONS) {
      const svg = renderIcon(Icon);
      expect(svg.getAttribute('class'), name).toBe('icon');
      expect(svg.getAttribute('aria-hidden'), name).toBe('true');
      expect(svg.getAttribute('focusable'), name).toBe('false');
      cleanup();
    }
  });

  it('CS-02: 6つのアイコンの線の形は、移す前に各画面で書いていたものと同じ', () => {
    for (const [name, Icon, shapes] of ICONS) {
      expect(shapesOf(renderIcon(Icon)), name).toEqual(shapes);
      cleanup();
    }
  });

  it('CS-03: 6つのアイコンは、大きさを svg に直接書かない（CSS で決める）', () => {
    for (const [name, Icon] of ICONS) {
      const svg = renderIcon(Icon);
      expect(svg.hasAttribute('width'), name).toBe(false);
      expect(svg.hasAttribute('height'), name).toBe(false);
      cleanup();
    }
  });
});
