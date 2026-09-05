import { Link } from 'react-router-dom';
import { useCalculator } from '../../state/calculator';
import { Button, Card } from '../components/ui';
import { catalog, CATEGORY_LABELS, type Category } from '../../lib/library/catalog';

export function Home() {
  const { status, connect, info } = useCalculator();
  const counts = catalog.reduce<Record<string, number>>((m, e) => ((m[e.category] = (m[e.category] ?? 0) + 1), m), {});
  return (
    <div className="space-y-10">
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Programs for your TI calculator, installed from the browser.</h1>
          <p className="text-slate-300 text-lg">
            Plug in a TI-84 Plus CE, click connect, and install AP Physics 1, Precalculus and Statistics solvers, games, tools and an offline math assistant. See what is on the calculator and delete what you no longer need. No software to install.
          </p>
          <div className="flex gap-3 flex-wrap">
            {status === 'disconnected' && <Button onClick={connect}>Connect calculator</Button>}
            {status === 'connected' && <Link to="/calculator"><Button>Open my calculator</Button></Link>}
            <Link to="/library"><Button variant="secondary">Browse the library</Button></Link>
          </div>
          {status === 'unsupported' && (
            <p className="text-sm text-amber-200">Your browser cannot talk to USB devices. Use Chrome, Edge or Brave on a computer (WebUSB is not available in Safari or Firefox).</p>
          )}
          {info && <p className="text-sm text-emerald-300">Connected: {info.model}, OS {info.osVersion}.</p>}
        </div>
        <Card className="space-y-3">
          <h2 className="font-semibold">How it works</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
            <li>Connect the calculator with its USB cable and make sure it is on the home screen.</li>
            <li>Click <b>Connect calculator</b> and pick the TI-84 Plus CE in the browser's device list.</li>
            <li>Choose a program in the library and click <b>Install</b>. It appears under <b>prgm</b> on the calculator.</li>
            <li>Run it with <b>prgm → name → enter</b>. Delete anything from the My calculator page.</li>
          </ol>
        </Card>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
          <Link key={c} to={`/library?category=${c}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-emerald-700 transition">
            <div className="text-2xl mb-2">{{ academic: '📚', games: '🎮', tools: '🧰', assistant: '🤖' }[c]}</div>
            <div className="font-semibold">{CATEGORY_LABELS[c]}</div>
            <div className="text-sm text-slate-400">{counts[c] ?? 0} program{counts[c] === 1 ? '' : 's'}</div>
          </Link>
        ))}
      </section>

      <Card className="text-sm text-slate-300 space-y-2">
        <h2 className="font-semibold text-base">Games on the TI-84 Plus CE: read this first</h2>
        <p>
          Most popular CE games (Pac-Man, Oiram, Flappy Bird, Tetric A…) are assembly programs. TI removed assembly support from the operating system in 2020. They still run if your calculator is on OS 5.4 or older, or on OS 5.5 to 5.8.4 after installing the arTIfiCE jailbreak. On OS 5.8.5 or newer there is currently no way to run them. TI-BASIC programs, including everything calc_OS generates, run on every OS. Connect your calculator and the library will tell you exactly what works. See <Link className="text-emerald-300 underline" to="/unlock">Unlock games</Link>.
        </p>
      </Card>
    </div>
  );
}
