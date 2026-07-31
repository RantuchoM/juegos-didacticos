import { initVoz } from './speech.js';
import { initDificultadMat } from './dificultad-mat.js';
import { initPwa } from './pwa.js';
import { initWhatsNew } from './whats-new.js';

initPwa();
await initVoz();
initDificultadMat();

try {
    await import('./app.js');
} catch (err) {
    console.error('Error al cargar la aplicación:', err);
}

await initWhatsNew();
