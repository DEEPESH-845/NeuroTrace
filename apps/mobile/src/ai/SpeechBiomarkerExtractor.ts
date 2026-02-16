/**
 * SpeechBiomarkerExtractor - Extracts speech biomarkers using ONNX Runtime
 * 
 * This module uses Phi-3-Mini model (3.8B parameters, quantized) to extract
 * speech biomarkers for neurological monitoring. All processing is done on-device
 * to maintain privacy.
 * 
 * Requirements: 2.4, 6.1, 10.2
 */

import { Tensor } from 'onnxruntime-react-native';
import { SpeechMetrics } from '@neurotrace/types';
import { getONNXRuntimeManager, ONNXRuntimeManager } from './ONNXRuntimeManager';

/**
 * Error thrown when audio processing fails
 */
export class AudioProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioProcessingError';
  }
}

/**
 * Error thrown when speech biomarker extraction fails
 */
export class SpeechBiomarkerExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpeechBiomarkerExtractionError';
  }
}

/**
 * Configuration for speech biomarker extraction
 */
export interface SpeechBiomarkerConfig {
  sampleRate: number; // Audio sample rate (typically 16000 Hz)
  minSpeechDuration: number; // Minimum speech duration in seconds
  pauseThreshold: number; // Silence threshold for pause detection (0-1)
  windowSize: number; // Analysis window size in samples
}

/**
 * Default configuration for speech processing
 */
export const DEFAULT_SPEECH_CONFIG: SpeechBiomarkerConfig = {
  sampleRate: 16000, // 16 kHz sample rate
  minSpeechDuration: 2, // Minimum 2 seconds of speech
  pauseThreshold: 0.02, // 2% of max amplitude
  windowSize: 512, // 32ms windows at 16kHz
};

/**
 * Interface for speech biomarker extraction
 */
export interface ISpeechBiomarkerExtractor {
  /**
   * Extract all speech biomarkers from audio buffer
   * @param audioBuffer Audio samples as Float32Array
   * @returns Promise resolving to SpeechMetrics
   * @throws {AudioProcessingError} When audio is invalid or too short
   * @throws {SpeechBiomarkerExtractionError} When extraction fails
   */
  extractBiomarkers(audioBuffer: Float32Array): Promise<SpeechMetrics>;
  
  /**
   * Compute articulation rate (words per minute)
   * @param audio Audio samples
   * @returns Words per minute
   */
  computeArticulationRate(audio: Float32Array): number;
  
  /**
   * Detect pause durations in milliseconds
   * @param audio Audio samples
   * @returns Array of pause durations
   */
  detectPauseDuration(audio: Float32Array): number[];
  
  /**
   * Analyze phonetic precision (0-1 score)
   * @param audio Audio samples
   * @returns Phonetic precision score
   */
  analyzePhoneticPrecision(audio: Float32Array): number;
}

/**
 * ONNX-based implementation of SpeechBiomarkerExtractor
 */
export class ONNXSpeechBiomarkerExtractor implements ISpeechBiomarkerExtractor {
  private onnxManager: ONNXRuntimeManager;
  private config: SpeechBiomarkerConfig;

  constructor(
    onnxManager: ONNXRuntimeManager = getONNXRuntimeManager(),
    config: SpeechBiomarkerConfig = DEFAULT_SPEECH_CONFIG
  ) {
    this.onnxManager = onnxManager;
    this.config = config;
  }

