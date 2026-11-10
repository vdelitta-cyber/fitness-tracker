// Hoofdlogica: state, rendering, event handling.

const state = {
  type: null,
  selectedExercise: null,
  editingSetId: null,
  historyShown: 8,
  openSessions: new Set(),
};

const HISTORY_PAGE = 8;

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
  bindSetDialog();
  bindAnalyticsTab();
  RestTimer.bind();

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
  renderTopSet();
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
  const remaining = WEEKLY_TARGET_DAYS - Object.keys(weekly.perDay).length;
  if (remaining <= 0) return 'Weekdoel gehaald.';
  const sessionWord = remaining === 1 ? 'sessie' : 'sessies';
  return `Nog ${remaining} ${sessionWord} voor een volle week.`;
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

  const bodyEl = el('mBody');

  if (!data.hasData) {
    barEl.classList.add('hidden');
    legendEl.classList.add('hidden');
    bodyEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    summaryEl.textContent = '';
    return;
  }
  barEl.classList.remove('hidden');
  legendEl.classList.remove('hidden');
  bodyEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  renderBodyDiagram(bodyEl, Storage.getMuscleFocusDetailed());
  summaryEl.textContent = data.groups.map((g) => g.label).join(', ');
  barEl.innerHTML = data.groups.map((g) => `<div class="m-stacked-seg ${g.color}" style="width:${g.pct}%"></div>`).join('');
  legendEl.innerHTML = data.groups.map((g) => `
    <div class="m-legend-item"><span class="m-legend-dot ${g.color}"></span>${g.label} ${g.pct}%</div>
  `).join('');
}

// Zwaarste werkset van vandaag als geladen stang. Zonder sets vandaag: je zwaarste record.
function renderTopSet() {
  const today = getLocalDateStr();
  const todayWorking = Storage.getSetsForDate(today)
    .filter((s) => s.setType === 'working' && s.notes !== 'Startgewicht');

  let top = null;
  let label = 'Zwaarste werkset vandaag';
  if (todayWorking.length) {
    top = todayWorking.reduce((a, s) => (!a || s.weight > a.weight || (s.weight === a.weight && s.reps > a.reps) ? s : a), null);
  } else {
    const prs = Storage.getPRs().sort((a, b) => b.weight - a.weight);
    if (prs.length) { top = prs[0]; label = 'Je zwaarste record'; }
  }

  const section = document.querySelector('.m-topset');
  if (!top) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');

  el('mTopLabel').textContent = label;
  el('mTopEx').textContent = top.exercise;
  el('mTopKg').textContent = fmtWeight(top.weight);
  el('mTopReps').textContent = top.reps ? `× ${top.reps} reps` : '';
  el('mTopKey').textContent = Barbell.draw(el('mBarbell'), top.weight, Barbell.kindFor(top.exercise));
}

function setDayTypeMenuOpen(open) {
  el('dayTypeMenu').hidden = !open;
  el('dayTypeBtn').setAttribute('aria-expanded', String(open));
}

function bindDayTypeMenu() {
  const btn = el('dayTypeBtn');
  const menu = el('dayTypeMenu');
  menu.innerHTML = TRAINING_TYPE_ORDER.map((k) =>
    `<li role="option" class="m-dd-item" data-type="${k}" tabindex="-1">${TRAINING_TYPES[k].label}</li>`
  ).join('');

  btn.addEventListener('click', () => setDayTypeMenuOpen(menu.hidden));
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.m-dd-item');
    if (!item) return;
    setDayTypeMenuOpen(false);
    Storage.setDayType(item.dataset.type);
    el('exerciseSearch').value = '';
    el('searchResults').classList.remove('show');
    renderTodayScreen();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#dayTypeDD')) setDayTypeMenuOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setDayTypeMenuOpen(false);
  });
}

