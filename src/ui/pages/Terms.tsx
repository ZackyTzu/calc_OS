import { Link } from 'react-router-dom';

export function Terms() {
  return (
    <article className="max-w-3xl space-y-6 text-slate-300">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Terms and conditions</h1>
        <p className="text-sm text-slate-500">Last updated 6 September 2026</p>
      </header>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">1. Who runs calc_OS</h2>
        <p>calc_OS is a free, open-source website maintained by ZackyTzu and published from the GitHub repository <a className="link" href="https://github.com/ZackyTzu/calc_OS" target="_blank" rel="noreferrer">github.com/ZackyTzu/calc_OS</a>. It is a personal project, not a company, and it is not affiliated with, endorsed by or supported by Texas Instruments.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">2. Agreement</h2>
        <p>By using calc_OS you agree to these terms. If you do not agree, do not use the site. These terms apply to the website only. The source code is separately licensed under the GNU General Public License version 3 or later, which governs copying and modifying the code.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">3. What the site does</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>After you grant permission in your browser, it reads the list of variables on your calculator, sends programs to it and deletes variables you choose to delete, over USB.</li>
          <li>It generates its own study programs, games and the MathBot assistant in your browser.</li>
          <li>It hosts a small number of third-party programs whose licences allow redistribution, and links to the authors' pages for the rest.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">4. Your responsibilities</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Only connect a calculator that you own or are allowed to modify.</li>
          <li>Deleting a variable is permanent. Keep copies of anything you care about; the My calculator page can save a copy to your computer first.</li>
          <li>Follow the rules of your school and your exam board. Jailbreaks such as arTIfiCE disable exam mode, and some exams forbid particular programs.</li>
          <li>Read the compatibility notes before installing assembly programs. The site marks what works on your operating system version once the calculator is connected.</li>
          <li>Do not attempt to disrupt the site, its hosting or other users, and do not redistribute third-party programs in ways their licences forbid.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">5. No warranty and limitation of liability</h2>
        <p>calc_OS is provided free of charge, as is and as available, without warranty of any kind, express or implied, including any warranty of merchantability, fitness for a particular purpose or non-infringement. To the fullest extent permitted by law, the maintainer is not liable for any loss or damage arising from your use of the site or of any program obtained through it, including loss of data on a calculator, damage to a device, or consequences of using a program during an exam.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">6. Third-party programs and links</h2>
        <p>Each program page names its author and licence. Third-party programs remain the property of their authors and are governed by their own licences. Links to other websites, such as ticalc.org, Cemetech and GitHub, lead to sites the maintainer does not control and is not responsible for.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">7. Intellectual property</h2>
        <p>The calc_OS code and the programs it generates are licensed under the GNU General Public License version 3 or later. TI-84 Plus CE, TI-Nspire and TI Connect are trademarks of Texas Instruments Incorporated and are used only to identify the devices the site works with.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">8. Changes</h2>
        <p>These terms may change. The date at the top shows the current version, and every previous version can be read in the repository history. Continued use of the site after a change means you accept the new terms.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">9. Contact</h2>
        <p>Questions about these terms can be raised by opening an issue at <a className="link" href="https://github.com/ZackyTzu/calc_OS/issues" target="_blank" rel="noreferrer">github.com/ZackyTzu/calc_OS/issues</a>. See also the <Link className="link" to="/privacy">privacy policy</Link>.</p>
      </section>
    </article>
  );
}
