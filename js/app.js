import { PALABRAS } from './data/palabras.js';
import {
    MSG_CASI, MSG_BIEN, MSG_TIEMPO, MSG_CINCO_EJERCICIOS,
    CAMION_TIEMPO_MS, CAMION_CAMBIO_VELOCIDAD, CAMION_BONUS_MAX, CAMION_TIEMPO_MIN_MS,
    FUTBOL_TIMER_INICIAL, FUTBOL_TIMER_MIN, FUTBOL_TIMER_MAX,
    VINCULAR_GRUPOS, VINCULAR_NUMEROS_SIN_PAR, EMOJIS_CONTAR,
    MIN_SILABAS_JUEGO,
    JUEGOS_ALEATORIOS, IDS_SIGUIENTE, AUTO_SIGUIENTE_MS,
    NOMBRES_JUEGO
} from './config.js';
import {
    getNivelJuego, getMaxEnPantalla, getMaxRespuesta, maxDigitosJuego,
    registrarAciertoMat, registrarFalloMat
} from './dificultad-mat.js';
import { numeroATextoEspanol } from './numeros-es.js';
import {
    hablar, hablarSilaba, hablarCadena, hablarNumero, hablarNumeroEscrito,
    hablarOperacion, decirErrorOpcion, cancelarVoz
} from './speech.js';

let ejerciciosCompletados = 0;
let celebracionAbierta = false;

const elCelebracion = document.getElementById('celebracion-cinco');
const elCelebracionEmoji = document.getElementById('celebracion-emoji');
const elCelebracionTexto = document.getElementById('celebracion-texto');

function cerrarCelebracion() {
    celebracionAbierta = false;
    elCelebracion.classList.add('oculto');
    if (haySiguienteVisible()) programarAutoSiguiente();
}

function mostrarCelebracionCinco() {
    cancelarAutoSiguiente();
    cancelarVoz();
    celebracionAbierta = true;
    elCelebracionEmoji.textContent = Math.random() < 0.5 ? '🎂' : '🎈🎈🎈🎈🎈';
    elCelebracionTexto.textContent = MSG_CINCO_EJERCICIOS;
    elCelebracion.classList.remove('oculto');
    sonidoTriunfoCinco();
}

function registrarEjercicioCompletado({ silencio = false } = {}) {
    ejerciciosCompletados++;
    if (ejerciciosCompletados % 5 === 0) {
        setTimeout(mostrarCelebracionCinco, 400);
    } else if (!silencio) {
        sonidoFestejoEjercicio();
    }
}

document.getElementById('btn-celebracion-continuar').addEventListener('click', cerrarCelebracion);

let palabrasMayusculas = localStorage.getItem('palabrasMayus') !== 'min';
let lecturaFacil = localStorage.getItem('lecturaFacil') === '1';
let spoilerImagenes = localStorage.getItem('spoilerImagenes') === '1';
/** Imagen→Palabra: si true, las opciones incluyen palabras parecidas (más difícil). */
let ipPalabrasSimilares = localStorage.getItem('ipPalabrasSimilares') !== '0';
/** Sílabas: fichas de más en el pool (modo difícil). */
let silabasDistractores = localStorage.getItem('silabasDistractores') === '1';
/** Si es false, Teclado solo habla al apretar el botón 🔊. */
let tecladoAutoVoz = localStorage.getItem('tecladoAutoVoz') === '1';

/** Niveles de tamaño de texto: 0 más chico … 4 más grande. Default 2 (= 1×). */
const TEXTO_ESCALAS = [0.8, 0.9, 1, 1.2, 1.4];
const TEXTO_ESCALA_DEFAULT = 2;
let nivelTextoEscala = (() => {
    const n = parseInt(localStorage.getItem('textoEscala') ?? String(TEXTO_ESCALA_DEFAULT), 10);
    return Number.isFinite(n) ? Math.min(TEXTO_ESCALAS.length - 1, Math.max(0, n)) : TEXTO_ESCALA_DEFAULT;
})();

function getTextoEscala() {
    return TEXTO_ESCALAS[nivelTextoEscala] ?? 1;
}

function aplicarTextoEscala() {
    document.body.style.setProperty('--texto-escala', String(getTextoEscala()));
    document.querySelectorAll('[data-tamano-menos]').forEach((btn) => {
        btn.disabled = nivelTextoEscala <= 0;
    });
    document.querySelectorAll('[data-tamano-mas]').forEach((btn) => {
        btn.disabled = nivelTextoEscala >= TEXTO_ESCALAS.length - 1;
    });
    if (typeof ajustarTamanoFuenteTeclado === 'function') {
        requestAnimationFrame(() => ajustarTamanoFuenteTeclado());
    }
    if (typeof ajustarTamanoPalabraCamion === 'function') {
        requestAnimationFrame(() => ajustarTamanoPalabraCamion());
    }
}

function cambiarTextoEscala(delta) {
    const nuevo = Math.min(TEXTO_ESCALAS.length - 1, Math.max(0, nivelTextoEscala + delta));
    if (nuevo === nivelTextoEscala) return;
    nivelTextoEscala = nuevo;
    localStorage.setItem('textoEscala', String(nivelTextoEscala));
    aplicarTextoEscala();
}

const SVG_OJO = '<svg class="icon-ojo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const SVG_OJO_TACHADO = '<svg class="icon-ojo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

function aplicarModoLetras() {
    document.body.classList.toggle('modo-mayusculas', palabrasMayusculas);
    document.body.classList.toggle('modo-minusculas', !palabrasMayusculas);
    document.querySelectorAll('[data-toggle-mayus]').forEach((btn) => {
        btn.textContent = palabrasMayusculas ? 'a' : 'A';
        btn.title = palabrasMayusculas ? 'Cambiar a minúsculas' : 'Cambiar a mayúsculas';
    });
    if (typeof ajustarTamanoFuenteTeclado === 'function') {
        requestAnimationFrame(() => ajustarTamanoFuenteTeclado());
    }
    if (typeof ajustarTamanoPalabraCamion === 'function') {
        requestAnimationFrame(() => ajustarTamanoPalabraCamion());
    }
}

function alternarModoLetras() {
    palabrasMayusculas = !palabrasMayusculas;
    localStorage.setItem('palabrasMayus', palabrasMayusculas ? 'may' : 'min');
    aplicarModoLetras();
}

function aplicarLecturaFacil() {
    document.body.classList.toggle('modo-lectura-facil', lecturaFacil);
    document.querySelectorAll('[data-toggle-lectura]').forEach((btn) => {
        btn.classList.toggle('activo', lecturaFacil);
        btn.setAttribute('aria-pressed', lecturaFacil ? 'true' : 'false');
        btn.title = lecturaFacil ? 'Desactivar lectura fácil' : 'Activar lectura fácil';
    });
    if (typeof ajustarTamanoFuenteTeclado === 'function') {
        requestAnimationFrame(() => ajustarTamanoFuenteTeclado());
    }
}

function alternarLecturaFacil() {
    lecturaFacil = !lecturaFacil;
    localStorage.setItem('lecturaFacil', lecturaFacil ? '1' : '0');
    aplicarLecturaFacil();
}

function actualizarBotonesSpoiler() {
    document.querySelectorAll('[data-toggle-spoiler]').forEach((btn) => {
        btn.classList.toggle('activo', spoilerImagenes);
        btn.setAttribute('aria-pressed', spoilerImagenes ? 'true' : 'false');
        btn.title = spoilerImagenes
            ? 'Mostrar imágenes siempre'
            : 'Ocultar imágenes al leer';
        btn.innerHTML = spoilerImagenes ? SVG_OJO_TACHADO : SVG_OJO;
    });
}

function aplicarSpoilerImagenes() {
    actualizarBotonesSpoiler();
}

function alternarSpoilerImagenes() {
    spoilerImagenes = !spoilerImagenes;
    localStorage.setItem('spoilerImagenes', spoilerImagenes ? '1' : '0');
    actualizarBotonesSpoiler();
    sincronizarSpoilerPI();
}

function aplicarIpPalabrasSimilares() {
    document.querySelectorAll('#btn-ip-similares, #btn-futbol-similares').forEach((btn) => {
        btn.classList.toggle('activo', ipPalabrasSimilares);
        btn.setAttribute('aria-pressed', ipPalabrasSimilares ? 'true' : 'false');
        btn.title = ipPalabrasSimilares
            ? 'Difícil: palabras parecidas — tocá para modo fácil'
            : 'Fácil: palabras distintas — tocá para modo difícil';
    });
}

function alternarIpPalabrasSimilares() {
    ipPalabrasSimilares = !ipPalabrasSimilares;
    localStorage.setItem('ipPalabrasSimilares', ipPalabrasSimilares ? '1' : '0');
    aplicarIpPalabrasSimilares();
    if (!juegoImagenPalabra.classList.contains('oculto') && correctoIP !== null) {
        cargarImagenPalabra();
    }
    if (juegoFutbol && !juegoFutbol.classList.contains('oculto') && correctoFutbol !== null) {
        cargarFutbol();
    }
}

function aplicarSilabasDistractores() {
    const btn = document.getElementById('btn-silabas-distractores');
    if (!btn) return;
    btn.classList.toggle('activo', silabasDistractores);
    btn.setAttribute('aria-pressed', silabasDistractores ? 'true' : 'false');
    btn.title = silabasDistractores
        ? 'Difícil: sílabas de más — tocá para modo fácil'
        : 'Fácil: solo las sílabas de la palabra — tocá para modo difícil';
}

function alternarSilabasDistractores() {
    silabasDistractores = !silabasDistractores;
    localStorage.setItem('silabasDistractores', silabasDistractores ? '1' : '0');
    aplicarSilabasDistractores();
    if (!juegoSilabas.classList.contains('oculto') && palabraActual) {
        cargarPalabra();
    }
}

/**
 * Sílabas confusas: prioriza parecidas (misma inicial / largo) del catálogo.
 * No repite textos que ya usa la palabra.
 */
function elegirSilabasDistractores(palabra, cantidad) {
    const prohibidas = new Set(
        palabra.silabas.map((s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es'))
    );
    const clave = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
    const pool = [];
    const vistos = new Set();
    for (const p of PALABRAS) {
        if (p === palabra) continue;
        for (const s of p.silabas) {
            const k = clave(s);
            if (prohibidas.has(k) || vistos.has(k)) continue;
            vistos.add(k);
            pool.push(s);
        }
    }
    const iniciales = new Set(palabra.silabas.map((s) => clave(s)[0]));
    const largos = palabra.silabas.map((s) => s.length);
    const score = (s) => {
        const k = clave(s);
        let n = 0;
        if (iniciales.has(k[0])) n += 2;
        if (largos.some((l) => Math.abs(l - s.length) <= 1)) n += 1;
        return n;
    };
    pool.sort((a, b) => score(b) - score(a) || Math.random() - 0.5);
    const top = pool.filter((s) => score(s) > 0);
    const fuente = mezclar(top.length >= cantidad ? top : pool);
    return fuente.slice(0, Math.max(0, cantidad));
}

function aplicarTecladoAutoVoz() {
    const btn = document.getElementById('btn-teclado-autovoz');
    if (!btn) return;
    btn.classList.toggle('activo', tecladoAutoVoz);
    btn.setAttribute('aria-pressed', tecladoAutoVoz ? 'true' : 'false');
    btn.title = tecladoAutoVoz
        ? 'Leer al escribir (activado) — tocá para usar solo el botón 🔊'
        : 'Solo con el botón 🔊 — tocá para leer al escribir';
}

function alternarTecladoAutoVoz() {
    tecladoAutoVoz = !tecladoAutoVoz;
    localStorage.setItem('tecladoAutoVoz', tecladoAutoVoz ? '1' : '0');
    aplicarTecladoAutoVoz();
    if (!tecladoAutoVoz) {
        cancelarHablarTecladoProgramado();
        cancelarVoz();
    }
}

document.querySelectorAll('[data-toggle-mayus]').forEach((btn) => {
    btn.addEventListener('click', alternarModoLetras);
});
document.querySelectorAll('[data-toggle-lectura]').forEach((btn) => {
    btn.addEventListener('click', alternarLecturaFacil);
});
document.querySelectorAll('[data-toggle-spoiler]').forEach((btn) => {
    btn.addEventListener('click', alternarSpoilerImagenes);
});
document.getElementById('btn-ip-similares')?.addEventListener('click', alternarIpPalabrasSimilares);
document.getElementById('btn-futbol-similares')?.addEventListener('click', alternarIpPalabrasSimilares);
document.getElementById('btn-silabas-distractores')?.addEventListener('click', alternarSilabasDistractores);
document.querySelectorAll('[data-tamano-menos]').forEach((btn) => {
    btn.addEventListener('click', () => cambiarTextoEscala(-1));
});
document.querySelectorAll('[data-tamano-mas]').forEach((btn) => {
    btn.addEventListener('click', () => cambiarTextoEscala(1));
});
document.getElementById('btn-teclado-autovoz')?.addEventListener('click', alternarTecladoAutoVoz);
aplicarModoLetras();
aplicarLecturaFacil();
aplicarSpoilerImagenes();
aplicarIpPalabrasSimilares();
aplicarSilabasDistractores();
aplicarTecladoAutoVoz();
aplicarTextoEscala();

// --- Audio matemática ---
let audioCtx = null;

function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function reanudarAudioSiHaceFalta(ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
}

const FREQ_PULSACION_NUMERO = [440, 494, 523, 587, 659, 698, 784, 880, 988, 1047];

function sonidoPulsacionNumero(digito) {
    try {
        const ctx = getAudio();
        reanudarAudioSiHaceFalta(ctx);
        const texto = String(digito ?? '');
        // Solo un dígito 0–9 indexa la tabla. Comparar "29" <= "9" es true en JS
        // y parseInt("29") dejaba frequency=NaN: en Suma el toque moría antes de elegir.
        const idx = /^[0-9]$/.test(texto) ? Number(texto) : 5;
        const freq = FREQ_PULSACION_NUMERO[idx] ?? FREQ_PULSACION_NUMERO[5];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime;
        const dur = 0.04;
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t);
        osc.stop(t + dur);
    } catch {
        // El audio nunca debe bloquear la respuesta del juego.
    }
}

function sonidoPulsacionLetra() {
    const ctx = getAudio();
    reanudarAudioSiHaceFalta(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 600;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    const dur = 0.04;
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
}

function sonidoCorrecto() {
    const ctx = getAudio();
    [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
    });
}

function sonidoFestejoEjercicio() {
    const ctx = getAudio();
    [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.11;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
        osc.start(t);
        osc.stop(t + 0.22);
    });
}

function sonidoTriunfoCinco() {
    const ctx = getAudio();
    reanudarAudioSiHaceFalta(ctx);
    const notas = [523, 659, 784, 1047, 1319];
    notas.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.13;
        const dur = i === notas.length - 1 ? 0.5 : 0.22;
        gain.gain.setValueAtTime(0.34, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
        osc.start(t);
        osc.stop(t + dur);
    });
}

function sonidoIncorrecto() {
    const ctx = getAudio();
    reanudarAudioSiHaceFalta(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
}

/** MP3 reales (precache en sw.js); si fallan, se usa el sintetizador. */
const FUTBOL_SFX = {
    gol: 'audio/efectos/gol.mp3',
    error: 'audio/efectos/hinchada-error.mp3'
};
const FUTBOL_SFX_MAX_MS = { gol: 2500, error: 3800 };

let audioFutbolSfx = null;
let futbolSfxPrecargados = false;
/** Buffer de ruido reutilizable para fallback sintético. */
let bufferRuidoFutbol = null;

function precargarSfxFutbol() {
    if (futbolSfxPrecargados) return;
    futbolSfxPrecargados = true;
    Object.values(FUTBOL_SFX).forEach((url) => {
        const a = new Audio();
        a.preload = 'auto';
        a.src = url;
    });
}

function obtenerRuidoFutbol(ctx, segundos) {
    const muestras = Math.max(1, Math.floor(ctx.sampleRate * segundos));
    if (bufferRuidoFutbol && bufferRuidoFutbol.sampleRate === ctx.sampleRate
        && bufferRuidoFutbol.length >= muestras) {
        return bufferRuidoFutbol;
    }
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 3.5), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    bufferRuidoFutbol = buffer;
    return buffer;
}

function reproducirMp3Futbol(url, maxMs, fallback) {
    try {
        if (audioFutbolSfx) {
            audioFutbolSfx.pause();
            audioFutbolSfx.src = '';
            audioFutbolSfx = null;
        }
        const audio = new Audio(url);
        audio.volume = 1;
        audioFutbolSfx = audio;
        let cerrado = false;
        let usoFallback = false;
        const fin = () => {
            if (cerrado) return;
            cerrado = true;
            if (audioFutbolSfx === audio) audioFutbolSfx = null;
        };
        const fallar = () => {
            if (usoFallback || cerrado) return;
            usoFallback = true;
            try { audio.pause(); } catch { /* ignore */ }
            fin();
            fallback?.();
        };
        audio.addEventListener('ended', fin);
        audio.addEventListener('error', fallar);
        // Previews rotos a veces “reproducen” en silencio (~0 s): usar respaldo.
        audio.addEventListener('loadedmetadata', () => {
            if (!(audio.duration > 0.4)) fallar();
        });
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(fallar);
        }
        if (maxMs > 0) {
            setTimeout(() => {
                if (!cerrado && audioFutbolSfx === audio) {
                    try { audio.pause(); } catch { /* ignore */ }
                    fin();
                }
            }, maxMs);
        }
    } catch {
        fallback?.();
    }
}

/** Fallback sintético: golpe + hinchada festejando. */
function sonidoGolFutbolSintetico() {
    const ctx = getAudio();
    reanudarAudioSiHaceFalta(ctx);
    const t = ctx.currentTime;

    const golpe = ctx.createOscillator();
    const golpeGain = ctx.createGain();
    golpe.type = 'sine';
    golpe.frequency.setValueAtTime(160, t);
    golpe.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    golpeGain.gain.setValueAtTime(0.5, t);
    golpeGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
    golpe.connect(golpeGain);
    golpeGain.connect(ctx.destination);
    golpe.start(t);
    golpe.stop(t + 0.18);

    const ruido = ctx.createBufferSource();
    ruido.buffer = obtenerRuidoFutbol(ctx, 2.6);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(350, t);
    bp.frequency.exponentialRampToValueAtTime(1400, t + 0.7);
    bp.frequency.exponentialRampToValueAtTime(1000, t + 1.6);
    bp.frequency.exponentialRampToValueAtTime(700, t + 2.4);
    const crowdGain = ctx.createGain();
    crowdGain.gain.setValueAtTime(0.001, t);
    crowdGain.gain.exponentialRampToValueAtTime(0.28, t + 0.12);
    crowdGain.gain.setValueAtTime(0.26, t + 1.2);
    crowdGain.gain.setValueAtTime(0.18, t + 1.9);
    crowdGain.gain.exponentialRampToValueAtTime(0.01, t + 2.55);
    ruido.connect(bp);
    bp.connect(crowdGain);
    crowdGain.connect(ctx.destination);
    ruido.start(t);
    ruido.stop(t + 2.6);

    [659, 784, 1047, 1319].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const ti = t + 0.12 + i * 0.1;
        gain.gain.setValueAtTime(0.2, ti);
        gain.gain.exponentialRampToValueAtTime(0.01, ti + 0.35);
        osc.start(ti);
        osc.stop(ti + 0.35);
    });
}

