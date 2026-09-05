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
    id: 'mathbot',
    name: 'MathBot',
    tagline: 'Ask a math question on the calculator, get the answer with steps. Works offline.',
    description:
      'MathBot is a math assistant that runs entirely on the calculator. Type a question in capitals such as SOLVE 3X-7=11, FACTOR 360, GCD 12,18, SQRT 72, MEAN 4,8,15 or DERIV X^2 AT 3, or use its menus. It recognises linear and quadratic equations and shows the steps (isolate X, discriminant, quadratic formula), factors integers, simplifies radicals and fractions, does percent problems, geometry formulas, list statistics, numeric derivatives and integrals. It is rule-based, not a language model: nothing leaves the calculator and no internet is needed.',
    category: 'assistant',
    calculator: 'ce',
    kind: 'tibasic',
    requires: [],
    source: { type: 'generated', subject: 'MATHBOT' },
    author: 'calc_OS',
    license: 'GPL-3.0-or-later',
    version: '1.0',
    tags: ['assistant', 'solver', 'steps', 'TI-BASIC'],
    features: [
      'Type questions: SOLVE, FACTOR, PRIME, GCD, LCM, SQRT, MEAN, SLOPE, DERIV, INTEG, percent, or any arithmetic',
      'Step-by-step for linear and quadratic equations, including complex roots',
      'Menus for fractions, percent, geometry, statistics of a list, derivatives and integrals',
      'Runs on every TI-84 Plus CE OS (5.2 or newer), no jailbreak needed',
    ],
    installs: ['MATHBOT'],
  },
  ...([
    ['g2048', 'G2048', '2048', 'Slide and merge tiles to reach 2048.', 'The addictive sliding-tile puzzle on the home screen. Arrow keys slide all tiles; equal tiles merge and add to your score. Two tiles are never the same game twice.', ['Arrow keys to slide, CLEAR to quit', 'Score and game-over detection', 'Text-mode: runs on every OS'], ['puzzle']],
    ['snake', 'SNAKE', 'Snake', 'Steer the snake, eat, grow, do not hit your tail.', 'Classic snake on the 26 x 8 home-screen grid. Eat the * to grow. Hitting a wall or your own tail ends the game.', ['Arrow keys steer', 'Score and length shown at the end', 'Text-mode: runs on every OS'], ['arcade']],
    ['tictac', 'TICTAC', 'Tic-Tac-Toe', 'Beat the calculator, if you can.', 'Tic-tac-toe against a computer opponent that takes wins, blocks yours, grabs the centre and corners. Pick cells with the number keys laid out like the keypad.', ['Unbeatable-ish AI', 'Instant replay with ENTER', 'Text-mode: runs on every OS'], ['board']],
    ['blackjack', 'BLACKJCK', 'Blackjack', 'Hit or stand against a dealer who stands on 17.', 'Casino blackjack with a bankroll. Blackjack pays 3 to 2, aces count as 1 or 11 automatically, dealer stands on 17.', ['Bet from your bankroll', 'Hit / Stand menu', 'Text-mode: runs on every OS'], ['cards', 'casino']],
    ['poker', 'POKER', 'Video Poker', 'Jacks or Better with the real pay table.', 'Five-card draw video poker from a shuffled 52-card deck. Hold cards with keys 1 to 5, draw with ENTER. Pays from a pair of jacks up to a royal flush at 250 times your bet.', ['Standard Jacks-or-Better pay table', 'Real 52-card deck, no repeats', 'Text-mode: runs on every OS'], ['cards', 'casino']],
  ] as const).map(([id, prog, name, tagline, description, features, tags]) => ({
    id, name, tagline, description,
    category: 'games' as const, calculator: 'ce' as const, kind: 'tibasic' as const, requires: [] as Requirement[],
    source: { type: 'generated' as const, subject: prog },
    author: 'calc_OS', license: 'GPL-3.0-or-later', version: '1.0',
    tags: [...tags, 'TI-BASIC'], features: [...features], installs: [prog],
  })),
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
