import {
    NIVELES_PRESET,
    MAX_PERSONALIZADO_DEFAULT,
    CONFIG_JUEGOS_MAT,
    IDS_JUEGOS_MAT
} from './config.js';
import { maxDigitosParaNumero } from './numeros-es.js';

const TOTAL_NIVELES = NIVELES_PRESET.length + 1;
const INDICE_PERSONALIZADO = TOTAL_NIVELES;

const aciertosSeguidos = Object.fromEntries(IDS_JUEGOS_MAT.map((id) => [id, 0]));

function claveNivel(juegoId) {
    return `nivelMat_${juegoId}`;
}

function claveCustom(juegoId) {
    return `customMax_${juegoId}`;
}

function normalizarIndiceNivel(valor, max = TOTAL_NIVELES) {
    const idx = parseInt(valor ?? '1', 10);
    if (!Number.isFinite(idx)) return 1;
    return Math.min(Math.max(idx, 1), max);
}

function migrarNivelesAntiguos() {
    const viejoContar = localStorage.getItem('nivelContarUnir');
    const viejoMat = localStorage.getItem('nivelMat');

    IDS_JUEGOS_MAT.forEach((juegoId) => {
        const clave = claveNivel(juegoId);
        if (localStorage.getItem(clave) !== null) return;

        const viejo = juegoId === 'contar' || juegoId === 'vincular'
            ? viejoContar
            : viejoMat;
        if (viejo === null) return;

        localStorage.setItem(clave, String(normalizarIndiceNivel(viejo, NIVELES_PRESET.length)));
    });

    localStorage.setItem('nivelMat_migrado_v2', '1');
}

function leerIndice(juegoId) {
    const clave = claveNivel(juegoId);
    const guardado = localStorage.getItem(clave);
    const indice = normalizarIndiceNivel(guardado);
    const normalizado = String(indice);
    if (guardado !== normalizado) {
        localStorage.setItem(clave, normalizado);
    }
    return indice;
}

function guardarIndice(juegoId, indice) {
    localStorage.setItem(claveNivel(juegoId), String(indice));
}

function leerCustomMax(juegoId) {
    const cfg = CONFIG_JUEGOS_MAT[juegoId];
    const limite = cfg?.maxPersonalizado ?? MAX_PERSONALIZADO_DEFAULT;
    const def = Math.min(MAX_PERSONALIZADO_DEFAULT, limite);
    const raw = parseInt(localStorage.getItem(claveCustom(juegoId)) || String(def), 10);
    const valor = Number.isFinite(raw) ? raw : def;
    return Math.min(Math.max(valor, 1), limite);
}

function guardarCustomMax(juegoId, max) {
    const cfg = CONFIG_JUEGOS_MAT[juegoId];
    const limite = cfg?.maxPersonalizado ?? MAX_PERSONALIZADO_DEFAULT;
    const def = Math.min(MAX_PERSONALIZADO_DEFAULT, limite);
    const parsed = Math.floor(Number(max));
    const valor = Number.isFinite(parsed)
        ? Math.min(Math.max(parsed, 1), limite)
        : def;
    localStorage.setItem(claveCustom(juegoId), String(valor));
}

export function esNivelPersonalizado(indice) {
    return indice === INDICE_PERSONALIZADO;
}

export function getIndiceNivel(juegoId) {
    return leerIndice(juegoId);
}

export function getNivelJuego(juegoId) {
    const indice = leerIndice(juegoId);
    if (esNivelPersonalizado(indice)) {
        const max = leerCustomMax(juegoId);
        return {
            indice,
            max,
            label: `1 – ${max}`,
            personalizado: true
        };
    }
    const preset = NIVELES_PRESET[indice - 1];
    if (!preset) {
        guardarIndice(juegoId, 1);
        return {
            indice: 1,
            max: NIVELES_PRESET[0].max,
            label: NIVELES_PRESET[0].label,
            personalizado: false
        };
    }
    return {
        indice,
        max: preset.max,
        label: preset.label,
        personalizado: false
    };
}

/** Máximo para generar cantidades en pantalla (contar / unir). */
export function getMaxEnPantalla(juegoId) {
    const nivel = getNivelJuego(juegoId);
    const tope = CONFIG_JUEGOS_MAT[juegoId]?.maxObjetosEnPantalla;
    if (tope) return Math.min(nivel.max, tope);
    return nivel.max;
}

/** Máximo de la respuesta correcta (sumas usan el doble del sumando). */
export function getMaxRespuesta(juegoId) {
    const nivel = getNivelJuego(juegoId);
    if (juegoId === 'sumar-escribir' || juegoId === 'sumar-elegir') {
        return nivel.max * 2;
    }
    if (juegoId === 'restar-escribir') {
        return getMaxEnPantalla(juegoId);
    }
    return getMaxEnPantalla(juegoId);
}

export function maxDigitosJuego(juegoId) {
    return maxDigitosParaNumero(getMaxRespuesta(juegoId));
}

