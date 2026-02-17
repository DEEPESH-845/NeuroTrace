/**
 * OfflineManager — Offline detection and prolonged offline notifications
 *
 * Monitors network connectivity, manages offline queuing,
 * and alerts when the device has been offline for too long
 * (risking missed assessment syncs).
 *
 * Requirements: 36.1, 36.2 — Offline deviation detection, prolonged offline notification
 */

import { syncManager } from '../database/SyncManager';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConnectivityStatus {
    isOnline: boolean;
    lastOnlineAt: Date | null;
    lastCheckedAt: Date;
    offlineDurationMs: number;
}

export interface OfflineConfig {
    /** Threshold in hours before triggering prolonged offline notification */
    prolongedOfflineHours: number;
    /** Check interval in milliseconds */
    checkIntervalMs: number;
    /** Maximum offline days before critical alert */
    criticalOfflineDays: number;
}

export enum OfflineAlertLevel {
    NONE = 'NONE',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL',
}

export interface OfflineAlert {
    level: OfflineAlertLevel;
    message: string;
    offlineDurationHours: number;
    pendingSyncCount: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
    prolongedOfflineHours: 24,
    checkIntervalMs: 30 * 60 * 1000, // 30 minutes
    criticalOfflineDays: 3,
};

// ─── OfflineManager ─────────────────────────────────────────────────────────

/**
 * Manages offline state detection and prolonged offline notifications.
 */
export class OfflineManager {
    private config: OfflineConfig;
    private _isOnline: boolean = true;
    private _lastOnlineAt: Date | null = new Date();
    private _offlineSince: Date | null = null;
    private checkIntervalId: ReturnType<typeof setInterval> | null = null;
    private alertCallback: ((alert: OfflineAlert) => void) | null = null;

    constructor(config: OfflineConfig = DEFAULT_OFFLINE_CONFIG) {
        this.config = config;
    }

    /**
     * Start monitoring connectivity.
     *
     * @param onAlert - Callback when prolonged offline is detected
     */
    startMonitoring(onAlert?: (alert: OfflineAlert) => void): void {
        this.alertCallback = onAlert || null;

        this.checkIntervalId = setInterval(() => {
            this.checkAndNotify();
        }, this.config.checkIntervalMs);

        // Initial check
        this.checkAndNotify();
    }

    /**
     * Stop monitoring connectivity.
     */
    stopMonitoring(): void {
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
            this.checkIntervalId = null;
        }
    }

    /**
     * Update connectivity status.
     *
     * Called by React Native's NetInfo listener.
     */
    updateConnectivity(isOnline: boolean): void {
        const wasOffline = !this._isOnline;

        this._isOnline = isOnline;

        if (isOnline) {
            this._lastOnlineAt = new Date();
            this._offlineSince = null;

            // Trigger sync if coming back online
            if (wasOffline) {
                this.onReconnect();
            }
        } else if (!this._offlineSince) {
            this._offlineSince = new Date();
        }
    }

    /**
     * Get current connectivity status.
     */
    getStatus(): ConnectivityStatus {
        const now = new Date();
        const offlineDurationMs = this._offlineSince
            ? now.getTime() - this._offlineSince.getTime()
            : 0;

        return {
            isOnline: this._isOnline,
            lastOnlineAt: this._lastOnlineAt,
            lastCheckedAt: now,
            offlineDurationMs,
        };
    }

    /**
     * Check offline duration and fire alerts if thresholds exceeded.
     */
    async checkAndNotify(): Promise<OfflineAlert | null> {
        if (this._isOnline || !this._offlineSince) {
            return null;
        }

        const offlineHours =
            (Date.now() - this._offlineSince.getTime()) / (1000 * 60 * 60);
        const offlineDays = offlineHours / 24;

        let level = OfflineAlertLevel.NONE;
        let message = '';

        if (offlineDays >= this.config.criticalOfflineDays) {
            level = OfflineAlertLevel.CRITICAL;
            message =
                `Your device has been offline for ${Math.floor(offlineDays)} days. ` +
                `Assessment data cannot be synced with your care team. ` +
                `Please connect to the internet as soon as possible.`;
        } else if (offlineHours >= this.config.prolongedOfflineHours) {
            level = OfflineAlertLevel.WARNING;
            message =
                `Your device has been offline for ${Math.floor(offlineHours)} hours. ` +
                `Assessment results are stored locally and will sync when you reconnect.`;
        }

        if (level === OfflineAlertLevel.NONE) {
            return null;
        }

        // Get pending sync count
        const syncStats = await syncManager.getStats();

        const alert: OfflineAlert = {
            level,
            message,
            offlineDurationHours: offlineHours,
            pendingSyncCount: syncStats.totalItems,
        };

        // Fire callback
        if (this.alertCallback) {
            this.alertCallback(alert);
        }

        return alert;
    }

    /**
     * Handle reconnection — trigger sync.
     */
    private async onReconnect(): Promise<void> {
        console.log('Device back online. Triggering sync...');

        try {
            const syncResult = await syncManager.syncWhenOnline();
            console.log(
                `Sync complete: ${syncResult.successCount} synced, ${syncResult.failureCount} failed.`
            );
        } catch (error) {
            console.error('Sync after reconnect failed:', error);
        }
    }

    /**
     * Check if deviations can be detected offline.
     *
     * Returns true — deviation detection runs entirely on-device
     * using local baseline and local assessments.
     */
    canDetectDeviationsOffline(): boolean {
        return true; // Always true — by design
    }

    /**
     * Dispose resources.
     */
    dispose(): void {
        this.stopMonitoring();
        this.alertCallback = null;
    }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const offlineManager = new OfflineManager();
