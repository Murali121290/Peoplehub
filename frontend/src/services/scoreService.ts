import { KPIItem, KPICategory, KPIResponseItem, RatingLevel } from '../types/evaluation.types';

export const DEFAULT_RATING_SCALE: RatingLevel[] = [
  {
    grade: 'A',
    letterGrade: 'A',
    scoreRangeText: '91 to 100',
    name: 'Outstanding',
    minScore: 91,
    maxScore: 100,
    stars: 5,
    description: 'Outstanding - the highest possible performance rating given to an employee who consistently exceeds expectations on all evaluations.'
  },
  {
    grade: 'B',
    letterGrade: 'B',
    scoreRangeText: '81 to 90',
    name: 'Exceeds Expectations',
    minScore: 81,
    maxScore: 90.99,
    stars: 4,
    description: 'Exceeds Expectation - the performance rating given to employees who exhibit high overall performance, routinely go beyond what is expected in order to substantially surpass all of their key performance expectations/goals and will have met or exceeded expectations on the Competencies.'
  },
  {
    grade: 'C',
    letterGrade: 'C',
    scoreRangeText: '66 to 80',
    name: 'Meets Expectations',
    minScore: 66,
    maxScore: 80.99,
    stars: 3,
    description: 'Meets Expectation - the performance rating given to employees who (1) are fully successful in meeting all of the performance expectations/goals that are important to his or her job and (2) will have demonstrated a satisfactory performance.'
  },
  {
    grade: 'D',
    letterGrade: 'D',
    scoreRangeText: '51 to 65',
    name: 'Needs Improvement',
    minScore: 51,
    maxScore: 65.99,
    stars: 2,
    description: 'Needs Improvement - the performance rating given to employees who sometimes perform at an acceptable level but are not consistent and need improvement to meet expectations.'
  },
  {
    grade: 'E',
    letterGrade: 'E',
    scoreRangeText: 'Below 50',
    name: 'Does Not Meet Expectation',
    minScore: 0,
    maxScore: 50.99,
    stars: 1,
    description: 'Does Not Meet Expectation - the performance rating given to employees who fail to achieve any one or more key performance expectations/goals or cannot demonstrate proficiency in the Competencies needed for the job.'
  }
];

let activeRatingScale: RatingLevel[] = [...DEFAULT_RATING_SCALE];

export const setRatingScale = (scale: RatingLevel[]): void => {
  if (Array.isArray(scale) && scale.length > 0) {
    activeRatingScale = scale.map(item => ({
      ...item,
      letterGrade: item.letterGrade || (typeof item.grade === 'string' ? item.grade : (
        item.grade === 5 ? 'A' :
        item.grade === 4 ? 'B' :
        item.grade === 3 ? 'C' :
        item.grade === 2 ? 'D' : 'E'
      )),
      grade: typeof item.grade === 'string' ? item.grade : (
        item.grade === 5 ? 'A' :
        item.grade === 4 ? 'B' :
        item.grade === 3 ? 'C' :
        item.grade === 2 ? 'D' : (item.letterGrade || 'E')
      )
    }));
  }
};

export const getRatingScale = (): RatingLevel[] => {
  return activeRatingScale && activeRatingScale.length > 0 ? activeRatingScale : DEFAULT_RATING_SCALE;
};

export const getRatingForScore = (score: number): RatingLevel => {
  const currentScale = getRatingScale();
  const clamped = Math.max(0, Math.min(100, score));
  const found = currentScale.find(r => clamped >= r.minScore && clamped <= r.maxScore);
  return found || currentScale[currentScale.length - 1];
};

/**
 * Parses target expressions from manager (e.g. "<2 delays", "<=2", ">5", "0 misses", "1950")
 */
