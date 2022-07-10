import React, { useEffect, useRef, useState } from 'react'
import "./dynamictext.css"

export const DynamicText = ({lines: desiredLines, children, text}) => {
    const [scale, setScale] = useState(1)
    const svgElement = useRef(null)
    const container = useRef()
    const textElement = useRef()
    const lines = desiredLines && desiredLines != 0 ? desiredLines : 1;

    function fitText() {
      if (textElement?.current == null || container?.current == null) return
      const bbox = textElement.current.getBBox();
      const textBoxSize = container.current.getBoundingClientRect();
      
      const desiredScale = Math.min(textBoxSize.width / bbox.width, textBoxSize.height / bbox.height);
      if (scale !== desiredScale) {
        setScale(desiredScale)
      }
    }


    const observer = useRef(new ResizeObserver(fitText))
    useEffect(() => {
      fitText()
      observer.current.observe(container.current)

      return () => observer.current.disconnect();
    }, [])

    //default 0 0 56 18 viewbox
    

  return (
    <div className="dynamic-textbox" ref={container}>
      { children }
      <svg className='dynamic-textbox-svg' ref={svgElement} viewBox={`0 0 108 36`}> 
          <text transform={`scale(${scale}, ${scale})`} x="0" y="0" dominantBaseline="middle" textAnchor="middle" width='56' height='18' color='white' ref={textElement}> { text } </text>
      </svg>
    </div>
  )
}
