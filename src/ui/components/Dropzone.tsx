import { useRef, useState } from 'react';
import { importFiles, type ImportedFile } from '../../lib/library/install';

const ACCEPT = '.8xp,.8xv,.8xg,.8xl,.8xn,.8xm,.8xs,.8xy,.8xi,.8xd,.8xc,.8xw,.8xz,.8xt,.8ca,.8ek,.8xk,.zip';

export function Dropzone({ onFiles, disabled }: { onFiles: (files: ImportedFile[]) => void; disabled?: boolean }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(list: FileList | null) {
    if (!list || !list.length) return;
    onFiles(await importFiles(Array.from(list)));
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) handle(e.dataTransfer.files); }}
      onClick={openPicker}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}
      className={`rounded-xl border-2 border-dashed p-6 text-center transition-[border-color,background-color] ${
        over ? 'border-emerald-400 bg-emerald-950/30' : 'border-slate-700 hover:border-slate-500'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" tabIndex={-1} onChange={(e) => { handle(e.target.files); e.target.value = ''; }} />
      <p className="font-medium">Drop calculator files here, or click to choose</p>
      <p className="text-sm text-slate-400 mt-1">.8xp programs, .8xv AppVars, .8xg groups, or a .zip from ticalc.org or Cemetech</p>
    </div>
  );
}
