// Hoofdlogica: state, rendering, event handling.

const state = {
  type: Storage.getLastType(),
  selectedExercise: null,
  lastWeight: '',
  lastReps: '',
  justLogged: false,
};

const el = (id) => document.getElementById(id);

const WEEKLY_TARGET_DAYS = 5;

function init() {
  injectStaticIcons();
  Storage.seedStartingWeights();
  buildTypeSelect();
  bindTabs();
  bindLogTab();
  bindSettingsTab();
  bindPRTab();
  renderType();
  renderDashboard();
  renderSessionSummary();
  renderSearchResults('');

  SheetsSync.onStatusChange(renderSyncBadge);
  SheetsSync.init();
  el('clientIdInput').value = SheetsSync.getClientId();
  renderSettingsTab();
}

function injectStaticIcons() {
  document.querySelectorAll('.dash-tile')[0].querySelector('.dash-icon').innerHTML = ICONS.volume;
  document.querySelectorAll('.dash-tile')[1].querySelector('.dash-icon').innerHTML = ICONS.sets;
  document.querySelectorAll('.dash-tile')[2].querySelector('.dash-icon').innerHTML = ICONS.calendar;
  el('exerciseLogger').querySelector('.search-icon').innerHTML = ICONS.search;
  el('prExpandBtn').querySelector('.icon').innerHTML = ICONS.chevronDown;
}

function renderDashboard() {
  const weekly = Storage.getWeeklyVolume();
  const days = Object.keys(weekly.perDay).length;
  el('dashVolume').textContent = weekly.totalVolume.toLocaleString('nl-NL') + 'kg';
  el('dashSets').textContent = weekly.totalSets;
  el('dashDays').textContent = days;

  const pct = Math.min(100, Math.round((days / WEEKLY_TARGET_DAYS) * 100));
  el('dashProgressPct').textContent = pct + '%';
  const fill = el('dashProgressFill');
  fill.style.width = pct + '%';
  fill.classList.toggle('complete', pct > 80);
}

// ---------- Tabs ----------

function bindTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      el('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'analytics') renderAnalyticsTab();
      if (btn.dataset.tab === 'history') renderPRTab();
      if (btn.dataset.tab === 'settings') renderSettingsTab();
    });
  });
  el('syncBtn').addEventListener('click', () => {
    document.querySelector('.tab[data-tab="settings"]').click();
  });
}

// ---------- Trainingstype ----------

function buildTypeSelect() {
  const select = el('daySelect');
  select.innerHTML = TRAINING_TYPE_ORDER.map((key) => {
    const cfg = TRAINING_TYPES[key];
    return `<option value="${key}">${cfg.label}</option>`;
  }).join('');
  select.value = state.type;
  select.addEventListener('change', () => {
    state.type = select.value;
    Storage.setLastType(state.type);
    resetExerciseSelection();
    renderType();
    renderSearchResults(el('exerciseSearch').value);
  });
}

function renderType() {
  const cfg = TRAINING_TYPES[state.type];
  el('dayTypeBadge').textContent = cfg.label;
  el('dayTypeBadge').className = 'day-badge ' + state.type;
}

// ---------- Log tab: zoeken ----------

function bindLogTab() {
  const search = el('exerciseSearch');
  search.addEventListener('input', () => renderSearchResults(search.value));
  search.addEventListener('focus', () => renderSearchResults(search.value));

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) {
      el('searchResults').classList.remove('show');
    }
  });

  el('setForm').addEventListener('submit', (e) => {
    e.preventDefault();
    logCurrentSet();
  });

  el('addAnotherSetBtn').addEventListener('click', () => {
    state.justLogged = false;
    el('justLoggedActions').classList.add('hidden');
    el('setForm').classList.remove('hidden');
    el('repsInput').focus();
  });

  el('newExerciseBtn').addEventListener('click', resetExerciseSelection);
}

