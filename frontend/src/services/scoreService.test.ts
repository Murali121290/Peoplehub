import { describe, it, expect } from 'vitest';
import { 
  parseTargetExpression, 
  calculateKPIScore, 
  isNegativeKpi 
} from './scoreService';
import { KPIItem } from '../types/evaluation.types';

describe('scoreService', () => {
  describe('parseTargetExpression', () => {
    it('should parse "<2 delays" correctly', () => {
      const result = parseTargetExpression('<2 delays', 1);
      expect(result).toEqual({ operator: '<', threshold: 2, isLowerBetter: true });
    });

    it('should parse "0 misses" correctly', () => {
      const result = parseTargetExpression('0 misses', 1);
      expect(result).toEqual({ operator: '<=', threshold: 0, isLowerBetter: true });
    });

    it('should parse ">= 5" correctly', () => {
      const result = parseTargetExpression('>= 5', 1);
      expect(result).toEqual({ operator: '>=', threshold: 5, isLowerBetter: false });
    });

    it('should parse basic numbers correctly', () => {
      const result = parseTargetExpression('100', 1);
      expect(result).toEqual({ operator: 'exact', threshold: 100, isLowerBetter: false });
    });
  });

  describe('isNegativeKpi', () => {
    it('should identify negative KPIs based on keywords', () => {
      expect(isNegativeKpi({ name: 'Escalations Avoidance' } as KPIItem)).toBe(true);
      expect(isNegativeKpi({ description: 'Number of delays in delivery' } as KPIItem)).toBe(true);
      expect(isNegativeKpi({ scoringDirection: 'lower_is_better' } as KPIItem)).toBe(true);
    });

    it('should identify positive KPIs correctly', () => {
      expect(isNegativeKpi({ name: 'Number of Active Projects', scoringDirection: 'higher_is_better' } as KPIItem)).toBe(false);
    });
  });

  describe('calculateKPIScore', () => {
    it('should calculate score for strictly less than (<2 delays)', () => {
      const kpi: KPIItem = {
        id: '1',
        name: 'Delays',
        targetScore: 10,
        targetFromManager: '<2 delays',
        scoringDirection: 'lower_is_better'
      } as KPIItem;

      // 0 delays -> full score (100% / 10)
      const res1 = calculateKPIScore(kpi, 0);
      expect(res1.achievementPercentage).toBe(100);
      expect(res1.earnedScore).toBe(10);

      // 1 delay out of <2 -> half score (50% / 5)
      const res2 = calculateKPIScore(kpi, 1);
      expect(res2.achievementPercentage).toBe(50);
      expect(res2.earnedScore).toBe(5);

      // 2 or more delays -> 0 score (0% / 0)
      const res3 = calculateKPIScore(kpi, 2);
      expect(res3.achievementPercentage).toBe(0);
      expect(res3.earnedScore).toBe(0);
    });

    it('should calculate score for 0 misses', () => {
      const kpi: KPIItem = {
        id: '2',
        name: 'Misses',
        targetScore: 5,
        targetFromManager: '0 misses'
      } as KPIItem;

      // 0 misses -> 100%
      expect(calculateKPIScore(kpi, 0).earnedScore).toBe(5);
      
      // 1 or more misses -> 0%
      expect(calculateKPIScore(kpi, 1).earnedScore).toBe(0);
    });

    it('should calculate score for positive targets (e.g. 10 projects)', () => {
      const kpi: KPIItem = {
        id: '3',
        name: 'Projects',
        targetScore: 20,
        targetFromManager: '10'
      } as KPIItem;

      // 10 projects -> 100%
      expect(calculateKPIScore(kpi, 10).achievementPercentage).toBe(100);
      expect(calculateKPIScore(kpi, 10).earnedScore).toBe(20);

      // 5 projects -> 50%
      expect(calculateKPIScore(kpi, 5).achievementPercentage).toBe(50);
      expect(calculateKPIScore(kpi, 5).earnedScore).toBe(10);

      // 15 projects -> capped at 100%
      expect(calculateKPIScore(kpi, 15).achievementPercentage).toBe(100);
      expect(calculateKPIScore(kpi, 15).earnedScore).toBe(20);
    });
  });
});
