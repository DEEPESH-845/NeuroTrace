/**
 * Mock for onnxruntime-react-native
 */

export class Tensor {
  data: Float32Array | Uint8Array | Int32Array;
  dims: number[];
  type: string;

  constructor(type: string, data: Float32Array | Uint8Array | Int32Array, dims: number[]) {
    this.type = type;
    this.data = data;
    this.dims = dims;
  }
}

export const InferenceSession = {
  create: jest.fn().mockResolvedValue({
    run: jest.fn().mockResolvedValue({
      output: new Tensor('float32', new Float32Array([0.5]), [1]),
    }),
  }),
};
