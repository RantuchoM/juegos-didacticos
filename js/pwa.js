/**
 * Actualización silenciosa al cargar (mismo criterio que OFRN en rutas /entradas):
 * al abrir la app busca SW nuevo, lo activa sin avisar y recarga una sola vez.
 */
const RELOAD_GUARD_KEY = 'teclado:pwa-reload-guard';
const RELOAD_GUARD_WINDOW_MS = 15_000;
const RELOAD_GUARD_MAX = 2;
const RELOAD_FALLBACK_MS = 2500;
const VERSION_POLL_MS = 2 * 60 * 1000;
const LOCAL_BUILD_ID = 'v26';

function readReloadGuard() {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (!raw) return { count: 0, startedAt: 0 };
    return JSON.parse(raw);
  } catch {
    return { count: 0, startedAt: 0 };
  }
}

function markReloadAttempt() {
  const now = Date.now();
  const prev = readReloadGuard();
  const inWindow = prev.startedAt && now - prev.startedAt < RELOAD_GUARD_WINDOW_MS;
  const count = inWindow ? prev.count + 1 : 1;
  const startedAt = inWindow ? prev.startedAt : now;
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify({ count, startedAt }));
  } catch {
    /* ignore */
  }
  return count;
}

function clearReloadGuard() {
  try {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    /* ignore */
  }
}

function reloadPageWithGuard(reloadPendingRef) {
  if (reloadPendingRef.current) return false;
  const count = markReloadAttempt();
  if (count > RELOAD_GUARD_MAX) {
    console.warn('[PWA] Recargas repetidas; se detiene la actualización automática.');
    reloadPendingRef.current = false;
    return false;
  }
  reloadPendingRef.current = true;
  window.location.reload();
  return true;
}

async function fetchRemoteBuildId() {
  try {
    const res = await fetch(`./version.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.buildId ?? null;
  } catch {
    return null;
  }
}

function activateWaiting(worker) {
  if (!worker) return;
  worker.postMessage('SKIP_WAITING');
}

export function initPwa() {
  if (!('serviceWorker' in navigator)) return;

  const reloadPendingRef = { current: false };
  let fallbackTimer = null;
  let activating = false;

  const clearFallback = () => {
    if (fallbackTimer != null) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
  };

  const scheduleIosFallbackReload = () => {
    clearFallback();
    fallbackTimer = window.setTimeout(() => {
      fallbackTimer = null;
      reloadPageWithGuard(reloadPendingRef);
    }, RELOAD_FALLBACK_MS);
  };

  const applyWaitingSilently = (registration) => {
    if (!registration?.waiting || activating) return;
    activating = true;
    scheduleIosFallbackReload();
    activateWaiting(registration.waiting);
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    clearFallback();
    reloadPageWithGuard(reloadPendingRef);
  });

  const boot = async () => {
    let registration;
    try {
      registration = await navigator.serviceWorker.register('./sw.js');
    } catch (err) {
      console.warn('No se pudo registrar el service worker:', err);
      return;
    }

    const checkForNewVersion = async () => {
      registration.update().catch(() => {});
      const remote = await fetchRemoteBuildId();
      if (remote && remote === LOCAL_BUILD_ID) {
        clearReloadGuard();
      }
      // Si el servidor ya publicó otro buildId, forzar activación del SW en espera
      if (remote && remote !== LOCAL_BUILD_ID) {
        applyWaitingSilently(registration);
      }
    };

    // Al cargar: buscar update y aplicarlo en silencio
    await checkForNewVersion();
    applyWaitingSilently(registration);

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          activating = false;
          applyWaitingSilently(registration);
        }
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void checkForNewVersion();
    });
    window.addEventListener('focus', () => void checkForNewVersion());
    setInterval(() => void checkForNewVersion(), VERSION_POLL_MS);
  };

  if (document.readyState === 'complete') {
    void boot();
  } else {
    window.addEventListener('load', () => void boot(), { once: true });
  }
}
