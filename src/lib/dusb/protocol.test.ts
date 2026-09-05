import { describe, expect, it } from 'vitest';
import { DusbLink, CalcError } from './protocol';
import { CECalculator, parseVarHeader, asmSupport } from './calculator';
import type { Transport } from './transport';
import { RawType, VirtType } from './constants';
import { concat, fromHex, hex, u16be, u32be } from '../bytes';

/** Scripted transport: records writes, serves queued reads in 64-byte USB packets. */
class FakeTransport implements Transport {
  packetSize = 64;
  writes: Uint8Array[] = [];
  private queue: Uint8Array[] = [];
  open = async () => {};
  close = async () => {};
  async write(d: Uint8Array) { this.writes.push(d); }
  async read(max: number) {
    if (!this.queue.length) throw new Error('fake transport: no more data queued');
    const head = this.queue[0];
    const n = Math.min(max, head.length);
    const out = head.slice(0, n);
    if (n === head.length) this.queue.shift(); else this.queue[0] = head.slice(n);
    return out;
  }
  /** Queue a raw packet the "calculator" sends. */
  raw(type: number, data: Uint8Array) { this.queue.push(concat(u32be(data.length), new Uint8Array([type]), data)); }
  rawAck() { this.raw(RawType.VIRT_DATA_ACK, new Uint8Array([0xe0, 0])); }
  /** Queue a virtual packet, fragmented into `max`-byte raw packets like a real calculator. */
  virtual(type: number, data: Uint8Array, max = 1018) {
    const payload = concat(u32be(data.length), u16be(type), data);
    for (let off = 0; off < payload.length; off += max) {
      const chunk = payload.slice(off, off + max);
      this.raw(off + chunk.length >= payload.length ? RawType.VIRT_DATA_LAST : RawType.VIRT_DATA, chunk);
    }
  }
  lastWrite() { return this.writes[this.writes.length - 1]; }
}

describe('DusbLink framing', () => {
  it('negotiates the buffer size and clamps the CE value', async () => {
    const t = new FakeTransport();
    t.raw(RawType.BUF_SIZE_ALLOC, u32be(1024));
    const link = new DusbLink(t);
    expect(await link.negotiateBufferSize()).toBe(1018);
    expect(hex(t.writes[0])).toBe('00 00 00 04 01 00 00 04 00');
  });

  it('sends a small virtual packet as one VIRT_DATA_LAST raw packet and waits for the ack', async () => {
    const t = new FakeTransport();
    t.rawAck();
    const link = new DusbLink(t);
    await link.sendVirtual(VirtType.PING, fromHex('0003 0001 0000 0000 07d0'));
    expect(hex(t.writes[0])).toBe('00 00 00 10 04 00 00 00 0A 00 01 00 03 00 01 00 00 00 00 07 D0');
  });

  it('fragments large virtual packets and sends the zero-length workaround when needed', async () => {
    const t = new FakeTransport();
    const link = new DusbLink(t);
    link.maxRaw = 1018;
    const data = new Uint8Array(1500).fill(0xab);
    t.rawAck(); t.rawAck();
    await link.sendVirtual(VirtType.VAR_CNTS, data);
    // first raw: 1018 bytes incl. 6-byte header; second: remaining 488 bytes
    expect(t.writes[0].length).toBe(5 + 1018);
    expect(t.writes[0][4]).toBe(RawType.VIRT_DATA);
    expect(hex(t.writes[0].slice(5, 11))).toBe('00 00 05 DC 00 0D');
    expect(t.writes[1].length).toBe(5 + 488);
    expect(t.writes[1][4]).toBe(RawType.VIRT_DATA_LAST);
    // A final raw packet whose USB transfer is a multiple of 64 bytes triggers a zero-length write.
    const t2 = new FakeTransport();
    const link2 = new DusbLink(t2);
    t2.rawAck();
    await link2.sendVirtual(VirtType.VAR_CNTS, new Uint8Array(64 - 5 - 6));
    expect(t2.writes.length).toBe(2);
    expect(t2.writes[1].length).toBe(0);
  });

  it('reassembles fragmented responses and acks every raw packet', async () => {
    const t = new FakeTransport();
    const link = new DusbLink(t);
    const big = new Uint8Array(2500).map((_, i) => i & 0xff);
    t.virtual(VirtType.VAR_CNTS, big);
    const pkt = await link.recvVirtual();
    expect(pkt.type).toBe(VirtType.VAR_CNTS);
    expect(hex(pkt.data)).toBe(hex(big));
    expect(t.writes.length).toBe(3);
    for (const w of t.writes) expect(hex(w)).toBe('00 00 00 02 05 E0 00');
  });

  it('waits on DELAY_ACK and then returns the real packet', async () => {
    const t = new FakeTransport();
    const link = new DusbLink(t);
    t.virtual(VirtType.DELAY_ACK, u32be(1000));
    t.virtual(VirtType.DATA_ACK, new Uint8Array(0));
    const pkt = await link.recvVirtual();
    expect(pkt.type).toBe(VirtType.DATA_ACK);
  });

  it('turns calculator error packets into CalcError', async () => {
    const t = new FakeTransport();
    const link = new DusbLink(t);
    t.virtual(VirtType.ERROR, u16be(0x0008));
    await expect(link.recvVirtual()).rejects.toBeInstanceOf(CalcError);
  });

  it('answers a buffer-size request that arrives instead of an ack', async () => {
    const t = new FakeTransport();
    const link = new DusbLink(t);
    t.raw(RawType.BUF_SIZE_REQ, u32be(250));
    t.rawAck();
    await link.sendVirtual(VirtType.EOT);
    expect(hex(t.writes[1])).toBe('00 00 00 04 02 00 00 00 FA');
  });
});

