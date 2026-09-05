// TI-Nspire (CX, CX II) over WebUSB via web-libnspire running in a worker.
import { SAB_SIZE, UsbBridge, type UsbCmd } from './bridge';

export const NSPIRE_PIDS = { classic: 0xe012, cx2: 0xe022 } as const;
export const TI_VENDOR_ID = 0x0451;

export interface NspireVersion { major: number; minor: number; patch: number; build: number }
export interface NspireInfo {
  free_storage: number; total_storage: number; free_ram: number; total_ram: number;
  version: NspireVersion; boot1_version: NspireVersion; boot2_version: NspireVersion;
  hw_type: string | { Unknown: number }; clock_speed: number;
  lcd: { width: number; height: number; bpp: number; sample_mode: number };
  os_extension: string; file_extension: string; name: string; id: string;
  run_level: string | { Unknown: number }; battery: string | { Unknown: number }; is_charging: boolean;
}
export interface NspireFile { path: string; isDir: boolean; date: number; size: number }
export interface NspireProgress { remaining: number; total: number }

export function nspireSupported(): { ok: boolean; reason?: string } {
  if (typeof navigator === 'undefined' || !navigator.usb) return { ok: false, reason: 'WebUSB is not available in this browser.' };
  if (typeof SharedArrayBuffer === 'undefined' || !(globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated) {
    return { ok: false, reason: 'Cross-origin isolation is required for the Nspire transfer engine.' };
  }
  return { ok: true };
}

export class NspireCalculator {
  private worker: Worker | null = null;
  private bridge: UsbBridge | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  info: NspireInfo | null = null;
  onProgress: (p: NspireProgress) => void = () => {};
  log: (text: string) => void = () => {};

  constructor(public readonly device: USBDevice) {}

  get isCxII(): boolean {
    return this.device.productId === NSPIRE_PIDS.cx2;
  }

  static usbFilters() {
    return [{ vendorId: TI_VENDOR_ID, productId: NSPIRE_PIDS.classic }, { vendorId: TI_VENDOR_ID, productId: NSPIRE_PIDS.cx2 }];
  }

  private call<T>(method: string, ...args: unknown[]): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker!.postMessage({ id, method, args });
    });
  }

  async connect(): Promise<NspireInfo> {
    const sup = nspireSupported();
    if (!sup.ok) throw new Error(sup.reason);
    if (!this.device.opened) await this.device.open();
    const sab = new SharedArrayBuffer(SAB_SIZE);
    this.bridge = new UsbBridge(sab);
    this.bridge.log = this.log;
    const devId = this.bridge.addDevice(this.device);
    this.worker = new Worker(new URL('./usb-worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (data && typeof data === 'object' && 'usbCmd' in data) { void this.bridge!.handle(data as UsbCmd); return; }
      if (data && typeof data === 'object' && 'total' in data && 'remaining' in data) { this.onProgress(data as NspireProgress); return; }
      const p = this.pending.get(data.id);
      if (!p) return;
      this.pending.delete(data.id);
      if (data.ok) p.resolve(data.result);
      else {
        const usbErr = this.bridge?.lastError as Error | null;
        this.bridge!.lastError = null;
        p.reject(new Error(usbErr ? `${data.error} (${usbErr.message ?? usbErr})` : data.error));
      }
    };
    this.worker.onerror = (e) => this.log(`worker error: ${e.message}`);
    await this.call('init', devId, this.device.vendorId, this.device.productId, sab);
    this.info = await this.call<NspireInfo>('update');
    return this.info;
  }

  async refresh(): Promise<NspireInfo> {
    this.info = await this.call<NspireInfo>('update');
    return this.info;
  }

  async listDir(path: string): Promise<NspireFile[]> {
    return this.call<NspireFile[]>('listDir', path);
  }

  async upload(path: string, data: Uint8Array): Promise<void> {
    await this.call('uploadFile', path, data);
  }

  async download(path: string, size: number): Promise<Uint8Array> {
    return this.call<Uint8Array>('downloadFile', path, size);
  }

  async deleteFile(path: string): Promise<void> {
    await this.call('deleteFile', path);
  }

  async deleteDir(path: string): Promise<void> {
    await this.call('deleteDir', path);
  }

  async createDir(path: string): Promise<void> {
    await this.call('createDir', path);
  }

  async disconnect(): Promise<void> {
    try { if (this.worker) await this.call('free'); } catch { /* ignore */ }
    this.worker?.terminate();
    this.worker = null;
    try { await this.device.close(); } catch { /* ignore */ }
    this.info = null;
  }
}

/**
 * Load the transfer engine in a worker without touching USB, to prove the WebAssembly bundle works
 * in this browser. Resolves with the time it took.
 */
export function selfTestEngine(timeoutMs = 15000): Promise<number> {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const w = new Worker(new URL('./usb-worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => { w.terminate(); reject(new Error('Engine did not load within 15 s')); }, timeoutMs);
    w.onmessage = (ev: MessageEvent) => {
      if (ev.data?.id === 0) {
        clearTimeout(timer);
        w.terminate();
        if (ev.data.ok) resolve(performance.now() - t0);
        else reject(new Error(ev.data.error));
      }
    };
    w.onerror = (e) => { clearTimeout(timer); w.terminate(); reject(new Error(e.message || 'worker failed to start')); };
    w.postMessage({ id: 0, method: 'ping', args: [] });
  });
}

/**
 * GitHub Pages cannot send the COOP/COEP headers that SharedArrayBuffer needs, so a service worker
 * adds them. Returns true when the page must reload to pick the headers up.
 */
export async function enableCrossOriginIsolation(base: string): Promise<'ready' | 'reload' | 'unsupported'> {
  if ((globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated) return 'ready';
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg = await navigator.serviceWorker.register(`${base}coi-serviceworker.js`, { scope: base });
  await reg.update().catch(() => undefined);
  return 'reload';
}
