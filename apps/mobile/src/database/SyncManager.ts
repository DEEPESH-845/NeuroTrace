/**
 * SyncManager Implementation
 * 
 * Handles offline sync queue with exponential backoff retry logic
 * Queues data for synchronization when offline and syncs when connectivity is restored
 * 
 * Requirements: 14.3
 */

import {
  SyncManager,
  SyncableData,
  SyncResult,
} from '@neurotrace/types';
import { executeQuery, executeQuerySingle } from './index';

/**
 * Database row type for sync queue
 */
interface SyncQueueRow {
  id: string;
  data_type: string;
  data_id: string;
  payload: string;
  priority: number;
  created_at: string;
  retry_count: number;
  last_retry_at: string | null;
  error_message: string | null;
  next_retry_at: string | null;
}

/**
 * Retry policy configuration
 */
interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry policy with exponential backoff
 * - Initial delay: 1 second
 * - Max delay: 30 seconds
 * - Backoff multiplier: 2 (exponential)
 * - Max attempts: 5
 */
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Calculate next retry time using exponential backoff
 * 
 * Formula: delay = min(initialDelay * (backoffMultiplier ^ retryCount), maxDelay)
 * 
 * @param retryCount - Current retry count
 * @param policy - Retry policy
 * @returns Next retry timestamp
 */
function calculateNextRetryTime(
  retryCount: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): Date {
  const delay = Math.min(
    policy.initialDelayMs * Math.pow(policy.backoffMultiplier, retryCount),
    policy.maxDelayMs
  );
  
  return new Date(Date.now() + delay);
}

/**
 * Implementation of SyncManager interface
 */
export class SyncManagerImpl implements SyncManager {
  private retryPolicy: RetryPolicy;

  constructor(retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY) {
    this.retryPolicy = retryPolicy;
  }

  /**
   * Queue data for synchronization
   * Data will be synced when connectivity is restored
   * 
   * @param data - Data to queue for sync
   */
  async queueForSync(data: SyncableData): Promise<void> {
    const sql = `
      INSERT INTO sync_queue (
        id, data_type, data_id, payload, priority,
        created_at, retry_count, last_retry_at, error_message, next_retry_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), 0, NULL, NULL, NULL)
    `;

    const params = [
      data.id || generateUUID(),
      data.type,
      data.id,
      JSON.stringify(data.data),
      this.getPriority(data.type),
    ];

    executeQuery(sql, params);
  }

  /**
   * Sync all queued items when online
   * Processes items in priority order with exponential backoff retry logic
   * 
   * @returns Sync result with success/failure counts
   */
  async syncWhenOnline(): Promise<SyncResult> {
    // Get items ready for sync (not waiting for retry)
    const items = await this.getItemsReadyForSync();

    if (items.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
      };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const item of items) {
      try {
        // Attempt to sync the item
        await this.syncItem(item);
        
        // Remove from queue on success
        await this.removeFromQueue(item.id);
        syncedCount++;
      } catch (error) {
        // Update retry count and schedule next retry
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (item.retry_count + 1 >= this.retryPolicy.maxAttempts) {
          // Max retries reached, mark as failed and remove from queue
          errors.push({
            id: item.id,
            error: `Max retries (${this.retryPolicy.maxAttempts}) reached: ${errorMessage}`,
          });
          await this.removeFromQueue(item.id);
          failedCount++;
        } else {
          // Schedule retry with exponential backoff
          await this.scheduleRetry(item.id, item.retry_count + 1, errorMessage);
          failedCount++;
        }
      }
    }

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get all queued items
   * 
   * @returns Array of queued items
   */
  async getQueuedItems(): Promise<SyncableData[]> {
    const sql = `
      SELECT * FROM sync_queue
      ORDER BY priority DESC, created_at ASC
    `;

    const result = executeQuery<SyncQueueRow>(sql);

    return result.rows.map((row) => this.mapRowToSyncableData(row));
  }

  /**
   * Clear all items from sync queue
   * WARNING: This will delete all pending sync data
   */
  async clearQueue(): Promise<void> {
    executeQuery('DELETE FROM sync_queue');
  }

