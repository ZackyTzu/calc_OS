import { Card } from '../components/ui';

export function Nspire() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">TI-Nspire CX II</h1>
      <Card className="space-y-2 text-slate-300">
        <p>Nspire support is being built. The CX II speaks a different USB protocol than the TI-84 family and uses <code>.tns</code> documents instead of tokenized programs, so it needs its own transfer code and its own versions of the solvers (written in Lua or Python).</p>
        <p>Planned: connect in the browser, browse and delete files, install calc_OS programs as <code>.tns</code> documents, and a library of Lua games (Pac-Man, Flappy Bird, Tetris, 2048, Chess, Texas Hold'em) that run without Ndless.</p>
        <p className="text-sm text-slate-400">Until then, transfer <code>.tns</code> files with TI-Nspire CX Student Software, or the free browser tool <a className="text-emerald-300 underline" href="https://n-link.lights0123.com" target="_blank" rel="noreferrer">n-link</a>.</p>
      </Card>
    </div>
  );
}