describe('CECalculator commands', () => {
  function connected() {
    const t = new FakeTransport();
    const calc = new CECalculator(t);
    calc.link.maxRaw = 1018;
    calc.info = { isCE: true } as never;
    return { t, calc };
  }

  it('builds the directory request like libticalcs', async () => {
    const { t, calc } = connected();
    t.rawAck();
    t.virtual(VirtType.VAR_HDR, concat(
      new Uint8Array([0]),                                   // no folder
      new Uint8Array([4]), new TextEncoder().encode('PHYS'), new Uint8Array([0]),
      u16be(3),
      u16be(0x01), new Uint8Array([0]), u16be(4), u32be(1234),
      u16be(0x02), new Uint8Array([0]), u16be(4), new Uint8Array([0xf0, 0x0f, 0x00, 0x05]),
      u16be(0x03), new Uint8Array([0]), u16be(1), new Uint8Array([1]),
    ));
    t.virtual(VirtType.EOT, new Uint8Array(0));
    const vars = await calc.listVariables();
    expect(hex(t.writes[0])).toBe('00 00 00 17 04 00 00 00 11 00 09 00 00 00 03 00 01 00 02 00 03 00 01 00 01 00 01 01');
    expect(vars).toEqual([{ name: 'PHYS', type: 5, size: 1234, archived: true }]);
  });

  it('sends a program with RTS, contents and EOT', async () => {
    const { t, calc } = connected();
    t.rawAck(); t.virtual(VirtType.DATA_ACK, new Uint8Array(0));
    t.rawAck(); t.virtual(VirtType.DATA_ACK, new Uint8Array(0));
    t.rawAck();
    const data = fromHex('03 00 DE 31 3F');
    await calc.sendVariable({ name: 'AB', type: 5, data, archived: true, version: 0 });
    const rts = t.writes[0];
    expect(hex(rts)).toBe(
      '00 00 00 27 04 00 00 00 21 00 0B ' +
      '00 02 41 42 00 00 00 00 05 01 00 03 ' +
      '00 02 00 04 F0 0F 00 05 ' +
      '00 03 00 01 01 ' +
      '00 08 00 04 00 00 00 00',
    );
    expect(hex(t.writes[2])).toBe('00 00 00 0B 04 00 00 00 05 00 0D 03 00 DE 31 3F');
    expect(hex(t.writes[4])).toBe('00 00 00 06 04 00 00 00 00 DD 00');
  });

  it('deletes a variable through MODIF_VAR', async () => {
    const { t, calc } = connected();
    t.rawAck(); t.virtual(VirtType.DATA_ACK, new Uint8Array(0));
    await calc.deleteVariable('AB', 5);
    expect(hex(t.writes[0])).toBe('00 00 00 1A 04 00 00 00 14 00 10 00 02 41 42 00 00 01 00 11 00 04 F0 0B 00 05 01 00 00 00 00');
  });

  it('parses variable headers', () => {
    const p = parseVarHeader(concat(new Uint8Array([0, 1]), new TextEncoder().encode('A'), new Uint8Array([0]), u16be(1), u16be(3), new Uint8Array([0]), u16be(1), new Uint8Array([1])));
    expect(p.name).toBe('A');
    expect(p.attrs[0]).toEqual({ id: 3, data: new Uint8Array([1]) });
  });
});

describe('asmSupport', () => {
  it('classifies OS versions', () => {
    expect(asmSupport('5.4.0')).toMatchObject({ asmNative: true, asmWithJailbreak: false, asmBlocked: false });
    expect(asmSupport('5.8.4')).toMatchObject({ asmNative: false, asmWithJailbreak: true, asmBlocked: false });
    expect(asmSupport('5.8.5')).toMatchObject({ asmNative: false, asmWithJailbreak: false, asmBlocked: true });
    expect(asmSupport('5.8.10')).toMatchObject({ asmBlocked: true });
  });
});
