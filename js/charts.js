// Chart.js rendering helpers (Chart.js geladen via CDN in index.html)

const CHART_GRID = '#2E2720';
const CHART_MUTED = '#A89F92';
const CHART_ACCENT = '#C9A96E';
const CHART_ACCENT_LIGHT = '#E0C48D';

const ChartsUI = {
  progressionChart: null,
  volumeChart: null,

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
          backgroundColor: 'rgba(201, 169, 110, 0.15)',
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
