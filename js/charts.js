// Chart.js rendering helpers (Chart.js geladen via CDN in index.html)

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
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74, 222, 128, 0.15)',
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: '#4ade80',
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
          x: { ticks: { color: '#9ca3af' }, grid: { color: '#27272a' } },
          y: { ticks: { color: '#9ca3af' }, grid: { color: '#27272a' }, beginAtZero: false },
        },
      },
    });
  },

  renderWeeklyVolume(canvas, perDay) {
    const days = DAY_ORDER;
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
      labels.push(DAY_CONFIG[days[i]].label.slice(0, 2));
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
          backgroundColor: '#60a5fa',
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
          y: { ticks: { color: '#9ca3af' }, grid: { color: '#27272a' } },
        },
      },
    });
  },
};

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' });
}