/** Fallback sintético: hinchada lamentándose. */
function sonidoHinchadaFutbolSintetico() {
    const ctx = getAudio();
    reanudarAudioSiHaceFalta(ctx);
    const t = ctx.currentTime;

    const ruido = ctx.createBufferSource();
    ruido.buffer = obtenerRuidoFutbol(ctx, 2.5);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(280, t + 1.4);
    bp.frequency.exponentialRampToValueAtTime(180, t + 2.2);
    const crowdGain = ctx.createGain();
    crowdGain.gain.setValueAtTime(0.001, t);
    crowdGain.gain.exponentialRampToValueAtTime(0.24, t + 0.1);
    crowdGain.gain.setValueAtTime(0.2, t + 1.0);
    crowdGain.gain.setValueAtTime(0.14, t + 1.7);
    crowdGain.gain.exponentialRampToValueAtTime(0.01, t + 2.4);
    ruido.connect(bp);
    bp.connect(crowdGain);
    crowdGain.connect(ctx.destination);
    ruido.start(t);
    ruido.stop(t + 2.5);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(90, t + 1.6);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 600;
    osc.connect(filtro);
    filtro.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.12);
    gain.gain.setValueAtTime(0.08, t + 1.1);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.8);
    osc.start(t);
    osc.stop(t + 1.85);
}

function sonidoGolFutbol() {
    reproducirMp3Futbol(FUTBOL_SFX.gol, FUTBOL_SFX_MAX_MS.gol, sonidoGolFutbolSintetico);
}

function sonidoHinchadaFutbol() {
    reproducirMp3Futbol(FUTBOL_SFX.error, FUTBOL_SFX_MAX_MS.error, sonidoHinchadaFutbolSintetico);
}

const elFeedbackToast = document.getElementById('feedback-toast');
const FEEDBACK_MAL_MS = 2200;
let feedbackTimer = null;

/** Aviso flotante global: no forma parte del layout de cada juego. */
function mostrarFeedback(_el, texto, tipo) {
    if (!elFeedbackToast) return;
    if (feedbackTimer !== null) {
        clearTimeout(feedbackTimer);
        feedbackTimer = null;
    }
    elFeedbackToast.textContent = texto;
    elFeedbackToast.classList.remove('oculto', 'ok', 'mal');
    elFeedbackToast.classList.add(tipo);
    // «¡Casi!» se va solo; «¡Muy bien!» dura hasta el siguiente / cambio de ronda.
    if (tipo === 'mal') {
        feedbackTimer = setTimeout(() => {
            feedbackTimer = null;
            ocultarFeedback();
        }, FEEDBACK_MAL_MS);
    }
}

function ocultarFeedback() {
    if (feedbackTimer !== null) {
        clearTimeout(feedbackTimer);
        feedbackTimer = null;
    }
    if (!elFeedbackToast) return;
    elFeedbackToast.textContent = '';
    elFeedbackToast.classList.add('oculto');
    elFeedbackToast.classList.remove('ok', 'mal');
}

/** Toque fiable en táctil: distingue tap de scroll y evita doble disparo. */
function agregarActivacionTactil(el, onActivar) {
    const UMBRAL_TOQUE_PX = 12;
    let inicio = null;
    let ignorarClickHasta = 0;

    const distanciaDesdeInicio = (event) => {
        if (!inicio) return 0;
        return Math.hypot(event.clientX - inicio.x, event.clientY - inicio.y);
    };

    /**
     * En táctil, diferir fuera del pointerup: disable/voz en el mismo gesto
     * tilda Chrome/Android (Elegir no aceptaba la opción correcta).
     * El audio de la app ya no necesita el speak síncrono del gesto.
     */
    const disparar = (event) => {
        const tipo = event?.pointerType || '';
        const esTactil = tipo === 'touch' || tipo === 'pen' || event?.type?.startsWith('touch');
        if (esTactil) {
            setTimeout(() => onActivar(event), 0);
        } else {
            onActivar(event);
        }
    };

    const iniciar = (event) => {
        if (event.pointerType === 'mouse') return;
        inicio = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            movido: false
        };
    };

    const mover = (event) => {
        if (!inicio || event.pointerId !== inicio.id) return;
        if (distanciaDesdeInicio(event) > UMBRAL_TOQUE_PX) inicio.movido = true;
    };

    const cancelar = (event) => {
        if (!inicio || event.pointerId !== inicio.id) return;
        ignorarClickHasta = Date.now() + 450;
        inicio = null;
    };

    const terminar = (event) => {
        if (!inicio || event.pointerId !== inicio.id) return;
        const fueToque = !inicio.movido && distanciaDesdeInicio(event) <= UMBRAL_TOQUE_PX;
        inicio = null;
        ignorarClickHasta = Date.now() + 450;
        if (!fueToque) return;
        event.preventDefault();
        disparar(event);
    };

    if (window.PointerEvent) {
        el.addEventListener('pointerdown', iniciar);
        el.addEventListener('pointermove', mover);
        el.addEventListener('pointercancel', cancelar);
        el.addEventListener('pointerup', terminar);
    } else {
        el.addEventListener('touchstart', (event) => {
            const toque = event.changedTouches[0];
            inicio = toque ? { id: toque.identifier, x: toque.clientX, y: toque.clientY, movido: false } : null;
        }, { passive: true });
        el.addEventListener('touchmove', (event) => {
            if (!inicio) return;
            const toque = Array.from(event.changedTouches).find((t) => t.identifier === inicio.id);
            if (!toque) return;
            if (Math.hypot(toque.clientX - inicio.x, toque.clientY - inicio.y) > UMBRAL_TOQUE_PX) {
                inicio.movido = true;
            }
        }, { passive: true });
        el.addEventListener('touchcancel', () => {
            ignorarClickHasta = Date.now() + 450;
            inicio = null;
        });
        el.addEventListener('touchend', (event) => {
            if (!inicio) return;
            const toque = Array.from(event.changedTouches).find((t) => t.identifier === inicio.id);
            if (!toque) return;
            const fueToque = !inicio.movido
                && Math.hypot(toque.clientX - inicio.x, toque.clientY - inicio.y) <= UMBRAL_TOQUE_PX;
            inicio = null;
            ignorarClickHasta = Date.now() + 450;
            if (!fueToque) return;
            event.preventDefault();
            disparar(event);
        });
    }

    el.addEventListener('click', (event) => {
        if (Date.now() < ignorarClickHasta) {
            event.preventDefault();
            return;
        }
        disparar(event);
    });
}

function enlazarTactil(elOrId, onActivar) {
    const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (el) agregarActivacionTactil(el, onActivar);
}

function numeroAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}



function generarRondaVincular(max) {
    const maxSeguro = Math.max(1, Math.floor(max));
    const disponibles = mezclar(Array.from({ length: maxSeguro }, (_, i) => i + 1));
    const correctos = disponibles.slice(0, Math.min(VINCULAR_GRUPOS, disponibles.length));
    const distractores = disponibles.slice(
        correctos.length,
        correctos.length + VINCULAR_NUMEROS_SIN_PAR
    );
    return {
        cantidades: correctos,
        numeros: mezclar([...correctos, ...distractores])
    };
}



// Entrada numérica compartida (pantalla + teclado físico)
let entradaNumerica = null;

function activarEntradaNumerica(cfg) {
    entradaNumerica = cfg;
}

function desactivarEntradaNumerica() {
    entradaNumerica = null;
}

function digitoEntradaNumerica(d) {
    if (!entradaNumerica || entradaNumerica.bloqueado()) return;
    const max = entradaNumerica.maxDigitos();
    if (entradaNumerica.valor().length >= max) return;
    if (entradaNumerica.valor() === '' && d === '0') return;
    sonidoPulsacionNumero(d);
    entradaNumerica.setValor(entradaNumerica.valor() + d);
    entradaNumerica.actualizarPantalla();
}

function borrarEntradaNumerica() {
    if (!entradaNumerica || entradaNumerica.bloqueado()) return;
    entradaNumerica.setValor(entradaNumerica.valor().slice(0, -1));
    entradaNumerica.actualizarPantalla();
}

function aceptarEntradaNumerica() {
    if (!entradaNumerica || entradaNumerica.bloqueado()) return;
    entradaNumerica.onAceptar();
}

let tecladoMatActivo = null;

function activarTecladoMat(cfg) {
    tecladoMatActivo = cfg;
}

function desactivarTecladoMat() {
    tecladoMatActivo = null;
}


let autoSiguienteTimer = null;

function cancelarAutoSiguiente() {
    if (autoSiguienteTimer !== null) {
        clearTimeout(autoSiguienteTimer);
        autoSiguienteTimer = null;
    }
}

function haySiguienteVisible() {
    return IDS_SIGUIENTE.some((id) => {
        const btn = document.getElementById(id);
        return btn && !btn.classList.contains('oculto');
    });
}

function programarAutoSiguiente() {
    cancelarAutoSiguiente();
    autoSiguienteTimer = setTimeout(() => {
        autoSiguienteTimer = null;
        if (celebracionAbierta) return;
        enterSiguienteEjercicio();
    }, AUTO_SIGUIENTE_MS);
}

function enterSiguienteEjercicio() {
    cancelarAutoSiguiente();
    if (modoAleatorio && haySiguienteVisible()) {
        mostrarEjercicioAleatorio();
        return true;
    }
    for (const id of IDS_SIGUIENTE) {
        const btn = document.getElementById(id);
        if (btn && !btn.classList.contains('oculto')) {
            btn.click();
            return true;
        }
    }
    return false;
}

function montarTecladoNumerico(contenedor, { onDigito, onBorrar, onAceptar, maxDigitos = 2 }) {
    contenedor.innerHTML = '';
    const teclas = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'borrar', '0', 'ok'];
    teclas.forEach((t) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        if (t === 'borrar') {
            btn.className = 'tecla-num borrar';
            btn.textContent = 'BORRAR';
            btn.addEventListener('click', onBorrar);
        } else if (t === 'ok') {
            btn.className = 'tecla-num aceptar';
            btn.textContent = 'ACEPTAR';
            btn.addEventListener('click', onAceptar);
        } else {
            btn.className = 'tecla-num';
            btn.textContent = t;
            btn.addEventListener('click', () => onDigito(t, maxDigitos));
        }
        contenedor.appendChild(btn);
    });
}

function tamanioEmojiPorCantidad(cantidad) {
    if (cantidad <= 6) return 'clamp(1rem, 4.5vh, 2rem)';
    if (cantidad <= 10) return 'clamp(0.85rem, 3.5vh, 1.5rem)';
    if (cantidad <= 15) return 'clamp(0.7rem, 3vh, 1.2rem)';
    return 'clamp(0.55rem, 2.5vh, 1rem)';
}

function tamanioEmojiVincular(cantidad) {
    const movil = window.matchMedia('(max-width: 700px)').matches;
    if (movil) {
        /* Celdas 2×2: emojis un poco más chicos para que el grupo entre entero */
        if (cantidad <= 4) return 'clamp(1rem, 4.2vw, 1.45rem)';
        if (cantidad <= 8) return 'clamp(0.85rem, 3.6vw, 1.2rem)';
        if (cantidad <= 12) return 'clamp(0.72rem, 3.1vw, 1rem)';
        return 'clamp(0.6rem, 2.6vw, 0.85rem)';
    }
    if (cantidad <= 6) return 'clamp(0.95rem, 4vh, 1.7rem)';
    if (cantidad <= 10) return 'clamp(0.8rem, 3.4vh, 1.4rem)';
    if (cantidad <= 15) return 'clamp(0.68rem, 2.8vh, 1.15rem)';
    return 'clamp(0.55rem, 2.4vh, 0.95rem)';
}

function crearObjetoItem(emoji, fontSize) {
    const span = document.createElement('span');
    span.className = 'objeto-item';
    span.style.fontSize = fontSize;
    span.textContent = emoji;
    return span;
}

/**
 * Dibuja emojis; desde 10, agrupa de a 10 (marco) + unidades sueltas.
 * @param {string} [claseAgrupado='objetos-agrupados'] clase al contenedor cuando cantidad >= 10
 */
function renderObjetosAgrupados(contenedor, emoji, cantidad, tamanioFn, claseAgrupado = 'objetos-agrupados') {
    contenedor.classList.remove('objetos-movibles');
    contenedor.style.minHeight = '';
    contenedor.style.minWidth = '';
    contenedor.style.maxWidth = '';
    contenedor.style.width = '';
    contenedor.style.height = '';
    contenedor.innerHTML = '';
    if (claseAgrupado) {
        contenedor.classList.toggle(claseAgrupado, cantidad >= 10);
    }

    if (cantidad <= 0) return;

    if (cantidad < 10) {
        const fz = tamanioFn(cantidad);
        for (let i = 0; i < cantidad; i++) {
            contenedor.appendChild(crearObjetoItem(emoji, fz));
        }
        return;
    }

    const decenasCompletas = Math.floor(cantidad / 10);
    const unidades = cantidad % 10;
    const fzDecena = tamanioFn(10);

    for (let d = 0; d < decenasCompletas; d++) {
        const grupo = document.createElement('span');
        grupo.className = 'objetos-decena marco-diez';
        grupo.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 10; i++) {
            grupo.appendChild(crearObjetoItem(emoji, fzDecena));
        }
        contenedor.appendChild(grupo);
    }

    if (unidades > 0) {
        const grupo = document.createElement('span');
        grupo.className = 'objetos-decena objetos-unidades';
        grupo.setAttribute('aria-hidden', 'true');
        const fzUnidades = tamanioFn(unidades);
        for (let i = 0; i < unidades; i++) {
            grupo.appendChild(crearObjetoItem(emoji, fzUnidades));
        }
        contenedor.appendChild(grupo);
    }
}

/** Piezas que el niño puede mover: bloque de 10 completo, o cada unidad suelta. */
function unidadesArrastreObjetos(container) {
    const units = [];
    [...container.children].forEach((child) => {
        if (child.classList.contains('marco-diez') && !child.classList.contains('objetos-unidades')) {
            units.push(child);
        } else if (child.classList.contains('objetos-unidades')) {
            units.push(...child.querySelectorAll(':scope > .objeto-item'));
        } else if (child.classList.contains('objeto-item')) {
            units.push(child);
        }
    });
    return units;
}

let dragObjetos = null;

function limpiarDragObjetos() {
    if (!dragObjetos) return;
    const { el } = dragObjetos;
    el.classList.remove('objeto-arrastrando');
    el.style.cursor = '';
    dragObjetos = null;
}

function onPointerDownObjeto(event) {
    if (event.button != null && event.button !== 0) return;
    const el = event.currentTarget;
    const container = el.closest('.objetos-movibles');
    if (!container) return;

    event.preventDefault();
    event.stopPropagation();

    const left = parseFloat(el.style.left) || 0;
    const top = parseFloat(el.style.top) || 0;
    dragObjetos = {
        el,
        container,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origLeft: left,
        origTop: top,
        width: el.offsetWidth,
        height: el.offsetHeight,
        moved: false
    };
    el.classList.add('objeto-arrastrando');
    el.style.cursor = 'grabbing';
    try {
        el.setPointerCapture(event.pointerId);
    } catch (_) {
        /* ignore */
    }
}

function onPointerMoveObjeto(event) {
    if (!dragObjetos || event.pointerId !== dragObjetos.pointerId) return;
    const { el, container, startX, startY, origLeft, origTop, width, height } = dragObjetos;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!dragObjetos.moved && (dx * dx + dy * dy) < 9) return;
    dragObjetos.moved = true;
    event.preventDefault();

    const maxL = Math.max(0, container.clientWidth - width);
    const maxT = Math.max(0, container.clientHeight - height);
    const left = Math.min(maxL, Math.max(0, origLeft + dx));
    const top = Math.min(maxT, Math.max(0, origTop + dy));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
}

function onPointerUpObjeto(event) {
    if (!dragObjetos || event.pointerId !== dragObjetos.pointerId) return;
    const { el, pointerId } = dragObjetos;
    el.classList.remove('objeto-arrastrando');
    el.style.cursor = '';
    try {
        el.releasePointerCapture(pointerId);
    } catch (_) {
        /* ignore */
    }
    dragObjetos = null;
}

document.addEventListener('pointermove', onPointerMoveObjeto, true);
document.addEventListener('pointerup', onPointerUpObjeto, true);
document.addEventListener('pointercancel', onPointerUpObjeto, true);

/**
 * Permite mover piezas dentro del recuadro: decenas enteras juntas, unidades una a una.
 * Fija el tamaño del contenedor antes del position:absolute para que no colapse
 * (p. ej. resta-fuera en grid 1fr con min-width:0 → peces fuera del marco verde).
 */
function activarMovimientoObjetos(container) {
    if (!container || !container.children.length) return;

    limpiarDragObjetos();

    const units = unidadesArrastreObjetos(container);
    if (!units.length) return;

    // Fijar ancho al del padre ANTES de medir: si no, min-width:auto ensancha
    // el flex al contenido (p. ej. 10 globos en una fila) y en Suma se salen
    // del recuadro blanco al absolutizar.
    const parent = container.parentElement;
    if (parent) {
        const parentStyle = getComputedStyle(parent);
        const padX = (parseFloat(parentStyle.paddingLeft) || 0)
            + (parseFloat(parentStyle.paddingRight) || 0);
        const availW = Math.max(0, Math.floor(parent.clientWidth - padX));
        if (availW > 0) {
            container.style.minWidth = '0';
            container.style.maxWidth = '100%';
            container.style.width = `${availW}px`;
            void container.offsetWidth;
        }
    }

    const cRect = container.getBoundingClientRect();
    const style = getComputedStyle(container);
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const layouts = units.map((el) => {
        const r = el.getBoundingClientRect();
        return {
            el,
            left: r.left - cRect.left - borderLeft + scrollLeft,
            top: r.top - cRect.top - borderTop + scrollTop,
            width: r.width,
            height: r.height
        };
    });

    // Congelar tamaño del flujo normal; si no, al absolutizar el ancho cae a 0.
    // No superar max-height: en CSS min-height gana a max-height y en Suma las
    // opciones quedaban fuera de pantalla (overflow:hidden) en niveles altos.
    const cssMaxH = parseFloat(style.maxHeight);
    const boxW = Math.ceil(Math.max(cRect.width, container.clientWidth));
    let boxH = Math.ceil(Math.max(cRect.height, container.clientHeight, 72));
    if (Number.isFinite(cssMaxH) && cssMaxH > 0) {
        boxH = Math.min(boxH, Math.ceil(cssMaxH));
    }
    container.style.minWidth = `${boxW}px`;
    container.style.width = `${boxW}px`;
    container.style.maxWidth = '100%';
    container.style.minHeight = `${boxH}px`;
    container.style.height = `${boxH}px`;
    container.classList.add('objetos-movibles');

    layouts.forEach(({ el, left, top, width, height }) => {
        if (el.parentElement !== container) {
            container.appendChild(el);
        }
        el.classList.add('objeto-arrastrable');
        el.style.position = 'absolute';
        const maxL = Math.max(0, boxW - Math.ceil(width));
        const maxT = Math.max(0, boxH - Math.ceil(height));
        el.style.left = `${Math.min(maxL, Math.max(0, left))}px`;
        el.style.top = `${Math.min(maxT, Math.max(0, top))}px`;
        el.style.margin = '0';
        el.style.touchAction = 'none';
        el.style.cursor = 'grab';
        el.style.zIndex = '1';
        if (el.classList.contains('marco-diez')) {
            el.style.width = `${Math.min(width, boxW)}px`;
            el.style.boxSizing = 'border-box';
        }
        el.addEventListener('pointerdown', onPointerDownObjeto);
    });

    container.querySelectorAll(':scope > .objetos-unidades').forEach((grupo) => {
        if (!grupo.querySelector('.objeto-item')) grupo.remove();
    });
}

