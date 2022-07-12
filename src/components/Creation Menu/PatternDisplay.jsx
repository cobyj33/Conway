import { useContext, useMemo, useReducer, useState } from "react";

import { Selection } from "../../classes/Selection";
import { Pattern } from "../../classes/Pattern";
import { BoardData } from "../../classes/BoardData";

import { boardReducer, getPatternView } from "../../functions";
import { GameBoard } from "../Game Board/GameBoard";
import { BoardContext, PatternContext } from "../../App";
import { FaChevronCircleDown } from "react-icons/fa";
import { ToolTip } from "../ToolTip/ToolTip";
import "./creationmenu.css"
import { PatternEditor } from "../Pattern Editor/PatternEditor";
import { cloneDeep } from "lodash";

const SHORT_DESCRIPTION_LENGTH = 20;

export const PatternDisplay = ({ currentPattern }) => {
    const [patterns, setPatterns] = useContext(PatternContext)
    const [gameBoards, gameBoardsDispatch] = useContext(BoardContext)
    const [boardData, boardDataDispatch] = useReducer(boardReducer, BoardData.FromSelections(currentPattern.selections.map(cell => Selection.clone(cell))));
    const [showingPatternEditor, setShowingPatternEditor] = useState(false);
    console.log(JSON.stringify(currentPattern));
    const initialBoardView = useMemo( () => getPatternView(JSON.parse(JSON.stringify(currentPattern))), [currentPattern])
    
    return (
      <div className="pattern-display">
        <div className='board-container'>
          <GameBoard boardData={boardData} boardDataDispatch={boardDataDispatch} closable={false} editable={false} showToolBar={false} initialViewArea={initialBoardView} alwaysCenter={true} /> 
        </div>
  
        <div className='pattern-display-information'> 
          <div className='pattern-display-main-data'>
            <span className="pattern-name pattern-data" style={{marginRight: "10px"}}> Name: {currentPattern.name} </span>
            <span className="pattern-count pattern-data"> Count: {currentPattern.count} </span>
          </div>

          <div className='pattern-display-meta-data'> 
            <span className="pattern-description pattern-data"> Description: {currentPattern.description.substr(0, SHORT_DESCRIPTION_LENGTH) + (currentPattern.description.length > SHORT_DESCRIPTION_LENGTH ? "..." : "" ) } { currentPattern.description.length > SHORT_DESCRIPTION_LENGTH ? <ToolTip> {currentPattern.description} </ToolTip> : '' } </span>
          </div>
  
          <div className='pattern-display-interact'>
            <button className={showingPatternEditor ? "selected" : ""} onClick={ () => setShowingPatternEditor(!showingPatternEditor) }> Edit </button>
            <button className={boardData.playback.enabled ? "selected" : ""} onClick={() => boardDataDispatch({type: 'alter', request: { accessor: "playback.enabled", newValue: !boardData.playback.enabled} })}> Preview </button>
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(currentPattern))}> Copy JSON to Clipboard </button>
            <button className={gameBoards.forEach(board => JSON.stringify(board.pattern.selections) === JSON.stringify(currentPattern.selections)) ? "selected" : ""} onClick={() => gameBoards.forEach( board => { 
              gameBoardsDispatch({type: 'alter', id: board.id, request: { accessor: 'brush.type', newValue: 'pattern' }})
              gameBoardsDispatch({ type: "alter", id: board.id, request: { accessor: 'pattern', newValue: cloneDeep(currentPattern) } })} ) }> Select As Brush </button>
              <button className="pattern-delete-button" onClick={() => setPatterns(patterns.filter(pattern => JSON.stringify(pattern) !== JSON.stringify(currentPattern)))}> Delete </button>
          </div>
        </div>

        { showingPatternEditor && <PatternEditor currentPattern={cloneDeep(currentPattern)} onSubmit={(patternData) => setPatterns({ type: 'replace', oldPattern: currentPattern, newPattern: new Pattern(patternData) }) } close={() => setShowingPatternEditor(false)} style={{position: 'fixed', zIndex: 10000}} /> } 
      </div>
    )
  }
