import { VOZ, MENSAJE_AUDIO, MSG_CASI } from './config.js';
import { numeroATextoEspanol } from './numeros-es.js';

const synth = window.speechSynthesis;
let vozEspanola = null;
let audioSets = null;
let audioActual = null;
let finCola = null;
let timerReproduccion = null;
let vozDesbloqueada = false;

function habiaReproduccionActiva() {
    return Boolean(audioActual) || Boolean(synth && (synth.speaking || synth.pending));
}

/**
 * En móvil, delays largos tras cancel() rompen speechSynthesis (se pierde el gesto).
 * Cancelamos y seguimos en el mismo frame / rAF corto.
 */
function despuesDeCancelar(fn, habiaActiva) {
    if (timerReproduccion !== null) {
        clearTimeout(timerReproduccion);
        timerReproduccion = null;
    }
    if (!habiaActiva) {
        fn();
        return;
    }
    try {
        synth.cancel();
    } catch {
        // ignore
    }
    // Un frame mantiene mejor el gesto del usuario que timeouts de 120–300 ms.
    requestAnimationFrame(() => {
        try {
            if (synth.paused) synth.resume();
        } catch {
            // ignore
        }
        fn();
    });
}

/** Garantiza que el callback de fin se llame una sola vez (onend, onerror o timeout). */
function conFinSeguro(alTerminar, ms = 5000) {
    if (!alTerminar) return () => {};
    let hecho = false;
    let timerLocal = null;
    const done = () => {
        if (hecho) return;
        hecho = true;
        if (timerLocal !== null) {
            clearTimeout(timerLocal);
            timerLocal = null;
        }
        try {
            alTerminar();
        } catch {
            // ignore
        }
    };
    timerLocal = setTimeout(done, ms);
    return done;
}

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
    if (!synth) return;
    const voces = synth.getVoices();
    if (!voces || voces.length === 0) return;
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

function desbloquearVoz() {
    if (vozDesbloqueada || !synth) return;
    vozDesbloqueada = true;
    try {
        if (synth.paused) synth.resume();
    } catch {
        // ignore
    }
    cargarVoces();
    // Algunos Android/iOS no hablan hasta un speak() dentro de un gesto.
    try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        u.rate = 2;
        u.lang = VOZ.idiomaTTS;
        synth.speak(u);
        synth.cancel();
    } catch {
        // ignore
    }
}

function instalarDesbloqueoVoz() {
    if (!synth) return;
    const unlock = () => {
        desbloquearVoz();
        document.removeEventListener('pointerdown', unlock, true);
        document.removeEventListener('touchstart', unlock, true);
        document.removeEventListener('click', unlock, true);
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('click', unlock, true);
}

if (synth) {
    synth.onvoiceschanged = cargarVoces;
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
    finCola = null;
}

export function cancelarVoz() {
    if (timerReproduccion !== null) {
        clearTimeout(timerReproduccion);
        timerReproduccion = null;
    }
    try {
        synth?.cancel();
    } catch {
        // ignore
    }
    detenerAudio();
}

/**
 * Prepara texto para que el TTS lo lea en español como palabra (no deletreo).
 * Mayúsculas sostenidas y letras separadas por espacios hacen que Chrome/Safari/Sabina deletreen.
 */
function textoParaLecturaEspanol(texto) {
    let t = String(texto).normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!t) return t;
    const partes = t.split(' ');
    // "H O L A" / "h o l a" → "hola" (si no, el TTS dice «hache o ele a»)
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
    hablarTTSCrudo(paraVoz, alTerminar);
}

function hablarTTSCrudo(paraVoz, alTerminar) {
    if (!paraVoz) {
        alTerminar?.();
        return;
    }
    if (!synth) {
        alTerminar?.();
        return;
    }

    desbloquearVoz();
    if (!vozEspanola) cargarVoces();
    try {
        if (synth.paused) synth.resume();
    } catch {
        // ignore
    }

    const fin = conFinSeguro(alTerminar);
    const utterance = new SpeechSynthesisUtterance(paraVoz);
    utterance.lang = VOZ.idiomaTTS;
    if (vozEspanola) {
        utterance.voice = vozEspanola;
        utterance.lang = vozEspanola.lang || VOZ.idiomaTTS;
    }
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    utterance.onend = fin;
    utterance.onerror = fin;
    try {
        synth.speak(utterance);
    } catch {
        fin();
    }
}

function reproducirUrl(url, alTerminar) {
    detenerAudio();
    const audio = new Audio(url);
    audioActual = audio;
    const fin = conFinSeguro(alTerminar);
    const terminar = () => {
        if (audioActual === audio) audioActual = null;
        fin();
    };
    audio.onended = terminar;
    audio.onerror = terminar;
    audio.play().catch(terminar);
}

function mensajeSlug(texto) {
    return MENSAJE_AUDIO[texto] || slugAudio(texto);
}

export function hablar(texto, alTerminar) {
    if (!texto) {
        alTerminar?.();
        return;
    }
    const habiaActiva = habiaReproduccionActiva();
    cancelarVoz();

    despuesDeCancelar(() => {
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
    }, habiaActiva);
}

function silabaParaVoz(texto) {
    const t = texto.trim();
    if (!t) return t;
    // Minúsculas: en varios TTS móviles las mayúsculas suenan mal o fallan.
    return t.toLocaleLowerCase('es');
}

export function hablarSilaba(texto, alTerminar) {
    if (!texto) {
        alTerminar?.();
        return;
    }
    const habiaActiva = habiaReproduccionActiva();
    cancelarVoz();

    despuesDeCancelar(() => {
        const slug = slugAudio(silabaParaVoz(texto));
        if (tieneAudio('silabas', slug)) {
            reproducirUrl(urlAudio('silabas', slug), alTerminar);
            return;
        }

        hablarTTSCrudo(silabaParaVoz(texto), alTerminar);
    }, habiaActiva);
}

/**
 * Lee el texto del teclado como palabra(s) en español.
 * No usa nombres de letra («hache», «ele»…): eso sonaba a deletreo de «Hola».
 */
export function hablarCadena(texto) {
    if (!texto) return;
    const habiaActiva = habiaReproduccionActiva();
    cancelarVoz();

    despuesDeCancelar(() => {
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
    }, habiaActiva);
}

export function hablarNumero(n, alTerminar) {
    if (n === undefined || n === null || n === '') {
        alTerminar?.();
        return;
    }
    const habiaActiva = habiaReproduccionActiva();
    cancelarVoz();

    despuesDeCancelar(() => {
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
    }, habiaActiva);
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