export const parseTargetExpression = (
  targetFromManager: string | number | undefined | null,
  fallbackTargetValue = 1
): {
  operator: '<' | '<=' | '>' | '>=' | 'exact';
  threshold: number;
  isLowerBetter: boolean;
} => {
  if (targetFromManager === undefined || targetFromManager === null || targetFromManager === '') {
    return { operator: 'exact', threshold: fallbackTargetValue, isLowerBetter: false };
  }

  const str = String(targetFromManager).trim();

  // Check for <= or =<
  if (str.startsWith('<=') || str.startsWith('=<')) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return { operator: '<=', threshold: isNaN(num) ? fallbackTargetValue : num, isLowerBetter: true };
  }

  // Check for <
  if (str.startsWith('<')) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return { operator: '<', threshold: isNaN(num) ? fallbackTargetValue : num, isLowerBetter: true };
  }

  // Check for >= or =>
  if (str.startsWith('>=') || str.startsWith('=>')) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return { operator: '>=', threshold: isNaN(num) ? fallbackTargetValue : num, isLowerBetter: false };
  }

  // Check for >
  if (str.startsWith('>')) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return { operator: '>', threshold: isNaN(num) ? fallbackTargetValue : num, isLowerBetter: false };
  }

  // Check for 0 misses / 0 escalations / 0 unplanned absences
  if (/^0\s*(miss|unplanned|delay|escalat|error|issue)/i.test(str) || str === '0') {
    return { operator: '<=', threshold: 0, isLowerBetter: true };
  }

  // Check for standard number extract
  const match = str.match(/([0-9]+(\.[0-9]+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    return { operator: 'exact', threshold: num, isLowerBetter: false };
  }

  return { operator: 'exact', threshold: fallbackTargetValue, isLowerBetter: false };
};

/**
 * Helper to identify negative / reverse KPI items (e.g. lower is better, escalations, delays, misses, compliance errors)
 */
export const isNegativeKpi = (kpi?: Partial<KPIItem> | null): boolean => {
  if (!kpi) return false;
  if (kpi.scoringDirection === 'lower_is_better') return true;

  const name = String(kpi.name || '').toLowerCase();
  const desc = String(kpi.description || '').toLowerCase();
  const target = String(kpi.targetFromManager ?? kpi.targetValue ?? '').toLowerCase();
  const unit = String(kpi.unit || '').toLowerCase();

  // 1. Target expressions starting with < or containing penalty keywords
  if (
    target.startsWith('<') ||
    target.includes('miss') ||
    target.includes('delay') ||
    target.includes('unplanned') ||
    target.includes('escalat') ||
    target.includes('followup') ||
    target.includes('error') ||
    target.includes('defect')
  ) {
    return true;
  }

  // 2. Metric names / descriptions matching negative KPI areas
  const negativeKeywords = [
    'effective communication',
    'mail reply',
    'ontime status',
    'status reporting',
    'escalation',
    'process compliance',
    'supervision',
    'leave/wfh',
    'wfh notification',
    'leave notification',
    'prior notification',
    'defect',
    'error',
    'penalty',
    'delay',
    'miss',
    'unplanned'
  ];

  if (negativeKeywords.some(kw => name.includes(kw) || desc.includes(kw) || unit.includes(kw))) {
    return true;
  }

  return false;
};

/**
 * Accurately calculates KPI achievement % and earned score handling operators:
 * - "<2 delays": If actual is 0 -> 100% (full score). If actual is 1 -> 50% (half score). If actual >= 2 -> 0%.
 * - "0 misses" / "0 escalations": If actual is 0 -> 100% (full score). If actual >= 1 -> 0%.
 * - ">= X" / "> X": Standard threshold check.
 * - Standard numeric target: Higher is better ratio (actual / target * maxScore).
 */
export const calculateKPIScore = (
  kpi: KPIItem,
  actualValue: string | number | undefined | null
): { achievementPercentage: number; earnedScore: number } => {
  if (actualValue === undefined || actualValue === null || actualValue === '') {
    return { achievementPercentage: 0, earnedScore: 0 };
  }

  const numericActual = typeof actualValue === 'string' ? parseFloat(actualValue) : actualValue;
  if (isNaN(numericActual)) {
    return { achievementPercentage: 0, earnedScore: 0 };
  }

  const maxScore = Number(kpi.targetScore) || 0; // e.g. 20 or 10
  const parsed = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
  const target = parsed.threshold;
  const isLowerBetter = kpi.scoringDirection === 'lower_is_better' || parsed.isLowerBetter;

  // 1. Strictly Less Than: "< X" (e.g. "<2 delays")
  if (parsed.operator === '<') {
    if (numericActual <= 0) {
      // 0 delays -> 100% full score
      return { achievementPercentage: 100, earnedScore: maxScore };
    } else if (numericActual < target) {
      // 1 delay out of <2 -> (2 - 1) / 2 = 50% (half of the percentage)
      const ratio = target > 0 ? (target - numericActual) / target : 0;
      const earned = Number((ratio * maxScore).toFixed(2));
      const pct = Number((ratio * 100).toFixed(2));
      return { achievementPercentage: pct, earnedScore: earned };
    } else {
      // 2 or more delays -> 0%
      return { achievementPercentage: 0, earnedScore: 0 };
    }
  }

  // 2. Zero Tolerance or Less Than or Equal To: (e.g. "0 misses", "0 escalations", "<= X")
  if (parsed.operator === '<=' || isLowerBetter) {
    if (target === 0) {
      // 0 misses / 0 escalations: 0 gives 100%, 1 or more gives 0%
      if (numericActual <= 0) {
        return { achievementPercentage: 100, earnedScore: maxScore };
      } else {
        return { achievementPercentage: 0, earnedScore: 0 };
      }
    } else {
      // Threshold > 0
      if (numericActual <= target) {
        return { achievementPercentage: 100, earnedScore: maxScore };
      } else {
        return { achievementPercentage: 0, earnedScore: 0 };
      }
    }
  }

  // 3. Greater Than or Equal To: ">= X" or "> X"
  if (parsed.operator === '>=' || parsed.operator === '>') {
    const minThreshold = parsed.operator === '>' ? target + 0.01 : target;
    if (numericActual >= minThreshold) {
      return { achievementPercentage: 100, earnedScore: maxScore };
    } else {
      const ratio = target > 0 ? numericActual / target : 0;
      const earned = Number((Math.min(maxScore, ratio * maxScore)).toFixed(2));
      return { achievementPercentage: Number((Math.min(100, ratio * 100)).toFixed(2)), earnedScore: earned };
    }
  }

  // 4. Standard Exact Target (higher is better ratio, capped at 100% targetScore)
  const targetNum = target > 0 ? target : 1;
  const ratio = Math.max(0, numericActual / targetNum);
  const achievementPercentage = Number((Math.min(100, ratio * 100)).toFixed(2));
  const earnedScore = Number((Math.min(maxScore, ratio * maxScore)).toFixed(2));

  return {
    achievementPercentage,
    earnedScore
  };
};

export const calculateOverallScore = (
  categories: KPICategory[],
  kpiResponses: Record<string, KPIResponseItem>
): { overallScore: number; categoryScores: { categoryId: string; name: string; weightage: number; earned: number }[] } => {
  let totalScore = 0;
  const categoryScores = categories.map(cat => {
    let catEarned = 0;
    cat.kpis.forEach(kpi => {
      const resp = kpiResponses[kpi.id];
      if (resp) {
        catEarned += resp.earnedScore || 0;
      }
    });
    totalScore += catEarned;
    return {
      categoryId: cat.id,
      name: cat.name,
      weightage: cat.weightage,
      earned: Number(catEarned.toFixed(2))
    };
  });

  return {
    overallScore: Number(totalScore.toFixed(2)),
    categoryScores
  };
};
