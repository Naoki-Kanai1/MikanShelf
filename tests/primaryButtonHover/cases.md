# テストケース: primaryButtonHover（画面のメインのボタンにホバーを付ける）

- ID の略号: `PH`
- PBI: #39
- 書いた人: satogorou

本詳細画面の「借りる」と貸出詳細画面の「返す」のボタン（`.primary-button`）だけ、マウスを重ねても見た目が変わらなかった。
マウスを重ねたときに文字の色（`--color-on-primary`）を背景に 16% 重ねるようにした変更のテスト。
押せないとき（`:disabled`）は変えない。

jsdom ではマウスを重ねた状態（`:hover`）の見た目は確かめられないため、`BookDetail.css` を jsdom の CSS の読み取りで読み、
決まりが書かれていることを確かめる。また、2つの画面のボタンがこの決まりの対象（`class="primary-button"`）であることを確かめる。

## .primary-button のホバー（`frontend/src/BookDetail.css`）

| ID    | 観点 | 条件・入力                              | 期待する結果                                                                                                                          |
| ----- | ---- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| PH-01 | 正常 | `BookDetail.css` を読む                 | `.primary-button:hover:not(:disabled)` の決まりがあり、背景が `color-mix(in srgb, var(--color-on-primary) 16%, var(--color-primary))` |
| PH-02 | 状態 | `BookDetail.css` を読む（押せないとき） | ホバーの決まりは `:disabled` を除いていて、`.primary-button:disabled` の背景は `var(--color-disabled)` のまま                         |
| PH-03 | 正常 | 本詳細画面（借りられる本）を表示する    | 「借りる」のボタンが `class="primary-button"` で、押せる（ホバーの対象）                                                              |
| PH-04 | 状態 | 本詳細画面（貸出中の本）を表示する      | ボタンが `class="primary-button"` で、押せない（ホバーで見た目が変わらない）                                                          |
| PH-05 | 正常 | 貸出詳細画面（貸出中）を表示する        | 「返す」のボタンが `class="primary-button"` で、押せる（ホバーの対象）                                                                |
