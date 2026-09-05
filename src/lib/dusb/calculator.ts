// High-level operations on a TI-84 Plus CE (and siblings) over DUSB.
import { concat, latin1, fromLatin1, readU16be, readU32be, readU64be, u16be, u32be, u8 } from '../bytes';
import { AID, EID, MODE_NORMAL, PID, PRODUCT_IDS, TI_VENDOR_ID, VirtType } from './constants';
import { DusbLink, ProtocolError, type LogFn } from './protocol';
import type { Transport, USBDeviceLike } from './transport';
import { WebUSBTransport } from './transport';
import type { VarEntry } from '../tifiles/tifile';
import { VarType } from '../tifiles/types';

export interface CalcParam { id: number; ok: boolean; data: Uint8Array }
export interface CalcAttr { id: number; data: Uint8Array }

export interface CalcVariable {
  name: string;
  type: number;
  size: number;
  archived: boolean;
}

export interface CalcInfo {
  productId: number;
  productName: string;
  model: string;
  osVersion: string;       // e.g. "5.8.5.0034"
  osMajorMinor: string;    // e.g. "5.8.5"
  bootVersion: string;
  hwVersion: number;
  ramFree: number;
  ramTotal: number;
  flashFree: number;
  flashTotal: number;
  colorScreen: boolean;
  pythonOnBoard: boolean;
  exactMath: boolean;
  isCE: boolean;
  /** Assembly programs run natively (OS <= 5.4) */
  asmNative: boolean;
  /** Assembly possible with the arTIfiCE jailbreak (OS 5.3 – 5.8.4) */
  asmWithJailbreak: boolean;
  /** No known way to run assembly (OS >= 5.8.5) */
  asmBlocked: boolean;
}

export type ProgressFn = (sent: number, total: number) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function encodeAttrs(attrs: CalcAttr[]): Uint8Array {
  return concat(u16be(attrs.length), ...attrs.map((a) => concat(u16be(a.id), u16be(a.data.length), a.data)));
}
function cstr(s: string): Uint8Array {
  return concat(u8(s.length), latin1(s), u8(0));
}

/** Compare dotted version strings numerically. */
export function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export function asmSupport(osMajorMinor: string): Pick<CalcInfo, 'asmNative' | 'asmWithJailbreak' | 'asmBlocked'> {
  const asmNative = compareVersion(osMajorMinor, '5.5') < 0;
  const asmBlocked = compareVersion(osMajorMinor, '5.8.5') >= 0;
  return { asmNative, asmWithJailbreak: !asmNative && !asmBlocked, asmBlocked };
}

export class CECalculator {
  readonly link: DusbLink;
  info: CalcInfo | null = null;
  private busy = false;

  constructor(public readonly transport: Transport) {
    this.link = new DusbLink(transport);
  }

  set log(fn: LogFn) {
    this.link.log = fn;
  }

  static usbFilters() {
    return [{ vendorId: TI_VENDOR_ID }];
  }

  static fromUSBDevice(device: USBDeviceLike): CECalculator {
    return new CECalculator(new WebUSBTransport(device));
  }

  /** Runs one operation at a time; the calculator cannot interleave requests. */
  private async exclusive<T>(fn: () => Promise<T>): Promise<T> {
    if (this.busy) throw new ProtocolError('Another operation is still running');
    this.busy = true;
    try {
      return await fn();
    } finally {
      this.busy = false;
    }
  }

  async connect(): Promise<CalcInfo> {
    return this.exclusive(async () => {
      await this.transport.open();
      await this.link.negotiateBufferSize();
      await this.link.sendVirtual(VirtType.PING, MODE_NORMAL);
      await this.link.expect(VirtType.MODE_SET);
      this.info = await this.readInfo();
      return this.info;
    });
  }

  async disconnect(): Promise<void> {
    await this.transport.close();
    this.info = null;
  }

  /** Re-checks the link is alive; also re-sends the mode packet as TI-Connect does before each session. */
  async ping(): Promise<boolean> {
    try {
      await this.exclusive(async () => {
        await this.link.sendVirtual(VirtType.PING, MODE_NORMAL);
        await this.link.expect(VirtType.MODE_SET);
      });
      return true;
    } catch {
      return false;
    }
  }

  // ---- parameters -------------------------------------------------------

  private async requestParams(pids: number[]): Promise<CalcParam[]> {
    await this.link.sendVirtual(VirtType.PARM_REQ, concat(u16be(pids.length), ...pids.map((p) => u16be(p))));
    const pkt = await this.link.expect(VirtType.PARM_DATA);
    const n = readU16be(pkt.data, 0);
    const out: CalcParam[] = [];
    let j = 2;
    for (let i = 0; i < n; i++) {
      const id = readU16be(pkt.data, j); j += 2;
      const ok = pkt.data[j++] === 0;
      let data = new Uint8Array(0);
      if (ok) {
        const size = readU16be(pkt.data, j); j += 2;
        data = pkt.data.slice(j, j + size); j += size;
      }
      out.push({ id, ok, data });
    }
    return out;
  }

