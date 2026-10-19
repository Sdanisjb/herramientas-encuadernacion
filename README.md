# Herramientas de encuadernación

Colección de utilidades web para encuadernación. 100 % estática: todo se calcula en el navegador.

## Módulos

| Módulo | Ruta | Estado |
| --- | --- | --- |
| Guía de huecos (francesa, robada/alternada y japonesa) | `/#/guia-huecos` | v0.3 |

## Desarrollo

```bash
npm install
npm run dev        # servidor local
npm test           # tests de geometría, SVG y PDF
npm run build      # typecheck + build de producción en dist/
```

Requiere Node 18+.

## Estructura

```
src/
  core/               # compartido: papel, dibujo (DrawOp), SVG, PDF, tema, layout
  modules/
    registry.tsx      # catálogo de módulos (portada y rutas salen de aquí)
    guia-huecos/
      geometry/       # funciones puras: stations, sheet, guide (+ tests)
      state.ts        # formulario <-> URL / localStorage
      ui/             # página y campos
  pages/Home.tsx
```

### Añadir un módulo nuevo

1. Crea `src/modules/<id>/` con una página por defecto exportada (`export default function ...`).
2. Añade una entrada en `src/modules/registry.tsx` (`id`, `title`, `description`, `icon`, `component: lazy(...)`).
3. Usa `core/draw.ts` + `core/svg.ts` + `core/pdf.ts` si el módulo produce algo imprimible a escala real.

## Guía de huecos: cómo se interpreta

- **Hoja sin plegar**: el tamaño elegido es la hoja que se imprime y se pliega por la mitad; el lomo mide el lado corto
  (A4 -> lomo de 210 mm, páginas A5).
- **Página del libro**: el tamaño es el de la página plegada; la hoja es el tamaño siguiente (A5 -> hoja A4).
- Los huecos se miden desde el borde de cabeza del lomo. «Distribuir» reparte el sobrante entre los huecos.
- **Francesa**: conjuntos (**X**) de dos huecos contiguos, con margen de cabeza y de pie. La separación entre X es,
  por defecto, igual al ancho de la X (se puede fijar otra). Dos modos: por **cantidad de X** (las distancias se
  calculan para llenar el lomo) o por **medidas exactas** (la cantidad sale de cuántas X caben). Ver `computeSets`.
  Con la separación ligada, el patrón coincide con huecos equiespaciados en número par; se distingue al fijar otra separación.
- **Japonesa**: la costura va al costado. Huecos equiespaciados en **número impar**, en una línea vertical paralela al
  borde de la hoja, a una distancia configurable («Margen del borde a los huecos»), con margen superior e inferior
  independientes. La hoja tiene el tamaño de la página; se elige orientación (horizontal por defecto) y lado de la
  costura (izquierdo o derecho). La misma plantilla sirve para las páginas y la tapa. Ver `buildJapanese` en `geometry/guide.ts`.
- La paridad del número de huecos (`parity` en `computeStations`) es `even` en la robada y `odd` en la japonesa: en modo
  número un valor con otra paridad es un error con sugerencia; en modo espaciado se descarta el último hueco.
- La vista previa acota el margen de cabeza, la distancia entre huecos consecutivos y el margen de pie, y numera las X.
- **Robada (alternada)**: un único patrón de huecos equiespaciados, con **número par de huecos**. Lo que la distingue de la
  francesa son los márgenes de cabeza y pie, que se fijan por separado. En modo número, un valor impar es un error; en modo
  espaciado, si caben huecos impares se descarta el último. La regla vive en `evenOnly` de `computeStations`.
- Imprime siempre el PDF al **100 %** y comprueba la barra de escala (50 mm; 25 mm en hojas muy pequeñas).

## Despliegue gratuito

Es un sitio estático (`dist/`), usa `HashRouter` y `base: './'`, así que funciona en cualquier subruta.

- **Cloudflare Pages** (recomendado): conecta el repo, comando `npm run build`, directorio `dist`.
- **GitHub Pages**: el workflow `.github/workflows/deploy.yml` construye y publica al hacer push a `main`.
  Requiere activar en el repo *Settings → Pages → Source: GitHub Actions*.
- **Netlify / Vercel**: comando `npm run build`, directorio `dist`.
