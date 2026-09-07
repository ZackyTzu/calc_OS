import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { ConnectButton } from './ConnectButton';
import { Octicon, type OcticonName } from './Octicon';
import { catalog } from '../../lib/library/catalog';

const tabs: { to: string; label: string; icon: OcticonName; end?: boolean; count?: number }[] = [
  { to: '/', label: 'Overview', icon: 'Book', end: true },
  { to: '/library', label: 'Library', icon: 'Package', count: catalog.length },
  { to: '/calculator', label: 'My calculator', icon: 'Plug' },
  { to: '/unlock', label: 'Unlock games', icon: 'Zap' },
  { to: '/gameboy', label: 'Game Boy', icon: 'Play' },
  { to: '/nspire', label: 'Nspire', icon: 'Cpu' },
  { to: '/about', label: 'About', icon: 'Info' },
];

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [pathname]);

  function search(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/library?q=${encodeURIComponent(term)}` : '/library');
    setQ('');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 btn">Skip to content</a>
      <header className="bg-alt border-b border-hairline">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 h-16 flex items-center gap-3">
          <button
            type="button"
            className="md:hidden btn px-2"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <Octicon name={open ? 'X' : 'ThreeBars'} />
          </button>
          <Link to="/" className="flex items-center rounded-md" aria-label="calc_OS home">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-8 h-8" />
          </Link>
          <div className="flex items-center gap-1 text-sm min-w-0">
            <a className="hover:underline hover:text-blue" href="https://github.com/ZackyTzu" target="_blank" rel="noreferrer">ZackyTzu</a>
            <span className="text-muted">/</span>
            <Link to="/" className="font-semibold hover:underline hover:text-blue">calc_OS</Link>
            <span className="Label ml-1 hidden sm:inline-flex">Public</span>
          </div>
          <form className="ml-auto hidden sm:block" role="search" onSubmit={search}>
            <div className="relative">
              <Octicon name="Search" className="absolute left-2.5 top-2 text-muted pointer-events-none" />
              <input className="input pl-8 w-56 lg:w-72" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programs" aria-label="Search programs" />
            </div>
          </form>
          <div className="ml-auto sm:ml-0">
            <ConnectButton />
          </div>
        </div>
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 hidden md:block">
          <nav className="UnderlineNav" aria-label="Main">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className="UnderlineNav-item">
                <span>
                  <Octicon name={t.icon} className="text-muted" />
                  {t.label}
                  {t.count !== undefined && <span className="Counter">{t.count}</span>}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>
        {open && (
          <nav id="mobile-menu" className="enter md:hidden border-t border-hairline bg-white px-4 py-2" aria-label="Main">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className="flex items-center gap-3 py-2.5 text-sm border-b border-hairline last:border-0 aria-[current=page]:font-semibold">
                <Octicon name={t.icon} className="text-muted" />
                {t.label}
                {t.count !== undefined && <span className="Counter">{t.count}</span>}
              </NavLink>
            ))}
            <form className="py-3" role="search" onSubmit={search}>
              <input className="input w-full" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programs" aria-label="Search programs" />
            </form>
          </nav>
        )}
      </header>
      <main id="main" className="flex-1 w-full mx-auto max-w-[1280px] px-4 md:px-6 py-6">{children}</main>
      <footer className="mt-10">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-10 border-t border-hairline text-xs text-muted flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-2"><Octicon name="MarkGithub" /> Copyright 2026 ZackyTzu</span>
          <Link className="hover:underline hover:text-blue" to="/terms">Terms</Link>
          <Link className="hover:underline hover:text-blue" to="/privacy">Privacy</Link>
          <Link className="hover:underline hover:text-blue" to="/about">About</Link>
          <a className="hover:underline hover:text-blue" href="https://github.com/ZackyTzu/calc_OS" target="_blank" rel="noreferrer">Source</a>
          <a className="hover:underline hover:text-blue" href="https://github.com/ZackyTzu/calc_OS/issues" target="_blank" rel="noreferrer">Report a problem</a>
          <span className="basis-full">GPL-3.0-or-later. Not affiliated with Texas Instruments. TI-84 Plus CE, TI-Nspire and TI Connect are trademarks of Texas Instruments Incorporated. Octicons by GitHub, MIT.</span>
        </div>
      </footer>
    </div>
  );
}
