/** A FIFO exclusive lock stand-in: all clients sharing this manager share the same queues. */
export function installCartLocks(navigator: Navigator = globalThis.navigator) {
  const previous = Object.getOwnPropertyDescriptor(navigator, "locks");
  const queues = new Map<string, Promise<unknown>>();
  const locks = {
    request<T>(name: string, _options: LockOptions, work: () => T) {
      const result = (queues.get(name) ?? Promise.resolve()).then(work);
      queues.set(name, result.catch(() => {}));
      return result;
    },
  };
  Object.defineProperty(navigator, "locks", { configurable: true, value: locks });
  return () => {
    if (previous) Object.defineProperty(navigator, "locks", previous);
    else Reflect.deleteProperty(navigator, "locks");
  };
}

export function seedCart(store: Pick<Storage, "setItem">, lines: { productID: string; quantity: number }[]) {
  store.setItem("sphmrs.cart.v2", JSON.stringify({
    generation: crypto.randomUUID(), lines: lines.map((line) => ({ ...line, intent: crypto.randomUUID() })),
  }));
}
