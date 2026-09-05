// Main-thread side of the synchronous USB bridge used by web-libnspire (Rust compiled to WebAssembly).
// The WebAssembly module runs in a Worker; it posts a USB command object, then blocks with
// Atomics.wait on a SharedArrayBuffer until we write the msgpack-encoded reply into it.
// Ported from n-link (lights0123, GPL-3.0): web/components/impl.ts.
import { Encoder } from '@msgpack/msgpack';

export type UsbCmd =
  | { usbCmd: 'bulkTransferOut'; device: number; endpoint: number; data: Uint8Array }
  | { usbCmd: 'bulkTransferIn'; device: number; endpoint: number; length: number }
  | { usbCmd: 'selectConfiguration'; device: number; config: number }
  | { usbCmd: 'claimInterface'; device: number; number: number }
  | { usbCmd: 'releaseInterface'; device: number; number: number }
  | { usbCmd: 'resetDevice'; device: number }
  | { usbCmd: 'activeConfigDescriptor'; device: number };

const ERROR_NAMES: Record<string, string> = {
  NotFoundError: 'NotFound',
  SecurityError: 'Security',
  NetworkError: 'Network',
  AbortError: 'Abort',
  InvalidStateError: 'InvalidState',
  InvalidAccessError: 'InvalidAccess',
};

export const SAB_SIZE = 16384;

export class UsbBridge {
  private encoder = new Encoder();
  private devices: USBDevice[] = [];
  lastError: unknown = null;
  log: (text: string) => void = () => {};

  constructor(public readonly sab: SharedArrayBuffer) {}

  addDevice(d: USBDevice): number {
    this.devices.push(d);
    return this.devices.length - 1;
  }

  private async run(cmd: UsbCmd): Promise<unknown> {
    const dev = this.devices[cmd.device];
    if (!dev) throw new DOMException('Unknown device', 'NotFoundError');
    switch (cmd.usbCmd) {
      case 'bulkTransferOut': {
        const r = await dev.transferOut(cmd.endpoint & ~0x80, cmd.data as Uint8Array<ArrayBuffer>);
        this.log(`→ ${cmd.data.length} bytes`);
        return { Ok: r.bytesWritten };
      }
      case 'bulkTransferIn': {
        const r = await dev.transferIn(cmd.endpoint & ~0x80, cmd.length);
        const data = r.data ? new Uint8Array(r.data.buffer as ArrayBuffer, r.data.byteOffset, r.data.byteLength).slice() : new Uint8Array(0);
        this.log(`← ${data.length} bytes`);
        return { Ok: data };
      }
      case 'selectConfiguration': await dev.selectConfiguration(cmd.config); return { Ok: null };
      case 'claimInterface': await dev.claimInterface(cmd.number); return { Ok: null };
      case 'releaseInterface': await dev.releaseInterface(cmd.number); return { Ok: null };
      case 'resetDevice': await dev.reset(); return { Ok: null };
      case 'activeConfigDescriptor': {
        const c = dev.configuration!;
        return {
          Ok: {
            configurationValue: c.configurationValue,
            interfaces: c.interfaces.map((itf) =>
              itf.alternates.map((alt) => ({
                alternateSetting: alt.alternateSetting,
                interfaceClass: alt.interfaceClass,
                interfaceSubclass: alt.interfaceSubclass,
                interfaceProtocol: alt.interfaceProtocol,
                endpoints: alt.endpoints.map((ep) => ({ address: ep.endpointNumber | (ep.direction === 'in' ? 0x80 : 0), packetSize: ep.packetSize })),
              })),
            ),
          },
        };
      }
    }
  }

  /** Execute a command from the worker and hand the reply back through the shared buffer. */
  async handle(cmd: UsbCmd): Promise<void> {
    let reply: unknown;
    try {
      reply = await this.run(cmd);
    } catch (e) {
      this.lastError = e;
      const name = ERROR_NAMES[(e as DOMException)?.name] ?? 'Unknown';
      this.log(`USB error: ${(e as Error)?.message ?? e}`);
      reply = { Err: { [name]: null } };
    }
    const encoded = this.encoder.encode(reply);
    if (encoded.length > this.sab.byteLength - 4) throw new Error('USB reply too large for the shared buffer');
    new Uint8Array(this.sab).set(encoded, 4);
    const notify = new Int32Array(this.sab);
    Atomics.store(notify, 0, encoded.length);
    Atomics.notify(notify, 0);
  }
}
