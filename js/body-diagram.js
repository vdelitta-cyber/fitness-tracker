// Spierkaart: blokkerig silhouet (voor en achter). Getrainde spiergroepen lichten op,
// helderder naarmate ze deze week meer volume kregen. Hoofd, core en onderbenen blijven neutraal.

const BODY_LABELS = {
  chest: 'borst', back: 'rug', shoulders: 'schouders', biceps: 'biceps', triceps: 'triceps',
  legs_quad: 'bovenbenen voor', legs_glute: 'billen en hamstrings',
};

const BODY_COMMON = `
  <rect x="42" y="4" width="16" height="18" data-cat="_"/>
  <rect x="46" y="23" width="8" height="5" data-cat="_"/>
  <rect x="22" y="30" width="14" height="14" data-cat="shoulders"/>
  <rect x="64" y="30" width="14" height="14" data-cat="shoulders"/>
  <rect x="20" y="70" width="11" height="26" data-cat="_"/>
  <rect x="69" y="70" width="11" height="26" data-cat="_"/>
  <rect x="38" y="134" width="11" height="44" data-cat="_"/>
  <rect x="51" y="134" width="11" height="44" data-cat="_"/>`;

const BODY_FRONT = `${BODY_COMMON}
  <rect x="37" y="30" width="12.5" height="18" data-cat="chest"/>
  <rect x="50.5" y="30" width="12.5" height="18" data-cat="chest"/>
  <rect x="37" y="49" width="26" height="30" data-cat="_"/>
  <rect x="22" y="45" width="11" height="24" data-cat="biceps"/>
  <rect x="67" y="45" width="11" height="24" data-cat="biceps"/>
  <rect x="37" y="80" width="26" height="8" data-cat="_"/>
  <rect x="37" y="89" width="12.5" height="44" data-cat="legs_quad"/>
  <rect x="50.5" y="89" width="12.5" height="44" data-cat="legs_quad"/>`;

const BODY_BACK = `${BODY_COMMON}
  <rect x="37" y="30" width="26" height="38" data-cat="back"/>
  <rect x="37" y="69" width="26" height="10" data-cat="_"/>
  <rect x="22" y="45" width="11" height="24" data-cat="triceps"/>
  <rect x="67" y="45" width="11" height="24" data-cat="triceps"/>
  <rect x="37" y="80" width="26" height="16" data-cat="legs_glute"/>
  <rect x="37" y="97" width="12.5" height="36" data-cat="legs_glute"/>
  <rect x="50.5" y="97" width="12.5" height="36" data-cat="legs_glute"/>`;

function renderBodyDiagram(containerEl, focus) {
  const trained = Object.keys(BODY_LABELS).filter((k) => focus[k] > 0);
  const max = trained.length ? Math.max(...trained.map((k) => focus[k])) : 1;
  const summary = trained.length
    ? 'Deze week getraind: ' + trained.map((k) => BODY_LABELS[k]).join(', ')
    : 'Nog geen spiergroepen getraind deze week';

  const figure = (parts, caption) => `
    <figure class="m-body-fig">
      <svg viewBox="16 0 68 182" class="m-body-svg" aria-hidden="true">${parts}</svg>
      <figcaption>${caption}</figcaption>
    </figure>`;
  containerEl.innerHTML = figure(BODY_FRONT, 'Voor') + figure(BODY_BACK, 'Achter');
  containerEl.setAttribute('role', 'img');
  containerEl.setAttribute('aria-label', summary);

  containerEl.querySelectorAll('rect').forEach((part) => {
    const value = focus[part.dataset.cat];
    if (!value) return;
    part.classList.add('on');
    part.style.fillOpacity = (0.3 + 0.7 * (value / max)).toFixed(2);
  });
}