  private async readInfo(): Promise<CalcInfo> {
    const pids = [
      PID.PRODUCT_NUMBER, PID.PRODUCT_NAME, PID.HW_VERSION, PID.BOOT_BUILD_NUMBER, PID.BOOT_VERSION,
      PID.OS_BUILD_NUMBER, PID.OS_VERSION, PID.PHYS_RAM, PID.USER_RAM, PID.FREE_RAM, PID.PHYS_FLASH,
      PID.USER_FLASH, PID.FREE_FLASH, PID.COLOR_AVAILABLE, PID.MATH_CAPABILITIES, PID.PYTHON_ON_BOARD,
    ];
    const params = await this.requestParams(pids);
    const get = (id: number) => params.find((p) => p.id === id && p.ok)?.data;
    const version = (v?: Uint8Array, build?: Uint8Array) => {
      if (!v || v.length < 3) return '';
      const base = v.length >= 4 ? `${v[1]}.${v[2]}.${v[3]}` : `${v[1]}.${v[2]}`;
      const b = build && build.length === 2 ? readU16be(build, 0) : undefined;
      return b !== undefined ? `${base}.${String(b).padStart(4, '0')}` : base;
    };
    const u64 = (d?: Uint8Array) => (d && d.length === 8 ? readU64be(d, 0) : 0);
    const prodNum = get(PID.PRODUCT_NUMBER);
    const productId = prodNum && prodNum.length === 4 ? prodNum[3] : 0;
    const osVersion = version(get(PID.OS_VERSION), get(PID.OS_BUILD_NUMBER));
    const osMajorMinor = osVersion.split('.').slice(0, 3).join('.');
    const exactMath = (get(PID.MATH_CAPABILITIES)?.[0] ?? 0) !== 0;
    const pythonOnBoard = (get(PID.PYTHON_ON_BOARD)?.[0] ?? 0) !== 0;
    const colorScreen = (get(PID.COLOR_AVAILABLE)?.[0] ?? 0) !== 0;
    const productName = fromLatin1(get(PID.PRODUCT_NAME) ?? new Uint8Array(0));
    // Product id 0x13 covers both the 83 Premium CE and the 84 Plus CE; exact-math tells them apart.
    const isCE = productId === 0x13 || /CE/.test(productName);
    let model = productName || PRODUCT_IDS[0xe008] || 'TI calculator';
    if (productId === 0x13) model = exactMath ? 'TI-83 Premium CE' : 'TI-84 Plus CE';
    if (pythonOnBoard && /CE$/.test(model)) model += ' Python';
    return {
      productId,
      productName,
      model,
      osVersion,
      osMajorMinor,
      bootVersion: version(get(PID.BOOT_VERSION), get(PID.BOOT_BUILD_NUMBER)),
      hwVersion: (() => { const d = get(PID.HW_VERSION); return d && d.length === 2 ? readU16be(d, 0) : 0; })(),
      ramFree: u64(get(PID.FREE_RAM)),
      ramTotal: u64(get(PID.USER_RAM)) || u64(get(PID.PHYS_RAM)),
      flashFree: u64(get(PID.FREE_FLASH)),
      flashTotal: u64(get(PID.USER_FLASH)) || u64(get(PID.PHYS_FLASH)),
      colorScreen,
      pythonOnBoard,
      exactMath,
      isCE,
      ...asmSupport(osMajorMinor || '0'),
    };
  }

  async refreshMemory(): Promise<{ ramFree: number; flashFree: number }> {
    return this.exclusive(async () => {
      const p = await this.requestParams([PID.FREE_RAM, PID.FREE_FLASH]);
      const ramFree = p[0]?.ok && p[0].data.length === 8 ? readU64be(p[0].data, 0) : 0;
      const flashFree = p[1]?.ok && p[1].data.length === 8 ? readU64be(p[1].data, 0) : 0;
      if (this.info) Object.assign(this.info, { ramFree, flashFree });
      return { ramFree, flashFree };
    });
  }

  // ---- directory listing ------------------------------------------------

  async listVariables(): Promise<CalcVariable[]> {
    return this.exclusive(async () => {
      const aids = [AID.VAR_SIZE, AID.VAR_TYPE, AID.ARCHIVED];
      const req = concat(u32be(aids.length), ...aids.map((a) => u16be(a)), new Uint8Array([0, 1, 0, 1, 0, 1, 1]));
      await this.link.sendVirtual(VirtType.DIR_REQ, req);
      const vars: CalcVariable[] = [];
      for (;;) {
        const pkt = await this.link.recvVirtual();
        if (pkt.type === VirtType.EOT) break;
        if (pkt.type !== VirtType.VAR_HDR) throw new ProtocolError(`Unexpected packet in directory listing: 0x${pkt.type.toString(16)}`);
        const { name, attrs } = parseVarHeader(pkt.data);
        const size = attrs.find((a) => a.id === AID.VAR_SIZE)?.data;
        const type = attrs.find((a) => a.id === AID.VAR_TYPE)?.data;
        const arch = attrs.find((a) => a.id === AID.ARCHIVED)?.data;
        vars.push({
          name,
          type: type && type.length === 4 ? type[3] : 0,
          size: size && size.length === 4 ? readU32be(size, 0) : 0,
          archived: !!(arch && arch[0]),
        });
      }
      return vars;
    });
  }

