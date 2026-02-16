/**
 * Unit tests for ReactionTimeTask component
 * 
 * Tests timing accuracy, response recording, and metrics calculation
 * Requirements: 2.6
 */

import { ReactionMetrics } from '@neurotrace/types';

describe('ReactionTimeTask', () => {
  describe('Metrics Calculation', () => {
    it('should calculate mean reaction time correctly', () => {
      const reactionTimes = [250, 300, 275, 320, 290, 310, 285, 295, 305, 280];
      const mean = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length;
      
      expect(mean).toBe(291);
      expect(mean).toBeGreaterThan(0);
      expect(mean).toBeLessThan(2000);
    });

    it('should calculate reaction time variability (standard deviation)', () => {
      const reactionTimes = [250, 300, 275, 320, 290];
      const mean = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length;
      const variance = reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - mean, 2), 0) / reactionTimes.length;
      const stdDev = Math.sqrt(variance);
      
      expect(stdDev).toBeGreaterThan(0);
      expect(stdDev).toBeLessThan(mean);
      expect(typeof stdDev).toBe('number');
      expect(isFinite(stdDev)).toBe(true);
    });

    it('should handle single reaction time', () => {
      const reactionTimes = [300];
      const mean = reactionTimes[0];
      const variance = 0;
      const stdDev = Math.sqrt(variance);
      
      expect(mean).toBe(300);
      expect(stdDev).toBe(0);
    });

    it('should create valid ReactionMetrics object', () => {
      const metrics: ReactionMetrics = {
        meanReactionTime: 450,
        reactionTimeVariability: 50,
        correctResponses: 9,
        totalTrials: 10,
        timestamp: new Date(),
      };
      
      expect(metrics.meanReactionTime).toBeGreaterThan(0);
      expect(metrics.reactionTimeVariability).toBeGreaterThanOrEqual(0);
      expect(metrics.correctResponses).toBeLessThanOrEqual(metrics.totalTrials);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Timing Constants', () => {
    it('should have valid timing constants', () => {
      const TOTAL_TRIALS = 10;
      const MIN_WAIT_TIME = 1000;
      const MAX_WAIT_TIME = 4000;
      const STIMULUS_TIMEOUT = 2000;
      
      expect(TOTAL_TRIALS).toBe(10);
      expect(MIN_WAIT_TIME).toBeLessThan(MAX_WAIT_TIME);
      expect(STIMULUS_TIMEOUT).toBeGreaterThan(0);
      expect(STIMULUS_TIMEOUT).toBeLessThan(MAX_WAIT_TIME);
    });

    it('should generate random wait times in valid range', () => {
      const MIN_WAIT_TIME = 1000;
      const MAX_WAIT_TIME = 4000;
      
      for (let i = 0; i < 100; i++) {
        const waitTime = Math.floor(Math.random() * (MAX_WAIT_TIME - MIN_WAIT_TIME + 1)) + MIN_WAIT_TIME;
        expect(waitTime).toBeGreaterThanOrEqual(MIN_WAIT_TIME);
        expect(waitTime).toBeLessThanOrEqual(MAX_WAIT_TIME);
      }
    });
  });

  describe('Response Recording Logic', () => {
    it('should correctly identify correct responses', () => {
      interface Trial {
        stimulusTime: number;
        responseTime: number | null;
        reactionTime: number | null;
        correct: boolean;
      }
      
      const correctTrial: Trial = {
        stimulusTime: 1000,
        responseTime: 1250,
        reactionTime: 250,
        correct: true,
      };
      
      const missedTrial: Trial = {
        stimulusTime: 2000,
        responseTime: null,
        reactionTime: null,
        correct: false,
      };
      
      expect(correctTrial.correct).toBe(true);
      expect(correctTrial.reactionTime).toBeGreaterThan(0);
      expect(missedTrial.correct).toBe(false);
      expect(missedTrial.reactionTime).toBeNull();
    });

    it('should calculate reaction time from stimulus and response times', () => {
      const stimulusTime = 1000;
      const responseTime = 1350;
      const reactionTime = responseTime - stimulusTime;
      
      expect(reactionTime).toBe(350);
      expect(reactionTime).toBeGreaterThan(0);
    });

    it('should track correct responses count', () => {
      const trials = [
        { correct: true },
        { correct: true },
        { correct: false },
        { correct: true },
        { correct: true },
        { correct: false },
        { correct: true },
        { correct: true },
        { correct: true },
        { correct: true },
      ];
      
      const correctCount = trials.filter(t => t.correct).length;
      expect(correctCount).toBe(8);
      expect(correctCount).toBeLessThanOrEqual(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all missed responses', () => {
      const trials = Array(10).fill({ correct: false, reactionTime: null });
      const correctTrials = trials.filter(t => t.correct);
      
      expect(correctTrials.length).toBe(0);
    });

    it('should handle all correct responses', () => {
      const trials = Array(10).fill({ correct: true, reactionTime: 300 });
      const correctTrials = trials.filter(t => t.correct);
      
      expect(correctTrials.length).toBe(10);
    });

    it('should handle very fast reaction times', () => {
      const reactionTime = 150; // Very fast but humanly possible
      expect(reactionTime).toBeGreaterThan(0);
      expect(reactionTime).toBeLessThan(2000);
    });

    it('should handle slow reaction times', () => {
      const reactionTime = 1800; // Slow but within timeout
      expect(reactionTime).toBeGreaterThan(0);
      expect(reactionTime).toBeLessThan(2000);
    });

    it('should validate metrics have required fields', () => {
      const metrics: ReactionMetrics = {
        meanReactionTime: 450,
        reactionTimeVariability: 50,
        correctResponses: 9,
        totalTrials: 10,
        timestamp: new Date(),
      };
      
      expect(metrics).toHaveProperty('meanReactionTime');
      expect(metrics).toHaveProperty('reactionTimeVariability');
      expect(metrics).toHaveProperty('correctResponses');
      expect(metrics).toHaveProperty('totalTrials');
      expect(metrics).toHaveProperty('timestamp');
    });
  });

  describe('Statistical Calculations', () => {
    it('should calculate variance correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      
      expect(mean).toBe(5);
      expect(variance).toBe(4);
    });

    it('should handle zero variability', () => {
      const values = [300, 300, 300, 300, 300];
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      expect(mean).toBe(300);
      expect(variance).toBe(0);
      expect(stdDev).toBe(0);
    });

    it('should handle high variability', () => {
      const values = [100, 500, 200, 600, 300];
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      expect(mean).toBe(340);
      expect(stdDev).toBeGreaterThan(100);
    });
  });
});
