// Hoofdlogica: state, rendering, event handling.

const state = {
  type: null,
  selectedExercise: null,
  lastWeight: '',
};

const el = (id) => document.getElementById(id);
const WEEKLY_TARGET_DAYS = 5;
const GAUGE_CIRCUMFERENCE = 402.1;

const MOTIVATION_QUOTES = [
  'Discipline is kiezen tussen wat je nu wilt en wat je het meest wilt.',
  'Elke herhaling is een keuze om beter te worden.',
  'Motivatie brengt je op gang, discipline houdt je gaande.',
  'Het gewicht liegt niet.',
  'Sterk word je niet in de comfortzone.',
  'Consistentie verslaat intensiteit.',
  'De laatste herhaling is waar de groei begint.',
  'Rust is een strategie, geen excuus.',
  'Je lichaam kan wat je geest gelooft.',
  'Kleine stappen, elke dag, bouwen grote kracht.',
  'Pijn is tijdelijk, spijt blijft.',
  'Vandaag optellen is morgen verschil maken.',
  'Kampioenen trainen, anderen verzinnen excuses.',
  'IJzer scherpt ijzer.',
  'Excellentie is geen toeval.',
  'Je hoeft niet gemotiveerd te zijn, je moet gedisciplineerd zijn.',
  'De spiegel liegt niet, de weegschaal wel.',
  'Elke set telt, ook als niemand kijkt.',
  'Groei zit aan de andere kant van ongemak.',
  'Discipline is jezelf een belofte houden.',
  'De sterkste spier is de wil.',
  'Wat vandaag zwaar voelt, wordt morgen je warming-up.',
  'Progressie is stil, maar onmiskenbaar.',
  'Je toekomstige zelf bedankt je voor vandaag.',
  'Herhaling is de moeder van kracht.',
  'Geen dag zonder inspanning.',
  'De lat ligt waar jij hem legt.',
  'Verschijnen is de helft van het werk.',
  'Kracht bouw je één eerlijke herhaling per keer.',
  'Wie stopt met groeien, stopt met leven.',
];

function fmtWeight(w) {
  return (Math.round(w * 10) / 10).toString().replace('.', ',');
}

function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function init() {
  injectStaticIcons();
  Storage.seedStartingWeights();
  bindTabs();
  bindLogTab();
  bindSettingsTab();
  bindPRTab();

  renderHeader();
  renderTodayScreen();

  SheetsSync.onStatusChange(renderSyncBadge);
  SheetsSync.init();
  el('clientIdInput').value = SheetsSync.getClientId();
  renderSettingsTab();
}

function injectStaticIcons() {
  el('exerciseLogger').querySelector('.m-search-icon').innerHTML = ICONS.search;
  el('prExpandBtn').querySelector('.icon').innerHTML = ICONS.chevronDown;
}

function renderHeader() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  el('mDate').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';
  el('mGreeting').textContent = `${greeting}, Vin`;
}

// ---------- Vandaag: alles wat op dit scherm samenkomt ----------

function renderTodayScreen() {
  renderGauge();
  renderStats();
  renderQuote();
  renderIntensity();
  renderMuscleFocus();
  renderDayTypeSection();
  renderSessionSummary();
}

function renderGauge() {
  const streak = Storage.getScheduleStreak();
  const weekly = Storage.getWeeklyVolume();
  const days = Object.keys(weekly.perDay).length;
  const pct = Math.min(100, Math.round((days / WEEKLY_TARGET_DAYS) * 100));

  el('mStreakNum').textContent = streak;
  const arcLen = (GAUGE_CIRCUMFERENCE * pct) / 100;
  el('mGaugeArc').setAttribute('stroke-dasharray', `${arcLen.toFixed(1)} ${GAUGE_CIRCUMFERENCE}`);

  el('mWeekPct').textContent = pct + '%';
  el('mWeekNote').textContent = getWeekPlanNote(weekly);
}

