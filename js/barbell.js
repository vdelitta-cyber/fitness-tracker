// Tekent de zwaarste werkset als geladen stang, dumbbell of kabelstapel (inline SVG).

const Barbell = {
  // hoogte, dikte en randhelderheid per schijf (kg)
  PLATES: { 25: [120, 13, 1], 20: [120, 12, 0.85], 15: [104, 11, 0.75], 10: [86, 9, 0.65], 5: [64, 7, 0.6], 2.5: [50, 6, 0.55], 1.25: [40, 5, 0.5] },
  BAR_KG: 20,
  DB_HANDLE_KG: 2,

  // Leidt het type af uit de oefeningnaam.
  kindFor(name) {
    const n = (name || '').toLowerCase();
    if (/dumbbell|db /.test(n)) return 'db';
    if (/cable|machine|pulldown|smith|hammer|plate loaded|pec fly|push up|dips|pull up/.test(n)) return 'stack';
    if (/barbell|bench press|squat|deadlift|overhead press|military|row|rdl|hip thrust|good morning|floor press|landmine|lunge/.test(n)) return 'bar';
    return 'stack';
  },

  split(perSide) {
    const out = [];
    let r = Math.round(perSide * 100) / 100;
    for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) {
      while (r >= p - 1e-9) { out.push(p); r = Math.round((r - p) * 100) / 100; }
    }
    return out;
  },

  fmt(n) { return (Math.round(n * 100) / 100).toString().replace('.', ','); },

  defs() {
    return `<defs>
      <linearGradient id="bbPlate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2b2b"/><stop offset=".5" stop-color="#111"/><stop offset="1" stop-color="#050505"/></linearGradient>
      <linearGradient id="bbSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f2f2"/><stop offset=".5" stop-color="#a8a8a8"/><stop offset="1" stop-color="#4a4a4a"/></linearGradient>
    </defs>`;
  },

  // Geeft de uitlegregel terug, tekent in svg.
  draw(svg, kg, kind) {
    const cy = 75;
    if (kind === 'stack') {
      const n = Math.min(16, Math.max(0, Math.round(kg / 5)));
      let h = this.defs();
      for (let i = 0; i < 16; i++) {
        h += `<rect x="150" y="${130 - i * 7.5}" width="100" height="6" fill="${i < n ? '#f5f5f5' : '#1f1f1f'}"/>`;
      }
      h += `<rect x="198" y="8" width="4" height="${Math.max(0, 130 - n * 7.5)}" fill="url(#bbSteel)"/>`;
      svg.innerHTML = h;
      return `Stapel, ${this.fmt(kg)} kg`;
    }

    const isDb = kind === 'db';
    const plates = this.split(Math.max(0, (kg - (isDb ? this.DB_HANDLE_KG : this.BAR_KG)) / 2));
    const inner = isDb ? [160, 240] : [118, 282];
    const outer = isDb ? [110, 290] : [14, 386];
    const sc = isDb ? 0.62 : 1;

    let h = this.defs();
    h += `<rect x="${outer[0]}" y="${cy - 3}" width="${outer[1] - outer[0]}" height="6" rx="3" fill="url(#bbSteel)"/>`;
    // knurling op het greepdeel
    for (let x = inner[0] + 14; x < inner[1] - 14; x += 4) {
      h += `<line x1="${x}" y1="${cy - 3}" x2="${x}" y2="${cy + 3}" stroke="#3a3a3a" stroke-width="1"/>`;
    }
    [[inner[0], -1], [inner[1], 1]].forEach(([x0, dir]) => {
      h += `<rect x="${dir < 0 ? x0 - 8 : x0}" y="${cy - 9 * sc - 4}" width="8" height="${18 * sc + 8}" fill="url(#bbSteel)"/>`;
      let x = dir < 0 ? x0 - 9 : x0 + 9;
      plates.forEach((p) => {
        const [ph, pw, edge] = this.PLATES[p];
        const H = ph * sc, W = pw * sc;
        const px = dir < 0 ? x - W : x;
        h += `<rect x="${px}" y="${cy - H / 2}" width="${W}" height="${H}" rx="${W / 3}" fill="url(#bbPlate)" stroke="#f5f5f5" stroke-opacity="${edge}" stroke-width="1.2"/>`;
        x += dir * (W + 1.5);
      });
    });
    svg.innerHTML = h;

    if (isDb) return `Dumbbell, ${this.fmt(kg)} kg per hand`;
    return plates.length
      ? `Per kant: ${plates.map((p) => this.fmt(p)).join(' + ')} kg, stang 20 kg`
      : 'Lege stang, 20 kg';
  },
};