function renderObjetos(contenedor, emoji, cantidad) {
    renderObjetosAgrupados(
        contenedor, emoji, cantidad, tamanioEmojiPorCantidad, 'objetos-grid--agrupado'
    );
    activarMovimientoObjetos(contenedor);
}

function numerosDistractores(correcto, cantidad, min, max) {
    const inicio = Math.min(min, max);
    const fin = Math.max(min, max);
    const disponibles = Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
    const otros = mezclar(disponibles.filter((n) => n !== correcto));
    return mezclar([correcto, ...otros.slice(0, Math.max(0, cantidad - 1))]);
}

function tamanioEmojiSuma(cantidad) {
    if (cantidad <= 5) return 'clamp(0.95rem, 4.5vw, 1.5rem)';
    if (cantidad <= 10) return 'clamp(0.8rem, 3.8vw, 1.25rem)';
    if (cantidad <= 15) return 'clamp(0.68rem, 3.2vw, 1.05rem)';
    return 'clamp(0.55rem, 2.6vw, 0.9rem)';
}

function generarRondaSuma(juegoId = 'sumar-escribir') {
    const max = getNivelJuego(juegoId).max;
    const a = numeroAleatorio(1, max);
    const b = numeroAleatorio(1, max);
    const emojis = mezclar([...EMOJIS_CONTAR]).slice(0, 2);
    return {
        a,
        b,
        suma: a + b,
        emojiA: emojis[0],
        emojiB: emojis[1]
    };
}

function renderObjetosEn(contenedor, emoji, cantidad, tamanioFn) {
    renderObjetosAgrupados(contenedor, emoji, cantidad, tamanioFn);
}

function montarPanelSuma(ronda, elObjA, elCantA, elObjB, elCantB) {
    renderObjetosEn(elObjA, ronda.emojiA, ronda.a, tamanioEmojiSuma);
    renderObjetosEn(elObjB, ronda.emojiB, ronda.b, tamanioEmojiSuma);
    activarMovimientoObjetos(elObjA);
    activarMovimientoObjetos(elObjB);
    elCantA.textContent = ronda.a;
    elCantB.textContent = ronda.b;
}

function hablarSuma(a, b) {
    hablarOperacion(a, 'mas', b);
}

function tamanioEmojiResta(cantidad) {
    if (cantidad <= 6) return 'clamp(1rem, 4.5vw, 1.6rem)';
    if (cantidad <= 12) return 'clamp(0.85rem, 3.8vw, 1.3rem)';
    if (cantidad <= 20) return 'clamp(0.72rem, 3.2vw, 1.1rem)';
    return 'clamp(0.58rem, 2.6vw, 0.9rem)';
}

function generarRondaResta(juegoId = 'restar-escribir') {
    const maxTotal = Math.max(2, getMaxEnPantalla(juegoId));
    const minTotal = Math.min(4, maxTotal);
    const total = numeroAleatorio(minTotal, maxTotal);
    const resta = numeroAleatorio(1, total - 1);
    const emoji = EMOJIS_CONTAR[numeroAleatorio(0, EMOJIS_CONTAR.length - 1)];
    return {
        total,
        resta,
        resultado: total - resta,
        emoji
    };
}

function montarPanelResta(ronda, elVisual) {
    const { total, resta, emoji } = ronda;
    const fuera = total - resta;

    elVisual.innerHTML = '';
    elVisual.className = 'resta-visual-interna';

    const elFuera = document.createElement('div');
    elFuera.className = 'resta-fuera';
    renderObjetosAgrupados(elFuera, emoji, fuera, tamanioEmojiResta);

    const elMarco = document.createElement('div');
    elMarco.className = 'resta-marco-menos';
    elMarco.setAttribute('aria-label', `${resta} para restar`);
    renderObjetosAgrupados(elMarco, emoji, resta, tamanioEmojiResta);

    elVisual.appendChild(elFuera);
    elVisual.appendChild(elMarco);
    activarMovimientoObjetos(elFuera);
    activarMovimientoObjetos(elMarco);
}

function hablarResta(total, resta) {
    hablarOperacion(total, 'menos', resta);
}

// --- Navegación ---
const menu = document.getElementById('menu');
const juegoTeclado = document.getElementById('juego-teclado');
const juegoSilabas = document.getElementById('juego-silabas');
const juegoPalabraImagen = document.getElementById('juego-palabra-imagen');
const juegoImagenPalabra = document.getElementById('juego-imagen-palabra');
const juegoExplorar = document.getElementById('juego-explorar');
const juegoCamion = document.getElementById('juego-camion');
const juegoFutbol = document.getElementById('juego-futbol');
const juegoContar = document.getElementById('juego-contar');
const juegoVincular = document.getElementById('juego-vincular');
const juegoEscribirNumero = document.getElementById('juego-escribir-numero');
const juegoElegirNumero = document.getElementById('juego-elegir-numero');
const juegoSumarEscribir = document.getElementById('juego-sumar-escribir');
const juegoSumarElegir = document.getElementById('juego-sumar-elegir');
const juegoRestarEscribir = document.getElementById('juego-restar-escribir');

const seccionesJuego = [
    juegoTeclado, juegoSilabas, juegoPalabraImagen, juegoImagenPalabra, juegoExplorar, juegoCamion,
    juegoFutbol,
    juegoContar, juegoVincular, juegoEscribirNumero, juegoElegirNumero,
    juegoSumarEscribir, juegoSumarElegir, juegoRestarEscribir
];

const RUTAS_JUEGO = new Set([
    'teclado', 'silabas', 'palabra-imagen', 'imagen-palabra', 'explorar', 'camion', 'futbol',
    'contar', 'vincular', 'escribir-numero', 'elegir-numero',
    'sumar-escribir', 'sumar-elegir', 'restar-escribir', 'aleatorio'
]);

let modoAleatorio = false;
let rutaActual = undefined;
/** Entradas de juego apiladas en esta sesión (para no salir del sitio con history.back). */
let pilaJuegos = 0;

