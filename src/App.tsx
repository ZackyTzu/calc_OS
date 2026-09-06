import { Route, Routes } from 'react-router-dom';
import { Layout } from './ui/components/Layout';
import { Home } from './ui/pages/Home';
import { Library } from './ui/pages/Library';
import { ProgramDetail } from './ui/pages/ProgramDetail';
import { Calculator } from './ui/pages/Calculator';
import { Unlock } from './ui/pages/Unlock';
import { Nspire } from './ui/pages/Nspire';
import { About } from './ui/pages/About';
import { Terms } from './ui/pages/Terms';
import { Privacy } from './ui/pages/Privacy';
import { GameBoy } from './ui/pages/GameBoy';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/library/:id" element={<ProgramDetail />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/unlock" element={<Unlock />} />
        <Route path="/gameboy" element={<GameBoy />} />
        <Route path="/nspire" element={<Nspire />} />
        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}
