import { VOZ, MENSAJE_AUDIO, MSG_CASI } from './config.js';
import { numeroATextoEspanol } from './numeros-es.js';

const synth = window.speechSynthesis;
let vozEspanola = null;
let audioSets = null;
let audioActual = null;
/** Chrome/Android: si no hay referencia, el GC mata el utterance y no se oye nada. */
let utteranceActual = null;
let timerHablar = null;
let timerWatchdog = null;
/** Si el synth falla una vez en este dispositivo, preferimos Audio. */
let preferirAudioRed = false;
let audioDesbloqueado = false;

const MAX_CHARS_TTS_RED = 180;
const WATCHDOG_MS = 450;

/** En táctil el speechSynthesis de Chrome/Android falla a menudo: Audio primero. */
function esTactil() {
    try {
        if (window.matchMedia('(pointer: coarse)').matches) return true;
    } catch {
        // ignore
    }
    return Number(navigator.maxTouchPoints || 0) > 0;
}

/**
 * Preferir voces latinas/mexicanas; si no hay, cualquier español local.
 */
function cargarVoces() {
    if (!synth) return;
    const voces = synth.getVoices();
    if (!voces || !voces.length) return;
    const lang = (v) => v.lang.toLowerCase();
    const es = (v) => lang(v).startsWith('es');
    const local = (v) => es(v) && v.localService;
    const latino = (v) =>
        es(v) && (
            /es-mx|es-419|es-us|es-ar|es-co|es-cl|es-pe/.test(lang(v)) ||
            /dalia|paulina|marina|mexican|latino|latam|argentina|colombia/i.test(v.name)
        );
    vozEspanola =
        voces.find((v) => local(v) && latino(v)) ||
        voces.find(latino) ||
        voces.find((v) => local(v) && /sabina|helena|pablo/i.test(v.name)) ||
        voces.find(local) ||
        voces.find(es) ||
        null;
}

if (synth) {
    synth.onvoiceschanged = cargarVoces;
}

function limpiarTimers() {
    if (timerHablar !== null) {
        clearTimeout(timerHablar);
        timerHablar = null;
    }
    if (timerWatchdog !== null) {
        clearTimeout(timerWatchdog);
        timerWatchdog = null;
    }
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

/** Desbloquea HTMLAudioElement tras el primer gesto (necesario en iOS/Android). */
function desbloquearAudio() {
    if (audioDesbloqueado) return;
    audioDesbloqueado = true;
    try {
        const a = new Audio(
            'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
        );
        a.volume = 0.01;
        a.play().then(() => {
            a.pause();
        }).catch(() => {});
    } catch {
        // ignore
    }
}

function instalarDespertarEnGesto() {
    const wake = () => {
        despertarSynth();
        cargarVoces();
        desbloquearAudio();
    };
    document.addEventListener('pointerdown', wake, true);
    document.addEventListener('touchstart', wake, true);
    document.addEventListener('click', wake, true);
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
    limpiarTimers();
    try {
        synth?.cancel();
    } catch {
        // ignore
    }
    utteranceActual = null;
    detenerAudio();
}

/** Proxy same-origin (SW pide a Google sin Referer). */
function urlTtsProxy(texto) {
    const q = encodeURIComponent(String(texto).slice(0, MAX_CHARS_TTS_RED));
    return new URL(`tts?q=${q}`, window.location.href).href;
}

/** Directo a Google: hace falta referrerPolicy=no-referrer o Google responde 404. */
function urlTtsGoogle(texto) {
    const q = encodeURIComponent(String(texto).slice(0, MAX_CHARS_TTS_RED));
    return `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=es-MX&q=${q}`;
}

function reproducirUrl(url, alTerminar) {
    detenerAudio();
    desbloquearAudio();
    const audio = new Audio();
    try {
        audio.referrerPolicy = 'no-referrer';
    } catch {
        // ignore
    }
    audioActual = audio;
    const terminar = () => {
        if (audioActual === audio) audioActual = null;
        alTerminar?.();
    };
    audio.onended = terminar;
    audio.onerror = terminar;
    audio.src = url;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(terminar);
    }
}

/** Prueba varias URLs hasta que una reproduzca (onerror → siguiente). */
function reproducirUrlConFallback(urls, alTerminar) {
    const lista = urls.filter(Boolean);
    if (!lista.length) {
        alTerminar?.();
        return;
    }
    let i = 0;
    const intentar = () => {
        if (i >= lista.length) {
            alTerminar?.();
            return;
        }
        const url = lista[i++];
        detenerAudio();
        desbloquearAudio();
        const audio = new Audio();
        try {
            audio.referrerPolicy = 'no-referrer';
        } catch {
            // ignore
        }
        audioActual = audio;
        let arranco = false;
        const finOk = () => {
            if (audioActual === audio) audioActual = null;
            alTerminar?.();
        };
        audio.onplaying = () => {
            arranco = true;
        };
        audio.onended = finOk;
        audio.onerror = () => {
            if (audioActual === audio) audioActual = null;
            intentar();
        };
        audio.src = url;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                if (!arranco) intentar();
            });
        }
    };
    intentar();
}

