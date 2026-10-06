# LUXURY TIME

Boutique de alta relojería: una experiencia visual, sin venta.
Sitio 100 % estático (HTML, CSS y JavaScript) pensado para GitHub Pages, con animaciones de
[GSAP](https://gsap.com/) + ScrollTrigger.

> Proyecto académico sin fines comerciales. Las marcas, nombres e imágenes pertenecen a sus respectivos titulares.

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
  "site": { "name", "tagline", "eyebrow", "footer" },
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
index.html          Estructura base, cabecera y formulario de cita
css/styles.css      Estilos (paleta, tipografías, layout responsive)
js/app.js           Router por hash, vistas y animaciones GSAP
js/placeholder.js   Generador de relojes SVG para imágenes faltantes
data.json           Marcas, modelos, textos y rutas de imágenes
assets/             Logos, videos e imágenes
```

Tipografías: Cormorant Garamond (títulos) e Inter Light (texto), desde Google Fonts.
Se respeta `prefers-reduced-motion`.
