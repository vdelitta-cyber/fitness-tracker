// localStorage-laag: alle sets, usage counts en seed-startgewichten.
// Dit is de primaire, snelle store. sheets-sync.js houdt Google Sheets hiermee in sync.

const LS_KEYS = {
  sets: 'ft_sets',
  usage: 'ft_usage',
  seeded: 'ft_seeded_v1',
  syncQueue: 'ft_sync_queue',
  lastType: 'ft_last_type',
  dayTypes: 'ft_day_types',
  bodyweight: 'ft_bodyweight',
  restSeconds: 'ft_rest_seconds',
};

const BACKUP_APP_ID = 'fitness-tracker-vin';

const STARTING_WEIGHTS = [
  { exerciseId: 'chest_barbell_bench_press', weight: 100, reps: 5, type: 'push' },
  { exerciseId: 'legs_barbell_squat', weight: 100, reps: 5, type: 'legs' },
  { exerciseId: 'back_barbell_deadlift', weight: 160, reps: 3, type: 'pull' },
];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const Storage = {
  getAllSets() {
    return readJSON(LS_KEYS.sets, []);
  },

  saveAllSets(sets) {
    writeJSON(LS_KEYS.sets, sets);
  },

  addSet(set) {
    const sets = this.getAllSets();
    const entry = {
      id: 'set_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      date: set.date,
      day: set.day,
      exerciseId: set.exerciseId,
      exercise: set.exercise,
      category: set.category,
      weight: set.weight,
      reps: set.reps,
      setType: set.setType,
      notes: set.notes || '',
      createdAt: new Date().toISOString(),
    };
    sets.push(entry);
    this.saveAllSets(sets);
    this.incrementUsage(set.exerciseId);
    this.queueForSync(entry);
    return entry;
  },

  getUsage() {
    return readJSON(LS_KEYS.usage, {});
  },

  incrementUsage(exerciseId) {
    const usage = this.getUsage();
    usage[exerciseId] = (usage[exerciseId] || 0) + 1;
    writeJSON(LS_KEYS.usage, usage);
  },

  getUsageCount(exerciseId) {
    const usage = this.getUsage();
    return usage[exerciseId] || 0;
  },

  getHistoryForExercise(exerciseId, limit = 5) {
    return this.getAllSets()
      .filter((s) => s.exerciseId === exerciseId && s.setType !== 'seed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  },

  getSetsForDate(dateStr) {
    return this.getAllSets()
      .filter((s) => s.date === dateStr)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  getWorkingSets(exerciseId) {
    return this.getAllSets()
      .filter((s) => s.exerciseId === exerciseId && s.setType === 'working')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  getPRs() {
    const sets = this.getAllSets().filter((s) => s.setType === 'working');
    const prMap = {};
    const bestE1rm = {};
    for (const s of sets) {
      if (!prMap[s.exerciseId] || s.weight > prMap[s.exerciseId].weight) {
        prMap[s.exerciseId] = { exerciseId: s.exerciseId, exercise: s.exercise, category: s.category, weight: s.weight, reps: s.reps, date: s.date };
      }
      bestE1rm[s.exerciseId] = Math.max(bestE1rm[s.exerciseId] || 0, e1rm(s.weight, s.reps));
    }
    return Object.values(prMap)
      .map((pr) => ({ ...pr, e1rm: bestE1rm[pr.exerciseId] }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getWeeklyVolume() {
    const sets = this.getAllSets().filter((s) => s.setType === 'working' && s.notes !== 'Startgewicht');
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayIdx = (now.getDay() + 6) % 7; // ma = 0
    startOfWeek.setDate(now.getDate() - dayIdx);
    startOfWeek.setHours(0, 0, 0, 0);

    const perDay = {};
    let totalVolume = 0;
    let totalSets = 0;
    for (const s of sets) {
      const d = new Date(s.date);
      if (d >= startOfWeek) {
        const vol = s.weight * s.reps;
        totalVolume += vol;
        totalSets += 1;
        perDay[s.date] = perDay[s.date] || { volume: 0, exercises: new Set() };
        perDay[s.date].volume += vol;
        perDay[s.date].exercises.add(s.exerciseId);
      }
    }
    return {
      totalVolume,
      totalSets,
      perDay: Object.fromEntries(
        Object.entries(perDay).map(([date, v]) => [date, { volume: v.volume, exerciseCount: v.exercises.size }])
      ),
    };
  },

  queueForSync(entry) {
    const queue = readJSON(LS_KEYS.syncQueue, []);
    queue.push(entry.id);
    writeJSON(LS_KEYS.syncQueue, queue);
  },

  getSyncQueue() {
    const ids = readJSON(LS_KEYS.syncQueue, []);
    const sets = this.getAllSets();
    return sets.filter((s) => ids.includes(s.id));
  },

  clearSyncQueue() {
    writeJSON(LS_KEYS.syncQueue, []);
  },

  seedStartingWeights() {
    if (readJSON(LS_KEYS.seeded, false)) return;
    const sets = this.getAllSets();
    const today = new Date();
    const dateStr = getLocalDateStr(today);
    for (const sw of STARTING_WEIGHTS) {
      const ex = EXERCISES.find((e) => e.id === sw.exerciseId);
      if (!ex) continue;
      sets.push({
        id: 'seed_' + sw.exerciseId,
        date: dateStr,
        day: TRAINING_TYPES[sw.type].label,
        exerciseId: ex.id,
        exercise: ex.name,
        category: ex.category,
        weight: sw.weight,
        reps: sw.reps,
        setType: 'working',
        notes: 'Startgewicht',
        createdAt: today.toISOString(),
      });
    }
    this.saveAllSets(sets);
    writeJSON(LS_KEYS.seeded, true);
  },

  getLastType() {
    return localStorage.getItem(LS_KEYS.lastType) || 'push';
  },

  setLastType(type) {
    localStorage.setItem(LS_KEYS.lastType, type);
  },

  getVolumeByWeek(weeksBack = 8) {
    const sets = this.getAllSets().filter((s) => s.setType === 'working' && s.notes !== 'Startgewicht');
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7;
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - dayIdx);
    thisWeekStart.setHours(0, 0, 0, 0);

    const weeks = [];
    for (let i = weeksBack - 1; i >= 0; i--) {
      const start = new Date(thisWeekStart);
      start.setDate(thisWeekStart.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      weeks.push({ start, end, volume: 0 });
    }
    for (const s of sets) {
      const d = new Date(s.date);
      const wk = weeks.find((w) => d >= w.start && d < w.end);
      if (wk) wk.volume += s.weight * s.reps;
    }
    return weeks.map((w, i) => ({
      label: i === weeks.length - 1 ? 'Nu' : `-${weeks.length - 1 - i}w`,
      volume: Math.round(w.volume),
    }));
  },

  getMuscleFocusThisWeek() {
    const sets = this.getAllSets().filter((s) => s.setType === 'working' && s.notes !== 'Startgewicht');
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayIdx);
    startOfWeek.setHours(0, 0, 0, 0);

    const focus = {};
    for (const s of sets) {
      const d = new Date(s.date);
      if (d >= startOfWeek) {
        focus[s.category] = (focus[s.category] || 0) + s.weight * s.reps;
      }
    }
    return focus;
  },

  getConsistencyDays(days = 28) {
    const sets = this.getAllSets().filter((s) => s.notes !== 'Startgewicht');
    const trainedDates = new Set(sets.map((s) => s.date));
    const result = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateStr(d);
      result.push({ date: dateStr, trained: trainedDates.has(dateStr) });
    }
    return result;
  },

  getWeekComparison() {
    const sets = this.getAllSets().filter((s) => s.setType === 'working' && s.notes !== 'Startgewicht');
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7;
    const thisStart = new Date(now);
    thisStart.setDate(now.getDate() - dayIdx);
    thisStart.setHours(0, 0, 0, 0);
    const lastStart = new Date(thisStart);
    lastStart.setDate(thisStart.getDate() - 7);

    const bucket = () => ({ volume: 0, sets: 0, days: new Set() });
    const thisWeek = bucket();
    const lastWeek = bucket();

    for (const s of sets) {
      const d = new Date(s.date);
      const vol = s.weight * s.reps;
      if (d >= thisStart) {
        thisWeek.volume += vol; thisWeek.sets += 1; thisWeek.days.add(s.date);
      } else if (d >= lastStart && d < thisStart) {
        lastWeek.volume += vol; lastWeek.sets += 1; lastWeek.days.add(s.date);
      }
    }

    const pct = (cur, prev) => {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    };

    return {
      thisWeek: { volume: thisWeek.volume, sets: thisWeek.sets, days: thisWeek.days.size },
      lastWeek: { volume: lastWeek.volume, sets: lastWeek.sets, days: lastWeek.days.size },
      volumeChangePct: pct(thisWeek.volume, lastWeek.volume),
      setsChangePct: pct(thisWeek.sets, lastWeek.sets),
    };
  },

  getDailyTrend(days = 7, metric = 'volume') {
    const sets = this.getAllSets().filter((s) => s.setType === 'working' && s.notes !== 'Startgewicht');
    const perDay = {};
    for (const s of sets) {
      perDay[s.date] = perDay[s.date] || { volume: 0, sets: 0 };
      perDay[s.date].volume += s.weight * s.reps;
      perDay[s.date].sets += 1;
    }
    const result = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = getLocalDateStr(d);
      result.push(perDay[key] ? perDay[key][metric] : 0);
    }
    return result;
  },

  getPushPullBalance() {
    const focus = this.getMuscleFocusThisWeek();
    const pushCats = ['chest', 'shoulders', 'triceps'];
    const pullCats = ['back', 'biceps'];
    const pushVolume = pushCats.reduce((sum, c) => sum + (focus[c] || 0), 0);
    const pullVolume = pullCats.reduce((sum, c) => sum + (focus[c] || 0), 0);
    const total = pushVolume + pullVolume;
    if (total === 0) return { pushPct: 50, pullPct: 50, hasData: false };
    return {
      pushPct: Math.round((pushVolume / total) * 100),
      pullPct: Math.round((pullVolume / total) * 100),
      hasData: true,
    };
  },

  // Trainingstype per datum: door jou gekozen via de dropdown. Zonder keuze: de volgende
  // in de rotatie (push, pull, legs, upper, lower) na de laatst gelogde sessie.
  getDayType(dateStr = getLocalDateStr()) {
    const stored = readJSON(LS_KEYS.dayTypes, {})[dateStr];
    if (stored && TRAINING_TYPES[stored]) return stored;
    const sets = this.getAllSets().filter((s) => s.notes !== 'Startgewicht' && s.date < dateStr);
    if (sets.length === 0) return TRAINING_TYPE_ORDER[0];
    const lastDate = sets.map((s) => s.date).sort().pop();
    const lastLabel = sets.find((s) => s.date === lastDate).day;
    const lastKey = TRAINING_TYPE_ORDER.find((k) => TRAINING_TYPES[k].label === lastLabel);
    if (!lastKey) return TRAINING_TYPE_ORDER[0];
    return TRAINING_TYPE_ORDER[(TRAINING_TYPE_ORDER.indexOf(lastKey) + 1) % TRAINING_TYPE_ORDER.length];
  },

  setDayType(type, dateStr = getLocalDateStr()) {
    const map = readJSON(LS_KEYS.dayTypes, {});
    map[dateStr] = type;
    writeJSON(LS_KEYS.dayTypes, map);
  },

  // Streak: aaneengesloten trainingsdagen, met maximaal 2 rustdagen ertussen.
  getScheduleStreak() {
    const trainedDates = new Set(this.getAllSets().filter((s) => s.notes !== 'Startgewicht').map((s) => s.date));
    const cursor = new Date();
    let gap = 0;
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      if (trainedDates.has(getLocalDateStr(cursor))) {
        streak += 1;
        gap = 0;
      } else if (i > 0 || streak > 0) {
        gap += 1;
        if (gap > 2) break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  },

  // Working volume vandaag t.o.v. het gemiddelde van de laatste 4 sessies van hetzelfde dagtype, 1-10.
  getIntensityToday() {
    const todayStr = getLocalDateStr();
    const todayType = this.getDayType();
    const workingSets = this.getAllSets().filter((s) => s.setType === 'working' && s.notes !== 'Startgewicht');
    const todayVolume = workingSets.filter((s) => s.date === todayStr).reduce((sum, s) => sum + s.weight * s.reps, 0);

    if (todayVolume === 0) return { hasData: false };
    if (!todayType) return { hasData: true, score: null };

    const cfg = TRAINING_TYPES[todayType];
    const sessionVolumes = {};
    for (const s of workingSets) {
      if (s.date === todayStr || s.day !== cfg.label) continue;
      sessionVolumes[s.date] = (sessionVolumes[s.date] || 0) + s.weight * s.reps;
    }
    const pastDates = Object.keys(sessionVolumes).sort().reverse().slice(0, 4);
    if (pastDates.length === 0) return { hasData: true, score: 5 };

    const avg = pastDates.reduce((sum, d) => sum + sessionVolumes[d], 0) / pastDates.length;
    const ratio = avg > 0 ? todayVolume / avg : 1;
    const score = Math.min(10, Math.max(1, Math.round(ratio * 5)));
    return { hasData: true, score };
  },

  // Spierfocus deze week, gegroepeerd naar de 4 Maison-tokens.
  getMuscleFocusGrouped() {
    const focus = this.getMuscleFocusThisWeek();
    const chest = focus.chest || 0;
    const back = focus.back || 0;
    const legs = focus.legs || 0;
    const shouldersArms = (focus.shoulders || 0) + (focus.biceps || 0) + (focus.triceps || 0);
    const total = chest + back + legs + shouldersArms;
    if (total === 0) return { hasData: false, groups: [] };
    const mk = (label, value, color) => ({ label, value, pct: Math.round((value / total) * 100), color });
    return {
      hasData: true,
      groups: [
        mk('Borst', chest, 'bordeaux'),
        mk('Rug', back, 'champagne'),
        mk('Benen', legs, 'sage'),
        mk('Schouders, armen', shouldersArms, 'slate'),
      ].filter((g) => g.value > 0),
    };
  },

  // Meest recente sessie van dit oefening, exclusief vandaag.
  getPreviousSession(exerciseId) {
    const todayStr = getLocalDateStr();
    const sets = this.getAllSets().filter((s) => s.exerciseId === exerciseId && s.notes !== 'Startgewicht' && s.date !== todayStr);
    if (sets.length === 0) return null;
    const lastDate = [...new Set(sets.map((s) => s.date))].sort().reverse()[0];
    const daySets = sets.filter((s) => s.date === lastDate).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return { date: lastDate, weight: daySets[0].weight, reps: daySets.map((s) => s.reps) };
  },

  getTodayExerciseProgress(type) {
    const todayStr = getLocalDateStr();
    const ids = new Set(this.getAllSets().filter((s) => s.date === todayStr && s.notes !== 'Startgewicht').map((s) => s.exerciseId));
    return { done: ids.size, target: DAY_EXERCISE_TARGET[type] || 5 };
  },

  getPRBeforeDate(exerciseId, dateStr) {
    const sets = this.getAllSets().filter((s) => s.exerciseId === exerciseId && s.setType === 'working' && s.date < dateStr);
    return sets.length === 0 ? 0 : Math.max(...sets.map((s) => s.weight));
  },

  // ---------- Sets corrigeren ----------

  // Verwijdert een set. Een al gesyncte rij in de Google Sheet blijft daar staan.
  deleteSet(id) {
    const sets = this.getAllSets();
    const target = sets.find((s) => s.id === id);
    if (!target) return false;
    this.saveAllSets(sets.filter((s) => s.id !== id));
    writeJSON(LS_KEYS.syncQueue, readJSON(LS_KEYS.syncQueue, []).filter((q) => q !== id));
    const usage = this.getUsage();
    if (usage[target.exerciseId] > 0) {
      usage[target.exerciseId] -= 1;
      writeJSON(LS_KEYS.usage, usage);
    }
    return true;
  },

  updateSet(id, patch) {
    const sets = this.getAllSets();
    const target = sets.find((s) => s.id === id);
    if (!target) return false;
    target.weight = patch.weight;
    target.reps = patch.reps;
    target.setType = patch.setType;
    this.saveAllSets(sets);
    return true;
  },

  getSetById(id) {
    return this.getAllSets().find((s) => s.id === id) || null;
  },

  isQueuedForSync(id) {
    return readJSON(LS_KEYS.syncQueue, []).includes(id);
  },

  // Zwaarste werkset ooit voor deze oefening (inclusief startgewicht), of null.
  getBestWeight(exerciseId) {
    const weights = this.getAllSets()
      .filter((s) => s.exerciseId === exerciseId && s.setType === 'working')
      .map((s) => s.weight);
    return weights.length ? Math.max(...weights) : null;
  },

  // ---------- Vooraf invullen en suggestie ----------

  getLastSetToday(exerciseId) {
    const sets = this.getSetsForDate(getLocalDateStr()).filter((s) => s.exerciseId === exerciseId && s.notes !== 'Startgewicht');
    return sets.length ? sets[sets.length - 1] : null;
  },

  // Beste werkset van de vorige sessie (niet vandaag): hoogste gewicht, meeste reps op dat gewicht.
  getSuggestion(exerciseId) {
    const todayStr = getLocalDateStr();
    const sets = this.getAllSets().filter((s) => s.exerciseId === exerciseId && s.setType === 'working'
      && (s.date !== todayStr || s.notes === 'Startgewicht'));
    if (sets.length === 0) return null;
    const real = sets.filter((s) => s.notes !== 'Startgewicht');
    const pool = real.length ? real : sets;
    const lastDate = pool.map((s) => s.date).sort().pop();
    const daySets = pool.filter((s) => s.date === lastDate);
    const weight = Math.max(...daySets.map((s) => s.weight));
    const reps = Math.max(...daySets.filter((s) => s.weight === weight).map((s) => s.reps));
    return { date: lastDate, weight, reps, isSeed: real.length === 0 };
  },

  // ---------- Historie ----------

  // Alle trainingsdagen, nieuwste eerst.
  getSessions() {
    const byDate = {};
    for (const s of this.getAllSets()) {
      if (s.notes === 'Startgewicht') continue;
      const d = byDate[s.date] = byDate[s.date] || { date: s.date, day: s.day, sets: [], volume: 0, workingSets: 0 };
      d.sets.push(s);
      if (s.setType === 'working') {
        d.volume += s.weight * s.reps;
        d.workingSets += 1;
      }
    }
    return Object.values(byDate)
      .map((d) => ({ ...d, sets: d.sets.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  // Aantal verbroken records deze week en vorige week. De eerste set van een oefening telt niet.
  getWeekPRCounts() {
    const sets = this.getAllSets()
      .filter((s) => s.setType === 'working')
      .sort((a, b) => a.date.localeCompare(b.date) || new Date(a.createdAt) - new Date(b.createdAt));
    const now = new Date();
    const thisStart = new Date(now);
    thisStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    thisStart.setHours(0, 0, 0, 0);
    const lastStart = new Date(thisStart);
    lastStart.setDate(thisStart.getDate() - 7);

    const best = {};
    const counts = { thisWeek: 0, lastWeek: 0 };
    for (const s of sets) {
      const prev = best[s.exerciseId];
      if (prev !== undefined && s.weight > prev && s.notes !== 'Startgewicht') {
        const d = new Date(s.date);
        if (d >= thisStart) counts.thisWeek += 1;
        else if (d >= lastStart) counts.lastWeek += 1;
      }
      if (prev === undefined || s.weight > prev) best[s.exerciseId] = s.weight;
    }
    return counts;
  },

  // Volume per spiergroep deze week, met benen gesplitst in voorkant (quad) en achterkant (glute/hamstring).
  getMuscleFocusDetailed() {
    const sets = this.getAllSets().filter((s) => s.setType === 'working' && s.notes !== 'Startgewicht');
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const focus = {};
    for (const s of sets) {
      if (new Date(s.date) < startOfWeek) continue;
      let key = s.category;
      if (key === 'legs') {
        const ex = EXERCISES.find((e) => e.id === s.exerciseId);
        key = ex && ex.focus === 'glute' ? 'legs_glute' : 'legs_quad';
      }
      focus[key] = (focus[key] || 0) + s.weight * s.reps;
    }
    return focus;
  },

  // ---------- Lichaamsgewicht ----------

  // [{ date, kg }], oudste eerst, één meting per dag.
  getBodyweights() {
    return readJSON(LS_KEYS.bodyweight, []).sort((a, b) => a.date.localeCompare(b.date));
  },

  saveBodyweight(kg, dateStr = getLocalDateStr()) {
    const list = this.getBodyweights().filter((b) => b.date !== dateStr);
    list.push({ date: dateStr, kg });
    writeJSON(LS_KEYS.bodyweight, list);
  },

  deleteBodyweight(dateStr) {
    writeJSON(LS_KEYS.bodyweight, this.getBodyweights().filter((b) => b.date !== dateStr));
  },

  // ---------- Rusttimer ----------

  // Seconden rust na een gelogde set; 0 = uit.
  getRestSeconds() {
    const raw = localStorage.getItem(LS_KEYS.restSeconds);
    const n = raw === null ? 120 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 120;
  },

  setRestSeconds(seconds) {
    localStorage.setItem(LS_KEYS.restSeconds, String(seconds));
  },

  // ---------- Back-up ----------

  exportData() {
    return {
      app: BACKUP_APP_ID,
      version: 1,
      exportedAt: new Date().toISOString(),
      sets: this.getAllSets(),
      usage: this.getUsage(),
      dayTypes: readJSON(LS_KEYS.dayTypes, {}),
      bodyweight: this.getBodyweights(),
      restSeconds: this.getRestSeconds(),
    };
  },

  // Voegt een back-up samen met wat er al staat. Bestaande sets en metingen blijven ongemoeid;
  // geïmporteerde sets gaan niet opnieuw naar de Google Sheet.
  importData(data) {
    if (!data || data.app !== BACKUP_APP_ID || !Array.isArray(data.sets)) {
      throw new Error('Dit is geen back-up van deze tracker.');
    }
    const valid = data.sets.filter((s) => s && typeof s.id === 'string' && typeof s.date === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && typeof s.exerciseId === 'string'
      && Number.isFinite(s.weight) && Number.isFinite(s.reps)
      && (s.setType === 'working' || s.setType === 'warmup'));

    const sets = this.getAllSets();
    const known = new Set(sets.map((s) => s.id));
    const usage = this.getUsage();
    let added = 0;
    for (const s of valid) {
      if (known.has(s.id)) continue;
      known.add(s.id);
      sets.push({
        id: s.id, date: s.date, day: String(s.day || ''), exerciseId: s.exerciseId, exercise: String(s.exercise || s.exerciseId),
        category: String(s.category || ''), weight: s.weight, reps: s.reps, setType: s.setType,
        notes: String(s.notes || ''), createdAt: String(s.createdAt || s.date),
      });
      if (s.notes !== 'Startgewicht') usage[s.exerciseId] = (usage[s.exerciseId] || 0) + 1;
      added += 1;
    }
    this.saveAllSets(sets);
    writeJSON(LS_KEYS.usage, usage);
    if (sets.some((s) => s.notes === 'Startgewicht')) writeJSON(LS_KEYS.seeded, true);

    if (data.dayTypes && typeof data.dayTypes === 'object') {
      const map = readJSON(LS_KEYS.dayTypes, {});
      for (const [date, type] of Object.entries(data.dayTypes)) {
        if (!map[date] && TRAINING_TYPES[type]) map[date] = type;
      }
      writeJSON(LS_KEYS.dayTypes, map);
    }

    let weights = 0;
    if (Array.isArray(data.bodyweight)) {
      const list = this.getBodyweights();
      const dates = new Set(list.map((b) => b.date));
      for (const b of data.bodyweight) {
        if (!b || dates.has(b.date) || !/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !Number.isFinite(b.kg)) continue;
        dates.add(b.date);
        list.push({ date: b.date, kg: b.kg });
        weights += 1;
      }
      writeJSON(LS_KEYS.bodyweight, list);
    }
    return { added, skipped: data.sets.length - added, weights };
  },
};

// Geschatte 1RM volgens Epley.
function e1rm(weight, reps) {
  return reps <= 1 ? weight : weight * (1 + reps / 30);
}
