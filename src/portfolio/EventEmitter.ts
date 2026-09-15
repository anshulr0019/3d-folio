type Callback = (...args: any[]) => void;

export class EventEmitter {
  private _events: Record<string, Callback[]> = {};

  on(event: string, cb: Callback): () => void {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(cb);
    return () => this.off(event, cb);
  }

  off(event: string, cb: Callback) {
    if (!this._events[event]) return;
    this._events[event] = this._events[event].filter((fn) => fn !== cb);
  }

  emit(event: string, ...args: any[]) {
    if (!this._events[event]) return;
    this._events[event].forEach((cb) => cb(...args));
  }

  removeAllListeners() { this._events = {}; }

  once(event: string, cb: Callback) {
    const unsub = this.on(event, (...args) => {
      unsub();
      cb(...args);
    });
  }
}
