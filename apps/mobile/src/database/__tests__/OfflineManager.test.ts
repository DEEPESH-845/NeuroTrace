/**
 * OfflineManager Tests
 *
 * Tests connectivity tracking, offline alerts, and reconnection behavior.
 */

import { OfflineManager, OfflineAlertLevel } from '../OfflineManager';

// Mock the SyncManager
jest.mock('../SyncManager', () => ({
    syncManager: {
        getStats: jest.fn().mockResolvedValue({
            totalItems: 5,
            itemsByType: { assessment: 3, alert: 2 },
            itemsReadyForSync: 5,
            itemsWaitingForRetry: 0,
        }),
        syncWhenOnline: jest.fn().mockResolvedValue({
            successCount: 3,
            failureCount: 0,
            errors: [],
        }),
    },
}));

describe('OfflineManager', () => {
    let manager: OfflineManager;

    beforeEach(() => {
        manager = new OfflineManager({
            prolongedOfflineHours: 24,
            checkIntervalMs: 60000,
            criticalOfflineDays: 3,
        });
    });

    afterEach(() => {
        manager.dispose();
    });

    describe('getStatus', () => {
        it('reports online by default', () => {
            const status = manager.getStatus();
            expect(status.isOnline).toBe(true);
            expect(status.offlineDurationMs).toBe(0);
        });

        it('reports offline after updateConnectivity(false)', () => {
            manager.updateConnectivity(false);
            const status = manager.getStatus();
            expect(status.isOnline).toBe(false);
        });

        it('tracks offline duration', async () => {
            manager.updateConnectivity(false);
            // Small delay to accumulate some duration
            await new Promise((r) => setTimeout(r, 10));
            const status = manager.getStatus();
            expect(status.offlineDurationMs).toBeGreaterThan(0);
        });

        it('resets offline duration on reconnect', () => {
            manager.updateConnectivity(false);
            manager.updateConnectivity(true);
            const status = manager.getStatus();
            expect(status.isOnline).toBe(true);
            expect(status.offlineDurationMs).toBe(0);
            expect(status.lastOnlineAt).toBeDefined();
        });
    });

    describe('checkAndNotify', () => {
        it('returns null when online', async () => {
            const alert = await manager.checkAndNotify();
            expect(alert).toBeNull();
        });

        it('returns null when offline duration is short', async () => {
            manager.updateConnectivity(false);
            const alert = await manager.checkAndNotify();
            expect(alert).toBeNull(); // Just went offline, not prolonged
        });

        it('returns WARNING after prolonged offline threshold', async () => {
            manager.updateConnectivity(false);
            // Simulate prolonged offline by manipulating internal state
            (manager as any)._offlineSince = new Date(
                Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
            );

            const alert = await manager.checkAndNotify();
            expect(alert).not.toBeNull();
            expect(alert!.level).toBe(OfflineAlertLevel.WARNING);
            expect(alert!.offlineDurationHours).toBeGreaterThanOrEqual(24);
            expect(alert!.pendingSyncCount).toBe(5);
        });

        it('returns CRITICAL after critical offline threshold', async () => {
            manager.updateConnectivity(false);
            (manager as any)._offlineSince = new Date(
                Date.now() - 4 * 24 * 60 * 60 * 1000 // 4 days ago
            );

            const alert = await manager.checkAndNotify();
            expect(alert).not.toBeNull();
            expect(alert!.level).toBe(OfflineAlertLevel.CRITICAL);
        });

        it('fires callback when alert triggered', async () => {
            const mockCallback = jest.fn();
            manager.startMonitoring(mockCallback);

            manager.updateConnectivity(false);
            (manager as any)._offlineSince = new Date(
                Date.now() - 25 * 60 * 60 * 1000
            );

            await manager.checkAndNotify();
            expect(mockCallback).toHaveBeenCalledTimes(1);
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: OfflineAlertLevel.WARNING,
                })
            );
        });
    });

    describe('canDetectDeviationsOffline', () => {
        it('always returns true', () => {
            expect(manager.canDetectDeviationsOffline()).toBe(true);
        });
    });

    describe('startMonitoring / stopMonitoring', () => {
        it('starts and stops without error', () => {
            expect(() => {
                manager.startMonitoring();
                manager.stopMonitoring();
            }).not.toThrow();
        });
    });
});
