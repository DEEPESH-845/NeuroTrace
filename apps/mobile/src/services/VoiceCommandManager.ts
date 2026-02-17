/**
 * VoiceCommandManager
 * 
 * Handles voice command processing and navigation.
 * 
 * Requirements: 3.6 Voice command navigation
 */

import { navigate } from '../navigation/NavigationService';

export interface VoiceCommand {
    phrases: string[];
    action: () => void;
    description: string;
}

class VoiceCommandManager {
    private commands: VoiceCommand[] = [];
    private isListening: boolean = false;

    constructor() {
        this.registerDefaultCommands();
    }

    private registerDefaultCommands() {
        this.registerCommand({
            phrases: ['home', 'go home', 'main menu'],
            action: () => navigate('Home'),
            description: 'Go to Home Screen'
        });

        this.registerCommand({
            phrases: ['start assessment', 'begin assessment', 'new assessment'],
            action: () => {
                // Navigate to Assessment if available, otherwise log
                console.log('Voice Command: Start Assessment');
                navigate('Assessment');
            },
            description: 'Start a new assessment'
        });

        this.registerCommand({
            phrases: ['settings', 'preferences', 'options'],
            action: () => navigate('Settings'),
            description: 'Open Settings'
        });

        this.registerCommand({
            phrases: ['help', 'support', 'assistance'],
            action: () => console.log('Help requested (Voice)'), // navigate('Help') ??
            description: 'Request help'
        });
    }

    /**
     * Register a new voice command
     */
    registerCommand(command: VoiceCommand) {
        this.commands.push(command);
    }

    /**
     * Process a transcribed voice command
     * @param text Transcribed text
     * @returns boolean - true if command matched and executed
     */
    processCommand(text: string): boolean {
        const normalizedText = text.toLowerCase().trim();
        console.log(`[VoiceCommandManager] Processing: "${normalizedText}"`);

        // Simple exact phrase matching (or inclusion)
        const match = this.commands.find(cmd =>
            cmd.phrases.some(phrase => normalizedText.includes(phrase))
        );

        if (match) {
            console.log(`[VoiceCommandManager] Matched command: ${match.description}`);
            match.action();
            return true;
        }

        console.log('[VoiceCommandManager] No matching command found');
        return false;
    }

    /**
     * Start listening for voice commands
     * (Requires native integration)
     */
    startListening() {
        if (this.isListening) return;
        this.isListening = true;
        console.log('[VoiceCommandManager] Started listening (Mock)');
        // In real app: Voice.start('en-US');
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (!this.isListening) return;
        this.isListening = false;
        console.log('[VoiceCommandManager] Stopped listening (Mock)');
        // In real app: Voice.stop();
    }
}

export const voiceCommandManager = new VoiceCommandManager();
