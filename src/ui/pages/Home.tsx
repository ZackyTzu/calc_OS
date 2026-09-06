import { useMemo, type ReactNode } from 'react';
import { useCalculator } from '../../state/calculator';
import { Button, ButtonLink, MoreLink, Spinner } from '../components/ui';
import { programByName, subjects } from '../../lib/programs';
import { generatePython } from '../../lib/nspire/python-gen';
import { CalcScreen } from '../components/CalcScreen';
import { previewPython, previewTiBasic } from '../../lib/tibasic/preview';

function Tile({ dark = false, title, copy, links, children }: { dark?: boolean; title: string; copy: string; links: { to: string; label: string }[]; children: ReactNode }) {
  return (
    <div className={`tile ${dark ? 'tile-dark' : 'tile-light'}`}>
      <h2 className="text-3xl md:text-4xl font-semibold max-w-[560px]">{title}</h2>
      <p className="mt-3 text-lg max-w-[520px]">{copy}</p>
      <div className="mt-4 flex gap-6 justify-center flex-wrap text-lg">
        {links.map((l) => <MoreLink key={l.to} to={l.to} dark={dark}>{l.label}</MoreLink>)}
      </div>
      <div className="mt-9 w-full flex justify-center">{children}</div>
    </div>
  );
}

function CartridgeArt() {
  return (
    <svg viewBox="0 0 140 156" width="150" height="167" aria-hidden="true">
      <path d="M12 0h116a12 12 0 0 1 12 12v120l-16 24H12A12 12 0 0 1 0 144V12A12 12 0 0 1 12 0Z" fill="#a1a1a6" />
      <rect x="18" y="26" width="104" height="68" rx="8" fill="#f5f5f7" />
      <rect x="28" y="38" width="84" height="8" rx="4" fill="#d2d2d7" />
      <rect x="28" y="54" width="60" height="8" rx="4" fill="#d2d2d7" />
      <rect x="28" y="70" width="72" height="8" rx="4" fill="#d2d2d7" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={20 + i * 18} y="108" width="10" height="26" rx="3" fill="#86868b" />)}
    </svg>
  );
}

function OsRow({ os, status, color }: { os: string; status: string; color: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="flex-1">{os}</span>
      <span className="text-white/70">{status}</span>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div>
      <div className="text-4xl font-semibold text-blue">{n}</div>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-muted">{text}</p>
    </div>
  );
}

