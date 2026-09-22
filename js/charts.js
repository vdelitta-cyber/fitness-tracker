// Chart.js rendering helpers (Chart.js geladen via CDN in index.html)

const CHART_GRID = '#2d3748';
const CHART_MUTED = '#9ca3af';
const CHART_ACCENT = '#10b981';
const CHART_ACCENT_LIGHT = '#34d399';

const ChartsUI = {
  progressionChart: null,
  volumeChart: null,
  volumeTrendChart: null,
  muscleFocusChart: null,

  renderProgression(canvas, workingSets) {
    const labels = workingSets.map((s) => formatDateShort(s.date));
    const data = workingSets.map((s) => s.weight);

    if (this.progressionChart) this.progressionChart.destroy();
    this.progressionChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Gewicht (kg)',
          data,
          borderColor: CHART_ACCENT,
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: CHART_ACCENT_LIGHT,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => `${workingSets[ctx.dataIndex].reps} reps`,
            },
          },
        },
        scales: {
          x: { ticks: { color: CHART_MUTED }, grid: { color: CHART_GRID } },
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
      const key = d.toISOString().slice(0, 10);
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
          borderRadius: 4,
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

  renderVolumeTrend(canvas, weeks) {
    if (this.volumeTrendChart) this.volumeTrendChart.destroy();
    this.volumeTrendChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: weeks.map((w) => w.label),
        datasets: [{
          label: 'Volume (kg)',
          data: weeks.map((w) => w.volume),
          borderColor: CHART_ACCENT,
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: CHART_ACCENT_LIGHT,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: CHART_MUTED, font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: CHART_MUTED }, grid: { color: CHART_GRID } },
        },
      },
    });
  },

  renderMuscleFocus(canvas, focusMap) {
    const entries = Object.entries(focusMap).sort((a, b) => b[1] - a[1]);
    if (this.muscleFocusChart) this.muscleFocusChart.destroy();
    if (entries.length === 0) return;
    this.muscleFocusChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: entries.map(([cat]) => CATEGORY_LABELS[cat] || cat),
        datasets: [{
          data: entries.map(([, vol]) => vol),
          backgroundColor: entries.map(([cat]) => CATEGORY_COLORS[cat] || CHART_MUTED),
          borderColor: '#1a1a1a',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: CHART_MUTED, boxWidth: 12, font: { size: 12 } },
          },
        },
      },
    });
  },
};

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' });
}
