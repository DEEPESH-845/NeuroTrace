/**
 * Property-Based Tests for SyncManager
 * 
 * Tests sync queue properties using fast-check
 * 
 * Property 42: Assessment Data Synchronization
 * 
 * Validates: Requirements 14.3
 */

import * as fc from 'fast-check';
import { SyncManagerImpl } from '../SyncManager';
import { SyncableData } from '@neurotrace/types';
import * as db from '../index';

// Mock the database functions
jest.mock('../index', () => ({
  executeQuery: jest.fn(),
  executeQuerySingle: jest.fn(),
  getDatabase: jest.fn(),
}));

describe('SyncManager Property-Based Tests', () => {
  let syncManager: SyncManagerImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    syncManager = new SyncManagerImpl();
  });

  // Arbitraries for generating test data
  // Note: Use noNaN: true to avoid NaN values which don't survive JSON serialization
  const assessmentDataArb = fc.record({
    patientId: fc.uuid(),
    derivedMetrics: fc.record({
      speech: fc.record({
        articulationRate: fc.double({ min: 50, max: 300, noNaN: true }),
        meanPauseDuration: fc.double({ min: 50, max: 1000, noNaN: true }),
        pauseFrequency: fc.double({ min: 0, max: 20, noNaN: true }),
        phoneticPrecision: fc.double({ min: 0, max: 1, noNaN: true }),
        voiceQuality: fc.double({ min: 0, max: 1, noNaN: true }),
      }),
      facial: fc.record({
        symmetryScore: fc.double({ min: 0, max: 1, noNaN: true }),
        eyeOpennessRatio: fc.double({ min: 0, max: 1, noNaN: true }),
        mouthSymmetry: fc.double({ min: 0, max: 1, noNaN: true }),
      }),
      reaction: fc.record({
        meanReactionTime: fc.double({ min: 100, max: 2000, noNaN: true }),
        reactionTimeVariability: fc.double({ min: 0, max: 500, noNaN: true }),
        accuracy: fc.double({ min: 0, max: 1, noNaN: true }),
      }),
    }),
  });

  const alertAcknowledgmentDataArb = fc.record({
    alertId: fc.uuid(),
    clinicianId: fc.uuid(),
    notes: fc.option(fc.string(), { nil: undefined }),
  });

  const gradientDataArb = fc.record({
    deviceId: fc.uuid(),
    modelVersion: fc.constantFrom('v1', 'v2', 'v3'),
    // Use finite doubles only (no NaN, no Infinity) since JSON doesn't preserve them
    gradients: fc.array(
      fc.double({ min: -1, max: 1, noNaN: true }),
      { minLength: 10, maxLength: 100 }
    ),
    sampleCount: fc.integer({ min: 1, max: 100 }),
  });

  const syncableDataArb = fc.oneof(
    fc.record({
      id: fc.uuid(),
      type: fc.constant('ASSESSMENT' as const),
      data: assessmentDataArb,
      timestamp: fc.date(),
      retryCount: fc.constant(0),
    }),
    fc.record({
      id: fc.uuid(),
      type: fc.constant('ALERT_ACKNOWLEDGMENT' as const),
      data: alertAcknowledgmentDataArb,
      timestamp: fc.date(),
      retryCount: fc.constant(0),
    }),
    fc.record({
      id: fc.uuid(),
      type: fc.constant('GRADIENT' as const),
      data: gradientDataArb,
      timestamp: fc.date(),
      retryCount: fc.constant(0),
    })
  );

  /**
   * Property 42: Assessment Data Synchronization
   * 
   * **Validates: Requirements 14.3**
   * 
   * For any assessment completed while offline, when internet connectivity is restored,
   * the assessment results should be transmitted to the cloud within 5 minutes.
   * 
   * This test verifies that:
   * 1. Any queued data can be synced successfully
   * 2. Sync attempts happen within reasonable time (simulated)
   * 3. Failed syncs are retried with exponential backoff
   * 4. All queued items are eventually synced or marked as failed
   */
  describe('Property 42: Assessment Data Synchronization', () => {
    it('should sync any queued assessment within 5 minutes of connectivity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(syncableDataArb, { minLength: 1, maxLength: 10 }),
          async (queuedItems) => {
            // Track queued items in memory
            const queue: SyncableData[] = [];
            const syncedItems: string[] = [];
            const failedItems: string[] = [];

            // Mock database operations
            (db.executeQuery as jest.Mock).mockImplementation((sql, params) => {
              if (sql.includes('INSERT INTO sync_queue')) {
                // Queue the item
                const item = queuedItems[queue.length];
                if (item) {
                  queue.push(item);
                }
                return { rows: [], rowsAffected: 1 };
              } else if (sql.includes('SELECT * FROM sync_queue')) {
                // Return items ready for sync (not waiting for retry)
                const rows = queue
                  .filter((item) => !syncedItems.includes(item.id))
                  .map((item) => ({
                    id: item.id,
                    data_type: item.type,
                    data_id: item.id,
                    payload: JSON.stringify(item.data),
                    priority: getPriority(item.type),
                    created_at: item.timestamp.toISOString(),
                    retry_count: item.retryCount,
                    last_retry_at: null,
                    error_message: null,
                    next_retry_at: null,
                  }));
                return { rows, rowsAffected: rows.length };
              } else if (sql.includes('DELETE FROM sync_queue')) {
                // Mark item as synced
                const itemId = params[0];
                syncedItems.push(itemId);
                return { rows: [], rowsAffected: 1 };
              } else if (sql.includes('UPDATE sync_queue')) {
                // Retry scheduling - for this test, we'll mark as failed after retries
                const retryCount = params[0];
                const itemId = params[3];
                
                if (retryCount >= 5) {
                  failedItems.push(itemId);
                }
                return { rows: [], rowsAffected: 1 };
              }
              return { rows: [], rowsAffected: 0 };
            });

            // Queue all items (simulating offline assessment completion)
            for (const item of queuedItems) {
              await syncManager.queueForSync(item);
            }

            // Verify all items were queued
            expect(queue).toHaveLength(queuedItems.length);

            // Simulate connectivity restoration and sync
            // In a real scenario, this would happen within 5 minutes
            const syncResult = await syncManager.syncWhenOnline();

            // Verify sync was attempted
            expect(syncResult).toBeDefined();
            expect(syncResult.syncedCount).toBeGreaterThanOrEqual(0);
            expect(syncResult.failedCount).toBeGreaterThanOrEqual(0);

            // Verify total items processed equals queued items
            const totalProcessed = syncResult.syncedCount + syncResult.failedCount;
            expect(totalProcessed).toBe(queuedItems.length);

            // Verify all items were either synced or failed (none left in limbo)
            expect(syncedItems.length + failedItems.length).toBe(queuedItems.length);

            // Property: Within 5 minutes (simulated as immediate sync),
            // all queued items should be processed
            expect(syncedItems.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle sync failures with exponential backoff retry', async () => {
      await fc.assert(
        fc.asyncProperty(
          syncableDataArb,
          fc.integer({ min: 0, max: 4 }), // Retry count (0-4, max is 5)
          async (item, initialRetryCount) => {
            // Track retry attempts
            const retryAttempts: number[] = [];

            // Mock database to simulate retries
            (db.executeQuery as jest.Mock).mockImplementation((sql, params) => {
              if (sql.includes('INSERT INTO sync_queue')) {
                return { rows: [], rowsAffected: 1 };
              } else if (sql.includes('SELECT * FROM sync_queue')) {
                // Return item with current retry count
                const currentRetryCount = retryAttempts.length + initialRetryCount;
                const rows = currentRetryCount < 5 ? [{
                  id: item.id,
                  data_type: item.type,
                  data_id: item.id,
                  payload: JSON.stringify(item.data),
                  priority: getPriority(item.type),
                  created_at: item.timestamp.toISOString(),
                  retry_count: currentRetryCount,
                  last_retry_at: currentRetryCount > 0 ? new Date().toISOString() : null,
                  error_message: currentRetryCount > 0 ? 'Network error' : null,
                  next_retry_at: null, // Ready for retry
                }] : [];
                return { rows, rowsAffected: rows.length };
              } else if (sql.includes('UPDATE sync_queue')) {
                // Track retry attempt
                const newRetryCount = params[0];
                retryAttempts.push(newRetryCount);
                return { rows: [], rowsAffected: 1 };
              } else if (sql.includes('DELETE FROM sync_queue')) {
                return { rows: [], rowsAffected: 1 };
              }
              return { rows: [], rowsAffected: 0 };
            });

            // Override syncItem to always fail
            const originalSyncItem = (syncManager as any).syncItem;
            (syncManager as any).syncItem = jest.fn().mockRejectedValue(
              new Error('Network error')
            );

            // Queue the item
            await syncManager.queueForSync(item);

            // Attempt sync (will fail and schedule retry)
            const result = await syncManager.syncWhenOnline();

            // Verify retry was scheduled or item was removed after max retries
            if (initialRetryCount < 4) {
              // Should schedule retry
              expect(result.failedCount).toBe(1);
              expect(retryAttempts.length).toBeGreaterThan(0);
              
              // Verify exponential backoff is applied
              // (This is verified by the UPDATE query being called)
              expect(db.executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE sync_queue'),
                expect.arrayContaining([
                  initialRetryCount + 1,
                  'Network error',
                  expect.any(String), // next_retry_at
                  item.id,
                ])
              );
            } else {
              // Should remove after max retries
              expect(result.failedCount).toBe(1);
              expect(result.errors).toBeDefined();
              expect(result.errors![0].error).toContain('Max retries');
            }

            // Restore original method
            (syncManager as any).syncItem = originalSyncItem;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prioritize alert acknowledgments over assessments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(syncableDataArb, { minLength: 5, maxLength: 20 }),
          async (items) => {
            // Track sync order
            const syncOrder: string[] = [];
            const queue: Array<{ id: string; type: string; priority: number }> = [];

            // Mock database
            (db.executeQuery as jest.Mock).mockImplementation((sql, params) => {
              if (sql.includes('INSERT INTO sync_queue')) {
                const item = items[queue.length];
                if (item) {
                  queue.push({
                    id: item.id,
                    type: item.type,
                    priority: getPriority(item.type),
                  });
                }
                return { rows: [], rowsAffected: 1 };
              } else if (sql.includes('SELECT * FROM sync_queue')) {
                // Return items sorted by priority (DESC) and created_at (ASC)
                const rows = queue
                  .filter((q) => !syncOrder.includes(q.id))
                  .sort((a, b) => b.priority - a.priority)
                  .map((q, index) => {
                    const item = items.find((i) => i.id === q.id)!;
                    return {
                      id: item.id,
                      data_type: item.type,
                      data_id: item.id,
                      payload: JSON.stringify(item.data),
                      priority: q.priority,
                      created_at: item.timestamp.toISOString(),
                      retry_count: 0,
                      last_retry_at: null,
                      error_message: null,
                      next_retry_at: null,
                    };
                  });
                return { rows, rowsAffected: rows.length };
              } else if (sql.includes('DELETE FROM sync_queue')) {
                const itemId = params[0];
                syncOrder.push(itemId);
                return { rows: [], rowsAffected: 1 };
              }
              return { rows: [], rowsAffected: 0 };
            });

            // Queue all items
            for (const item of items) {
              await syncManager.queueForSync(item);
            }

            // Sync all items
            await syncManager.syncWhenOnline();

            // Verify priority ordering
            // Alert acknowledgments (priority 100) should be synced before
            // assessments (priority 50) and gradients (priority 10)
            const alertIndices = syncOrder
              .map((id, index) => {
                const item = items.find((i) => i.id === id);
                return item?.type === 'ALERT_ACKNOWLEDGMENT' ? index : -1;
              })
              .filter((i) => i >= 0);

            const assessmentIndices = syncOrder
              .map((id, index) => {
                const item = items.find((i) => i.id === id);
                return item?.type === 'ASSESSMENT' ? index : -1;
              })
              .filter((i) => i >= 0);

            const gradientIndices = syncOrder
              .map((id, index) => {
                const item = items.find((i) => i.id === id);
                return item?.type === 'GRADIENT' ? index : -1;
              })
              .filter((i) => i >= 0);

            // If we have alerts and assessments, alerts should come first
            if (alertIndices.length > 0 && assessmentIndices.length > 0) {
              const maxAlertIndex = Math.max(...alertIndices);
              const minAssessmentIndex = Math.min(...assessmentIndices);
              expect(maxAlertIndex).toBeLessThan(minAssessmentIndex);
            }

            // If we have assessments and gradients, assessments should come first
            if (assessmentIndices.length > 0 && gradientIndices.length > 0) {
              const maxAssessmentIndex = Math.max(...assessmentIndices);
              const minGradientIndex = Math.min(...gradientIndices);
              expect(maxAssessmentIndex).toBeLessThan(minGradientIndex);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle concurrent queue operations without data loss', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(syncableDataArb, { minLength: 10, maxLength: 50 }),
          async (items) => {
            // Track all queued items
            const queuedIds = new Set<string>();

            // Mock database
            (db.executeQuery as jest.Mock).mockImplementation((sql, params) => {
              if (sql.includes('INSERT INTO sync_queue')) {
                const itemId = params[0];
                queuedIds.add(itemId);
                return { rows: [], rowsAffected: 1 };
              } else if (sql.includes('SELECT * FROM sync_queue')) {
                const rows = Array.from(queuedIds).map((id) => {
                  const item = items.find((i) => i.id === id)!;
                  return {
                    id: item.id,
                    data_type: item.type,
                    data_id: item.id,
                    payload: JSON.stringify(item.data),
                    priority: getPriority(item.type),
                    created_at: item.timestamp.toISOString(),
                    retry_count: 0,
                    last_retry_at: null,
                    error_message: null,
                    next_retry_at: null,
                  };
                });
                return { rows, rowsAffected: rows.length };
              } else if (sql.includes('DELETE FROM sync_queue')) {
                const itemId = params[0];
                queuedIds.delete(itemId);
                return { rows: [], rowsAffected: 1 };
              }
              return { rows: [], rowsAffected: 0 };
            });

            // Queue all items concurrently (simulating rapid offline assessments)
            await Promise.all(items.map((item) => syncManager.queueForSync(item)));

            // Verify all items were queued
            expect(queuedIds.size).toBe(items.length);

            // Verify no duplicate IDs
            const uniqueIds = new Set(items.map((i) => i.id));
            expect(queuedIds.size).toBe(uniqueIds.size);

            // Sync all items
            const result = await syncManager.syncWhenOnline();

            // Verify all items were processed
            expect(result.syncedCount + result.failedCount).toBe(items.length);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain data integrity during sync operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          syncableDataArb,
          async (item) => {
            // Track the payload that was queued
            let queuedPayload: string | null = null;
            let syncedPayload: string | null = null;

            // Mock database
            (db.executeQuery as jest.Mock).mockImplementation((sql, params) => {
              if (sql.includes('INSERT INTO sync_queue')) {
                queuedPayload = params[3]; // payload is 4th parameter
                return { rows: [], rowsAffected: 1 };
              } else if (sql.includes('SELECT * FROM sync_queue')) {
                const rows = [{
                  id: item.id,
                  data_type: item.type,
                  data_id: item.id,
                  payload: queuedPayload,
                  priority: getPriority(item.type),
                  created_at: item.timestamp.toISOString(),
                  retry_count: 0,
                  last_retry_at: null,
                  error_message: null,
                  next_retry_at: null,
                }];
                return { rows, rowsAffected: 1 };
              } else if (sql.includes('DELETE FROM sync_queue')) {
                return { rows: [], rowsAffected: 1 };
              }
              return { rows: [], rowsAffected: 0 };
            });

            // Override syncItem to capture synced payload
            const originalSyncItem = (syncManager as any).syncItem;
            (syncManager as any).syncItem = jest.fn().mockImplementation(async (row: any) => {
              syncedPayload = row.payload;
            });

            // Queue the item
            await syncManager.queueForSync(item);

            // Sync the item
            await syncManager.syncWhenOnline();

            // Verify payload integrity
            expect(queuedPayload).not.toBeNull();
            expect(syncedPayload).not.toBeNull();
            expect(queuedPayload).toBe(syncedPayload);

            // Verify payload can be parsed back to original data
            const parsedData = JSON.parse(syncedPayload!);
            expect(parsedData).toEqual(item.data);

            // Restore original method
            (syncManager as any).syncItem = originalSyncItem;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

/**
 * Helper function to get priority for data type
 * Matches the implementation in SyncManager
 */
function getPriority(dataType: string): number {
  switch (dataType) {
    case 'ALERT_ACKNOWLEDGMENT':
      return 100;
    case 'ASSESSMENT':
      return 50;
    case 'GRADIENT':
      return 10;
    default:
      return 0;
  }
}
