import React, { useContext, useRef } from 'react'
import "./creationmenu.css"
import { FaPlusCircle, FaWindowClose } from "react-icons/fa";
import { useState } from 'react';
import { Area } from '../classes';
import { PatternContext, RenderContext } from '../App';
import { ToolTip } from './ToolTip/ToolTip';
import { PatternDisplay } from './PatternDisplay';
import { RenderDisplay } from './RenderDisplay';


export const CreationMenu = ({ close }) => {
  const [patterns, savedPatternsDispatch] = useContext(PatternContext)
  const renders = useContext(RenderContext)
  const [position, setPosition] = useState({left: 100, top: 100});
  const [currentMenu, setCurrentMenu] = useState('My Patterns');
  
  const menu = useRef()
  

  function getDisplayAreaContent() {
    switch (currentMenu) {
      case "My Renders":
        return renders.current.starters.length == 0 ? <span> No Saved Renders </span> : renders.current.starters.map(startingSelectionsJSON => <RenderDisplay key={startingSelectionsJSON} startingSelectionsJSON={startingSelectionsJSON}/>) 
      case "My Patterns":
        return patterns.length == 0 ? <span> No Saved Patterns </span> : patterns.map(pattern => <PatternDisplay key={pattern.id} pattern={pattern} />)
      default: return "Error: Invalid Menu"
    }
  }


  return (
    <div className="creation-menu" style={position} ref={menu}>
      {/* <DragSelect position={position} setPosition={setPosition} top parentRef={menu} style={{ position: "relative", height: "min(15%, 100px)" }}>
        <div onMouseEnter={() => setShowingMenuChoices(true)} onMouseLeave={() => setShowingMenuChoices(false)}>
            <h3> { currentMenu } </h3>
            { showingMenuChoices && 
            <div className="menu-choices">
              <button onClick={() => setCurrentMenu("My Patterns")}> My Patterns </button>
              <button onClick={() => setCurrentMenu("My Renders")}> My Renders </button>
            </div> }
        </div>
        <input className="pattern-search" type="text" />
        <button > <FaPlusCircle /> </button>
        <button onClick={close}> <FaWindowClose /> </button>
      </DragSelect> */}

      <div className="creation-menu-top-bar" >
        <div className='creation-menu-selections'>
            <div className="menu-choices">
              <button onClick={() => setCurrentMenu("My Patterns")}> My Patterns </button>
              <button onClick={() => setCurrentMenu("My Renders")}> My Renders </button>
            </div>
        </div>
        <div className="creation-menu-top-bar-options">
            <h3> { currentMenu } </h3>
            <input className="creation-search" type="text" />
            <button > <FaPlusCircle /> </button>
            <button onClick={close}> <FaWindowClose /> <ToolTip> To Game </ToolTip> </button>
        </div>
      </div>

      <div className="display-area">
          { getDisplayAreaContent() }
      </div>


    </div>
  )
}

const VIEW_PADDING = 5;

function getPatternBounds(pattern) {
  const viewArea = Area.corners(pattern.selections);
}

function getRenderBounds(render) {
  const topRight = new Selection(Math.min())
}