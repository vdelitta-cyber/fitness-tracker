// Google Sheets sync via Google Identity Services (client-side OAuth).
// Vereist een eigen Google Cloud OAuth Client ID (zie README.md).
// Sheet "Fitness_Tracker_Vin": Datum | Dag | Oefening | Gewicht | Reps | Set Type | Notes

const SHEETS_LS = {
  clientId: 'ft_google_client_id',
  spreadsheetId: 'ft_spreadsheet_id',
  lastSync: 'ft_last_sync',
};

const SHEET_HEADER = ['Datum', 'Dag', 'Oefening', 'Gewicht', 'Reps', 'Set Type', 'Notes'];
const SPREADSHEET_TITLE = 'Fitness_Tracker_Vin';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

const SheetsSync = {
  tokenClient: null,
  accessToken: null,
  status: 'idle', // idle | connecting | connected | error | not_configured
  listeners: [],

  onStatusChange(fn) {
    this.listeners.push(fn);
  },

  setStatus(status, detail) {
    this.status = status;
    this.detail = detail || '';
    this.listeners.forEach((fn) => fn(status, this.detail));
  },

  getClientId() {
    return localStorage.getItem(SHEETS_LS.clientId) || '';
  },

  setClientId(id) {
    localStorage.setItem(SHEETS_LS.clientId, id.trim());
  },

  getSpreadsheetId() {
    return localStorage.getItem(SHEETS_LS.spreadsheetId) || '';
  },

  setSpreadsheetId(id) {
    localStorage.setItem(SHEETS_LS.spreadsheetId, id);
  },

  isConfigured() {
    return !!this.getClientId();
  },

  init() {
    if (!this.isConfigured()) {
      this.setStatus('not_configured');
      return;
    }
    if (!window.google || !window.google.accounts) {
      this.setStatus('error', 'Google Identity Services kon niet laden.');
      return;
    }
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.getClientId(),
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) {
          this.setStatus('error', resp.error);
          return;
        }
        this.accessToken = resp.access_token;
        this.setStatus('connected');
        this.afterConnect();
      },
    });
    this.setStatus('idle');
  },

  connect() {
    if (!this.tokenClient) {
      this.init();
      if (!this.tokenClient) return;
    }
    this.setStatus('connecting');
    this.tokenClient.requestAccessToken({ prompt: this.accessToken ? '' : 'consent' });
  },

  disconnect() {
    if (this.accessToken && window.google) {
      google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    this.accessToken = null;
    this.setStatus('idle');
  },

  async afterConnect() {
    try {
      if (!this.getSpreadsheetId()) {
        await this.findOrCreateSpreadsheet();
      }
      await this.flushQueue();
    } catch (e) {
      this.setStatus('error', e.message || String(e));
    }
  },

  async apiFetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Sheets API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  },

  async findOrCreateSpreadsheet() {
    const query = encodeURIComponent(
      `name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    );
    const search = await this.apiFetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`
    );
    if (search.files && search.files.length > 0) {
      this.setSpreadsheetId(search.files[0].id);
      return;
    }
    const created = await this.apiFetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      body: JSON.stringify({
        properties: { title: SPREADSHEET_TITLE },
        sheets: [{ properties: { title: 'Sets' } }],
      }),
    });
    this.setSpreadsheetId(created.spreadsheetId);
    await this.apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values/Sets!A1:G1?valueInputOption=RAW`,
      { method: 'PUT', body: JSON.stringify({ values: [SHEET_HEADER] }) }
    );
  },

  rowsFromSets(sets) {
    return sets.map((s) => [
      s.date,
      s.day,
      s.exercise,
      s.weight,
      s.reps,
      s.setType === 'warmup' ? 'Warmup' : 'Working',
      s.notes || '',
    ]);
  },

  async flushQueue() {
    if (this.status !== 'connected') return;
    const queued = Storage.getSyncQueue();
    if (queued.length === 0) return;
    const values = this.rowsFromSets(queued);
    const spreadsheetId = this.getSpreadsheetId();
    await this.apiFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sets!A1:G1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values }) }
    );
    Storage.clearSyncQueue();
    localStorage.setItem(SHEETS_LS.lastSync, new Date().toISOString());
  },

  async syncNow() {
    if (!this.isConfigured()) {
      this.setStatus('not_configured');
      return;
    }
    if (this.status !== 'connected') {
      this.connect();
      return;
    }
    await this.flushQueue();
  },

  getLastSync() {
    return localStorage.getItem(SHEETS_LS.lastSync);
  },

  getSheetUrl() {
    const id = this.getSpreadsheetId();
    return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : null;
  },
};
