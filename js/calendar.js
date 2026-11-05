/**
 * Season & Calendar Engine for IYANAPP - Planta14 Futsal
 * Season: 2026-10-01 to 2027-07-31
 * Trainings: Monday, Wednesday, Thursday
 * Matches: Saturday
 * Timezone: Europe/Madrid
 */

class CalendarEngine {
  constructor() {
    this.seasonStart = '2026-10-01';
    this.seasonEnd = '2027-07-31';

    // Current viewed month and year
    // If today is within season, default to today's month, otherwise default to October 2026
    const today = new Date();
    const todayStr = this.formatDate(today);

    if (todayStr >= this.seasonStart && todayStr <= this.seasonEnd) {
      this.currentYear = today.getFullYear();
      this.currentMonth = today.getMonth(); // 0-indexed (9 = Oct)
      this.selectedDate = todayStr;
    } else {
      this.currentYear = 2026;
      this.currentMonth = 9; // October (0-indexed)
      this.selectedDate = '2026-10-01';
    }

    this.monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    this.dayNamesShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  }

  // --- Date Utility Helpers ---
  formatDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0); // Noon to prevent DST timezone issues
  }

  isDateInSeason(dateStr) {
    return dateStr >= this.seasonStart && dateStr <= this.seasonEnd;
  }

  /**
   * Determine scheduled session type based on day of week:
   * Monday (1), Wednesday (3), Thursday (4) => 'training'
   * Saturday (6) => 'match'
   * Others => null (can still be registered as extra session)
   */
  getScheduledType(dateStr) {
    const date = this.parseDate(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 4) {
      return 'training';
    }
    if (dayOfWeek === 6) {
      return 'match';
    }
    return null;
  }

  formatDateSpanishLong(dateStr) {
    const date = this.parseDate(dateStr);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayOfWeek = dayNames[date.getDay()];
    const dayOfMonth = date.getDate();
    const monthName = this.monthNames[date.getMonth()];
    const year = date.getFullYear();

    return `${dayOfWeek}, ${dayOfMonth} de ${monthName} de ${year}`;
  }

  formatDateShort(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  // --- Month Navigation ---
  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
  }

  goToMonth(year, month) {
    this.currentYear = year;
    this.currentMonth = month;
  }

  goToToday() {
    const today = new Date();
    const todayStr = this.formatDate(today);
    if (this.isDateInSeason(todayStr)) {
      this.currentYear = today.getFullYear();
      this.currentMonth = today.getMonth();
      this.selectedDate = todayStr;
    } else {
      this.currentYear = 2026;
      this.currentMonth = 9;
      this.selectedDate = '2026-10-01';
    }
  }

  /**
   * Build calendar matrix for currentYear and currentMonth.
   * Days are organized Monday (index 0) to Sunday (index 6).
   */
  getMonthMatrix() {
    const year = this.currentYear;
    const month = this.currentMonth;

    // First day of month
    const firstDay = new Date(year, month, 1, 12, 0, 0);
    // Day of week: 0=Sun, 1=Mon, ..., 6=Sat
    // Convert to Monday=0, ..., Sunday=6
    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Days in previous month for padding
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const matrix = [];
    let week = [];

    // Previous month padding days
    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, prevDay, 12, 0, 0);
      const dateStr = this.formatDate(prevDate);
      week.push({
        dayNumber: prevDay,
        dateStr,
        isCurrentMonth: false,
        isInSeason: this.isDateInSeason(dateStr),
        scheduledType: this.getScheduledType(dateStr)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const curDate = new Date(year, month, day, 12, 0, 0);
      const dateStr = this.formatDate(curDate);
      week.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isInSeason: this.isDateInSeason(dateStr),
        scheduledType: this.getScheduledType(dateStr)
      });

      if (week.length === 7) {
        matrix.push(week);
        week = [];
      }
    }

    // Next month padding days to complete last week
    if (week.length > 0) {
      let nextDay = 1;
      while (week.length < 7) {
        const nextDate = new Date(year, month + 1, nextDay, 12, 0, 0);
        const dateStr = this.formatDate(nextDate);
        week.push({
          dayNumber: nextDay,
          dateStr,
          isCurrentMonth: false,
          isInSeason: this.isDateInSeason(dateStr),
          scheduledType: this.getScheduledType(dateStr)
        });
        nextDay++;
      }
      matrix.push(week);
    }

    return matrix;
  }

  /**
   * Get attendance status indicator for a specific date:
   * Returns:
   * - 'high': >= 80% (Verde)
   * - 'medium': 50% - 79% (Amarillo)
   * - 'low': < 50% (Rojo)
   * - 'unrecorded': not yet registered (Gris)
   */
  getDateAttendanceStatus(dateStr, sessionData, activePlayersCount) {
    if (sessionData && (sessionData.type === 'none' || sessionData.cancelled === true)) {
      return { status: 'cancelled', rate: 0, count: 0, total: 0 };
    }

    if (!sessionData || !sessionData.records || Object.keys(sessionData.records).length === 0) {
      return { status: 'unrecorded', rate: 0, count: 0, total: activePlayersCount };
    }

    let present = 0;
    const records = sessionData.records;
    for (const pId in records) {
      if (records[pId] === true) {
        present++;
      }
    }

    const total = activePlayersCount > 0 ? activePlayersCount : Object.keys(records).length;
    const rate = total > 0 ? (present / total) * 100 : 0;

    let status = 'low';
    if (rate >= 80) {
      status = 'high';
    } else if (rate >= 50) {
      status = 'medium';
    } else {
      status = 'low';
    }

    return { status, rate: Math.round(rate), count: present, total };
  }

  /**
   * Returns list of all scheduled dates in the entire season
   */
  getAllSeasonScheduledDates() {
    const dates = [];
    const current = this.parseDate(this.seasonStart);
    const end = this.parseDate(this.seasonEnd);

    while (current <= end) {
      const dateStr = this.formatDate(current);
      const scheduledType = this.getScheduledType(dateStr);
      if (scheduledType) {
        dates.push({
          dateStr,
          type: scheduledType
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Find previous and next scheduled session dates from a given date
   */
  getAdjacentSessions(currentDateStr) {
    const allDates = this.getAllSeasonScheduledDates();
    const idx = allDates.findIndex(d => d.dateStr === currentDateStr);

    let prev = null;
    let next = null;

    if (idx > 0) {
      prev = allDates[idx - 1];
    }
    if (idx >= 0 && idx < allDates.length - 1) {
      next = allDates[idx + 1];
    }

    return { prev, next };
  }
}

// Global instance
window.calendarEngine = new CalendarEngine();
