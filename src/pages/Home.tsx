import { Link } from 'react-router-dom';
import { MODULES } from '../modules/registry';

export default function Home() {
  return (
    <div className="home">
      <h1>Herramientas de encuadernación</h1>
      <p className="lead">Pequeñas utilidades para preparar tus trabajos de encuadernación. Todo funciona en tu navegador.</p>
      <ul className="cards">
        {MODULES.map((m) => (
          <li key={m.id}>
            <Link to={`/${m.id}`} className="card">
              <span className="card-icon">{m.icon}</span>
              <span className="card-title">{m.title}</span>
              <span className="card-desc">{m.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
