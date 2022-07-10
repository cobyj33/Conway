import { GPU } from 'gpu.js'

export const gpu = new GPU();

// export const drawCanvas = gpu.createKernel( function(cellSize, selectedCells) {
// } ).setDynamicOutput(true).setGraphical(true).setOutput([100, 100]);