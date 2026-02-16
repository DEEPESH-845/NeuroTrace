/**
 * AI Module - Exports all on-device AI components
 * 
 * This module provides access to:
 * - Speech biomarker extraction (ONNX Runtime + Phi-3-Mini)
 * - Facial asymmetry detection (MediaPipe)
 * - ONNX Runtime management for speech processing
 * 
 * Requirements: 2.4, 2.5, 6.1, 6.2
 */

export type { ISpeechBiomarkerExtractor, SpeechBiomarkerConfig } from './SpeechBiomarkerExtractor';
export {
  ONNXSpeechBiomarkerExtractor,
  createSpeechBiomarkerExtractor,
  AudioProcessingError,
  SpeechBiomarkerExtractionError,
  DEFAULT_SPEECH_CONFIG,
} from './SpeechBiomarkerExtractor';

export type { IFacialAsymmetryDetector } from './FacialAsymmetryDetector';
export {
  MediaPipeFacialAsymmetryDetector,
  createFacialAsymmetryDetector,
  FaceNotVisibleError,
  MediaPipeInitializationError,
} from './FacialAsymmetryDetector';

export type { ONNXRuntimeManager, ONNXConfig } from './ONNXRuntimeManager';
export {
  ONNXRuntimeManagerImpl,
  getONNXRuntimeManager,
  createONNXRuntimeManager,
  ONNXInitializationError,
  ONNXInferenceError,
  DEFAULT_SPEECH_MODEL_CONFIG,
} from './ONNXRuntimeManager';
