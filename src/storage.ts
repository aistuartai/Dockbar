// Where each config layer lives:
//   shared → HA system data   (admins write, everyone reads; synced live)
//   user   → HA user data     (per user, follows them across devices; synced live)
//   device → localStorage     (this browser only)
import { sanitiseLayer, type Layer } from "./config.ts";
import type { FrontendData, FrontendDataScope } from "./ha.ts";

export type Scope = "shared" | "user" | "device";

/** The key Dockbar's layers use in HA's frontend storage. */
export const KEY = "dockbar";
const DEVICE_KEY = "dockbar:device";
const OFF_KEY = "dockbar:off";

function warn(scope: string) {
  return (m: string) => console.warn(`Dockbar (${scope} config): ${m}`);
}

/** localStorage, or null where the browser blocks it. */
export function local(): Storage | null {
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
    private data: FrontendData,
    private onChange: () => void,
  ) {
    this.device = this.readDevice();
  }

  /** Subscribes to the shared and user layers; resolves once both have their first value. */
  async start(): Promise<void> {
    const first = (type: FrontendDataScope, assign: (l: Layer | null) => void) =>
      new Promise<void>((resolve) => {
        let ready = false;
        this.data
          .subscribe(type, (value) => {
            assign(value == null ? null : sanitiseLayer(value, warn(type)));
            if (ready) this.onChange();
            else {
              ready = true;
              resolve();
            }
          })
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
    await this.data.set(scope === "shared" ? "system" : "user", value);
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
