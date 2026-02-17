import { voiceCommandManager } from '../VoiceCommandManager';
import * as NavigationService from '../../navigation/NavigationService';

// Mock NavigationService
jest.mock('../../navigation/NavigationService', () => ({
    navigate: jest.fn(),
}));

describe('VoiceCommandManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should navigate to Home on "go home"', () => {
        const result = voiceCommandManager.processCommand('go home');
        expect(result).toBe(true);
        expect(NavigationService.navigate).toHaveBeenCalledWith('Home');
    });

    it('should navigate to Assessment on "start assessment"', () => {
        const result = voiceCommandManager.processCommand('start assessment');
        expect(result).toBe(true);
        expect(NavigationService.navigate).toHaveBeenCalledWith('Assessment');
    });

    it('should navigate to Settings on "open settings"', () => {
        // "open settings" contains "settings" which is a keyword
        const result = voiceCommandManager.processCommand('open settings');
        expect(result).toBe(true);
        expect(NavigationService.navigate).toHaveBeenCalledWith('Settings');
    });

    it('should return false for unknown command', () => {
        const result = voiceCommandManager.processCommand('order pizza');
        expect(result).toBe(false);
        expect(NavigationService.navigate).not.toHaveBeenCalled();
    });

    it('should follow listening state', () => {
        // Just verify methods don't crash and log (console.log mocked?)
        // We won't mock console here, just run it
        voiceCommandManager.startListening();
        voiceCommandManager.stopListening();
    });
});
