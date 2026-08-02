export const MSG_CASI = '¡Casi!';
export const MSG_BIEN = '¡Muy bien!';
export const MSG_TIEMPO = '¡Se pasó el tiempo!';
export const MSG_CINCO_EJERCICIOS = '¡Muy bien, hiciste 5 ejercicios!';
/** Tiempo base (ms) que tarda el camión en llegar al cruce. */
export const CAMION_TIEMPO_MS = 7000;
/** Cambio de velocidad por acierto / error (0.04 = 4 %). */
export const CAMION_CAMBIO_VELOCIDAD = 0.04;
/** Tope de bonus de velocidad (0.5 = +50 %). */
export const CAMION_BONUS_MAX = 0.5;
/** Tiempo mínimo (ms) para que siga siendo jugable. */
export const CAMION_TIEMPO_MIN_MS = 2800;
/** Fútbol: segundos iniciales del temporizador opcional. */
export const FUTBOL_TIMER_INICIAL = 15;
/** Fútbol: mínimo / máximo de segundos por ronda con temporizador. */
export const FUTBOL_TIMER_MIN = 3;
export const FUTBOL_TIMER_MAX = 30;
export const VINCULAR_GRUPOS = 4;
export const VINCULAR_NUMEROS_SIN_PAR = 2;
export const EMOJIS_CONTAR = ['🍎', '⭐', '🐟', '🌸', '⚽', '🐞', '🍪', '🎈', '🚗', '🦋'];

export const NIVELES_PRESET = [
    { max: 5, label: '1 – 5' },
    { max: 10, label: '1 – 10' },
    { max: 20, label: '1 – 20' },
    { max: 50, label: '1 – 50' },
    { max: 99, label: '1 – 99' },
    { max: 999, label: '1 – 999' }
];

export const MAX_PERSONALIZADO_DEFAULT = 30;
export const MAX_PERSONALIZADO_LIMITE = 9999;

export const CONFIG_JUEGOS_MAT = {
    contar: {
        titulo: 'Contar',
        descripcionRango: (n) => `Contar del 1 al ${n.max}`,
        maxObjetosEnPantalla: 30,
        maxPersonalizado: 30
    },
    vincular: {
        titulo: 'Unir',
        descripcionRango: (n) => `Del ${n.label} · 4 grupos`,
        maxObjetosEnPantalla: 20,
        maxPersonalizado: 20
    },
    'escribir-numero': {
        titulo: 'Escribir',
        descripcionRango: (n) => `Números del ${n.label}`,
        maxPersonalizado: MAX_PERSONALIZADO_LIMITE
    },
    'elegir-numero': {
        titulo: 'Elegir',
        descripcionRango: (n) => `Números del ${n.label}`,
        maxPersonalizado: MAX_PERSONALIZADO_LIMITE
    },
    'sumar-escribir': {
        titulo: 'Sumar',
        descripcionRango: (n) => `Sumandos del 1 al ${n.max}`,
        maxPersonalizado: 500
    },
    'sumar-elegir': {
        titulo: 'Suma',
        descripcionRango: (n) => `Sumandos del 1 al ${n.max}`,
        maxPersonalizado: 500
    },
    'restar-escribir': {
        titulo: 'Restar',
        descripcionRango: (n) => `Totales del 1 al ${n.max}`,
        maxObjetosEnPantalla: 30,
        maxPersonalizado: 30
    }
};

export const IDS_JUEGOS_MAT = Object.keys(CONFIG_JUEGOS_MAT);

/** Nombre corto mostrado al lado de «Volver» (mismo texto que el menú). */
export const NOMBRES_JUEGO = {
    teclado: 'Teclado',
    silabas: 'Sílabas',
    'palabra-imagen': 'Palabra',
    'imagen-palabra': 'Imagen',
    explorar: 'Explorar',
    camion: 'Camión',
    futbol: 'Fútbol',
    contar: 'Contar',
    vincular: 'Unir',
    'escribir-numero': 'Escribir',
    'elegir-numero': 'Elegir',
    'sumar-escribir': 'Sumar',
    'sumar-elegir': 'Suma',
    'restar-escribir': 'Restar',
    aleatorio: 'Aleatorio'
};

export const MIN_SILABAS_JUEGO = 2;
export const JUEGOS_ALEATORIOS = [
    'silabas', 'palabra-imagen', 'imagen-palabra', 'camion', 'futbol',
    'contar', 'vincular', 'escribir-numero', 'elegir-numero',
    'sumar-escribir', 'sumar-elegir', 'restar-escribir'
];
export const IDS_SIGUIENTE = [
    'btn-siguiente', 'btn-pi-siguiente', 'btn-ip-siguiente', 'btn-camion-siguiente',
    'btn-futbol-siguiente',
    'btn-contar-siguiente', 'btn-vincular-siguiente',
    'btn-en-siguiente', 'btn-el-siguiente',
    'btn-se-siguiente', 'btn-sel-siguiente', 'btn-re-siguiente'
];

export const AUTO_SIGUIENTE_MS = 2200;

export const VOZ = {
    carpeta: 'audio/latino',
    formato: 'mp3',
    usarPersonalizada: true,
    // Audios locales: voz mexicana neural (Dalia). Fallback de red/synth: es-MX.
    preferirLatinoTTS: true,
    idiomaTTS: 'es-MX'
};

export const MENSAJE_AUDIO = {
    [MSG_CASI]: 'casi',
    [MSG_BIEN]: 'muy-bien',
    [MSG_TIEMPO]: 'casi'
};
