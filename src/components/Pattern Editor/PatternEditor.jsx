import { useContext, useMemo, useReducer, useState } from "react"
import { PatternContext } from "../../App"
import { Selection } from "../../classes/Selection";
import { Pattern } from "../../classes/Pattern";
import { BoardData } from "../../classes/BoardData";

import { boardReducer, getPatternView } from "../../functions"
import { GameBoard } from "../Game Board/GameBoard"
import "./patterneditor.css"

export const PatternEditor = ({ currentPattern, style, onSubmit, close }) => {
    const [savedPatterns, savedPatternsDispatch] = useContext(PatternContext)
    const [boardData, boardDataDispatch] = useReducer(boardReducer, new BoardData({ selections: currentPattern.selections.map(cell => Selection.clone(cell)) }))
    const [patternName, setPatternName] = useState(currentPattern.name)
    const [patternDescription, setPatternDescription] = useState(currentPattern.description)
    const initialBoardView = useMemo( () => getPatternView(currentPattern), [currentPattern])
    const getPatternData = () => { return { name: patternName, description: patternDescription, selections: boardData.selections } }
    
    function savePattern(patternData) {
      savedPatternsDispatch({ type: "add", pattern: new Pattern(patternData)})
    }
  
    return (
      <div className="pattern-editor" style={style}>
        <div className="board-container">
          <GameBoard boardData={boardData} boardDataDispatch={boardDataDispatch} closable={false} initialViewArea={initialBoardView}/>
        </div>

        <div className="input-area">
          <button onClick={() => close?.()}> Close Pattern Editor </button>
          <div className="flex-row">
              <span> Name </span>
              <input value={patternName} onChange={(event) => setPatternName(event.target.value)} />
          </div>

          <div className="flex-row">
              <span> Description </span>
              <input value={patternDescription} onChange={(event) => setPatternDescription(event.target.value)} />
          </div>

          <button onClick={() => { onSubmit == null ? savePattern(getPatternData()) : onSubmit(getPatternData()); close?.() } }> Submit</button>
        </div>
      </div>
    )
  }
  