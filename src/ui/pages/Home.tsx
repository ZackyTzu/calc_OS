import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCalculator } from '../../state/calculator';
import { Button, ButtonLink, Spinner } from '../components/ui';
import { Octicon, type OcticonName } from '../components/Octicon';
import { catalog } from '../../lib/library/catalog';
import { programByName } from '../../lib/programs';
import { CalcScreen } from '../components/CalcScreen';
import { previewTiBasic } from '../../lib/tibasic/preview';

const SECTIONS: { to: string; icon: OcticonName; name: string; note: string }[] = [
  { to: '/library', icon: 'FileDirectoryFill', name: 'Library', note: `${catalog.length} programs for the TI-84 Plus CE and TI-Nspire CX II` },
  { to: '/calculator', icon: 'FileDirectoryFill', name: 'My calculator', note: 'Connect, see what is installed, install from file, save, delete' },
  { to: '/unlock', icon: 'FileDirectoryFill', name: 'Unlock games', note: 'Assembly games and the arTIfiCE jailbreak, by OS version' },
  { to: '/gameboy', icon: 'FileDirectoryFill', name: 'Game Boy', note: 'Convert a cartridge ROM for the TI-Boy CE emulator and install it' },
  { to: '/nspire', icon: 'FileDirectoryFill', name: 'Nspire', note: 'Python solvers and MathBot for the CX II, sent from the browser' },
  { to: '/about', icon: 'File', name: 'About', note: 'Browser support, safety, credits' },
];

const KIND_META: Record<string, { label: string; color: string }> = {
  tibasic: { label: 'TI-BASIC', color: '#0969da' },
  asm: { label: 'Assembly / C', color: '#6e4c13' },
  python: { label: 'Python', color: '#3572a5' },
  lua: { label: 'Lua', color: '#000080' },
  appvar: { label: 'AppVar', color: '#59636e' },
  tns: { label: 'Nspire document', color: '#9a6700' },
};

const TOPICS: { label: string; to: string }[] = [
  { label: 'ti-84-plus-ce', to: '/library?calc=ce' },
  { label: 'ti-nspire-cx-ii', to: '/library?calc=nspire' },
  { label: 'webusb', to: '/about#browsers' },
  { label: 'ap-physics-1', to: '/library/physics1' },
  { label: 'ap-precalculus', to: '/library/precalc' },
  { label: 'ap-statistics', to: '/library/stats' },
  { label: 'mathbot', to: '/library/mathbot' },
  { label: 'game-boy', to: '/gameboy' },
  { label: 'ti-basic', to: '/library?category=games' },
];

