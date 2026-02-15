// Federated learning interfaces

// Model gradients
export interface ModelGradients {
  deviceId: string;
  modelVersion: string;
  gradients: Float32Array;
  sampleCount: number;
  timestamp: Date;
}

// Global model
export interface GlobalModel {
  modelVersion: string;
  weights: Float32Array;
  accuracy: number;
  createdAt: Date;
}

// Federated learning coordinator interface
export interface FederatedLearningCoordinator {
  collectGradients(deviceId: string, gradients: ModelGradients): Promise<void>;
  aggregateGradients(gradients: ModelGradients[]): Promise<GlobalModel>;
  validatePrivacy(gradients: ModelGradients): boolean;
  distributeModel(model: GlobalModel): Promise<void>;
}
