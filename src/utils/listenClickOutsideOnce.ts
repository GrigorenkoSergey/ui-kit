const listeners = new Map<HTMLElement, () => void>();

const listenClickOutsideOnce = (
  element: HTMLElement,
  cb: (el: HTMLElement) => void,
) => {
  const existingCleanup = listeners.get(element);
  if (existingCleanup) return existingCleanup;

  const listener = (event: MouseEvent) => {
    if (!listeners.has(element) || !element.isConnected) {
      cleanup();
      return; 
    }

    if (!event.composedPath().includes(element)) {
      cb(element);
      cleanup();
    }
  };

  const cleanup = () => {
    listeners.delete(element);
    document.removeEventListener("click", listener);
  };

  document.addEventListener("click", listener);
  listeners.set(element, cleanup);

  return cleanup;
};

export { listenClickOutsideOnce };
