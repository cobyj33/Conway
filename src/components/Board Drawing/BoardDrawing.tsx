import React, { useEffect, useState, useRef } from 'react'
import { useLayoutEffect } from 'react';
import { MutableRefObject } from 'react';
import { View } from '../../classes/View';
import { gpu } from '../../functions/gpufunctions';
import { useResizeObserver } from '../../hooks/useResizeObserver';

export const BoardDrawing = ( { view, selections }: { view: View, selections: Selection[] } ) => {
    // const [drawnSelections, setDrawnSelections] = useState(selections);
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // const drawingLinesKernel = useRef( gpu.createKernel( function() {

    // } ).setDynamicOutput(true).setGraphical(true)  )

    // const drawingKernel = useRef( gpu.createKernel( function() {

    // }, ). )

    // useResizeObserver();

    // useEffect( () => {
      
    // });

  return (
    <canvas ref={canvasRef}> </canvas>
  )
}
