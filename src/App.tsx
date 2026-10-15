import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './core/Layout';
import { MODULES } from './modules/registry';
import Home from './pages/Home';

// HashRouter: funciona en hosting estático sin reglas de reescritura.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          {MODULES.map(({ id, component: Component }) => (
            <Route key={id} path={id} element={<Component />} />
          ))}
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
