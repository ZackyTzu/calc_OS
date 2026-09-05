// The program library: what can be installed, where it comes from, and what it needs.
import { subjects } from '../programs';

export type Category = 'academic' | 'games' | 'tools' | 'assistant';
export type Requirement = 'asm' | 'clibs';

export type LibrarySource =
  | { type: 'generated'; subject: string }
  | { type: 'hosted'; files: string[] }
  | { type: 'external'; url: string; note: string };

export interface LibraryEntry {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: Category;
  calculator: 'ce' | 'nspire';
  kind: 'tibasic' | 'asm' | 'python' | 'lua' | 'tns' | 'appvar';
  requires: Requirement[];
  source: LibrarySource;
  author: string;
  license: string;
  homepage?: string;
  version?: string;
  tags: string[];
  /** Short bullet list shown on the detail page. */
  features?: string[];
  /** Name of the variable(s) the program creates on the calculator, for conflict detection. */
  installs?: string[];
}

export const CATEGORY_LABELS: Record<Category, string> = {
  academic: 'Academic',
  games: 'Games',
  tools: 'Tools & shells',
  assistant: 'Math assistant',
};

const generated: LibraryEntry[] = subjects.map((s) => ({
  id: s.program.toLowerCase(),
  name: s.title.replace(/^AP /, 'AP '),
  tagline: s.description.split('.')[0] + '.',
  description: s.description,
  category: 'academic',
  calculator: 'ce',
  kind: 'tibasic',
  requires: [],
  source: { type: 'generated', subject: s.program },
  author: 'calc_OS',
  license: 'GPL-3.0-or-later',
  version: '1.0',
  tags: ['AP', 'solver', 'notes', 'TI-BASIC'],
  features: [
    `${s.topics.filter((t) => t.equations.length).length} units, ${s.topics.reduce((n, t) => n + t.equations.length, 0)} formulas`,
    'Solve for any variable: type the knowns, get the unknown',
    'Notes for every formula: when to use it and what to watch for',
    'Runs on every TI-84 Plus CE OS, no jailbreak needed',
    'Adjustable constants under Settings',
  ],
  installs: [s.program],
}));

