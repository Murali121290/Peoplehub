import { KPIItem, KPICategory, KPIResponseItem, RatingLevel } from '../types/evaluation.types';

export const DEFAULT_RATING_SCALE: RatingLevel[] = [
  { grade: 5, name: 'Outstanding', minScore: 91, maxScore: 100, stars: 5, description: 'Far exceeds performance expectations with exceptional deliverable quality.' },
  { grade: 4, name: 'Exceeds Expectations', minScore: 81, maxScore: 90.99, stars: 4, description: 'Consistently delivers above targets and demonstrates strong ownership.' },
  { grade: 3, name: 'Meets Expectations', minScore: 66, maxScore: 80.99, stars: 3, description: 'Fully achieves planned KPI deliverables reliably on schedule.' },
  { grade: 2, name: 'Needs Improvement', minScore: 51, maxScore: 65.99, stars: 2, description: 'Achieves baseline results but requires development and support.' },
  { grade: 1, name: 'Does Not Meet Expectation', minScore: 0, maxScore: 50.99, stars: 1, description: 'Significantly below standard deliverables; action plan required.' }
];

export const getRatingForScore = (score: number): RatingLevel => {
  const clamped = Math.max(0, Math.min(100, score));
  const found = DEFAULT_RATING_SCALE.find(r => clamped >= r.minScore && clamped <= r.maxScore);
  return found || DEFAULT_RATING_SCALE[DEFAULT_RATING_SCALE.length - 1];
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
 * Accurately calculates KPI achievement % and earned score handling operators:
 * - "<2 delays": If actual < 2 (e.g. 0 or 1) -> 100%. If >= 2 -> applies graduated reduction.
 * - "<=2": If actual <= 2 -> 100%. If > 2 -> applies graduated reduction.
 * - "0 misses": If actual is 0 -> 100%. If > 0 -> applies penalty.
 * - "1950": Standard ratio actual / target.
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

  const maxScore = Number(kpi.targetScore) || 0; // e.g. 10 or 3.33
  const parsed = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
  const target = parsed.threshold;
  const isLowerBetter = kpi.scoringDirection === 'lower_is_better' || parsed.isLowerBetter;

  // 1. Strictly Less Than: "< X" (e.g. "<2 delays")
  if (parsed.operator === '<') {
    if (numericActual < target) {
      // 0 or 1 delays strictly satisfies "< 2 delays" -> 100% full score
      return { achievementPercentage: 100, earnedScore: maxScore };
    } else {
      // 2 delays or more missed the "< 2" target -> graduated penalty
      const excess = (numericActual - target) + 1; // e.g. 2 delays -> excess 1
      const penalty = excess * (maxScore * 0.5);
      const earned = Math.max(0, Math.min(maxScore, maxScore - penalty));
      const pct = Math.min(100, (earned / maxScore) * 100);
      return { achievementPercentage: Number(pct.toFixed(2)), earnedScore: Number(earned.toFixed(2)) };
    }
  }

  // 2. Less Than or Equal To: "<= X" (e.g. "<=2 delays" or "0 misses")
  if (parsed.operator === '<=' || isLowerBetter) {
    if (numericActual <= target) {
      return { achievementPercentage: 100, earnedScore: maxScore };
    } else {
      const excess = numericActual - target;
      const penalty = excess * (maxScore * 0.5);
      const earned = Math.max(0, Math.min(maxScore, maxScore - penalty));
      const pct = Math.min(100, (earned / maxScore) * 100);
      return { achievementPercentage: Number(pct.toFixed(2)), earnedScore: Number(earned.toFixed(2)) };
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
