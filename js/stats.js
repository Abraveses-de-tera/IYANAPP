/**
 * Statistics Engine for IYANAPP - Planta14 Futsal
 * Computes individual & team attendance metrics across trainings, matches, and custom date ranges.
 */

class StatsEngine {
  constructor() {}

  /**
   * Filter sessions according to scope:
   * scope: 'all' (entire season) | 'YYYY-MM' (specific month) | { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
   */
  filterSessions(allSessions, scope = 'all') {
    const filtered = {};

    for (const dateStr in allSessions) {
      const session = allSessions[dateStr];
      if (!session || !session.records || Object.keys(session.records).length === 0) {
        continue; // Only count sessions that have been recorded
      }

      if (scope === 'all') {
        filtered[dateStr] = session;
      } else if (typeof scope === 'string' && scope.length === 7) {
        // 'YYYY-MM'
        if (dateStr.startsWith(scope)) {
          filtered[dateStr] = session;
        }
      } else if (scope && scope.start && scope.end) {
        if (dateStr >= scope.start && dateStr <= scope.end) {
          filtered[dateStr] = session;
        }
      }
    }

    return filtered;
  }

  /**
   * Generate comprehensive attendance stats for all players and team overall.
   */
  computeStats(scope = 'all', includeInactive = false) {
    const storage = window.storageEngine;
    const players = storage.getPlayers(includeInactive);
    const allSessions = storage.getAllSessions();
    const sessions = this.filterSessions(allSessions, scope);

    let totalSessions = 0;
    let totalTrainings = 0;
    let totalMatches = 0;
    let totalOthers = 0;

    // Count session types
    for (const dateStr in sessions) {
      const s = sessions[dateStr];
      totalSessions++;
      if (s.type === 'training') totalTrainings++;
      else if (s.type === 'match') totalMatches++;
      else totalOthers++;
    }

    // Stats per player
    const playerStats = players.map(player => {
      let attendedTrainings = 0;
      let scheduledTrainings = 0;

      let attendedMatches = 0;
      let scheduledMatches = 0;

      let attendedTotal = 0;
      let recordedTotal = 0;

      for (const dateStr in sessions) {
        const s = sessions[dateStr];
        const record = s.records ? s.records[player.id] : undefined;

        // If player has a record in this session
        if (record !== undefined) {
          recordedTotal++;
          if (record === true) {
            attendedTotal++;
          }

          if (s.type === 'training') {
            scheduledTrainings++;
            if (record === true) attendedTrainings++;
          } else if (s.type === 'match') {
            scheduledMatches++;
            if (record === true) attendedMatches++;
          }
        }
      }

      const totalRate = recordedTotal > 0 ? Math.round((attendedTotal / recordedTotal) * 100) : 0;
      const trainingRate = scheduledTrainings > 0 ? Math.round((attendedTrainings / scheduledTrainings) * 100) : 0;
      const matchRate = scheduledMatches > 0 ? Math.round((attendedMatches / scheduledMatches) * 100) : 0;

      return {
        player,
        attendedTrainings,
        scheduledTrainings,
        trainingRate,
        attendedMatches,
        scheduledMatches,
        matchRate,
        attendedTotal,
        recordedTotal,
        totalRate
      };
    });

    // Sort by total attendance rate descending, then attendedTotal
    playerStats.sort((a, b) => {
      if (b.totalRate !== a.totalRate) return b.totalRate - a.totalRate;
      return b.attendedTotal - a.attendedTotal;
    });

    // Compute team overall averages
    let teamTrainingPctSum = 0;
    let teamMatchPctSum = 0;
    let teamTotalPctSum = 0;
    let validCount = 0;

    for (const ps of playerStats) {
      if (ps.recordedTotal > 0) {
        teamTotalPctSum += ps.totalRate;
        teamTrainingPctSum += ps.trainingRate;
        teamMatchPctSum += ps.matchRate;
        validCount++;
      }
    }

    const teamAvgTotal = validCount > 0 ? Math.round(teamTotalPctSum / validCount) : 0;
    const teamAvgTraining = validCount > 0 ? Math.round(teamTrainingPctSum / validCount) : 0;
    const teamAvgMatch = validCount > 0 ? Math.round(teamMatchPctSum / validCount) : 0;

    return {
      scope,
      totalSessions,
      totalTrainings,
      totalMatches,
      totalOthers,
      teamAvgTotal,
      teamAvgTraining,
      teamAvgMatch,
      playerStats
    };
  }

  /**
   * Helper to format rate badge color class
   */
  getRateColorClass(rate) {
    if (rate >= 80) return 'rate-high';
    if (rate >= 50) return 'rate-medium';
    return 'rate-low';
  }
}

// Global instance
window.statsEngine = new StatsEngine();