function renderDayTypeSection() {
  const todayType = Storage.getDayType();
  state.type = todayType;

  if (!el('dayTypeMenu').children.length) bindDayTypeMenu();
  el('dayTypeLabel').textContent = TRAINING_TYPES[todayType].label;
  el('mSplit').textContent = TRAINING_TYPES[todayType].label.split(' ')[0];
  el('dayTypeMenu').querySelectorAll('.m-dd-item').forEach((li) => {
    const selected = li.dataset.type === todayType;
    li.classList.toggle('selected', selected);
    li.setAttribute('aria-selected', String(selected));
  });
  const progress = Storage.getTodayExerciseProgress(todayType);
  el('mDayTypeProgress').textContent = `${progress.done} van ${progress.target} oefeningen`;
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

  document.querySelectorAll('.m-step').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = el(btn.dataset.target);
      const step = parseFloat(btn.dataset.step);
      const min = btn.dataset.target === 'repsInput' ? 1 : 0;
      const next = Math.max(min, (parseFloat(input.value) || 0) + step);
      input.value = Math.round(next * 100) / 100;
    });
  });

  // Een set in de lijst aantikken opent het corrigeer-venster (ook in de historie).
  document.addEventListener('click', (e) => {
    const pill = e.target.closest('[data-set-id]');
    if (!pill) return;
    e.stopPropagation();
    openSetDialog(pill.dataset.setId);
  }, true);
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

  // Vooraf invullen: je laatste set van vandaag, anders de beste set van de vorige keer.
  const lastToday = Storage.getLastSetToday(ex.id);
  const suggestion = Storage.getSuggestion(ex.id);
  const base = lastToday || suggestion;
  el('weightInput').value = base ? base.weight : '';
  el('repsInput').value = base ? base.reps : '';
  renderSuggestion(suggestion);

  el('logSetBtn').disabled = false;
  if (!base) el('weightInput').focus();
}

function renderSuggestion(s) {
  const box = el('setSuggestion');
  if (!s) {
    box.classList.add('hidden');
    return;
  }
  const source = s.isSeed ? 'Startgewicht' : `Vorige keer (${formatDateLong(s.date)})`;
  const heavier = `${fmtWeight(s.weight + 2.5)} × ${Math.min(s.reps, 8)}`;
  const target = s.reps >= 12 ? heavier : `${fmtWeight(s.weight)} × ${s.reps + 1} of ${heavier}`;
  box.textContent = `${source}: ${fmtWeight(s.weight)} × ${s.reps}. Probeer ${target}.`;
  box.classList.remove('hidden');
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

  const bestBefore = Storage.getBestWeight(ex.id);
  const isRecord = setType === 'working' && bestBefore !== null && weight > bestBefore;

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

  // Gewicht en reps blijven staan voor de volgende set; het toetsenbord gaat dicht zodat de timer zichtbaar is.
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (isRecord) showPRToast(ex.name, weight);
  RestTimer.start(Storage.getRestSeconds());

  renderGauge();
  renderStats();
  renderTopSet();
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

    const chips = data.sets.map((s) => setPill(s, isNewPR && s.setType === 'working' && s.weight === maxToday));
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

// Een gelogde set als aantikbare chip; tikken opent het corrigeer-venster.
function setPill(s, isPR = false) {
  const cls = s.setType === 'warmup' ? ' warmup' : isPR ? ' pr' : '';
  const kind = s.setType === 'warmup' ? 'warmup' : 'werkset';
  return `<button type="button" class="set-pill${cls}" data-set-id="${s.id}" aria-label="${fmtWeight(s.weight)} kg keer ${s.reps}, ${kind}. Wijzigen of verwijderen">${fmtWeight(s.weight)} × ${s.reps}</button>`;
}

// ---------- Set wijzigen of verwijderen ----------

function bindSetDialog() {
  const dialog = el('setDialog');
  el('setDialogCancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  el('setDialogSave').addEventListener('click', () => {
    const weight = parseFloat(el('editWeight').value);
    const reps = parseInt(el('editReps').value, 10);
    if (isNaN(weight) || weight <= 0 || isNaN(reps) || reps <= 0) {
      el('setDialogNote').textContent = 'Vul een geldig gewicht en aantal reps in.';
      return;
    }
    const setType = document.querySelector('input[name="editType"]:checked').value;
    Storage.updateSet(state.editingSetId, { weight, reps, setType });
    dialog.close();
    refreshAfterDataChange();
  });

  // Verwijderen vraagt een tweede tik als bevestiging.
  el('setDialogDelete').addEventListener('click', (e) => {
    if (e.currentTarget.dataset.armed !== 'true') {
      e.currentTarget.dataset.armed = 'true';
      e.currentTarget.textContent = 'Zeker weten?';
      return;
    }
    Storage.deleteSet(state.editingSetId);
    dialog.close();
    refreshAfterDataChange();
  });
}

