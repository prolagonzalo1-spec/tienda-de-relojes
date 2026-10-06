# LUXURY TIME

Boutique de alta relojería: una experiencia visual, sin venta.
Sitio 100 % estático (HTML, CSS y JavaScript) pensado para GitHub Pages, con animaciones de
[GSAP](https://gsap.com/) + ScrollTrigger.

> Luxury Time · Proyecto académico ficticio. Imágenes obtenidas de Pinterest con fines educativos.

## Flujo

1. **Inicio** (`#/`): logo y selector de marcas. Una marca sin modelos se muestra como *Próximamente* y no se puede elegir.
2. **Presentación** (`#/marca/<marca>/presentacion`): video a pantalla completa, muteado, con botón **Saltar** (también `Esc`). Al terminar o saltar pasa al catálogo.
3. **Catálogo** (`#/marca/<marca>`): grilla de modelos con foto, nombre, colección y referencia.
4. **Ficha** (`#/marca/<marca>/<modelo>`): imagen fija que cambia con un fundido mientras el texto de cada sección entra desde abajo (presentación, esfera, caja, movimiento, malla y especificaciones). Al final, **Solicitar cita en boutique** abre un formulario que no envía datos: solo muestra una confirmación.

## Ver el sitio en local

`data.json` se carga con `fetch`, así que el sitio necesita un servidor (no funciona abriendo `index.html` con doble clic):

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Publicar en GitHub Pages

*Settings → Pages → Build and deployment → Deploy from a branch*, elegir la rama y la carpeta `/ (root)`.
El archivo `.nojekyll` ya está incluido.

## Contenido: `data.json`

Todo el contenido sale de `data.json`; para agregar marcas o modelos no hace falta tocar el código.

```jsonc
{
  "site": { "name", "tagline", "eyebrow", "footer", "clock": { "source": "browser" | "api" } },
  "brands": [
    {
      "id": "rolex",                   // se usa en la URL y en la carpeta de assets
      "name": "Rolex",
      "short": "ROLEX",                // texto que aparece en los placeholders
      "origin": "Ginebra",
      "founded": 1905,
      "logo": "assets/rolex/logo.svg",
      "intro": { "video": "assets/rolex/intro.mp4", "poster": "assets/rolex/intro-poster.webp" },
      "description": "…",
      "models": [
        {
          "id": "submariner-date-azul",  // no usar "presentacion" como id
          "name": "Submariner Date · Azul",
          "collection": "Submariner",
          "reference": "Ref. 126619LB",
          "palette": { "dial": "#0d1a2b", "metal": "platinum", "strap": "leather", "strapColor": "#0b0f18" },
          "images": ["assets/rolex/submariner-date-azul/01.webp", "… 02 a 06"],
          "sections": [
            { "id": "presentacion", "eyebrow": "Presentación", "title": "…", "text": "…", "image": 0 }
            // esfera, caja, movimiento, malla…  "image" = índice (desde 0) en "images"
          ],
          "specifications": {
            "title": "Especificaciones técnicas",
            "image": 5,
            "items": [{ "label": "Diámetro", "value": "41 mm" }]
          }
        }
      ]
    }
  ]
}
```

- Una marca con `"models": []` (o con `"status": "coming-soon"`) aparece como **Próximamente**. Al cargarle modelos se habilita sola.
- La primera imagen de `images` es la foto del catálogo.
- `images` puede tener menos de 6 fotos: varias secciones pueden apuntar al mismo índice.

### Marcas actuales

| Marca | Estado | Modelos |
|---|---|---|
| Rolex | Disponible | Submariner Date Azul (126619LB), Oro y azul (126618LB), Oro y negro (126618LN), Submariner Negro (124060), Submariner Date Verde (116610LV) |
| Patek Philippe | Próximamente | — |
| Audemars Piguet | Próximamente | — |

## Assets

```
assets/[marca]/logo.svg
assets/[marca]/intro.mp4
assets/[marca]/intro-poster.webp
assets/[marca]/[modelo]/01.webp, 02.webp, …
```

**Mientras no existan los archivos reales**, el sitio sigue funcionando:

- **Fotos faltantes** → se dibuja automáticamente un reloj en SVG con los colores de `palette`
  (`metal`: `steel`, `platinum`, `titanium`, `gold`, `rose`; `strap`: `leather` o `bracelet`).
  Cada número de imagen muestra una vista distinta: 01 frente, 02 esfera, 03 caja, 04 movimiento, 05 malla, 06 detalle.
- **Video faltante** → se reproduce una presentación animada con el nombre de la marca.
- **Logo o póster faltante** → simplemente no se muestra.

Al subir un archivo con la ruta indicada, reemplaza al placeholder sin cambiar nada más.
Sugerencias: fotos verticales 4:5 (por ejemplo 1600×2000) en WebP sobre fondo oscuro; video H.264 en MP4, 10 a 20 s, sin audio.

## Estructura

```
index.html          Estructura base, cabecera, selector de tema y formulario de cita
css/styles.css      Tokens de marca (color y tipografía), temas y estilos
js/app.js           Router por hash, vistas, animaciones GSAP y tema
js/emblem.js        Emblema LT = reloj en vivo con la hora de Buenos Aires (+ favicon)
js/placeholder.js   Generador de relojes SVG para imágenes faltantes
data.json           Marcas, modelos, textos y rutas de imágenes
assets/brand/       Logo y emblema de Luxury Time (PNG, noche y claro)
assets/             Logos de marca, videos e imágenes
```

## Sistema de marca

### Color: tokens y dos modos

Todos los colores son custom properties en `css/styles.css`. El tema lo controla `data-theme` en `<html>`
(`night` por defecto, `light`); la elección se guarda en `localStorage` (`lt-theme`).

| Token | Noche | Claro |
|---|---|---|
| `--bg` | `#20201C` grafito cálido | `#FBF8F1` marfil |
| `--surface` | `#2A2A24` | `#FFFFFF` |
| `--text` | `#F4F1EA` hueso | `#1A1714` tinta |
| `--text-muted` | `#968F86` | `#6B6459` |
| `--gold` | `#C5A465` | `#8B6E2E` oro profundo (texto, líneas, íconos) |
| `--gold-fill` | `#C5A465` | `#C5A465` (solo rellenos) |
| `--line` | `rgba(197,164,101,.30)` | `rgba(156,124,52,.30)` |

- `--text-muted` de noche y `--gold` de claro están ajustados para cumplir WCAG AA (≥ 4,5:1).
- El oro es acento: subraya, no llena.
- La intro y la ficha de modelo son el "teatro" de la marca: marcan `data-surface="stage"` y se ven siempre en noche.
- Sin negro puro: el tono más profundo es `#1A1A17`.

### Emblema LT (reloj en vivo)

`js/emblem.js` dibuja el emblema como SVG inline (header, pie y pantalla de carga) y mueve las agujas con la hora de
Buenos Aires. Los colores salen de los tokens del tema. Cualquier elemento con `data-lt-emblem` se convierte en emblema
(`data-seconds` agrega segundero) y `data-lt-digital` muestra la hora HH:MM. El favicon es el mismo emblema con la hora
actual.

Fuente de hora (`data.json` → `site.clock.source`):

- `"browser"`: `Intl.DateTimeFormat` con zona `America/Argentina/Buenos_Aires`.
- `"api"`: [TimeAPI.io](https://timeapi.io), sincroniza cada 5 min e interpola; si falla, vuelve al navegador.
  En la consola, `LTEmblem.getState()` indica la fuente activa.

Apertura: al entrar, el emblema aparece grande con las agujas girando, se achica a medida que cargan los datos, las
tipografías y las fotos de la primera vista, y vuela a su lugar en el header mientras aparece el contenido; las agujas
se detienen en la hora real. En el header mide 44 px (36 px en mobile). Al desplazarse, el header pasa a ser una banda
sólida, se esconde al bajar y reaparece al subir.

Usos: tamaño mínimo 24 px; área de protección igual a la altura de la "L"; no deformar, no rotar (salvo las agujas),
no recolorear fuera de la paleta.

### Tipografía

Dos familias, nunca una tercera: **Cormorant Garamond** (300/500) para títulos, logo y cifras destacadas;
**Inter** (300/400/500) para texto, etiquetas y datos. Etiquetas de sección: Inter, MAYÚSCULAS, tracking 0.28em, oro.

### Tono de voz

Español, de usted, sobrio y preciso; sin superlativos vacíos. Términos en otro idioma solo si nombran el oficio
(*haute horlogerie*, *savoir-faire*, *maison*) o el origen del reloj.

| Usar | Evitar |
|---|---|
| pieza, colección | producto |
| boutique, maison, casa | local, tienda, negocio |
| cita | turno |
| le esperamos, le invitamos | te esperamos |
| presentar, descubrir | vender, ofertar |

Se respeta `prefers-reduced-motion`.
