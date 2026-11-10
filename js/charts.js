// Chart.js rendering helpers (Chart.js geladen via CDN in index.html)

const CHART_GRID = '#262626';
const CHART_MUTED = '#8a8a8a';
const CHART_ACCENT = '#f5f5f5';
const CHART_ACCENT_LIGHT = '#ffffff';

const ChartsUI = {
  progressionChart: null,
  volumeChart: null,
  bodyweightChart: null,

  // sessions: [{ date, weight, reps, e1rm }], één punt per training, oudste eerst.
  renderProgression(canvas, sessions) {
    const labels = sessions.map((s) => formatDateShort(s.date));
    const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('nl-NL');

    if (this.progressionChart) this.progressionChart.destroy();
    this.progressionChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Topgewicht',
          data: sessions.map((s) => s.weight),
          borderColor: CHART_ACCENT,
          backgroundColor: 'rgba(245, 245, 245, 0.08)',
          borderWidth: 2,
          tension: 0,
          pointRadius: 3,
          pointStyle: 'rect',
          pointBackgroundColor: CHART_ACCENT_LIGHT,
          fill: true,
        }, {
          label: 'Geschatte 1RM',
          data: sessions.map((s) => Math.round(s.e1rm * 10) / 10),
          borderColor: CHART_MUTED,
          borderWidth: 2,
          borderDash: [5, 4],
          tension: 0,
          pointRadius: 3,
          pointStyle: 'circle',
          pointBackgroundColor: '#000000',
          pointBorderColor: CHART_MUTED,
          fill: false,
        }],
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: '#bdbdbd', usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 14 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.datasetIndex === 0
                ? `Topgewicht: ${fmt(ctx.parsed.y)} kg × ${sessions[ctx.dataIndex].reps}`
                : `Geschatte 1RM: ${fmt(ctx.parsed.y)} kg`,
            },
          },
        },
        scales: {
          x: { ticks: { color: CHART_MUTED, maxTicksLimit: 6 }, grid: { color: CHART_GRID } },
          y: { ticks: { color: CHART_MUTED }, grid: { color: CHART_GRID }, beginAtZero: false },
        },
      },
    });
  },

  // list: [{ date, kg }], oudste eerst.
  renderBodyweight(canvas, list) {
    if (this.bodyweightChart) this.bodyweightChart.destroy();
    this.bodyweightChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: list.map((b) => formatDateShort(b.date)),
        datasets: [{
          label: 'Lichaamsgewicht',
          data: list.map((b) => b.kg),
          borderColor: CHART_ACCENT,
          borderWidth: 2,
          tension: 0,
          pointRadius: 3,
          pointStyle: 'rect',
          pointBackgroundColor: CHART_ACCENT_LIGHT,
          fill: false,
        }],
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y.toLocaleString('nl-NL')} kg` } },
        },
        scales: {
          x: { ticks: { color: CHART_MUTED, maxTicksLimit: 6 }, grid: { color: CHART_GRID } },
          y: { ticks: { color: CHART_MUTED }, grid: { color: CHART_GRID }, beginAtZero: false },
        },
      },
    });
  },

  renderWeeklyVolume(canvas, perDay) {
    const days = WEEKDAY_ORDER;
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayIdx);

    const labels = [];
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const key = getLocalDateStr(d);
      labels.push(WEEKDAY_SHORT[days[i]]);
      data.push(perDay[key] ? perDay[key].volume : 0);
    }

    if (this.volumeChart) this.volumeChart.destroy();
    this.volumeChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Volume (kg)',
          data,
          backgroundColor: CHART_ACCENT,
          borderRadius: 0,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: CHART_MUTED }, grid: { display: false } },
          y: { ticks: { color: CHART_MUTED }, grid: { color: CHART_GRID } },
        },
      },
    });
  },
};

const MONTHS_SHORT_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' });
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_SHORT_NL[d.getMonth()]}`;
}