function openSetDialog(setId) {
  const s = Storage.getSetById(setId);
  if (!s) return;
  state.editingSetId = setId;
  el('setDialogTitle').textContent = s.exercise;
  el('setDialogMeta').textContent = `${formatDateLong(s.date)} · ${s.day}`;
  el('editWeight').value = s.weight;
  el('editReps').value = s.reps;
  document.querySelector(`input[name="editType"][value="${s.setType}"]`).checked = true;

  const synced = SheetsSync.getSpreadsheetId() && !Storage.isQueuedForSync(setId);
  el('setDialogNote').textContent = synced
    ? 'Deze set staat mogelijk al in je Google Sheet. Daar wordt hij niet aangepast of verwijderd.'
    : '';

  const del = el('setDialogDelete');
  del.dataset.armed = 'false';
  del.textContent = 'Verwijderen';
  el('setDialog').showModal();
}

function refreshAfterDataChange() {
  renderTodayScreen();
  if (state.selectedExercise) renderSuggestion(Storage.getSuggestion(state.selectedExercise.id));
  if (el('tab-analytics').classList.contains('active')) renderAnalyticsTab();
  if (el('tab-history').classList.contains('active')) renderPRTab();
}

// ---------- Nieuw record ----------

function showPRToast(exerciseName, weight) {
  const toast = el('prToast');
  el('prToastKg').textContent = `${fmtWeight(weight)} kg`;
  el('prToastEx').textContent = exerciseName;
  toast.classList.remove('hidden', 'show');
  void toast.offsetWidth; // herstart de animatie
  toast.classList.add('show');
  if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 200]);
  clearTimeout(showPRToast.timer);
  showPRToast.timer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

// ---------- Rusttimer ----------

const RestTimer = {
  endAt: 0,
  total: 0,
  interval: null,
  hideTimer: null,
  audio: null,

  bind() {
    el('restMinus').addEventListener('click', () => this.adjust(-15));
    el('restPlus').addEventListener('click', () => this.adjust(15));
    el('restStop').addEventListener('click', () => this.stop());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.interval) this.tick();
    });
  },

  // Geluid mag pas na een tik van de gebruiker; start() wordt vanuit "Set loggen" aangeroepen.
  unlockAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!this.audio) this.audio = new Ctx();
      if (this.audio.state === 'suspended') this.audio.resume();
    } catch (e) {}
  },

  start(seconds) {
    if (!seconds) return;
    this.unlockAudio();
    clearTimeout(this.hideTimer);
    clearInterval(this.interval);
    this.total = seconds;
    this.endAt = Date.now() + seconds * 1000;
    el('restBar').classList.remove('hidden', 'done');
    el('restLabel').textContent = 'Rust';
    this.interval = setInterval(() => this.tick(), 250);
    this.tick();
  },

  adjust(delta) {
    if (!this.interval) return;
    this.endAt += delta * 1000;
    this.total = Math.max(this.total + delta, 1);
    this.tick();
  },

  stop() {
    clearInterval(this.interval);
    clearTimeout(this.hideTimer);
    this.interval = null;
    el('restBar').classList.add('hidden');
  },

  tick() {
    const left = Math.ceil((this.endAt - Date.now()) / 1000);
    if (left <= 0) {
      this.finish();
      return;
    }
    el('restTime').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    const pct = Math.max(0, Math.min(100, (left / this.total) * 100));
    el('restProgress').style.width = pct + '%';
  },

  finish() {
    clearInterval(this.interval);
    this.interval = null;
    el('restBar').classList.add('done');
    el('restLabel').textContent = 'Rust voorbij';
    el('restTime').textContent = '0:00';
    el('restProgress').style.width = '0%';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    this.beep();
    this.hideTimer = setTimeout(() => el('restBar').classList.add('hidden'), 6000);
  },

  beep() {
    if (!this.audio || this.audio.state !== 'running') return;
    try {
      [0, 0.25, 0.5].forEach((offset) => {
        const osc = this.audio.createOscillator();
        const gain = this.audio.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.15;
        osc.connect(gain).connect(this.audio.destination);
        osc.start(this.audio.currentTime + offset);
        osc.stop(this.audio.currentTime + offset + 0.15);
      });
    } catch (e) {}
  },
};

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

  renderWeekCompare();
  renderConsistencyCalendar();
  renderBodyweight();
  renderHistory();
}

