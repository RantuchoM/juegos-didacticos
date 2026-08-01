import { VOZ, MENSAJE_AUDIO, MSG_CASI } from './config.js';
import { numeroATextoEspanol } from './numeros-es.js';

const synth = window.speechSynthesis;
let vozEspanola = null;
let audioSets = null;
let audioActual = null;
let vozListaParaHablar = false;

function esLatino(v) {
    const lang = v.lang.toLowerCase();
    const name = v.name.toLowerCase();
    return lang.startsWith('es') && (
        lang.includes('mx') || lang.includes('ar') || lang.includes('co') ||
        lang.includes('419') || lang.includes('us') || lang === 'es-419' ||
        /paulina|monica|mónica|jorge|diego|mexican|latino|latam|español.*méx|español.*arg/i.test(name)
    );
}

function esEspanol(v) {
    return v.lang.toLowerCase().startsWith('es');
}

/**
 * Como en las primeras versiones: priorizar voces locales es-ES (Sabina/Helena),
 * y recién después latino. Forzar solo es-MX rompe muchos Android.
 */
function cargarVoces() {
    if (!synth) return;
    const voces = synth.getVoices();
    if (!voces || voces.length === 0) return;

    const localEs = (v) => esEspanol(v) && v.localService;
    vozEspanola =
        voces.find((v) => localEs(v) && /sabina|helena|pablo/i.test(v.name)) ||
        voces.find((v) => localEs(v) && v.lang.toLowerCase().startsWith('es-es')) ||
        (VOZ.preferirLatinoTTS ? voces.find((v) => esLatino(v) && v.localService) : null) ||
        voces.find(localEs) ||
        (VOZ.preferirLatinoTTS ? voces.find(esLatino) : null) ||
        voces.find((v) => esEspanol(v) && v.lang.toLowerCase().startsWith('es-es')) ||
        voces.find(esEspanol) ||
        null;
}

if (synth) {
    synth.onvoiceschanged = cargarVoces;
}

/**
 * Desbloqueo real en el gesto del usuario (sin cancelar después).
 * En Android, speak() dentro del gesto habilita el TTS para el resto de la sesión.
 */
function desbloquearVozEnGesto() {
    if (!synth || vozListaParaHablar) return;
    vozListaParaHablar = true;
    cargarVoces();
    try {
        if (synth.paused) synth.resume();
    } catch {
        // ignore
    }
    try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        u.rate = 2;
        u.lang = vozEspanola?.lang || 'es-ES';
        if (vozEspanola) u.voice = vozEspanola;
        synth.speak(u);
        // No cancelar: cancelar acá deja mudo el motor en varios Android.
    } catch {
        // ignore
    }
}

function instalarDesbloqueoVoz() {
    if (!synth) return;
    const unlock = () => {
        desbloquearVozEnGesto();
        document.removeEventListener('pointerdown', unlock, true);
        document.removeEventListener('touchstart', unlock, true);
        document.removeEventListener('click', unlock, true);
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('click', unlock, true);
}

export async function initVoz() {
    cargarVoces();
    instalarDesbloqueoVoz();
    if (!VOZ.usarPersonalizada) return;

    try {
        const res = await fetch(`${VOZ.carpeta}/manifest.json`);
        if (!res.ok) return;
        const data = await res.json();
        audioSets = {
            mensajes: new Set(data.mensajes || []),
            letras: new Set(data.letras || []),
            numeros: new Set(data.numeros || []),
            palabras: new Set(data.palabras || []),
            silabas: new Set(data.silabas || [])
        };
    } catch {
        audioSets = null;
    }
}

function slugAudio(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-ñ]/g, '');
}

function urlAudio(tipo, slug) {
    return `${VOZ.carpeta}/${tipo}/${slug}.${VOZ.formato}`;
}

function tieneAudio(tipo, slug) {
    return Boolean(audioSets?.[tipo]?.has(slug));
}

function detenerAudio() {
    if (audioActual) {
        audioActual.pause();
        audioActual.onended = null;
        audioActual.onerror = null;
        audioActual = null;
    }
}

export function cancelarVoz() {
    try {
        synth?.cancel();
    } catch {
        // ignore
    }
    detenerAudio();
}

/**
 * Prepara texto para que el TTS lo lea en español como palabra (no deletreo).
 */
function textoParaLecturaEspanol(texto) {
    let t = String(texto).normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!t) return t;
    const partes = t.split(' ');
    if (partes.length > 1 && partes.every((p) => [...p].length === 1)) {
        t = partes.join('');
    }
    return t.toLocaleLowerCase('es');
}

/** Fonema de una letra (sonido), no el nombre («eme», «hache», «ele»…). */
function fonemaLetra(letra) {
    const l = letra.toLocaleLowerCase('es');
    if (l === 'h') return '';
    if ('aeiouáéíóúü'.includes(l)) {
        return l.normalize('NFD').replace(/\p{M}/gu, '');
    }
    const alargados = {
        m: 'mm', n: 'nn', ñ: 'ñ', s: 'ss', f: 'ff', l: 'll', r: 'rr',
        z: 'ss', j: 'jj', y: 'yy', c: 'cc', p: 'pp', t: 'tt', d: 'dd',
        b: 'bb', g: 'gg', k: 'kk', q: 'cc', v: 'bb', w: 'uu', x: 'ks'
    };
    return alargados[l] || `${l}${l}`;
}

