/**
 * Export and Sharing Engine for IYANAPP - Planta14 Futsal
 * Handles Excel (.xlsx), CSV, WhatsApp cards (PNG/Text), PDF print, and JSON backup.
 */

class ExportEngine {
  constructor() {}

  /**
   * Helper to trigger file download in browser
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  /**
   * Export attendance data to Excel (.xlsx) using SheetJS
   */
  exportToExcel(startDate, endDate) {
    if (typeof XLSX === 'undefined') {
      alert('La librería SheetJS no está lista todavía. Comprueba tu conexión o inténtalo de nuevo.');
      return false;
    }

    const storage = window.storageEngine;
    const players = storage.getPlayers(true);
    const allSessions = storage.getAllSessions();

    // Filter dates (excluding cancelled / no-training sessions)
    const dates = Object.keys(allSessions)
      .filter(d => (!startDate || d >= startDate) && (!endDate || d <= endDate))
      .filter(d => allSessions[d] && allSessions[d].type !== 'none' && !allSessions[d].cancelled)
      .sort();

    if (dates.length === 0) {
      alert('No hay sesiones registradas en el rango de fechas seleccionado.');
      return false;
    }

    // 1. Sheet: Resumen de Jugadoras
    const summaryData = [
      ['PLANTA 14 FSF - FÚTBOL SALA FEMENINO'],
      ['INFORME DE ASISTENCIA'],
      ['Rango de fechas:', `${startDate || 'Inicio'} hasta ${endDate || 'Fin'}`],
      ['Fecha de generación:', new Date().toLocaleDateString('es-ES')],
      [],
      ['Jugadora', 'Dorsal', 'Posición', 'Estado', 'Entrenos Asistidos', 'Entrenos Totales', '% Entrenos', 'Partidos Asistidos', 'Partidos Totales', '% Partidos', 'Total Asistencias', 'Total Sesiones', '% Global']
    ];

    for (const player of players) {
      let entAsist = 0, entTot = 0;
      let partAsist = 0, partTot = 0;
      let totAsist = 0, totReg = 0;

      for (const d of dates) {
        const s = allSessions[d];
        if (s.records && s.records[player.id] !== undefined) {
          totReg++;
          const asistio = s.records[player.id] === true;
          if (asistio) totAsist++;

          if (s.type === 'training') {
            entTot++;
            if (asistio) entAsist++;
          } else if (s.type === 'match') {
            partTot++;
            if (asistio) partAsist++;
          }
        }
      }

      const pctEnt = entTot > 0 ? Math.round((entAsist / entTot) * 100) + '%' : '0%';
      const pctPart = partTot > 0 ? Math.round((partAsist / partTot) * 100) + '%' : '0%';
      const pctTot = totReg > 0 ? Math.round((totAsist / totReg) * 100) + '%' : '0%';

      summaryData.push([
        player.name,
        player.number || '',
        player.position || '',
        player.active ? 'Activa' : 'Baja/Inactiva',
        entAsist, entTot, pctEnt,
        partAsist, partTot, pctPart,
        totAsist, totReg, pctTot
      ]);
    }

    // 2. Sheet: Matriz Jugadoras x Fechas
    const matrixHeader = ['Jugadora', 'Dorsal'];
    for (const d of dates) {
      const s = allSessions[d];
      const typeLabel = s.type === 'match' ? '⚽ Partido' : '🏃 Entreno';
      matrixHeader.push(`${d} (${typeLabel})`);
    }

    const matrixData = [
      ['PLANTA 14 FSF : MATRIZ DE ASISTENCIA'],
      matrixHeader
    ];

    for (const player of players) {
      const row = [player.name, player.number || ''];
      for (const d of dates) {
        const s = allSessions[d];
        const record = s.records ? s.records[player.id] : undefined;
        if (record === true) {
          row.push('SÍ');
        } else if (record === false) {
          const note = s.playerNotes && s.playerNotes[player.id] ? ` (${s.playerNotes[player.id]})` : '';
          row.push('NO' + note);
        } else {
          row.push('-');
        }
      }
      matrixData.push(row);
    }

    // 3. Sheet: Detalle de Sesiones
    const sessionDetailsData = [
      ['PLANTA 14 FSF - DETALLE DE SESIONES'],
      ['Fecha', 'Tipo', 'Rival / Notas', 'Resultado', 'Presentes', 'Ausentes', '% Asistencia', 'Lista de Ausentes']
    ];

    for (const d of dates) {
      const s = allSessions[d];
      let pres = 0, aus = 0;
      const absentList = [];

      for (const p of players) {
        if (p.active && s.records && s.records[p.id] !== undefined) {
          if (s.records[p.id] === true) {
            pres++;
          } else {
            aus++;
            const note = s.playerNotes && s.playerNotes[p.id] ? ` (${s.playerNotes[p.id]})` : '';
            absentList.push(p.name + note);
          }
        }
      }

      const total = pres + aus;
      const pct = total > 0 ? Math.round((pres / total) * 100) + '%' : '0%';

      sessionDetailsData.push([
        d,
        s.type === 'match' ? 'Partido' : 'Entrenamiento',
        s.opponent || s.notes || '',
        s.result || '',
        pres,
        aus,
        pct,
        absentList.join(', ')
      ]);
    }

    // Build workbook
    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
    const wsDetails = XLSX.utils.aoa_to_sheet(sessionDetailsData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriz Asistencia');
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Sesiones');

    const filename = `Planta14_Asistencia_${startDate || 'Temporada'}_al_${endDate || 'Fin'}.xlsx`;
    XLSX.writeFile(wb, filename);
    return true;
  }

  /**
   * Export attendance data to CSV
   */
  exportToCSV(startDate, endDate) {
    const storage = window.storageEngine;
    const players = storage.getPlayers(true);
    const allSessions = storage.getAllSessions();

    const dates = Object.keys(allSessions)
      .filter(d => (!startDate || d >= startDate) && (!endDate || d <= endDate))
      .filter(d => allSessions[d] && allSessions[d].type !== 'none' && !allSessions[d].cancelled)
      .sort();

    if (dates.length === 0) {
      alert('No hay sesiones registradas en el rango de fechas seleccionado.');
      return false;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Spanish characters
    csvContent += 'Jugadora;Dorsal;Posicion;Estado;Entrenos_Asistidos;Entrenos_Totales;%_Entrenos;Partidos_Asistidos;Partidos_Totales;%_Partidos;Total_Asistencias;Total_Sesiones;%_Global\r\n';

    for (const player of players) {
      let entAsist = 0, entTot = 0;
      let partAsist = 0, partTot = 0;
      let totAsist = 0, totReg = 0;

      for (const d of dates) {
        const s = allSessions[d];
        if (s.records && s.records[player.id] !== undefined) {
          totReg++;
          const asistio = s.records[player.id] === true;
          if (asistio) totAsist++;

          if (s.type === 'training') {
            entTot++;
            if (asistio) entAsist++;
          } else if (s.type === 'match') {
            partTot++;
            if (asistio) partAsist++;
          }
        }
      }

      const pctEnt = entTot > 0 ? Math.round((entAsist / entTot) * 100) : 0;
      const pctPart = partTot > 0 ? Math.round((partAsist / partTot) * 100) : 0;
      const pctTot = totReg > 0 ? Math.round((totAsist / totReg) * 100) : 0;

      csvContent += `"${player.name}";"${player.number || ''}";"${player.position || ''}";"${player.active ? 'Activa' : 'Baja'}";${entAsist};${entTot};"${pctEnt}%";${partAsist};${partTot};"${pctPart}%";${totAsist};${totReg};"${pctTot}%"\r\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `Planta14_Asistencia_${startDate || 'Temporada'}_${endDate || 'Fin'}.csv`;
    this.downloadBlob(blob, filename);
    return true;
  }

  /**
   * Export Day Card as high-res PNG image for WhatsApp
   */
  async exportDayImage(cardElement, dateStr) {
    if (typeof html2canvas === 'undefined') {
      alert('La librería para captura de imagen está cargándose.');
      return false;
    }

    try {
      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#0A0D14',
        scale: 2, // High resolution for crisp mobile display
        logging: false,
        useCORS: true
      });

      canvas.toBlob((blob) => {
        if (blob) {
          this.downloadBlob(blob, `Planta14_Asistencia_${dateStr}.png`);
        }
      }, 'image/png');

      return true;
    } catch (err) {
      console.error('Error generating day image:', err);
      alert('Error al generar la imagen: ' + err.message);
      return false;
    }
  }

  /**
   * Generate formatted WhatsApp text message for instant copy or share
   */
  generateWhatsAppText(dateStr, session, players) {
    const isCancelled = session && (session.type === 'none' || session.cancelled === true);
    const dateFormatted = window.calendarEngine.formatDateSpanishLong(dateStr);

    if (isCancelled) {
      let text = `📢 *PLANTA 14 FÚTBOL SALA FEMENINO*\n`;
      text += `📅 *${dateFormatted}*\n\n`;
      text += `🚫 *ENTRENAMIENTO CANCELADO / DÍA LIBRE*\n`;
      if (session.notes) {
        text += `📝 *Motivo:* ${session.notes}\n\n`;
      } else {
        text += `_Hoy no se realiza sesión de entrenamiento._\n\n`;
      }
      text += `_Generado con PLANTA 14 FSF_`;
      return text;
    }

    const isMatch = session.type === 'match';
    const typeTitle = isMatch ? '⚽ CONVOCATORIA Y ASISTENCIA PARTIDO' : '🏃‍♀️ ASISTENCIA ENTRENAMIENTO';

    let text = `*PLANTA 14 FÚTBOL SALA FEMENINO*\n`;
    text += `${typeTitle}\n`;
    text += `📅 *${dateFormatted}*\n`;

    if (isMatch && session.opponent) {
      text += `🆚 *Rival:* ${session.opponent}\n`;
    }
    if (session.result) {
      text += `🏆 *Resultado:* ${session.result}\n`;
    }
    if (session.notes) {
      text += `📝 *Notas:* ${session.notes}\n`;
    }

    text += `\n`;

    const presentList = [];
    const absentList = [];

    for (const p of players) {
      if (!p.active) continue;
      const status = session.records ? session.records[p.id] : undefined;
      const note = session.playerNotes && session.playerNotes[p.id] ? ` _(${session.playerNotes[p.id]})_` : '';

      if (status === true) {
        presentList.push(`✅ ${p.name}${p.number ? ` (#${p.number})` : ''}`);
      } else if (status === false) {
        absentList.push(`❌ ${p.name}${note}`);
      } else {
        absentList.push(`⏳ ${p.name} (Sin confirmar)`);
      }
    }

    const totalActive = presentList.length + absentList.length;
    const pct = totalActive > 0 ? Math.round((presentList.length / totalActive) * 100) : 0;

    text += `*ASISTEN (${presentList.length}):*\n`;
    if (presentList.length > 0) {
      text += presentList.join('\n') + '\n\n';
    } else {
      text += `_Ninguna registrada_\n\n`;
    }

    if (absentList.length > 0) {
      text += `*BAJAS / NO ASISTEN (${absentList.length}):*\n`;
      text += absentList.join('\n') + '\n\n';
    }

    text += `📊 *Asistencia:* ${presentList.length}/${totalActive} (${pct}%)\n`;
    text += `_Generado con PLANTA 14 FSF_`;

    return text;
  }

  /**
   * Share via WhatsApp or Web Share API
   */
  shareWhatsApp(text) {
    const encoded = encodeURI(text);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;

    if (navigator.share) {
      navigator.share({
        title: 'PLANTA 14 FSF',
        text: text
      }).catch(() => {
        window.open(waUrl, '_blank');
      });
    } else {
      window.open(waUrl, '_blank');
    }
  }
}

// Global instance
window.exportEngine = new ExportEngine();
