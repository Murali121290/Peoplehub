import { describe, it, expect } from 'vitest';
import { 
  parseTargetExpression, 
  calculateKPIScore, 
  calculateCategoryEarned,
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

    it('should calculate score for range targets (e.g. 12 to 15 projects)', () => {
      const kpi: KPIItem = {
        id: '4',
        name: 'Active Projects',
        targetScore: 30,
        targetFromManager: '12 to 15'
      } as KPIItem;

      // >= 12 (e.g. 12, 14, 15, 18) -> 100% full score
      expect(calculateKPIScore(kpi, 12).achievementPercentage).toBe(100);
      expect(calculateKPIScore(kpi, 12).earnedScore).toBe(30);

      expect(calculateKPIScore(kpi, 15).achievementPercentage).toBe(100);
      expect(calculateKPIScore(kpi, 15).earnedScore).toBe(30);

      expect(calculateKPIScore(kpi, 18).achievementPercentage).toBe(100);
      expect(calculateKPIScore(kpi, 18).earnedScore).toBe(30);

      // < 12 (e.g. 6 -> 50%, 9 -> 75%)
      expect(calculateKPIScore(kpi, 6).achievementPercentage).toBe(50);
      expect(calculateKPIScore(kpi, 6).earnedScore).toBe(15);
    });

    it('should calculate category earned score capped at category weight', () => {
      const kpis: KPIItem[] = [
        { id: '1', name: 'Springer', targetScore: 100, targetFromManager: '120' } as KPIItem,
        { id: '2', name: 'Eleven', targetScore: 100, targetFromManager: '90' } as KPIItem,
        { id: '3', name: 'QA', targetScore: 100, targetFromManager: '250' } as KPIItem,
        { id: '4', name: 'Hours', targetScore: 100, targetFromManager: '8' } as KPIItem,
      ];
      // When sum of deliverable scores is 177.44% (>= 100%), category weight is 25:
      const catEarned177 = calculateCategoryEarned(25, kpis, 177.44);
      expect(catEarned177).toBe(25);

      // When sum is 100%, category score is full 25:
      const catEarnedFull = calculateCategoryEarned(25, kpis, 100);
      expect(catEarnedFull).toBe(25);

      // When sum is 50%, category score is (50 / 100) * 25 = 12.5:
      const catEarnedHalf = calculateCategoryEarned(25, kpis, 50);
      expect(catEarnedHalf).toBe(12.5);

      // When sum is 80%, category score is (80 / 100) * 25 = 20:
      const catEarned80 = calculateCategoryEarned(25, kpis, 80);
      expect(catEarned80).toBe(20);
    });
  });
});

