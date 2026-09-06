import { Link } from 'react-router-dom';

export function Privacy() {
  return (
    <article className="max-w-3xl space-y-6 text-slate-300">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Privacy policy</h1>
        <p className="text-sm text-slate-500">Last updated 6 September 2026</p>
      </header>

      <p>calc_OS has no user accounts, no analytics, no advertising, no cookies and no server of its own. Everything the site does happens inside your browser.</p>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">1. Data calc_OS does not collect</h2>
        <p>The site does not ask for or record your name, email address or any other personal information. The contents of your calculator, the files you drop onto the page and the programs you install are processed in your browser's memory and are never sent to the maintainer or to any third party.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">2. What happens in your browser</h2>
        <ul className="list-disc list-inside space-y-1">
          <li><b>USB access.</b> Your browser asks for permission before calc_OS can talk to a calculator, and the permission applies to this site only. You can revoke it at any time in the browser's site settings.</li>
          <li><b>Calculator contents.</b> The list of variables and any program you save are read into memory so the page can show them to you. They are discarded when you close the tab.</li>
          <li><b>Files you provide.</b> Files dropped onto the My calculator, Nspire or Game Boy page are parsed locally, including Game Boy ROM files, which are converted entirely in your browser. Downloads offered by the site are generated locally.</li>
          <li><b>Storage.</b> calc_OS does not use cookies, localStorage or any other persistent browser storage. The only thing it can install is described in the next point.</li>
          <li><b>Service worker for Nspire transfers.</b> If you enable Nspire transfers, the site registers a small service worker that adds two HTTP headers to the pages it serves so the transfer engine can run. It stores no data and does not track anything. You can remove it from the browser's site settings.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">3. Hosting</h2>
        <p>The site is hosted on GitHub Pages. GitHub may log visitor IP addresses and requests to operate and secure the service, as described in the <a className="link" href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">GitHub General Privacy Statement</a>. The maintainer does not receive or have access to those logs.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">4. Links to other sites</h2>
        <p>Program pages link to authors' sites such as GitHub, ticalc.org and Cemetech. Those sites have their own privacy policies, which apply as soon as you follow a link.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">5. Children</h2>
        <p>calc_OS collects no personal information from anyone, including children under 13.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">6. Changes and contact</h2>
        <p>If this policy changes, the date at the top will be updated and the previous versions remain in the repository history. Questions can be raised by opening an issue at <a className="link" href="https://github.com/ZackyTzu/calc_OS/issues" target="_blank" rel="noreferrer">github.com/ZackyTzu/calc_OS/issues</a>. See also the <Link className="link" to="/terms">terms and conditions</Link>.</p>
      </section>
    </article>
  );
}
