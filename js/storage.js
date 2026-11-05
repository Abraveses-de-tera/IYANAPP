/**
 * Storage and Data Engine for IYANAPP - Planta14 Futsal
 * Supports LocalStorage (standalone offline) & Firebase Firestore real-time sync.
 */

const STORAGE_KEYS = {
  PLAYERS: 'iyanapp_planta14_players',
  SESSIONS: 'iyanapp_planta14_sessions',
  SETTINGS: 'iyanapp_planta14_settings',
  PIN_AUTH: 'iyanapp_planta14_auth'
};

const DEFAULT_PLAYERS = [
  { id: 'p_1', name: 'Julia', number: 1, position: 'Portera', active: true },
  { id: 'p_2', name: 'Irene', number: 2, position: 'Cierre', active: true },
  { id: 'p_3', name: 'Laura', number: 3, position: 'Ala', active: true },
  { id: 'p_4', name: 'Eli', number: 4, position: 'Cierre', active: true },
  { id: 'p_5', name: 'Sheila', number: 5, position: 'Ala', active: true },
  { id: 'p_6', name: 'Carla', number: 6, position: 'Pívot', active: true },
  { id: 'p_7', name: 'Ocaña', number: 7, position: 'Ala', active: true },
  { id: 'p_8', name: 'Natalia', number: 8, position: 'Ala', active: true },
  { id: 'p_9', name: 'Paula', number: 9, position: 'Pívot', active: true },
  { id: 'p_10', name: 'Melody', number: 10, position: 'Ala', active: true },
  { id: 'p_11', name: 'Lucia', number: 11, position: 'Ala / Cierre', active: true },
  { id: 'p_12', name: 'Andrea', number: 12, position: 'Portera', active: true },
  { id: 'p_13', name: 'Yaralla', number: 13, position: 'Ala / Pívot', active: true }
];

const DEFAULT_SETTINGS = {
  teamName: 'Planta14',
  teamSubtitle: 'Fútbol Sala Femenino',
  seasonStart: '2026-10-01',
  seasonEnd: '2027-07-31',
  pin: '1414',
  firebaseConfig: null,
  syncStatus: 'local' // 'local', 'syncing', 'synced', 'error'
};

class StorageEngine {
  constructor() {
    this.players = [];
    this.sessions = {};
    this.settings = { ...DEFAULT_SETTINGS };
    this.unlocked = false;
    this.listeners = new Set();
    this.firestoreDb = null;
    this.firebaseInitialized = false;

    this.init();
  }

  init() {
    // 1. Load settings
    const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (storedSettings) {
      try {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
    } else {
      this.saveSettings(this.settings);
    }

    // 2. Load players
    const storedPlayers = localStorage.getItem(STORAGE_KEYS.PLAYERS);
    if (storedPlayers) {
      try {
        this.players = JSON.parse(storedPlayers);
      } catch (e) {
        this.players = [...DEFAULT_PLAYERS];
      }
    } else {
      this.players = [...DEFAULT_PLAYERS];
      this.savePlayers(this.players);
    }

    // 3. Load sessions
    const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (storedSessions) {
      try {
        this.sessions = JSON.parse(storedSessions);
      } catch (e) {
        this.sessions = {};
      }
    }

    // 4. Session auth state
    const authSession = sessionStorage.getItem(STORAGE_KEYS.PIN_AUTH);
    this.unlocked = authSession === 'true';

    // 5. Try init Firebase if config exists
    if (this.settings.firebaseConfig) {
      this.initFirebase(this.settings.firebaseConfig);
    }
  }

  // --- Observability ---
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(eventType, data) {
    for (const listener of this.listeners) {
      try {
        listener(eventType, data);
      } catch (e) {
        console.error('Listener error:', e);
      }
    }
  }

  // --- Players Management ---
  getPlayers(includeInactive = false) {
    if (includeInactive) {
      return [...this.players];
    }
    return this.players.filter(p => p.active !== false);
  }

  getAllPlayers() {
    return [...this.players];
  }

  getPlayerById(id) {
    return this.players.find(p => p.id === id) || null;
  }

  savePlayers(newPlayers) {
    this.players = newPlayers;
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(this.players));
    this.syncToFirebase('players', this.players);
    this.notify('players', this.players);
  }

