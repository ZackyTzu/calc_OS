import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ConnectButton } from './ConnectButton';
import { CloseIcon, MenuIcon } from './Icon';

const links = [
  ['/library', 'Library'],
  ['/calculator', 'My calculator'],
  ['/unlock', 'Unlock games'],
  ['/gameboy', 'Game Boy'],
  ['/nspire', 'Nspire'],
  ['/about', 'About'],
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  const isHome = pathname === '/';

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 btn btn-secondary btn-sm">Skip to content</a>
      <header className="globalnav sticky top-0 z-20 border-b border-black/5">
        <div className="mx-auto max-w-[980px] px-5 h-11 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-[17px] tracking-tight">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-5 h-5" />
            <span>calc_OS</span>
          </Link>
          <nav className="hidden md:flex flex-1 justify-center gap-8" aria-label="Main">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} className="nav-link">{label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto md:ml-0 flex items-center gap-2">
            <ConnectButton />
            <button
              type="button"
              className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded-lg text-black/80 hover:text-black"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Menu'}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-menu" className="enter md:hidden border-t border-hairline bg-white px-6 pb-4" aria-label="Main">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} className="block py-3 text-xl border-b border-hairline last:border-0 text-ink">{label}</NavLink>
            ))}
          </nav>
        )}
      </header>
      <main id="main" className={isHome ? 'flex-1 w-full' : 'flex-1 w-full mx-auto max-w-[1024px] px-5 py-10 md:py-14'}>{children}</main>
      <footer className="bg-alt text-xs text-black/56 mt-20">
        <div className="mx-auto max-w-[980px] px-5 py-6 space-y-4">
          <p>calc_OS is free software under the GNU General Public License v3.0 or later. It is not affiliated with, endorsed by or supported by Texas Instruments. TI-84 Plus CE, TI-Nspire and TI Connect are trademarks of Texas Instruments Incorporated. Third-party programs remain the property of their authors.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-hairline pt-4">
            <Link className="hover:underline text-black/80" to="/about">About</Link>
            <Link className="hover:underline text-black/80" to="/terms">Terms and conditions</Link>
            <Link className="hover:underline text-black/80" to="/privacy">Privacy policy</Link>
            <a className="hover:underline text-black/80" href="https://github.com/ZackyTzu/calc_OS" target="_blank" rel="noreferrer">Source on GitHub</a>
            <a className="hover:underline text-black/80" href="https://github.com/ZackyTzu/calc_OS/issues" target="_blank" rel="noreferrer">Report a problem</a>
            <span className="ml-auto">Copyright 2026 ZackyTzu</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
