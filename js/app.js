/**
 * Main Application Controller for IYANAPP - Planta14 Futsal
 */

(function () {
  'use strict';

  // --- DOM Elements Cache ---
  const views = {
    calendar: document.getElementById('view-calendar'),
    day: document.getElementById('view-day'),
    matrix: document.getElementById('view-matrix'),
    stats: document.getElementById('view-stats'),
    settings: document.getElementById('view-settings')
  };

  const navTabs = document.querySelectorAll('.nav-tab');
  const toastContainer = document.getElementById('toast-container');

  // Header Elements
  const btnToggleAuth = document.getElementById('btn-toggle-auth');
  const lockIcon = document.getElementById('lock-icon');
  const lockText = document.getElementById('lock-text');
  const syncDot = document.getElementById('sync-dot');

  // Modals
  const modalPin = document.getElementById('modal-pin');
  const modalPlayerNote = document.getElementById('modal-player-note');
  const modalPlayerEdit = document.getElementById('modal-player-edit');
  const modalWhatsapp = document.getElementById('modal-whatsapp-share');

  // State
  let currentActiveView = 'view-calendar';
  let pinBuffer = '';
  let pendingAuthAction = null;
  let activeNotePlayerId = null;

  // ==========================================================================
  // Toast Notifications
  // ==========================================================================
  function showToast(message, duration = 2500) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, duration);
  }

  // ==========================================================================
  // View Router
  // ==========================================================================
  function switchView(targetViewId) {
    for (const key in views) {
      if (views[key]) {
        views[key].classList.toggle('active', views[key].id === targetViewId);
      }
    }

    navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-view') === targetViewId);
    });

    currentActiveView = targetViewId;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh contents based on active view
    if (targetViewId === 'view-calendar') {
      renderCalendar();
    } else if (targetViewId === 'view-day') {
      renderDayView(window.calendarEngine.selectedDate);
    } else if (targetViewId === 'view-matrix') {
      renderMatrix();
    } else if (targetViewId === 'view-stats') {
      renderStats();
    } else if (targetViewId === 'view-settings') {
      renderSettings();
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-view');
      switchView(target);
    });
  });

  // ==========================================================================
  // PIN & Auth Management
  // ==========================================================================
  function updateAuthUI() {
    const isUnlocked = window.storageEngine.isUnlocked();
    if (isUnlocked) {
      btnToggleAuth.className = 'badge-mode unlocked';
      lockIcon.textContent = '🔓';
      lockText.textContent = 'Entrenador';
    } else {
      btnToggleAuth.className = 'badge-mode locked';
      lockIcon.textContent = '🔒';
      lockText.textContent = 'Consulta';
    }
  }

  function requireCoachAuth(actionCallback) {
    if (window.storageEngine.isUnlocked()) {
      actionCallback();
    } else {
      pendingAuthAction = actionCallback;
      openPinModal();
    }
  }

  function openPinModal() {
    pinBuffer = '';
    updatePinDots();
    modalPin.classList.add('active');
  }

  function closePinModal() {
    modalPin.classList.remove('active');
    pinBuffer = '';
    pendingAuthAction = null;
  }

  function updatePinDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`pindot-${i}`);
      if (dot) {
        dot.classList.toggle('filled', i < pinBuffer.length);
      }
    }
  }

  function handlePinInput(digit) {
    if (pinBuffer.length < 4) {
      pinBuffer += digit;
      updatePinDots();

      if (pinBuffer.length === 4) {
        setTimeout(() => {
          const success = window.storageEngine.unlock(pinBuffer);
          if (success) {
            updateAuthUI();
            showToast('✅ Modo Entrenador activado');
            modalPin.classList.remove('active');
            if (pendingAuthAction) {
              pendingAuthAction();
              pendingAuthAction = null;
            }
          } else {
            showToast('❌ PIN incorrecto');
            if (navigator.vibrate) navigator.vibrate(200);
            pinBuffer = '';
            updatePinDots();
          }
        }, 120);
      }
    }
  }

  document.querySelectorAll('.pin-key[data-pin]').forEach(btn => {
    btn.addEventListener('click', () => {
      handlePinInput(btn.getAttribute('data-pin'));
    });
  });

  const btnPinClear = document.getElementById('btn-pin-clear');
  if (btnPinClear) {
    btnPinClear.addEventListener('click', () => {
      pinBuffer = '';
      updatePinDots();
    });
  }

  const btnPinBackspace = document.getElementById('btn-pin-backspace');
  if (btnPinBackspace) {
    btnPinBackspace.addEventListener('click', () => {
      if (pinBuffer.length > 0) {
        pinBuffer = pinBuffer.slice(0, -1);
        updatePinDots();
      }
    });
  }

  btnToggleAuth.addEventListener('click', () => {
    if (window.storageEngine.isUnlocked()) {
      window.storageEngine.lock();
      updateAuthUI();
      showToast('🔒 Modo Consulta activado');
      if (currentActiveView === 'view-day') {
        renderDayView(window.calendarEngine.selectedDate);
      }
    } else {
      openPinModal();
    }
  });

  // Modal generic close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const overlay = e.target.closest('.modal-overlay');
      if (overlay) overlay.classList.remove('active');
    });
  });

  // Close modals clicking outside sheet
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // ==========================================================================
  // VIEW 1: CALENDAR IMPLEMENTATION
  // ==========================================================================
  const calMonthLabel = document.getElementById('calendar-month-label');
  const calGrid = document.getElementById('calendar-grid');
  const seasonQuickJump = document.getElementById('season-quick-jump');
  const btnCalPrev = document.getElementById('btn-cal-prev');
  const btnCalNext = document.getElementById('btn-cal-next');

  // Preview elements
  const previewTypePill = document.getElementById('preview-type-pill');
  const previewDateLabel = document.getElementById('preview-date-label');
  const previewRateBadge = document.getElementById('preview-rate-badge');
  const previewNotes = document.getElementById('preview-notes');
  const btnOpenSelectedDay = document.getElementById('btn-open-selected-day');

  function initSeasonQuickJump() {
    if (!seasonQuickJump) return;
    seasonQuickJump.innerHTML = '';

    // Season 2026-10 to 2027-07
    const months = [
      { year: 2026, month: 9, label: 'Oct 26' },
      { year: 2026, month: 10, label: 'Nov 26' },
      { year: 2026, month: 11, label: 'Dic 26' },
      { year: 2027, month: 0, label: 'Ene 27' },
      { year: 2027, month: 1, label: 'Feb 27' },
      { year: 2027, month: 2, label: 'Mar 27' },
      { year: 2027, month: 3, label: 'Abr 27' },
      { year: 2027, month: 4, label: 'May 27' },
      { year: 2027, month: 5, label: 'Jun 27' },
      { year: 2027, month: 6, label: 'Jul 27' }
    ];

    months.forEach(m => {
      const pill = document.createElement('button');
      pill.className = 'jump-pill';
      pill.textContent = m.label;
      if (m.year === window.calendarEngine.currentYear && m.month === window.calendarEngine.currentMonth) {
        pill.classList.add('active');
      }
      pill.addEventListener('click', () => {
        window.calendarEngine.goToMonth(m.year, m.month);
        renderCalendar();
      });
      seasonQuickJump.appendChild(pill);
    });
  }

  function renderCalendar() {
    const ce = window.calendarEngine;
    const se = window.storageEngine;
    const activePlayersCount = se.getPlayers(false).length;
    const todayStr = ce.formatDate(new Date());

    // Update Header Label
    calMonthLabel.textContent = `${ce.monthNames[ce.currentMonth]} ${ce.currentYear}`;
    initSeasonQuickJump();

    calGrid.innerHTML = '';
    const matrix = ce.getMonthMatrix();

    matrix.forEach(week => {
      week.forEach(cell => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';

        if (!cell.isCurrentMonth) {
          dayDiv.classList.add('other-month');
        }

        if (cell.dateStr === todayStr) {
          dayDiv.classList.add('today');
        }

        if (cell.dateStr === ce.selectedDate) {
          dayDiv.classList.add('selected');
        }

        const session = se.getSession(cell.dateStr);
        const sessionType = (session && session.type) ? session.type : cell.scheduledType;

        if (sessionType === 'training') {
          dayDiv.classList.add('type-training');
        } else if (sessionType === 'match') {
          dayDiv.classList.add('type-match');
        }

        // Top: day number
        const numSpan = document.createElement('span');
        numSpan.className = 'cal-day-number';
        numSpan.textContent = cell.dayNumber;
        dayDiv.appendChild(numSpan);

        // Session badge
        if (sessionType) {
          const badge = document.createElement('span');
          badge.className = 'cal-session-badge';
          badge.textContent = sessionType === 'match' ? '⚽ PART' : '🏃 ENT';
          dayDiv.appendChild(badge);
        }

        // Attendance status dot
        const attendanceInfo = ce.getDateAttendanceStatus(cell.dateStr, session, activePlayersCount);
        const dot = document.createElement('div');
        dot.className = `cal-attendance-indicator status-${attendanceInfo.status}`;
        dayDiv.appendChild(dot);

        // Click handler to select date
        dayDiv.addEventListener('click', () => {
          ce.selectedDate = cell.dateStr;
          updateSelectedDayPreview();
          document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
          dayDiv.classList.add('selected');
        });

        // Double click or direct tap opens session if already selected
        dayDiv.addEventListener('dblclick', () => {
          ce.selectedDate = cell.dateStr;
          switchView('view-day');
        });

        calGrid.appendChild(dayDiv);
      });
    });

    updateSelectedDayPreview();
  }

  function updateSelectedDayPreview() {
    const ce = window.calendarEngine;
    const se = window.storageEngine;
    const dateStr = ce.selectedDate;
    const session = se.getSession(dateStr);
    const scheduledType = ce.getScheduledType(dateStr);
    const activeCount = se.getPlayers(false).length;

    previewDateLabel.textContent = ce.formatDateSpanishLong(dateStr);

    const type = (session && session.type) ? session.type : (scheduledType || 'other');
    if (type === 'match') {
      previewTypePill.className = 'session-type-pill match';
      previewTypePill.textContent = '⚽ Partido Oficial';
    } else if (type === 'training') {
      previewTypePill.className = 'session-type-pill training';
      previewTypePill.textContent = '🏃 Entrenamiento';
    } else {
      previewTypePill.className = 'session-type-pill';
      previewTypePill.textContent = '⭐ Sesión Extra';
    }

    const stat = ce.getDateAttendanceStatus(dateStr, session, activeCount);
    if (stat.status === 'unrecorded') {
      previewRateBadge.textContent = 'Pendiente';
      previewRateBadge.style.color = 'var(--text-muted)';
      previewNotes.textContent = 'Sin registrar todavía.';
    } else {
      previewRateBadge.textContent = `${stat.rate}% (${stat.count}/${stat.total})`;
      previewRateBadge.style.color = stat.status === 'high' ? 'var(--accent-training)' : (stat.status === 'medium' ? '#FACC15' : 'var(--accent-danger)');

      let notesText = '';
      if (session.opponent) notesText += `🆚 Rival: ${session.opponent}. `;
      if (session.result) notesText += `🏆 ${session.result}. `;
      if (session.notes) notesText += `📝 ${session.notes}`;
      previewNotes.textContent = notesText || 'Asistencia registrada.';
    }
  }

  btnCalPrev.addEventListener('click', () => {
    window.calendarEngine.prevMonth();
    renderCalendar();
  });

  btnCalNext.addEventListener('click', () => {
    window.calendarEngine.nextMonth();
    renderCalendar();
  });

  btnOpenSelectedDay.addEventListener('click', () => {
    switchView('view-day');
  });

  // ==========================================================================
  // VIEW 2: DAY SESSION ATTENDANCE IMPLEMENTATION
  // ==========================================================================
  const sessionDateTitle = document.getElementById('session-date-title');
  const sessionTypeBadge = document.getElementById('session-type-badge');
  const sessionCountPresent = document.getElementById('session-count-present');
  const sessionCountAbsent = document.getElementById('session-count-absent');
  const sessionPctDisplay = document.getElementById('session-pct-display');
  const sessionPlayerList = document.getElementById('session-player-list');

  const btnBulkPresent = document.getElementById('btn-bulk-present');
  const btnBulkAbsent = document.getElementById('btn-bulk-absent');
  const btnSessionPrev = document.getElementById('btn-session-prev');
  const btnSessionNext = document.getElementById('btn-session-next');

  const inputSessionType = document.getElementById('input-session-type');
  const inputSessionOpponent = document.getElementById('input-session-opponent');
  const inputSessionResult = document.getElementById('input-session-result');
  const inputSessionNotes = document.getElementById('input-session-notes');
  const btnShareSessionWhatsapp = document.getElementById('btn-share-session-whatsapp');

  function renderDayView(dateStr) {
    const ce = window.calendarEngine;
    const se = window.storageEngine;
    ce.selectedDate = dateStr;

    const scheduledType = ce.getScheduledType(dateStr);
    let session = se.getSession(dateStr);

    if (!session) {
      session = {
        date: dateStr,
        type: scheduledType || 'training',
        records: {},
        playerNotes: {},
        notes: '',
        opponent: '',
        result: ''
      };
    }

    sessionDateTitle.textContent = ce.formatDateSpanishLong(dateStr);

    // Update session type badge
    const isMatch = session.type === 'match';
    sessionTypeBadge.className = isMatch ? 'session-type-pill match' : 'session-type-pill training';
    sessionTypeBadge.textContent = isMatch ? '⚽ Partido' : (session.type === 'training' ? '🏃 Entrenamiento' : '⭐ Extra');

    inputSessionType.value = session.type || 'training';
    inputSessionOpponent.value = session.opponent || '';
    inputSessionResult.value = session.result || '';
    inputSessionNotes.value = session.notes || '';

    // Show/hide opponent and result based on type
    document.getElementById('group-match-opponent').style.display = isMatch ? 'block' : 'none';
    document.getElementById('group-match-result').style.display = isMatch ? 'block' : 'none';

    renderPlayerAttendanceRows(session);
    updateSessionCounters(session);
  }

  function renderPlayerAttendanceRows(session) {
    sessionPlayerList.innerHTML = '';
    const se = window.storageEngine;
    const players = se.getPlayers(false); // Only active players for current attendance

    players.forEach(player => {
      const row = document.createElement('div');
      row.className = 'player-item-row';

      const status = session.records ? session.records[player.id] : undefined;
      const playerNote = session.playerNotes ? session.playerNotes[player.id] : '';

      if (status === true) {
        row.classList.add('is-present');
      } else if (status === false) {
        row.classList.add('is-absent');
      }

      // Left info: dorsal & name
      const leftDiv = document.createElement('div');
      leftDiv.className = 'player-left';

      const dorsal = document.createElement('div');
      dorsal.className = 'player-number-badge';
      dorsal.textContent = player.number || '-';
      leftDiv.appendChild(dorsal);

      const nameBox = document.createElement('div');
      const nameText = document.createElement('div');
      nameText.className = 'player-name-text';
      nameText.textContent = player.name;
      nameBox.appendChild(nameText);

      if (playerNote) {
        const noteLabel = document.createElement('span');
        noteLabel.className = 'player-note-label';
        noteLabel.textContent = `⚠️ ${playerNote}`;
        nameBox.appendChild(noteLabel);
      }
      leftDiv.appendChild(nameBox);
      row.appendChild(leftDiv);

      // Right controls: Toggle button + Note button
      const rightDiv = document.createElement('div');
      rightDiv.className = 'player-right-controls';

      // Note button
      const noteBtn = document.createElement('button');
      noteBtn.className = 'btn-player-note';
      if (playerNote) noteBtn.classList.add('has-note');
      noteBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
      noteBtn.title = 'Añadir o editar motivo/nota';
      noteBtn.addEventListener('click', () => {
        requireCoachAuth(() => {
          openPlayerNoteModal(player.id, player.name, playerNote);
        });
      });
      rightDiv.appendChild(noteBtn);

      // Toggle button
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn-attendance-toggle';

      if (status === true) {
        toggleBtn.classList.add('present');
        toggleBtn.textContent = '✅ ASISTE';
      } else if (status === false) {
        toggleBtn.classList.add('absent');
        toggleBtn.textContent = '❌ NO';
      } else {
        toggleBtn.classList.add('unrecorded');
        toggleBtn.textContent = '¿ASISTE?';
      }

      toggleBtn.addEventListener('click', () => {
        requireCoachAuth(() => {
          // Toggle between true -> false -> true
          const nextStatus = status === true ? false : true;
          se.setAttendanceRecord(session.date, session.type, player.id, nextStatus);
          renderDayView(session.date);
          showToast(`Guardado: ${player.name} -> ${nextStatus ? 'Asiste' : 'No asiste'}`);
        });
      });

      rightDiv.appendChild(toggleBtn);
      row.appendChild(rightDiv);

      sessionPlayerList.appendChild(row);
    });
  }

  function updateSessionCounters(session) {
    const se = window.storageEngine;
    const players = se.getPlayers(false);
    let present = 0;
    let absent = 0;

    players.forEach(p => {
      const record = session.records ? session.records[p.id] : undefined;
      if (record === true) present++;
      else if (record === false) absent++;
    });

    sessionCountPresent.textContent = present;
    sessionCountAbsent.textContent = absent;

    const totalRecorded = present + absent;
    const totalActive = players.length;
    const pct = totalActive > 0 ? Math.round((present / totalActive) * 100) : 0;

    sessionPctDisplay.textContent = `${pct}% Asistencia (${present}/${totalActive})`;
    sessionPctDisplay.style.color = pct >= 80 ? 'var(--accent-training)' : (pct >= 50 ? '#FACC15' : 'var(--accent-danger)');
  }

  // Quick Bulk Buttons
  btnBulkPresent.addEventListener('click', () => {
    requireCoachAuth(() => {
      const ce = window.calendarEngine;
      const se = window.storageEngine;
      const session = se.getSession(ce.selectedDate) || { date: ce.selectedDate, type: ce.getScheduledType(ce.selectedDate) || 'training' };
      se.setBulkAttendance(session.date, session.type, true);
      renderDayView(session.date);
      showToast('✅ Todas marcadas como presentes');
    });
  });

  btnBulkAbsent.addEventListener('click', () => {
    requireCoachAuth(() => {
      const ce = window.calendarEngine;
      const se = window.storageEngine;
      const session = se.getSession(ce.selectedDate) || { date: ce.selectedDate, type: ce.getScheduledType(ce.selectedDate) || 'training' };
      se.setBulkAttendance(session.date, session.type, false);
      renderDayView(session.date);
      showToast('❌ Todas marcadas como ausentes');
    });
  });

  // Previous & Next session navigation
  btnSessionPrev.addEventListener('click', () => {
    const ce = window.calendarEngine;
    const adj = ce.getAdjacentSessions(ce.selectedDate);
    if (adj.prev) {
      renderDayView(adj.prev.dateStr);
    } else {
      // Just subtract 1 day
      const d = ce.parseDate(ce.selectedDate);
      d.setDate(d.getDate() - 1);
      renderDayView(ce.formatDate(d));
    }
  });

  btnSessionNext.addEventListener('click', () => {
    const ce = window.calendarEngine;
    const adj = ce.getAdjacentSessions(ce.selectedDate);
    if (adj.next) {
      renderDayView(adj.next.dateStr);
    } else {
      // Just add 1 day
      const d = ce.parseDate(ce.selectedDate);
      d.setDate(d.getDate() + 1);
      renderDayView(ce.formatDate(d));
    }
  });

  // Auto-save session details inputs
  function autoSaveSessionFields() {
    requireCoachAuth(() => {
      const ce = window.calendarEngine;
      const se = window.storageEngine;
      const dateStr = ce.selectedDate;
      const existing = se.getSession(dateStr) || { date: dateStr, records: {}, playerNotes: {} };

      existing.type = inputSessionType.value;
      existing.opponent = inputSessionOpponent.value.trim();
      existing.result = inputSessionResult.value.trim();
      existing.notes = inputSessionNotes.value.trim();

      se.saveSession(existing);
      showToast('💾 Detalles guardados');

      // Update badge
      const isMatch = existing.type === 'match';
      sessionTypeBadge.className = isMatch ? 'session-type-pill match' : 'session-type-pill training';
      sessionTypeBadge.textContent = isMatch ? '⚽ Partido' : (existing.type === 'training' ? '🏃 Entrenamiento' : '⭐ Extra');
      document.getElementById('group-match-opponent').style.display = isMatch ? 'block' : 'none';
      document.getElementById('group-match-result').style.display = isMatch ? 'block' : 'none';
    });
  }

  inputSessionType.addEventListener('change', autoSaveSessionFields);
  inputSessionOpponent.addEventListener('change', autoSaveSessionFields);
  inputSessionResult.addEventListener('change', autoSaveSessionFields);
  inputSessionNotes.addEventListener('change', autoSaveSessionFields);

  // ==========================================================================
  // PLAYER NOTE MODAL
  // ==========================================================================
  const noteModalTitle = document.getElementById('note-modal-title');
  const inputPlayerNoteText = document.getElementById('input-player-note-text');
  const btnSavePlayerNote = document.getElementById('btn-save-player-note');
  const btnClearPlayerNote = document.getElementById('btn-clear-player-note');

  function openPlayerNoteModal(playerId, playerName, currentNote) {
    activeNotePlayerId = playerId;
    noteModalTitle.textContent = `Motivo / Nota: ${playerName}`;
    inputPlayerNoteText.value = currentNote || '';
    modalPlayerNote.classList.add('active');
  }

  document.querySelectorAll('[data-quick-reason]').forEach(btn => {
    btn.addEventListener('click', () => {
      inputPlayerNoteText.value = btn.getAttribute('data-quick-reason');
    });
  });

  btnSavePlayerNote.addEventListener('click', () => {
    if (!activeNotePlayerId) return;
    const ce = window.calendarEngine;
    const se = window.storageEngine;
    const dateStr = ce.selectedDate;
    const session = se.getSession(dateStr) || { date: dateStr, type: ce.getScheduledType(dateStr) || 'training' };

    const note = inputPlayerNoteText.value.trim();
    if (!session.playerNotes) session.playerNotes = {};
    if (note) {
      session.playerNotes[activeNotePlayerId] = note;
    } else {
      delete session.playerNotes[activeNotePlayerId];
    }

    se.saveSession(session);
    modalPlayerNote.classList.remove('active');
    renderDayView(dateStr);
    showToast('Nota de jugadora guardada');
  });

  btnClearPlayerNote.addEventListener('click', () => {
    if (!activeNotePlayerId) return;
    const ce = window.calendarEngine;
    const se = window.storageEngine;
    const dateStr = ce.selectedDate;
    const session = se.getSession(dateStr);
    if (session && session.playerNotes && session.playerNotes[activeNotePlayerId]) {
      delete session.playerNotes[activeNotePlayerId];
      se.saveSession(session);
    }
    modalPlayerNote.classList.remove('active');
    renderDayView(dateStr);
    showToast('Nota eliminada');
  });

  // ==========================================================================
  // WHATSAPP SHARE MODAL
  // ==========================================================================
  btnShareSessionWhatsapp.addEventListener('click', () => {
    openWhatsappShareModal();
  });

  function openWhatsappShareModal() {
    const ce = window.calendarEngine;
    const se = window.storageEngine;
    const dateStr = ce.selectedDate;
    let session = se.getSession(dateStr);

    if (!session) {
      session = {
        date: dateStr,
        type: ce.getScheduledType(dateStr) || 'training',
        records: {},
        playerNotes: {}
      };
    }

    const players = se.getPlayers(false);

    // Populate WhatsApp Card preview
    document.getElementById('wa-card-type').textContent = session.type === 'match' ? '⚽ CONVOCATORIA DE PARTIDO' : '🏃 ASISTENCIA ENTRENAMIENTO';
    document.getElementById('wa-card-date').textContent = ce.formatDateSpanishLong(dateStr);

    let matchInfo = '';
    if (session.type === 'match' && session.opponent) {
      matchInfo += `🆚 Rival: ${session.opponent} `;
    }
    if (session.result) {
      matchInfo += `🏆 Marcador: ${session.result}`;
    }
    document.getElementById('wa-card-matchinfo').textContent = matchInfo;

    const presentNames = [];
    const absentNames = [];

    players.forEach(p => {
      const st = session.records ? session.records[p.id] : undefined;
      const note = session.playerNotes && session.playerNotes[p.id] ? ` (${session.playerNotes[p.id]})` : '';
      if (st === true) {
        presentNames.push(`${p.name}${p.number ? ` #${p.number}` : ''}`);
      } else if (st === false) {
        absentNames.push(`${p.name}${note}`);
      } else {
        absentNames.push(`${p.name} (Sin confirmar)`);
      }
    });

    document.getElementById('wa-card-present-title').textContent = `✅ ASISTEN (${presentNames.length})`;
    document.getElementById('wa-card-present-list').innerHTML = presentNames.length > 0 ? presentNames.map(n => `<div>• ${n}</div>`).join('') : '<div><em>Ninguna</em></div>';

    document.getElementById('wa-card-absent-title').textContent = `❌ BAJAS (${absentNames.length})`;
    document.getElementById('wa-card-absent-list').innerHTML = absentNames.length > 0 ? absentNames.map(n => `<div>• ${n}</div>`).join('') : '<div><em>Ninguna</em></div>';

    const total = presentNames.length + absentNames.length;
    const pct = total > 0 ? Math.round((presentNames.length / total) * 100) : 0;
    document.getElementById('wa-card-total-stat').textContent = `Asistencia: ${presentNames.length}/${total} (${pct}%)`;

    modalWhatsapp.classList.add('active');
  }

  document.getElementById('btn-wa-send-text').addEventListener('click', () => {
    const ce = window.calendarEngine;
    const se = window.storageEngine;
    const dateStr = ce.selectedDate;
    const session = se.getSession(dateStr) || { date: dateStr, type: ce.getScheduledType(dateStr) || 'training' };
    const text = window.exportEngine.generateWhatsAppText(dateStr, session, se.getPlayers(false));
    window.exportEngine.shareWhatsApp(text);
  });

  document.getElementById('btn-wa-download-image').addEventListener('click', async () => {
    const ce = window.calendarEngine;
    const target = document.getElementById('whatsapp-render-target');
    showToast('Generando imagen de alta resolución...');
    await window.exportEngine.exportDayImage(target, ce.selectedDate);
    showToast('✅ Imagen descargada para compartir');
  });

  document.getElementById('btn-wa-copy-text').addEventListener('click', () => {
    const ce = window.calendarEngine;
    const se = window.storageEngine;
    const dateStr = ce.selectedDate;
    const session = se.getSession(dateStr) || { date: dateStr, type: ce.getScheduledType(dateStr) || 'training' };
    const text = window.exportEngine.generateWhatsAppText(dateStr, session, se.getPlayers(false));
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Texto copiado al portapapeles');
    }).catch(() => {
      showToast('Error al copiar');
    });
  });

  // ==========================================================================
  // VIEW 3: TEAM MATRIX IMPLEMENTATION
  // ==========================================================================
  const selectMatrixMonth = document.getElementById('select-matrix-month');
  const selectMatrixType = document.getElementById('select-matrix-type');
  const matrixWrapper = document.getElementById('matrix-wrapper');

  function initMatrixMonthFilter() {
    selectMatrixMonth.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'Toda la temporada';
    selectMatrixMonth.appendChild(allOpt);

    const months = [
      { val: '2026-10', label: 'Octubre 2026' },
      { val: '2026-11', label: 'Noviembre 2026' },
      { val: '2026-12', label: 'Diciembre 2026' },
      { val: '2027-01', label: 'Enero 2027' },
      { val: '2027-02', label: 'Febrero 2027' },
      { val: '2027-03', label: 'Marzo 2027' },
      { val: '2027-04', label: 'Abril 2027' },
      { val: '2027-05', label: 'Mayo 2027' },
      { val: '2027-06', label: 'Junio 2027' },
      { val: '2027-07', label: 'Julio 2027' }
    ];

    months.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.val;
      opt.textContent = m.label;
      selectMatrixMonth.appendChild(opt);
    });
  }

  function renderMatrix() {
    initMatrixMonthFilter();
    updateMatrixTable();
  }

  function updateMatrixTable() {
    const se = window.storageEngine;
    const ce = window.calendarEngine;
    const players = se.getPlayers(true); // show all including deactivated with history
    const allSessions = se.getAllSessions();

    const selectedMonth = selectMatrixMonth.value;
    const selectedType = selectMatrixType.value;

    // Filter dates
    let dates = Object.keys(allSessions).sort();

    if (selectedMonth !== 'all') {
      dates = dates.filter(d => d.startsWith(selectedMonth));
    }

    if (selectedType !== 'all') {
      dates = dates.filter(d => allSessions[d] && allSessions[d].type === selectedType);
    }

    if (dates.length === 0) {
      matrixWrapper.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No hay sesiones registradas con los filtros seleccionados.<br>
          <button class="jump-pill" style="margin-top: 10px;" id="btn-matrix-go-today">Ir al Calendario</button>
        </div>
      `;
      const goBtn = document.getElementById('btn-matrix-go-today');
      if (goBtn) goBtn.addEventListener('click', () => switchView('view-calendar'));
      return;
    }

    let html = '<table class="matrix-table">';
    html += '<thead><tr>';
    html += '<th>Jugadora</th>';

    dates.forEach(d => {
      const s = allSessions[d];
      const icon = s.type === 'match' ? '⚽' : '🏃';
      const shortDate = ce.formatDateShort(d).slice(0, 5); // dd/mm
      html += `<th title="${d} (${s.type})">${icon}<br>${shortDate}</th>`;
    });
    html += '</tr></thead>';

    html += '<tbody>';
    players.forEach(p => {
      html += '<tr>';
      html += `<td>${p.name}${p.number ? ` <span style="color:var(--text-muted)">#${p.number}</span>` : ''}</td>`;

      dates.forEach(d => {
        const s = allSessions[d];
        const status = s.records ? s.records[p.id] : undefined;
        if (status === true) {
          html += '<td class="matrix-cell-yes" title="Presente">✔</td>';
        } else if (status === false) {
          const note = s.playerNotes && s.playerNotes[p.id] ? s.playerNotes[p.id] : 'Ausente';
          html += `<td class="matrix-cell-no" title="${note}">✖</td>`;
        } else {
          html += '<td class="matrix-cell-pending">-</td>';
        }
      });

      html += '</tr>';
    });
    html += '</tbody></table>';

    matrixWrapper.innerHTML = html;
  }

  selectMatrixMonth.addEventListener('change', updateMatrixTable);
  selectMatrixType.addEventListener('change', updateMatrixTable);

  // ==========================================================================
  // VIEW 4: STATISTICS IMPLEMENTATION
  // ==========================================================================
  const selectStatsScope = document.getElementById('select-stats-scope');
  const statTeamTotal = document.getElementById('stat-team-total');
  const statSessionsCount = document.getElementById('stat-sessions-count');
  const statTeamTrainings = document.getElementById('stat-team-trainings');
  const statTrainingsCount = document.getElementById('stat-trainings-count');
  const statTeamMatches = document.getElementById('stat-team-matches');
  const statMatchesCount = document.getElementById('stat-matches-count');
  const statActivePlayers = document.getElementById('stat-active-players');
  const statsPlayerRankings = document.getElementById('stats-player-rankings');

  function initStatsScopeOptions() {
    selectStatsScope.innerHTML = `
      <option value="all">Toda la temporada</option>
      <option value="2026-10">Octubre 2026</option>
      <option value="2026-11">Noviembre 2026</option>
      <option value="2026-12">Diciembre 2026</option>
      <option value="2027-01">Enero 2027</option>
      <option value="2027-02">Febrero 2027</option>
      <option value="2027-03">Marzo 2027</option>
      <option value="2027-04">Abril 2027</option>
      <option value="2027-05">Mayo 2027</option>
      <option value="2027-06">Junio 2027</option>
      <option value="2027-07">Julio 2027</option>
    `;
  }

  function renderStats() {
    initStatsScopeOptions();
    updateStatsDisplay();
  }

  function updateStatsDisplay() {
    const scope = selectStatsScope.value;
    const stats = window.statsEngine.computeStats(scope, false);
    const ste = window.statsEngine;

    statTeamTotal.textContent = `${stats.teamAvgTotal}%`;
    statSessionsCount.textContent = `${stats.totalSessions} sesiones registradas`;

    statTeamTrainings.textContent = `${stats.teamAvgTraining}%`;
    statTrainingsCount.textContent = `${stats.totalTrainings} entrenamientos`;

    statTeamMatches.textContent = `${stats.teamAvgMatch}%`;
    statMatchesCount.textContent = `${stats.totalMatches} partidos oficiales`;

    statActivePlayers.textContent = stats.playerStats.length;

    // Rankings List
    statsPlayerRankings.innerHTML = '';

    if (stats.playerStats.length === 0 || stats.totalSessions === 0) {
      statsPlayerRankings.innerHTML = `
        <div class="card" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          Aún no hay asistencias registradas en este periodo.
        </div>
      `;
      return;
    }

    stats.playerStats.forEach((ps, idx) => {
      const card = document.createElement('div');
      card.className = 'player-stat-card';

      const colorClass = ste.getRateColorClass(ps.totalRate);
      const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));

      card.innerHTML = `
        <div class="stat-card-header">
          <div class="stat-player-name">
            <span class="stat-badge-rank">${medal}</span>
            <span>${ps.player.name}</span>
            ${ps.player.number ? `<span style="font-size:0.75rem; color:var(--text-muted)">#${ps.player.number}</span>` : ''}
          </div>
          <div class="stat-total-rate ${colorClass}">
            ${ps.totalRate}%
          </div>
        </div>

        <div class="stat-progress-bar-bg">
          <div class="stat-progress-bar-fill ${colorClass}" style="width: ${ps.totalRate}%"></div>
        </div>

        <div class="stat-breakdown-row">
          <div class="stat-breakdown-col">
            🏃 Entrenos: <span>${ps.attendedTrainings}/${ps.scheduledTrainings}</span> (${ps.trainingRate}%)
          </div>
          <div class="stat-breakdown-col">
            ⚽ Partidos: <span>${ps.attendedMatches}/${ps.scheduledMatches}</span> (${ps.matchRate}%)
          </div>
        </div>
      `;

      statsPlayerRankings.appendChild(card);
    });
  }

  selectStatsScope.addEventListener('change', updateStatsDisplay);

  // ==========================================================================
  // VIEW 5: SETTINGS & EXPORT IMPLEMENTATION
  // ==========================================================================
  const rosterManageList = document.getElementById('roster-manage-list');
  const btnAddPlayer = document.getElementById('btn-add-player');
  const btnExportExcel = document.getElementById('btn-export-excel');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportJsonTrigger = document.getElementById('btn-import-json-trigger');
  const inputImportJson = document.getElementById('input-import-json');
  const btnChangePinPrompt = document.getElementById('btn-change-pin-prompt');

  function renderSettings() {
    renderRosterList();
    updateSyncIndicator();
  }

  function renderRosterList() {
    const se = window.storageEngine;
    const players = se.getPlayers(true); // Include inactive
    rosterManageList.innerHTML = '';

    players.forEach(p => {
      const item = document.createElement('div');
      item.className = 'roster-manage-item';
      if (!p.active) item.classList.add('inactive');

      item.innerHTML = `
        <div>
          <strong style="color: ${p.active ? 'var(--text-main)' : 'var(--text-muted)'}; font-size: 0.9rem;">
            ${p.name}
          </strong>
          <span style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 6px;">
            ${p.number ? `#${p.number} &bull; ` : ''}${p.position || 'Jugadora'}
          </span>
          ${!p.active ? '<span style="font-size: 0.65rem; color: var(--accent-danger); margin-left: 4px;">(Baja)</span>' : ''}
        </div>
        <div class="roster-manage-actions">
          <button class="btn-icon-small btn-edit-player" data-player-id="${p.id}" title="Editar jugadora">✏️</button>
          <button class="btn-icon-small btn-toggle-active" data-player-id="${p.id}" title="${p.active ? 'Dar de baja' : 'Activar'}">
            ${p.active ? 'Baja' : 'Activar'}
          </button>
        </div>
      `;

      rosterManageList.appendChild(item);
    });

    // Attach actions
    document.querySelectorAll('.btn-edit-player').forEach(btn => {
      btn.addEventListener('click', () => {
        requireCoachAuth(() => {
          const pId = btn.getAttribute('data-player-id');
          openEditPlayerModal(pId);
        });
      });
    });

    document.querySelectorAll('.btn-toggle-active').forEach(btn => {
      btn.addEventListener('click', () => {
        requireCoachAuth(() => {
          const pId = btn.getAttribute('data-player-id');
          se.togglePlayerActive(pId);
          renderRosterList();
          showToast('Estado de jugadora actualizado');
        });
      });
    });
  }

  // Player Add / Edit Modal
  const playerModalHeading = document.getElementById('player-modal-heading');
  const editPlayerId = document.getElementById('edit-player-id');
  const inputPlayerName = document.getElementById('input-player-name');
  const inputPlayerNumber = document.getElementById('input-player-number');
  const inputPlayerPosition = document.getElementById('input-player-position');
  const btnSavePlayerData = document.getElementById('btn-save-player-data');

  btnAddPlayer.addEventListener('click', () => {
    requireCoachAuth(() => {
      playerModalHeading.textContent = 'Nueva Jugadora';
      editPlayerId.value = '';
      inputPlayerName.value = '';
      inputPlayerNumber.value = '';
      inputPlayerPosition.value = 'Ala';
      modalPlayerEdit.classList.add('active');
    });
  });

  function openEditPlayerModal(playerId) {
    const p = window.storageEngine.getPlayerById(playerId);
    if (!p) return;
    playerModalHeading.textContent = `Editar: ${p.name}`;
    editPlayerId.value = p.id;
    inputPlayerName.value = p.name;
    inputPlayerNumber.value = p.number || '';
    inputPlayerPosition.value = p.position || 'Ala';
    modalPlayerEdit.classList.add('active');
  }

  btnSavePlayerData.addEventListener('click', () => {
    const name = inputPlayerName.value.trim();
    if (!name) {
      alert('Debes indicar el nombre de la jugadora.');
      return;
    }

    const number = inputPlayerNumber.value ? parseInt(inputPlayerNumber.value, 10) : null;
    const position = inputPlayerPosition.value;
    const id = editPlayerId.value;
    const se = window.storageEngine;

    if (id) {
      se.updatePlayer(id, { name, number, position });
      showToast(`Jugadora ${name} actualizada`);
    } else {
      se.addPlayer(name, number, position);
      showToast(`Jugadora ${name} añadida`);
    }

    modalPlayerEdit.classList.remove('active');
    renderRosterList();
  });

  // Export handlers
  btnExportExcel.addEventListener('click', () => {
    const start = document.getElementById('export-date-start').value;
    const end = document.getElementById('export-date-end').value;
    window.exportEngine.exportToExcel(start, end);
  });

  btnExportCsv.addEventListener('click', () => {
    const start = document.getElementById('export-date-start').value;
    const end = document.getElementById('export-date-end').value;
    window.exportEngine.exportToCSV(start, end);
  });

  // Backup JSON
  btnExportJson.addEventListener('click', () => {
    const jsonStr = window.storageEngine.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const filename = `IYANAPP_Backup_Planta14_${new Date().toISOString().slice(0, 10)}.json`;
    window.exportEngine.downloadBlob(blob, filename);
    showToast('Copia de seguridad descargada');
  });

  btnImportJsonTrigger.addEventListener('click', () => {
    requireCoachAuth(() => {
      inputImportJson.click();
    });
  });

  inputImportJson.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = window.storageEngine.importBackup(event.target.result);
      if (result.success) {
        showToast(`✅ Restaurado: ${result.countPlayers} jugadoras, ${result.countSessions} sesiones`);
        renderSettings();
      } else {
        alert('Error al importar archivo: ' + result.error);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // PIN Change Prompt
  btnChangePinPrompt.addEventListener('click', () => {
    requireCoachAuth(() => {
      const newPin = prompt('Introduce el nuevo PIN de 4 dígitos para el Entrenador:');
      if (newPin !== null) {
        if (/^\d{4}$/.test(newPin.trim())) {
          window.storageEngine.changePin(newPin.trim());
          showToast(`✅ Nuevo PIN configurado: ${newPin.trim()}`);
        } else {
          alert('El PIN debe contener exactamente 4 números.');
        }
      }
    });
  });

  function updateSyncIndicator() {
    const se = window.storageEngine;
    if (!syncDot) return;
    if (se.firebaseInitialized && se.settings.syncStatus === 'synced') {
      syncDot.className = 'sync-indicator synced';
      syncDot.title = 'Sincronizado en tiempo real';
    } else if (se.settings.syncStatus === 'error') {
      syncDot.className = 'sync-indicator error';
      syncDot.title = 'Almacenamiento local activo (comprobar reglas Firestore)';
    } else {
      syncDot.className = 'sync-indicator';
      syncDot.title = 'Almacenamiento local';
    }
  }

  // Real-time synchronization event listener from storageEngine
  window.storageEngine.subscribe((eventType, data) => {
    if (eventType === 'firebase_sync' || eventType === 'session') {
      if (currentActiveView === 'view-calendar') renderCalendar();
      else if (currentActiveView === 'view-day') renderDayView(window.calendarEngine.selectedDate);
      else if (currentActiveView === 'view-matrix') renderMatrix();
      else if (currentActiveView === 'view-stats') renderStats();
    }
    updateSyncIndicator();
    updateAuthUI();
  });

  // ==========================================================================
  // APP INITIALIZATION
  // ==========================================================================
  updateAuthUI();
  updateSyncIndicator();
  renderCalendar();

  console.log('IYANAPP Planta14 cargada con éxito.');
})();
