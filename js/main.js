import { initVoz } from './speech.js';

await initVoz();
await import('./app.js');
