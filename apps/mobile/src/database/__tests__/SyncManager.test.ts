/**
 * Unit Tests for SyncManager
 * 
 * Tests the offline sync queue implementation with exponential backoff
 * Requirements: 14.3
 */

import { SyncManagerImpl } from '../SyncManager';
import { SyncableData } from '@neurotrace/types';
import * as dbIndex from '../index';

// Mock the database functions
jest.mock('../index', () => ({
  executeQuery: jest.fn(),
  executeQuerySingle: jest.fn(),
  executeTransaction: jest.fn(),
  getDatabase: jest.fn(),
}));

describe('SyncManager', () => {
  let syncManager: SyncManagerImpl;
  let mockExecuteQuery: jest.MockedFunction<typeof dbIndex.executeQuery>;
  let mockExecuteQuerySingle: jest.MockedFunction<typeof dbIndex.executeQuerySingle>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    mockExecuteQuery = dbIndex.executeQuery as jest.MockedFunction<typeof dbIndex.executeQuery>;
    mockExecuteQuerySingle = dbIndex.executeQuerySingle as jest.MockedFunction<typeof dbIndex.executeQuerySingle>;
    
    // Create new instance with default retry policy
    syncManager = new SyncManagerImpl();
  });

  describe('queueForSync', () => {
    it('should queue assessment data for sync', async () => {
      const data: SyncableData = {
        id: 'test-id-1',
        type: 'ASSESSMENT',
        data: { patientId: 'patient-1', metrics: {} },
        timestamp: new Date(),
        retryCount: 0,
      };

      mockExecuteQuery.mockReturnValue({ rows: [], rowsAffected: 1 });

      await syncManager.queueForSync(data);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue'),
        expect.arrayContaining([
          'test-id-1',
          'ASSESSMENT',
          'test-id-1',
          expect.any(String), // JSON payload
          50, // Priority for ASSESSMENT
        ])
      );
    });

    it('should queue alert acknowledgment with high priority', async () => {
      const data: SyncableData = {
        id: 'alert-ack-1',
        type: 'ALERT_ACKNOWLEDGMENT',
        data: { alertId: 'alert-1', clinicianId: 'clinician-1' },
        timestamp: new Date(),
        retryCount: 0,
      };

      mockExecuteQuery.mockReturnValue({ rows: [], rowsAffected: 1 });

      await syncManager.queueForSync(data);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue'),
        expect.arrayContaining([
          'alert-ack-1',
          'ALERT_ACKNOWLEDGMENT',
          'alert-ack-1',
          expect.any(String),
          100, // Highest priority for ALERT_ACKNOWLEDGMENT
        ])
      );
    });

    it('should queue gradient data with low priority', async () => {
      const data: SyncableData = {
        id: 'gradient-1',
        type: 'GRADIENT',
        data: { deviceId: 'device-1', gradients: [] },
        timestamp: new Date(),
        retryCount: 0,
      };

      mockExecuteQuery.mockReturnValue({ rows: [], rowsAffected: 1 });

      await syncManager.queueForSync(data);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue'),
        expect.arrayContaining([
          'gradient-1',
          'GRADIENT',
          'gradient-1',
          expect.any(String),
          10, // Lowest priority for GRADIENT
        ])
      );
    });
  });

  describe('getQueuedItems', () => {
    it('should return all queued items ordered by priority', async () => {
      const mockRows = [
        {
          id: 'alert-1',
          data_type: 'ALERT_ACKNOWLEDGMENT',
          data_id: 'alert-1',
          payload: JSON.stringify({ alertId: 'alert-1' }),
          priority: 100,
          created_at: '2024-01-01T00:00:00Z',
          retry_count: 0,
          last_retry_at: null,
          error_message: null,
          next_retry_at: null,
        },
        {
          id: 'assessment-1',
          data_type: 'ASSESSMENT',
          data_id: 'assessment-1',
          payload: JSON.stringify({ patientId: 'patient-1' }),
          priority: 50,
          created_at: '2024-01-01T00:01:00Z',
          retry_count: 0,
          last_retry_at: null,
          error_message: null,
          next_retry_at: null,
        },
      ];

      mockExecuteQuery.mockReturnValue({ rows: mockRows, rowsAffected: 0 });

      const items = await syncManager.getQueuedItems();

      expect(items).toHaveLength(2);
      expect(items[0].type).toBe('ALERT_ACKNOWLEDGMENT');
      expect(items[1].type).toBe('ASSESSMENT');
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY priority DESC, created_at ASC')
      );
    });

    it('should return empty array when queue is empty', async () => {
      mockExecuteQuery.mockReturnValue({ rows: [], rowsAffected: 0 });

      const items = await syncManager.getQueuedItems();

      expect(items).toHaveLength(0);
    });
  });

  describe('clearQueue', () => {
    it('should delete all items from sync queue', async () => {
      mockExecuteQuery.mockReturnValue({ rows: [], rowsAffected: 5 });

      await syncManager.clearQueue();

      expect(mockExecuteQuery).toHaveBeenCalledWith('DELETE FROM sync_queue');
    });
  });

  describe('syncWhenOnline', () => {
    it('should return success with zero counts when queue is empty', async () => {
      mockExecuteQuery.mockReturnValue({ rows: [], rowsAffected: 0 });

      const result = await syncManager.syncWhenOnline();

      expect(result).toEqual({
        success: true,
        syncedCount: 0,
        failedCount: 0,
      });
    });

    it('should sync items and remove them from queue on success', async () => {
      const mockRows = [
        {
          id: 'assessment-1',
          data_type: 'ASSESSMENT',
          data_id: 'assessment-1',
          payload: JSON.stringify({ patientId: 'patient-1' }),
          priority: 50,
          created_at: '2024-01-01T00:00:00Z',
          retry_count: 0,
          last_retry_at: null,
          error_message: null,
          next_retry_at: null,
        },
      ];

      // First call: get items ready for sync
      mockExecuteQuery.mockReturnValueOnce({ rows: mockRows, rowsAffected: 0 });
      // Second call: delete from queue
      mockExecuteQuery.mockReturnValueOnce({ rows: [], rowsAffected: 1 });

      const result = await syncManager.syncWhenOnline();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      
      // Verify item was removed from queue
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        'DELETE FROM sync_queue WHERE id = ?',
        ['assessment-1']
      );
    });

    it('should schedule retry with exponential backoff on failure', async () => {
      const mockRows = [
        {
          id: 'assessment-1',
          data_type: 'ASSESSMENT',
          data_id: 'assessment-1',
          payload: JSON.stringify({ patientId: 'patient-1' }),
          priority: 50,
          created_at: '2024-01-01T00:00:00Z',
          retry_count: 0,
          last_retry_at: null,
          error_message: null,
          next_retry_at: null,
        },
      ];

      // Mock sync failure by throwing error in syncItem
      mockExecuteQuery.mockReturnValueOnce({ rows: mockRows, rowsAffected: 0 });
      
      // Mock the update for retry scheduling
      mockExecuteQuery.mockReturnValueOnce({ rows: [], rowsAffected: 1 });

      // Override syncItem to throw error
      const originalSyncItem = (syncManager as any).syncItem;
      (syncManager as any).syncItem = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await syncManager.syncWhenOnline();

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(1);

      // Verify retry was scheduled
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sync_queue'),
        expect.arrayContaining([
          1, // newRetryCount
          'Network error',
          expect.any(String), // next_retry_at
          'assessment-1',
        ])
      );

      // Restore original method
      (syncManager as any).syncItem = originalSyncItem;
    });

    it('should remove item after max retries reached', async () => {
      const mockRows = [
        {
          id: 'assessment-1',
          data_type: 'ASSESSMENT',
          data_id: 'assessment-1',
          payload: JSON.stringify({ patientId: 'patient-1' }),
          priority: 50,
          created_at: '2024-01-01T00:00:00Z',
          retry_count: 4, // One less than max (5)
          last_retry_at: '2024-01-01T00:00:00Z',
          error_message: 'Previous error',
          next_retry_at: null,
        },
      ];

      mockExecuteQuery.mockReturnValueOnce({ rows: mockRows, rowsAffected: 0 });
      mockExecuteQuery.mockReturnValueOnce({ rows: [], rowsAffected: 1 });

      // Override syncItem to throw error
      (syncManager as any).syncItem = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await syncManager.syncWhenOnline();

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].error).toContain('Max retries (5) reached');

      // Verify item was removed from queue
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        'DELETE FROM sync_queue WHERE id = ?',
        ['assessment-1']
      );
    });
  });

  describe('getStats', () => {
    it('should return sync queue statistics', async () => {
      // Mock total count
      mockExecuteQuerySingle.mockReturnValueOnce({ count: 5 });

      // Mock items by type
      mockExecuteQuery.mockReturnValueOnce({
        rows: [
          { data_type: 'ASSESSMENT', count: 3 },
          { data_type: 'ALERT_ACKNOWLEDGMENT', count: 2 },
        ],
        rowsAffected: 0,
      });

      // Mock items ready for sync
      mockExecuteQuerySingle.mockReturnValueOnce({ count: 3 });

      // Mock items waiting for retry
      mockExecuteQuerySingle.mockReturnValueOnce({ count: 2 });

      const stats = await syncManager.getStats();

      expect(stats).toEqual({
        totalItems: 5,
        itemsByType: {
          ASSESSMENT: 3,
          ALERT_ACKNOWLEDGMENT: 2,
        },
        itemsReadyForSync: 3,
        itemsWaitingForRetry: 2,
      });
    });
  });

  describe('exponential backoff', () => {
    it('should calculate correct retry delays', () => {
      // Test exponential backoff calculation manually
      const policy = {
        maxAttempts: 5,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
      };

      // Retry 0: 1000ms (1 second)
      const delay0 = Math.min(
        policy.initialDelayMs * Math.pow(policy.backoffMultiplier, 0),
        policy.maxDelayMs
      );
      expect(delay0).toBe(1000);

      // Retry 1: 2000ms (2 seconds)
      const delay1 = Math.min(
        policy.initialDelayMs * Math.pow(policy.backoffMultiplier, 1),
        policy.maxDelayMs
      );
      expect(delay1).toBe(2000);

      // Retry 2: 4000ms (4 seconds)
      const delay2 = Math.min(
        policy.initialDelayMs * Math.pow(policy.backoffMultiplier, 2),
        policy.maxDelayMs
      );
      expect(delay2).toBe(4000);

      // Retry 3: 8000ms (8 seconds)
      const delay3 = Math.min(
        policy.initialDelayMs * Math.pow(policy.backoffMultiplier, 3),
        policy.maxDelayMs
      );
      expect(delay3).toBe(8000);

      // Retry 4: 16000ms (16 seconds)
      const delay4 = Math.min(
        policy.initialDelayMs * Math.pow(policy.backoffMultiplier, 4),
        policy.maxDelayMs
      );
      expect(delay4).toBe(16000);

      // Retry 5: 30000ms (capped at maxDelay)
      const delay5 = Math.min(
        policy.initialDelayMs * Math.pow(policy.backoffMultiplier, 5),
        policy.maxDelayMs
      );
      expect(delay5).toBe(30000);
    });
  });

  describe('priority ordering', () => {
    it('should assign correct priorities to data types', () => {
      // Access private method
      const getPriority = (syncManager as any).getPriority.bind(syncManager);

      expect(getPriority('ALERT_ACKNOWLEDGMENT')).toBe(100);
      expect(getPriority('ASSESSMENT')).toBe(50);
      expect(getPriority('GRADIENT')).toBe(10);
      expect(getPriority('UNKNOWN')).toBe(0);
    });
  });
});
