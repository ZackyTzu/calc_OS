import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalog, CATEGORY_LABELS, type Category } from '../../lib/library/catalog';
import { compatibility } from '../../lib/library/compat';
import { useCalculator } from '../../state/calculator';
import { Badge, CompatBadge } from '../components/ui';

export function Library() {
  const [params, setParams] = useSearchParams();
  const category = (params.get('category') as Category | null) ?? 'all';
  const calc = params.get('calc') ?? 'all';
  const [q, setQ] = useState('');
  const { info, variables } = useCalculator();

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.filter((e) => {
      if (category !== 'all' && e.category !== category) return false;
      if (calc !== 'all' && e.calculator !== calc) return false;
      if (needle && !`${e.name} ${e.tagline} ${e.tags.join(' ')} ${e.author}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [category, calc, q]);

  function set(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value === 'all') p.delete(key); else p.set(key, value);
    setParams(p);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <h1 className="text-2xl font-bold mr-auto">Library</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm" />
        <select value={calc} onChange={(e) => set('calc', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm">
          <option value="all">All calculators</option>
          <option value="ce">TI-84 Plus CE</option>
          <option value="nspire">TI-Nspire CX II</option>
        </select>
      </div>
      <div className="flex gap-2 flex-wrap text-sm">
        {(['all', ...Object.keys(CATEGORY_LABELS)] as const).map((c) => (
          <button key={c} onClick={() => set('category', c)} className={`px-3 py-1 rounded-full border ${category === c ? 'bg-emerald-700 border-emerald-600 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
            {c === 'all' ? 'Everything' : CATEGORY_LABELS[c as Category]}
          </button>
        ))}
      </div>
      {items.length === 0 && <p className="text-slate-400">Nothing matches.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((e) => {
          const compat = compatibility(e, info, variables);
          return (
            <Link key={e.id} to={`/library/${e.id}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-emerald-700 transition flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-lg leading-tight">{e.name}</h2>
                <Badge>{e.calculator === 'ce' ? 'TI-84 CE' : 'Nspire'}</Badge>
              </div>
              <p className="text-sm text-slate-300 flex-1">{e.tagline}</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                <Badge tone="slate">{CATEGORY_LABELS[e.category]}</Badge>
                <Badge tone="slate">{{ tibasic: 'TI-BASIC', asm: 'Assembly / C', python: 'Python', lua: 'Lua', tns: 'Nspire document', appvar: 'AppVar' }[e.kind]}</Badge>
                <CompatBadge compat={compat} />
              </div>
              <p className="text-xs text-slate-500">by {e.author} · {e.license}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