export function Home() {
  const { status, connect, info } = useCalculator();
  const connected = status === 'connected' || status === 'busy';
  const physics = useMemo(() => previewTiBasic(programByName('PHYSICS1')!.source), []);
  const mathbot = useMemo(() => previewTiBasic(programByName('MATHBOT')!.source), []);
  const g2048 = useMemo(() => previewTiBasic(programByName('G2048')!.source), []);
  const stats = useMemo(() => previewTiBasic(programByName('STATS')!.source), []);
  const nspire = useMemo(() => previewPython(generatePython(subjects.find((s) => s.program === 'PHYSICS1')!).source), []);

  return (
    <div className="pb-8">
      <section className="px-5 pt-16 md:pt-24 pb-14 text-center">
        <h1 className="text-4xl md:text-6xl font-semibold mx-auto max-w-[860px]">Install programs on your TI-84 Plus CE.</h1>
        <p className="mt-4 text-lg md:text-2xl mx-auto max-w-[720px]">From Chrome, over the USB cable. AP solvers, MathBot, games and a Game Boy emulator, with nothing to download.</p>
        <div className="mt-7 flex justify-center items-center gap-6 flex-wrap">
          {status === 'disconnected' && <Button onClick={connect}>Connect calculator</Button>}
          {status === 'connecting' && <Button disabled><Spinner /> Connecting</Button>}
          {connected && <ButtonLink to="/calculator">Open my calculator</ButtonLink>}
          <MoreLink to="/library" className="text-lg">Browse the library</MoreLink>
        </div>
        {status === 'unsupported' && (
          <p className="mt-4 text-sm text-orange">Your browser cannot talk to USB devices. Use Chrome, Edge or Brave on a computer.</p>
        )}
        {info && <p className="enter mt-4 text-sm text-green">Connected: {info.model}, OS {info.osVersion}.</p>}
        <CalcScreen preview={physics} calculator="ce" className="mt-14 mx-auto max-w-[420px]" caption="AP Physics 1's main menu, as it appears on the calculator" />
      </section>

      <section className="mx-auto max-w-[1440px] px-3 grid md:grid-cols-2 gap-3">
        <Tile
          title="AP Physics 1, Precalculus and Statistics."
          copy="Every formula from the equation sheets, solved for any variable, with notes. Each rearrangement is machine-checked before it ships."
          links={[{ to: '/library?category=academic', label: 'Browse the solvers' }, { to: '/library/physics1', label: 'See AP Physics 1' }]}
        >
          <CalcScreen preview={stats} calculator="ce" className="w-full max-w-[360px]" />
        </Tile>
        <Tile
          dark
          title="Games."
          copy="2048, Snake, Blackjack and Video Poker in TI-BASIC for every OS, plus the classic assembly games when your OS allows them."
          links={[{ to: '/library?category=games', label: 'Browse the games' }, { to: '/unlock', label: 'Unlock guide' }]}
        >
          <CalcScreen preview={g2048} calculator="ce" className="w-full max-w-[360px]" />
        </Tile>
        <Tile
          title="Game Boy on your calculator."
          copy="TI-Boy CE plays your own cartridges: Pokemon, Zelda, Mario Land, Tetris and the rest of the Game Boy library. Convert the ROM here, install in one click."
          links={[{ to: '/gameboy', label: 'Convert a ROM' }, { to: '/library/tiboyce', label: 'About TI-Boy CE' }]}
        >
          <CartridgeArt />
        </Tile>
        <Tile
          dark
          title="MathBot."
          copy="Type a question on the calculator and get the answer with steps. Solve, factor, derivatives, statistics, all offline."
          links={[{ to: '/library/mathbot', label: 'See MathBot' }]}
        >
          <CalcScreen preview={mathbot} calculator="ce" className="w-full max-w-[360px]" />
        </Tile>
        <Tile
          title="TI-Nspire CX II."
          copy="The same solvers and MathBot as Python documents, sent to the Nspire from the browser."
          links={[{ to: '/nspire', label: 'Nspire page' }, { to: '/library?calc=nspire', label: 'Nspire programs' }]}
        >
          <CalcScreen preview={nspire} calculator="nspire" className="w-full max-w-[360px]" />
        </Tile>
        <Tile
          dark
          title="Assembly games need one unlock."
          copy="Connect the calculator and every program is marked as runs, needs the jailbreak, or not possible on your OS."
          links={[{ to: '/unlock', label: 'Unlock guide' }, { to: '/calculator', label: 'Check my OS' }]}
        >
          <div className="w-full max-w-[360px] rounded-xl bg-white/10 text-left text-sm divide-y divide-white/10">
            <OsRow os="OS 5.4 and older" status="Runs as is" color="#34c759" />
            <OsRow os="OS 5.5 to 5.8.4" status="arTIfiCE jailbreak" color="#ff9f0a" />
            <OsRow os="OS 5.8.5 and newer" status="Not possible" color="#ff453a" />
          </div>
        </Tile>
      </section>

      <section className="mx-auto max-w-[980px] px-5 pt-20 pb-8 text-center">
        <h2 className="text-4xl font-semibold">How it works.</h2>
        <div className="mt-10 grid sm:grid-cols-3 gap-8 text-left">
          <Step n="1" title="Connect" text="Plug in the USB cable, stay on the home screen, click Connect and pick the calculator in Chrome's list." />
          <Step n="2" title="Install" text="Choose a program in the library and click Install. It goes straight to the archive; there are no files to manage." />
          <Step n="3" title="Run" text="Press prgm, select the name, press enter. Delete anything later from the My calculator page." />
        </div>
      </section>
    </div>
  );
}
