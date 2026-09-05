// USB transport abstraction so the protocol code can run against WebUSB in the browser,
// node-usb's WebUSB shim in tests on real hardware, or a scripted fake in unit tests.

export interface Transport {
  readonly packetSize: number;
  open(): Promise<void>;
  close(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  /** Resolve with the bytes of one USB IN transfer (at most `max` bytes, possibly fewer). */
  read(max: number): Promise<Uint8Array>;
}

export class TransportError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'TransportError';
  }
}

/** Minimal structural type so we do not depend on DOM lib types being present (node tests). */
export interface USBDeviceLike {
  vendorId: number;
  productId: number;
  productName?: string | null;
  serialNumber?: string | null;
  opened: boolean;
  configuration: { configurationValue: number; interfaces: USBInterfaceLike[] } | null;
  configurations: { configurationValue: number; interfaces: USBInterfaceLike[] }[];
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(v: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  releaseInterface(n: number): Promise<void>;
  transferIn(endpoint: number, length: number): Promise<{ status?: string; data?: DataView | null }>;
  transferOut(endpoint: number, data: BufferSource): Promise<{ status?: string; bytesWritten?: number }>;
}
export interface USBInterfaceLike {
  interfaceNumber: number;
  alternates: { alternateSetting: number; endpoints: { endpointNumber: number; direction: 'in' | 'out'; type: string; packetSize: number }[] }[];
}

export class WebUSBTransport implements Transport {
  private inEp = 0;
  private outEp = 0;
  private iface = 0;
  packetSize = 64;

  constructor(public readonly device: USBDeviceLike) {}

  async open(): Promise<void> {
    const d = this.device;
    try {
      if (!d.opened) await d.open();
      if (!d.configuration) await d.selectConfiguration(d.configurations[0]?.configurationValue ?? 1);
      const cfg = d.configuration!;
      // Pick the first interface exposing a bulk IN and a bulk OUT endpoint.
      let found = false;
      for (const itf of cfg.interfaces) {
        const alt = itf.alternates[0];
        const inEp = alt.endpoints.find((e) => e.direction === 'in' && e.type === 'bulk');
        const outEp = alt.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk');
        if (inEp && outEp) {
          this.iface = itf.interfaceNumber;
          this.inEp = inEp.endpointNumber;
          this.outEp = outEp.endpointNumber;
          this.packetSize = inEp.packetSize || 64;
          found = true;
          break;
        }
      }
      if (!found) throw new TransportError('No bulk USB endpoints found on this device');
      await d.claimInterface(this.iface);
    } catch (e) {
      if (e instanceof TransportError) throw e;
      const msg = (e as Error)?.message ?? String(e);
      if (/access denied|claim|in use|busy/i.test(msg)) {
        throw new TransportError(
          'Could not claim the USB interface. Close TI Connect CE and any other program using the calculator, then unplug and replug it. On Windows the TI driver may need to be replaced with WinUSB (see Help).',
          e,
        );
      }
      throw new TransportError(`Could not open the calculator: ${msg}`, e);
    }
  }

  async close(): Promise<void> {
    try {
      await this.device.releaseInterface(this.iface);
    } catch { /* ignore */ }
    try {
      await this.device.close();
    } catch { /* ignore */ }
  }

  async write(data: Uint8Array): Promise<void> {
    const r = await this.device.transferOut(this.outEp, data as Uint8Array<ArrayBuffer>);
    if (r.status && r.status !== 'ok') throw new TransportError(`USB write failed: ${r.status}`);
  }

  async read(max: number): Promise<Uint8Array> {
    const r = await this.device.transferIn(this.inEp, max);
    if (r.status && r.status !== 'ok') throw new TransportError(`USB read failed: ${r.status}`);
    if (!r.data) return new Uint8Array(0);
    return new Uint8Array(r.data.buffer as ArrayBuffer, r.data.byteOffset, r.data.byteLength).slice();
  }
}
