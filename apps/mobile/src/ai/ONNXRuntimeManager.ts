/**
 * ONNXRuntimeManager - Manages ONNX Runtime for on-device AI processing
 * 
 * This module initializes and manages ONNX Runtime for speech biomarker extraction
 * using Phi-3-Mini model. All processing is done on-device for privacy.
 * 
 * Requirements: 2.4, 6.1, 10.2
 */

import { InferenceSession, Tensor } from 'onnxruntime-react-native';

/**
 * Error thrown when ONNX Runtime initialization fails
 */
export class ONNXInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ONNXInitializationError';
  }
}

/**
 * Error thrown when model inference fails
 */
export class ONNXInferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ONNXInferenceError';
  }
}

/**
 * Configuration for ONNX Runtime
 */
export interface ONNXConfig {
  modelPath: string;
  executionProviders?: string[];
  graphOptimizationLevel?: 'disabled' | 'basic' | 'extended' | 'all';
}

/**
 * Interface for ONNX Runtime management
 */
export interface ONNXRuntimeManager {
  /**
   * Initialize ONNX Runtime with the specified model
   */
  initialize(config: ONNXConfig): Promise<void>;
  
  /**
   * Run inference on input data
   */
  runInference(inputTensor: Tensor): Promise<Tensor>;
  
  /**
   * Check if the runtime is initialized
   */
  isInitialized(): boolean;
  
  /**
   * Get the current model path
   */
  getModelPath(): string | null;
  
  /**
   * Clean up resources
   */
  dispose(): Promise<void>;
}

/**
 * Implementation of ONNX Runtime Manager
 */
export class ONNXRuntimeManagerImpl implements ONNXRuntimeManager {
  private session: InferenceSession | null = null;
  private modelPath: string | null = null;
  private initialized: boolean = false;

  /**
   * Initialize ONNX Runtime with the specified model
   */
  async initialize(config: ONNXConfig): Promise<void> {
    try {
      // Create inference session with optimization
      this.session = await InferenceSession.create(config.modelPath, {
        executionProviders: config.executionProviders || ['cpu'],
        graphOptimizationLevel: config.graphOptimizationLevel || 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
      });

      this.modelPath = config.modelPath;
      this.initialized = true;

      console.log(`ONNX Runtime initialized successfully with model: ${config.modelPath}`);
    } catch (error) {
      throw new ONNXInitializationError(
        `Failed to initialize ONNX Runtime: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Run inference on input data
   */
  async runInference(inputTensor: Tensor): Promise<Tensor> {
    if (!this.initialized || !this.session) {
      throw new ONNXInitializationError('ONNX Runtime not initialized. Call initialize() first.');
    }

    try {
      const startTime = Date.now();

      // Run inference
      const feeds: Record<string, Tensor> = {
        input: inputTensor,
      };
      const results = await this.session.run(feeds);

      const inferenceTime = Date.now() - startTime;
      console.log(`ONNX inference completed in ${inferenceTime}ms`);

      // Return the output tensor (assuming single output named 'output')
      const outputTensor = results.output || results[Object.keys(results)[0]];
      
      if (!outputTensor) {
        throw new ONNXInferenceError('No output tensor returned from model');
      }

      return outputTensor;
    } catch (error) {
      throw new ONNXInferenceError(
        `Inference failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if the runtime is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the current model path
   */
  getModelPath(): string | null {
    return this.modelPath;
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.session) {
      // ONNX Runtime React Native doesn't have explicit dispose method
      // Resources are cleaned up automatically
      this.session = null;
    }
    this.initialized = false;
    this.modelPath = null;
    console.log('ONNX Runtime disposed');
  }
}

/**
 * Singleton instance of ONNX Runtime Manager
 */
let onnxRuntimeInstance: ONNXRuntimeManager | null = null;

/**
 * Get or create the singleton ONNX Runtime Manager instance
 */
export function getONNXRuntimeManager(): ONNXRuntimeManager {
  if (!onnxRuntimeInstance) {
    onnxRuntimeInstance = new ONNXRuntimeManagerImpl();
  }
  return onnxRuntimeInstance;
}

/**
 * Factory function to create and initialize ONNX Runtime Manager
 */
export async function createONNXRuntimeManager(config: ONNXConfig): Promise<ONNXRuntimeManager> {
  const manager = new ONNXRuntimeManagerImpl();
  await manager.initialize(config);
  return manager;
}

/**
 * Default configuration for speech processing model
 * Note: Model path should be updated to point to actual Phi-3-Mini model location
 */
export const DEFAULT_SPEECH_MODEL_CONFIG: ONNXConfig = {
  modelPath: 'models/phi3-mini-speech.onnx', // Placeholder path
  executionProviders: ['cpu'], // Use CPU for now, can add GPU support later
  graphOptimizationLevel: 'all',
};
