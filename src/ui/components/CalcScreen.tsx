import type { ScreenPreview } from '../../lib/tibasic/preview';
import { COLS, ROWS } from '../../lib/tibasic/preview';

/** A TI-84 Plus CE home screen (26 x 10 characters) or an Nspire Python shell, drawn from a preview. */
export function CalcScreen({ preview, calculator, caption }: { preview: ScreenPreview; calculator: 'ce' | 'nspire'; caption?: string }) {
  const rows = calculator === 'ce'
    ? Array.from({ length: ROWS }, (_, i) => (preview.rows[i] ?? '').padEnd(COLS))
    : preview.rows;
  return (
    <figure className="select-none">
      <div className={`rounded-2xl p-3 shadow-inner ${calculator === 'ce' ? 'bg-slate-800' : 'bg-zinc-800'}`}>
        <div className="flex items-center justify-between px-1 pb-2 text-[10px] uppercase tracking-widest text-slate-400">
          <span>{calculator === 'ce' ? 'TI-84 Plus CE' : 'TI-Nspire CX II Python shell'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
        <pre
          className={`rounded-md font-mono leading-[1.35] px-2 py-1.5 overflow-hidden ${
            calculator === 'ce' ? 'bg-[#e9ede4] text-[#141a14] text-[13px]' : 'bg-[#f5f7fb] text-[#1b2230] text-[12px]'
          }`}
          aria-label="Calculator screen preview"
        >
          {rows.map((r, i) => (
            <div key={i} className={preview.kind === 'menu' && i === 0 && calculator === 'ce' ? 'bg-[#141a14] text-[#e9ede4]' : ''}>
              {r || ' '}
            </div>
          ))}
        </pre>
      </div>
      {caption && <figcaption className="text-xs text-slate-500 mt-2 text-center">{caption}</figcaption>}
    </figure>
  );
}