  /**
   * Get items that are ready for sync (not waiting for retry)
   */
  private async getItemsReadyForSync(): Promise<SyncQueueRow[]> {
    const sql = `
      SELECT * FROM sync_queue
      WHERE next_retry_at IS NULL OR next_retry_at <= datetime('now')
      ORDER BY priority DESC, created_at ASC
    `;

    const result = executeQuery<SyncQueueRow>(sql);
    return result.rows;
  }

  /**
   * Sync a single item to the backend
   * This is a placeholder - actual implementation would make HTTP requests
   * 
   * @param item - Item to sync
   */
  private async syncItem(item: SyncQueueRow): Promise<void> {
    // TODO: Implement actual sync logic with backend API
    // For now, this is a placeholder that simulates sync
    
    // Parse payload
    const payload = JSON.parse(item.payload);
    
    // Determine endpoint based on data type
    let endpoint: string;
    
    switch (item.data_type) {
      case 'ASSESSMENT':
        endpoint = '/api/v1/assessments';
        break;
      case 'ALERT_ACKNOWLEDGMENT':
        endpoint = `/api/v1/alerts/${payload.alertId}/acknowledge`;
        break;
      case 'GRADIENT':
        endpoint = '/api/v1/federated/gradients';
        break;
      default:
        throw new Error(`Unknown data type: ${item.data_type}`);
    }
    
    // TODO: Make actual HTTP request
    // const response = await fetch(API_BASE_URL + endpoint, {
    //   method,
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${authToken}`,
    //   },
    //   body: JSON.stringify(payload),
    // });
    //
    // if (!response.ok) {
    //   throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    // }
    
    // For now, simulate success
    console.log(`[SyncManager] Would sync ${item.data_type} to ${endpoint}`);
  }

  /**
   * Remove item from sync queue
   */
  private async removeFromQueue(id: string): Promise<void> {
    executeQuery('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(
    id: string,
    newRetryCount: number,
    errorMessage: string
  ): Promise<void> {
    const nextRetryAt = calculateNextRetryTime(newRetryCount, this.retryPolicy);
    
    const sql = `
      UPDATE sync_queue
      SET retry_count = ?,
          last_retry_at = datetime('now'),
          error_message = ?,
          next_retry_at = ?
      WHERE id = ?
    `;

    executeQuery(sql, [
      newRetryCount,
      errorMessage,
      nextRetryAt.toISOString(),
      id,
    ]);
  }

  /**
   * Get priority for data type
   * Higher priority items are synced first
   */
  private getPriority(dataType: string): number {
    switch (dataType) {
      case 'ALERT_ACKNOWLEDGMENT':
        return 100; // Highest priority
      case 'ASSESSMENT':
        return 50;  // Medium priority
      case 'GRADIENT':
        return 10;  // Lowest priority
      default:
        return 0;
    }
  }

  /**
   * Map database row to SyncableData
   */
  private mapRowToSyncableData(row: SyncQueueRow): SyncableData {
    return {
      id: row.id,
      type: row.data_type as 'ASSESSMENT' | 'ALERT_ACKNOWLEDGMENT' | 'GRADIENT',
      data: JSON.parse(row.payload),
      timestamp: new Date(row.created_at),
      retryCount: row.retry_count,
    };
  }

  /**
   * Get sync queue statistics
   */
  async getStats(): Promise<{
    totalItems: number;
    itemsByType: Record<string, number>;
    itemsReadyForSync: number;
    itemsWaitingForRetry: number;
  }> {
    const totalItems = executeQuerySingle<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue'
    )?.count || 0;

    const itemsByTypeResult = executeQuery<{ data_type: string; count: number }>(
      'SELECT data_type, COUNT(*) as count FROM sync_queue GROUP BY data_type'
    );

    const itemsByType: Record<string, number> = {};
    for (const row of itemsByTypeResult.rows) {
      itemsByType[row.data_type] = row.count;
    }

    const itemsReadyForSync = executeQuerySingle<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue 
       WHERE next_retry_at IS NULL OR next_retry_at <= datetime('now')`
    )?.count || 0;

    const itemsWaitingForRetry = executeQuerySingle<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue 
       WHERE next_retry_at IS NOT NULL AND next_retry_at > datetime('now')`
    )?.count || 0;

    return {
      totalItems,
      itemsByType,
      itemsReadyForSync,
      itemsWaitingForRetry,
    };
  }
}

/**
 * Create a singleton instance of SyncManager
 */
export const syncManager = new SyncManagerImpl();