function renderSearchResults(query) {
  const cfg = TRAINING_TYPES[state.type];
  const box = el('searchResults');
  const q = query.trim().toLowerCase();
  const usage = Storage.getUsage();

  let results = EXERCISES.filter((ex) => {
    if (!cfg.categories.includes(ex.category)) return false;
    if (ex.category === 'legs' && cfg.legFocus) return ex.focus === cfg.legFocus;
    return true;
  });
  if (q) results = results.filter((ex) => ex.name.toLowerCase().includes(q));

  results = results.sort((a, b) => {
    const ua = usage[a.id] || 0;
    const ub = usage[b.id] || 0;
    if (ub !== ua) return ub - ua;
    return a.name.localeCompare(b.name);
  });

  if (results.length === 0) {
    box.innerHTML = `<div class="search-empty">Geen oefeningen gevonden voor ${cfg.label}</div>`;
    box.classList.add('show');
    return;
  }

  box.innerHTML = results.slice(0, 30).map((ex) => {
    const count = usage[ex.id] || 0;
    return `<div class="search-result" data-id="${ex.id}">
      <span class="ex-name">${ex.name}</span>
      <span class="ex-meta">${CATEGORY_LABELS[ex.category]}${count ? ` · ${count}x gelogd` : ''}</span>
    </div>`;
  }).join('');
  box.classList.add('show');

  box.querySelectorAll('.search-result').forEach((row) => {
    row.addEventListener('click', () => selectExercise(row.dataset.id));
  });
}

// ---------- Oefening selecteren + geschiedenis ----------

function selectExercise(exerciseId) {
  const ex = EXERCISES.find((e) => e.id === exerciseId);
  if (!ex) return;
  state.selectedExercise = ex;
  state.justLogged = false;

  el('exerciseSearch').value = ex.name;
  el('searchResults').classList.remove('show');
  el('selectedExercisePanel').classList.remove('hidden');
  el('selectedExerciseName').textContent = ex.name;
  el('setForm').classList.remove('hidden');
  el('justLoggedActions').classList.add('hidden');

  renderExerciseHistory(ex.id);

  if (state.lastWeight) el('weightInput').value = state.lastWeight;
  el('repsInput').value = '';
  el('weightInput').focus();
}

function renderExerciseHistory(exerciseId) {
  const history = Storage.getHistoryForExercise(exerciseId, 5);
  const box = el('exerciseHistory');
  if (history.length === 0) {
    box.innerHTML = `<p class="muted">Nog geen geschiedenis voor deze oefening.</p>`;
    return;
  }
  box.innerHTML = `<p class="history-label">Laatste ${history.length} keer</p>` + history.map((s) => `
    <div class="history-row ${s.setType}">
      <span class="hist-date">${formatDateShort(s.date)}</span>
      <span class="hist-weight">${s.weight}kg</span>
      <span class="hist-reps">x${s.reps}</span>
      <span class="hist-type">${s.setType === 'warmup' ? 'Warmup' : 'Working'}</span>
    </div>
  `).join('');
}

function resetExerciseSelection() {
  state.selectedExercise = null;
  state.justLogged = false;
  el('exerciseSearch').value = '';
  el('selectedExercisePanel').classList.add('hidden');
  el('setForm').reset();
  el('exerciseSearch').focus();
}

// ---------- Set loggen ----------

function logCurrentSet() {
  const ex = state.selectedExercise;
  if (!ex) return;
  const weight = parseFloat(el('weightInput').value);
  const reps = parseInt(el('repsInput').value, 10);
  const setType = document.querySelector('input[name="setType"]:checked').value;

  if (isNaN(weight) || weight <= 0 || isNaN(reps) || reps <= 0) {
    alert('Vul een geldig gewicht en aantal reps in.');
    return;
  }

  const cfg = TRAINING_TYPES[state.type];
  Storage.addSet({
    date: getLocalDateStr(),
    day: cfg.label,
    exerciseId: ex.id,
    exercise: ex.name,
    category: ex.category,
    weight,
    reps,
    setType,
  });

  state.lastWeight = weight;
  state.lastReps = reps;

  renderExerciseHistory(ex.id);
  renderSessionSummary();
  renderDashboard();

  el('setForm').classList.add('hidden');
  el('justLoggedActions').classList.remove('hidden');
  state.justLogged = true;

  if (SheetsSync.status === 'connected') SheetsSync.syncNow();
}

// ---------- Sessie overzicht ----------