function leerRutaDesdeHash() {
    const raw = location.hash.replace(/^#\/?/, '').split(/[?#]/)[0].trim();
    if (!raw) return null;
    return RUTAS_JUEGO.has(raw) ? raw : null;
}

function urlParaRuta(id) {
    const base = `${location.pathname}${location.search}`;
    return id ? `${base}#/${id}` : `${base}#/`;
}

function avanzarDespuesDeAcierto(continuarEnJuego) {
    cancelarAutoSiguiente();
    if (modoAleatorio) {
        mostrarEjercicioAleatorio();
        return;
    }
    continuarEnJuego();
}

/** Pone el nombre del juego al lado de «Volver». */
function actualizarNombreJuego(id) {
    const nombre = NOMBRES_JUEGO[id];
    if (!nombre) return;
    const section = document.getElementById(`juego-${id}`);
    if (!section) return;
    const btn = section.querySelector('[data-volver]');
    if (!btn) return;

    let top = btn.closest('.juego-top');
    if (!top) {
        top = document.createElement('div');
        top.className = 'juego-top';
        btn.parentElement.insertBefore(top, btn);
        top.appendChild(btn);
        const span = document.createElement('span');
        span.className = 'juego-nombre';
        top.appendChild(span);
    }
    const span = top.querySelector('.juego-nombre');
    if (span) span.textContent = nombre;
}

function mostrarJuego(id) {
    if (id !== 'aleatorio') modoAleatorio = false;
    cancelarAutoSiguiente();
    ocultarFeedback();
    detenerCamion();
    detenerFutbol();
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    menu.classList.add('oculto');
    seccionesJuego.forEach((s) => s.classList.add('oculto'));
    actualizarNombreJuego(id);
    if (id === 'teclado') {
        juegoTeclado.classList.remove('oculto');
        longitudTecladoAnterior = textoActual.length;
        requestAnimationFrame(() => {
            ajustarTamanoFuenteTeclado();
            pantalla.focus();
        });
    }
    if (id === 'silabas') {
        juegoSilabas.classList.remove('oculto');
        iniciarSilabas();
    }
    if (id === 'palabra-imagen') {
        juegoPalabraImagen.classList.remove('oculto');
        iniciarPalabraImagen();
    }
    if (id === 'imagen-palabra') {
        juegoImagenPalabra.classList.remove('oculto');
        iniciarImagenPalabra();
    }
    if (id === 'explorar') {
        juegoExplorar.classList.remove('oculto');
        iniciarExplorar();
    }
    if (id === 'camion') {
        juegoCamion.classList.remove('oculto');
        iniciarCamion();
    }
    if (id === 'futbol') {
        juegoFutbol.classList.remove('oculto');
        iniciarFutbol();
    }
    if (id === 'contar') {
        juegoContar.classList.remove('oculto');
        iniciarContar();
    }
    if (id === 'vincular') {
        juegoVincular.classList.remove('oculto');
        iniciarVincular();
    }
    if (id === 'escribir-numero') {
        juegoEscribirNumero.classList.remove('oculto');
        iniciarEscribirNumero();
    }
    if (id === 'elegir-numero') {
        juegoElegirNumero.classList.remove('oculto');
        iniciarElegirNumero();
    }
    if (id === 'sumar-escribir') {
        juegoSumarEscribir.classList.remove('oculto');
        iniciarSumarEscribir();
    }
    if (id === 'sumar-elegir') {
        juegoSumarElegir.classList.remove('oculto');
        iniciarSumarElegir();
    }
    if (id === 'restar-escribir') {
        juegoRestarEscribir.classList.remove('oculto');
        iniciarRestarEscribir();
    }
}

function mostrarMenuUI() {
    cancelarAutoSiguiente();
    detenerCamion();
    detenerFutbol();
    modoAleatorio = false;
    cancelarHablarTecladoProgramado();
    cancelarVoz();
    cerrarCelebracion();
    ocultarFeedback();
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    menu.classList.remove('oculto');
    seccionesJuego.forEach((s) => s.classList.add('oculto'));
    textoActual = '';
    pantalla.value = '';
    longitudTecladoAnterior = 0;
    pantalla.style.fontSize = '';
    pantalla.style.height = '';
    pantalla.blur();
}

function aplicarRuta(id) {
    if (rutaActual === id) return;
    rutaActual = id;

    if (!id) {
        mostrarMenuUI();
        return;
    }
    if (id === 'aleatorio') {
        modoAleatorio = true;
        mostrarEjercicioAleatorio();
        return;
    }
    mostrarJuego(id);
}

function irAJuego(id) {
    if (!RUTAS_JUEGO.has(id)) return;
    if (leerRutaDesdeHash() === id && rutaActual === id) return;
    history.pushState({ app: 'juegos', juego: id }, '', urlParaRuta(id));
    pilaJuegos++;
    aplicarRuta(id);
}

function volverMenu() {
    if (!rutaActual && !leerRutaDesdeHash()) {
        mostrarMenuUI();
        return;
    }
    if (pilaJuegos > 0) {
        history.back();
        return;
    }
    history.replaceState({ app: 'juegos', juego: null }, '', urlParaRuta(null));
    aplicarRuta(null);
}

function sincronizarRutaDesdeHistorial(state) {
    let id = null;
    if (state && state.app === 'juegos') {
        id = state.juego || null;
    } else {
        id = leerRutaDesdeHash();
    }
    if (id && !RUTAS_JUEGO.has(id)) id = null;
    pilaJuegos = id ? 1 : 0;
    aplicarRuta(id);
}

window.addEventListener('popstate', (event) => {
    sincronizarRutaDesdeHistorial(event.state);
});

document.querySelectorAll('[data-juego]').forEach((btn) => {
    btn.addEventListener('click', () => {
        irAJuego(btn.dataset.juego);
    });
});
document.querySelectorAll('[data-volver]').forEach((btn) => {
    btn.addEventListener('click', volverMenu);
});

// --- Juego teclado ---
const pantalla = document.getElementById('pantalla');
const pantallaCaja = pantalla?.closest('.pantalla-teclado-caja');
let textoActual = '';
let longitudTecladoAnterior = 0;
let tecladoHablarTimer = null;
const TECLADO_FS_MIN = 18;

function filtrarTextoTeclado(texto) {
    return texto.replace(/[^a-zñáéíóúüA-ZÑÁÉÍÓÚÜ ]/g, '');
}

function fuenteMaximaTeclado() {
    const caja = pantallaCaja || pantalla;
    const h = caja.clientHeight || 200;
    const w = caja.clientWidth || 300;
    const escala = typeof getTextoEscala === 'function' ? getTextoEscala() : 1;
    const base = Math.min(h * 0.55, w * 0.28) * escala;
    return Math.max(TECLADO_FS_MIN, Math.min(Math.round(140 * escala), Math.floor(base)));
}

/** Sondeo oculto: mide el ancho real de una palabra con la tipografía actual. */
let tecladoProbe = null;
function asegurarProbeTeclado() {
    if (tecladoProbe) return tecladoProbe;
    tecladoProbe = document.createElement('span');
    tecladoProbe.setAttribute('aria-hidden', 'true');
    tecladoProbe.style.cssText = [
        'position:absolute',
        'visibility:hidden',
        'left:-9999px',
        'top:0',
        'white-space:nowrap',
        'pointer-events:none'
    ].join(';');
    document.body.appendChild(tecladoProbe);
    return tecladoProbe;
}

function medirAnchoTextoTeclado(texto, fontSizePx) {
    const probe = asegurarProbeTeclado();
    const cs = getComputedStyle(pantalla);
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.fontSize = `${fontSizePx}px`;
    probe.style.letterSpacing = cs.letterSpacing;
    probe.style.wordSpacing = cs.wordSpacing;
    probe.style.textTransform = cs.textTransform;
    probe.textContent = texto || 'M';
    return probe.getBoundingClientRect().width;
}

/** Achica la fuente para que cada palabra entre entera en el ancho; varias palabras pueden pasar de línea. */
function ajustarTamanoFuenteTeclado() {
    if (!pantalla || !pantallaCaja) return;
    if (juegoTeclado.classList.contains('oculto')) return;

    const availH = Math.max(1, pantallaCaja.clientHeight - 8);
    const availW = Math.max(1, pantallaCaja.clientWidth - 8);
    const maxFs = fuenteMaximaTeclado();
    const palabras = textoActual.trim().split(/\s+/).filter(Boolean);
    const unaLinea = palabras.length <= 1;

    pantalla.style.whiteSpace = unaLinea ? 'nowrap' : 'pre-wrap';
    pantalla.style.overflowWrap = 'normal';
    pantalla.style.wordBreak = 'keep-all';

    if (!textoActual) {
        pantalla.style.fontSize = `${maxFs}px`;
        pantalla.style.height = 'auto';
        return;
    }

    const textoMedir = unaLinea
        ? (textoActual || 'M')
        : palabras.reduce((a, b) => (a.length >= b.length ? a : b), 'M');

    let lo = TECLADO_FS_MIN;
    let hi = maxFs;
    let best = TECLADO_FS_MIN;
    while (lo <= hi) {
        const mid = (lo + hi + 1) >> 1;
        pantalla.style.fontSize = `${mid}px`;
        pantalla.style.height = 'auto';
        void pantalla.offsetHeight;

        const anchoPalabra = medirAnchoTextoTeclado(textoMedir, mid);
        const cabeAncho = anchoPalabra <= availW + 1;
        const cabeAlto = unaLinea
            ? true
            : pantalla.scrollHeight <= availH + 2;

        if (cabeAncho && cabeAlto) {
            best = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    pantalla.style.fontSize = `${best}px`;
    pantalla.style.height = 'auto';
}

/** Lee la palabra formada. En móvil habla al toque (sin delay: si no, Android bloquea el TTS). */
function programarHablarTeclado() {
    if (!tecladoAutoVoz) return;
    if (tecladoHablarTimer !== null) clearTimeout(tecladoHablarTimer);
    const movil = (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
    if (movil) {
        if (textoActual) hablarCadena(textoActual);
        return;
    }
    tecladoHablarTimer = setTimeout(() => {
        tecladoHablarTimer = null;
        if (textoActual) hablarCadena(textoActual);
    }, 320);
}

function cancelarHablarTecladoProgramado() {
    if (tecladoHablarTimer !== null) {
        clearTimeout(tecladoHablarTimer);
        tecladoHablarTimer = null;
    }
}

function actualizarTecladoDesdeInput() {
    const filtrado = filtrarTextoTeclado(pantalla.value);
    if (filtrado.length > longitudTecladoAnterior) {
        sonidoPulsacionLetra();
    }
    longitudTecladoAnterior = filtrado.length;
    if (filtrado !== pantalla.value) pantalla.value = filtrado;
    textoActual = filtrado;
    ajustarTamanoFuenteTeclado();
    if (textoActual) programarHablarTeclado();
    else {
        cancelarHablarTecladoProgramado();
        if (tecladoAutoVoz) cancelarVoz();
    }
}

enlazarTactil('btn-repetir', () => {
    cancelarHablarTecladoProgramado();
    hablarCadena(textoActual);
});
document.getElementById('btn-borrar').addEventListener('click', () => {
    cancelarHablarTecladoProgramado();
    textoActual = '';
    pantalla.value = '';
    longitudTecladoAnterior = 0;
    cancelarVoz();
    ajustarTamanoFuenteTeclado();
    pantalla.focus();
});

pantalla.addEventListener('input', actualizarTecladoDesdeInput);
pantalla.addEventListener('click', () => pantalla.focus());
pantalla.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.preventDefault();
});

window.addEventListener('resize', () => {
    if (!juegoTeclado.classList.contains('oculto')) ajustarTamanoFuenteTeclado();
    if (typeof ajustarTamanoPalabraCamion === 'function') ajustarTamanoPalabraCamion();
});

document.addEventListener('keydown', (event) => {
    const tecla = event.key;

    if (!juegoTeclado.classList.contains('oculto') && document.activeElement !== pantalla) {
        if (tecla.length === 1 && tecla.match(/[a-zñáéíóúüA-ZÑÁÉÍÓÚÜ ]/i)) {
            sonidoPulsacionLetra();
            textoActual += tecla;
            pantalla.value = textoActual;
            longitudTecladoAnterior = textoActual.length;
            ajustarTamanoFuenteTeclado();
            programarHablarTeclado();
            event.preventDefault();
        } else if (tecla === 'Backspace') {
            textoActual = textoActual.slice(0, -1);
            pantalla.value = textoActual;
            longitudTecladoAnterior = textoActual.length;
            ajustarTamanoFuenteTeclado();
            if (textoActual !== '') programarHablarTeclado();
            else {
                cancelarHablarTecladoProgramado();
                cancelarVoz();
            }
            event.preventDefault();
        }
        return;
    }

    if (!juegoTeclado.classList.contains('oculto')) return;

    if (tecla === 'Enter') {
        if (celebracionAbierta) {
            event.preventDefault();
            cerrarCelebracion();
            return;
        }
        if (enterSiguienteEjercicio()) {
            event.preventDefault();
            return;
        }
    }

    if (entradaNumerica) {
        if (/^[0-9]$/.test(tecla)) {
            event.preventDefault();
            digitoEntradaNumerica(tecla);
        } else if (tecla === 'Backspace') {
            event.preventDefault();
            borrarEntradaNumerica();
        } else if (tecla === 'Enter') {
            event.preventDefault();
            aceptarEntradaNumerica();
        }
        return;
    }

    if (tecladoMatActivo) {
        if (/^[0-9]$/.test(tecla) && tecladoMatActivo.onDigitoVincular) {
            event.preventDefault();
            tecladoMatActivo.onDigitoVincular(tecla);
        } else if (tecla === 'Backspace' && tecladoMatActivo.onBorrarVincular) {
            event.preventDefault();
            tecladoMatActivo.onBorrarVincular();
        } else if (tecla === 'Enter' && tecladoMatActivo.onEnterVincular) {
            event.preventDefault();
            tecladoMatActivo.onEnterVincular();
        }
    }
});

// --- Juego sílabas ---

function indicesPalabrasSilabas() {
    return PALABRAS
        .map((_, i) => i)
        .filter((i) => PALABRAS[i].silabas.length >= MIN_SILABAS_JUEGO);
}

function armarColaSilabas() {
    const elegibles = indicesPalabrasSilabas();
    const largas = elegibles.filter((i) => PALABRAS[i].silabas.length >= 3);
    const cortas = elegibles.filter((i) => PALABRAS[i].silabas.length === 2);
    return [...mezclar(largas), ...mezclar(cortas)];
}

function mezclar(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function renderImagenEn(el, item) {
    if (item.svg) {
        el.innerHTML = item.svg;
    } else {
        el.textContent = item.emoji;
    }
}

function indicesOpciones(correctoIdx, cantidad = 3) {
    const indices = [correctoIdx];
    while (indices.length < cantidad) {
        const r = Math.floor(Math.random() * PALABRAS.length);
        if (!indices.includes(r)) indices.push(r);
    }
    return mezclar(indices);
}

/** Opciones de texto para Imagen→Palabra: correcta + similares o palabras al azar. */
function opcionesImagenPalabra(correctoIdx, cantidad = 3) {
    const correcto = PALABRAS[correctoIdx];
    const usadas = new Set([correcto.palabra.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()]);
    const opciones = [{ palabra: correcto.palabra, correcta: true }];

    if (ipPalabrasSimilares) {
        for (const s of correcto.similares || []) {
            if (opciones.length >= cantidad) break;
            const key = s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
            if (usadas.has(key)) continue;
            usadas.add(key);
            opciones.push({ palabra: s, correcta: false });
        }
    }

    while (opciones.length < cantidad) {
        const r = Math.floor(Math.random() * PALABRAS.length);
        if (r === correctoIdx) continue;
        const p = PALABRAS[r].palabra;
        const key = p.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
        if (usadas.has(key)) continue;
        usadas.add(key);
        opciones.push({ palabra: p, correcta: false });
    }

    return mezclar(opciones);
}

let colaPalabras = [];
let indiceActual = 0;
let palabraActual = null;
let fichas = [];
let slots = [];
let bloqueado = false;
/** Drag & drop de sílabas (pointer): null | estado de arrastre */
let dragSilabas = null;

const elImagen = document.getElementById('silabas-imagen');
const elZonas = document.getElementById('zonas-respuesta');
const elPool = document.getElementById('pool-silabas');
const elMensaje = document.getElementById('mensaje-silabas');
const elContador = document.getElementById('silabas-contador');
const btnSiguiente = document.getElementById('btn-siguiente');
const UMBRAL_DRAG_SILABA_PX = 6;

function iniciarSilabas() {
    limpiarDragSilabas();
    colaPalabras = armarColaSilabas();
    indiceActual = 0;
    cargarPalabra();
}

function cargarPalabra() {
    limpiarDragSilabas();
    bloqueado = false;
    btnSiguiente.classList.add('oculto');
    ocultarFeedback();
    elImagen.classList.remove('acierto', 'error');

    palabraActual = PALABRAS[colaPalabras[indiceActual]];
    elContador.textContent = `Palabra ${indiceActual + 1} de ${colaPalabras.length}`;
    renderImagenEn(elImagen, palabraActual);

    fichas = palabraActual.silabas.map((texto, id) => ({ id, texto, usada: false }));
    if (silabasDistractores) {
        const nExtra = Math.min(4, Math.max(2, palabraActual.silabas.length));
        const extras = elegirSilabasDistractores(palabraActual, nExtra);
        const baseId = fichas.length;
        extras.forEach((texto, i) => {
            fichas.push({ id: baseId + i, texto, usada: false, distractor: true });
        });
    }
    fichas = mezclar(fichas);
    slots = new Array(palabraActual.silabas.length).fill(null);

    renderSilabas();
}

function limpiarDragSilabas() {
    if (!dragSilabas) return;
    dragSilabas.ghost?.remove();
    document.querySelectorAll('.slot-silaba.drag-over, .ficha-silaba.arrastrando, .slot-silaba.arrastrando')
        .forEach((el) => el.classList.remove('drag-over', 'arrastrando'));
    document.body.classList.remove('silabas-dragging');
    const capa = document.getElementById('silabas-drag-layer');
    if (capa && capa.childElementCount === 0) capa.remove();
    dragSilabas = null;
}

function capaDragSilabas() {
    let capa = document.getElementById('silabas-drag-layer');
    if (!capa) {
        capa = document.createElement('div');
        capa.id = 'silabas-drag-layer';
        capa.className = 'silabas-drag-layer';
        capa.setAttribute('aria-hidden', 'true');
        document.documentElement.appendChild(capa);
    }
    return capa;
}

function crearGhostSilaba(origenEl, texto) {
    const rect = origenEl.getBoundingClientRect();
    const cs = window.getComputedStyle(origenEl);
    const ghost = document.createElement('div');
    ghost.className = 'ficha-silaba-ghost';
    ghost.textContent = texto;
    // Estilos inline + capa en <html>: visibles aunque body tenga overflow:hidden
    ghost.style.cssText = [
        'position:fixed',
        `left:${rect.left}px`,
        `top:${rect.top}px`,
        `width:${Math.max(rect.width, 52)}px`,
        `height:${Math.max(rect.height, 44)}px`,
        'margin:0',
        'box-sizing:border-box',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'border:none',
        'border-radius:14px',
        'background:#ffeb3b',
        'box-shadow:0 12px 24px rgba(2,119,189,0.35), 0 6px 0 #fbc02d',
        'color:#5d4037',
        'font-weight:800',
        `font-size:${cs.fontSize || '1.2rem'}`,
        `font-family:${cs.fontFamily || 'inherit'}`,
        `letter-spacing:${cs.letterSpacing || 'normal'}`,
        `text-transform:${cs.textTransform || 'none'}`,
        'z-index:2147483647',
        'pointer-events:none',
        'opacity:1',
        'transform:scale(1.08)',
        'will-change:left,top,transform'
    ].join(';');
    capaDragSilabas().appendChild(ghost);
    return ghost;
}

function moverGhostSilaba(ghost, clientX, clientY, offsetX, offsetY) {
    if (!ghost) return;
    ghost.style.left = `${clientX - offsetX}px`;
    ghost.style.top = `${clientY - offsetY}px`;
}

function slotBajoPunto(x, y) {
    const nodos = document.elementsFromPoint(x, y);
    for (const n of nodos) {
        const slot = n.closest?.('.slot-silaba');
        if (slot && elZonas.contains(slot)) return slot;
    }
    return null;
}

function estaSobrePool(x, y) {
    if (!elPool) return false;
    const r = elPool.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function textoFicha(fichaId) {
    return fichas.find((f) => f.id === fichaId)?.texto || '';
}

function enlazarDragSilaba(el, { fichaId, origen, slotIdx = null }) {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (event) => {
        if (bloqueado) return;
        if (event.button != null && event.button !== 0) return;
        if (origen === 'pool') {
            const ficha = fichas.find((f) => f.id === fichaId);
            if (!ficha || ficha.usada) return;
        }
        if (origen === 'slot' && slots[slotIdx] === null) return;

        event.preventDefault();
        const rect = el.getBoundingClientRect();
        dragSilabas = {
            fichaId,
            origen,
            slotIdx,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            moved: false,
            ghost: null,
            pointerId: event.pointerId,
            origenEl: el
        };
        try {
            el.setPointerCapture(event.pointerId);
        } catch {
            // ignore
        }
    });
}

function onPointerMoveSilabas(event) {
    if (!dragSilabas || event.pointerId !== dragSilabas.pointerId) return;
    // En algunos móviles clientX viene en 0: usar coords del toque
    const x = event.clientX || event.touches?.[0]?.clientX || dragSilabas.startX;
    const y = event.clientY || event.touches?.[0]?.clientY || dragSilabas.startY;
    const dx = x - dragSilabas.startX;
    const dy = y - dragSilabas.startY;
    if (!dragSilabas.moved && Math.hypot(dx, dy) < UMBRAL_DRAG_SILABA_PX) return;

    if (!dragSilabas.moved) {
        dragSilabas.moved = true;
        document.body.classList.add('silabas-dragging');
        dragSilabas.origenEl.classList.add('arrastrando');
        dragSilabas.ghost = crearGhostSilaba(
            dragSilabas.origenEl,
            textoFicha(dragSilabas.fichaId)
        );
    }

    moverGhostSilaba(dragSilabas.ghost, x, y, dragSilabas.offsetX, dragSilabas.offsetY);

    document.querySelectorAll('.slot-silaba.drag-over').forEach((s) => s.classList.remove('drag-over'));
    const slot = slotBajoPunto(x, y);
    if (slot) slot.classList.add('drag-over');
}

function onPointerUpSilabas(event) {
    if (!dragSilabas || event.pointerId !== dragSilabas.pointerId) return;
    const estado = dragSilabas;
    const { fichaId, origen, slotIdx, moved } = estado;
    const x = event.clientX || event.changedTouches?.[0]?.clientX || estado.startX;
    const y = event.clientY || event.changedTouches?.[0]?.clientY || estado.startY;

    estado.ghost?.remove();
    const capa = document.getElementById('silabas-drag-layer');
    if (capa && capa.childElementCount === 0) capa.remove();
    document.querySelectorAll('.slot-silaba.drag-over, .ficha-silaba.arrastrando, .slot-silaba.arrastrando')
        .forEach((el) => el.classList.remove('drag-over', 'arrastrando'));
    document.body.classList.remove('silabas-dragging');
    dragSilabas = null;

    if (!moved) {
        if (origen === 'pool') ponerEnSlot(fichaId);
        else quitarDeSlot(slotIdx);
        return;
    }

    const slotEl = slotBajoPunto(x, y);
    if (slotEl) {
        const targetIdx = Number(slotEl.dataset.slotIdx);
        if (Number.isFinite(targetIdx)) {
            soltarEnSlot(fichaId, targetIdx, origen, slotIdx);
            return;
        }
    }

    if (origen === 'slot' && estaSobrePool(x, y)) {
        quitarDeSlot(slotIdx);
        return;
    }

    renderSilabas();
}

// capture:true — con setPointerCapture algunos móviles no burbujean bien a document
document.addEventListener('pointermove', onPointerMoveSilabas, true);
document.addEventListener('pointerup', onPointerUpSilabas, true);
document.addEventListener('pointercancel', onPointerUpSilabas, true);

function renderSilabas() {
    elZonas.innerHTML = '';
    slots.forEach((fichaId, slotIdx) => {
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'slot-silaba' + (fichaId !== null ? ' lleno' : '');
        slot.dataset.slotIdx = String(slotIdx);
        slot.textContent = fichaId !== null ? textoFicha(fichaId) : '';
        if (fichaId !== null && !bloqueado) {
            enlazarDragSilaba(slot, { fichaId, origen: 'slot', slotIdx });
        } else if (fichaId !== null) {
            // bloqueado: sin interacción
        } else {
            // slot vacío: solo destino de drop (click no hace nada)
        }
        elZonas.appendChild(slot);
    });

    elPool.innerHTML = '';
    fichas.forEach((ficha) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ficha-silaba';
        btn.textContent = ficha.texto;
        btn.disabled = ficha.usada || bloqueado;
        if (!btn.disabled) {
            enlazarDragSilaba(btn, { fichaId: ficha.id, origen: 'pool' });
        }
        elPool.appendChild(btn);
    });
}

function primerSlotLibre() {
    return slots.findIndex((s) => s === null);
}

function afterColocarSilaba(silaba) {
    const completo = primerSlotLibre() === -1;
    renderSilabas();
    if (completo) {
        verificar(silaba);
        return;
    }
    // Hablar cerca del gesto del toque (móvil).
    hablarSilaba(silaba);
}

function ponerEnSlot(fichaId) {
    if (bloqueado) return;
    const idx = primerSlotLibre();
    if (idx === -1) return;
    sonidoPulsacionLetra();
    slots[idx] = fichaId;
    const silaba = textoFicha(fichaId);
    fichas.find((f) => f.id === fichaId).usada = true;
    afterColocarSilaba(silaba);
}

/** Suelta una ficha en un slot concreto (drag & drop); intercambia si había otra. */
function soltarEnSlot(fichaId, targetIdx, origen, fromSlotIdx) {
    if (bloqueado) return;
    if (targetIdx < 0 || targetIdx >= slots.length) return;

    if (origen === 'slot' && fromSlotIdx === targetIdx) {
        renderSilabas();
        return;
    }

    const ocupante = slots[targetIdx];
    const silaba = textoFicha(fichaId);

    if (origen === 'pool') {
        const ficha = fichas.find((f) => f.id === fichaId);
        if (!ficha || ficha.usada) return;
        if (ocupante !== null) {
            fichas.find((f) => f.id === ocupante).usada = false;
        }
        slots[targetIdx] = fichaId;
        ficha.usada = true;
    } else {
        // Mover / intercambiar entre slots
        slots[fromSlotIdx] = ocupante;
        slots[targetIdx] = fichaId;
    }

    sonidoPulsacionLetra();
    afterColocarSilaba(silaba);
}

function quitarDeSlot(slotIdx) {
    if (bloqueado) return;
    const fichaId = slots[slotIdx];
    if (fichaId === null) return;
    slots[slotIdx] = null;
    fichas.find((f) => f.id === fichaId).usada = false;
    renderSilabas();
}

function verificar(ultimaSilaba) {
    const orden = slots.map((id) => fichas.find((f) => f.id === id).texto);
    const correcto = orden.every((s, i) => s === palabraActual.silabas[i]);

    if (correcto) {
        bloqueado = true;
        elImagen.classList.add('acierto');
        mostrarFeedback(elMensaje, MSG_BIEN, 'ok');
        const decirPalabra = () => hablar(palabraActual.palabra);
        if (ultimaSilaba) hablarSilaba(ultimaSilaba, decirPalabra);
        else decirPalabra();
        btnSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
        renderSilabas();
    } else {
        elImagen.classList.add('error');
        mostrarFeedback(elMensaje, MSG_CASI, 'mal');
        const alFin = () => decirErrorOpcion();
        if (ultimaSilaba) hablarSilaba(ultimaSilaba, alFin);
        else alFin();
        setTimeout(() => elImagen.classList.remove('error'), 400);
        slots = new Array(palabraActual.silabas.length).fill(null);
        fichas.forEach((f) => { f.usada = false; });
        renderSilabas();
    }
}

btnSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(() => {
        indiceActual = (indiceActual + 1) % colaPalabras.length;
        if (indiceActual === 0) colaPalabras = armarColaSilabas();
        cargarPalabra();
    });
});

enlazarTactil('btn-escuchar-pista', () => {
    if (palabraActual) hablar(palabraActual.palabra);
});

// --- Juego 3: Palabra → Imagen ---
let colaPI = [];
let indicePI = 0;
let bloqueadoPI = false;
let correctoPI = null;
let spoilerReveladoPI = false;

const elPIPalabra = document.getElementById('pi-palabra');
const elPIOpciones = document.getElementById('pi-opciones');
const elPIOpcionesWrap = document.getElementById('pi-opciones-wrap');
const elPIRevelar = document.getElementById('pi-revelar');
const elPIMensaje = document.getElementById('pi-mensaje');
const elPIContador = document.getElementById('pi-contador');
const btnPISiguiente = document.getElementById('btn-pi-siguiente');

function iniciarPalabraImagen() {
    colaPI = mezclar(PALABRAS.map((_, i) => i));
    indicePI = 0;
    cargarPalabraImagen();
}

function aplicarCapaSpoilerPI() {
    if (!elPIOpcionesWrap || !elPIRevelar) return;
    const ocultar = spoilerImagenes && !spoilerReveladoPI;
    elPIOpcionesWrap.classList.toggle('con-spoiler', ocultar);
    elPIRevelar.classList.toggle('oculto', !ocultar);
}

function sincronizarSpoilerPI() {
    spoilerReveladoPI = !spoilerImagenes;
    aplicarCapaSpoilerPI();
}

function revelarImagenesPI() {
    spoilerReveladoPI = true;
    aplicarCapaSpoilerPI();
}

