export function numberOrNull(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function money(value, currency = 'USD') {
  const number = numberOrNull(value);
  if (number === null) return '—';
  if (!currency || !/^[A-Z]{3}$/.test(currency)) return number.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return number.toLocaleString('en-US', { style: 'currency', currency, maximumFractionDigits: 2 });
}
export function percent(value) {
  const number = numberOrNull(value);
  return number === null ? '—' : `${number.toFixed(2)}%`;
}

export function curveGeometry(points) {
  const valid = (Array.isArray(points) ? points : []).filter((point) => numberOrNull(point.cumulative_pnl) !== null);
  if (valid.length < 2) return { points: [], path: '', min: 0, max: 0 };
  const values = valid.map((point) => Number(point.cumulative_pnl));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const coordinates = valid.map((point, index) => ({ ...point, x: 16 + index / (valid.length - 1) * 768, y: 206 - (Number(point.cumulative_pnl) - min) / span * 180 }));
  return { points: coordinates, path: coordinates.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' '), min, max };
}
