import { PALABRAS } from './data/palabras.js';
import {
    MSG_CASI, MSG_BIEN, MSG_CINCO_EJERCICIOS,
    VINCULAR_GRUPOS, VINCULAR_NUMEROS_SIN_PAR, EMOJIS_CONTAR,
    NIVELES_CONTAR_UNIR, NIVELES_MAT, MIN_SILABAS_JUEGO,
    JUEGOS_ALEATORIOS, IDS_SIGUIENTE, AUTO_SIGUIENTE_MS
} from './config.js';
import {
    hablar, hablarSilaba, hablarCadena, hablarNumero, hablarNumeroEscrito,
    decirErrorOpcion, cancelarVoz
} from './speech.js';

let ejerciciosCompletados = 0;
let celebracionAbierta = false;

const elCelebracion = document.getElementById('celebracion-cinco');
const elCelebracionEmoji = document.getElementById('celebracion-emoji');

function cerrarCelebracion() {
    celebracionAbierta = false;
    elCelebracion.classList.add('oculto');
    if (haySiguienteVisible()) programarAutoSiguiente();
}

function mostrarCelebracionCinco() {
    cancelarAutoSiguiente();
    celebracionAbierta = true;
    elCelebracionEmoji.textContent = Math.random() < 0.5 ? '🎂' : '🎈🎈🎈🎈🎈';
    elCelebracion.classList.remove('oculto');
    sonidoCorrecto();
    hablar(MSG_CINCO_EJERCICIOS);
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

function aplicarModoLetras() {
    document.body.classList.toggle('modo-mayusculas', palabrasMayusculas);
    document.body.classList.toggle('modo-minusculas', !palabrasMayusculas);
    document.querySelectorAll('[data-toggle-mayus]').forEach((btn) => {
        btn.textContent = palabrasMayusculas ? 'a' : 'A';
        btn.title = palabrasMayusculas ? 'Cambiar a minúsculas' : 'Cambiar a mayúsculas';
    });
}

function alternarModoLetras() {
    palabrasMayusculas = !palabrasMayusculas;
    localStorage.setItem('palabrasMayus', palabrasMayusculas ? 'may' : 'min');
    aplicarModoLetras();
}

document.querySelectorAll('[data-toggle-mayus]').forEach((btn) => {
    btn.addEventListener('click', alternarModoLetras);
});
aplicarModoLetras();

// --- Audio matemática ---
let audioCtx = null;

function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
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

function sonidoIncorrecto() {
    const ctx = getAudio();
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

function numeroAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}



function generarRondaVincular(max) {
    const cantidades = new Set();
    while (cantidades.size < VINCULAR_GRUPOS) {
        cantidades.add(numeroAleatorio(1, max));
    }
    const correctos = [...cantidades];
    const distractores = new Set();
    let intentos = 0;
    while (distractores.size < VINCULAR_NUMEROS_SIN_PAR && intentos < 200) {
        intentos++;
        const n = numeroAleatorio(1, max);
        if (!cantidades.has(n)) distractores.add(n);
    }
    while (distractores.size < VINCULAR_NUMEROS_SIN_PAR) {
        const n = numeroAleatorio(1, max);
        if (![...correctos, ...distractores].includes(n)) distractores.add(n);
    }
    return {
        cantidades: correctos,
        numeros: mezclar([...correctos, ...distractores])
    };
}



let nivelContarUnir = Math.min(
    Math.max(parseInt(localStorage.getItem('nivelContarUnir') || '1', 10), 1),
    NIVELES_CONTAR_UNIR.length
);
let aciertosSeguidosContarUnir = 0;

let nivelMatematica = Math.min(
    Math.max(parseInt(localStorage.getItem('nivelMat') || '1', 10), 1),
    NIVELES_MAT.length
);
let aciertosSeguidosMat = 0;

function getNivelContarUnir() {
    return NIVELES_CONTAR_UNIR[nivelContarUnir - 1];
}

function getNivelMat() {
    return NIVELES_MAT[nivelMatematica - 1];
}

function maxDigitosContarUnir() {
    return getNivelContarUnir().max >= 10 ? 2 : 1;
}

function maxDigitosNivel() {
    return getNivelMat().max >= 10 ? 2 : 1;
}

function guardarNivelContarUnir() {
    localStorage.setItem('nivelContarUnir', String(nivelContarUnir));
}

function guardarNivelMat() {
    localStorage.setItem('nivelMat', String(nivelMatematica));
}

function montarBarraNiveles(contNiveles, niveles, nivelActual, alCambiar) {
    if (!contNiveles.dataset.montado) {
        contNiveles.innerHTML = '';
        niveles.forEach((n, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-nivel-mat';
            btn.textContent = String(i + 1);
            btn.title = n.label;
            btn.addEventListener('click', () => alCambiar(i + 1));
            contNiveles.appendChild(btn);
        });
        contNiveles.dataset.montado = '1';
    }
    contNiveles.querySelectorAll('.btn-nivel-mat').forEach((btn, i) => {
        btn.classList.toggle('activo', i + 1 === nivelActual);
    });
}

function actualizarBarrasContarUnir() {
    const nivel = getNivelContarUnir();
    document.querySelectorAll('[data-barra-contar-unir]').forEach((barra) => {
        const contNiveles = barra.querySelector('.barra-dificultad-niveles') || barra.querySelector('[id^="niveles-mat"]');
        const contRango = barra.querySelector('.barra-dificultad-rango') || barra.querySelector('[id^="rango-mat"]');
        if (!contNiveles) return;
        montarBarraNiveles(contNiveles, NIVELES_CONTAR_UNIR, nivelContarUnir, (n) => {
            nivelContarUnir = n;
            aciertosSeguidosContarUnir = 0;
            guardarNivelContarUnir();
            actualizarBarrasContarUnir();
        });
        if (contRango) {
            contRango.textContent = `Del ${nivel.label} · Unir: 4 imágenes y 6 números`;
        }
    });
}

function actualizarBarrasDificultad() {
    const nivel = getNivelMat();
    document.querySelectorAll('[data-barra-mat]').forEach((barra) => {
        const contNiveles = barra.querySelector('.barra-dificultad-niveles');
        const contRango = barra.querySelector('.barra-dificultad-rango');
        if (!contNiveles) return;
        montarBarraNiveles(contNiveles, NIVELES_MAT, nivelMatematica, (n) => {
            nivelMatematica = n;
            aciertosSeguidosMat = 0;
            guardarNivelMat();
            actualizarBarrasDificultad();
        });
        if (contRango) {
            contRango.textContent = `Números del ${nivel.label}`;
        }
    });
}

function montarBarrasDificultadJuego() {
    document.querySelectorAll('[data-barra-mat], [data-barra-contar-unir]').forEach((barra) => {
        if (barra.dataset.montado) return;
        barra.innerHTML = `
            <div class="barra-dificultad-titulo">Nivel de números</div>
            <div class="barra-dificultad-niveles"></div>
            <div class="barra-dificultad-rango"></div>`;
        barra.dataset.montado = '1';
    });
    actualizarBarrasContarUnir();
    actualizarBarrasDificultad();
}

function registrarAciertoContarUnir() {
    aciertosSeguidosContarUnir++;
    if (aciertosSeguidosContarUnir >= 5 && nivelContarUnir < NIVELES_CONTAR_UNIR.length) {
        nivelContarUnir++;
        aciertosSeguidosContarUnir = 0;
        guardarNivelContarUnir();
        actualizarBarrasContarUnir();
    }
}

function registrarFalloContarUnir() {
    aciertosSeguidosContarUnir = 0;
}

function registrarAciertoMat() {
    aciertosSeguidosMat++;
    if (aciertosSeguidosMat >= 5 && nivelMatematica < NIVELES_MAT.length) {
        nivelMatematica++;
        aciertosSeguidosMat = 0;
        guardarNivelMat();
        actualizarBarrasDificultad();
    }
}

function registrarFalloMat() {
    aciertosSeguidosMat = 0;
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
    const movil = window.matchMedia('(max-width: 520px)').matches;
    if (movil) {
        if (cantidad <= 6) return 'clamp(0.6rem, 3vw, 0.95rem)';
        if (cantidad <= 10) return 'clamp(0.5rem, 2.5vw, 0.8rem)';
        if (cantidad <= 15) return 'clamp(0.42rem, 2.1vw, 0.68rem)';
        return 'clamp(0.36rem, 1.8vw, 0.58rem)';
    }
    if (cantidad <= 6) return 'clamp(0.85rem, 3.8vh, 1.6rem)';
    if (cantidad <= 10) return 'clamp(0.7rem, 3vh, 1.25rem)';
    if (cantidad <= 15) return 'clamp(0.58rem, 2.5vh, 1rem)';
    return 'clamp(0.48rem, 2.1vh, 0.85rem)';
}

function renderObjetos(contenedor, emoji, cantidad) {
    contenedor.innerHTML = '';
    const fz = tamanioEmojiPorCantidad(cantidad);
    for (let i = 0; i < cantidad; i++) {
        const span = document.createElement('span');
        span.className = 'objeto-item';
        span.style.fontSize = fz;
        span.textContent = emoji;
        contenedor.appendChild(span);
    }
}

function numerosDistractores(correcto, cantidad, min, max) {
    const nums = new Set([correcto]);
    while (nums.size < cantidad) {
        const n = numeroAleatorio(min, max);
        nums.add(n);
    }
    return mezclar([...nums]);
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

const seccionesJuego = [
    juegoTeclado, juegoSilabas, juegoPalabraImagen, juegoImagenPalabra,
    juegoContar, juegoVincular, juegoEscribirNumero, juegoElegirNumero
];

let modoAleatorio = false;

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
        requestAnimationFrame(() => pantalla.focus());
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
}

function volverMenu() {
    cancelarAutoSiguiente();
    modoAleatorio = false;
    cancelarVoz();
    cerrarCelebracion();
    desactivarEntradaNumerica();
    desactivarTecladoMat();
    menu.classList.remove('oculto');
    seccionesJuego.forEach((s) => s.classList.add('oculto'));
    textoActual = '';
    pantalla.value = '';
    pantalla.blur();
}

document.querySelectorAll('[data-juego]').forEach((btn) => {
    btn.addEventListener('click', () => {
        if (btn.dataset.juego === 'aleatorio') {
            entrarModoAleatorio();
        } else {
            mostrarJuego(btn.dataset.juego);
        }
    });
});
document.querySelectorAll('[data-volver]').forEach((btn) => {
    btn.addEventListener('click', volverMenu);
});

// --- Juego teclado ---
const pantalla = document.getElementById('pantalla');
let textoActual = '';

function filtrarTextoTeclado(texto) {
    return texto.replace(/[^a-zñáéíóúüA-ZÑÁÉÍÓÚÜ ]/g, '');
}

function actualizarTecladoDesdeInput() {
    const filtrado = filtrarTextoTeclado(pantalla.value);
    if (filtrado !== pantalla.value) pantalla.value = filtrado;
    textoActual = filtrado;
    if (textoActual) hablarCadena(textoActual);
}

document.getElementById('btn-repetir').addEventListener('click', () => hablarCadena(textoActual));
document.getElementById('btn-borrar').addEventListener('click', () => {
    textoActual = '';
    pantalla.value = '';
    cancelarVoz();
    pantalla.focus();
});

pantalla.addEventListener('input', actualizarTecladoDesdeInput);
pantalla.addEventListener('click', () => pantalla.focus());

document.addEventListener('keydown', (event) => {
    const tecla = event.key;

    if (!juegoTeclado.classList.contains('oculto') && document.activeElement !== pantalla) {
        if (tecla.length === 1 && tecla.match(/[a-zñáéíóúüA-ZÑÁÉÍÓÚÜ ]/i)) {
            textoActual += tecla;
            pantalla.value = textoActual;
            hablarCadena(textoActual);
            event.preventDefault();
        } else if (tecla === 'Backspace') {
            textoActual = textoActual.slice(0, -1);
            pantalla.value = textoActual;
            if (textoActual !== '') hablarCadena(textoActual);
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
        elMensaje.textContent = '¡Muy bien!';
        elMensaje.classList.add('ok');
        hablar(palabraActual.palabra);
        btnSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
        renderSilabas();
    } else {
        elImagen.classList.add('error');
        elMensaje.textContent = MSG_CASI;
        elMensaje.classList.add('mal');
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

document.getElementById('btn-escuchar-pista').addEventListener('click', () => {
    if (palabraActual) hablar(palabraActual.palabra);
});

// --- Juego 3: Palabra → Imagen ---
let colaPI = [];
let indicePI = 0;
let bloqueadoPI = false;
let correctoPI = null;

const elPIPalabra = document.getElementById('pi-palabra');
const elPIOpciones = document.getElementById('pi-opciones');
const elPIMensaje = document.getElementById('pi-mensaje');
const elPIContador = document.getElementById('pi-contador');
const btnPISiguiente = document.getElementById('btn-pi-siguiente');

function iniciarPalabraImagen() {
    colaPI = mezclar(PALABRAS.map((_, i) => i));
    indicePI = 0;
    cargarPalabraImagen();
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
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            hablarSilaba(silaba);
        });
        wrap.appendChild(btn);
    });

    contenedor.appendChild(wrap);
}

function cargarPalabraImagen() {
    bloqueadoPI = false;
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
}

function responderPalabraImagen(idx, btn) {
    if (bloqueadoPI) return;
    if (idx === correctoPI) {
        bloqueadoPI = true;
        btn.classList.add('correcta');
        elPIMensaje.textContent = '¡Muy bien!';
        elPIMensaje.classList.add('ok');
        hablar(PALABRAS[correctoPI].palabra);
        elPIOpciones.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        btnPISiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        btn.classList.add('incorrecta');
        elPIMensaje.textContent = MSG_CASI;
        elPIMensaje.classList.add('mal');
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

document.getElementById('btn-pi-escuchar').addEventListener('click', () => {
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
        elIPMensaje.textContent = '¡Muy bien!';
        elIPMensaje.classList.add('ok');
        hablar(PALABRAS[correctoIP].palabra);
        elIPOpciones.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        btnIPSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        btn.classList.add('incorrecta');
        elIPMensaje.textContent = MSG_CASI;
        elIPMensaje.classList.add('mal');
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

document.getElementById('btn-ip-escuchar').addEventListener('click', () => {
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
    const nivel = getNivelContarUnir();
    contarCantidad = numeroAleatorio(1, nivel.max);
    const emoji = EMOJIS_CONTAR[numeroAleatorio(0, EMOJIS_CONTAR.length - 1)];
    renderObjetos(elContarObjetos, emoji, contarCantidad);
    elContarPantalla.textContent = '?';

    activarEntradaNumerica({
        bloqueado: () => contarBloqueado,
        maxDigitos: maxDigitosContarUnir,
        valor: () => contarEntrada,
        setValor: (v) => { contarEntrada = v; },
        actualizarPantalla: () => {
            elContarPantalla.textContent = contarEntrada || '?';
        },
        onAceptar: verificarContar
    });

    montarTecladoNumerico(elContarTeclado, {
        maxDigitos: maxDigitosContarUnir(),
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
        elContarMensaje.textContent = MSG_BIEN;
        elContarMensaje.classList.add('ok');
        hablarNumero(contarCantidad);
        registrarAciertoContarUnir();
        btnContarSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        sonidoIncorrecto();
        elContarMensaje.textContent = MSG_CASI;
        elContarMensaje.classList.add('mal');
        decirErrorOpcion(contarEntrada);
        registrarFalloContarUnir();
        contarEntrada = '';
        elContarPantalla.textContent = '?';
    }
}

btnContarSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(iniciarContar);
});
document.getElementById('btn-contar-decir').addEventListener('click', () => {
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

    const nivel = getNivelContarUnir();
    const ronda = generarRondaVincular(nivel.max);
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
        panel.addEventListener('click', () => seleccionarObjeto(i, panel));
        elVincularObjetos.appendChild(panel);
    });

    elVincularNumeros.innerHTML = '';
    vincularNums.forEach((num, j) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vincular-numero';
        btn.textContent = num;
        btn.dataset.idx = j;
        btn.addEventListener('click', () => seleccionarNumero(j, btn));
        elVincularNumeros.appendChild(btn);
    });

    activarTecladoMat({
        onDigitoVincular: (d) => {
            if (vincularBloqueado || vincularSelObj === null) return;
            if (vincularEntradaKb.length >= maxDigitosContarUnir()) return;
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
            elVincularMensaje.textContent = MSG_BIEN;
            elVincularMensaje.classList.add('ok');
            registrarAciertoContarUnir();
            btnVincularSiguiente.classList.remove('oculto');
            registrarEjercicioCompletado();
            programarAutoSiguiente();
        }
    } else {
        sonidoIncorrecto();
        elVincularMensaje.textContent = MSG_CASI;
        elVincularMensaje.classList.add('mal');
        decirErrorOpcion(numero);
        registrarFalloContarUnir();
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
    const nivel = getNivelMat();
    enObjetivo = numeroAleatorio(1, nivel.max);
    elEnPantalla.textContent = '?';

    activarEntradaNumerica({
        bloqueado: () => enBloqueado,
        maxDigitos: maxDigitosNivel,
        valor: () => enEntrada,
        setValor: (v) => { enEntrada = v; },
        actualizarPantalla: () => {
            elEnPantalla.textContent = enEntrada || '?';
        },
        onAceptar: verificarEscribirNumero
    });

    montarTecladoNumerico(elEnTeclado, {
        maxDigitos: maxDigitosNivel(),
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
        elEnMensaje.textContent = MSG_BIEN;
        elEnMensaje.classList.add('ok');
        hablarNumero(enObjetivo);
        registrarAciertoMat();
        btnEnSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        sonidoIncorrecto();
        elEnMensaje.textContent = MSG_CASI;
        elEnMensaje.classList.add('mal');
        decirErrorOpcion(enEntrada);
        registrarFalloMat();
        enEntrada = '';
        elEnPantalla.textContent = '?';
    }
}

document.getElementById('btn-en-escuchar').addEventListener('click', () => {
    if (!enBloqueado) hablarNumero(enObjetivo);
});
document.getElementById('btn-en-decir').addEventListener('click', () => {
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
    const nivel = getNivelMat();
    elObjetivo = numeroAleatorio(1, nivel.max);
    const opciones = numerosDistractores(elObjetivo, 3, 1, nivel.max);

    elElOpciones.innerHTML = '';
    opciones.forEach((num, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opcion-numero';
        btn.textContent = num;
        btn.addEventListener('click', () => responderElegirNumero(num, btn));
        elElOpciones.appendChild(btn);
    });

    activarTecladoMat({
        onDigitoVincular: (d) => {
            if (elBloqueado) return;
            if (elEntradaKb.length >= maxDigitosNivel()) return;
            if (elEntradaKb === '' && d === '0') return;
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
    if (elBloqueado) return;
    if (num === elObjetivo) {
        elBloqueado = true;
        desactivarTecladoMat();
        btn.classList.add('correcta');
        elElMensaje.textContent = MSG_BIEN;
        elElMensaje.classList.add('ok');
        hablarNumero(elObjetivo);
        registrarAciertoMat();
        elElOpciones.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        btnElSiguiente.classList.remove('oculto');
        registrarEjercicioCompletado();
        programarAutoSiguiente();
    } else {
        btn.classList.add('incorrecta');
        sonidoIncorrecto();
        elElMensaje.textContent = MSG_CASI;
        elElMensaje.classList.add('mal');
        decirErrorOpcion(num);
        registrarFalloMat();
        btn.disabled = true;
        setTimeout(() => btn.classList.remove('incorrecta'), 400);
    }
}

document.getElementById('btn-el-escuchar').addEventListener('click', () => {
    if (!elBloqueado) hablarNumero(elObjetivo);
});
btnElSiguiente.addEventListener('click', () => {
    avanzarDespuesDeAcierto(iniciarElegirNumero);
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
    }
}

function entrarModoAleatorio() {
    modoAleatorio = true;
    mostrarEjercicioAleatorio();
}

montarBarrasDificultadJuego();
actualizarBarrasDificultad();
