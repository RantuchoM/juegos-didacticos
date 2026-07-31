const SEEN_KEY = 'teclado:last-seen-build';

/**
 * Muestra un cartel de bienvenida si hay una versión nueva respecto a la última vista.
 * Los textos salen de version.json (title + changes).
 */
export async function initWhatsNew() {
  const overlay = document.getElementById('novedades');
  const lista = document.getElementById('novedades-lista');
  const titulo = document.getElementById('novedades-titulo');
  const btn = document.getElementById('btn-novedades-ok');
  if (!overlay || !lista || !titulo || !btn) return;

  let data;
  try {
    const res = await fetch(`./version.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    data = await res.json();
  } catch {
    return;
  }

  const buildId = data?.buildId;
  const changes = Array.isArray(data?.changes) ? data.changes.filter(Boolean) : [];
  if (!buildId || changes.length === 0) return;

  let seen = null;
  try {
    seen = localStorage.getItem(SEEN_KEY);
  } catch {
    /* ignore */
  }
  if (seen === buildId) return;

  titulo.textContent = data.title || '¡Novedades!';
  lista.replaceChildren(
    ...changes.map((texto) => {
      const li = document.createElement('li');
      li.textContent = texto;
      return li;
    })
  );

  const cerrar = () => {
    overlay.classList.add('oculto');
    try {
      localStorage.setItem(SEEN_KEY, buildId);
    } catch {
      /* ignore */
    }
  };

  btn.addEventListener('click', cerrar, { once: true });
  overlay.classList.remove('oculto');
}