function renderPalabraConSilabas(contenedor, item) {
    contenedor.innerHTML = '';
    const wrap = document.createElement('span');
    wrap.className = 'palabra-silabas';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', item.palabra);

    item.silabas.forEach((silaba, i) => {
        if (i > 0) {
            const sep = document.createElement('span');
            sep.className = 'silaba-sep';
            sep.setAttribute('aria-hidden', 'true');
            sep.textContent = '·';
            wrap.appendChild(sep);
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'silaba-click';
        btn.textContent = silaba;
        btn.title = `Escuchar «${silaba}»`;
        agregarActivacionTactil(btn, (e) => {
            e?.stopPropagation?.();
            hablarSilaba(silaba);
        });
        wrap.appendChild(btn);
    });

    contenedor.appendChild(wrap);
}

function cargarPalabraImagen() {
    bloqueadoPI = false;
    spoilerReveladoPI = !spoilerImagenes;
    btnPISiguiente.classList.add('oculto');
    ocultarFeedback();

    correctoPI = colaPI[indicePI];
    const item = PALABRAS[correctoPI];
    elPIContador.textContent = `Palabra ${indicePI + 1} de ${PALABRAS.length}`;
    renderPalabraConSilabas(elPIPalabra, item);

    elPIOpciones.innerHTML = '';
    indicesOpciones(correctoPI).forEach((idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opcion-imagen';
        renderImagenEn(btn, PALABRAS[idx]);
        btn.addEventListener('click', () => responderPalabraImagen(idx, btn));
        elPIOpciones.appendChild(btn);
    });
    aplicarCapaSpoilerPI();
}

if (elPIRevelar) {
    elPIRevelar.addEventListener('click', revelarImagenesPI);
}

function responderPalabraImagen(idx, btn) {
    if (bloqueadoPI) return;
    if (idx === correctoPI) {
        bloqueadoPI = true;
        btn.classList.add('correcta');
        mostrarFeedback(elPIMensaje, MSG_BIEN, 'ok');
        hablar(PALABRAS[correctoPI].palabra);
        elPIOpciones.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        btnPISiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        btn.classList.add('incorrecta');
        mostrarFeedback(elPIMensaje, MSG_CASI, 'mal');
        decirErrorOpcion(PALABRAS[idx].palabra);
        btn.disabled = true;
        setTimeout(() => btn.classList.remove('incorrecta'), 400);
    }
}

btnPISiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(() => {
        indicePI = (indicePI + 1) % PALABRAS.length;
        if (indicePI === 0) colaPI = mezclar(colaPI);
        cargarPalabraImagen();
    });
});

enlazarTactil('btn-pi-escuchar', () => {
    if (correctoPI !== null) hablar(PALABRAS[correctoPI].palabra);
});

// --- Juego 4: Imagen → Palabra ---
let colaIP = [];
let indiceIP = 0;
let bloqueadoIP = false;
let correctoIP = null;

const elIPImagen = document.getElementById('ip-imagen');
const elIPOpciones = document.getElementById('ip-opciones');
const elIPMensaje = document.getElementById('ip-mensaje');
const elIPContador = document.getElementById('ip-contador');
const btnIPSiguiente = document.getElementById('btn-ip-siguiente');

function iniciarImagenPalabra() {
    colaIP = mezclar(PALABRAS.map((_, i) => i));
    indiceIP = 0;
    cargarImagenPalabra();
}

function cargarImagenPalabra() {
    bloqueadoIP = false;
    btnIPSiguiente.classList.add('oculto');
    ocultarFeedback();
    elIPImagen.classList.remove('acierto');

    correctoIP = colaIP[indiceIP];
    const item = PALABRAS[correctoIP];
    elIPContador.textContent = `Palabra ${indiceIP + 1} de ${PALABRAS.length}`;
    renderImagenEn(elIPImagen, item);

    elIPOpciones.innerHTML = '';
    opcionesImagenPalabra(correctoIP).forEach((opcion) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opcion-palabra';
        btn.textContent = opcion.palabra;
        btn.addEventListener('click', () => responderImagenPalabra(opcion, btn));
        elIPOpciones.appendChild(btn);
    });
}

function responderImagenPalabra(opcion, btn) {
    if (bloqueadoIP) return;
    if (opcion.correcta) {
        bloqueadoIP = true;
        btn.classList.add('correcta');
        elIPImagen.classList.add('acierto');
        mostrarFeedback(elIPMensaje, MSG_BIEN, 'ok');
        hablar(PALABRAS[correctoIP].palabra);
        elIPOpciones.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        btnIPSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        btn.classList.add('incorrecta');
        mostrarFeedback(elIPMensaje, MSG_CASI, 'mal');
        decirErrorOpcion(opcion.palabra);
        btn.disabled = true;
        setTimeout(() => btn.classList.remove('incorrecta'), 400);
    }
}

btnIPSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(() => {
        indiceIP = (indiceIP + 1) % PALABRAS.length;
        if (indiceIP === 0) colaIP = mezclar(colaIP);
        cargarImagenPalabra();
    });
});

enlazarTactil('btn-ip-escuchar', () => {
    if (correctoIP !== null) hablar(PALABRAS[correctoIP].palabra);
});

// --- Lectura: Camión (rumbo libre mientras avanza) ---
/** Posiciones de los 3 carriles (%). En horizontal = top; en vertical = left. */
const CAMION_CARRILES = [18, 50, 82];
/** Arranca en el hueco entre el 1.er y el 2.º carril. */
const CAMION_CARRIL_INICIO = (CAMION_CARRILES[0] + CAMION_CARRILES[1]) / 2;
const CAMION_CARRIL_MIN = 14;
const CAMION_CARRIL_MAX = 86;
/** Distancia máxima (% de pista) para considerar que entró a un camino. */
const CAMION_TOLERANCIA_CAMINO = 8;
/** Avance horizontal: izquierda → derecha. */
const CAMION_H_AVANCE_INICIO = 3;
const CAMION_H_AVANCE_CRUCE = 58;
const CAMION_H_AVANCE_LLEGADA = 78;
/** Avance vertical: abajo → arriba (top % decrece). */
const CAMION_V_AVANCE_INICIO = 88;
const CAMION_V_AVANCE_CRUCE = 42;
const CAMION_V_AVANCE_LLEGADA = 20;
/** Velocidad de rumbo al mantener el botón (% de la pista por segundo). */
const CAMION_VEL_RUMBO = 58;

let colaCamion = [];
let indiceCamion = 0;
let bloqueadoCamion = false;
let correctoCamion = null;
/** Aciertos seguidos (se resetea al fallar). */
let aciertosCamion = 0;
/** Bonus de velocidad 0…CAMION_BONUS_MAX (+4 % por acierto, −4 % por error). */
let bonusVelocidadCamion = 0;
let camionDuracionMs = CAMION_TIEMPO_MS;
let timerLlegadaCamion = null;
let rafCamion = null;
let camionInicioMs = 0;
let camionUltimoTickMs = 0;
let camionCarrilActual = CAMION_CARRIL_INICIO;
let camionAvanceActual = CAMION_H_AVANCE_INICIO;
/** Vista vertical (abajo→arriba). */
let camionEsVertical = false;
/** -1 / 0 / 1 según rumbo (arriba/izq o abajo/der). */
let camionRumbo = 0;
let camionArrastrando = false;
let camionTeclasRumbo = { arriba: false, abajo: false };
let camionControlesListos = false;

const elCamionMundo = document.getElementById('camion-mundo');
const elCamionVehiculo = document.getElementById('camion-vehiculo');
const elCamionPalabra = document.getElementById('camion-palabra');
const elCamionDestinos = document.getElementById('camion-destinos');
const elCamionMensaje = document.getElementById('camion-mensaje');
const elCamionAciertos = document.getElementById('camion-aciertos');
const elCamionAyuda = document.getElementById('camion-ayuda');
const btnCamionSiguiente = document.getElementById('btn-camion-siguiente');
const btnCamionArriba = document.getElementById('btn-camion-arriba');
const btnCamionAbajo = document.getElementById('btn-camion-abajo');

function camionMediaVertical() {
    return window.matchMedia('(orientation: portrait), (max-aspect-ratio: 3/4)').matches;
}

function sincronizarOrientacionCamion() {
    camionEsVertical = camionMediaVertical();
    elCamionMundo?.classList.toggle('camion-vertical', camionEsVertical);
    if (elCamionAyuda) {
        elCamionAyuda.textContent = camionEsVertical
            ? 'Mové a izquierda o derecha para cambiar el rumbo'
            : 'Subí o bajá para cambiar el rumbo del camión';
    }
    if (btnCamionArriba) {
        btnCamionArriba.textContent = camionEsVertical ? '◀' : '▲';
        btnCamionArriba.setAttribute('aria-label', camionEsVertical ? 'Izquierda' : 'Subir');
    }
    if (btnCamionAbajo) {
        btnCamionAbajo.textContent = camionEsVertical ? '▶' : '▼';
        btnCamionAbajo.setAttribute('aria-label', camionEsVertical ? 'Derecha' : 'Bajar');
    }
}

function camionAvanceInicio() {
    return camionEsVertical ? CAMION_V_AVANCE_INICIO : CAMION_H_AVANCE_INICIO;
}

function camionAvanceCruce() {
    return camionEsVertical ? CAMION_V_AVANCE_CRUCE : CAMION_H_AVANCE_CRUCE;
}

function camionAvanceLlegada() {
    return camionEsVertical ? CAMION_V_AVANCE_LLEGADA : CAMION_H_AVANCE_LLEGADA;
}

function tiempoCamionActual() {
    const factor = 1 - bonusVelocidadCamion;
    return Math.max(CAMION_TIEMPO_MIN_MS, Math.round(CAMION_TIEMPO_MS * factor));
}

function actualizarMarcadorCamion() {
    if (!elCamionAciertos) return;
    const pct = Math.round(bonusVelocidadCamion * 100);
    const extra = pct > 0 ? ` · +${pct}% vel.` : '';
    elCamionAciertos.textContent = `Correctas: ${aciertosCamion}${extra}`;
    elCamionAciertos.classList.toggle('subio-velocidad', bonusVelocidadCamion > 0);
}

function detenerCamion() {
    if (rafCamion !== null) {
        cancelAnimationFrame(rafCamion);
        rafCamion = null;
    }
    if (timerLlegadaCamion !== null) {
        clearTimeout(timerLlegadaCamion);
        timerLlegadaCamion = null;
    }
    camionRumbo = 0;
    camionArrastrando = false;
    camionTeclasRumbo.arriba = false;
    camionTeclasRumbo.abajo = false;
    btnCamionArriba?.classList.remove('pulsado');
    btnCamionAbajo?.classList.remove('pulsado');
    if (elCamionMundo) {
        elCamionMundo.classList.remove('rama-activa-0', 'rama-activa-1', 'rama-activa-2');
    }
    if (elCamionVehiculo) {
        elCamionVehiculo.classList.remove('llegando');
        elCamionVehiculo.style.left = '';
        elCamionVehiculo.style.top = '';
        elCamionVehiculo.style.transform = '';
        elCamionVehiculo.style.transition = '';
    }
}

function iniciarCamion() {
    colaCamion = mezclar(PALABRAS.map((_, i) => i));
    indiceCamion = 0;
    aciertosCamion = 0;
    bonusVelocidadCamion = 0;
    actualizarMarcadorCamion();
    cargarCamion();
}

/** Slot alineado con un camino, o null si está en el hueco entre ellos. */
function slotCamionAlineado() {
    let mejor = null;
    let mejorDist = Infinity;
    for (let i = 0; i < CAMION_CARRILES.length; i++) {
        const d = Math.abs(camionCarrilActual - CAMION_CARRILES[i]);
        if (d < mejorDist) {
            mejorDist = d;
            mejor = i;
        }
    }
    if (mejor === null || mejorDist > CAMION_TOLERANCIA_CAMINO) return null;
    return mejor;
}

function actualizarRumboVisual() {
    const slot = slotCamionAlineado();
    if (elCamionMundo) {
        elCamionMundo.classList.remove('rama-activa-0', 'rama-activa-1', 'rama-activa-2');
        if (slot !== null) elCamionMundo.classList.add(`rama-activa-${slot}`);
    }
    elCamionDestinos?.querySelectorAll('.camion-destino').forEach((el) => {
        el.classList.toggle('rumbo', slot !== null && Number(el.dataset.slot) === slot);
    });
}

function registrarFalloCamion(destinos, btnIncorrecto) {
    if (btnIncorrecto) btnIncorrecto.classList.add('incorrecta');
    const correctoBtn = destinos.find((b) => Number(b.dataset.idx) === correctoCamion);
    if (correctoBtn) correctoBtn.classList.add('correcta');
    aciertosCamion = 0;
    const antes = bonusVelocidadCamion;
    bonusVelocidadCamion = Math.max(0, bonusVelocidadCamion - CAMION_CAMBIO_VELOCIDAD);
    const bajo = bonusVelocidadCamion < antes;
    actualizarMarcadorCamion();
    mostrarFeedback(elCamionMensaje, bajo ? `${MSG_CASI} Más despacio` : MSG_CASI, 'mal');
    sonidoIncorrecto();
    hablar(PALABRAS[correctoCamion].palabra);
}

function pintarCamion() {
    if (!elCamionVehiculo) return;
    const inclinacion = camionRumbo * -10;
    if (camionEsVertical) {
        elCamionVehiculo.style.left = `${camionCarrilActual}%`;
        elCamionVehiculo.style.top = `${camionAvanceActual}%`;
        elCamionVehiculo.style.transform = `translate(-50%, -50%) rotate(${-90 + inclinacion}deg)`;
    } else {
        elCamionVehiculo.style.left = `${camionAvanceActual}%`;
        elCamionVehiculo.style.top = `${camionCarrilActual}%`;
        elCamionVehiculo.style.transform = `translateY(-50%) rotate(${inclinacion}deg)`;
    }
}

function ajustarTamanoPalabraCamion() {
    if (!elCamionPalabra || !elCamionMundo) return;
    if (juegoCamion.classList.contains('oculto')) return;

    const escala = getTextoEscala();
    const maxFs = Math.round(20 * escala);
    const minFs = Math.max(10, Math.round(11 * escala));
    elCamionPalabra.style.fontSize = `${maxFs}px`;

    const frac = camionEsVertical ? 0.36 : 0.48;
    const anchoMax = Math.max(72, Math.floor(elCamionMundo.clientWidth * frac));
    elCamionPalabra.style.maxWidth = `${anchoMax}px`;

    let fs = maxFs;
    while (fs > minFs && elCamionPalabra.scrollWidth > anchoMax - 8) {
        fs -= 1;
        elCamionPalabra.style.fontSize = `${fs}px`;
    }
}

function sincronizarRumboDesdeTeclas() {
    if (camionTeclasRumbo.arriba && !camionTeclasRumbo.abajo) camionRumbo = -1;
    else if (camionTeclasRumbo.abajo && !camionTeclasRumbo.arriba) camionRumbo = 1;
    else if (!camionTeclasRumbo.arriba && !camionTeclasRumbo.abajo && !camionArrastrando) camionRumbo = 0;
}

function juegoCamionVisible() {
    return juegoCamion && !juegoCamion.classList.contains('oculto') && !bloqueadoCamion;
}

function tickCamion(now) {
    if (bloqueadoCamion) {
        rafCamion = null;
        return;
    }
    if (!camionUltimoTickMs) camionUltimoTickMs = now;
    const dt = Math.min(0.05, (now - camionUltimoTickMs) / 1000);
    camionUltimoTickMs = now;

    const t = Math.min(1, (now - camionInicioMs) / camionDuracionMs);
    const a0 = camionAvanceInicio();
    const a1 = camionAvanceCruce();
    camionAvanceActual = a0 + (a1 - a0) * t;
    if (!camionArrastrando) {
        camionCarrilActual = Math.min(
            CAMION_CARRIL_MAX,
            Math.max(CAMION_CARRIL_MIN, camionCarrilActual + camionRumbo * CAMION_VEL_RUMBO * dt)
        );
    }
    actualizarRumboVisual();
    pintarCamion();

    if (t < 1) {
        rafCamion = requestAnimationFrame(tickCamion);
        return;
    }
    rafCamion = null;
    llegarCamionYResolver();
}

function llegarCamionYResolver() {
    if (bloqueadoCamion) return;
    bloqueadoCamion = true;
    camionRumbo = 0;
    camionArrastrando = false;
    if (rafCamion !== null) {
        cancelAnimationFrame(rafCamion);
        rafCamion = null;
    }

    const destinos = [...elCamionDestinos.querySelectorAll('.camion-destino')];
    const elegido = slotCamionAlineado();
    const enCamino = elegido !== null;
    const btn = enCamino ? destinos[elegido] : null;
    const idx = btn ? Number(btn.dataset.idx) : -1;
    const carrilLlegada = enCamino ? CAMION_CARRILES[elegido] : camionCarrilActual;

    if (enCamino) camionCarrilActual = carrilLlegada;
    camionAvanceActual = camionAvanceLlegada();
    actualizarRumboVisual();
    elCamionVehiculo.classList.add('llegando');
    if (camionEsVertical) {
        elCamionVehiculo.style.left = `${carrilLlegada}%`;
        elCamionVehiculo.style.top = `${camionAvanceActual}%`;
        elCamionVehiculo.style.transform = 'translate(-50%, -50%) rotate(-90deg) scale(0.78)';
    } else {
        elCamionVehiculo.style.left = `${camionAvanceActual}%`;
        elCamionVehiculo.style.top = `${carrilLlegada}%`;
        elCamionVehiculo.style.transform = 'translateY(-50%) scale(0.78)';
    }

    timerLlegadaCamion = setTimeout(() => {
        timerLlegadaCamion = null;
        destinos.forEach((el) => el.classList.remove('rumbo'));
        const palabraCorrecta = PALABRAS[correctoCamion].palabra;
        if (enCamino && idx === correctoCamion) {
            btn.classList.add('correcta');
            aciertosCamion += 1;
            const antes = bonusVelocidadCamion;
            bonusVelocidadCamion = Math.min(
                CAMION_BONUS_MAX,
                bonusVelocidadCamion + CAMION_CAMBIO_VELOCIDAD
            );
            const subio = bonusVelocidadCamion > antes;
            actualizarMarcadorCamion();
            mostrarFeedback(
                elCamionMensaje,
                subio ? `${MSG_BIEN} ¡Más rápido!` : MSG_BIEN,
                'ok'
            );
            hablar(palabraCorrecta);
            registrarEjercicioCompletado();
        } else if (enCamino) {
            registrarFalloCamion(destinos, btn);
        } else {
            registrarFalloCamion(destinos, null);
        }
        btnCamionSiguiente.classList.remove('oculto');
        programarAutoSiguiente();
    }, 480);
}

function cargarCamion() {
    detenerCamion();
    sincronizarOrientacionCamion();
    bloqueadoCamion = false;
    camionCarrilActual = CAMION_CARRIL_INICIO;
    camionAvanceActual = camionAvanceInicio();
    camionRumbo = 0;
    camionDuracionMs = tiempoCamionActual();
    btnCamionSiguiente.classList.add('oculto');
    ocultarFeedback();
    actualizarMarcadorCamion();

    correctoCamion = colaCamion[indiceCamion];
    const item = PALABRAS[correctoCamion];
    elCamionPalabra.textContent = item.palabra;
    elCamionPalabra.style.fontSize = '';

    elCamionDestinos.innerHTML = '';
    indicesOpciones(correctoCamion).forEach((idx, slot) => {
        const el = document.createElement('div');
        el.className = 'camion-destino';
        el.dataset.idx = String(idx);
        el.dataset.slot = String(slot);
        renderImagenEn(el, PALABRAS[idx]);
        elCamionDestinos.appendChild(el);
    });

    pintarCamion();
    actualizarRumboVisual();
    requestAnimationFrame(() => ajustarTamanoPalabraCamion());
    camionInicioMs = performance.now();
    camionUltimoTickMs = 0;
    rafCamion = requestAnimationFrame(tickCamion);
}

