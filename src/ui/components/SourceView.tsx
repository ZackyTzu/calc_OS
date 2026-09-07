import { useMemo, useState } from 'react';

export function SourceView({ source }: { source: string }) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(true);
  const lines = useMemo(() => source.split('\n'), [source]);
  const shown = open ? lines : lines.slice(0, 40);
  return (
    <div className="Box overflow-hidden">
      <div className="Box-header flex items-center justify-between text-xs font-normal text-muted py-2">
        <span>{lines.length} lines of TI-BASIC</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={display} onChange={(e) => setDisplay(e.target.checked)} /> calculator symbols
        </label>
      </div>
      <pre className="text-xs leading-5 py-3 overflow-x-auto font-mono text-ink max-h-[32rem] overflow-y-auto">
        {shown.map((l, i) => (
          <div key={i} className="whitespace-pre">
            <span className="text-muted select-none inline-block w-12 text-right pr-3">{i + 1}</span>
            {display ? toDisplay(l) : l}
          </div>
        ))}
      </pre>
      {lines.length > 40 && (
        <button type="button" onClick={() => setOpen(!open)} className="w-full text-xs py-2 text-blue hover:underline bg-alt border-t border-hairline">
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
