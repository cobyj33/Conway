import React, { useContext, useReducer, useRef, useEffect } from 'react'
import "./patternmenu.css"
import { FaChevronCircleDown, FaPlusCircle, FaWindowClose } from "react-icons/fa";
import { useState } from 'react';
import { BoardData, Area } from '../classes';
import { BoardContext, PatternContext, RenderContext } from '../App';
import { boardReducer } from '../functions';
import { GameBoard } from './GameBoard';
import { ToolTip } from './ToolTip/ToolTip';
import { BoardSelector } from './BoardSelector';

// let patterns = [new Pattern({ selections: [{row: 0, col: 0}] })]

// fetch('./patterns.json')
// .then(response => response.json())
// .then(data => data.map(pattern => new Pattern({ selections: pattern })))
// .then(array => patterns = array)
// .catch(error => console.error(error))

export const PatternMenu = ({ close }) => {
  const [patterns, setPatterns] = useContext(PatternContext)
  const renders = useContext(RenderContext)
  const [position, setPosition] = useState({left: 100, top: 100});
  const [currentMenu, setCurrentMenu] = useState('My Patterns');
  
  const menu = useRef()
  

  function getDisplayAreaContent() {
    switch (currentMenu) {
      case "My Renders":
        return renders.current.length == 0 ? "No Saved Renders" : renders.current.starters.map(startingSelectionsJSON => <RenderDisplay key={startingSelectionsJSON} startingSelectionsJSON={startingSelectionsJSON}/>) 
      case "My Patterns":
        return patterns.length == 0 ? "No Saved Patterns" : patterns.map(pattern => <PatternDisplay key={pattern.id} pattern={pattern} />)
      default: return "Error: Invalid Menu"
    }
  }


  return (
    <div className="pattern-menu" style={position} ref={menu}>
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

      <div className="pattern-menu-top-bar" >
        <div className='pattern-menu-selections'>
            <div className="menu-choices">
              <button onClick={() => setCurrentMenu("My Patterns")}> My Patterns </button>
              <button onClick={() => setCurrentMenu("My Renders")}> My Renders </button>
            </div>
        </div>
        <div className="pattern-menu-top-bar-options">
            <h3> { currentMenu } </h3>
            <input className="pattern-search" type="text" />
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


const RenderDisplay = ({ startingSelectionsJSON }) => {


  const [boardData, boardDataDispatch] = useReducer(boardReducer, new BoardData({selections: JSON.parse(startingSelectionsJSON), }));
  const [gameBoards, gameBoardsDispatch] = useContext(BoardContext)
  const [showingBoardSelector, setShowingBoardSelector] = useState(false);
  const renders = useContext(RenderContext)

  function onBoardSelection(boardNum) {
    if (boardNum == -1) {
      gameBoardsDispatch({type: "add", boardData: boardData})
    } else {
      gameBoardsDispatch({type: "alter",
      id: gameBoards[boardNum].id,
      request: {
        accessor: "selections",
        newValue: JSON.parse(startingSelectionsJSON)
      }})
    }
  }


  const [generationCount, setGenerationCount] = useState(0);
  const [startingSelectionsLength, setStartingSelectionsLength] = useState(0)
  useEffect( () => {
    setGenerationCount(renders.current.generationCount(startingSelectionsJSON));
    setStartingSelectionsLength(JSON.parse(startingSelectionsJSON).length)
  }, [])

  return (
    <div className="render-display">
      <GameBoard boardData={boardData} dataDispatch={boardDataDispatch} closable={false} editable={false} showToolBar={false} drawGrid={false} />

      <div className='render-display-information'> 
        <span className='render-data'> # Of Generations: {generationCount} </span>
        <span className='render-data'> Starting Cell Count: {startingSelectionsLength} </span>  

        <button > Play </button>
        <button onClick={() => setShowingBoardSelector(!showingBoardSelector)}> Add to Main View </button>
      </div>

      { showingBoardSelector && <BoardSelector onSelection={onBoardSelection} onClose={() => setShowingBoardSelector(!showingBoardSelector) } /> } 
    </div>
  )
}


const PatternDisplay = ({ pattern }) => {
  const [patterns, setPatterns] = useContext(PatternContext)
  const [boardData, boardDataDispatch] = useReducer(boardReducer, new BoardData({selections: pattern.selections}));
  
  return (
    <div className="pattern-display">
      <GameBoard boardData={boardData} dataDispatch={boardDataDispatch} closable={false} editable={false} showToolBar={false}> </GameBoard>
      <button onClick={() => setPatterns(patterns.filter(pat => pat !== pattern))}> <FaChevronCircleDown /> </button>

      <div className='pattern-display-information'> 
        <div className='pattern-display-main-data'>
          <span className="pattern-name pattern-data"> Name: {pattern.name} </span>
          <span className="pattern-count pattern-data"> Count: {pattern.count} </span>
          {/* Count: { pattern.count } */}
        </div>
        <div className='pattern-display-meta-data'> 
          <span className="pattern-creator pattern-data"> Creator: {pattern.name} </span>
          <span className="pattern-date pattern-data"> Created: {pattern.dateCreated.toDateString()} </span>
          <span className="pattern-date pattern-data"> Last Modified: {pattern.lastModified.toDateString()} </span>
          <span className="pattern-description pattern-data"> Description: {pattern.description.substr(0, 20)} { pattern.description.length > 20 ? <ToolTip> {pattern.description} </ToolTip> : '' } </span>
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

const VIEW_PADDING = 5;

function getPatternBounds(pattern) {
  const viewArea = Area.corners(pattern.selections);
}

function getRenderBounds(render) {
  const topRight = new Selection(Math.min())
}