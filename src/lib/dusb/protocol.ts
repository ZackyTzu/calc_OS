// DUSB framing: raw packets over USB bulk transfers, virtual packets fragmented across raw packets.
// Mirrors libticalcs dusb_rpkt.cc / dusb_vpkt.cc behaviour, including the CE zero-length-packet workaround.
import { concat, readU32be, readU16be, u32be, u16be, hex } from '../bytes';
import { RawType, VirtType, DEFAULT_BUF_SIZE, CE_MAX_RAW, ERROR_MESSAGES, virtTypeName } from './constants';
import type { Transport } from './transport';

export class CalcError extends Error {
  constructor(public code: number) {
    super(`Calculator reported error 0x${code.toString(16).padStart(4, '0')}: ${ERROR_MESSAGES[code] ?? 'unknown error'}`);
    this.name = 'CalcError';
  }
}
export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtocolError';
  }
}

export interface RawPacket { type: number; data: Uint8Array }
export interface VirtualPacket { type: number; data: Uint8Array }

export type LogFn = (dir: 'tx' | 'rx' | 'info', text: string) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class DusbLink {
  /** Largest raw packet the calculator accepts (negotiated). */
  maxRaw = CE_MAX_RAW;
  private rx: Uint8Array = new Uint8Array(0);
  log: LogFn = () => {};

  constructor(private transport: Transport, private opts: { ceWorkaround?: boolean } = {}) {}

  // ---- byte level -------------------------------------------------------

  private async readExact(n: number): Promise<Uint8Array> {
    while (this.rx.length < n) {
      const chunk = await this.transport.read(this.transport.packetSize);
      if (chunk.length === 0) continue;
      this.rx = concat(this.rx, chunk);
    }
    const out = this.rx.slice(0, n);
    this.rx = this.rx.slice(n);
    return out;
  }

  // ---- raw packets ------------------------------------------------------

  async sendRaw(type: number, data: Uint8Array): Promise<void> {
    const pkt = concat(u32be(data.length), new Uint8Array([type]), data);
    this.log('tx', `raw ${type} ${hex(pkt.slice(0, Math.min(pkt.length, 24)))}${pkt.length > 24 ? ' …' : ''}`);
    await this.transport.write(pkt);
  }

  async recvRaw(): Promise<RawPacket> {
    const head = await this.readExact(5);
    const size = readU32be(head, 0);
    const type = head[4];
    if (size > 65536) throw new ProtocolError(`Raw packet is unreasonably large (${size} bytes)`);
    const data = await this.readExact(size);
    this.log('rx', `raw ${type} ${hex(data.slice(0, Math.min(data.length, 24)))}${data.length > 24 ? ' …' : ''}`);
    return { type, data };
  }

  private async sendRawAck(): Promise<void> {
    await this.sendRaw(RawType.VIRT_DATA_ACK, new Uint8Array([0xe0, 0x00]));
  }

  private async recvRawAck(): Promise<void> {
    let raw = await this.recvRaw();
    if (raw.type === RawType.BUF_SIZE_REQ) {
      // The calculator may (re)negotiate its own buffer; answer and wait for the real ack.
      if (raw.data.length !== 4) throw new ProtocolError('Malformed buffer size request');
      await this.sendRaw(RawType.BUF_SIZE_ALLOC, raw.data);
      raw = await this.recvRaw();
    }
    if (raw.type !== RawType.VIRT_DATA_ACK) throw new ProtocolError(`Expected raw ACK, got raw type ${raw.type}`);
    if (raw.data.length < 2 || raw.data[0] !== 0xe0 || raw.data[1] !== 0x00) throw new ProtocolError(`Bad ACK payload ${hex(raw.data)}`);
  }

  // ---- handshake --------------------------------------------------------

  async negotiateBufferSize(request = DEFAULT_BUF_SIZE): Promise<number> {
    await this.sendRaw(RawType.BUF_SIZE_REQ, u32be(request));
    const raw = await this.recvRaw();
    if (raw.type !== RawType.BUF_SIZE_ALLOC || raw.data.length !== 4) throw new ProtocolError('Expected buffer size allocation');
    let size = readU32be(raw.data, 0);
    // The 83PCE/84+CE allocate 1024 but only handle 1018-byte raw packets (libticalcs).
    if (size > CE_MAX_RAW) size = CE_MAX_RAW;
    this.maxRaw = size;
    this.log('info', `buffer size ${size}`);
    return size;
  }

  // ---- virtual packets --------------------------------------------------

  async sendVirtual(type: number, data: Uint8Array = new Uint8Array(0)): Promise<void> {
    this.log('tx', `virtual ${virtTypeName(type)} (${data.length} bytes)`);
    const header = concat(u32be(data.length), u16be(type));
    const payload = concat(header, data);
    const max = this.maxRaw;
    if (payload.length <= max) {
      await this.sendRaw(RawType.VIRT_DATA_LAST, payload);
      await this.ceWorkaround(payload.length);
      await this.recvRawAck();
      return;
    }
    let off = 0;
    let first = true;
    while (off < payload.length) {
      const chunk = payload.slice(off, off + max);
      off += chunk.length;
      const last = off >= payload.length;
      await this.sendRaw(last ? RawType.VIRT_DATA_LAST : RawType.VIRT_DATA, chunk);
      if (last) await this.ceWorkaround(chunk.length);
      await this.recvRawAck();
      first = false;
    }
    void first;
  }

  /** The CE stalls if the final bulk transfer is an exact multiple of 64 bytes; a zero-length packet fixes it. */
  private async ceWorkaround(rawDataLen: number): Promise<void> {
    if (this.opts.ceWorkaround === false) return;
    if ((rawDataLen + 5) % 64 === 0) {
      this.log('info', 'zero-length packet workaround');
      try {
        await this.transport.write(new Uint8Array(0));
      } catch { /* some stacks reject ZLPs; the transfer usually still succeeds */ }
    }
  }

  /** Receive one virtual packet, transparently honouring DELAY_ACK requests and raising calculator errors. */
  async recvVirtual(): Promise<VirtualPacket> {
    for (;;) {
      const pkt = await this.recvVirtualOnce();
      if (pkt.type === VirtType.DELAY_ACK) {
        let delay = pkt.data.length >= 4 ? readU32be(pkt.data, 0) : 1000;
        if (delay > 400000) delay = 400000;
        this.log('info', `calculator asked us to wait ${delay} µs`);
        await sleep(Math.max(1, delay / 1000));
        continue;
      }
      if (pkt.type === VirtType.ERROR) {
        throw new CalcError(pkt.data.length >= 2 ? readU16be(pkt.data, 0) : 0);
      }
      return pkt;
    }
  }

  private async recvVirtualOnce(): Promise<VirtualPacket> {
    let declared = 0;
    let type = 0;
    let parts: Uint8Array[] = [];
    let got = 0;
    let firstPkt = true;
    for (;;) {
      const raw = await this.recvRaw();
      if (raw.type !== RawType.VIRT_DATA && raw.type !== RawType.VIRT_DATA_LAST) {
        throw new ProtocolError(`Unexpected raw packet type ${raw.type} while receiving data`);
      }
      if (firstPkt) {
        if (raw.data.length < 6) throw new ProtocolError('First raw packet too small');
        declared = readU32be(raw.data, 0);
        type = readU16be(raw.data, 4);
        parts.push(raw.data.slice(6));
        got += raw.data.length - 6;
        firstPkt = false;
      } else {
        parts.push(raw.data);
        got += raw.data.length;
      }
      await this.sendRawAck();
      if (raw.type === RawType.VIRT_DATA_LAST) break;
    }
    const data = concat(...parts);
    if (got !== declared) {
      this.log('info', `warning: declared ${declared} bytes, received ${got}`);
    }
    this.log('rx', `virtual ${virtTypeName(type)} (${data.length} bytes)`);
    return { type, data };
  }

  async expect(type: number): Promise<VirtualPacket> {
    const pkt = await this.recvVirtual();
    if (pkt.type !== type) throw new ProtocolError(`Expected ${virtTypeName(type)}, got ${virtTypeName(pkt.type)}`);
    return pkt;
  }
}
