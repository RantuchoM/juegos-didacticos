import { initVoz } from './speech.js';
import { initDificultadMat } from './dificultad-mat.js';

await initVoz();
initDificultadMat();

try {
    await import('./app.js');
} catch (err) {
    console.error('Error al cargar la aplicación:', err);
}
