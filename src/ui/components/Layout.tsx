import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ConnectButton } from './ConnectButton';

const links = [
  ['/library', 'Library'],
  ['/calculator', 'My calculator'],
  ['/unlock', 'Unlock games'],
  ['/gameboy', 'Game Boy'],
  ['/nspire', 'Nspire CX II'],
  ['/about', 'About'],
] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md whitespace-nowrap transition-colors hover:bg-slate-800 hover:text-white ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 btn btn-secondary">Skip to content</a>
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-lg rounded-md">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-6 h-6" />
            <span><span className="text-emerald-400">calc</span>_OS</span>
          </Link>
          <nav className="hidden md:flex gap-1 text-sm">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} className={navClass}>{label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <ConnectButton />
          </div>
        </div>
        <nav className="md:hidden flex gap-1 px-2 pb-2 text-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={navClass}>{label}</NavLink>
          ))}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl w-full px-4 py-8 flex-1">{children}</main>
      <footer className="border-t border-slate-800 text-xs text-slate-500 py-6">
        <div className="mx-auto max-w-6xl px-4 flex flex-wrap gap-4 justify-between">
          <span>calc_OS is free software (GPL-3.0). Not affiliated with Texas Instruments. TI-84 Plus CE and TI-Nspire are trademarks of Texas Instruments.</span>
          <span className="flex flex-wrap gap-4">
            <Link className="hover:text-slate-300 transition-colors" to="/about">About</Link>
            <Link className="hover:text-slate-300 transition-colors" to="/terms">Terms</Link>
            <Link className="hover:text-slate-300 transition-colors" to="/privacy">Privacy</Link>
            <a className="hover:text-slate-300 transition-colors" href="https://github.com/ZackyTzu/calc_OS" target="_blank" rel="noreferrer">Source on GitHub</a>
            <a className="hover:text-slate-300 transition-colors" href="https://github.com/ZackyTzu/calc_OS/issues" target="_blank" rel="noreferrer">Report a problem</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
