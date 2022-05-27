import { useContext, useMemo, useReducer } from "react";
import { Area, BoardData, Selection } from "../classes";
import { boardReducer, getPatternView } from "../functions";
import { GameBoard } from "./GameBoard";
import { BoardContext, PatternContext } from "../App";
import { FaChevronCircleDown } from "react-icons/fa";
import { ToolTip } from "./ToolTip/ToolTip";
import "./creationmenu.css"

export const PatternDisplay = ({ pattern }) => {
    const [patterns, setPatterns] = useContext(PatternContext)
    const [gameBoards, gameBoardsDispatch] = useContext(BoardContext)
    const [boardData, boardDataDispatch] = useReducer(boardReducer, new BoardData( { selections: pattern.selections.map(cell => Selection.clone(cell)) } ));
    const initialBoardView = useMemo( () => getPatternView(pattern), [pattern])
    
    return (
      <div className="pattern-display">
        <div className='board-container'>
          <GameBoard boardData={boardData} boardDataDispatch={boardDataDispatch} closable={false} editable={false} showToolBar={false} initialViewArea={initialBoardView} /> 
        </div>
  
        <div className='pattern-display-information'> 
            <div className='pattern-display-main-data'>
            <span className="pattern-name pattern-data"> Name: {pattern.name} </span>
            <span className="pattern-count pattern-data"> Count: {pattern.count} </span>
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
            <button onClick={() => console.log(JSON.stringify(pattern))}> Log JSON </button>
            <button onClick={() => gameBoards.forEach( board => { 
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
