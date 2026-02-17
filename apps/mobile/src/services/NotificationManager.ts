/**
 * NotificationManager
 * 
 * Handles local notifications and alerts for the mobile app.
 * Currently uses React Native Alerts for foreground notifications.
 * 
 * Requirements: 3.5 Prolonged offline notification
 */

import { Alert } from 'react-native';
import { OfflineAlert, OfflineAlertLevel } from '../database/OfflineManager';

class NotificationManager {
    /**
     * Show an alert for prolonged offline status
     */
    showOfflineAlert(alert: OfflineAlert): void {
        const title = alert.level === OfflineAlertLevel.CRITICAL
            ? 'Critical: Connection Required'
            : 'Offline Warning';

        Alert.alert(
            title,
            alert.message,
            [
                {
                    text: 'OK',
                    onPress: () => console.log('Offline alert acknowledged'),
                    style: 'default',
                },
                {
                    text: 'Settings',
                    onPress: () => {
                        // In a real app, open settings
                        console.log('Open settings requested');
                    },
                },
            ],
            { cancelable: false }
        );
    }
}

export const notificationManager = new NotificationManager();
