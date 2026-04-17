export function computeWeeklyMonthTicks(dates: string[]): {
  ticks: string[];
  labeled: Set<string>;
} {
  const ticks: string[] = [];
  const labeled = new Set<string>();
  let lastLabeledMonth: number | null = null;
  let lastLabeledYear: number | null = null;

  for (const dateStr of dates) {
    const d = new Date(dateStr + 'T00:00:00');
    if (d.getDay() !== 1) continue;
    ticks.push(dateStr);
    const month = d.getMonth();
    const year = d.getFullYear();
    if (lastLabeledMonth === null || month !== lastLabeledMonth || year !== lastLabeledYear) {
      labeled.add(dateStr);
      lastLabeledMonth = month;
      lastLabeledYear = year;
    }
  }

  return { ticks, labeled };
}

export function computeHourlyTicks(timestamps: string[]): {
  ticks: string[];
  labeled: Set<string>;
} {
  const ticks = [...timestamps];
  const labeled = new Set<string>();
  for (const ts of timestamps) {
    const hour = new Date(ts).getHours();
    if (hour % 4 === 0) labeled.add(ts);
  }
  return { ticks, labeled };
}