function enlazarHoldRumbo(btn, sentido) {
    if (!btn) return;
    const empezar = (event) => {
        if (!juegoCamionVisible()) return;
        event.preventDefault();
        btn.classList.add('pulsado');
        if (sentido < 0) camionTeclasRumbo.arriba = true;
        else camionTeclasRumbo.abajo = true;
        sincronizarRumboDesdeTeclas();
        try { btn.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    };
    const soltar = (event) => {
        btn.classList.remove('pulsado');
        if (sentido < 0) camionTeclasRumbo.arriba = false;
        else camionTeclasRumbo.abajo = false;
        sincronizarRumboDesdeTeclas();
        try { btn.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
    };
    btn.addEventListener('pointerdown', empezar);
    btn.addEventListener('pointerup', soltar);
    btn.addEventListener('pointercancel', soltar);
    btn.addEventListener('lostpointercapture', soltar);
}

function moverCamionPorPuntero(clientX, clientY) {
    if (!elCamionMundo || !juegoCamionVisible()) return;
    const rect = elCamionMundo.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pct = camionEsVertical
        ? ((clientX - rect.left) / rect.width) * 100
        : ((clientY - rect.top) / rect.height) * 100;
    camionCarrilActual = Math.min(CAMION_CARRIL_MAX, Math.max(CAMION_CARRIL_MIN, pct));
    actualizarRumboVisual();
    pintarCamion();
}

function prepararControlesCamion() {
    if (camionControlesListos) return;
    camionControlesListos = true;

    sincronizarOrientacionCamion();
    window.addEventListener('resize', () => {
        const antes = camionEsVertical;
        sincronizarOrientacionCamion();
        if (antes !== camionEsVertical && juegoCamion && !juegoCamion.classList.contains('oculto') && !bloqueadoCamion) {
            // Reinicia el avance al cambiar orientación a mitad de ronda.
            camionAvanceActual = camionAvanceInicio();
            camionInicioMs = performance.now();
            camionUltimoTickMs = 0;
            pintarCamion();
            ajustarTamanoPalabraCamion();
        }
    });

    enlazarHoldRumbo(btnCamionArriba, -1);
    enlazarHoldRumbo(btnCamionAbajo, 1);

    if (elCamionMundo) {
        elCamionMundo.addEventListener('pointerdown', (event) => {
            if (!juegoCamionVisible()) return;
            if (event.target.closest('.camion-timon')) return;
            camionArrastrando = true;
            camionRumbo = 0;
            moverCamionPorPuntero(event.clientX, event.clientY);
            try { elCamionMundo.setPointerCapture(event.pointerId); } catch { /* ignore */ }
        });
        elCamionMundo.addEventListener('pointermove', (event) => {
            if (!camionArrastrando || !juegoCamionVisible()) return;
            moverCamionPorPuntero(event.clientX, event.clientY);
        });
        const finArrastre = () => {
            camionArrastrando = false;
            sincronizarRumboDesdeTeclas();
        };
        elCamionMundo.addEventListener('pointerup', finArrastre);
        elCamionMundo.addEventListener('pointercancel', finArrastre);
        elCamionMundo.addEventListener('lostpointercapture', finArrastre);
    }

    window.addEventListener('keydown', (event) => {
        if (!juegoCamionVisible()) return;
        const izq = camionEsVertical
            ? (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A')
            : (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W');
        const der = camionEsVertical
            ? (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D')
            : (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S');
        if (izq) {
            event.preventDefault();
            camionTeclasRumbo.arriba = true;
            sincronizarRumboDesdeTeclas();
        } else if (der) {
            event.preventDefault();
            camionTeclasRumbo.abajo = true;
            sincronizarRumboDesdeTeclas();
        }
    });
    window.addEventListener('keyup', (event) => {
        const izq = camionEsVertical
            ? (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A')
            : (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W');
        const der = camionEsVertical
            ? (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D')
            : (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S');
        // También liberar al soltar las teclas “horizontales” clásicas.
        if (izq || event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W' || event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
            camionTeclasRumbo.arriba = false;
            sincronizarRumboDesdeTeclas();
        }
        if (der || event.key === 'ArrowDown' || event.key === 's' || event.key === 'S' || event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
            camionTeclasRumbo.abajo = false;
            sincronizarRumboDesdeTeclas();
        }
    });
}

prepararControlesCamion();

if (btnCamionSiguiente) {
    btnCamionSiguiente.addEventListener('click', () => {
        avanzarDespuesDeAcierto(() => {
            indiceCamion = (indiceCamion + 1) % PALABRAS.length;
            if (indiceCamion === 0) colaCamion = mezclar(colaCamion);
            cargarCamion();
        });
    });
}

enlazarTactil('btn-camion-escuchar', () => {
    if (correctoCamion !== null) hablar(PALABRAS[correctoCamion].palabra);
});

// --- Lectura: Fútbol (imagen → patear a la palabra) ---
/** Ciclo ida y vuelta del puntero (ms). */
const FUTBOL_CICLO_MS = 2600;
/** Ángulo máximo de la flecha en paisaje (grados desde la vertical). */
const FUTBOL_ANGULO_MAX = 78;
/** Ángulo máximo de la flecha en retrato (grados desde la horizontal). */
const FUTBOL_ANGULO_MAX_RETRATO = 78;
/** Centros de las 3 palabras en el rango de aim 0…1 (con huecos entre medias). */
const FUTBOL_AIM_CENTROS = [0.12, 0.5, 0.88];
/** Radio de acierto alrededor de cada centro (el resto es fallo / poste). */
const FUTBOL_AIM_RADIO = 0.09;
/** Velocidad de la pelota al patear (px/s). */
const FUTBOL_VEL_PX_S = 980;
/** Tiempo máximo de vuelo por si no llega al arco (ms). */
const FUTBOL_VUELO_MAX_MS = 2800;

let colaFutbol = [];
let indiceFutbol = 0;
let bloqueadoFutbol = false;
let correctoFutbol = null;
let opcionesFutbol = [];
let rafFutbol = null;
let rafVueloFutbol = null;
let futbolInicioMs = 0;
let futbolAim = 0.5;
/** Índice 0…2 o null si apunta al hueco entre palabras. */
let futbolSlot = null;
let futbolControlesListos = false;
let futbolPortrait = false;
const elFutbolAreaTiro = document.getElementById('futbol-area-tiro');
const elFutbolArco = document.getElementById('futbol-arco');
/** Temporizador opcional (cuenta regresiva por ronda). */
let futbolTimerActivo = localStorage.getItem('futbolTimer') === '1';
let futbolLimiteSeg = FUTBOL_TIMER_INICIAL;
/** Segundos totales de la ronda actual (para el reloj que se consume). */
let futbolRondaSeg = FUTBOL_TIMER_INICIAL;
let futbolDeadlineMs = 0;
let futbolUltimoSegMostrado = -1;

const elFutbolImagen = document.getElementById('futbol-imagen');
const elFutbolCancha = document.getElementById('futbol-cancha');
const elFutbolPalabras = document.getElementById('futbol-palabras');
const elFutbolPelota = document.getElementById('futbol-pelota');
const elFutbolLinea = document.getElementById('futbol-linea');
const elFutbolMensaje = document.getElementById('futbol-mensaje');
const elFutbolContador = document.getElementById('futbol-contador');
const elFutbolTimer = document.getElementById('futbol-timer');
const elFutbolTimerNum = document.getElementById('futbol-timer-num');
const elFutbolRelojArco = document.getElementById('futbol-reloj-arco');
const btnFutbolSiguiente = document.getElementById('btn-futbol-siguiente');
const btnFutbolTimer = document.getElementById('btn-futbol-timer');

function esFutbolPortrait() {
    return window.matchMedia('(orientation: portrait)').matches;
}

function aplicarFutbolTimerBtn() {
    if (!btnFutbolTimer) return;
    btnFutbolTimer.classList.toggle('activo', futbolTimerActivo);
    btnFutbolTimer.setAttribute('aria-pressed', futbolTimerActivo ? 'true' : 'false');
    btnFutbolTimer.title = futbolTimerActivo
        ? 'Desactivar temporizador'
        : 'Activar temporizador (15 s)';
    if (elFutbolTimer) {
        elFutbolTimer.classList.toggle('oculto', !futbolTimerActivo);
    }
}

/**
 * Actualiza el reloj analógico.
 * @param {number} restanteSeg segundos restantes (puede ser decimal)
 * @param {number} [fraccion] 1 = lleno, 0 = vacío; si se omite, se calcula con la ronda
 */
function pintarFutbolTimer(restanteSeg, fraccion) {
    if (!elFutbolTimer) return;
    const seg = Math.max(0, Math.ceil(restanteSeg));
    const frac = Math.max(0, Math.min(1,
        fraccion !== undefined
            ? fraccion
            : (futbolRondaSeg > 0 ? restanteSeg / futbolRondaSeg : 0)
    ));
    futbolUltimoSegMostrado = seg;
    if (elFutbolTimerNum) elFutbolTimerNum.textContent = String(seg);
    elFutbolTimer.setAttribute('aria-label', `Temporizador ${seg} segundos`);
    elFutbolTimer.classList.toggle('urgente', seg <= 5 && frac < 1);
    if (elFutbolRelojArco) {
        /* Arco restante desde las 12, sentido horario */
        const visible = Math.max(0, Math.min(100, frac * 100));
        elFutbolRelojArco.style.strokeDasharray = `${visible} 100`;
        elFutbolRelojArco.style.strokeDashoffset = '0';
    }
}

function ajustarLimiteFutbol(delta) {
    futbolLimiteSeg = Math.min(
        FUTBOL_TIMER_MAX,
        Math.max(FUTBOL_TIMER_MIN, futbolLimiteSeg + delta)
    );
}

function avanzarPalabraFutbol() {
    indiceFutbol = (indiceFutbol + 1) % PALABRAS.length;
    if (indiceFutbol === 0) colaFutbol = mezclar(colaFutbol);
    cargarFutbol();
}

function detenerFutbol() {
    if (rafFutbol !== null) {
        cancelAnimationFrame(rafFutbol);
        rafFutbol = null;
    }
    if (rafVueloFutbol !== null) {
        cancelAnimationFrame(rafVueloFutbol);
        rafVueloFutbol = null;
    }
    resetPelotaFutbol();
    if (elFutbolLinea) {
        elFutbolLinea.style.transform = '';
        elFutbolLinea.classList.remove('oculto');
    }
}

/** Devuelve 0…2 si apunta a una palabra, o null si va al hueco. */
function slotDesdeAim(aim) {
    let mejor = null;
    let mejorDist = Infinity;
    for (let i = 0; i < FUTBOL_AIM_CENTROS.length; i++) {
        const d = Math.abs(aim - FUTBOL_AIM_CENTROS[i]);
        if (d <= FUTBOL_AIM_RADIO && d < mejorDist) {
            mejor = i;
            mejorDist = d;
        }
    }
    return mejor;
}

/** Triángulo 0→1→0 en un ciclo. */
function aimDesdeTiempo(elapsedMs) {
    const t = (elapsedMs % FUTBOL_CICLO_MS) / FUTBOL_CICLO_MS;
    return t < 0.5 ? t * 2 : 2 - t * 2;
}

function actualizarLineaFutbol() {
    if (!elFutbolLinea) return;
    const maxAng = futbolPortrait ? FUTBOL_ANGULO_MAX_RETRATO : FUTBOL_ANGULO_MAX;
    const angulo = (futbolAim - 0.5) * 2 * maxAng;
    elFutbolLinea.style.transform = `rotate(${angulo}deg)`;
}

function anguloPateadaFutbol() {
    const maxAng = futbolPortrait ? FUTBOL_ANGULO_MAX_RETRATO : FUTBOL_ANGULO_MAX;
    return (futbolAim - 0.5) * 2 * maxAng;
}

/** Velocidad unitaria según la flecha (coords de pantalla: +y hacia abajo). */
function velocidadDesdeAimFutbol() {
    const rad = anguloPateadaFutbol() * (Math.PI / 180);
    if (futbolPortrait) {
        /* 0° = derecha; negativo = arriba; positivo = abajo */
        return { vx: Math.cos(rad), vy: Math.sin(rad) };
    }
    /* 0° = arriba; negativo = izquierda; positivo = derecha */
    return { vx: Math.sin(rad), vy: -Math.cos(rad) };
}

function slotEnPuntoFutbol(clientX, clientY) {
    const palabras = elFutbolPalabras?.querySelectorAll('.futbol-palabra');
    if (!palabras) return null;
    for (const el of palabras) {
        const r = el.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
            return Number(el.dataset.slot);
        }
    }
    return null;
}

function tiempoAgotadoFutbol() {
    if (bloqueadoFutbol) return;
    bloqueadoFutbol = true;
    if (rafFutbol !== null) {
        cancelAnimationFrame(rafFutbol);
        rafFutbol = null;
    }
    elFutbolLinea?.classList.add('oculto');
    const destinos = [...(elFutbolPalabras?.querySelectorAll('.futbol-palabra') || [])];
    const correctoEl = destinos.find((el) => el.dataset.correcta === '1');
    correctoEl?.classList.add('correcta');
    mostrarFeedback(elFutbolMensaje, MSG_TIEMPO, 'mal');
    sonidoHinchadaFutbol();
    if (correctoFutbol !== null) hablar(PALABRAS[correctoFutbol].palabra);
    ajustarLimiteFutbol(1);
    pintarFutbolTimer(0, 0);
    btnFutbolSiguiente?.classList.remove('oculto');
    programarAutoSiguiente();
}

function tickFutbol(now) {
    if (bloqueadoFutbol) {
        rafFutbol = null;
        return;
    }
    if (!juegoFutbol || juegoFutbol.classList.contains('oculto')) {
        rafFutbol = null;
        return;
    }

    if (futbolTimerActivo && futbolDeadlineMs > 0) {
        const restanteMs = Math.max(0, futbolDeadlineMs - now);
        const frac = futbolRondaSeg > 0 ? restanteMs / (futbolRondaSeg * 1000) : 0;
        pintarFutbolTimer(restanteMs / 1000, frac);
        if (now >= futbolDeadlineMs) {
            tiempoAgotadoFutbol();
            return;
        }
    }

    futbolPortrait = esFutbolPortrait();
    futbolAim = aimDesdeTiempo(now - futbolInicioMs);
    futbolSlot = slotDesdeAim(futbolAim);
    actualizarLineaFutbol();
    rafFutbol = requestAnimationFrame(tickFutbol);
}

function juegoFutbolVisible() {
    return juegoFutbol && !juegoFutbol.classList.contains('oculto') && !bloqueadoFutbol;
}

function resetPelotaFutbol() {
    if (!elFutbolPelota) return;
    if (elFutbolAreaTiro && elFutbolPelota.parentElement !== elFutbolAreaTiro) {
        elFutbolAreaTiro.appendChild(elFutbolPelota);
    }
    elFutbolPelota.classList.remove('volando');
    elFutbolPelota.style.left = '';
    elFutbolPelota.style.top = '';
    elFutbolPelota.style.bottom = '';
    elFutbolPelota.style.transform = '';
    elFutbolPelota.style.transition = '';
}

function iniciarFutbol() {
    colaFutbol = mezclar(PALABRAS.map((_, i) => i));
    indiceFutbol = 0;
    futbolLimiteSeg = FUTBOL_TIMER_INICIAL;
    precargarSfxFutbol();
    cargarFutbol();
}

function cargarFutbol() {
    precargarSfxFutbol();
    detenerFutbol();
    bloqueadoFutbol = false;
    futbolAim = 0.5;
    futbolSlot = null;
    futbolPortrait = esFutbolPortrait();
    btnFutbolSiguiente?.classList.add('oculto');
    if (elFutbolMensaje) {
        ocultarFeedback();
    }
    elFutbolImagen?.classList.remove('acierto');
    elFutbolLinea?.classList.remove('oculto');
    resetPelotaFutbol();
    aplicarFutbolTimerBtn();

    correctoFutbol = colaFutbol[indiceFutbol];
    const item = PALABRAS[correctoFutbol];
    if (elFutbolContador) {
        elFutbolContador.textContent = `Palabra ${indiceFutbol + 1} de ${PALABRAS.length}`;
    }
    if (elFutbolImagen) renderImagenEn(elFutbolImagen, item);

    opcionesFutbol = opcionesImagenPalabra(correctoFutbol);
    if (elFutbolPalabras) {
        elFutbolPalabras.innerHTML = '';
        opcionesFutbol.forEach((opcion, slot) => {
            const el = document.createElement('div');
            el.className = 'futbol-palabra';
            el.dataset.slot = String(slot);
            el.dataset.correcta = opcion.correcta ? '1' : '0';
            el.textContent = opcion.palabra;
            elFutbolPalabras.appendChild(el);
        });
    }

    actualizarLineaFutbol();
    futbolInicioMs = performance.now();
    if (futbolTimerActivo) {
        futbolRondaSeg = futbolLimiteSeg;
        futbolDeadlineMs = futbolInicioMs + futbolRondaSeg * 1000;
        pintarFutbolTimer(futbolRondaSeg, 1);
    } else {
        futbolDeadlineMs = 0;
        futbolUltimoSegMostrado = -1;
    }
    rafFutbol = requestAnimationFrame(tickFutbol);
}

function resolverFutbol(slot) {
    const destinos = [...(elFutbolPalabras?.querySelectorAll('.futbol-palabra') || [])];
    const elegido = slot === null
        ? null
        : destinos.find((el) => Number(el.dataset.slot) === slot);
    const acierto = slot !== null && Boolean(opcionesFutbol[slot]?.correcta);

    if (acierto) {
        elegido?.classList.add('correcta');
        elFutbolImagen?.classList.add('acierto');
        mostrarFeedback(elFutbolMensaje, MSG_BIEN, 'ok');
        sonidoGolFutbol();
        setTimeout(() => hablar(PALABRAS[correctoFutbol].palabra), 400);
        if (futbolTimerActivo) {
            ajustarLimiteFutbol(-1);
            pintarFutbolTimer(futbolLimiteSeg, 1);
        }
        registrarEjercicioCompletado({ silencio: true });
        btnFutbolSiguiente?.classList.remove('oculto');
        programarAutoSiguiente();
    } else {
        elegido?.classList.add('incorrecta');
        const correctoEl = destinos.find((el) => el.dataset.correcta === '1');
        correctoEl?.classList.add('correcta');
        mostrarFeedback(elFutbolMensaje, MSG_CASI, 'mal');
        sonidoHinchadaFutbol();
        setTimeout(() => hablar(PALABRAS[correctoFutbol].palabra), 400);
        if (futbolTimerActivo) {
            ajustarLimiteFutbol(1);
            pintarFutbolTimer(futbolLimiteSeg, 1);
        }
        btnFutbolSiguiente?.classList.remove('oculto');
        programarAutoSiguiente();
    }
}

function patearFutbol() {
    if (!juegoFutbolVisible() || !elFutbolPelota || !elFutbolCancha) return;
    bloqueadoFutbol = true;
    if (rafFutbol !== null) {
        cancelAnimationFrame(rafFutbol);
        rafFutbol = null;
    }
    if (rafVueloFutbol !== null) {
        cancelAnimationFrame(rafVueloFutbol);
        rafVueloFutbol = null;
    }

    const slotAlPatear = futbolSlot;
    futbolPortrait = esFutbolPortrait();
    elFutbolLinea?.classList.add('oculto');

    const canchaRect = elFutbolCancha.getBoundingClientRect();
    const pelotaRect = elFutbolPelota.getBoundingClientRect();
    const radio = Math.max(16, pelotaRect.width / 2);
    let x = pelotaRect.left - canchaRect.left + pelotaRect.width / 2;
    let y = pelotaRect.top - canchaRect.top + pelotaRect.height / 2;
    let { vx, vy } = velocidadDesdeAimFutbol();
    let giro = 0;
    const vueloInicio = performance.now();
    let ultimoTick = vueloInicio;
    let entroAlArco = false;

    elFutbolCancha.appendChild(elFutbolPelota);
    elFutbolPelota.classList.add('volando');
    elFutbolPelota.style.bottom = 'auto';
    elFutbolPelota.style.left = `${x}px`;
    elFutbolPelota.style.top = `${y}px`;
    elFutbolPelota.style.transform = 'translate(-50%, -50%) scale(1.08)';

    const pintarPelota = () => {
        elFutbolPelota.style.left = `${x}px`;
        elFutbolPelota.style.top = `${y}px`;
        elFutbolPelota.style.transform = `translate(-50%, -50%) rotate(${giro}deg)`;
    };

    const finalizarVuelo = (slot) => {
        rafVueloFutbol = null;
        elFutbolPelota.style.transform = `translate(-50%, -50%) scale(0.78) rotate(${giro}deg)`;
        resolverFutbol(slot);
    };

    const tickVuelo = (now) => {
        const dt = Math.min(0.04, (now - ultimoTick) / 1000);
        ultimoTick = now;
        const paso = FUTBOL_VEL_PX_S * dt;
        x += vx * paso;
        y += vy * paso;
        giro += (futbolPortrait ? vy : vx) * paso * 2.2;

        const minX = radio;
        const maxX = canchaRect.width - radio;
        const minY = radio;
        const maxY = canchaRect.height - radio;

        /* Rebote en paredes laterales (según orientación del tiro). */
        if (futbolPortrait) {
            if (y < minY) { y = minY; vy = Math.abs(vy); }
            else if (y > maxY) { y = maxY; vy = -Math.abs(vy); }
            x = Math.min(maxX, Math.max(minX, x));
        } else {
            if (x < minX) { x = minX; vx = Math.abs(vx); }
            else if (x > maxX) { x = maxX; vx = -Math.abs(vx); }
            y = Math.min(maxY, Math.max(minY, y));
        }

        pintarPelota();

        const arcoRect = elFutbolArco?.getBoundingClientRect();
        const cx = canchaRect.left + x;
        const cy = canchaRect.top + y;
        let enArco = false;
        if (arcoRect) {
            enArco = cx >= arcoRect.left && cx <= arcoRect.right
                && cy >= arcoRect.top && cy <= arcoRect.bottom;
        }

        if (enArco) {
            if (!entroAlArco) entroAlArco = true;
            const hit = slotEnPuntoFutbol(cx, cy);
            if (hit !== null) {
                finalizarVuelo(hit);
                return;
            }
            /* Siguió hasta el fondo del arco sin tocar palabra → fallo. */
            const profundo = futbolPortrait
                ? cx >= arcoRect.left + arcoRect.width * 0.55
                : cy <= arcoRect.top + arcoRect.height * 0.45;
            if (profundo) {
                finalizarVuelo(null);
                return;
            }
        } else if (entroAlArco) {
            finalizarVuelo(slotEnPuntoFutbol(cx, cy));
            return;
        }

        if (now - vueloInicio > FUTBOL_VUELO_MAX_MS) {
            finalizarVuelo(slotAlPatear);
            return;
        }

        rafVueloFutbol = requestAnimationFrame(tickVuelo);
    };

    requestAnimationFrame(() => {
        elFutbolPelota.style.transform = 'translate(-50%, -50%)';
        rafVueloFutbol = requestAnimationFrame(tickVuelo);
    });
}

function alternarFutbolTimer() {
    futbolTimerActivo = !futbolTimerActivo;
    localStorage.setItem('futbolTimer', futbolTimerActivo ? '1' : '0');
    aplicarFutbolTimerBtn();
    if (!juegoFutbol || juegoFutbol.classList.contains('oculto')) return;
    if (futbolTimerActivo) {
        futbolLimiteSeg = FUTBOL_TIMER_INICIAL;
        futbolRondaSeg = futbolLimiteSeg;
        if (!bloqueadoFutbol) {
            const now = performance.now();
            futbolDeadlineMs = now + futbolRondaSeg * 1000;
            pintarFutbolTimer(futbolRondaSeg, 1);
        } else {
            pintarFutbolTimer(futbolLimiteSeg, 1);
        }
    } else {
        futbolDeadlineMs = 0;
        futbolUltimoSegMostrado = -1;
    }
}

function prepararControlesFutbol() {
    if (futbolControlesListos) return;
    futbolControlesListos = true;

    const intentarPatear = (event) => {
        if (event?.target?.closest?.('#btn-futbol-siguiente')) return;
        if (event?.target?.closest?.('#btn-futbol-timer')) return;
        if (!juegoFutbolVisible()) return;
        event?.preventDefault?.();
        patearFutbol();
    };

    if (elFutbolCancha) {
        agregarActivacionTactil(elFutbolCancha, intentarPatear);
    }

    document.addEventListener('keydown', (event) => {
        if (!juegoFutbolVisible()) return;
        if (event.code !== 'Space' && event.key !== 'Enter') return;
        if (event.target && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)) {
            if (event.target.id !== 'futbol-pelota') return;
        }
        event.preventDefault();
        patearFutbol();
    });
}

prepararControlesFutbol();
aplicarFutbolTimerBtn();

if (btnFutbolSiguiente) {
    btnFutbolSiguiente.addEventListener('click', () => {
        avanzarDespuesDeAcierto(avanzarPalabraFutbol);
    });
}

btnFutbolTimer?.addEventListener('click', (event) => {
    event.stopPropagation();
    alternarFutbolTimer();
});

enlazarTactil('btn-futbol-escuchar', () => {
    if (correctoFutbol !== null) hablar(PALABRAS[correctoFutbol].palabra);
});

// --- Lectura: Explorar catálogo ---
const elExplorarCatalogo = document.getElementById('explorar-catalogo');
let explorarMontado = false;

function iniciarExplorar() {
    if (!elExplorarCatalogo) return;
    if (explorarMontado) {
        elExplorarCatalogo.scrollTop = 0;
        return;
    }

    const orden = [...PALABRAS].sort((a, b) =>
        a.palabra.localeCompare(b.palabra, 'es', { sensitivity: 'base' })
    );

    elExplorarCatalogo.innerHTML = '';
    orden.forEach((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'explorar-tarjeta';
        btn.setAttribute('role', 'listitem');
        btn.setAttribute('aria-label', `Escuchar ${item.palabra}`);

        const dibujo = document.createElement('span');
        dibujo.className = 'explorar-dibujo';
        dibujo.setAttribute('aria-hidden', 'true');
        renderImagenEn(dibujo, item);

        const texto = document.createElement('span');
        texto.className = 'explorar-palabra';
        texto.textContent = item.palabra;

        btn.appendChild(dibujo);
        btn.appendChild(texto);
        agregarActivacionTactil(btn, () => hablar(item.palabra));
        elExplorarCatalogo.appendChild(btn);
    });

    explorarMontado = true;
    elExplorarCatalogo.scrollTop = 0;
}

// --- Matemática 1: Contar ---
let contarCantidad = 0;
let contarEntrada = '';
let contarBloqueado = false;
let contarEmoji = '';

const elContarObjetos = document.getElementById('contar-objetos');
const elContarPantalla = document.getElementById('contar-pantalla');
const elContarTeclado = document.getElementById('contar-teclado');
const elContarMensaje = document.getElementById('contar-mensaje');
const btnContarSiguiente = document.getElementById('btn-contar-siguiente');

function restaurarObjetosContar() {
    if (!contarCantidad || !contarEmoji) return;
    renderObjetos(elContarObjetos, contarEmoji, contarCantidad);
}

function iniciarContar() {
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    contarBloqueado = false;
    contarEntrada = '';
    btnContarSiguiente.classList.add('oculto');
    ocultarFeedback();
    const max = getMaxEnPantalla('contar');
    contarCantidad = numeroAleatorio(1, max);
    contarEmoji = EMOJIS_CONTAR[numeroAleatorio(0, EMOJIS_CONTAR.length - 1)];
    renderObjetos(elContarObjetos, contarEmoji, contarCantidad);
    elContarPantalla.textContent = '?';

    activarEntradaNumerica({
        bloqueado: () => contarBloqueado,
        maxDigitos: () => maxDigitosJuego('contar'),
        valor: () => contarEntrada,
        setValor: (v) => { contarEntrada = v; },
        actualizarPantalla: () => {
            elContarPantalla.textContent = contarEntrada || '?';
        },
        onAceptar: verificarContar
    });

    montarTecladoNumerico(elContarTeclado, {
        maxDigitos: maxDigitosJuego('contar'),
        onDigito: (d) => digitoEntradaNumerica(d),
        onBorrar: borrarEntradaNumerica,
        onAceptar: aceptarEntradaNumerica
    });
}

function verificarContar() {
    if (contarBloqueado || !contarEntrada) return;
    const respuesta = parseInt(contarEntrada, 10);
    if (respuesta === contarCantidad) {
        contarBloqueado = true;
        desactivarEntradaNumerica();
        mostrarFeedback(elContarMensaje, MSG_BIEN, 'ok');
        hablarNumero(contarCantidad);
        registrarAciertoMat('contar');
        btnContarSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        sonidoIncorrecto();
        mostrarFeedback(elContarMensaje, MSG_CASI, 'mal');
        decirErrorOpcion(contarEntrada);
        registrarFalloMat('contar');
        contarEntrada = '';
        elContarPantalla.textContent = '?';
    }
}

btnContarSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(iniciarContar);
});
enlazarTactil('btn-contar-restaurar', restaurarObjetosContar);
enlazarTactil('btn-contar-decir', () => {
    if (contarEntrada) hablarNumeroEscrito(contarEntrada);
});

// --- Matemática 2: Vincular ---
let vincularDatos = [];
let vincularNums = [];
let vincularCantidadesValidas = new Set();
let vincularSelObj = null;
let vincularSelNum = null;
let vincularHechos = 0;
let vincularBloqueado = false;
let vincularEntradaKb = '';
/** Drag del número hacia un grupo: null | estado */
let dragVincular = null;
const UMBRAL_DRAG_VINCULAR_PX = 10;

const elVincularObjetos = document.getElementById('vincular-objetos');
const elVincularNumeros = document.getElementById('vincular-numeros');
const elVincularMensaje = document.getElementById('vincular-mensaje');
const btnVincularSiguiente = document.getElementById('btn-vincular-siguiente');

function limpiarDragVincular() {
    if (!dragVincular) return;
    dragVincular.ghost?.remove();
    const capa = document.getElementById('silabas-drag-layer');
    if (capa && capa.childElementCount === 0) capa.remove();
    document.querySelectorAll('.vincular-objetos.drag-over, .vincular-numero.arrastrando')
        .forEach((el) => el.classList.remove('drag-over', 'arrastrando'));
    document.body.classList.remove('vincular-dragging');
    dragVincular = null;
}

function grupoVincularBajoPunto(x, y) {
    const nodos = document.elementsFromPoint(x, y);
    for (const n of nodos) {
        const panel = n.closest?.('.vincular-objetos');
        if (panel && elVincularObjetos.contains(panel) && !panel.classList.contains('vinculado')) {
            return panel;
        }
    }
    return null;
}

function enlazarDragNumeroVincular(btn, j) {
    btn.style.touchAction = 'none';
    btn.addEventListener('pointerdown', (event) => {
        if (vincularBloqueado || btn.classList.contains('vinculado')) return;
        if (event.button != null && event.button !== 0) return;
        event.preventDefault();
        const rect = btn.getBoundingClientRect();
        dragVincular = {
            numIdx: j,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            moved: false,
            ghost: null,
            pointerId: event.pointerId,
            origenEl: btn
        };
        try {
            btn.setPointerCapture(event.pointerId);
        } catch {
            // ignore
        }
    });
}

function onPointerMoveVincular(event) {
    if (!dragVincular || event.pointerId !== dragVincular.pointerId) return;
    const x = event.clientX || event.touches?.[0]?.clientX || dragVincular.startX;
    const y = event.clientY || event.touches?.[0]?.clientY || dragVincular.startY;
    const dx = x - dragVincular.startX;
    const dy = y - dragVincular.startY;
    if (!dragVincular.moved && Math.hypot(dx, dy) < UMBRAL_DRAG_VINCULAR_PX) return;

    if (!dragVincular.moved) {
        dragVincular.moved = true;
        document.body.classList.add('vincular-dragging');
        dragVincular.origenEl.classList.add('arrastrando');
        dragVincular.ghost = crearGhostSilaba(
            dragVincular.origenEl,
            dragVincular.origenEl.textContent
        );
    }

    moverGhostSilaba(dragVincular.ghost, x, y, dragVincular.offsetX, dragVincular.offsetY);

    document.querySelectorAll('.vincular-objetos.drag-over').forEach((p) => p.classList.remove('drag-over'));
    const panel = grupoVincularBajoPunto(x, y);
    if (panel) panel.classList.add('drag-over');
}

function onPointerUpVincular(event) {
    if (!dragVincular || event.pointerId !== dragVincular.pointerId) return;
    const estado = dragVincular;
    const x = event.clientX || event.changedTouches?.[0]?.clientX || estado.startX;
    const y = event.clientY || event.changedTouches?.[0]?.clientY || estado.startY;
    const { numIdx, moved, origenEl } = estado;

    limpiarDragVincular();

    if (vincularBloqueado || origenEl.classList.contains('vinculado')) return;

    if (!moved) {
        sonidoPulsacionNumero(origenEl.textContent);
        seleccionarNumero(numIdx, origenEl);
        return;
    }

    const panel = grupoVincularBajoPunto(x, y);
    if (!panel) return;
    const i = Number(panel.dataset.idx);
    if (!Number.isFinite(i)) return;

    limpiarSeleccionVincular();
    vincularSelObj = i;
    vincularSelNum = numIdx;
    panel.classList.add('seleccionado');
    origenEl.classList.add('seleccionado');
    intentarVincular();
}

document.addEventListener('pointermove', onPointerMoveVincular, true);
document.addEventListener('pointerup', onPointerUpVincular, true);
document.addEventListener('pointercancel', onPointerUpVincular, true);

function iniciarVincular() {
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    limpiarDragVincular();
    vincularBloqueado = false;
    vincularHechos = 0;
    vincularSelObj = null;
    vincularSelNum = null;
    vincularEntradaKb = '';
    btnVincularSiguiente.classList.add('oculto');
    ocultarFeedback();

    const max = getMaxEnPantalla('vincular');
    const ronda = generarRondaVincular(max);
    const emojis = mezclar([...EMOJIS_CONTAR]).slice(0, VINCULAR_GRUPOS);
    vincularDatos = ronda.cantidades.map((n, i) => ({ cantidad: n, emoji: emojis[i] }));
    vincularNums = ronda.numeros;
    vincularCantidadesValidas = new Set(ronda.cantidades);

    elVincularObjetos.innerHTML = '';
    vincularDatos.forEach((dato, i) => {
        const panel = document.createElement('button');
        panel.type = 'button';
        panel.className = 'vincular-objetos';
        panel.dataset.idx = i;
        renderObjetosAgrupados(panel, dato.emoji, dato.cantidad, tamanioEmojiVincular);
        agregarActivacionTactil(panel, () => seleccionarObjeto(i, panel));
        elVincularObjetos.appendChild(panel);
    });

    elVincularNumeros.innerHTML = '';
    vincularNums.forEach((num, j) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vincular-numero';
        btn.textContent = num;
        btn.dataset.idx = j;
        enlazarDragNumeroVincular(btn, j);
        elVincularNumeros.appendChild(btn);
    });

    activarTecladoMat({
        onDigitoVincular: (d) => {
            if (vincularBloqueado || vincularSelObj === null) return;
            if (vincularEntradaKb.length >= maxDigitosJuego('vincular')) return;
            sonidoPulsacionNumero(d);
            vincularEntradaKb += d;
        },
        onBorrarVincular: () => {
            vincularEntradaKb = vincularEntradaKb.slice(0, -1);
        },
        onEnterVincular: () => {
            if (vincularSelObj === null || !vincularEntradaKb) return;
            const n = parseInt(vincularEntradaKb, 10);
            vincularEntradaKb = '';
            const j = [...elVincularNumeros.children].findIndex(
                (btn) => parseInt(btn.textContent, 10) === n && !btn.classList.contains('vinculado')
            );
            if (j >= 0) seleccionarNumero(j, elVincularNumeros.children[j]);
        }
    });
}

function limpiarSeleccionVincular() {
    vincularSelObj = null;
    vincularSelNum = null;
    elVincularObjetos.querySelectorAll('.seleccionado').forEach((e) => e.classList.remove('seleccionado'));
    elVincularNumeros.querySelectorAll('.seleccionado').forEach((e) => e.classList.remove('seleccionado'));
}

function seleccionarObjeto(i, panel) {
    if (vincularBloqueado || panel.classList.contains('vinculado')) return;
    elVincularObjetos.querySelectorAll('.seleccionado').forEach((e) => e.classList.remove('seleccionado'));
    vincularSelObj = i;
    panel.classList.add('seleccionado');
    if (vincularSelNum !== null) intentarVincular();
}

function seleccionarNumero(j, btn) {
    if (vincularBloqueado || btn.classList.contains('vinculado')) return;
    elVincularNumeros.querySelectorAll('.seleccionado').forEach((e) => e.classList.remove('seleccionado'));
    vincularSelNum = j;
    btn.classList.add('seleccionado');
    if (vincularSelObj !== null) intentarVincular();
}

function intentarVincular() {
    if (vincularSelObj === null || vincularSelNum === null) return;
    const cantidad = vincularDatos[vincularSelObj].cantidad;
    const numero = vincularNums[vincularSelNum];
    const panelObj = elVincularObjetos.children[vincularSelObj];
    const panelNum = elVincularNumeros.children[vincularSelNum];

    if (cantidad === numero && vincularCantidadesValidas.has(numero)) {
        panelObj.classList.remove('seleccionado');
        panelNum.classList.remove('seleccionado');
        panelObj.classList.add('vinculado');
        panelNum.classList.add('vinculado');
        hablarNumero(numero);
        vincularHechos++;
        limpiarSeleccionVincular();
        const ejercicioCompleto = vincularHechos === vincularDatos.length;
        if (!ejercicioCompleto) sonidoCorrecto();
        if (ejercicioCompleto) {
            vincularBloqueado = true;
            desactivarTecladoMat();
            mostrarFeedback(elVincularMensaje, MSG_BIEN, 'ok');
            registrarAciertoMat('vincular');
            btnVincularSiguiente.classList.remove('oculto');
            registrarEjercicioCompletado();
            programarAutoSiguiente();
        }
    } else {
        sonidoIncorrecto();
        mostrarFeedback(elVincularMensaje, MSG_CASI, 'mal');
        decirErrorOpcion(numero);
        registrarFalloMat('vincular');
        vincularEntradaKb = '';
        setTimeout(limpiarSeleccionVincular, 400);
    }
}

btnVincularSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(iniciarVincular);
});

// --- Matemática 3: Escribir número ---
let enObjetivo = 0;
let enEntrada = '';
let enBloqueado = false;

const elEnPantalla = document.getElementById('en-pantalla');
const elEnTeclado = document.getElementById('en-teclado');
const elEnMensaje = document.getElementById('en-mensaje');
const btnEnSiguiente = document.getElementById('btn-en-siguiente');

function iniciarEscribirNumero() {
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    enBloqueado = false;
    enEntrada = '';
    btnEnSiguiente.classList.add('oculto');
    ocultarFeedback();
    enObjetivo = numeroAleatorio(1, getNivelJuego('escribir-numero').max);
    elEnPantalla.textContent = '?';

    activarEntradaNumerica({
        bloqueado: () => enBloqueado,
        maxDigitos: () => maxDigitosJuego('escribir-numero'),
        valor: () => enEntrada,
        setValor: (v) => { enEntrada = v; },
        actualizarPantalla: () => {
            elEnPantalla.textContent = enEntrada || '?';
        },
        onAceptar: verificarEscribirNumero
    });

    montarTecladoNumerico(elEnTeclado, {
        maxDigitos: maxDigitosJuego('escribir-numero'),
        onDigito: (d) => digitoEntradaNumerica(d),
        onBorrar: borrarEntradaNumerica,
        onAceptar: aceptarEntradaNumerica
    });
    hablarNumero(enObjetivo);
}

function verificarEscribirNumero() {
    if (enBloqueado || !enEntrada) return;
    const respuesta = parseInt(enEntrada, 10);
    if (respuesta === enObjetivo) {
        enBloqueado = true;
        desactivarEntradaNumerica();
        mostrarFeedback(elEnMensaje, MSG_BIEN, 'ok');
        hablarNumero(enObjetivo);
        registrarAciertoMat('escribir-numero');
        btnEnSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        sonidoIncorrecto();
        mostrarFeedback(elEnMensaje, MSG_CASI, 'mal');
        decirErrorOpcion(enEntrada);
        registrarFalloMat('escribir-numero');
        enEntrada = '';
        elEnPantalla.textContent = '?';
    }
}

enlazarTactil('btn-en-escuchar', () => {
    if (!enBloqueado) hablarNumero(enObjetivo);
});
enlazarTactil('btn-en-decir', () => {
    if (enEntrada) hablarNumeroEscrito(enEntrada);
});
btnEnSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(iniciarEscribirNumero);
});

// --- Matemática 4: Elegir número ---
let elObjetivo = 0;
let elBloqueado = false;
let elEntradaKb = '';

const elElOpciones = document.getElementById('el-opciones');
const elElMensaje = document.getElementById('el-mensaje');
const btnElSiguiente = document.getElementById('btn-el-siguiente');

function iniciarElegirNumero() {
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    elBloqueado = false;
    elEntradaKb = '';
    btnElSiguiente.classList.add('oculto');
    ocultarFeedback();
    const max = getNivelJuego('elegir-numero').max;
    elObjetivo = numeroAleatorio(1, max);
    const opciones = numerosDistractores(elObjetivo, 3, 1, max);

    elElOpciones.innerHTML = '';
    opciones.forEach((num) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opcion-numero';
        btn.textContent = num;
        agregarActivacionTactil(btn, () => {
            if (btn.disabled || elBloqueado) return;
            sonidoPulsacionNumero(String(num));
            responderElegirNumero(num, btn);
        });
        elElOpciones.appendChild(btn);
    });

    activarTecladoMat({
        onDigitoVincular: (d) => {
            if (elBloqueado) return;
            if (elEntradaKb.length >= maxDigitosJuego('elegir-numero')) return;
            if (elEntradaKb === '' && d === '0') return;
            sonidoPulsacionNumero(d);
            elEntradaKb += d;
        },
        onBorrarVincular: () => {
            elEntradaKb = elEntradaKb.slice(0, -1);
        },
        onEnterVincular: () => {
            const n = parseInt(elEntradaKb, 10);
            elEntradaKb = '';
            if (!n) return;
            const btn = [...elElOpciones.children].find(
                (b) => parseInt(b.textContent, 10) === n && !b.disabled
            );
            if (btn) responderElegirNumero(n, btn);
        }
    });

    hablarNumero(elObjetivo);
}