  /**
   * Extract all speech biomarkers from audio buffer
   */
  async extractBiomarkers(audioBuffer: Float32Array): Promise<SpeechMetrics> {
    // Validate audio buffer
    this.validateAudioBuffer(audioBuffer);

    const startTime = Date.now();

    try {
      // Extract individual biomarkers
      const articulationRate = this.computeArticulationRate(audioBuffer);
      const pauseDurations = this.detectPauseDuration(audioBuffer);
      const phoneticPrecision = this.analyzePhoneticPrecision(audioBuffer);
      const voiceQuality = await this.analyzeVoiceQuality(audioBuffer);

      // Calculate pause statistics
      const meanPauseDuration = pauseDurations.length > 0
        ? pauseDurations.reduce((sum, d) => sum + d, 0) / pauseDurations.length
        : 0;

      const pauseFrequency = this.calculatePauseFrequency(pauseDurations, audioBuffer.length);

      const processingTime = Date.now() - startTime;
      console.log(`Speech biomarker extraction completed in ${processingTime}ms`);

      // Ensure processing time is under 5 seconds (Requirement 10.2)
      if (processingTime > 5000) {
        console.warn(`Speech processing took ${processingTime}ms, exceeding 5s target`);
      }

      return {
        articulationRate,
        meanPauseDuration,
        pauseFrequency,
        phoneticPrecision,
        voiceQuality,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new SpeechBiomarkerExtractionError(
        `Failed to extract speech biomarkers: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compute articulation rate (words per minute)
   * 
   * Uses energy-based syllable detection as a proxy for word counting.
   * Typical ratio: ~1.5 syllables per word in English.
   */
  computeArticulationRate(audio: Float32Array): number {
    // Calculate audio duration in minutes
    const durationMinutes = audio.length / this.config.sampleRate / 60;

    if (durationMinutes === 0) {
      return 0;
    }

    // Detect syllables using energy peaks
    const syllableCount = this.detectSyllables(audio);

    // Convert syllables to words (approximate ratio: 1.5 syllables per word)
    const wordCount = syllableCount / 1.5;

    // Calculate words per minute
    const wordsPerMinute = wordCount / durationMinutes;

    return Math.round(wordsPerMinute);
  }

  /**
   * Detect pause durations in milliseconds
   * 
   * Identifies silent segments where amplitude falls below threshold
   * for a sustained period.
   */
  detectPauseDuration(audio: Float32Array): number[] {
    const pauseDurations: number[] = [];
    const threshold = this.config.pauseThreshold;
    const minPauseSamples = Math.floor(this.config.sampleRate * 0.15); // 150ms minimum pause

    let inPause = false;
    let pauseStartSample = 0;

    for (let i = 0; i < audio.length; i++) {
      const amplitude = Math.abs(audio[i]);

      if (amplitude < threshold) {
        if (!inPause) {
          // Start of pause
          inPause = true;
          pauseStartSample = i;
        }
      } else {
        if (inPause) {
          // End of pause
          const pauseLengthSamples = i - pauseStartSample;

          // Only count pauses longer than minimum duration
          if (pauseLengthSamples >= minPauseSamples) {
            const pauseDurationMs = (pauseLengthSamples / this.config.sampleRate) * 1000;
            pauseDurations.push(pauseDurationMs);
          }

          inPause = false;
        }
      }
    }

    // Handle pause extending to end of audio
    if (inPause) {
      const pauseLengthSamples = audio.length - pauseStartSample;
      if (pauseLengthSamples >= minPauseSamples) {
        const pauseDurationMs = (pauseLengthSamples / this.config.sampleRate) * 1000;
        pauseDurations.push(pauseDurationMs);
      }
    }

    return pauseDurations;
  }

  /**
   * Analyze phonetic precision (0-1 score)
   * 
   * Measures speech clarity using spectral features and formant stability.
   * Higher scores indicate clearer, more precise articulation.
   */
  analyzePhoneticPrecision(audio: Float32Array): number {
    // Calculate spectral centroid (brightness of sound)
    const spectralCentroid = this.calculateSpectralCentroid(audio);

    // Calculate zero-crossing rate (measure of noisiness)
    const zeroCrossingRate = this.calculateZeroCrossingRate(audio);

    // Calculate spectral flatness (measure of tonality)
    const spectralFlatness = this.calculateSpectralFlatness(audio);

    // Combine features into precision score
    // Higher spectral centroid = clearer speech
    // Lower zero-crossing rate = less noise
    // Lower spectral flatness = more tonal (better articulation)
    
    const centroidScore = Math.min(1, spectralCentroid / 4000); // Normalize to 0-1
    const zcScore = Math.max(0, 1 - zeroCrossingRate / 0.5); // Invert and normalize
    const flatnessScore = Math.max(0, 1 - spectralFlatness); // Invert

    // Weighted combination
    const precisionScore = (centroidScore * 0.4) + (zcScore * 0.3) + (flatnessScore * 0.3);

    return Math.min(1, Math.max(0, precisionScore));
  }

  /**
   * Analyze voice quality using ONNX model (0-1 score)
   * 
   * Uses Phi-3-Mini model to assess overall voice quality including
   * stability, clarity, and naturalness.
   */
  private async analyzeVoiceQuality(audio: Float32Array): Promise<number> {
    if (!this.onnxManager.isInitialized()) {
      // If ONNX not initialized, fall back to simple quality metric
      console.warn('ONNX Runtime not initialized, using fallback voice quality metric');
      return this.calculateFallbackVoiceQuality(audio);
    }

    try {
      // Prepare input tensor for ONNX model
      // Note: Actual preprocessing depends on Phi-3-Mini model requirements
      const inputTensor = this.prepareAudioTensor(audio);

      // Run inference
      const outputTensor = await this.onnxManager.runInference(inputTensor);

      // Extract quality score from output
      // Note: Actual output format depends on model
      const qualityScore = this.extractQualityScore(outputTensor);

      return Math.min(1, Math.max(0, qualityScore));
    } catch (error) {
      console.warn('ONNX inference failed, using fallback voice quality metric:', error);
      return this.calculateFallbackVoiceQuality(audio);
    }
  }

  /**
   * Validate audio buffer meets minimum requirements
   */
  private validateAudioBuffer(audioBuffer: Float32Array): void {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new AudioProcessingError('Audio buffer is empty');
    }

    const durationSeconds = audioBuffer.length / this.config.sampleRate;
    if (durationSeconds < this.config.minSpeechDuration) {
      throw new AudioProcessingError(
        `Audio too short: ${durationSeconds.toFixed(1)}s (minimum ${this.config.minSpeechDuration}s required)`
      );
    }

    // Check if audio contains any signal (not all zeros)
    const hasSignal = audioBuffer.some(sample => Math.abs(sample) > 0.001);
    if (!hasSignal) {
      throw new AudioProcessingError('Audio buffer contains no signal');
    }
  }

  /**
   * Detect syllables using energy-based peak detection
   */
  private detectSyllables(audio: Float32Array): number {
    const windowSize = this.config.windowSize;
    const hopSize = windowSize / 2;
    const energyThreshold = 0.01;

    let syllableCount = 0;
    let inSyllable = false;

    for (let i = 0; i < audio.length - windowSize; i += hopSize) {
      // Calculate energy in current window
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += audio[i + j] * audio[i + j];
      }
      energy /= windowSize;

      if (energy > energyThreshold) {
        if (!inSyllable) {
          syllableCount++;
          inSyllable = true;
        }
      } else {
        inSyllable = false;
      }
    }

    return syllableCount;
  }

  /**
   * Calculate pause frequency (pauses per minute)
   */
  private calculatePauseFrequency(pauseDurations: number[], audioLength: number): number {
    const durationMinutes = audioLength / this.config.sampleRate / 60;
    if (durationMinutes === 0) {
      return 0;
    }
    return pauseDurations.length / durationMinutes;
  }

  /**
   * Calculate spectral centroid (brightness measure)
   */
  private calculateSpectralCentroid(audio: Float32Array): number {
    // Simplified spectral centroid calculation
    // In production, would use FFT for accurate frequency analysis
    let weightedSum = 0;
    let sum = 0;

    for (let i = 0; i < audio.length; i++) {
      const magnitude = Math.abs(audio[i]);
      weightedSum += i * magnitude;
      sum += magnitude;
    }

    if (sum === 0) return 0;

    // Convert to approximate frequency
    const centroid = (weightedSum / sum) * (this.config.sampleRate / audio.length);
    return centroid;
  }

  /**
   * Calculate zero-crossing rate (noisiness measure)
   */
  private calculateZeroCrossingRate(audio: Float32Array): number {
    let crossings = 0;

    for (let i = 1; i < audio.length; i++) {
      if ((audio[i] >= 0 && audio[i - 1] < 0) || (audio[i] < 0 && audio[i - 1] >= 0)) {
        crossings++;
      }
    }

    return crossings / audio.length;
  }

  /**
   * Calculate spectral flatness (tonality measure)
   */
  private calculateSpectralFlatness(audio: Float32Array): number {
    // Simplified spectral flatness
    // Ratio of geometric mean to arithmetic mean of power spectrum
    let geometricMean = 1;
    let arithmeticMean = 0;
    const epsilon = 1e-10;

    for (let i = 0; i < audio.length; i++) {
      const power = audio[i] * audio[i] + epsilon;
      geometricMean *= Math.pow(power, 1 / audio.length);
      arithmeticMean += power;
    }

    arithmeticMean /= audio.length;

    if (arithmeticMean === 0) return 0;

    return geometricMean / arithmeticMean;
  }

  /**
   * Fallback voice quality calculation (when ONNX unavailable)
   */
  private calculateFallbackVoiceQuality(audio: Float32Array): number {
    // Calculate signal-to-noise ratio as proxy for quality
    const signal = this.calculateRMS(audio);
    const noise = this.estimateNoise(audio);

    if (noise === 0) return 1.0;

    const snr = signal / noise;
    const qualityScore = Math.min(1, snr / 10); // Normalize to 0-1

    return qualityScore;
  }

  /**
   * Calculate RMS (root mean square) of audio signal
   */
  private calculateRMS(audio: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audio.length; i++) {
      sum += audio[i] * audio[i];
    }
    return Math.sqrt(sum / audio.length);
  }

  /**
   * Estimate noise level in audio
   */
  private estimateNoise(audio: Float32Array): number {
    // Use minimum energy windows as noise estimate
    const windowSize = this.config.windowSize;
    const energies: number[] = [];

    for (let i = 0; i < audio.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += audio[i + j] * audio[i + j];
      }
      energies.push(energy / windowSize);
    }

    // Sort and take 10th percentile as noise estimate
    energies.sort((a, b) => a - b);
    const noiseIndex = Math.floor(energies.length * 0.1);
    return Math.sqrt(energies[noiseIndex] || 0);
  }

  /**
   * Prepare audio tensor for ONNX model input
   */
  private prepareAudioTensor(audio: Float32Array): Tensor {
    // Note: Actual preprocessing depends on Phi-3-Mini model requirements
    // This is a placeholder implementation
    
    // For now, create a simple tensor from audio data
    // In production, would include proper feature extraction (MFCC, mel-spectrogram, etc.)
    const dims = [1, audio.length]; // Batch size 1, sequence length
    
    return new Tensor('float32', audio, dims);
  }

  /**
   * Extract quality score from ONNX model output
   */
  private extractQualityScore(outputTensor: Tensor): number {
    // Note: Actual extraction depends on model output format
    // This is a placeholder implementation
    
    const data = outputTensor.data as Float32Array;
    
    // Assume model outputs a single quality score
    if (data.length > 0) {
      return data[0];
    }
    
    return 0.5; // Default middle score
  }
}

/**
 * Factory function to create a SpeechBiomarkerExtractor
 */
export function createSpeechBiomarkerExtractor(
  config?: Partial<SpeechBiomarkerConfig>
): ISpeechBiomarkerExtractor {
  const fullConfig = { ...DEFAULT_SPEECH_CONFIG, ...config };
  return new ONNXSpeechBiomarkerExtractor(getONNXRuntimeManager(), fullConfig);
}
