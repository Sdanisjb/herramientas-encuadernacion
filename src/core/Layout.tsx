import { Link, NavLink, Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { MODULES } from '../modules/registry';

export default function Layout() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          Herramientas de encuadernación
        </Link>
        <nav aria-label="Herramientas">
          {MODULES.map((m) => (
            <NavLink key={m.id} to={`/${m.id}`}>
              {m.title}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Suspense fallback={<p className="loading">Cargando…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}
