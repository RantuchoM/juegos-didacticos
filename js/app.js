import { PALABRAS } from './data/palabras.js';
import {
    MSG_CASI, MSG_BIEN, MSG_CINCO_EJERCICIOS,
    VINCULAR_GRUPOS, VINCULAR_NUMEROS_SIN_PAR, EMOJIS_CONTAR,
    MIN_SILABAS_JUEGO,
    JUEGOS_ALEATORIOS, IDS_SIGUIENTE, AUTO_SIGUIENTE_MS
} from './config.js';
import {
    getNivelJuego, getMaxEnPantalla, getMaxRespuesta, maxDigitosJuego,
    registrarAciertoMat, registrarFalloMat
} from './dificultad-mat.js';
import { numeroATextoEspanol } from './numeros-es.js';
import {
    hablar, hablarSilaba, hablarCadena, hablarNumero, hablarNumeroEscrito,
    decirErrorOpcion, cancelarVoz
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

function registrarEjercicioCompletado() {
    ejerciciosCompletados++;
    if (ejerciciosCompletados % 5 === 0) {
        setTimeout(mostrarCelebracionCinco, 400);
    } else {
        sonidoFestejoEjercicio();
    }
}

document.getElementById('btn-celebracion-continuar').addEventListener('click', cerrarCelebracion);

let palabrasMayusculas = localStorage.getItem('palabrasMayus') !== 'min';
let lecturaFacil = localStorage.getItem('lecturaFacil') === '1';
let spoilerImagenes = localStorage.getItem('spoilerImagenes') === '1';
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
    const ctx = getAudio();
    reanudarAudioSiHaceFalta(ctx);
    const idx = typeof digito === 'string' && digito >= '0' && digito <= '9'
        ? parseInt(digito, 10)
        : 5;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = FREQ_PULSACION_NUMERO[idx];
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    const dur = 0.04;
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
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

/** Muestra feedback ok/mal sin dejar ambas clases (mal gana en CSS y dejaba «¡Muy bien!» en rojo). */
function mostrarFeedback(el, texto, tipo) {
    el.textContent = texto;
    el.classList.remove('ok', 'mal');
    el.classList.add(tipo);
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

    /** Diferir fuera del pointerup: disable/voz en el mismo gesto traban el táctil en móvil. */
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

function renderObjetos(contenedor, emoji, cantidad) {
    contenedor.innerHTML = '';
    contenedor.classList.toggle('objetos-grid--agrupado', cantidad > 10);

    if (cantidad <= 10) {
        const fz = tamanioEmojiPorCantidad(cantidad);
        for (let i = 0; i < cantidad; i++) {
            contenedor.appendChild(crearObjetoItem(emoji, fz));
        }
        return;
    }

    const decenasCompletas = Math.floor(cantidad / 10);
    const unidades = cantidad % 10;
    const fzDecena = tamanioEmojiPorCantidad(10);

    for (let d = 0; d < decenasCompletas; d++) {
        const grupo = document.createElement('div');
        grupo.className = 'objetos-decena marco-diez';
        grupo.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 10; i++) {
            grupo.appendChild(crearObjetoItem(emoji, fzDecena));
        }
        contenedor.appendChild(grupo);
    }

    if (unidades > 0) {
        const grupo = document.createElement('div');
        grupo.className = 'objetos-decena objetos-unidades';
        grupo.setAttribute('aria-hidden', 'true');
        const fzUnidades = tamanioEmojiPorCantidad(unidades);
        for (let i = 0; i < unidades; i++) {
            grupo.appendChild(crearObjetoItem(emoji, fzUnidades));
        }
        contenedor.appendChild(grupo);
    }
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
    contenedor.innerHTML = '';
    const fz = tamanioFn(cantidad);
    for (let i = 0; i < cantidad; i++) {
        const span = document.createElement('span');
        span.className = 'objeto-item';
        span.style.fontSize = fz;
        span.textContent = emoji;
        contenedor.appendChild(span);
    }
}

function montarPanelSuma(ronda, elObjA, elCantA, elObjB, elCantB) {
    renderObjetosEn(elObjA, ronda.emojiA, ronda.a, tamanioEmojiSuma);
    renderObjetosEn(elObjB, ronda.emojiB, ronda.b, tamanioEmojiSuma);
    elCantA.textContent = ronda.a;
    elCantB.textContent = ronda.b;
}

function hablarSuma(a, b) {
    hablar(`${numeroATextoEspanol(a)} más ${numeroATextoEspanol(b)}`);
}

function tamanioEmojiResta(cantidad) {
    if (cantidad <= 6) return 'clamp(1rem, 4.5vw, 1.6rem)';
    if (cantidad <= 12) return 'clamp(0.85rem, 3.8vw, 1.3rem)';
    if (cantidad <= 20) return 'clamp(0.72rem, 3.2vw, 1.1rem)';
    return 'clamp(0.58rem, 2.6vw, 0.9rem)';
}

function crearEmojiResta(emoji, cantidad) {
    const span = document.createElement('span');
    span.className = 'objeto-item';
    span.style.fontSize = tamanioEmojiResta(cantidad);
    span.textContent = emoji;
    return span;
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
    for (let i = 0; i < fuera; i++) {
        elFuera.appendChild(crearEmojiResta(emoji, fuera));
    }

    const elMarco = document.createElement('div');
    elMarco.className = 'resta-marco-menos';
    elMarco.setAttribute('aria-label', `${resta} para restar`);
    for (let i = 0; i < resta; i++) {
        elMarco.appendChild(crearEmojiResta(emoji, resta));
    }

    elVisual.appendChild(elFuera);
    elVisual.appendChild(elMarco);
}

function hablarResta(total, resta) {
    hablar(`${numeroATextoEspanol(total)} menos ${numeroATextoEspanol(resta)}`);
}

// --- Navegación ---
const menu = document.getElementById('menu');
const juegoTeclado = document.getElementById('juego-teclado');
const juegoSilabas = document.getElementById('juego-silabas');
const juegoPalabraImagen = document.getElementById('juego-palabra-imagen');
const juegoImagenPalabra = document.getElementById('juego-imagen-palabra');
const juegoContar = document.getElementById('juego-contar');
const juegoVincular = document.getElementById('juego-vincular');
const juegoEscribirNumero = document.getElementById('juego-escribir-numero');
const juegoElegirNumero = document.getElementById('juego-elegir-numero');
const juegoSumarEscribir = document.getElementById('juego-sumar-escribir');
const juegoSumarElegir = document.getElementById('juego-sumar-elegir');
const juegoRestarEscribir = document.getElementById('juego-restar-escribir');

const seccionesJuego = [
    juegoTeclado, juegoSilabas, juegoPalabraImagen, juegoImagenPalabra,
    juegoContar, juegoVincular, juegoEscribirNumero, juegoElegirNumero,
    juegoSumarEscribir, juegoSumarElegir, juegoRestarEscribir
];

const RUTAS_JUEGO = new Set([
    'teclado', 'silabas', 'palabra-imagen', 'imagen-palabra',
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

function mostrarJuego(id) {
    if (id !== 'aleatorio') modoAleatorio = false;
    cancelarAutoSiguiente();
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    menu.classList.add('oculto');
    seccionesJuego.forEach((s) => s.classList.add('oculto'));
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
    modoAleatorio = false;
    cancelarHablarTecladoProgramado();
    cancelarVoz();
    cerrarCelebracion();
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

(function iniciarRuta() {
    const inicial = leerRutaDesdeHash();
    history.replaceState({ app: 'juegos', juego: inicial }, '', urlParaRuta(inicial));
    pilaJuegos = 0;
    aplicarRuta(inicial);
})();

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

/** Espera a que terminen de tipear para leer la palabra formada (no cada letra suelta). */
function programarHablarTeclado() {
    if (!tecladoAutoVoz) return;
    if (tecladoHablarTimer !== null) clearTimeout(tecladoHablarTimer);
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

let colaPalabras = [];
let indiceActual = 0;
let palabraActual = null;
let fichas = [];
let slots = [];
let bloqueado = false;

const elImagen = document.getElementById('silabas-imagen');
const elZonas = document.getElementById('zonas-respuesta');
const elPool = document.getElementById('pool-silabas');
const elMensaje = document.getElementById('mensaje-silabas');
const elContador = document.getElementById('silabas-contador');
const btnSiguiente = document.getElementById('btn-siguiente');

function iniciarSilabas() {
    colaPalabras = armarColaSilabas();
    indiceActual = 0;
    cargarPalabra();
}

function cargarPalabra() {
    bloqueado = false;
    btnSiguiente.classList.add('oculto');
    elMensaje.textContent = '';
    elMensaje.className = 'mensaje-silabas';
    elImagen.classList.remove('acierto', 'error');

    palabraActual = PALABRAS[colaPalabras[indiceActual]];
    elContador.textContent = `Palabra ${indiceActual + 1} de ${colaPalabras.length}`;
    renderImagenEn(elImagen, palabraActual);

    fichas = palabraActual.silabas.map((texto, id) => ({ id, texto, usada: false }));
    fichas = mezclar(fichas);
    slots = new Array(palabraActual.silabas.length).fill(null);

    renderSilabas();
}

function renderSilabas() {
    elZonas.innerHTML = '';
    slots.forEach((fichaId, slotIdx) => {
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'slot-silaba' + (fichaId !== null ? ' lleno' : '');
        slot.textContent = fichaId !== null ? fichas.find((f) => f.id === fichaId).texto : '';
        slot.addEventListener('click', () => quitarDeSlot(slotIdx));
        elZonas.appendChild(slot);
    });

    elPool.innerHTML = '';
    fichas.forEach((ficha) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ficha-silaba';
        btn.textContent = ficha.texto;
        btn.disabled = ficha.usada || bloqueado;
        btn.addEventListener('click', () => ponerEnSlot(ficha.id));
        elPool.appendChild(btn);
    });
}

function primerSlotLibre() {
    return slots.findIndex((s) => s === null);
}

function ponerEnSlot(fichaId) {
    if (bloqueado) return;
    const idx = primerSlotLibre();
    if (idx === -1) return;
    sonidoPulsacionLetra();
    slots[idx] = fichaId;
    const silaba = fichas.find((f) => f.id === fichaId).texto;
    fichas.find((f) => f.id === fichaId).usada = true;
    renderSilabas();
    const completo = primerSlotLibre() === -1;
    hablarSilaba(silaba, completo ? verificar : null);
}

function quitarDeSlot(slotIdx) {
    if (bloqueado) return;
    const fichaId = slots[slotIdx];
    if (fichaId === null) return;
    slots[slotIdx] = null;
    fichas.find((f) => f.id === fichaId).usada = false;
    renderSilabas();
}

function verificar() {
    const orden = slots.map((id) => fichas.find((f) => f.id === id).texto);
    const correcto = orden.every((s, i) => s === palabraActual.silabas[i]);

    if (correcto) {
        bloqueado = true;
        elImagen.classList.add('acierto');
        mostrarFeedback(elMensaje, MSG_BIEN, 'ok');
        hablar(palabraActual.palabra);
        btnSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
        renderSilabas();
    } else {
        elImagen.classList.add('error');
        mostrarFeedback(elMensaje, MSG_CASI, 'mal');
        decirErrorOpcion();
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
    elPIMensaje.textContent = '';
    elPIMensaje.className = 'mensaje-quiz';

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
    elIPMensaje.textContent = '';
    elIPMensaje.className = 'mensaje-quiz';
    elIPImagen.classList.remove('acierto');

    correctoIP = colaIP[indiceIP];
    const item = PALABRAS[correctoIP];
    elIPContador.textContent = `Palabra ${indiceIP + 1} de ${PALABRAS.length}`;
    renderImagenEn(elIPImagen, item);

    elIPOpciones.innerHTML = '';
    indicesOpciones(correctoIP).forEach((idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opcion-palabra';
        btn.textContent = PALABRAS[idx].palabra;
        btn.addEventListener('click', () => responderImagenPalabra(idx, btn));
        elIPOpciones.appendChild(btn);
    });
}

function responderImagenPalabra(idx, btn) {
    if (bloqueadoIP) return;
    if (idx === correctoIP) {
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
        decirErrorOpcion(PALABRAS[idx].palabra);
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

// --- Matemática 1: Contar ---
let contarCantidad = 0;
let contarEntrada = '';
let contarBloqueado = false;

const elContarObjetos = document.getElementById('contar-objetos');
const elContarPantalla = document.getElementById('contar-pantalla');
const elContarTeclado = document.getElementById('contar-teclado');
const elContarMensaje = document.getElementById('contar-mensaje');
const btnContarSiguiente = document.getElementById('btn-contar-siguiente');

function iniciarContar() {
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    contarBloqueado = false;
    contarEntrada = '';
    btnContarSiguiente.classList.add('oculto');
    elContarMensaje.textContent = '';
    elContarMensaje.className = 'mensaje-quiz';
    const max = getMaxEnPantalla('contar');
    contarCantidad = numeroAleatorio(1, max);
    const emoji = EMOJIS_CONTAR[numeroAleatorio(0, EMOJIS_CONTAR.length - 1)];
    renderObjetos(elContarObjetos, emoji, contarCantidad);
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

const elVincularObjetos = document.getElementById('vincular-objetos');
const elVincularNumeros = document.getElementById('vincular-numeros');
const elVincularMensaje = document.getElementById('vincular-mensaje');
const btnVincularSiguiente = document.getElementById('btn-vincular-siguiente');

function iniciarVincular() {
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    vincularBloqueado = false;
    vincularHechos = 0;
    vincularSelObj = null;
    vincularSelNum = null;
    vincularEntradaKb = '';
    btnVincularSiguiente.classList.add('oculto');
    elVincularMensaje.textContent = '';
    elVincularMensaje.className = 'mensaje-quiz';

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
        for (let j = 0; j < dato.cantidad; j++) {
            const s = document.createElement('span');
            s.className = 'objeto-item';
            s.style.fontSize = tamanioEmojiVincular(dato.cantidad);
            s.textContent = dato.emoji;
            panel.appendChild(s);
        }
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
        agregarActivacionTactil(btn, () => {
            sonidoPulsacionNumero(String(num));
            seleccionarNumero(j, btn);
        });
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
    elEnMensaje.textContent = '';
    elEnMensaje.className = 'mensaje-quiz';
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
    elElMensaje.textContent = '';
    elElMensaje.className = 'mensaje-quiz';
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
    if (num === elObjetivo) {
        elBloqueado = true;
        desactivarTecladoMat();
        btn.classList.add('correcta');
        mostrarFeedback(elElMensaje, MSG_BIEN, 'ok');
        hablarNumero(elObjetivo);
        registrarAciertoMat('elegir-numero');
        elElOpciones.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        btnElSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        btn.classList.add('incorrecta');
        btn.disabled = true;
        sonidoIncorrecto();
        mostrarFeedback(elElMensaje, MSG_CASI, 'mal');
        registrarFalloMat('elegir-numero');
        // Diferir TTS: cancelar voz en el mismo toque congela Chrome/Android.
        setTimeout(() => decirErrorOpcion(num), 180);
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
    elSeMensaje.textContent = '';
    elSeMensaje.className = 'mensaje-quiz';
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
    elSelMensaje.textContent = '';
    elSelMensaje.className = 'mensaje-quiz';
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
    if (num === selRonda.suma) {
        selBloqueado = true;
        desactivarTecladoMat();
        btn.classList.add('correcta');
        mostrarFeedback(elSelMensaje, MSG_BIEN, 'ok');
        hablarNumero(selRonda.suma);
        registrarAciertoMat('sumar-elegir');
        elSelOpciones.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        btnSelSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        btn.classList.add('incorrecta');
        btn.disabled = true;
        sonidoIncorrecto();
        mostrarFeedback(elSelMensaje, MSG_CASI, 'mal');
        registrarFalloMat('sumar-elegir');
        setTimeout(() => decirErrorOpcion(num), 180);
        setTimeout(() => btn.classList.remove('incorrecta'), 400);
    }
}

enlazarTactil('btn-sel-escuchar', () => {
    if (!selBloqueado && selRonda) hablarSuma(selRonda.a, selRonda.b);
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
    elReMensaje.textContent = '';
    elReMensaje.className = 'mensaje-quiz';
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
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    menu.classList.add('oculto');
    seccionesJuego.forEach((s) => s.classList.add('oculto'));

    const id = juegoAleatorioId();

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
