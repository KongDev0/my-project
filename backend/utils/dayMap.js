// utils/dayMap.js
export function normalizeDays(days = []) {
  if (!Array.isArray(days)) return [];

  const map = {
    S: 'Sun',
    M: 'Mon',
    T: 'Tue',
    W: 'Wed',
    Th: 'Thu',
    F: 'Fri',
    Sa: 'Sat',
  };

  return days.map(d => map[d] || d); // ถ้าไม่เจอ map จะคืนค่าดั้งเดิม
}
