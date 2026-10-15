import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';

export interface ToolModule {
  /** Identificador estable, también usado como ruta (`/#/<id>`). */
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  component: LazyExoticComponent<ComponentType>;
}

/**
 * Catálogo de herramientas. Para añadir un módulo nuevo: crea su carpeta en
 * `src/modules/<id>/` y añade una entrada aquí; la portada y las rutas se generan solas.
 */
export const MODULES: ToolModule[] = [
  {
    id: 'guia-huecos',
    title: 'Guía de huecos',
    description:
      'Plantilla para imprimir y perforar los huecos del cuadernillo: encuadernación francesa y robada (alternada).',
    icon: (
      <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">
        <path d="M16 3v26" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2.5" fill="none" />
        <circle cx="16" cy="8" r="2.6" fill="currentColor" />
        <circle cx="16" cy="16" r="2.6" fill="currentColor" />
        <circle cx="16" cy="24" r="2.6" fill="currentColor" />
      </svg>
    ),
    component: lazy(() => import('./guia-huecos/ui/GuiaHuecosPage')),
  },
];
