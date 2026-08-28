const nonNegativeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

export const summarizeTrackedSessionConversions = (rows = []) => {
  const summary = rows.reduce((total, row) => ({
    trackedSessions: total.trackedSessions + nonNegativeNumber(row.sessions),
    convertedSessions: total.convertedSessions + nonNegativeNumber(row.converted_sessions),
  }), { trackedSessions: 0, convertedSessions: 0 });

  return {
    ...summary,
    convertedSessions: Math.min(summary.convertedSessions, summary.trackedSessions),
  };
};

export const trackedSessionConversionRate = (convertedSessions, trackedSessions) => {
  const sessions = nonNegativeNumber(trackedSessions);
  if (!sessions) return '0.0';
  const conversions = Math.min(nonNegativeNumber(convertedSessions), sessions);
  return ((conversions / sessions) * 100).toFixed(1);
};
