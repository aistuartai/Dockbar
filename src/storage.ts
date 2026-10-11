// Where each config layer lives:
//   shared → HA system data   (admins write, everyone reads; synced live)
//   user   → HA user data     (per user, follows them across devices; synced live)
//   device → localStorage     (this browser only)
import { sanitiseLayer, type Layer } from "./config.ts";

export type Scope = "shared" | "user" | "device";

const KEY = "dockbar";
const DEVICE_KEY = "dockbar:device";
const OFF_KEY = "dockbar:off";

interface Connection {
  sendMessagePromise<T = unknown>(msg: Record<string, unknown>): Promise<T>;
  subscribeMessage<T = unknown>(cb: (msg: T) => void, msg: Record<string, unknown>): Promise<() => void>;
}

function warn(scope: string) {
  return (m: string) => console.warn(`Dockbar (${scope} config): ${m}`);
}

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class LayerStore {
  shared: Layer | null = null;
  user: Layer | null = null;
  device: Layer | null = null;

  constructor(
    private conn: Connection,
    private onChange: () => void,
  ) {
    this.device = this.readDevice();
  }

  /** Subscribes to the shared and user layers; resolves once both have their first value. */
  async start(): Promise<void> {
    const first = (type: string, assign: (l: Layer | null) => void) =>
      new Promise<void>((resolve) => {
        let ready = false;
        this.conn
          .subscribeMessage<{ value: unknown }>(
            (msg) => {
              assign(msg.value == null ? null : sanitiseLayer(msg.value, warn(type)));
              if (ready) this.onChange();
              else {
                ready = true;
                resolve();
              }
            },
            { type: `frontend/subscribe_${type}_data`, key: KEY },
          )
          .catch((err) => {
            console.error(`Dockbar: couldn't read ${type} config`, err);
            resolve();
          });
      });
    await Promise.all([
      first("system", (l) => (this.shared = l)),
      first("user", (l) => (this.user = l)),
    ]);
    window.addEventListener("storage", (e) => {
      if (e.key === DEVICE_KEY) {
        this.device = this.readDevice();
        this.onChange();
      }
    });
  }

  get(scope: Scope): Layer | null {
    return this[scope];
  }

  async save(scope: Scope, layer: Layer | null): Promise<void> {
    const value = layer && Object.keys(layer).length ? layer : null;
    if (scope === "device") {
      if (value) local()?.setItem(DEVICE_KEY, JSON.stringify(value));
      else local()?.removeItem(DEVICE_KEY);
      this.device = value;
      this.onChange();
      return;
    }
    const type = scope === "shared" ? "system" : "user";
    await this.conn.sendMessagePromise({ type: `frontend/set_${type}_data`, key: KEY, value });
    // The subscription delivers the new value and triggers onChange.
  }

  private readDevice(): Layer | null {
    const raw = local()?.getItem(DEVICE_KEY);
    if (!raw) return null;
    try {
      return sanitiseLayer(JSON.parse(raw), warn("device"));
    } catch {
      return null;
    }
  }

  static isOff(): boolean {
    return local()?.getItem(OFF_KEY) === "1";
  }

  static setOff(off: boolean) {
    if (off) local()?.setItem(OFF_KEY, "1");
    else local()?.removeItem(OFF_KEY);
  }
}