function getWeekPlanNote(weekly) {
  const trainedDates = new Set(Object.keys(weekly.perDay));
  const todayIdx = (new Date().getDay() + 6) % 7;
  const remaining = [];
  for (let i = todayIdx; i < 7; i++) {
    const key = WEEKDAY_ORDER[i];
    const type = WEEKLY_SCHEDULE[key];
    if (!type) continue;
    const d = new Date();
    d.setDate(d.getDate() + (i - todayIdx));
    if (!trainedDates.has(getLocalDateStr(d))) remaining.push({ key, type });
  }
  if (remaining.length === 0) return 'Elke geplande sessie deze week is voltooid.';
  const next = remaining[0];
  const label = TRAINING_TYPES[next.type].label;
  const dayName = next.key === WEEKDAY_ORDER[todayIdx] ? 'Vandaag' : WEEKDAY_LABEL[next.key];
  const sessionWord = remaining.length === 1 ? 'sessie' : 'sessies';
  return `Nog ${remaining.length} ${sessionWord} voor een volle week. ${dayName} staat ${label} gepland.`;
}

function renderStats() {
  const weekly = Storage.getWeeklyVolume();
  el('mVolume').textContent = Math.round(weekly.totalVolume).toLocaleString('nl-NL');
  el('mSets').textContent = weekly.totalSets;
  el('mDays').textContent = Object.keys(weekly.perDay).length;
}

function renderQuote() {
  el('mQuote').textContent = MOTIVATION_QUOTES[dayOfYear() % MOTIVATION_QUOTES.length];
}

function renderIntensity() {
  const result = Storage.getIntensityToday();
  const segEl = el('mSegments');
  const emptyEl = el('mIntensityEmpty');
  const labelEl = el('mIntensityLabel');

  if (!result.hasData || result.score === null) {
    segEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    labelEl.textContent = '';
    return;
  }
  segEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');

  const score = result.score;
  const levelText = score <= 3 ? 'Licht' : score <= 6 ? 'Gemiddeld' : 'Zwaar';
  labelEl.textContent = levelText;
  labelEl.className = 'm-intensity-label level-' + levelText.toLowerCase();

  segEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
    const band = i < 3 ? 'sage' : i < 6 ? 'champagne' : 'bordeaux';
    return `<div class="m-segment ${i < score ? band : ''}"></div>`;
  }).join('');
}

function renderMuscleFocus() {
  const data = Storage.getMuscleFocusGrouped();
  const barEl = el('mStackedBar');
  const legendEl = el('mLegend');
  const emptyEl = el('mFocusEmpty');
  const summaryEl = el('mFocusSummary');

  if (!data.hasData) {
    barEl.classList.add('hidden');
    legendEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    summaryEl.textContent = '';
    return;
  }
  barEl.classList.remove('hidden');
  legendEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  summaryEl.textContent = data.groups.map((g) => g.label).join(', ');
  barEl.innerHTML = data.groups.map((g) => `<div class="m-stacked-seg ${g.color}" style="width:${g.pct}%"></div>`).join('');
  legendEl.innerHTML = data.groups.map((g) => `
    <div class="m-legend-item"><span class="m-legend-dot ${g.color}"></span>${g.label} ${g.pct}%</div>
  `).join('');
}

function renderDayTypeSection() {
  const todayType = getTodayScheduleType();
  state.type = todayType;

  if (!todayType) {
    el('dayTypeRow').classList.add('hidden');
    el('restDayCard').classList.remove('hidden');
  } else {
    el('restDayCard').classList.add('hidden');
    el('dayTypeRow').classList.remove('hidden');
    const cfg = TRAINING_TYPES[todayType];
    el('mDayTypeTitle').textContent = cfg.label;
    const progress = Storage.getTodayExerciseProgress(todayType);
    el('mDayTypeProgress').textContent = `${progress.done} van ${progress.target} oefeningen`;
  }
}

// ---------- Zoeken ----------

function bindLogTab() {
  const search = el('exerciseSearch');
  search.addEventListener('input', () => renderSearchResults(search.value));
  search.addEventListener('focus', () => renderSearchResults(search.value));

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.m-search')) {
      el('searchResults').classList.remove('show');
    }
  });

  el('setForm').addEventListener('submit', (e) => {
    e.preventDefault();
    logCurrentSet();
  });
}

