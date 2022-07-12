import { GPU } from "gpu.js";
import { RefObject, useEffect } from "react";

export function useCanvasGPU(canvasRef: RefObject<HTMLCanvasElement>): GPU {
    const canvasGPU: GPU = new GPU();
    

    useEffect( () => {
        if (canvasRef.current != null && canvasRef.current != undefined) {
            canvasGPU.canvas = canvasRef.current;
            canvasGPU.context = canvasRef.current.getContext('webgl2', {premultipliedAlpha: false});
        }
    } )

    return canvasGPU;
}