function renderSessionSummary() {
  const today = getLocalDateStr();
  const sets = Storage.getSetsForDate(today).filter((s) => s.notes !== 'Startgewicht');
  const box = el('sessionList');

  if (sets.length === 0) {
    box.innerHTML = `<p class="muted">Nog geen sets gelogd vandaag.</p>`;
    return;
  }

  const byExercise = {};
  for (const s of sets) {
    byExercise[s.exerciseId] = byExercise[s.exerciseId] || { name: s.exercise, sets: [] };
    byExercise[s.exerciseId].sets.push(s);
  }
  const prs = Storage.getPRs();
  const prMap = Object.fromEntries(prs.map((pr) => [pr.exerciseId, pr.weight]));

  box.innerHTML = Object.entries(byExercise).map(([exerciseId, data]) => {
    const pr = prMap[exerciseId];
    return `
    <div class="exercise-card">
      <div class="exercise-card-header">
        <span class="exercise-card-name">${data.name}</span>
        ${pr ? `<span class="exercise-card-pr">${icon('trophy')}PR ${pr}kg</span>` : ''}
      </div>
      <div class="exercise-card-sets">
        ${data.sets.map((s) => `
          <span class="set-pill ${s.setType}">
            <span class="set-pill-value">${s.weight}kg × ${s.reps}</span>
            <span class="set-pill-badge">${s.setType === 'warmup' ? 'Warmup' : 'Working'}</span>
          </span>
        `).join('')}
      </div>
    </div>`;
  }).join('');
}

// ---------- Analytics tab ----------

function renderAnalyticsTab() {
  const allSets = Storage.getAllSets().filter((s) => s.setType === 'working');
  const exerciseIds = [...new Set(allSets.map((s) => s.exerciseId))];
  const select = el('analyticsExerciseSelect');

  if (exerciseIds.length === 0) {
    select.innerHTML = '<option>Nog geen data</option>';
    el('progressionInsight').innerHTML = '<p class="muted">Log eerst wat working sets om progressie te zien.</p>';
  } else {
    const prevValue = select.value;
    select.innerHTML = exerciseIds.map((id) => {
      const ex = EXERCISES.find((e) => e.id === id);
      return `<option value="${id}">${ex ? ex.name : id}</option>`;
    }).join('');
    if (exerciseIds.includes(prevValue)) select.value = prevValue;
    renderProgressionFor(select.value);
  }

  select.onchange = () => renderProgressionFor(select.value);

  const weekly = Storage.getWeeklyVolume();
  ChartsUI.renderWeeklyVolume(el('volumeCanvas'), weekly.perDay);
  el('weeklyStats').innerHTML = `
    <div class="stat"><span class="stat-value">${weekly.totalVolume.toLocaleString('nl-NL')}kg</span><span class="stat-label">Totaal volume</span></div>
    <div class="stat"><span class="stat-value">${weekly.totalSets}</span><span class="stat-label">Working sets</span></div>
    <div class="stat"><span class="stat-value">${Object.keys(weekly.perDay).length}</span><span class="stat-label">Trainingsdagen</span></div>
  `;

  ChartsUI.renderVolumeTrend(el('volumeTrendCanvas'), Storage.getVolumeByWeek(8));

  const focus = Storage.getMuscleFocusThisWeek();
  const hasFocus = Object.keys(focus).length > 0;
  el('muscleFocusCanvas').classList.toggle('hidden', !hasFocus);
  el('muscleFocusEmpty').classList.toggle('hidden', hasFocus);
  if (hasFocus) ChartsUI.renderMuscleFocus(el('muscleFocusCanvas'), focus);

  renderConsistencyCalendar();
}

function renderConsistencyCalendar() {
  const days = Storage.getConsistencyDays(28);
  el('consistencyCalendar').innerHTML = days.map((d) => {
    const label = new Date(d.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' });
    return `<div class="consistency-box ${d.trained ? 'on' : 'off'}" title="${label}"></div>`;
  }).join('');
}

function renderProgressionFor(exerciseId) {
  const sets = Storage.getWorkingSets(exerciseId);
  if (sets.length === 0) return;
  ChartsUI.renderProgression(el('progressionCanvas'), sets);
  el('progressionInsight').innerHTML = buildInsight(sets);
}

function buildInsight(sets) {
  const byDate = {};
  for (const s of sets) {
    if (!byDate[s.date] || s.weight > byDate[s.date]) byDate[s.date] = s.weight;
  }
  const sessions = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));
  if (sessions.length < 2) {
    return '<p class="muted">Nog niet genoeg sessies voor een trend.</p>';
  }
  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  const diff = last[1] - prev[1];
  const pct = ((diff / prev[1]) * 100).toFixed(1);

  if (diff > 0) {
    return `<p class="insight up">📈 Progressie: van ${prev[1]}kg naar ${last[1]}kg (+${pct}%)</p>`;
  }

  const lastThree = sessions.slice(-3).map((s) => s[1]);
  const stagnant = lastThree.length === 3 && lastThree.every((w) => w === lastThree[0]);
  if (stagnant) {
    return `<p class="insight warn">⚠️ Stagnatie: al ${lastThree.length} sessies op ${lastThree[0]}kg. Probeer meer reps of een kleine gewichtstoename.</p>`;
  }
  if (diff < 0) {
    return `<p class="insight down">↓ ${prev[1]}kg → ${last[1]}kg. Lichte terugval, mogelijk deload of vermoeidheid.</p>`;
  }
  return `<p class="insight">Stabiel op ${last[1]}kg.</p>`;
}