function bindAnalyticsTab() {
  el('bwForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const kg = parseFloat(el('bwInput').value);
    if (isNaN(kg) || kg < 20 || kg > 400) return;
    Storage.saveBodyweight(Math.round(kg * 10) / 10);
    el('bwInput').value = '';
    renderBodyweight();
  });
  el('bwDeleteLast').addEventListener('click', () => {
    const list = Storage.getBodyweights();
    if (!list.length) return;
    Storage.deleteBodyweight(list[list.length - 1].date);
    renderBodyweight();
  });

  el('historyMore').addEventListener('click', () => {
    state.historyShown += HISTORY_PAGE;
    renderHistory();
  });
  el('historyList').addEventListener('toggle', (e) => {
    const date = e.target.dataset && e.target.dataset.date;
    if (!date) return;
    if (e.target.open) state.openSessions.add(date);
    else state.openSessions.delete(date);
  }, true);

  // Een getrainde dag in de kalender aantikken opent die sessie in de historie.
  el('consistencyCalendar').addEventListener('click', (e) => {
    const box = e.target.closest('button[data-date]');
    if (!box) return;
    const sessions = Storage.getSessions();
    const idx = sessions.findIndex((s) => s.date === box.dataset.date);
    if (idx === -1) return;
    state.historyShown = Math.max(state.historyShown, idx + 1);
    state.openSessions.add(box.dataset.date);
    renderHistory();
    const target = el('historyList').querySelector(`details[data-date="${box.dataset.date}"]`);
    if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

// Deze week tegenover heel vorige week: volume, sets en verbroken records.
function renderWeekCompare() {
  const cmp = Storage.getWeekComparison();
  const prs = Storage.getWeekPRCounts();
  const delta = (cur, prev, pct) => {
    if (prev === 0) return cur > 0 ? 'vorige week niets' : 'nog niets';
    if (pct === 0) return 'gelijk';
    return `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%`;
  };
  el('weekCompare').innerHTML = `
    <div class="stat"><span class="stat-value">${Math.round(cmp.thisWeek.volume).toLocaleString('nl-NL')}</span><span class="stat-label">kg volume</span><span class="stat-delta">${delta(cmp.thisWeek.volume, cmp.lastWeek.volume, cmp.volumeChangePct)}</span></div>
    <div class="stat"><span class="stat-value">${cmp.thisWeek.sets}</span><span class="stat-label">Working sets</span><span class="stat-delta">${delta(cmp.thisWeek.sets, cmp.lastWeek.sets, cmp.setsChangePct)}</span></div>
    <div class="stat"><span class="stat-value">${prs.thisWeek}</span><span class="stat-label">Records</span><span class="stat-delta">vorige week ${prs.lastWeek}</span></div>
  `;
}

function renderConsistencyCalendar() {
  const days = Storage.getConsistencyDays(35);
  el('consistencyCalendar').innerHTML = days.map((d) => {
    const label = formatDateLong(d.date);
    return d.trained
      ? `<button type="button" class="m-consistency-box on" data-date="${d.date}" aria-label="${label}, getraind. Toon sessie" title="${label}"></button>`
      : `<div class="m-consistency-box" title="${label}"></div>`;
  }).join('');
}

function renderBodyweight() {
  const list = Storage.getBodyweights();
  const canvas = el('bwCanvas');
  const empty = el('bwEmpty');
  el('bwDeleteLast').classList.toggle('hidden', list.length === 0);

  if (list.length === 0) {
    el('bwSummary').textContent = '';
    canvas.classList.add('hidden');
    empty.textContent = 'Nog geen metingen. Vul je gewicht in om het bij te houden.';
    empty.classList.remove('hidden');
    return;
  }

  const last = list[list.length - 1];
  const first = list[0];
  const diff = Math.round((last.kg - first.kg) * 10) / 10;
  el('bwSummary').textContent = `${fmtWeight(last.kg)} kg · ${formatDateLong(last.date)}`;

  if (list.length < 2) {
    canvas.classList.add('hidden');
    empty.textContent = 'Eén meting. Vanaf twee metingen verschijnt hier een grafiek.';
    empty.classList.remove('hidden');
    return;
  }
  canvas.classList.remove('hidden');
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  empty.textContent = `${sign}${fmtWeight(Math.abs(diff))} kg sinds ${formatDateLong(first.date)}.`;
  empty.classList.remove('hidden');
  ChartsUI.renderBodyweight(canvas, list);
}

function renderHistory() {
  const sessions = Storage.getSessions();
  const box = el('historyList');
  el('historyEmpty').classList.toggle('hidden', sessions.length > 0);
  el('historyCount').textContent = sessions.length ? `${sessions.length} ${sessions.length === 1 ? 'training' : 'trainingen'}` : '';
  el('historyMore').classList.toggle('hidden', sessions.length <= state.historyShown);

  box.innerHTML = sessions.slice(0, state.historyShown).map((sess) => {
    const d = new Date(sess.date);
    const weekday = d.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '');
    const byExercise = {};
    for (const s of sess.sets) {
      (byExercise[s.exerciseId] = byExercise[s.exerciseId] || { name: s.exercise, sets: [] }).sets.push(s);
    }
    const rows = Object.values(byExercise).map((ex) => `
      <div class="m-history-ex">
        <span class="m-history-ex-name">${ex.name}</span>
        <div class="exercise-card-sets">${ex.sets.map((s) => setPill(s)).join('')}</div>
      </div>`).join('');
    return `
    <details class="m-session" data-date="${sess.date}" ${state.openSessions.has(sess.date) ? 'open' : ''}>
      <summary>
        <span class="m-session-date">${weekday} ${formatDateLong(sess.date)}</span>
        <span class="m-session-type">${sess.day}</span>
        <span class="m-session-meta">${sess.workingSets} sets · ${Math.round(sess.volume).toLocaleString('nl-NL')} kg</span>
      </summary>
      <div class="m-session-body">${rows}</div>
    </details>`;
  }).join('');
}

function renderProgressionFor(exerciseId) {
  const sets = Storage.getWorkingSets(exerciseId);
  if (sets.length === 0) return;

  // Eén punt per training: topgewicht en hoogste geschatte 1RM van die dag.
  const byDate = {};
  for (const s of sets) {
    const d = byDate[s.date] = byDate[s.date] || { date: s.date, weight: 0, reps: 0, e1rm: 0 };
    if (s.weight > d.weight || (s.weight === d.weight && s.reps > d.reps)) {
      d.weight = s.weight;
      d.reps = s.reps;
    }
    d.e1rm = Math.max(d.e1rm, e1rm(s.weight, s.reps));
  }
  const sessions = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  ChartsUI.renderProgression(el('progressionCanvas'), sessions);
  const best = Math.max(...sessions.map((d) => d.e1rm));
  el('progressionInsight').innerHTML = buildInsight(sets)
    + `<p class="insight">Geschatte 1RM: ${fmtWeight(best)} kg (berekend uit gewicht en reps).</p>`;
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
        <div class="m-pr-meta">${CATEGORY_LABELS[pr.category] || ''} · ${formatDateLong(pr.date)} · 1RM ca. ${fmtWeight(pr.e1rm)} kg</div>
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

  el('restSelect').value = String(Storage.getRestSeconds());
  el('restSelect').addEventListener('change', (e) => Storage.setRestSeconds(parseInt(e.target.value, 10)));

  el('exportBtn').addEventListener('click', exportBackup);
  el('importBtn').addEventListener('click', () => el('importFile').click());
  el('importFile').addEventListener('change', importBackup);
}

async function exportBackup() {
  const data = Storage.exportData();
  const name = `fitness-tracker-backup-${getLocalDateStr()}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const status = el('backupStatus');
  const count = data.sets.filter((s) => s.notes !== 'Startgewicht').length;

  // Op iPhone werkt het deelmenu (Bewaar in Bestanden) betrouwbaarder dan een download.
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file], title: name });
      status.textContent = `Back-up met ${count} sets gedeeld.`;
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = `Back-up met ${count} sets opgeslagen als ${name}.`;
}

async function importBackup(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const status = el('backupStatus');
  try {
    const result = Storage.importData(JSON.parse(await file.text()));
    const parts = [`${result.added} sets toegevoegd`];
    if (result.skipped) parts.push(`${result.skipped} overgeslagen (stonden er al of waren ongeldig)`);
    if (result.weights) parts.push(`${result.weights} gewichtsmetingen toegevoegd`);
    status.textContent = parts.join(', ') + '.';
    renderTodayScreen();
  } catch (err) {
    status.textContent = err instanceof SyntaxError
      ? 'Importeren mislukt: het bestand is geen geldige JSON.'
      : `Importeren mislukt: ${err.message}`;
  }
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
