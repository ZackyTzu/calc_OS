import { Link } from 'react-router-dom';
import { useCalculator } from '../../state/calculator';
import { Badge, Card } from '../components/ui';

export function Unlock() {
  const { info } = useCalculator();
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-4xl font-semibold">Unlock assembly games on the TI-84 Plus CE</h1>
      <p className="text-ink">
        Games like Pac-Man, Oiram and Flappy Bird are written in C or assembly. Since 2020 TI's operating system refuses to run them unless a jailbreak restores that ability. What you can do depends entirely on your OS version. Find it on the calculator with <b>2nd</b> then <b>+</b> then <b>About</b>, or just connect it here.
      </p>
      <Card className="text-sm text-ink space-y-1">
        <h2 className="font-semibold text-ink">Seen a video that opens a file inside the Cabri Jr. app?</h2>
        <p>That was the first arTIfiCE (2020): a booby-trapped Cabri Jr. figure. TI closed that hole in OS 5.8.3 (May 2025). The current arTIfiCE v2.1 uses a different flaw, is a plain program file run from the <b>prgm</b> menu, and works on OS 5.3 through 5.8.4. The steps below are for it. On OS 5.8.5 and newer neither version works.</p>
      </Card>
      {info && (
        <Card>
          Your calculator: <b>{info.model}</b>, OS <b>{info.osVersion}</b>.{' '}
          {info.asmNative && <Badge tone="green">Assembly runs natively. Skip to step 2.</Badge>}
          {info.asmWithJailbreak && <Badge tone="amber">Jailbreak possible. Follow the steps below.</Badge>}
          {info.asmBlocked && <Badge tone="red">Assembly is not possible on this OS.</Badge>}
        </Card>
      )}
      <Card className="space-y-2">
        <h2 className="font-semibold">Which OS am I on?</h2>
        <ul className="text-sm text-ink space-y-1 list-disc list-inside">
          <li><b>5.4 or older:</b> assembly works out of the box. Never update.</li>
          <li><b>5.5 to 5.8.4:</b> install the arTIfiCE jailbreak (steps below). Never update.</li>
          <li><b>5.8.5 or newer:</b> TI patched the last known exploit in April 2026 and there is no downgrade path unless an assembly shell was already installed. Nothing here can change that. TI-BASIC programs (including all calc_OS solvers and games) still work.</li>
        </ul>
        <p className="text-xs text-faint">Turn off automatic updates in TI Connect CE and decline OS update prompts to keep a working setup.</p>
      </Card>
      <Card className="space-y-2">
        <h2 className="font-semibold">Step 1: arTIfiCE (OS 5.5 to 5.8.4 only)</h2>
        <ol className="text-sm text-ink space-y-1 list-decimal list-inside">
          <li>Download <code>arTIfiCE_v2.1.8xp</code> from the <a className="link" href="https://yvantt.github.io/arTIfiCE/" target="_blank" rel="noreferrer">official arTIfiCE page</a>.</li>
          <li>Open <Link className="link" to="/calculator">My calculator</Link> and drop the file onto the install box.</li>
          <li>On the calculator press <b>prgm</b>, choose <b>A</b>, pick <b>TI-BASIC</b> if asked, press <b>enter</b>. When the shell appears press <b>MODE</b> to leave it.</li>
          <li>The jailbreak lives in RAM: after a RAM reset just run it again.</li>
        </ol>
        <p className="text-xs text-faint">arTIfiCE publishes no redistribution licence, so calc_OS links to the official download instead of hosting a copy.</p>
      </Card>
      <Card className="space-y-2">
        <h2 className="font-semibold">Step 2: CE C libraries</h2>
        <p className="text-sm text-ink">Almost every C game needs these shared libraries. Install them once from the library: <Link className="link" to="/library/clibs">CE C Libraries</Link>.</p>
      </Card>
      <Card className="space-y-2">
        <h2 className="font-semibold">Step 3: a shell (optional but handy)</h2>
        <p className="text-sm text-ink"><Link className="link" to="/library/cesium">Cesium</Link> lists all programs with icons and runs assembly programs directly. Without a shell, run assembly programs with <b>Asm(</b> from the catalog: <b>Asm(prgmNAME)</b>.</p>
      </Card>
      <Card className="space-y-2">
        <h2 className="font-semibold">If something goes wrong</h2>
        <ul className="text-sm text-ink space-y-1 list-disc list-inside">
          <li><b>ERR:INVALID</b> when starting a game from the prgm menu: on OS 5.5 and newer assembly programs cannot start from there. Launch them from arTIfiCE's list, from Cesium, or with <b>Asm(prgmNAME)</b>.</li>
          <li><b>Need LibLoad</b> and a tiny.cc address on the screen: the game wants the <Link className="link" to="/library/clibs">CE C libraries</Link>. Install them once from the library and run the game again.</li>
          <li><b>ERR:MEMORY</b> or a RAM warning: games belong in the archive. calc_OS installs there; for files sent another way, press <b>2nd</b>, <b>+</b>, <b>2</b>, <b>7</b> and press <b>enter</b> on every program without a star to archive it.</li>
          <li>The calculator freezes: hold the reset button on the back for two seconds. RAM is cleared, the archive and everything installed there survive, then run arTIfiCE again.</li>
        </ul>
      </Card>
      <Card className="space-y-2">
        <h2 className="font-semibold">Step 4: install games</h2>
        <p className="text-sm text-ink">Open the <Link className="link" to="/library?category=games">Games</Link> section. Programs with an open licence install with one click; for the rest, download from the author's page and drop the files onto My calculator. For Pokemon, Zelda, Mario Land and other Game Boy games, convert your own cartridge ROMs on the <Link className="link" to="/gameboy">Game Boy</Link> page.</p>
      </Card>
    </div>
  );
}
