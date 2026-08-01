import { VOZ, MENSAJE_AUDIO, MSG_CASI } from './config.js';
import { numeroATextoEspanol } from './numeros-es.js';

const synth = window.speechSynthesis;
let vozEspanola = null;
let audioSets = null;
let audioActual = null;
/** Chrome/Android: si no hay referencia, el GC mata el utterance y no se oye nada. */
let utteranceActual = null;

/**
 * Selección como en la primera versión que andaba en móvil:
 * Sabina/Helena local → otra es-ES local → cualquier es local → cualquier es.
 */
function cargarVoces() {
    if (!synth) return;
    const voces = synth.getVoices();
    if (!voces || !voces.length) return;
    const es = (v) => v.lang.toLowerCase().startsWith('es');
    const local = (v) => es(v) && v.localService;
    vozEspanola =
        voces.find((v) => local(v) && /sabina|helena|pablo/i.test(v.name)) ||
        voces.find((v) => local(v) && v.lang.toLowerCase().startsWith('es-es')) ||
        voces.find(local) ||
        voces.find((v) => es(v) && v.lang.toLowerCase() === 'es-es') ||
        voces.find(es) ||
        null;
}

if (synth) {
    synth.onvoiceschanged = cargarVoces;
}

/** Solo resume: un speak silencioso + cancel deja muda la voz en muchos Android. */
function despertarSynth() {
    if (!synth) return;
    try {
        if (synth.paused) synth.resume();
    } catch {
        // ignore
    }
}

function instalarDespertarEnGesto() {
    if (!synth) return;
    const wake = () => {
        despertarSynth();
        cargarVoces();
    };
    document.addEventListener('pointerdown', wake, true);
    document.addEventListener('touchstart', wake, true);
}

export async function initVoz() {
    cargarVoces();
    instalarDespertarEnGesto();
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
    utteranceActual = null;
    detenerAudio();
}

/**
 * Hablar con el mismo patrón que al principio:
 * cancel + SpeechSynthesisUtterance + lang es-ES + speak (síncrono).
 */
function hablarNativo(texto, alTerminar, { rate = 0.85, pitch = 1.1 } = {}) {
    if (!texto || !synth) {
        alTerminar?.();
        return;
    }
    if (!vozEspanola) cargarVoces();
    despertarSynth();

    // Como la v1: cancelar y hablar al toque, sin setTimeout.
    try {
        synth.cancel();
    } catch {
        // ignore
    }

    const utterance = new SpeechSynthesisUtterance(String(texto));
    utteranceActual = utterance;
    utterance.lang = 'es-ES';
    // Solo forzar voice si es local: las de red fallan offline / en varios Android.
    if (vozEspanola && vozEspanola.localService) {
        utterance.voice = vozEspanola;
        utterance.lang = vozEspanola.lang || 'es-ES';
    }
    utterance.rate = rate;
    utterance.pitch = pitch;
    const fin = () => {
        if (utteranceActual === utterance) utteranceActual = null;
        alTerminar?.();
    };
    utterance.onend = fin;
    utterance.onerror = fin;
    try {
        synth.speak(utterance);
        // Algunos Android quedan en paused tras cancel(); reanudar ayuda.
        try {
            if (synth.paused) synth.resume();
        } catch {
            // ignore
        }
    } catch {
        fin();
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

/** Texto del teclado: una palabra, sin deletrear. */
function textoParaLecturaEspanol(texto) {
    let t = String(texto).normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!t) return t;
    const partes = t.split(' ');
    if (partes.length > 1 && partes.every((p) => [...p].length === 1)) {
        t = partes.join('');
    }
    return t.toLocaleLowerCase('es');
}

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

function silabaParaVoz(texto) {
    const t = texto.trim();
    if (!t) return t;
    return t.charAt(0).toLocaleUpperCase('es') + t.slice(1).toLocaleLowerCase('es');
}

export function hablar(texto, alTerminar) {
    if (!texto) {
        alTerminar?.();
        return;
    }

    const msg = mensajeSlug(texto);
    if (tieneAudio('mensajes', msg)) {
        cancelarVoz();
        reproducirUrl(urlAudio('mensajes', msg), alTerminar);
        return;
    }

    const palabra = slugAudio(texto);
    if (tieneAudio('palabras', palabra)) {
        cancelarVoz();
        reproducirUrl(urlAudio('palabras', palabra), alTerminar);
        return;
    }

    hablarNativo(texto, alTerminar, { rate: 0.85, pitch: 1.1 });
}

export function hablarSilaba(texto, alTerminar) {
    if (!texto) {
        alTerminar?.();
        return;
    }

    const slug = slugAudio(silabaParaVoz(texto));
    if (tieneAudio('silabas', slug)) {
        cancelarVoz();
        reproducirUrl(urlAudio('silabas', slug), alTerminar);
        return;
    }

    hablarNativo(silabaParaVoz(texto), alTerminar, { rate: 0.78, pitch: 1.05 });
}

export function hablarCadena(texto) {
    if (!texto) return;
    const t = textoParaLecturaEspanol(texto);
    if (!t) return;

    const slug = slugAudio(t);
    if (tieneAudio('palabras', slug)) {
        cancelarVoz();
        reproducirUrl(urlAudio('palabras', slug));
        return;
    }

    if ([...t].length === 1) {
        const fonema = fonemaLetra(t);
        if (fonema) hablarNativo(fonema, null, { rate: 0.85, pitch: 1.05 });
        return;
    }

    hablarNativo(t, null, { rate: 0.85, pitch: 1.05 });
}

export function hablarNumero(n, alTerminar) {
    if (n === undefined || n === null || n === '') {
        alTerminar?.();
        return;
    }
    const num = typeof n === 'string' ? parseInt(n, 10) : n;
    if (!Number.isFinite(num)) {
        alTerminar?.();
        return;
    }

    const key = String(num);
    if (tieneAudio('numeros', key)) {
        cancelarVoz();
        reproducirUrl(urlAudio('numeros', key), alTerminar);
        return;
    }

    hablarNativo(numeroATextoEspanol(num), alTerminar, { rate: 0.85, pitch: 1.1 });
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