function hablarTTS(texto, alTerminar) {
    if (!texto) {
        alTerminar?.();
        return;
    }
    const paraVoz = textoParaLecturaEspanol(texto);
    if (!paraVoz) {
        alTerminar?.();
        return;
    }
    hablarTTSCrudo(paraVoz, alTerminar, 0.85);
}

/** Habla ya (síncrono). Como las primeras versiones: cancel + speak en el mismo gesto. */
function hablarTTSCrudo(paraVoz, alTerminar, rate = 0.85) {
    if (!paraVoz || !synth) {
        alTerminar?.();
        return;
    }

    if (!vozEspanola) cargarVoces();
    try {
        if (synth.paused) synth.resume();
    } catch {
        // ignore
    }

    const utterance = new SpeechSynthesisUtterance(paraVoz);
    // es-ES es el que más dispositivos traen; la voz elegida puede cambiar el lang.
    utterance.lang = vozEspanola?.lang || 'es-ES';
    if (vozEspanola) utterance.voice = vozEspanola;
    utterance.rate = rate;
    utterance.pitch = 1.05;
    if (alTerminar) {
        utterance.onend = () => alTerminar();
        utterance.onerror = () => alTerminar();
    }
    try {
        synth.speak(utterance);
    } catch {
        alTerminar?.();
    }
}

function reproducirUrl(url, alTerminar) {
    detenerAudio();
    const audio = new Audio(url);
    audioActual = audio;
    const terminar = () => {
        if (audioActual === audio) audioActual = null;
        alTerminar?.();
    };
    audio.onended = terminar;
    audio.onerror = terminar;
    audio.play().catch(terminar);
}

function mensajeSlug(texto) {
    return MENSAJE_AUDIO[texto] || slugAudio(texto);
}

function hablarConAudioOTts(texto, alTerminar, opts = {}) {
    if (!texto) {
        alTerminar?.();
        return;
    }
    // Igual que al principio: cancelar y hablar al toque, sin delays.
    cancelarVoz();

    const msg = mensajeSlug(texto);
    if (tieneAudio('mensajes', msg)) {
        reproducirUrl(urlAudio('mensajes', msg), alTerminar);
        return;
    }

    const palabra = slugAudio(texto);
    if (tieneAudio('palabras', palabra)) {
        reproducirUrl(urlAudio('palabras', palabra), alTerminar);
        return;
    }

    if (opts.silaba) {
        const slug = slugAudio(silabaParaVoz(texto));
        if (tieneAudio('silabas', slug)) {
            reproducirUrl(urlAudio('silabas', slug), alTerminar);
            return;
        }
        hablarTTSCrudo(silabaParaVoz(texto), alTerminar, 0.78);
        return;
    }

    hablarTTS(texto, alTerminar);
}

export function hablar(texto, alTerminar) {
    hablarConAudioOTts(texto, alTerminar);
}

function silabaParaVoz(texto) {
    const t = texto.trim();
    if (!t) return t;
    return t.charAt(0).toLocaleUpperCase('es') + t.slice(1).toLocaleLowerCase('es');
}

export function hablarSilaba(texto, alTerminar) {
    hablarConAudioOTts(texto, alTerminar, { silaba: true });
}

/**
 * Lee el texto del teclado como palabra(s) en español.
 */
export function hablarCadena(texto) {
    if (!texto) return;
    cancelarVoz();

    const t = textoParaLecturaEspanol(texto);
    if (!t) return;

    const slug = slugAudio(t);
    if (tieneAudio('palabras', slug)) {
        reproducirUrl(urlAudio('palabras', slug));
        return;
    }

    if ([...t].length === 1) {
        const fonema = fonemaLetra(t);
        if (fonema) hablarTTSCrudo(fonema);
        return;
    }

    hablarTTSCrudo(t);
}

export function hablarNumero(n, alTerminar) {
    if (n === undefined || n === null || n === '') {
        alTerminar?.();
        return;
    }
    cancelarVoz();

    const num = typeof n === 'string' ? parseInt(n, 10) : n;
    if (!Number.isFinite(num)) {
        alTerminar?.();
        return;
    }

    const key = String(num);
    if (tieneAudio('numeros', key)) {
        reproducirUrl(urlAudio('numeros', key), alTerminar);
        return;
    }

    hablarTTS(numeroATextoEspanol(num), alTerminar);
}

export function hablarNumeroEscrito(texto) {
    if (!texto) return;
    hablarNumero(parseInt(texto, 10));
}

export function decirErrorOpcion(valorOpcion) {
    if (valorOpcion !== undefined && valorOpcion !== null && String(valorOpcion) !== '') {
        hablarNumero(valorOpcion);
    } else {
        hablar(MSG_CASI);
    }
}
