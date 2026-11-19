// テストの環境（jsdom）には、<dialog> の showModal()・close() と、<form method="dialog"> で
// 閉じる動きがない。ブラウザーと同じ動き（開く・閉じる・閉じたら close イベントを出す）をする
// 代わりのものを入れる。テストのときだけ使う。
export function installDialogPolyfill() {
  const proto = HTMLDialogElement.prototype;
  proto.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  proto.show = proto.showModal;
  proto.close = function (this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };

  // <form method="dialog"> の送信で、そのフォームを含むダイアログを閉じる
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    if (form.getAttribute('method') !== 'dialog') return;
    e.preventDefault();
    form.closest('dialog')?.close();
  });
}