function reproducirSecuencia(urls, alTerminar) {
    detenerAudio();
    desbloquearAudio();
    let i = 0;
    const siguiente = () => {
        if (i >= urls.length) {
            audioActual = null;
            alTerminar?.();
            return;
        }
        const audio = new Audio();
        try {
            audio.referrerPolicy = 'no-referrer';
        } catch {
            // ignore
        }
        audioActual = audio;
        audio.onended = siguiente;
        audio.onerror = siguiente;
        audio.src = urls[i++];
        audio.play().catch(siguiente);
    };
    siguiente();
}

function hablarPorAudioRed(texto, alTerminar) {
    if (!texto) {
        alTerminar?.();
        return;
    }
    preferirAudioRed = true;
    try {
        synth?.cancel();
    } catch {
        // ignore
    }
    utteranceActual = null;
    // 1) Google directo sin Referer  2) proxy del SW
    reproducirUrlConFallback([urlTtsGoogle(texto), urlTtsProxy(texto)], alTerminar);
}

/** Suma/resta con MP3 locales encadenados cuando existen. */
export function hablarOperacion(a, tipo, b, alTerminar) {
    const opSlug = tipo === 'menos' ? 'menos' : 'mas';
    const urls = [];
    if (tieneAudio('numeros', String(a))) urls.push(urlAudio('numeros', String(a)));
    if (tieneAudio('palabras', opSlug)) urls.push(urlAudio('palabras', opSlug));
    if (tieneAudio('numeros', String(b))) urls.push(urlAudio('numeros', String(b)));
    if (urls.length === 3) {
        cancelarVoz();
        reproducirSecuencia(urls, alTerminar);
        return;
    }
    const op = tipo === 'menos' ? 'menos' : 'más';
    hablar(`${numeroATextoEspanol(a)} ${op} ${numeroATextoEspanol(b)}`, alTerminar);
}

/**
 * Hablar con speechSynthesis; si no arranca a tiempo, Audio (Google TTS).
 */
function hablarNativo(texto, alTerminar, { rate = 0.85, pitch = 1.1 } = {}) {
    if (!texto) {
        alTerminar?.();
        return;
    }

    // Táctil / synth ya falló: Audio de red (fiable). Escritorio sigue con synth.
    if (preferirAudioRed || !synth || esTactil()) {
        hablarPorAudioRed(texto, alTerminar);
        return;
    }

    if (!vozEspanola) cargarVoces();
    despertarSynth();
    limpiarTimers();
    detenerAudio();

    const habiaActiva = Boolean(synth.speaking || synth.pending);
    if (habiaActiva) {
        try {
            synth.cancel();
        } catch {
            // ignore
        }
    }

    const lanzar = () => {
        timerHablar = null;
        const utterance = new SpeechSynthesisUtterance(String(texto));
        utteranceActual = utterance;
        utterance.lang = VOZ.idiomaTTS || 'es-MX';
        // Solo forzar voice si es local: las de red fallan offline / en varios Android.
        if (vozEspanola && vozEspanola.localService) {
            utterance.voice = vozEspanola;
            utterance.lang = vozEspanola.lang || utterance.lang;
        }
        utterance.rate = rate;
        utterance.pitch = pitch;

        let arranco = false;
        let cerrado = false;
        const marcarCerrado = () => {
            if (cerrado) return false;
            cerrado = true;
            if (timerWatchdog !== null) {
                clearTimeout(timerWatchdog);
                timerWatchdog = null;
            }
            if (utteranceActual === utterance) utteranceActual = null;
            return true;
        };
        const fin = () => {
            if (!marcarCerrado()) return;
            alTerminar?.();
        };
        const fallbackAudio = () => {
            if (!marcarCerrado()) return;
            preferirAudioRed = true;
            try {
                synth.cancel();
            } catch {
                // ignore
            }
            hablarPorAudioRed(texto, alTerminar);
        };

        utterance.onstart = () => {
            arranco = true;
            if (timerWatchdog !== null) {
                clearTimeout(timerWatchdog);
                timerWatchdog = null;
            }
        };
        utterance.onend = fin;
        utterance.onerror = () => {
            // not-allowed / interrupted / synthesis: pasar a Audio si no llegó a oírse.
            if (!arranco) {
                fallbackAudio();
                return;
            }
            fin();
        };

        try {
            synth.speak(utterance);
            try {
                if (synth.paused) synth.resume();
            } catch {
                // ignore
            }
        } catch {
            fallbackAudio();
            return;
        }

        // Si no hay onstart a tiempo, el synth está mudo → Audio.
        timerWatchdog = setTimeout(() => {
            timerWatchdog = null;
            if (arranco || cerrado) return;
            fallbackAudio();
        }, WATCHDOG_MS);
    };

    // Tras cancel(), Android a veces descarta el speak del mismo tick.
    // Sticky activation del gesto sigue vigente unos cientos de ms.
    if (habiaActiva) {
        timerHablar = setTimeout(lanzar, 80);
    } else {
        lanzar();
    }
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
