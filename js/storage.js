// localStorage-laag: alle sets, usage counts en seed-startgewichten.
// Dit is de primaire, snelle store. sheets-sync.js houdt Google Sheets hiermee in sync.

const LS_KEYS = {
  sets: 'ft_sets',
  usage: 'ft_usage',
  seeded: 'ft_seeded_v1',
  syncQueue: 'ft_sync_queue',
  lastType: 'ft_last_type',
};

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
    for (const s of sets) {
      if (!prMap[s.exerciseId] || s.weight > prMap[s.exerciseId].weight) {
        prMap[s.exerciseId] = { exerciseId: s.exerciseId, exercise: s.exercise, category: s.category, weight: s.weight, reps: s.reps, date: s.date };
      }
    }
    return Object.values(prMap).sort((a, b) => b.date.localeCompare(a.date));
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

  // Streak "dagen op schema": rustdagen (do/zo) breken de streak niet, een
  // gemiste trainingsdag wel. Vandaag telt zodra hij kwalificeert (rustdag of al getraind).
  getScheduleStreak() {
    const trainedDates = new Set(this.getAllSets().filter((s) => s.notes !== 'Startgewicht').map((s) => s.date));
    let cursor = new Date();
    const qualifies = (d) => isRestDay(getWeekdayKey(d)) || trainedDates.has(getLocalDateStr(d));
    if (!qualifies(cursor)) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (qualifies(cursor)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  },

  // Working volume vandaag t.o.v. het gemiddelde van de laatste 4 sessies van hetzelfde dagtype, 1-10.
  getIntensityToday() {
    const todayStr = getLocalDateStr();
    const todayType = getTodayScheduleType();
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
};
