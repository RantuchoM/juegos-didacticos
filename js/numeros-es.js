const UNIDADES = [
    'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'
];

const DIEZ_A_DIECINUEVE = [
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
    'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'
];

const DECENAS = [
    '', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta',
    'sesenta', 'setenta', 'ochenta', 'noventa'
];

function centenaTexto(c) {
    if (c === 1) return 'ciento';
    if (c === 5) return 'quinientos';
    if (c === 7) return 'setecientos';
    if (c === 9) return 'novecientos';
    return `${UNIDADES[c]}cientos`;
}

function hasta99(n) {
    if (n < 10) return UNIDADES[n];
    if (n < 20) return DIEZ_A_DIECINUEVE[n - 10];
    if (n < 30) return n === 20 ? 'veinte' : `veinti${UNIDADES[n - 20]}`;
    const dec = Math.floor(n / 10);
    const uni = n % 10;
    if (uni === 0) return DECENAS[dec];
    return `${DECENAS[dec]} y ${UNIDADES[uni]}`;
}

function hasta999(n) {
    if (n < 100) return hasta99(n);
    const cent = Math.floor(n / 100);
    const rest = n % 100;
    const textoCent = centenaTexto(cent);
    if (rest === 0) return cent === 1 ? 'cien' : textoCent;
    return `${textoCent} ${hasta99(rest)}`;
}

function hasta999999(n) {
    if (n < 1000) return hasta999(n);
    const miles = Math.floor(n / 1000);
    const rest = n % 1000;
    const textoMil = miles === 1 ? 'mil' : `${hasta999(miles)} mil`;
    if (rest === 0) return textoMil;
    return `${textoMil} ${hasta999(rest)}`;
}

/** Convierte un entero a palabras en español (ej. 134 → «ciento treinta y cuatro»). */
export function numeroATextoEspanol(valor) {
    const n = Math.floor(Number(valor));
    if (!Number.isFinite(n) || n < 0) return '';
    if (n > 999999) return String(n);
    return hasta999999(n);
}

export function maxDigitosParaNumero(max) {
    if (max >= 1000) return 4;
    if (max >= 100) return 3;
    if (max >= 10) return 2;
    return 1;
}
