// Chart.js rendering helpers (Chart.js geladen via CDN in index.html)

const CHART_GRID = '#2E2720';
const CHART_MUTED = '#A89F92';
const CHART_ACCENT = '#C9A96E';
const CHART_ACCENT_LIGHT = '#E0C48D';

const CHART_GRID_SOFT = 'rgba(255, 238, 210, 0.06)';
const CHART_FONT = { family: "'Manrope', -apple-system, sans-serif", size: 11, weight: 500 };

const CHART_TOOLTIP = {
  backgroundColor: 'rgba(14, 12, 10, 0.94)',
  borderColor: 'rgba(255, 238, 210, 0.14)',
  borderWidth: 1,
  cornerRadius: 12,
  padding: 12,
  displayColors: false,
  titleColor: '#A89F92',
  titleFont: { family: CHART_FONT.family, size: 11, weight: 600 },
  bodyColor: '#F2EDE4',
  bodyFont: { family: CHART_FONT.family, size: 13, weight: 600 },
  caretSize: 0,
};

function chartGradient(ctx, area, top, bottom) {
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

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
          borderColor: CHART_ACCENT_LIGHT,
          borderWidth: 2,
          backgroundColor: (c) => (c.chart.chartArea
            ? chartGradient(c.chart.ctx, c.chart.chartArea, 'rgba(224, 196, 141, 0.32)', 'rgba(201, 169, 110, 0)')
            : 'rgba(201, 169, 110, 0.15)'),
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: CHART_ACCENT_LIGHT,
          pointHoverBorderColor: '#0E0C0A',
          pointHoverBorderWidth: 3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        animation: { duration: 900, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...CHART_TOOLTIP,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} kg`,
              afterLabel: (ctx) => `${workingSets[ctx.dataIndex].reps} reps`,
            },
          },
        },
        scales: {
          x: { ticks: { color: CHART_MUTED, font: CHART_FONT, maxTicksLimit: 6 }, grid: { display: false }, border: { display: false } },
          y: { ticks: { color: CHART_MUTED, font: CHART_FONT, maxTicksLimit: 5 }, grid: { color: CHART_GRID_SOFT }, border: { display: false }, beginAtZero: false },
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
          backgroundColor: (c) => (c.chart.chartArea
            ? chartGradient(c.chart.ctx, c.chart.chartArea, '#E6CB95', '#A98446')
            : CHART_ACCENT),
          hoverBackgroundColor: CHART_ACCENT_LIGHT,
          borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 2, bottomRight: 2 },
          borderSkipped: false,
          maxBarThickness: 28,
        }],
      },
      options: {
        responsive: true,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: { ...CHART_TOOLTIP, callbacks: { label: (ctx) => `${ctx.parsed.y.toLocaleString('nl-NL')} kg` } },
        },
        scales: {
          x: { ticks: { color: CHART_MUTED, font: CHART_FONT }, grid: { display: false }, border: { display: false } },
          y: { ticks: { color: CHART_MUTED, font: CHART_FONT, maxTicksLimit: 5 }, grid: { color: CHART_GRID_SOFT }, border: { display: false } },
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