function renderSearchResults(query) {
  const cfg = state.type ? TRAINING_TYPES[state.type] : null;
  const box = el('searchResults');
  const q = query.trim().toLowerCase();
  const usage = Storage.getUsage();

  let results = EXERCISES.filter((ex) => {
    if (!cfg) return true;
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
    box.innerHTML = `<div class="search-empty">Geen oefeningen gevonden.</div>`;
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

// ---------- Oefening selecteren ----------

function selectExercise(exerciseId) {
  const ex = EXERCISES.find((e) => e.id === exerciseId);
  if (!ex) return;
  state.selectedExercise = ex;

  el('exerciseSearch').value = ex.name;
  el('searchResults').classList.remove('show');
  el('selectedExercisePanel').classList.remove('hidden');
  el('selectedExerciseName').textContent = ex.name;

  if (state.lastWeight) el('weightInput').value = state.lastWeight;
  el('repsInput').value = '';
  el('logSetBtn').disabled = false;
  el('weightInput').focus();
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

  const cfg = state.type ? TRAINING_TYPES[state.type] : { label: 'Extra' };
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
  el('repsInput').value = '';
  el('repsInput').focus();

  renderGauge();
  renderStats();
  renderIntensity();
  renderMuscleFocus();
  if (state.type) {
    const progress = Storage.getTodayExerciseProgress(state.type);
    el('mDayTypeProgress').textContent = `${progress.done} van ${progress.target} oefeningen`;
  }
  renderSessionSummary();

  if (SheetsSync.status === 'connected') SheetsSync.syncNow();
}

// ---------- Sessie vandaag ----------

function renderSessionSummary() {
  const today = getLocalDateStr();
  const sets = Storage.getSetsForDate(today).filter((s) => s.notes !== 'Startgewicht');
  const box = el('sessionList');

  if (sets.length === 0) {
    box.innerHTML = `<p class="m-empty">Nog niets gelogd vandaag. Zoek een oefening en log je eerste set.</p>`;
    return;
  }

  const byExercise = {};
  for (const s of sets) {
    byExercise[s.exerciseId] = byExercise[s.exerciseId] || { name: s.exercise, sets: [] };
    byExercise[s.exerciseId].sets.push(s);
  }

  box.innerHTML = Object.entries(byExercise).map(([exerciseId, data]) => {
    const prePR = Storage.getPRBeforeDate(exerciseId, today);
    const workingWeights = data.sets.filter((s) => s.setType === 'working').map((s) => s.weight);
    const maxToday = workingWeights.length ? Math.max(...workingWeights) : 0;
    const isNewPR = workingWeights.length > 0 && maxToday > prePR;

    const chips = data.sets.map((s) => {
      if (s.setType === 'warmup') return `<span class="set-pill warmup">${fmtWeight(s.weight)} × ${s.reps}</span>`;
      if (isNewPR && s.weight === maxToday) return `<span class="set-pill pr">${fmtWeight(s.weight)} × ${s.reps}</span>`;
      return `<span class="set-pill">${fmtWeight(s.weight)} × ${s.reps}</span>`;
    });
    chips.push(`<span class="set-pill next">set ${data.sets.length + 1}</span>`);

    const prev = Storage.getPreviousSession(exerciseId);
    const prevText = prev ? `Vorige keer, ${formatDateLong(prev.date)}: ${fmtWeight(prev.weight)} × ${prev.reps.join(', ')}` : '';

    return `
    <div class="exercise-card" data-id="${exerciseId}">
      <div class="exercise-card-header">
        <span class="exercise-card-name">${data.name}</span>
        ${isNewPR ? `<span class="exercise-card-pr">Nieuw PR</span>` : ''}
      </div>
      <div class="exercise-card-sets">${chips.join('')}</div>
      ${prevText ? `<div class="exercise-card-history">${prevText}</div>` : ''}
    </div>`;
  }).join('');

  box.querySelectorAll('.exercise-card').forEach((card) => {
    card.addEventListener('click', () => selectExercise(card.dataset.id));
  });
}

// ---------- Tabs ----------

function bindTabs() {
  document.querySelectorAll('.m-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.m-nav-item').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      el('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'analytics') renderAnalyticsTab();
      if (btn.dataset.tab === 'history') renderPRTab();
      if (btn.dataset.tab === 'settings') renderSettingsTab();
    });
  });
}

// ---------- Analyse ----------

