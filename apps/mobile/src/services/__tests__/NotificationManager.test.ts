import { Alert } from 'react-native';
import { notificationManager } from '../NotificationManager';
import { OfflineAlert, OfflineAlertLevel } from '../../database/OfflineManager';

// Mock Alert
jest.mock('react-native', () => ({
    Alert: {
        alert: jest.fn(),
    },
    Platform: {
        OS: 'ios',
    },
}));

describe('NotificationManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should show critical alert correctly', () => {
        const alert: OfflineAlert = {
            level: OfflineAlertLevel.CRITICAL,
            message: 'You have been offline for 3 days.',
            offlineDurationHours: 72,
            pendingSyncCount: 5,
        };

        notificationManager.showOfflineAlert(alert);

        expect(Alert.alert).toHaveBeenCalledWith(
            'Critical: Connection Required',
            'You have been offline for 3 days.',
            expect.any(Array),
            { cancelable: false }
        );
    });

    it('should show warning alert correctly', () => {
        const alert: OfflineAlert = {
            level: OfflineAlertLevel.WARNING,
            message: 'You have been offline for 24 hours.',
            offlineDurationHours: 24,
            pendingSyncCount: 2,
        };

        notificationManager.showOfflineAlert(alert);

        expect(Alert.alert).toHaveBeenCalledWith(
            'Offline Warning',
            'You have been offline for 24 hours.',
            expect.any(Array),
            { cancelable: false }
        );
    });

    it('should have correct buttons', () => {
        const alert: OfflineAlert = {
            level: OfflineAlertLevel.WARNING,
            message: 'Test message',
            offlineDurationHours: 24,
            pendingSyncCount: 0,
        };

        notificationManager.showOfflineAlert(alert);

        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        expect(buttons).toHaveLength(2);
        expect(buttons[0].text).toBe('OK');
        expect(buttons[1].text).toBe('Settings');
    });
});
