import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ConnectButton } from './ConnectButton';

const links = [
  ['/library', 'Library'],
  ['/calculator', 'My calculator'],
  ['/unlock', 'Unlock games'],
  ['/nspire', 'Nspire CX II'],
  ['/about', 'About'],
] as const;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-lg">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-6 h-6" />
            <span><span className="text-emerald-400">calc</span>_OS</span>
          </Link>
          <nav className="hidden md:flex gap-1 text-sm">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md hover:bg-slate-800 ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <ConnectButton />
          </div>
        </div>
        <nav className="md:hidden flex gap-1 px-2 pb-2 text-xs overflow-x-auto">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `px-2 py-1 rounded ${isActive ? 'bg-slate-800' : 'text-slate-300'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl w-full px-4 py-8 flex-1">{children}</main>
      <footer className="border-t border-slate-800 text-xs text-slate-500 py-6">
        <div className="mx-auto max-w-6xl px-4 flex flex-wrap gap-4 justify-between">
          <span>calc_OS is free software (GPL-3.0). Not affiliated with Texas Instruments. TI-84 Plus CE and TI-Nspire are trademarks of Texas Instruments.</span>
          <span className="flex gap-4">
            <Link className="hover:text-slate-300" to="/about">About</Link>
            <a className="hover:text-slate-300" href="https://github.com/ZackyTzu/calc_OS" target="_blank" rel="noreferrer">Source on GitHub</a>
            <a className="hover:text-slate-300" href="https://github.com/ZackyTzu/calc_OS/issues" target="_blank" rel="noreferrer">Report a problem</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
