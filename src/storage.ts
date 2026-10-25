// Where each config layer lives:
//   shared → HA system data   (admins write, everyone reads; synced live)
//   user   → HA user data     (per user, follows them across devices; synced live)
//   device → localStorage     (this browser only)
import { LAYER_VERSION, sanitiseLayer, type Layer } from "./config.ts";
import type { FrontendData, FrontendDataScope } from "./ha.ts";

export type Scope = "shared" | "user" | "device";

/** The key Dockbar's layers use in HA's frontend storage. */
export const KEY = "dockbar";
const DEVICE_KEY = "dockbar:device";
const OFF_KEY = "dockbar:off";
const START_TIMEOUT_MS = 5000;

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
        // Carry on with what we have if HA never answers; a late answer still arrives through onChange.
        setTimeout(() => {
          if (ready) return;
          console.warn(`Dockbar: no ${type} config after ${START_TIMEOUT_MS / 1000}s, starting without it`);
          ready = true;
          resolve();
        }, START_TIMEOUT_MS);
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
    const stored = this.get(scope)?.version ?? 0;
    // A newer Dockbar wrote this; saving from an older one would drop the settings it doesn't know.
    if (stored > LAYER_VERSION) throw new Error("This config was saved by a newer Dockbar. Reload the page to update.");
    const value = layer && Object.keys(layer).length ? { ...layer, version: LAYER_VERSION } : null;
    if (scope === "device") {
      const ls = local();
      try {
        if (value) ls?.setItem(DEVICE_KEY, JSON.stringify(value));
        else ls?.removeItem(DEVICE_KEY);
      } catch (err) {
        throw new Error(`Couldn't save to this device: ${err instanceof Error ? err.message : err}`);
      }
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
