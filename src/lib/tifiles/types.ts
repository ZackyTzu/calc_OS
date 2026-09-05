// Variable type identifiers for the TI-83+/84+ family (shared by the CE).
export const VarType = {
  REAL: 0x00,
  LIST: 0x01,
  MATRIX: 0x02,
  EQUATION: 0x03,
  STRING: 0x04,
  PROGRAM: 0x05,
  PROTECTED_PROGRAM: 0x06,
  PICTURE: 0x07,
  GDB: 0x08,
  COMPLEX: 0x0c,
  WINDOW: 0x0f,
  ZSTO: 0x10,
  TABLE: 0x11,
  BACKUP: 0x13,
  APPVAR: 0x15,
  GROUP: 0x17,
  IMAGE: 0x1a,
  APP: 0x24,
  CERTIFICATE: 0x25,
  ID_LIST: 0x26,
  CLOCK: 0x29,
} as const;

export type VarTypeId = number;

const NAMES: Record<number, string> = {
  0x00: 'Real',
  0x01: 'List',
  0x02: 'Matrix',
  0x03: 'Equation',
  0x04: 'String',
  0x05: 'Program',
  0x06: 'Program (locked)',
  0x07: 'Picture',
  0x08: 'GDB',
  0x0c: 'Complex',
  0x0d: 'Complex list',
  0x0f: 'Window',
  0x10: 'Zoom',
  0x11: 'Table',
  0x13: 'Backup',
  0x15: 'AppVar',
  0x17: 'Group',
  0x1a: 'Image',
  0x24: 'App',
  0x25: 'Certificate',
  0x26: 'ID list',
  0x29: 'Clock',
};

export function typeName(type: number): string {
  return NAMES[type] ?? `Type 0x${type.toString(16).padStart(2, '0')}`;
}

/** File extension the TI ecosystem uses for a single variable of this type. */
export function typeExtension(type: number): string {
  switch (type) {
    case 0x00: return '8xn';
    case 0x01: return '8xl';
    case 0x02: return '8xm';
    case 0x03: return '8xy';
    case 0x04: return '8xs';
    case 0x05:
    case 0x06: return '8xp';
    case 0x07: return '8xi';
    case 0x08: return '8xd';
    case 0x0c: return '8xc';
    case 0x0f: return '8xw';
    case 0x10: return '8xz';
    case 0x11: return '8xt';
    case 0x15: return '8xv';
    case 0x17: return '8xg';
    case 0x1a: return '8ca';
    case 0x24: return '8ek';
    default: return '8xv';
  }
}

export function isProgram(type: number): boolean {
  return type === VarType.PROGRAM || type === VarType.PROTECTED_PROGRAM;
}

/** Extensions our importer accepts. */
export const IMPORTABLE_EXTENSIONS = ['8xp', '8xv', '8xg', '8xl', '8xn', '8xm', '8xs', '8xy', '8xi', '8xd', '8xc', '8xw', '8xz', '8xt', '8ca', '8ek', '8xk'];