export function registrarAciertoMat(juegoId) {
    aciertosSeguidos[juegoId] = (aciertosSeguidos[juegoId] || 0) + 1;
    if (aciertosSeguidos[juegoId] >= 5) {
        const indice = leerIndice(juegoId);
        if (indice < NIVELES_PRESET.length) {
            guardarIndice(juegoId, indice + 1);
            aciertosSeguidos[juegoId] = 0;
            actualizarBarrasMat();
        }
    }
}

export function registrarFalloMat(juegoId) {
    aciertosSeguidos[juegoId] = 0;
}

function montarBarraJuego(barra) {
    const juegoId = barra.dataset.barraMat;
    if (!juegoId || barra.dataset.montado) return;

    const cfg = CONFIG_JUEGOS_MAT[juegoId];
    barra.innerHTML = `
        <div class="barra-dificultad-titulo">Nivel — ${cfg?.titulo || juegoId}</div>
        <div class="barra-dificultad-niveles"></div>
        <div class="barra-dificultad-personalizado oculto">
            <label class="barra-custom-label">
                <span>Máximo:</span>
                <input type="number" class="barra-custom-input" min="1" inputmode="numeric" aria-label="Número máximo personalizado">
            </label>
            <button type="button" class="btn-custom-ok">OK</button>
        </div>
        <div class="barra-dificultad-rango"></div>`;
    barra.dataset.montado = '1';

    const contNiveles = barra.querySelector('.barra-dificultad-niveles');
    const panelCustom = barra.querySelector('.barra-dificultad-personalizado');
    const inputCustom = barra.querySelector('.barra-custom-input');
    const btnOk = barra.querySelector('.btn-custom-ok');

    const limiteCustom = cfg?.maxPersonalizado ?? MAX_PERSONALIZADO_DEFAULT;
    inputCustom.max = limiteCustom;
    inputCustom.value = leerCustomMax(juegoId);

    NIVELES_PRESET.forEach((n, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-nivel-mat';
        btn.textContent = String(i + 1);
        btn.title = n.label;
        btn.addEventListener('click', () => {
            guardarIndice(juegoId, i + 1);
            aciertosSeguidos[juegoId] = 0;
            actualizarBarrasMat();
        });
        contNiveles.appendChild(btn);
    });

    const btnPersonalizado = document.createElement('button');
    btnPersonalizado.type = 'button';
    btnPersonalizado.className = 'btn-nivel-mat btn-nivel-personalizado';
    btnPersonalizado.textContent = '★';
    btnPersonalizado.title = 'Personalizado — elegí el número máximo';
    btnPersonalizado.addEventListener('click', () => {
        guardarIndice(juegoId, INDICE_PERSONALIZADO);
        aciertosSeguidos[juegoId] = 0;
        actualizarBarrasMat();
        inputCustom.focus();
        inputCustom.select();
    });
    contNiveles.appendChild(btnPersonalizado);

    const aplicarCustom = () => {
        const valor = Math.floor(Number(inputCustom.value));
        if (!Number.isFinite(valor) || valor < 1) {
            inputCustom.value = leerCustomMax(juegoId);
            inputCustom.focus();
            inputCustom.select();
            return;
        }
        guardarCustomMax(juegoId, valor);
        guardarIndice(juegoId, INDICE_PERSONALIZADO);
        aciertosSeguidos[juegoId] = 0;
        actualizarBarrasMat();
    };

    btnOk.addEventListener('click', aplicarCustom);
    inputCustom.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            aplicarCustom();
        }
    });

    panelCustom.dataset.juego = juegoId;
}

function actualizarBarraJuego(barra) {
    const juegoId = barra.dataset.barraMat;
    if (!juegoId) return;

    montarBarraJuego(barra);

    const indice = leerIndice(juegoId);
    const nivel = getNivelJuego(juegoId);
    const cfg = CONFIG_JUEGOS_MAT[juegoId];

    barra.querySelectorAll('.btn-nivel-mat').forEach((btn, i) => {
        btn.classList.toggle('activo', i + 1 === indice);
    });

    const panelCustom = barra.querySelector('.barra-dificultad-personalizado');
    const inputCustom = barra.querySelector('.barra-custom-input');
    if (panelCustom) {
        panelCustom.classList.toggle('oculto', !esNivelPersonalizado(indice));
    }
    if (inputCustom && esNivelPersonalizado(indice)) {
        inputCustom.value = nivel.max;
    }

    const contRango = barra.querySelector('.barra-dificultad-rango');
    if (contRango && cfg) {
        contRango.textContent = cfg.descripcionRango(nivel);
    }
}

export function actualizarBarrasMat() {
    document.querySelectorAll('[data-barra-mat]').forEach(actualizarBarraJuego);
}

export function initDificultadMat() {
    migrarNivelesAntiguos();
    document.querySelectorAll('[data-barra-mat]').forEach((barra) => {
        montarBarraJuego(barra);
    });
    actualizarBarrasMat();
}