  addPlayer(name, number = null, position = 'Jugadora') {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newPlayer = {
      id,
      name: trimmed,
      number: number ? parseInt(number, 10) : null,
      position: position || 'Jugadora',
      active: true,
      createdAt: Date.now()
    };

    const updated = [...this.players, newPlayer];
    this.savePlayers(updated);
    return newPlayer;
  }

  updatePlayer(id, data) {
    const updated = this.players.map(p => {
      if (p.id === id) {
        return { ...p, ...data };
      }
      return p;
    });
    this.savePlayers(updated);
  }

  togglePlayerActive(id) {
    const updated = this.players.map(p => {
      if (p.id === id) {
        return { ...p, active: !p.active };
      }
      return p;
    });
    this.savePlayers(updated);
  }

  // --- Sessions & Attendance Management ---
  getSession(dateStr) {
    return this.sessions[dateStr] || null;
  }

  getAllSessions() {
    return { ...this.sessions };
  }

  /**
   * Save or update an attendance session.
   * sessionData: {
   *   date: "YYYY-MM-DD",
   *   type: "training" | "match" | "other",
   *   records: { [playerId]: boolean },
   *   playerNotes: { [playerId]: string },
   *   notes: string,
   *   opponent: string,
   *   result: string
   * }
   */
  saveSession(sessionData) {
    if (!sessionData || !sessionData.date) return;

    const dateStr = sessionData.date;
    const existing = this.sessions[dateStr] || {};

    const updated = {
      ...existing,
      ...sessionData,
      date: dateStr,
      updatedAt: Date.now()
    };

    this.sessions[dateStr] = updated;
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(this.sessions));
    this.syncToFirebase('session', updated);
    this.notify('session', updated);
    return updated;
  }

  setAttendanceRecord(dateStr, type, playerId, status, playerNote = null) {
    const session = this.getSession(dateStr) || {
      date: dateStr,
      type: type || 'training',
      records: {},
      playerNotes: {},
      notes: '',
      opponent: '',
      result: ''
    };

    if (!session.records) session.records = {};
    if (!session.playerNotes) session.playerNotes = {};

    session.records[playerId] = Boolean(status);
    if (playerNote !== null) {
      session.playerNotes[playerId] = playerNote;
    }

    return this.saveSession(session);
  }

  setBulkAttendance(dateStr, type, status) {
    const session = this.getSession(dateStr) || {
      date: dateStr,
      type: type || 'training',
      records: {},
      playerNotes: {},
      notes: '',
      opponent: '',
      result: ''
    };

    if (!session.records) session.records = {};
    const activePlayers = this.getPlayers(false);

    for (const p of activePlayers) {
      session.records[p.id] = Boolean(status);
    }

    return this.saveSession(session);
  }

  deleteSession(dateStr) {
    if (this.sessions[dateStr]) {
      delete this.sessions[dateStr];
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(this.sessions));
      this.syncDeleteFirebase(dateStr);
      this.notify('session_deleted', dateStr);
    }
  }

  // --- PIN Protection ---
  isUnlocked() {
    return this.unlocked;
  }

  unlock(enteredPin) {
    if (enteredPin === this.settings.pin) {
      this.unlocked = true;
      sessionStorage.setItem(STORAGE_KEYS.PIN_AUTH, 'true');
      this.notify('auth', true);
      return true;
    }
    return false;
  }

  lock() {
    this.unlocked = false;
    sessionStorage.removeItem(STORAGE_KEYS.PIN_AUTH);
    this.notify('auth', false);
  }

  changePin(newPin) {
    if (!newPin || newPin.length < 4) return false;
    this.settings.pin = newPin;
    this.saveSettings(this.settings);
    this.notify('pin_changed', newPin);
    return true;
  }

  // --- Settings ---
  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    this.notify('settings', this.settings);
  }

  // --- Backup: JSON Export / Import ---
  exportBackup() {
    const data = {
      app: 'IYANAPP',
      team: 'Planta14',
      exportDate: new Date().toISOString(),
      version: 1,
      players: this.players,
      sessions: this.sessions,
      settings: {
        teamName: this.settings.teamName,
        teamSubtitle: this.settings.teamSubtitle,
        seasonStart: this.settings.seasonStart,
        seasonEnd: this.settings.seasonEnd
      }
    };
    return JSON.stringify(data, null, 2);
  }

  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.players || !parsed.sessions) {
        throw new Error('Formato de archivo de copia de seguridad no válido.');
      }

      this.players = parsed.players;
      this.sessions = parsed.sessions;

      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(this.players));
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(this.sessions));

      if (parsed.settings) {
        this.saveSettings(parsed.settings);
      }

      if (this.firebaseInitialized) {
        this.syncAllToFirebase();
      }

      this.notify('imported', true);
      return { success: true, countPlayers: this.players.length, countSessions: Object.keys(this.sessions).length };
    } catch (err) {
      console.error('Import error:', err);
      return { success: false, error: err.message };
    }
  }

  // --- Firebase Integration (Firestore Real-time Sync) ---
  initFirebase(config) {
    if (!config || !config.apiKey || !config.projectId) {
      this.firebaseInitialized = false;
      return false;
    }

    try {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK compat not loaded yet.');
        return false;
      }

      // Check if already initialized
      let app;
      if (!firebase.apps.length) {
        app = firebase.initializeApp(config);
      } else {
        app = firebase.app();
      }

      this.firestoreDb = firebase.firestore(app);
      this.firebaseInitialized = true;
      this.settings.syncStatus = 'synced';
      this.saveSettings(this.settings);

      // Listen for real-time changes
      this.listenToFirebase();
      return true;
    } catch (err) {
      console.error('Firebase init failed:', err);
      this.settings.syncStatus = 'error';
      return false;
    }
  }

  listenToFirebase() {
    if (!this.firestoreDb) return;

    const teamDocRef = this.firestoreDb.collection('iyanapp_teams').doc('planta14');

    teamDocRef.onSnapshot((doc) => {
      if (doc.exists) {
        const remoteData = doc.data();
        if (remoteData.players && Array.isArray(remoteData.players)) {
          this.players = remoteData.players;
          localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(this.players));
        }
        if (remoteData.sessions && typeof remoteData.sessions === 'object') {
          this.sessions = remoteData.sessions;
          localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(this.sessions));
        }
        this.notify('firebase_sync', true);
      } else {
        // Document does not exist yet; populate initial data to Firestore
        this.syncAllToFirebase();
      }
    }, (error) => {
      console.error('Firebase snapshot listener error:', error);
      this.settings.syncStatus = 'error';
    });
  }

  async syncToFirebase(type, data) {
    if (!this.firebaseInitialized || !this.firestoreDb) return;

    try {
      const teamDocRef = this.firestoreDb.collection('iyanapp_teams').doc('planta14');
      if (type === 'players') {
        await teamDocRef.set({ players: data, lastUpdated: Date.now() }, { merge: true });
      } else if (type === 'session') {
        const updatePayload = {};
        updatePayload[`sessions.${data.date}`] = data;
        updatePayload.lastUpdated = Date.now();
        await teamDocRef.set(updatePayload, { merge: true });
      }
      this.settings.syncStatus = 'synced';
    } catch (err) {
      console.error('Firebase write error:', err);
      this.settings.syncStatus = 'error';
    }
  }

  async syncDeleteFirebase(dateStr) {
    if (!this.firebaseInitialized || !this.firestoreDb) return;
    try {
      const teamDocRef = this.firestoreDb.collection('iyanapp_teams').doc('planta14');
      const updatePayload = {};
      updatePayload[`sessions.${dateStr}`] = firebase.firestore.FieldValue.delete();
      await teamDocRef.update(updatePayload);
    } catch (err) {
      console.error('Firebase delete error:', err);
    }
  }

  async syncAllToFirebase() {
    if (!this.firebaseInitialized || !this.firestoreDb) return;
    try {
      const teamDocRef = this.firestoreDb.collection('iyanapp_teams').doc('planta14');
      await teamDocRef.set({
        players: this.players,
        sessions: this.sessions,
        settings: {
          teamName: this.settings.teamName,
          seasonStart: this.settings.seasonStart,
          seasonEnd: this.settings.seasonEnd
        },
        lastUpdated: Date.now()
      }, { merge: true });
      this.settings.syncStatus = 'synced';
      console.log('Synchronized all data to Firestore.');
    } catch (err) {
      console.error('Failed to sync all to Firebase:', err);
    }
  }
}

// Global singleton instance
window.storageEngine = new StorageEngine();