// ---------- PR tab ----------

function bindPRTab() {
  el('prExpandBtn').addEventListener('click', () => {
    const list = el('prRestList');
    const expanded = !list.classList.contains('hidden');
    list.classList.toggle('hidden', expanded);
    el('prExpandBtn').classList.toggle('open', !expanded);
  });
}

function renderPRTab() {
  const prs = Storage.getPRs().sort((a, b) => b.weight - a.weight);
  const topBox = el('prTopList');
  const restBox = el('prRestList');
  const expandBtn = el('prExpandBtn');

  if (prs.length === 0) {
    topBox.innerHTML = '<p class="muted">Nog geen PRs gelogd.</p>';
    el('prExpandCard').classList.add('hidden');
    restBox.innerHTML = '';
    return;
  }

  const top = prs.slice(0, 5);
  const rest = prs.slice(5);

  topBox.innerHTML = top.map((pr) => `
    <div class="pr-featured">
      <div class="pr-featured-icon">${icon('trophy')}</div>
      <div class="pr-featured-body">
        <div class="pr-featured-name">${pr.exercise}</div>
        <div class="pr-featured-meta">${CATEGORY_LABELS[pr.category] || ''} · ${formatDateShort(pr.date)}</div>
      </div>
      <div class="pr-featured-value">${pr.weight}<span class="unit">kg</span><span class="reps">× ${pr.reps}</span></div>
    </div>
  `).join('');

  el('prExpandCard').classList.toggle('hidden', rest.length === 0);
  expandBtn.querySelector('span').textContent = `Alle PR's (${rest.length} meer)`;
  restBox.innerHTML = rest.map((pr) => `
    <div class="pr-row">
      <div class="pr-name">${pr.exercise}</div>
      <div class="pr-value">${pr.weight}kg <span class="muted">× ${pr.reps}</span></div>
      <div class="pr-date muted">${formatDateShort(pr.date)}</div>
    </div>
  `).join('');
}

// ---------- Settings / sync tab ----------

function bindSettingsTab() {
  el('saveClientIdBtn').addEventListener('click', () => {
    SheetsSync.setClientId(el('clientIdInput').value);
    SheetsSync.init();
    renderSettingsTab();
  });
  el('connectSyncBtn').addEventListener('click', () => SheetsSync.connect());
}

function renderSettingsTab() {
  const status = SheetsSync.status;
  const labels = {
    idle: 'Niet verbonden',
    connecting: 'Verbinden...',
    connected: 'Verbonden ✓',
    error: 'Fout: ' + (SheetsSync.detail || ''),
    not_configured: 'Geen Client ID ingesteld',
  };
  el('syncStatusText').textContent = labels[status] || status;
  el('connectSyncBtn').classList.toggle('hidden', !SheetsSync.isConfigured());

  const link = el('sheetLink');
  const url = SheetsSync.getSheetUrl();
  if (url) {
    link.href = url;
    link.classList.remove('hidden');
  } else {
    link.classList.add('hidden');
  }

  const lastSync = SheetsSync.getLastSync();
  el('lastSyncText').textContent = lastSync
    ? `Laatst gesynced: ${new Date(lastSync).toLocaleString('nl-NL')}`
    : '';
}

function renderSyncBadge(status) {
  const badge = el('syncBtn');
  const dot = { idle: '⚪', connecting: '🟡', connected: '🟢', error: '🔴', not_configured: '⚪' };
  const text = { idle: 'Niet verbonden', connecting: 'Verbinden...', connected: 'Synced', error: 'Fout', not_configured: 'Sync instellen' };
  badge.textContent = `${dot[status] || '⚪'} ${text[status] || status}`;
  if (el('syncStatusText')) renderSettingsTab();
}

document.addEventListener('DOMContentLoaded', init);
