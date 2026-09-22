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
        prMap[s.exerciseId] = { exerciseId: s.exerciseId, exercise: s.exercise, weight: s.weight, reps: s.reps, date: s.date };
      }
    }
    return Object.values(prMap).sort((a, b) => b.date.localeCompare(a.date));
  },

  getWeeklyVolume() {
    const sets = this.getAllSets().filter((s) => s.setType === 'working');
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
};
