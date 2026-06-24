import { VOZ, MENSAJE_AUDIO, MSG_CASI } from './config.js';
import { numeroATextoEspanol } from './numeros-es.js';

const synth = window.speechSynthesis;
let vozEspanola = null;
let audioSets = null;
let audioActual = null;
let finCola = null;

const NOMBRES_LETRAS = {
    a: 'a', b: 'be', c: 'ce', d: 'de', e: 'e', f: 'efe', g: 'ge', h: 'hache',
    i: 'i', j: 'jota', k: 'ka', l: 'ele', m: 'eme', n: 'ene', ñ: 'eñe', o: 'o',
    p: 'pe', q: 'cu', r: 'erre', s: 'ese', t: 'te', u: 'u', v: 'uve', w: 'doble uve',
    x: 'equis', y: 'i griega', z: 'zeta', ' ': 'espacio'
};

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

function cargarVoces() {
    const voces = synth.getVoices();
    if (VOZ.preferirLatinoTTS) {
        vozEspanola =
            voces.find((v) => esLatino(v) && v.localService) ||
            voces.find(esLatino) ||
            voces.find((v) => esEspanol(v) && v.localService) ||
            voces.find(esEspanol) ||
            null;
    } else {
        vozEspanola =
            voces.find((v) => esEspanol(v) && v.localService) ||
            voces.find(esEspanol) ||
            null;
    }
}

synth.onvoiceschanged = cargarVoces;

export async function initVoz() {
    cargarVoces();
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
    finCola = null;
}

export function cancelarVoz() {
    synth.cancel();
    detenerAudio();
}

function hablarTTS(texto, alTerminar) {
    if (!texto) return;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = vozEspanola?.lang || VOZ.idiomaTTS;
    if (vozEspanola) utterance.voice = vozEspanola;
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    if (alTerminar) utterance.onend = alTerminar;
    synth.speak(utterance);
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

function reproducirSecuencia(urls, alTerminar) {
    detenerAudio();
    let i = 0;
    const siguiente = () => {
        if (i >= urls.length) {
            audioActual = null;
            alTerminar?.();
            return;
        }
        const audio = new Audio(urls[i++]);
        audioActual = audio;
        audio.onended = siguiente;
        audio.onerror = siguiente;
        audio.play().catch(siguiente);
    };
    siguiente();
}

function mensajeSlug(texto) {
    return MENSAJE_AUDIO[texto] || slugAudio(texto);
}

export function hablar(texto, alTerminar) {
    if (!texto) return;
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

    hablarTTS(texto, alTerminar);
}

function silabaParaVoz(texto) {
    const t = texto.trim();
    if (!t) return t;
    return t.charAt(0).toLocaleUpperCase('es') + t.slice(1).toLocaleLowerCase('es');
}

export function hablarSilaba(texto, alTerminar) {
    if (!texto) return;
    cancelarVoz();

    const slug = slugAudio(silabaParaVoz(texto));
    if (tieneAudio('silabas', slug)) {
        reproducirUrl(urlAudio('silabas', slug), alTerminar);
        return;
    }

    const utterance = new SpeechSynthesisUtterance(silabaParaVoz(texto));
    utterance.lang = vozEspanola?.lang || VOZ.idiomaTTS;
    if (vozEspanola) utterance.voice = vozEspanola;
    utterance.rate = 0.78;
    utterance.pitch = 1.05;
    if (alTerminar) utterance.onend = alTerminar;
    synth.speak(utterance);
}

function normalizarLetra(c) {
    return c.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function cadenaEnEspanol(texto) {
    return texto
        .split('')
        .map((c) => NOMBRES_LETRAS[normalizarLetra(c)] || NOMBRES_LETRAS[c.toLowerCase()])
        .filter(Boolean);
}

export function hablarCadena(texto) {
    if (!texto) return;
    cancelarVoz();

    const nombres = cadenaEnEspanol(texto);
    const slugs = nombres.map((n) => slugAudio(n));
    if (slugs.length && slugs.every((s) => tieneAudio('letras', s))) {
        reproducirSecuencia(slugs.map((s) => urlAudio('letras', s)));
        return;
    }

    hablarTTS(nombres.join(' '));
}

export function hablarNumero(n, alTerminar) {
    if (n === undefined || n === null || n === '') return;
    cancelarVoz();

    const num = typeof n === 'string' ? parseInt(n, 10) : n;
    if (!Number.isFinite(num)) return;

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
