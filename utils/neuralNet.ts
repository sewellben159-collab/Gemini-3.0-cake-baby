
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Lightweight Feedforward Neural Network for NeuroEvolution
// Simulating basic NEAT concepts (Topology is fixed for simplicity, Weights evolve)

export class SimpleBrain {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
  
  // Weights
  wInputHidden: Float32Array;
  wHiddenOutput: Float32Array;
  
  // Biases
  bHidden: Float32Array;
  bOutput: Float32Array;

  constructor(inputSize: number, hiddenSize: number, outputSize: number) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;
    
    this.wInputHidden = new Float32Array(inputSize * hiddenSize);
    this.wHiddenOutput = new Float32Array(hiddenSize * outputSize);
    this.bHidden = new Float32Array(hiddenSize);
    this.bOutput = new Float32Array(outputSize);
    
    this.randomize();
  }

  randomize() {
    for (let i = 0; i < this.wInputHidden.length; i++) this.wInputHidden[i] = (Math.random() * 2) - 1;
    for (let i = 0; i < this.wHiddenOutput.length; i++) this.wHiddenOutput[i] = (Math.random() * 2) - 1;
    for (let i = 0; i < this.bHidden.length; i++) this.bHidden[i] = (Math.random() * 2) - 1;
    for (let i = 0; i < this.bOutput.length; i++) this.bOutput[i] = (Math.random() * 2) - 1;
  }

  // Clone for reproduction
  clone(): SimpleBrain {
    const copy = new SimpleBrain(this.inputSize, this.hiddenSize, this.outputSize);
    copy.wInputHidden.set(this.wInputHidden);
    copy.wHiddenOutput.set(this.wHiddenOutput);
    copy.bHidden.set(this.bHidden);
    copy.bOutput.set(this.bOutput);
    return copy;
  }

  // DEAP-style Mutation
  mutate(rate: number, strength: number) {
    const mutateArr = (arr: Float32Array) => {
      for (let i = 0; i < arr.length; i++) {
        if (Math.random() < rate) {
          arr[i] += (Math.random() * 2 - 1) * strength;
          // Clamp to prevent explosion
          if (arr[i] > 4) arr[i] = 4;
          if (arr[i] < -4) arr[i] = -4;
        }
      }
    };

    mutateArr(this.wInputHidden);
    mutateArr(this.wHiddenOutput);
    mutateArr(this.bHidden);
    mutateArr(this.bOutput);
  }

  // Crossover (Uniform)
  static crossover(parentA: SimpleBrain, parentB: SimpleBrain): SimpleBrain {
    const child = new SimpleBrain(parentA.inputSize, parentA.hiddenSize, parentA.outputSize);
    
    const crossArr = (target: Float32Array, a: Float32Array, b: Float32Array) => {
      for (let i = 0; i < target.length; i++) {
        target[i] = Math.random() > 0.5 ? a[i] : b[i];
      }
    };

    crossArr(child.wInputHidden, parentA.wInputHidden, parentB.wInputHidden);
    crossArr(child.wHiddenOutput, parentA.wHiddenOutput, parentB.wHiddenOutput);
    crossArr(child.bHidden, parentA.bHidden, parentB.bHidden);
    crossArr(child.bOutput, parentA.bOutput, parentB.bOutput);
    
    return child;
  }

  // Forward Pass
  activate(inputs: number[]): number[] {
    if (inputs.length !== this.inputSize) return new Array(this.outputSize).fill(0);

    // Hidden Layer
    const hidden = new Float32Array(this.hiddenSize);
    for (let h = 0; h < this.hiddenSize; h++) {
      let sum = this.bHidden[h];
      for (let i = 0; i < this.inputSize; i++) {
        sum += inputs[i] * this.wInputHidden[i * this.hiddenSize + h];
      }
      // Tanh activation
      hidden[h] = Math.tanh(sum);
    }

    // Output Layer
    const output = new Array(this.outputSize);
    for (let o = 0; o < this.outputSize; o++) {
      let sum = this.bOutput[o];
      for (let h = 0; h < this.hiddenSize; h++) {
        sum += hidden[h] * this.wHiddenOutput[h * this.outputSize + o];
      }
      // Sigmoid for output (0-1)
      output[o] = 1 / (1 + Math.exp(-sum));
    }

    return output;
  }
}