export function Home() {
  const { status, connect, info } = useCalculator();
  const connected = status === 'connected' || status === 'busy';
  const preview = useMemo(() => previewTiBasic(programByName('PHYSICS1')!.source), []);
  const languages = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of catalog) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([kind, n]) => ({ ...KIND_META[kind], n, pct: (100 * n) / catalog.length }));
  }, []);
  const ceCount = catalog.filter((e) => e.calculator === 'ce').length;
  const nspireCount = catalog.length - ceCount;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="Box">
          <div className="Box-header flex items-center gap-2 font-normal">
            <Octicon name="Repo" className="text-muted" />
            <span className="font-semibold">calc_OS</span>
            <span className="text-muted hidden sm:inline">Programs for TI calculators, installed from the browser</span>
            <span className="Label ml-auto">GPL-3.0</span>
          </div>
          {SECTIONS.map((s) => (
            <div key={s.to} className="Box-row flex items-center gap-3 py-2">
              <Octicon name={s.icon} className={s.icon === 'File' ? 'text-muted' : 'text-[#54aeff]'} />
              <Link to={s.to} className="hover:text-blue hover:underline shrink-0">{s.name}</Link>
              <span className="text-muted text-xs truncate ml-auto text-right">{s.note}</span>
            </div>
          ))}
        </div>

        <div className="Box mt-4">
          <div className="Box-header flex items-center gap-2 font-normal">
            <Octicon name="Book" className="text-muted" />
            README.md
          </div>
          <article className="markdown-body p-6 md:p-8">
            <h1>calc_OS</h1>
            <p>
              Install programs on a TI-84 Plus CE from Chrome, over the USB cable: AP Physics 1, AP Precalculus and AP Statistics solvers, the MathBot math assistant, TI-BASIC games, and the TI-Boy CE Game Boy emulator. Nothing to download, nothing uploaded anywhere.
            </p>
            <p className="flex flex-wrap gap-2 items-center">
              {status === 'disconnected' && <Button onClick={connect}><Octicon name="Plug" /> Connect calculator</Button>}
              {status === 'connecting' && <Button disabled><Spinner /> Connecting</Button>}
              {connected && <ButtonLink to="/calculator"><Octicon name="Plug" /> Open my calculator</ButtonLink>}
              <ButtonLink to="/library" variant="secondary"><Octicon name="Package" /> Browse the library</ButtonLink>
            </p>
            {status === 'unsupported' && <p className="flash flash-warn">Your browser cannot talk to USB devices. Use Chrome, Edge or Brave on a computer.</p>}
            {info && <p className="enter flash flash-success">Connected: {info.model}, OS {info.osVersion}.</p>}
            <figure className="max-w-[420px]">
              <CalcScreen preview={preview} calculator="ce" caption="AP Physics 1's main menu, as it appears on the calculator" />
            </figure>
            <h2>What you can install</h2>
            <ul>
              <li><Link to="/library/physics1">AP Physics 1</Link>, <Link to="/library/precalc">AP Precalculus</Link> and <Link to="/library/stats">AP Statistics</Link>: every formula from the equation sheets, solved for any variable, with notes. Each rearrangement is machine-checked before it ships.</li>
              <li><Link to="/library/mathbot">MathBot</Link>: type a question on the calculator and get the answer with steps. Solve, factor, derivatives, statistics, all offline.</li>
              <li><Link to="/library?category=games">Games</Link>: 2048, Snake, Tic-Tac-Toe, Blackjack and Video Poker in TI-BASIC for every OS, plus the classic assembly games when your OS allows them.</li>
              <li><Link to="/gameboy">Game Boy</Link>: TI-Boy CE plays your own cartridges (Pokemon, Zelda, Mario Land, Tetris), converted in the browser.</li>
              <li><Link to="/nspire">TI-Nspire CX II</Link>: the same solvers and MathBot as Python documents.</li>
            </ul>
            <h2>How it works</h2>
            <ol>
              <li>Plug in the USB cable, stay on the home screen, click <strong>Connect</strong> and pick the calculator in Chrome's list.</li>
              <li>Choose a program in the library and click <strong>Install</strong>. It goes straight to the archive.</li>
              <li>Press <code>prgm</code>, select the name, press <code>enter</code>. Delete anything later from the My calculator page.</li>
            </ol>
            <h2>Assembly games and OS versions</h2>
            <table>
              <thead><tr><th>Calculator OS</th><th>Assembly games</th></tr></thead>
              <tbody>
                <tr><td>5.4 and older</td><td>Run as is</td></tr>
                <tr><td>5.5 to 5.8.4</td><td>Need the arTIfiCE jailbreak, installed once</td></tr>
                <tr><td>5.8.5 and newer</td><td>Not possible</td></tr>
              </tbody>
            </table>
            <p>TI-BASIC programs, including everything calc_OS generates, run on every OS. Connect the calculator and each program is marked as runs, needs the jailbreak, or not possible. See <Link to="/unlock">Unlock games</Link>.</p>
            <h2>Requirements</h2>
            <ul>
              <li>Chrome, Edge or Brave on Windows, macOS, Linux or ChromeOS. Safari and Firefox do not support WebUSB.</li>
              <li>The calculator's USB cable, and TI Connect CE closed.</li>
            </ul>
          </article>
        </div>
      </div>

      <aside className="md:w-[296px] shrink-0 text-sm">
        <div className="pb-4 border-b border-hairline">
          <h2 className="font-semibold text-base mb-2">About</h2>
          <p>Programs for TI graphing calculators, installed from the browser over USB. AP solvers, MathBot, games and a Game Boy emulator.</p>
          <ul className="mt-3 space-y-1.5 text-muted">
            <li><a className="flex items-center gap-2 hover:text-blue hover:underline" href="https://github.com/ZackyTzu/calc_OS" target="_blank" rel="noreferrer"><Octicon name="MarkGithub" /> github.com/ZackyTzu/calc_OS</a></li>
            <li><Link className="flex items-center gap-2 hover:text-blue hover:underline" to="/about"><Octicon name="Book" /> About and browser support</Link></li>
            <li><Link className="flex items-center gap-2 hover:text-blue hover:underline" to="/terms"><Octicon name="File" /> Terms and privacy</Link></li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {TOPICS.map((t) => <Link key={t.label} className="topic-tag" to={t.to}>{t.label}</Link>)}
          </div>
        </div>
        <div className="py-4 border-b border-hairline">
          <h2 className="font-semibold text-base mb-2 flex items-center gap-2">Programs <span className="Counter">{catalog.length}</span></h2>
          <ul className="space-y-1.5 text-muted">
            <li><Link className="flex items-center gap-2 hover:text-blue hover:underline" to="/library?calc=ce"><Octicon name="DeviceDesktop" /> TI-84 Plus CE <span className="Counter">{ceCount}</span></Link></li>
            <li><Link className="flex items-center gap-2 hover:text-blue hover:underline" to="/library?calc=nspire"><Octicon name="Cpu" /> TI-Nspire CX II <span className="Counter">{nspireCount}</span></Link></li>
          </ul>
        </div>
        <div className="py-4">
          <h2 className="font-semibold text-base mb-2">Languages</h2>
          <div className="flex h-2 rounded-md overflow-hidden gap-px" aria-hidden="true">
            {languages.map((l) => <span key={l.label} style={{ width: `${l.pct}%`, backgroundColor: l.color }} />)}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {languages.map((l) => (
              <li key={l.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} aria-hidden="true" />
                <span className="font-semibold">{l.label}</span>
                <span className="text-muted tabular-nums">{l.pct.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
