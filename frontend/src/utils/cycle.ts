export interface Cycle {
  label: string;
  start: Date;
  end: Date;
  value: string;
}

export interface FinancialYear {
  label: string;
  value: string;
  startYear: number;
}

export const getCycleBounds = (refDate: Date) => {
  let startYear = refDate.getFullYear();
  let startMonth = refDate.getMonth() - 1;
  let endYear = refDate.getFullYear();
  let endMonth = refDate.getMonth();

  if (refDate.getDate() >= 25) {
    startMonth = refDate.getMonth();
    endMonth = refDate.getMonth() + 1;
  }
  
  return {
    cycleStart: new Date(startYear, startMonth, 25),
    cycleEnd: new Date(endYear, endMonth, 24, 23, 59, 59),
  };
};

export const getCurrentFinancialYear = (): number => {
  const today = new Date();
  if (today.getMonth() < 3) {
    return today.getFullYear() - 1;
  }
  return today.getFullYear();
};

export const getCurrentCycleValue = (): string => {
  const { cycleEnd } = getCycleBounds(new Date());
  return `${cycleEnd.getFullYear()}-${String(cycleEnd.getMonth() + 1).padStart(2, "0")}`;
};

export const generateFinancialYears = (count: number = 5): FinancialYear[] => {
  const currentYear = getCurrentFinancialYear();
  const years: FinancialYear[] = [];
  for (let i = 0; i < count; i++) {
    const startYear = currentYear - i;
    years.push({
      label: `${startYear}-${startYear + 1}`,
      value: `${startYear}-${startYear + 1}`,
      startYear
    });
  }
  return years;
};

export const generateCyclesForYear = (startYear: number): Cycle[] => {
  const cycles: Cycle[] = [];
  
  for (let month = 3; month < 15; month++) {
    const cycleStart = new Date(startYear, month - 1, 25);
    const cycleEnd = new Date(startYear, month, 24, 23, 59, 59);
    
    const monthName = cycleEnd.toLocaleString("en-US", { month: "long" });
    const year = cycleEnd.getFullYear();

    const startStr = cycleStart.toLocaleString("en-US", { month: "short", day: "numeric" });
    const endStr = cycleEnd.toLocaleString("en-US", { month: "short", day: "numeric" });

    const label = `${monthName} ${year} (${startStr} - ${endStr})`;
    const value = `${year}-${String(cycleEnd.getMonth() + 1).padStart(2, "0")}`;

    cycles.push({ label, start: cycleStart, end: cycleEnd, value });
  }
  
  return cycles.reverse();
};

// Deprecated: use generateCyclesForYear instead
export const generateRecentCycles = (count: number = 12): Cycle[] => {
  const cycles: Cycle[] = [];
  const today = new Date();
  let refDate = new Date(today);

  for (let i = 0; i < count; i++) {
    const { cycleStart, cycleEnd } = getCycleBounds(refDate);

    const monthName = cycleEnd.toLocaleString("en-US", { month: "long" });
    const year = cycleEnd.getFullYear();

    const startStr = cycleStart.toLocaleString("en-US", { month: "short", day: "numeric" });
    const endStr = cycleEnd.toLocaleString("en-US", { month: "short", day: "numeric" });

    const label = `${monthName} ${year} (${startStr} - ${endStr})`;
    const value = `${year}-${String(cycleEnd.getMonth() + 1).padStart(2, "0")}`;

    cycles.push({ label, start: cycleStart, end: cycleEnd, value });

    // Move to previous cycle
    refDate = new Date(cycleStart.getTime() - 24 * 60 * 60 * 1000);
  }
  return cycles;
};
