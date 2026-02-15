# SyncManager - Offline Sync Queue

## Overview

The SyncManager handles offline synchronization of data to the backend when network connectivity is restored. It implements a robust queue system with exponential backoff retry logic to ensure reliable data delivery.

## Features

- **Priority-based Queue**: Different data types have different priorities (alerts > assessments > gradients)
- **Exponential Backoff**: Failed sync attempts are retried with increasing delays (1s, 2s, 4s, 8s, 16s, 30s max)
- **Max Retry Limit**: Items are removed after 5 failed attempts to prevent infinite retries
- **Persistent Storage**: Queue is stored in SQLCipher encrypted database
- **Automatic Cleanup**: Successfully synced items are automatically removed

## Usage

```typescript
import { syncManager } from './database';

// Queue data for sync
await syncManager.queueForSync({
  id: 'assessment-123',
  type: 'ASSESSMENT',
  data: { patientId: 'patient-1', metrics: {...} },
  timestamp: new Date(),
  retryCount: 0,
});

// Sync when online (call this when connectivity is restored)
const result = await syncManager.syncWhenOnline();
console.log(`Synced: ${result.syncedCount}, Failed: ${result.failedCount}`);

// Get queue statistics
const stats = await syncManager.getStats();
console.log(`Total items: ${stats.totalItems}`);
console.log(`Ready for sync: ${stats.itemsReadyForSync}`);
console.log(`Waiting for retry: ${stats.itemsWaitingForRetry}`);
```

## Data Types and Priorities

| Data Type | Priority | Description |
|-----------|----------|-------------|
| `ALERT_ACKNOWLEDGMENT` | 100 | Highest priority - clinician/caregiver alert acknowledgments |
| `ASSESSMENT` | 50 | Medium priority - patient assessment results |
| `GRADIENT` | 10 | Lowest priority - federated learning gradients |

## Retry Policy

The default retry policy uses exponential backoff:

- **Initial Delay**: 1 second
- **Max Delay**: 30 seconds
- **Backoff Multiplier**: 2 (exponential)
- **Max Attempts**: 5

### Retry Schedule

| Attempt | Delay |
|---------|-------|
| 1 | 1 second |
| 2 | 2 seconds |
| 3 | 4 seconds |
| 4 | 8 seconds |
| 5 | 16 seconds |
| 6+ | 30 seconds (capped) |

After 5 failed attempts, the item is removed from the queue and logged as a permanent failure.

## Database Schema

The sync queue is stored in the `sync_queue` table:

```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  data_type TEXT NOT NULL,
  data_id TEXT NOT NULL,
  payload TEXT NOT NULL,           -- JSON payload
  priority INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER NOT NULL,
  last_retry_at TEXT,
  error_message TEXT,
  next_retry_at TEXT               -- Exponential backoff timestamp
);
```

## Error Handling

- **Network Errors**: Automatically retried with exponential backoff
- **Validation Errors**: Removed from queue immediately (no retry)
- **Max Retries Reached**: Item removed and error logged
- **Unknown Data Types**: Throw error immediately

## Integration with Backend

The SyncManager is designed to work with the NeuroTrace backend API:

- `POST /api/v1/assessments` - Sync assessment data
- `POST /api/v1/alerts/:id/acknowledge` - Sync alert acknowledgments
- `POST /api/v1/federated/gradients` - Sync federated learning gradients

## Testing

Run the unit tests:

```bash
npm test -- SyncManager.test.ts
```

The test suite covers:
- Queueing different data types
- Priority ordering
- Exponential backoff calculation
- Retry logic
- Max retry handling
- Queue statistics

## Requirements

Implements **Requirement 14.3**: Assessment data synchronization within 5 minutes of connectivity restoration.

## Future Enhancements

- [ ] Add network connectivity monitoring
- [ ] Implement automatic sync on connectivity change
- [ ] Add batch sync for multiple items
- [ ] Add compression for large payloads
- [ ] Add sync progress callbacks
- [ ] Add configurable retry policies per data type
