import { GPU } from 'gpu.js'

export const gpu = new GPU();

export const drawCanvasLines = gpu.createKernel( function(cellSize, canvasSize) {
     
});

// export const drawCanvasCells = function(selections, canvas)

// export const drawCanvas = gpu.createKernel( function() )

export const drawCanvas = gpu.createKernel( function(cellSize, selectedCells) {
} ).setDynamicOutput(true).setGraphical(true).setOutput([100, 100]);
