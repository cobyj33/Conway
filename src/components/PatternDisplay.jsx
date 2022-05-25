import { useContext, useReducer } from "react";
import { BoardData } from "../classes";
import { boardReducer } from "../functions";
import { GameBoard } from "./GameBoard";
import { BoardContext, PatternContext } from "../App";
import { FaChevronCircleDown } from "react-icons/fa";
import { ToolTip } from "./ToolTip/ToolTip";
import "./creationmenu.css"

export const PatternDisplay = ({ pattern }) => {
    const [patterns, setPatterns] = useContext(PatternContext)
    const [gameBoards, gameBoardsDispatch] = useContext(BoardContext)
    const [boardData, boardDataDispatch] = useReducer(boardReducer, new BoardData({selections: pattern.selections}));
    
    return (
      <div className="pattern-display">
        <div className='board-container'>
          <GameBoard boardData={boardData} dataDispatch={boardDataDispatch} closable={false} editable={false} showToolBar={false} /> 
        </div>
  
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
            <button onClick={() => gameBoards.forEach(board => { 
              gameBoardsDispatch({type: 'alter', id: board.id, request: { accessor: 'brush.type', newValue: 'pattern' }})
              gameBoardsDispatch({ type: "alter", id: board.id, request: { accessor: 'pattern', newValue: pattern } })} ) }> Select As Brush </button>
              <button onClick={() => setPatterns(patterns.filter(pat => JSON.stringify(pat) !== JSON.stringify(pattern)))}> Delete </button>
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