function renderAnalyticsTab() {
  const allSets = Storage.getAllSets().filter((s) => s.setType === 'working');
  const exerciseIds = [...new Set(allSets.map((s) => s.exerciseId))];
  const select = el('analyticsExerciseSelect');
  const canvas = el('progressionCanvas');
  const empty = el('progressionEmpty');

  if (exerciseIds.length === 0) {
    select.classList.add('hidden');
    canvas.classList.add('hidden');
    empty.classList.remove('hidden');
    el('progressionInsight').innerHTML = '';
  } else {
    select.classList.remove('hidden');
    canvas.classList.remove('hidden');
    empty.classList.add('hidden');
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
    <div class="stat"><span class="stat-value">${Math.round(weekly.totalVolume).toLocaleString('nl-NL')}kg</span><span class="stat-label">Totaal volume</span></div>
    <div class="stat"><span class="stat-value">${weekly.totalSets}</span><span class="stat-label">Working sets</span></div>
    <div class="stat"><span class="stat-value">${Object.keys(weekly.perDay).length}</span><span class="stat-label">Trainingsdagen</span></div>
  `;

  renderConsistencyCalendar();
}

function renderConsistencyCalendar() {
  const days = Storage.getConsistencyDays(35);
  el('consistencyCalendar').innerHTML = days.map((d) => {
    const label = new Date(d.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' });
    return `<div class="m-consistency-box ${d.trained ? 'on' : ''}" title="${label}"></div>`;
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
    return '<p class="m-empty">Nog niet genoeg sessies voor een trend.</p>';
  }
  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  const diff = last[1] - prev[1];
  const pct = ((diff / prev[1]) * 100).toFixed(1);

  if (diff > 0) {
    return `<p class="insight up">Progressie: van ${fmtWeight(prev[1])}kg naar ${fmtWeight(last[1])}kg (+${pct}%)</p>`;
  }
  const lastThree = sessions.slice(-3).map((s) => s[1]);
  const stagnant = lastThree.length === 3 && lastThree.every((w) => w === lastThree[0]);
  if (stagnant) {
    return `<p class="insight warn">Stagnatie: al ${lastThree.length} sessies op ${fmtWeight(lastThree[0])}kg.</p>`;
  }
  if (diff < 0) {
    return `<p class="insight down">${fmtWeight(prev[1])}kg → ${fmtWeight(last[1])}kg. Lichte terugval.</p>`;
  }
  return `<p class="insight">Stabiel op ${fmtWeight(last[1])}kg.</p>`;
}

// ---------- Records ----------

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
    topBox.classList.add('hidden');
    el('prEmpty').classList.remove('hidden');
    el('prExpandCard').classList.add('hidden');
    restBox.innerHTML = '';
    return;
  }
  topBox.classList.remove('hidden');
  el('prEmpty').classList.add('hidden');

  const top = prs.slice(0, 5);
  const rest = prs.slice(5);

  topBox.innerHTML = top.map((pr) => `
    <div class="m-pr-featured">
      <div>
        <div class="m-pr-name">${pr.exercise}</div>
        <div class="m-pr-meta">${CATEGORY_LABELS[pr.category] || ''} · ${formatDateLong(pr.date)}</div>
      </div>
      <div class="m-pr-value">${fmtWeight(pr.weight)}<span class="unit">kg</span><span class="reps">× ${pr.reps}</span></div>
    </div>
  `).join('');

  el('prExpandCard').classList.toggle('hidden', rest.length === 0);
  expandBtn.querySelector('span').textContent = `Alle records (${rest.length} meer)`;
  restBox.innerHTML = rest.map((pr) => `
    <div class="pr-row">
      <div class="pr-name">${pr.exercise}</div>
      <div class="pr-value">${fmtWeight(pr.weight)}kg <span class="muted">× ${pr.reps}</span></div>
      <div class="pr-date">${formatDateLong(pr.date)}</div>
    </div>
  `).join('');
}

// ---------- Sync ----------

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
    connected: 'Verbonden met Google Drive',
    error: 'Fout: ' + (SheetsSync.detail || ''),
    not_configured: 'Geen Client ID ingesteld',
  };
  el('syncStatusText').textContent = labels[status] || status;
  el('syncDot').className = 'm-sync-dot' + (status === 'connected' ? ' connected' : status === 'error' ? ' error' : '');
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
    ? `Laatste sync: ${new Date(lastSync).toLocaleString('nl-NL')}`
    : 'Nog niet gesynced.';
}

function renderSyncBadge() {
  if (el('syncStatusText')) renderSettingsTab();
}

document.addEventListener('DOMContentLoaded', init);
