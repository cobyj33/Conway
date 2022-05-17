import React, { useContext, useReducer, useRef } from 'react'
import "./patternmenu.css"
import { FaChevronCircleDown, FaPlusCircle, FaWindowClose } from "react-icons/fa";
import { DragSelect } from "./DragSelect";
import { useState } from 'react';
import { BoardData, Pattern } from '../classes';
import { PatternContext } from '../App';
import { DynamicText } from "./DynamicText"
import { boardReducer } from '../functions';
import { GameBoard } from './GameBoard';
import { ToolTip } from './ToolTip/ToolTip';

// let patterns = [new Pattern({ selections: [{row: 0, col: 0}] })]

// fetch('./patterns.json')
// .then(response => response.json())
// .then(data => data.map(pattern => new Pattern({ selections: pattern })))
// .then(array => patterns = array)
// .catch(error => console.error(error))

export const PatternMenu = ({ close }) => {
  const [patterns, setPatterns] = useContext(PatternContext)
  const [position, setPosition] = useState({left: 100, top: 100});
  const [currentMenu, setCurrentMenu] = useState('My Patterns');
  
  const menu = useRef()


  const [showingMenuChoices, setShowingMenuChoices] = useState(false)
  return (
    <div className="pattern-menu" style={position} ref={menu}>
      <DragSelect position={position} setPosition={setPosition} top parentRef={menu} style={{ position: "relative", height: "min(15%, 100px)" }}>
        <DynamicText text="Patterns" />
        <input className="pattern-search" type="text" />
        <button > <FaPlusCircle /> </button>
        <div>
          <button> View: {currentMenu} <FaChevronCircleDown /> </button>
          { showingMenuChoices && 
            <div className="pattern-menu-choices">
              <button> Local </button>
              <button> Online </button>
              <button> Edit </button>
            </div>}
        </div>
        <button onClick={close}> <FaWindowClose /> </button>
      </DragSelect>

      <div className="pattern-area">
        
        { patterns.length == 0 ? "No Saved Patterns" : patterns.map(pattern => <PatternDisplay key={pattern.id} pattern={pattern}/>) }

      </div>


    </div>
  )
}
const PatternDisplay = ({ pattern }) => {
  const [patterns, setPatterns] = useContext(PatternContext)
  const [boardData, boardDataDispatch] = useReducer(boardReducer, [new BoardData({selections: pattern.selections})]);
  
  return (
    <div className="pattern-display">
      <GameBoard boardData={boardData[0]} boardDatasDispatch={boardDataDispatch} closable={false}> </GameBoard>
      <button onClick={() => setPatterns(patterns.filter(pat => pat !== pattern))}> <FaChevronCircleDown /> </button>

      <div className='pattern-display-information'> 
        <div className='pattern-display-main-data'>
          <DynamicText text={`Name: ${pattern.name}`} />
          <DynamicText text={`Count: ${pattern.count}`} />
          {/* Count: { pattern.count } */}
        </div>
        <div className='pattern-display-meta-data'> 
          Creator: {pattern.name}
          Created: {pattern.dateCreated.toDateString()}
          Last Modified: {pattern.lastModified.toDateString()}
          <span> Description: {pattern.description.substr(0, 20)} { pattern.description.length > 20 ? <ToolTip> {pattern.description} </ToolTip> : '' } </span>
        </div>

        <div className='pattern-display-interact'>
          <button> Edit </button>
          <button> Preview </button>
          <button> Select As Brush </button>
        </div>

        <div className="pattern-display-social">
          <button> Like </button>
          <button> Save </button>
          <button> Share </button>
        </div>
      </div>
    </div>
  )
}


const PatternEditor = () => {
  const [patterns, setPatterns] = useContext(PatternContext)


  return (
    <div className="pattern-editor">

    </div>
  )
}

