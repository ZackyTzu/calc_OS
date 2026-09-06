import { useMemo, useState } from 'react';

export function SourceView({ source }: { source: string }) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(true);
  const lines = useMemo(() => source.split('\n'), [source]);
  const shown = open ? lines : lines.slice(0, 40);
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 border-b border-slate-800">
        <span>{lines.length} lines of TI-BASIC</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={display} onChange={(e) => setDisplay(e.target.checked)} /> calculator symbols
        </label>
      </div>
      <pre className="text-xs leading-5 p-3 overflow-x-auto font-mono text-slate-200 max-h-[32rem] overflow-y-auto">
        {shown.map((l, i) => (
          <div key={i} className="whitespace-pre">
            <span className="text-slate-600 select-none inline-block w-10 text-right mr-3">{i + 1}</span>
            {display ? toDisplay(l) : l}
          </div>
        ))}
      </pre>
      {lines.length > 40 && (
        <button type="button" onClick={() => setOpen(!open)} className="w-full text-xs py-2 text-emerald-300 hover:bg-slate-900 border-t border-slate-800 transition-colors rounded-b-lg">
          {open ? 'Show less' : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}

/** Cheap display conversion for the most common spellings; the real detokenizer is used for files. */
function toDisplay(l: string): string {
  return l
    .replace(/->/g, '→')
    .replace(/\^\^2/g, '²')
    .replace(/\^\^-1/g, '⁻¹')
    .replace(/>=/g, '≥')
    .replace(/<=/g, '≤')
    .replace(/!=/g, '≠')
    .replace(/sqrt\(/g, '√(')
    .replace(/\bpi\b/g, 'π')
    .replace(/\btheta\b/g, 'θ')
    .replace(/(^|[^A-Za-z])~/g, '$1⁻');
}
