import React, { useEffect, useState } from 'react'

export const BoardDrawing = ( { selections }) => {
    const [drawnSelections, setDrawnSelections] = useState(selections);
    const canvasRef = useRef()

    useEffect( () => {
        setDrawnSelections()
    }, [])

    useEffect( () => { drawnSelections() })


  return (
    <canvas ref={canvasRef}> 

    </canvas>
  )
}