  // ---- sending ----------------------------------------------------------

  async sendVariable(entry: VarEntry, onProgress?: ProgressFn): Promise<void> {
    return this.exclusive(async () => {
      const typeAttr = new Uint8Array([0xf0, this.info?.isCE === false ? 0x0b : 0x0f, 0x00, entry.type]);
      const attrs: CalcAttr[] = [
        { id: AID.VAR_TYPE, data: typeAttr },
        { id: AID.ARCHIVED, data: new Uint8Array([entry.archived ? 1 : 0]) },
        { id: AID.VAR_VERSION, data: new Uint8Array([0, 0, 0, entry.version & 0xff]) },
      ];
      const rts = concat(u8(0), cstr(entry.name), u32be(entry.data.length), u8(0x01), encodeAttrs(attrs));
      onProgress?.(0, entry.data.length);
      await this.link.sendVirtual(VirtType.RTS, rts);
      await this.link.expect(VirtType.DATA_ACK);
      await this.link.sendVirtual(VirtType.VAR_CNTS, entry.data);
      await this.link.expect(VirtType.DATA_ACK);
      await this.link.sendVirtual(VirtType.EOT);
      onProgress?.(entry.data.length, entry.data.length);
      await sleep(50); // libticalcs: "needed"
    });
  }

  // ---- receiving --------------------------------------------------------

  async receiveVariable(name: string, type: number): Promise<VarEntry> {
    return this.exclusive(async () => {
      const aids = [AID.ARCHIVED, AID.VAR_VERSION, AID.VAR_SIZE];
      const attrs: CalcAttr[] = [{ id: AID.DATATYPE, data: new Uint8Array([0xf0, 0x07, 0x00, type]) }];
      const req = concat(
        u8(0), cstr(name), u8(0x01), new Uint8Array([0xff, 0xff, 0xff, 0xff]),
        u16be(aids.length), ...aids.map((a) => u16be(a)),
        encodeAttrs(attrs), u16be(0),
      );
      await this.link.sendVirtual(VirtType.VAR_REQ, req);
      const hdr = await this.link.expect(VirtType.VAR_HDR);
      const parsed = parseVarHeader(hdr.data);
      const cnt = await this.link.expect(VirtType.VAR_CNTS);
      const arch = parsed.attrs.find((a) => a.id === AID.ARCHIVED)?.data;
      const ver = parsed.attrs.find((a) => a.id === AID.VAR_VERSION)?.data;
      return {
        name: parsed.name || name,
        type,
        data: cnt.data,
        archived: !!(arch && arch[0]),
        version: ver && ver.length === 4 ? ver[3] : 0,
      };
    });
  }

  // ---- deleting ---------------------------------------------------------

  async deleteVariable(name: string, type: number): Promise<void> {
    return this.exclusive(async () => {
      const attrs: CalcAttr[] = [{ id: AID.DATATYPE, data: new Uint8Array([0xf0, 0x0b, 0x00, type]) }];
      const pkt = concat(
        u8(0), cstr(name), encodeAttrs(attrs),
        u8(0x01), // bypass file protection
        u8(0), u8(0), u16be(0),
      );
      await this.link.sendVirtual(VirtType.MODIF_VAR, pkt);
      await this.link.expect(VirtType.DATA_ACK);
    });
  }

  // ---- misc -------------------------------------------------------------

  async pressKey(code: number): Promise<void> {
    return this.exclusive(async () => {
      const hi = (code >> 8) & 0xff, lo = code & 0xff;
      const keyBytes = hi === 0 ? new Uint8Array([hi, lo]) : new Uint8Array([lo, hi]);
      await this.link.sendVirtual(VirtType.EXECUTE, concat(u8(0), u8(0), u8(EID.KEY), keyBytes));
      await this.link.expect(VirtType.DELAY_ACK).catch(() => undefined);
      await this.link.expect(VirtType.DATA_ACK);
    });
  }
}

export function parseVarHeader(data: Uint8Array): { folder: string; name: string; attrs: CalcAttr[] } {
  let j = 0;
  const fldLen = data[j++];
  let folder = '';
  if (fldLen) { folder = fromLatin1(data.slice(j, j + fldLen)); j += fldLen + 1; }
  const nameLen = data[j++];
  let name = '';
  if (nameLen) { name = fromLatin1(data.slice(j, j + nameLen)); j += nameLen + 1; }
  const nattr = readU16be(data, j); j += 2;
  const attrs: CalcAttr[] = [];
  for (let i = 0; i < nattr; i++) {
    const id = readU16be(data, j); j += 2;
    const ok = data[j++] === 0;
    let d = new Uint8Array(0);
    if (ok) {
      const size = readU16be(data, j); j += 2;
      d = data.slice(j, j + size); j += size;
    }
    attrs.push({ id, data: d });
  }
  return { folder, name, attrs };
}

export { VarType };