export const catalog: LibraryEntry[] = [
  ...generated,
  {
    id: 'clibs',
    name: 'CE C Libraries',
    tagline: 'Shared libraries most C and assembly games need.',
    description:
      'The CE C libraries (graphx, fileioc, keypadc, fontlibc, libload and friends) are AppVars that C and assembly programs load at run time. Almost every modern CE game requires them. Install once; they live in the archive.',
    category: 'tools',
    calculator: 'ce',
    kind: 'appvar',
    requires: ['asm'],
    source: { type: 'hosted', files: ['library/third-party/clibs/clibs.8xg'] },
    author: 'CE-Programming contributors',
    license: 'BSD-2-Clause',
    homepage: 'https://github.com/CE-Programming/libraries',
    version: 'v15.0',
    tags: ['libraries', 'required for C games'],
    installs: ['GRAPHX', 'FILEIOC', 'KEYPADC', 'FONTLIBC', 'LIBLOAD', 'USBDRVCE', 'SRLDRVCE', 'MSDDRVCE', 'FATDRVCE', 'LCDDRVCE'],
  },
  {
    id: 'cesium',
    name: 'Cesium',
    tagline: 'A fast shell for launching programs, with icons and folders.',
    description:
      'Cesium is a graphical shell for the TI-84 Plus CE. Run any program from one menu, see icons and descriptions, archive and hide programs, and jump straight into the BASIC editor. Running the installer program creates the Cesium app.',
    category: 'tools',
    calculator: 'ce',
    kind: 'asm',
    requires: ['asm'],
    source: { type: 'hosted', files: ['library/third-party/cesium/CESIUM.8xp'] },
    author: 'Matt "MateoConLechuga" Waltz',
    license: 'BSD-3-Clause',
    homepage: 'https://github.com/mateoconlechuga/cesium',
    version: 'v3.7.0',
    tags: ['shell', 'launcher'],
    installs: ['CESIUM'],
  },
  {
    id: 'artifice',
    name: 'arTIfiCE jailbreak',
    tagline: 'Restores assembly programs on OS 5.5 to 5.8.4.',
    description:
      'TI removed assembly support from the TI-84 Plus CE operating system in 2020. arTIfiCE puts it back on OS 5.3 through 5.8.4 so that C and assembly games can run. It does NOT work on OS 5.8.5 or later. Download it from the official page, then drop the .8xp on the My Calculator page to install. On the calculator: prgm, pick A (choose TI-BASIC if asked), enter, then MODE to exit.',
    category: 'tools',
    calculator: 'ce',
    kind: 'tibasic',
    requires: [],
    source: { type: 'external', url: 'https://yvantt.github.io/arTIfiCE/', note: 'No redistribution licence is published, so we link to the official download instead of hosting a copy.' },
    author: 'YvanTT and the arTIfiCE team',
    license: 'Unspecified (official download)',
    homepage: 'https://github.com/YvanTT/arTIfiCE',
    version: 'v2.1',
    tags: ['jailbreak', 'assembly'],
  },
  {
    id: 'oiram',
    name: 'Oiram',
    tagline: 'Mario-style platformer with a level editor.',
    description:
      'Oiram is a fast, full-colour Mario-style platformer written in C and assembly, with enemies, power-ups, many levels and support for custom level packs. Requires the CE C libraries and assembly support (native on OS 5.4 or below, arTIfiCE on 5.5 to 5.8.4).',
    category: 'games',
    calculator: 'ce',
    kind: 'asm',
    requires: ['asm', 'clibs'],
    source: { type: 'external', url: 'https://www.cemetech.net/downloads/files/1526/x1526', note: 'Download the zip from Cemetech, then drop the .8xp and .8xv files on the My Calculator page.' },
    author: 'Matt "MateoConLechuga" Waltz',
    license: 'BSD-3-Clause',
    homepage: 'https://github.com/mateoconlechuga/oiram',
    tags: ['platformer', 'mario', 'assembly'],
    installs: ['OIRAM', 'OiramS', 'OiramT', 'OiramPK'],
  },
  {
    id: 'pacman',
    name: 'Pac-Man CE',
    tagline: 'The arcade classic with smooth graphics.',
    description: 'A faithful Pac-Man for the CE. Requires the CE C libraries and assembly support.',
    category: 'games',
    calculator: 'ce',
    kind: 'asm',
    requires: ['asm', 'clibs'],
    source: { type: 'external', url: 'https://www.cemetech.net/downloads/files/1305/x1305', note: 'No open-source licence is published, so download from the author\'s page and install from file.' },
    author: 'Matt "MateoConLechuga" Waltz',
    license: 'All rights reserved (author download)',
    tags: ['arcade', 'assembly'],
  },
  {
    id: 'flappybird',
    name: 'FlappyBird CE',
    tagline: 'Tap to flap, dodge the pipes.',
    description: 'The Flappy Bird clone everyone installs first. Requires the CE C libraries and assembly support.',
    category: 'games',
    calculator: 'ce',
    kind: 'asm',
    requires: ['asm', 'clibs'],
    source: { type: 'external', url: 'https://www.cemetech.net/downloads/files/1465/x1465', note: 'No open-source licence is published, so download from the author\'s page and install from file.' },
    author: 'Rico',
    license: 'All rights reserved (author download)',
    homepage: 'https://github.com/Ricovl/FlappyBirdCE',
    tags: ['arcade', 'assembly'],
  },
  {
    id: 'tetrica',
    name: 'Tetric A',
    tagline: 'Tetris with five game modes.',
    description: 'A fast, polished Tetris for the CE by the founder of Cemetech. Requires assembly support.',
    category: 'games',
    calculator: 'ce',
    kind: 'asm',
    requires: ['asm'],
    source: { type: 'external', url: 'https://www.cemetech.net/downloads/files/1347/x1347', note: 'Download from the author\'s page and install from file.' },
    author: 'Christopher "KermMartian" Mitchell',
    license: 'All rights reserved (author download)',
    tags: ['puzzle', 'assembly'],
  },
  {
    id: 'geometrydash',
    name: 'Geometry Dash CE',
    tagline: 'Jump-timing platformer with custom levels.',
    description: 'Geometry Dash on your calculator, with a level editor. Requires the CE C libraries and assembly support.',
    category: 'games',
    calculator: 'ce',
    kind: 'asm',
    requires: ['asm', 'clibs'],
    source: { type: 'external', url: 'https://www.cemetech.net/downloads/files/1568/x2325', note: 'Download from the author\'s page and install from file.' },
    author: 'Epharius',
    license: 'All rights reserved (author download)',
    tags: ['platformer', 'assembly'],
  },
];

export function findEntry(id: string): LibraryEntry | undefined {
  return catalog.find((e) => e.id === id);
}
