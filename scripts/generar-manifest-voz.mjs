import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const base = path.join(root, 'audio', 'latino');
const tipos = ['mensajes', 'letras', 'numeros', 'palabras', 'silabas'];
const formatos = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.webm']);

const manifest = {};

for (const tipo of tipos) {
    const dir = path.join(base, tipo);
    if (!fs.existsSync(dir)) {
        manifest[tipo] = [];
        continue;
    }
    manifest[tipo] = fs
        .readdirSync(dir)
        .filter((f) => formatos.has(path.extname(f).toLowerCase()))
        .map((f) => path.basename(f, path.extname(f)))
        .sort((a, b) => a.localeCompare(b, 'es'));
}

fs.writeFileSync(
    path.join(base, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
);

console.log('manifest.json actualizado:');
for (const tipo of tipos) {
    console.log(`  ${tipo}: ${manifest[tipo].length} archivos`);
}
