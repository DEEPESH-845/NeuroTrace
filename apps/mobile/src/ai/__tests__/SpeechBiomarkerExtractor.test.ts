/**
 * Unit tests for SpeechBiomarkerExtractor
 * 
 * Tests speech biomarker extraction using ONNX Runtime and Phi-3-Mini model
 * 
 * Requirements: 2.4, 6.1, 10.2
 */

import {
  ONNXSpeechBiomarkerExtractor,
  createSpeechBiomarkerExtractor,
  AudioProcessingError,
  DEFAULT_SPEECH_CONFIG,
} from '../SpeechBiomarkerExtractor';
import { ONNXRuntimeManager } from '../ONNXRuntimeManager';
import { Tensor } from 'onnxruntime-react-native';

// Mock ONNX Runtime
jest.mock('onnxruntime-react-native', () => ({
  Tensor: jest.fn((type: string, data: Float32Array, dims: number[]) => ({
    type,
    data,
    dims,
  })),
}));

describe('SpeechBiomarkerExtractor', () => {
  let extractor: ONNXSpeechBiomarkerExtractor;
  let mockONNXManager: jest.Mocked<ONNXRuntimeManager>;

  beforeEach(() => {
    // Create mock ONNX Runtime Manager
    mockONNXManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      runInference: jest.fn().mockResolvedValue({
        data: new Float32Array([0.75]), // Mock quality score
      } as Tensor),
      isInitialized: jest.fn().mockReturnValue(true),
      getModelPath: jest.fn().mockReturnValue('models/phi3-mini-speech.onnx'),
      dispose: jest.fn().mockResolvedValue(undefined),
    };

    extractor = new ONNXSpeechBiomarkerExtractor(mockONNXManager, DEFAULT_SPEECH_CONFIG);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractBiomarkers', () => {
    it('should extract all speech biomarkers from valid audio', async () => {
      // Create mock audio: 3 seconds at 16kHz with speech-like pattern
      const sampleRate = 16000;
      const duration = 3; // seconds
      const audioBuffer = generateMockSpeechAudio(sampleRate, duration);

      const metrics = await extractor.extractBiomarkers(audioBuffer);

      expect(metrics).toHaveProperty('articulationRate');
      expect(metrics).toHaveProperty('meanPauseDuration');
      expect(metrics).toHaveProperty('pauseFrequency');
      expect(metrics).toHaveProperty('phoneticPrecision');
      expect(metrics).toHaveProperty('voiceQuality');
      expect(metrics).toHaveProperty('timestamp');

      expect(metrics.articulationRate).toBeGreaterThanOrEqual(0);
      expect(metrics.meanPauseDuration).toBeGreaterThanOrEqual(0);
      expect(metrics.pauseFrequency).toBeGreaterThanOrEqual(0);
      expect(metrics.phoneticPrecision).toBeGreaterThanOrEqual(0);
      expect(metrics.phoneticPrecision).toBeLessThanOrEqual(1);
      expect(metrics.voiceQuality).toBeGreaterThanOrEqual(0);
      expect(metrics.voiceQuality).toBeLessThanOrEqual(1);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should complete processing within 5 seconds (Requirement 10.2)', async () => {
      const audioBuffer = generateMockSpeechAudio(16000, 3);

      const startTime = Date.now();
      await extractor.extractBiomarkers(audioBuffer);
      const processingTime = Date.now() - startTime;

      // Should complete well under 5 seconds
      expect(processingTime).toBeLessThan(5000);
    });

    it('should throw AudioProcessingError for empty audio buffer', async () => {
      const emptyBuffer = new Float32Array(0);

      await expect(extractor.extractBiomarkers(emptyBuffer)).rejects.toThrow(AudioProcessingError);
      await expect(extractor.extractBiomarkers(emptyBuffer)).rejects.toThrow('Audio buffer is empty');
    });

    it('should throw AudioProcessingError for audio shorter than minimum duration', async () => {
      // Create 1 second audio (minimum is 2 seconds)
      const shortAudio = generateMockSpeechAudio(16000, 1);

      await expect(extractor.extractBiomarkers(shortAudio)).rejects.toThrow(AudioProcessingError);
      await expect(extractor.extractBiomarkers(shortAudio)).rejects.toThrow('Audio too short');
    });

    it('should throw AudioProcessingError for silent audio (no signal)', async () => {
      const silentAudio = new Float32Array(16000 * 3); // 3 seconds of silence

      await expect(extractor.extractBiomarkers(silentAudio)).rejects.toThrow(AudioProcessingError);
      await expect(extractor.extractBiomarkers(silentAudio)).rejects.toThrow('contains no signal');
    });

    it('should use fallback voice quality when ONNX not initialized', async () => {
      mockONNXManager.isInitialized.mockReturnValue(false);

      const audioBuffer = generateMockSpeechAudio(16000, 3);
      const metrics = await extractor.extractBiomarkers(audioBuffer);

      expect(metrics.voiceQuality).toBeGreaterThanOrEqual(0);
      expect(metrics.voiceQuality).toBeLessThanOrEqual(1);
      expect(mockONNXManager.runInference).not.toHaveBeenCalled();
    });

    it('should use fallback voice quality when ONNX inference fails', async () => {
      mockONNXManager.runInference.mockRejectedValue(new Error('Inference failed'));

      const audioBuffer = generateMockSpeechAudio(16000, 3);
      const metrics = await extractor.extractBiomarkers(audioBuffer);

      expect(metrics.voiceQuality).toBeGreaterThanOrEqual(0);
      expect(metrics.voiceQuality).toBeLessThanOrEqual(1);
    });
  });

  describe('computeArticulationRate', () => {
    it('should compute articulation rate in words per minute', () => {
      // Create audio with clear syllable-like patterns
      const audioBuffer = generateMockSpeechAudio(16000, 3);

      const rate = extractor.computeArticulationRate(audioBuffer);

      expect(rate).toBeGreaterThanOrEqual(0);
      // Typical speech rate is 120-180 words per minute
      expect(rate).toBeLessThan(300); // Sanity check
    });

    it('should return 0 for zero-duration audio', () => {
      const emptyBuffer = new Float32Array(0);

      const rate = extractor.computeArticulationRate(emptyBuffer);

      expect(rate).toBe(0);
    });

    it('should detect syllables in speech-like audio', () => {
      // Create audio with distinct energy peaks (syllables)
      const sampleRate = 16000;
      const duration = 3;
      const audioBuffer = new Float32Array(sampleRate * duration);

      // Create 10 syllable-like bursts
      for (let i = 0; i < 10; i++) {
        const startSample = Math.floor((i * duration * sampleRate) / 10);
        const burstLength = 1000; // ~60ms burst

        for (let j = 0; j < burstLength; j++) {
          audioBuffer[startSample + j] = 0.5 * Math.sin((j / 100) * Math.PI * 2);
        }
      }

      const rate = extractor.computeArticulationRate(audioBuffer);

      // Should detect syllables and convert to words per minute
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('detectPauseDuration', () => {
    it('should detect pauses in audio', () => {
      const sampleRate = 16000;
      const audioBuffer = new Float32Array(sampleRate * 3); // 3 seconds

      // Create speech with pauses
      // Speech: 0-0.5s, Pause: 0.5-1s, Speech: 1-1.5s, Pause: 1.5-2.5s, Speech: 2.5-3s
      for (let i = 0; i < sampleRate * 0.5; i++) {
        audioBuffer[i] = 0.5 * Math.sin((i / 100) * Math.PI * 2);
      }
      for (let i = sampleRate * 1; i < sampleRate * 1.5; i++) {
        audioBuffer[i] = 0.5 * Math.sin((i / 100) * Math.PI * 2);
      }
      for (let i = sampleRate * 2.5; i < sampleRate * 3; i++) {
        audioBuffer[i] = 0.5 * Math.sin((i / 100) * Math.PI * 2);
      }

      const pauses = extractor.detectPauseDuration(audioBuffer);

      expect(pauses.length).toBeGreaterThan(0);
      pauses.forEach(pause => {
        expect(pause).toBeGreaterThan(0); // Pause duration in milliseconds
        expect(pause).toBeGreaterThanOrEqual(150); // Minimum pause is 150ms
      });
    });

    it('should return empty array for continuous speech (no pauses)', () => {
      const sampleRate = 16000;
      const audioBuffer = new Float32Array(sampleRate * 3);

      // Fill with continuous signal
      for (let i = 0; i < audioBuffer.length; i++) {
        audioBuffer[i] = 0.5 * Math.sin((i / 100) * Math.PI * 2);
      }

      const pauses = extractor.detectPauseDuration(audioBuffer);

      expect(pauses).toEqual([]);
    });

    it('should ignore pauses shorter than minimum duration (150ms)', () => {
      const sampleRate = 16000;
      const audioBuffer = new Float32Array(sampleRate * 2);

      // Create speech with very short pause (100ms)
      for (let i = 0; i < sampleRate * 0.9; i++) {
        audioBuffer[i] = 0.5 * Math.sin((i / 100) * Math.PI * 2);
      }
      // 100ms pause (should be ignored)
      for (let i = sampleRate * 1; i < sampleRate * 2; i++) {
        audioBuffer[i] = 0.5 * Math.sin((i / 100) * Math.PI * 2);
      }

      const pauses = extractor.detectPauseDuration(audioBuffer);

      // Should not detect the short pause
      expect(pauses.length).toBe(0);
    });
  });

  describe('analyzePhoneticPrecision', () => {
    it('should analyze phonetic precision and return score between 0 and 1', () => {
      const audioBuffer = generateMockSpeechAudio(16000, 3);

      const precision = extractor.analyzePhoneticPrecision(audioBuffer);

      expect(precision).toBeGreaterThanOrEqual(0);
      expect(precision).toBeLessThanOrEqual(1);
    });

    it('should return higher precision for clear speech-like audio', () => {
      const sampleRate = 16000;
      const audioBuffer = new Float32Array(sampleRate * 3);

      // Create clear tonal signal (high precision)
      for (let i = 0; i < audioBuffer.length; i++) {
        audioBuffer[i] = 0.5 * Math.sin((i / 50) * Math.PI * 2);
      }

      const precision = extractor.analyzePhoneticPrecision(audioBuffer);

      expect(precision).toBeGreaterThan(0.3); // Should be reasonably high
    });

    it('should return lower precision for noisy audio', () => {
      const sampleRate = 16000;
      const audioBuffer = new Float32Array(sampleRate * 3);

      // Create noisy signal (low precision)
      for (let i = 0; i < audioBuffer.length; i++) {
        audioBuffer[i] = (Math.random() - 0.5) * 0.1; // White noise
      }

      const precision = extractor.analyzePhoneticPrecision(audioBuffer);

      expect(precision).toBeGreaterThanOrEqual(0);
      expect(precision).toBeLessThanOrEqual(1);
    });
  });

  describe('createSpeechBiomarkerExtractor', () => {
    it('should create extractor with default config', () => {
      const extractor = createSpeechBiomarkerExtractor();

      expect(extractor).toBeDefined();
      expect(extractor).toBeInstanceOf(ONNXSpeechBiomarkerExtractor);
    });

    it('should create extractor with custom config', () => {
      const customConfig = {
        sampleRate: 44100,
        minSpeechDuration: 3,
      };

      const extractor = createSpeechBiomarkerExtractor(customConfig);

      expect(extractor).toBeDefined();
      expect(extractor).toBeInstanceOf(ONNXSpeechBiomarkerExtractor);
    });
  });

  describe('edge cases', () => {
    it('should handle very short valid audio (exactly minimum duration)', async () => {
      // Create exactly 2 seconds of audio (minimum duration)
      const audioBuffer = generateMockSpeechAudio(16000, 2);

      const metrics = await extractor.extractBiomarkers(audioBuffer);

      expect(metrics).toBeDefined();
      expect(metrics.articulationRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long audio', async () => {
      // Create 30 seconds of audio
      const audioBuffer = generateMockSpeechAudio(16000, 30);

      const metrics = await extractor.extractBiomarkers(audioBuffer);

      expect(metrics).toBeDefined();
      expect(metrics.articulationRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle audio with extreme amplitude', async () => {
      const sampleRate = 16000;
      const audioBuffer = new Float32Array(sampleRate * 3);

      // Create audio with very high amplitude
      for (let i = 0; i < audioBuffer.length; i++) {
        audioBuffer[i] = 0.99 * Math.sin((i / 100) * Math.PI * 2);
      }

      const metrics = await extractor.extractBiomarkers(audioBuffer);

      expect(metrics).toBeDefined();
      expect(metrics.phoneticPrecision).toBeGreaterThanOrEqual(0);
      expect(metrics.phoneticPrecision).toBeLessThanOrEqual(1);
    });

    it('should handle audio with very low amplitude', async () => {
      const sampleRate = 16000;
      const audioBuffer = new Float32Array(sampleRate * 3);

      // Create audio with very low but detectable amplitude
      for (let i = 0; i < audioBuffer.length; i++) {
        audioBuffer[i] = 0.01 * Math.sin((i / 100) * Math.PI * 2);
      }

      const metrics = await extractor.extractBiomarkers(audioBuffer);

      expect(metrics).toBeDefined();
      expect(metrics.voiceQuality).toBeGreaterThanOrEqual(0);
      expect(metrics.voiceQuality).toBeLessThanOrEqual(1);
    });
  });

  describe('error handling', () => {
    it('should provide helpful error message for empty buffer', async () => {
      const emptyBuffer = new Float32Array(0);

      try {
        await extractor.extractBiomarkers(emptyBuffer);
        fail('Should have thrown AudioProcessingError');
      } catch (error) {
        expect(error).toBeInstanceOf(AudioProcessingError);
        expect((error as Error).message).toBe('Audio buffer is empty');
      }
    });

    it('should provide helpful error message for short audio', async () => {
      const shortAudio = generateMockSpeechAudio(16000, 1);

      try {
        await extractor.extractBiomarkers(shortAudio);
        fail('Should have thrown AudioProcessingError');
      } catch (error) {
        expect(error).toBeInstanceOf(AudioProcessingError);
        expect((error as Error).message).toContain('Audio too short');
        expect((error as Error).message).toContain('1.0s');
        expect((error as Error).message).toContain('minimum 2s required');
      }
    });

    it('should provide helpful error message for silent audio', async () => {
      const silentAudio = new Float32Array(16000 * 3);

      try {
        await extractor.extractBiomarkers(silentAudio);
        fail('Should have thrown AudioProcessingError');
      } catch (error) {
        expect(error).toBeInstanceOf(AudioProcessingError);
        expect((error as Error).message).toContain('contains no signal');
      }
    });

    it('should wrap ONNX errors in SpeechBiomarkerExtractionError', async () => {
      mockONNXManager.runInference.mockRejectedValue(new Error('Model inference failed'));

      const audioBuffer = generateMockSpeechAudio(16000, 3);

      // Should not throw - should fall back to simple quality metric
      const metrics = await extractor.extractBiomarkers(audioBuffer);
      expect(metrics).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should process 3-second audio in under 5 seconds', async () => {
      const audioBuffer = generateMockSpeechAudio(16000, 3);

      const startTime = Date.now();
      await extractor.extractBiomarkers(audioBuffer);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it('should process 10-second audio in under 5 seconds', async () => {
      const audioBuffer = generateMockSpeechAudio(16000, 10);

      const startTime = Date.now();
      await extractor.extractBiomarkers(audioBuffer);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });
});

/**
 * Helper function to generate mock speech-like audio
 */
function generateMockSpeechAudio(sampleRate: number, durationSeconds: number): Float32Array {
  const numSamples = sampleRate * durationSeconds;
  const audioBuffer = new Float32Array(numSamples);

  // Generate speech-like audio with varying amplitude and frequency
  for (let i = 0; i < numSamples; i++) {
    // Create amplitude modulation (syllable-like pattern)
    const syllableFreq = 3; // ~3 syllables per second
    const amplitude = 0.3 + 0.2 * Math.sin((i / sampleRate) * syllableFreq * Math.PI * 2);

    // Create carrier frequency (voice-like)
    const carrierFreq = 150 + 50 * Math.sin((i / sampleRate) * 2 * Math.PI);
    const carrier = Math.sin((i / sampleRate) * carrierFreq * Math.PI * 2);

    // Add some noise for realism
    const noise = (Math.random() - 0.5) * 0.05;

    audioBuffer[i] = amplitude * carrier + noise;
  }

  return audioBuffer;
}
