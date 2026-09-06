import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalog, CATEGORY_LABELS, type Category } from '../../lib/library/catalog';
import { compatibility } from '../../lib/library/compat';
import { useCalculator } from '../../state/calculator';
import { Badge, CompatBadge } from '../components/ui';

const KIND_LABELS = { tibasic: 'TI-BASIC', asm: 'Assembly / C', python: 'Python', lua: 'Lua', tns: 'Nspire document', appvar: 'AppVar' } as const;

export function Library() {
  const [params, setParams] = useSearchParams();
  const category = (params.get('category') as Category | null) ?? 'all';
  const calc = params.get('calc') ?? 'all';
  const [q, setQ] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const { info, variables, status } = useCalculator();
  const connected = status === 'connected' || status === 'busy';

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.filter((e) => {
      if (category !== 'all' && e.category !== category) return false;
      if (calc !== 'all' && e.calculator !== calc) return false;
      if (needle && !`${e.name} ${e.tagline} ${e.tags.join(' ')} ${e.author}`.toLowerCase().includes(needle)) return false;
      if (onlyMine && connected) {
        if (e.calculator !== 'ce') return false;
        const level = compatibility(e, info, variables).level;
        if (level === 'blocked') return false;
      }
      return true;
    });
  }, [category, calc, q, onlyMine, connected, info, variables]);

  function set(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value === 'all') p.delete(key); else p.set(key, value);
    setParams(p);
  }

  const filtered = category !== 'all' || calc !== 'all' || q.trim() !== '' || onlyMine;
  function clearFilters() {
    setQ('');
    setOnlyMine(false);
    setParams(new URLSearchParams());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <h1 className="text-4xl font-semibold mr-auto">Library</h1>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programs" aria-label="Search programs" className="input w-56" />
        {connected && (
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
            <input type="checkbox" className="accent-blue-button" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Works on my {info?.model ?? 'calculator'}
          </label>
        )}
        <select value={calc} onChange={(e) => set('calc', e.target.value)} aria-label="Calculator" className="input">
          <option value="all">All calculators</option>
          <option value="ce">TI-84 Plus CE</option>
          <option value="nspire">TI-Nspire CX II</option>
        </select>
      </div>
      <div className="flex gap-2 flex-wrap" role="group" aria-label="Category">
        {(['all', ...Object.keys(CATEGORY_LABELS)] as const).map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => set('category', c)}
            aria-pressed={category === c}
            className={`btn btn-sm ${category === c ? 'bg-ink text-white hover:bg-black' : 'btn-outline'}`}
          >
            {c === 'all' ? 'Everything' : CATEGORY_LABELS[c as Category]}
          </button>
        ))}
      </div>
      {items.length === 0 && (
        <p className="enter text-muted">
          Nothing matches.{' '}
          {filtered && <button type="button" className="link" onClick={clearFilters}>Clear filters</button>}
        </p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((e) => {
          const compat = compatibility(e, info, variables);
          return (
            <Link key={e.id} to={`/library/${e.id}`} className="card-link flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-lg leading-tight">{e.name}</h2>
                <Badge>{e.calculator === 'ce' ? 'TI-84 CE' : 'Nspire'}</Badge>
              </div>
              <p className="text-sm text-muted flex-1">{e.tagline}</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                <Badge tone="slate">{CATEGORY_LABELS[e.category]}</Badge>
                <Badge tone="slate">{KIND_LABELS[e.kind]}</Badge>
                <CompatBadge compat={compat} />
              </div>
              <p className="text-xs text-faint">by {e.author}, {e.license}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