function responderElegirNumero(num, btn) {
    if (elBloqueado || btn.disabled) return;
    const objetivo = Number(elObjetivo);
    const elegido = Number(num);
    if (elegido === objetivo) {
        elBloqueado = true;
        desactivarTecladoMat();
        btn.classList.add('correcta');
        mostrarFeedback(elElMensaje, MSG_BIEN, 'ok');
        registrarAciertoMat('elegir-numero');
        elElOpciones.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        btnElSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
        // Diferir voz: cancelar/reproducir en el mismo toque tilda Chrome/Android.
        setTimeout(() => hablarNumero(objetivo), 180);
    } else {
        btn.classList.add('incorrecta');
        btn.disabled = true;
        sonidoIncorrecto();
        mostrarFeedback(elElMensaje, MSG_CASI, 'mal');
        registrarFalloMat('elegir-numero');
        // Diferir TTS: cancelar voz en el mismo toque congela Chrome/Android.
        setTimeout(() => decirErrorOpcion(elegido), 180);
        setTimeout(() => btn.classList.remove('incorrecta'), 400);
    }
}

enlazarTactil('btn-el-escuchar', () => {
    if (!elBloqueado) hablarNumero(elObjetivo);
});
btnElSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(iniciarElegirNumero);
});

// --- Matemática 5: Sumar (escribir) ---
let seRonda = null;
let seEntrada = '';
let seBloqueado = false;

