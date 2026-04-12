const listeners = new Set();

const listenClickOutsideOnce = (
  element: HTMLElement,
  cb: (el: HTMLElement) => void,
) => {
  if (listeners.has(element)) return;

  listeners.add(element);

  document.addEventListener("click", function listener(event: MouseEvent) {
    if (!listeners.has(element) || !element.isConnected) {
      document.removeEventListener("click", listener);
      listeners.delete(element);
      return;
    }

    const isClickInsideElement = () => event.composedPath()
      .some(node => node instanceof Node && element.contains(node));

    if (!isClickInsideElement()) {
      cb(element);
      document.removeEventListener("click", listener);
      listeners.delete(element);
    }
  });
};

export { listenClickOutsideOnce };
