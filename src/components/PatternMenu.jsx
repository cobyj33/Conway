import React, { useRef } from 'react'
import "./patternmenu.css"
import { FaChevronCircleDown, FaPlusCircle } from "react-icons/fa";
import { DragSelect } from "./DragSelect";
import { useState } from 'react';

export const PatternMenu = ({ patterns, setPatterns, close }) => {
  const [position, setPosition] = useState({left: 100, top: 100});
  const menu = useRef()


  return (
    <div className="pattern-menu" style={position} ref={menu}>
      <DragSelect position={position} setPosition={setPosition} top parentRef={menu}>
        <button onClick={close}> <FaChevronCircleDown /> </button>
        <button > <FaPlusCircle /> </button>
      </DragSelect>

      <div className="pattern-area">
        
        { patterns.length == 0 ? "No Saved Patterns" : patterns.map(pattern => {
          <PatternDisplay pattern={pattern} patterns={patterns} setPatterns={setPatterns}/>
        }) }

      </div>


    </div>
  )
}

const PatternEditor = ({patterns, setPatterns}) => {



  return (
    <div className="pattern-editor">

    </div>
  )
}

const PatternDisplay = ({ pattern, patterns, setPatterns }) => {

  
  return (
    <div className="pattern-display">
      <button onClick={() => setPatterns(patterns.filter(pat => pat !== pattern))}> <FaChevronCircleDown /> </button>
      { pattern.name }
    </div>
  )
}