const elSeObjA = document.getElementById('se-objetos-a');
const elSeObjB = document.getElementById('se-objetos-b');
const elSeCantA = document.getElementById('se-cant-a');
const elSeCantB = document.getElementById('se-cant-b');
const elSePantalla = document.getElementById('se-pantalla');
const elSeTeclado = document.getElementById('se-teclado');
const elSeMensaje = document.getElementById('se-mensaje');
const btnSeSiguiente = document.getElementById('btn-se-siguiente');

function iniciarSumarEscribir() {
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    seBloqueado = false;
    seEntrada = '';
    btnSeSiguiente.classList.add('oculto');
    ocultarFeedback();
    seRonda = generarRondaSuma('sumar-escribir');
    montarPanelSuma(seRonda, elSeObjA, elSeCantA, elSeObjB, elSeCantB);
    elSePantalla.textContent = '?';

    activarEntradaNumerica({
        bloqueado: () => seBloqueado,
        maxDigitos: () => maxDigitosJuego('sumar-escribir'),
        valor: () => seEntrada,
        setValor: (v) => { seEntrada = v; },
        actualizarPantalla: () => {
            elSePantalla.textContent = seEntrada || '?';
        },
        onAceptar: verificarSumarEscribir
    });

    montarTecladoNumerico(elSeTeclado, {
        maxDigitos: maxDigitosJuego('sumar-escribir'),
        onDigito: (d) => digitoEntradaNumerica(d),
        onBorrar: borrarEntradaNumerica,
        onAceptar: aceptarEntradaNumerica
    });
}

function verificarSumarEscribir() {
    if (seBloqueado || !seEntrada || !seRonda) return;
    const respuesta = parseInt(seEntrada, 10);
    if (respuesta === seRonda.suma) {
        seBloqueado = true;
        desactivarEntradaNumerica();
        mostrarFeedback(elSeMensaje, MSG_BIEN, 'ok');
        hablarNumero(seRonda.suma);
        registrarAciertoMat('sumar-escribir');
        btnSeSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        sonidoIncorrecto();
        mostrarFeedback(elSeMensaje, MSG_CASI, 'mal');
        decirErrorOpcion(seEntrada);
        registrarFalloMat('sumar-escribir');
        seEntrada = '';
        elSePantalla.textContent = '?';
    }
}

enlazarTactil('btn-se-escuchar', () => {
    if (!seBloqueado && seRonda) hablarSuma(seRonda.a, seRonda.b);
});
enlazarTactil('btn-se-restaurar', () => {
    if (!seRonda) return;
    montarPanelSuma(seRonda, elSeObjA, elSeCantA, elSeObjB, elSeCantB);
});
enlazarTactil('btn-se-decir', () => {
    if (seEntrada) hablarNumeroEscrito(seEntrada);
});
btnSeSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(iniciarSumarEscribir);
});

// --- Matemática 6: Sumar (elegir) ---
let selRonda = null;
let selBloqueado = false;
let selEntradaKb = '';

const elSelObjA = document.getElementById('sel-objetos-a');
const elSelObjB = document.getElementById('sel-objetos-b');
const elSelCantA = document.getElementById('sel-cant-a');
const elSelCantB = document.getElementById('sel-cant-b');
const elSelOpciones = document.getElementById('sel-opciones');
const elSelMensaje = document.getElementById('sel-mensaje');
const btnSelSiguiente = document.getElementById('btn-sel-siguiente');

function iniciarSumarElegir() {
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    selBloqueado = false;
    selEntradaKb = '';
    btnSelSiguiente.classList.add('oculto');
    ocultarFeedback();
    selRonda = generarRondaSuma('sumar-elegir');
    montarPanelSuma(selRonda, elSelObjA, elSelCantA, elSelObjB, elSelCantB);

    const maxSuma = getMaxRespuesta('sumar-elegir');
    const opciones = numerosDistractores(selRonda.suma, 3, 2, maxSuma);

    elSelOpciones.innerHTML = '';
    opciones.forEach((num) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opcion-numero';
        btn.textContent = num;
        agregarActivacionTactil(btn, () => {
            if (btn.disabled || selBloqueado) return;
            sonidoPulsacionNumero(String(num));
            responderSumarElegir(num, btn);
        });
        elSelOpciones.appendChild(btn);
    });

    activarTecladoMat({
        onDigitoVincular: (d) => {
            if (selBloqueado) return;
            if (selEntradaKb.length >= maxDigitosJuego('sumar-elegir')) return;
            if (selEntradaKb === '' && d === '0') return;
            sonidoPulsacionNumero(d);
            selEntradaKb += d;
        },
        onBorrarVincular: () => {
            selEntradaKb = selEntradaKb.slice(0, -1);
        },
        onEnterVincular: () => {
            const n = parseInt(selEntradaKb, 10);
            selEntradaKb = '';
            if (!n) return;
            const btn = [...elSelOpciones.children].find(
                (b) => parseInt(b.textContent, 10) === n && !b.disabled
            );
            if (btn) responderSumarElegir(n, btn);
        }
    });
}

function responderSumarElegir(num, btn) {
    if (selBloqueado || !selRonda || btn.disabled) return;
    const suma = Number(selRonda.suma);
    const elegido = Number(num);
    if (elegido === suma) {
        selBloqueado = true;
        desactivarTecladoMat();
        btn.classList.add('correcta');
        mostrarFeedback(elSelMensaje, MSG_BIEN, 'ok');
        registrarAciertoMat('sumar-elegir');
        elSelOpciones.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        btnSelSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
        setTimeout(() => hablarNumero(suma), 180);
    } else {
        btn.classList.add('incorrecta');
        btn.disabled = true;
        sonidoIncorrecto();
        mostrarFeedback(elSelMensaje, MSG_CASI, 'mal');
        registrarFalloMat('sumar-elegir');
        setTimeout(() => decirErrorOpcion(elegido), 180);
        setTimeout(() => btn.classList.remove('incorrecta'), 400);
    }
}

enlazarTactil('btn-sel-escuchar', () => {
    if (!selBloqueado && selRonda) hablarSuma(selRonda.a, selRonda.b);
});
enlazarTactil('btn-sel-restaurar', () => {
    if (!selRonda) return;
    montarPanelSuma(selRonda, elSelObjA, elSelCantA, elSelObjB, elSelCantB);
});
btnSelSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(iniciarSumarElegir);
});

// --- Matemática 7: Restar (escribir) ---
let reRonda = null;
let reEntrada = '';
let reBloqueado = false;

const elReVisual = document.getElementById('re-visual');
const elReTotal = document.getElementById('re-total');
const elReMenos = document.getElementById('re-menos');
const elRePantalla = document.getElementById('re-pantalla');
const elReTeclado = document.getElementById('re-teclado');
const elReMensaje = document.getElementById('re-mensaje');
const btnReSiguiente = document.getElementById('btn-re-siguiente');

function actualizarExpresionResta(ronda, respuesta) {
    elReTotal.textContent = ronda.total;
    elReMenos.textContent = ronda.resta;
    elRePantalla.textContent = respuesta === '' || respuesta === undefined ? '?' : respuesta;
}

function iniciarRestarEscribir() {
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    reBloqueado = false;
    reEntrada = '';
    btnReSiguiente.classList.add('oculto');
    ocultarFeedback();
    reRonda = generarRondaResta('restar-escribir');
    montarPanelResta(reRonda, elReVisual);
    actualizarExpresionResta(reRonda, '');

    activarEntradaNumerica({
        bloqueado: () => reBloqueado,
        maxDigitos: () => maxDigitosJuego('restar-escribir'),
        valor: () => reEntrada,
        setValor: (v) => { reEntrada = v; },
        actualizarPantalla: () => {
            actualizarExpresionResta(reRonda, reEntrada);
        },
        onAceptar: verificarRestarEscribir
    });

    montarTecladoNumerico(elReTeclado, {
        maxDigitos: maxDigitosJuego('restar-escribir'),
        onDigito: (d) => digitoEntradaNumerica(d),
        onBorrar: borrarEntradaNumerica,
        onAceptar: aceptarEntradaNumerica
    });
}

function verificarRestarEscribir() {
    if (reBloqueado || !reEntrada || !reRonda) return;
    const respuesta = parseInt(reEntrada, 10);
    if (respuesta === reRonda.resultado) {
        reBloqueado = true;
        desactivarEntradaNumerica();
        mostrarFeedback(elReMensaje, MSG_BIEN, 'ok');
        actualizarExpresionResta(reRonda, reRonda.resultado);
        hablarNumero(reRonda.resultado);
        registrarAciertoMat('restar-escribir');
        btnReSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        sonidoIncorrecto();
        mostrarFeedback(elReMensaje, MSG_CASI, 'mal');
        decirErrorOpcion(reEntrada);
        registrarFalloMat('restar-escribir');
        reEntrada = '';
        actualizarExpresionResta(reRonda, '');
    }
}

enlazarTactil('btn-re-escuchar', () => {
    if (!reBloqueado && reRonda) hablarResta(reRonda.total, reRonda.resta);
});
enlazarTactil('btn-re-restaurar', () => {
    if (!reRonda) return;
    montarPanelResta(reRonda, elReVisual);
});
enlazarTactil('btn-re-decir', () => {
    if (reEntrada) hablarNumeroEscrito(reEntrada);
});
btnReSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(iniciarRestarEscribir);
});

function juegoAleatorioId() {
    return JUEGOS_ALEATORIOS[numeroAleatorio(0, JUEGOS_ALEATORIOS.length - 1)];
}

function mostrarEjercicioAleatorio() {
    cancelarAutoSiguiente();
    ocultarFeedback();
    detenerCamion();
    detenerFutbol();
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    menu.classList.add('oculto');
    seccionesJuego.forEach((s) => s.classList.add('oculto'));

    const id = juegoAleatorioId();
    actualizarNombreJuego(id);

    if (id === 'silabas') {
        juegoSilabas.classList.remove('oculto');
        if (!colaPalabras.length) colaPalabras = armarColaSilabas();
        indiceActual = numeroAleatorio(0, colaPalabras.length - 1);
        cargarPalabra();
    } else if (id === 'palabra-imagen') {
        juegoPalabraImagen.classList.remove('oculto');
        if (!colaPI.length) colaPI = mezclar(PALABRAS.map((_, i) => i));
        indicePI = numeroAleatorio(0, PALABRAS.length - 1);
        cargarPalabraImagen();
    } else if (id === 'imagen-palabra') {
        juegoImagenPalabra.classList.remove('oculto');
        if (!colaIP.length) colaIP = mezclar(PALABRAS.map((_, i) => i));
        indiceIP = numeroAleatorio(0, PALABRAS.length - 1);
        cargarImagenPalabra();
    } else if (id === 'camion') {
        juegoCamion.classList.remove('oculto');
        if (!colaCamion.length) colaCamion = mezclar(PALABRAS.map((_, i) => i));
        indiceCamion = numeroAleatorio(0, PALABRAS.length - 1);
        cargarCamion();
    } else if (id === 'futbol') {
        juegoFutbol.classList.remove('oculto');
        if (!colaFutbol.length) colaFutbol = mezclar(PALABRAS.map((_, i) => i));
        indiceFutbol = numeroAleatorio(0, PALABRAS.length - 1);
        cargarFutbol();
    } else if (id === 'contar') {
        juegoContar.classList.remove('oculto');
        iniciarContar();
    } else if (id === 'vincular') {
        juegoVincular.classList.remove('oculto');
        iniciarVincular();
    } else if (id === 'escribir-numero') {
        juegoEscribirNumero.classList.remove('oculto');
        iniciarEscribirNumero();
    } else if (id === 'elegir-numero') {
        juegoElegirNumero.classList.remove('oculto');
        iniciarElegirNumero();
    } else if (id === 'sumar-escribir') {
        juegoSumarEscribir.classList.remove('oculto');
        iniciarSumarEscribir();
    } else if (id === 'sumar-elegir') {
        juegoSumarElegir.classList.remove('oculto');
        iniciarSumarElegir();
    } else if (id === 'restar-escribir') {
        juegoRestarEscribir.classList.remove('oculto');
        iniciarRestarEscribir();
    }
}

function entrarModoAleatorio() {
    irAJuego('aleatorio');
}

(function iniciarRuta() {
    const inicial = leerRutaDesdeHash();
    history.replaceState({ app: 'juegos', juego: inicial }, '', urlParaRuta(inicial));
    pilaJuegos = 0;
    aplicarRuta(inicial);
})();
