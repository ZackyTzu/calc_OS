// DUSB ("Direct USB" / CARS) protocol constants for TI-84 Plus family calculators.
// Values follow libticalcs (tilibs) by Lionel Debroux et al., GPL-2+.

export const TI_VENDOR_ID = 0x0451;

export const PRODUCT_IDS: Record<number, string> = {
  0xe003: 'TI-84 Plus',
  0xe004: 'TI-89 Titanium',
  0xe008: 'TI-84 Plus CE',
  0xe012: 'TI-Nspire',
  0xe020: 'TI-Nspire CX II',
};

export const RawType = {
  BUF_SIZE_REQ: 1,
  BUF_SIZE_ALLOC: 2,
  VIRT_DATA: 3,
  VIRT_DATA_LAST: 4,
  VIRT_DATA_ACK: 5,
} as const;

export const VirtType = {
  PING: 0x0001,
  OS_BEGIN: 0x0002,
  OS_ACK: 0x0003,
  OS_HEADER: 0x0004,
  OS_DATA: 0x0005,
  EOT_ACK: 0x0006,
  PARM_REQ: 0x0007,
  PARM_DATA: 0x0008,
  DIR_REQ: 0x0009,
  VAR_HDR: 0x000a,
  RTS: 0x000b,
  VAR_REQ: 0x000c,
  VAR_CNTS: 0x000d,
  PARM_SET: 0x000e,
  MODIF_VAR: 0x0010,
  EXECUTE: 0x0011,
  MODE_SET: 0x0012,
  DATA_ACK: 0xaa00,
  DELAY_ACK: 0xbb00,
  EOT: 0xdd00,
  ERROR: 0xee00,
} as const;

export const virtTypeName = (t: number): string =>
  Object.entries(VirtType).find(([, v]) => v === t)?.[0] ?? `0x${t.toString(16).padStart(4, '0')}`;

/** Parameter IDs (PID). */
export const PID = {
  PRODUCT_NUMBER: 0x0001,
  PRODUCT_NAME: 0x0002,
  MAIN_PART_ID: 0x0003,
  HW_VERSION: 0x0004,
  FULL_ID: 0x0005,
  LANGUAGE_ID: 0x0006,
  SUBLANG_ID: 0x0007,
  DEVICE_TYPE: 0x0008,
  BOOT_VERSION: 0x0009,
  OS_MODE: 0x000a,
  OS_VERSION: 0x000b,
  PHYS_RAM: 0x000c,
  USER_RAM: 0x000d,
  FREE_RAM: 0x000e,
  PHYS_FLASH: 0x000f,
  USER_FLASH: 0x0010,
  FREE_FLASH: 0x0011,
  LCD_WIDTH: 0x001e,
  LCD_HEIGHT: 0x001f,
  BITS_PER_PIXEL: 0x001d,
  COLOR_AVAILABLE: 0x001b,
  BATTERY_ENOUGH: 0x002d,
  BATTERY_LEVEL: 0x002e,
  HOMESCREEN: 0x0037,
  BUSY: 0x0038,
  OS_BUILD_NUMBER: 0x0048,
  BOOT_BUILD_NUMBER: 0x0049,
  MATH_CAPABILITIES: 0x004b,
  OS_VERSION_STRING: 0x0052,
  BOOT_VERSION_STRING: 0x0053,
  PTT_MODE_STATE: 0x0054,
  PYTHON_ON_BOARD: 0x005d,
} as const;

/** Attribute IDs (AID). */
export const AID = {
  VAR_SIZE: 0x01,
  VAR_TYPE: 0x02,
  ARCHIVED: 0x03,
  VAR_VERSION: 0x08,
  DATATYPE: 0x11,
  ARCHIVED2: 0x13,
  LOCKED: 0x41,
} as const;

export const EID = { PRGM: 0x00, ASM: 0x01, APP: 0x02, KEY: 0x03 } as const;

export const MODE_NORMAL = new Uint8Array([0, 3, 0, 1, 0, 0, 0, 0, 0x07, 0xd0]);

/** Default buffer size we request; the CE allocates 1024 but only handles 1018-byte raw packets. */
export const DEFAULT_BUF_SIZE = 1024;
export const CE_MAX_RAW = 1018;

/** Known calculator-side error codes (DUSB 0xEE00 payload). */
export const ERROR_MESSAGES: Record<number, string> = {
  0x0004: 'Invalid argument or unsupported request',
  0x0007: 'Not enough memory on the calculator',
  0x0008: 'Variable does not exist or is protected',
  0x0009: 'Transmission error',
  0x000c: 'Invalid name',
  0x000e: 'Variable is locked',
  0x0012: 'Operation not allowed right now',
  0x0016: 'Calculator is busy (leave the home screen or finish the current operation)',
};
