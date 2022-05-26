import { useContext, useMemo, useReducer, useState } from "react"
import { PatternContext } from "../App"
import { Area, BoardData, Pattern, Selection } from "../classes"
import { boardReducer, getPatternView } from "../functions"
import { GameBoard } from "./GameBoard"
import "./patterneditor.css"

export const PatternEditor = ({ currentPattern, style, onSubmit, close }) => {
    const [savedPatterns, savedPatternsDispatch] = useContext(PatternContext)
    const [boardData, boardDataDispatch] = useReducer(boardReducer, new BoardData({ selections: currentPattern.selections.map(cell => Selection.clone(cell)) }))
    const [patternName, setPatternName] = useState(currentPattern.name)
    const [patternDescription, setPatternDescription] = useState(currentPattern.description)
    const initialBoardView = useMemo( () => getPatternView(currentPattern), [currentPattern])
    
    function savePattern() {
      savedPatternsDispatch({ type: "add", pattern: new Pattern({ name: patternName, description: patternDescription, selections: boardData.selections })})
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

          <button onClick={() => { onSubmit == null ? savePattern() : onSubmit(); close?.() } }> Submit</button>
        </div>
      </div>
    )
  }
  