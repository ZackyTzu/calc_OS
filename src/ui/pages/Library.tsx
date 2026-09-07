import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalog, CATEGORY_LABELS, type Category } from '../../lib/library/catalog';
import { compatibility } from '../../lib/library/compat';
import { useCalculator } from '../../state/calculator';
import { Badge, CompatBadge } from '../components/ui';
import { Octicon, type OcticonName } from '../components/Octicon';

const KIND_LABELS = { tibasic: 'TI-BASIC', asm: 'Assembly / C', python: 'Python', lua: 'Lua', tns: 'Nspire document', appvar: 'AppVar' } as const;
const CATEGORY_ICONS: Record<Category, OcticonName> = { academic: 'Book', games: 'Play', tools: 'Package', assistant: 'Zap' };
const CATEGORIES = ['all', ...(Object.keys(CATEGORY_LABELS) as Category[])] as const;

export function Library() {
  const [params, setParams] = useSearchParams();
  const category = (params.get('category') as Category | null) ?? 'all';
  const calc = params.get('calc') ?? 'all';
  const q = params.get('q') ?? '';
  const [onlyMine, setOnlyMine] = useState(false);
  const { info, variables, status } = useCalculator();
  const connected = status === 'connected' || status === 'busy';

  // Everything except the category filter, so the category counts reflect the current search.
  const pool = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.filter((e) => {
      if (calc !== 'all' && e.calculator !== calc) return false;
      if (needle && !`${e.name} ${e.tagline} ${e.tags.join(' ')} ${e.author}`.toLowerCase().includes(needle)) return false;
      if (onlyMine && connected) {
        if (e.calculator !== 'ce') return false;
        if (compatibility(e, info, variables).level === 'blocked') return false;
      }
      return true;
    });
  }, [calc, q, onlyMine, connected, info, variables]);
  const items = category === 'all' ? pool : pool.filter((e) => e.category === category);
  const countFor = (c: (typeof CATEGORIES)[number]) => (c === 'all' ? pool.length : pool.filter((e) => e.category === c).length);

  function set(key: string, value: string, replace = false) {
    const p = new URLSearchParams(params);
    if (value === 'all' || value === '') p.delete(key); else p.set(key, value);
    setParams(p, { replace });
  }
  const filtered = category !== 'all' || calc !== 'all' || q.trim() !== '' || onlyMine;
  function clearFilters() {
    setOnlyMine(false);
    setParams(new URLSearchParams());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <h1 className="text-xl font-semibold mr-auto">Library</h1>
        <div className="relative">
          <Octicon name="Search" className="absolute left-2.5 top-2 text-muted pointer-events-none" />
          <input type="search" value={q} onChange={(e) => set('q', e.target.value, true)} placeholder="Search programs" aria-label="Search programs" className="input pl-8 w-64" />
        </div>
        <select value={calc} onChange={(e) => set('calc', e.target.value)} aria-label="Calculator" className="input">
          <option value="all">All calculators</option>
          <option value="ce">TI-84 Plus CE</option>
          <option value="nspire">TI-Nspire CX II</option>
        </select>
      </div>

      <div className="Box">
        <div className="Box-header flex flex-wrap items-center gap-x-4 gap-y-2 font-normal">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => set('category', c)}
              aria-pressed={category === c}
              className={`flex items-center gap-1.5 hover:text-ink ${category === c ? 'font-semibold text-ink' : 'text-muted'}`}
            >
              {c === 'all' ? 'Everything' : CATEGORY_LABELS[c]}
              <span className="Counter">{countFor(c)}</span>
            </button>
          ))}
          {connected && (
            <label className="ml-auto flex items-center gap-2 text-muted cursor-pointer select-none">
              <input type="checkbox" className="accent-blue" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              Works on my {info?.model ?? 'calculator'}
            </label>
          )}
        </div>
        {items.length === 0 && (
          <div className="Box-row py-12 text-center text-muted">
            <Octicon name="Search" size={24} className="mb-2" />
            <p>No programs match.{' '}{filtered && <button type="button" className="link" onClick={clearFilters}>Clear filters</button>}</p>
          </div>
        )}
        {items.map((e) => {
          const compat = compatibility(e, info, variables);
          return (
            <div key={e.id} className="Box-row flex gap-3 row-hover hover:bg-alt">
              <Octicon name={CATEGORY_ICONS[e.category]} className="text-muted mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/library/${e.id}`} className="text-base font-semibold hover:text-blue hover:underline">{e.name}</Link>
                  <Badge>{e.calculator === 'ce' ? 'TI-84 CE' : 'Nspire'}</Badge>
                  <Badge>{KIND_LABELS[e.kind]}</Badge>
                </div>
                <p className="text-muted mt-0.5">{e.tagline}</p>
                <p className="text-muted text-xs mt-1">by {e.author}, {e.license}</p>
              </div>
              <div className="shrink-0 pt-1"><CompatBadge compat={compat} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
