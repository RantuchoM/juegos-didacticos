# Mi Teclado Mágico

Juegos didácticos de lectura y matemática para niños. Sitio estático listo para **GitHub Pages**.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube este proyecto.
2. En el repositorio: **Settings → Pages**.
3. En **Build and deployment → Source**, elige **Deploy from a branch**.
4. Branch: `main` (o `master`), carpeta: **/ (root)**.
5. Guarda. En unos minutos la app estará en  
   `https://<tu-usuario>.github.io/<nombre-repo>/`

> El archivo `.nojekyll` evita que Jekyll ignore carpetas que empiezan con `_`.

## Estructura del proyecto

```
├── index.html              # Página principal (solo HTML semántico)
├── letras.html             # Redirección al index (compatibilidad)
├── css/
│   ├── base.css            # Layout, tipografía, utilidades
│   ├── menu.css            # Menú principal y dificultad
│   ├── reading.css         # Teclado, sílabas, quiz de lectura
│   ├── math.css            # Juegos de matemática
│   └── celebration.css     # Modal de celebración
├── js/
│   ├── main.js             # Punto de entrada (ES modules)
│   ├── speech.js           # Voz personalizada + TTS latino
│   ├── app.js              # Lógica de juegos y navegación
│   ├── config.js           # Constantes, niveles, mensajes, voz
│   └── data/
│       └── palabras.js     # Vocabulario (palabras, sílabas, emojis)
├── audio/
│   └── latino/             # Audios de voz personalizada (ver abajo)
└── .nojekyll
```

## Cómo ampliar el proyecto

### Añadir palabras nuevas

Edita `js/data/palabras.js`. Cada entrada tiene esta forma:

```javascript
{ palabra: 'perro', silabas: ['pe', 'rro'], emoji: '🐶' }
```

También puedes usar `svg` en lugar de `emoji` para dibujos vectoriales (ver la palabra «mesa»).

### Cambiar niveles de dificultad

Edita `js/config.js`:

- `NIVELES_CONTAR_UNIR` — juegos Contar y Unir
- `NIVELES_MAT` — Escribir y Elegir número

### Añadir un juego nuevo

1. Añade una sección en `index.html` con `id="juego-mi-juego"`.
2. Añade estilos en el CSS que corresponda (`reading.css` o `math.css`).
3. En `js/app.js`, crea la función `iniciarMiJuego()` y regístrala en `mostrarJuego()`.
4. Opcional: añade un botón en el menú con `data-juego="mi-juego"`.

### Estilos

Los estilos están separados por área. Si modificas mucho un juego, trabaja en el archivo CSS correspondiente para mantener el resto intacto.

## Desarrollo local

Los módulos ES requieren un servidor HTTP (no abras `index.html` directamente con `file://`):

```bash
npx serve .
# o
python -m http.server 8080
```

Luego abre `http://localhost:3000` (o el puerto que indique el servidor).

## Juegos incluidos

| Área       | Juego    | Descripción                          |
|-----------|----------|--------------------------------------|
| Lectura   | Teclado  | Escribir y escuchar letras           |
| Lectura   | Sílabas  | Armar palabras por sílabas           |
| Lectura   | Palabra  | Elegir imagen según palabra          |
| Lectura   | Imagen   | Elegir palabra según imagen          |
| Matemática| Contar   | Contar objetos                       |
| Matemática| Unir     | Relacionar cantidades con números    |
| Matemática| Escribir | Escribir el número escuchado         |
| Matemática| Elegir   | Elegir el número escuchado           |

Modo **Aleatorio** mezcla ejercicios de todos los juegos (excepto Teclado).

## Voz personalizada en latino

En GitHub Pages no se puede instalar una voz nueva en el navegador. Lo que sí podés hacer es **subir tus propios audios** (MP3, OGG…) y el juego los usará en lugar del sintetizador cuando existan.

### Carpetas

Coloca los archivos en `audio/latino/`:

| Carpeta     | Ejemplo de archivo   | Se usa para                          |
|------------|----------------------|--------------------------------------|
| `mensajes/` | `casi.mp3`          | «¡Casi!», «¡Muy bien!», etc.         |
| `letras/`   | `be.mp3`, `eñe.mp3` | Juego Teclado (deletrear)            |
| `numeros/`  | `7.mp3`, `42.mp3`   | Juegos de matemática                 |
| `palabras/` | `pelota.mp3`        | Palabras completas                   |
| `silabas/`  | `pe.mp3`, `llo.mp3` | Juego Sílabas                        |

Los nombres van en **minúsculas, sin tildes** (`manzana`, no `Manzana`).

### Pasos

1. Grabá los audios (celular, Audacity, etc.) en español latino.
2. Guardalos en la carpeta que corresponda.
3. Regenerá el índice de archivos:
   ```bash
   node scripts/generar-manifest-voz.mjs
   ```
4. Subí los cambios a GitHub (`git add . && git commit && git push`).

Si falta un audio, el juego usa la **voz del sistema en español latino** (configurable en `js/config.js` → `VOZ.idiomaTTS`, por ejemplo `es-MX` o `es-AR`).

Para desactivar los audios propios y usar solo el navegador: `VOZ.usarPersonalizada = false`.
