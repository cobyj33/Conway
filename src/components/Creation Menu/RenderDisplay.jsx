import { BoardData } from "../../classes/BoardData";
import { useReducer, useContext, useState, useMemo, useEffect, FC } from "react";
import { RenderContext, BoardContext } from "../../App";
import { GameBoard } from "../Game Board/GameBoard";
import { BoardSelector } from "../Board Selector/BoardSelector";
import { getPatternView, boardReducer } from "../../functions";
import { Selection } from "../../classes/Selection";
import "./creationmenu.css"



export const RenderDisplay = ({ startingSelectionsJSON }) => {
    const [boardData, boardDataDispatch] = useReducer(boardReducer, BoardData.FromSelections(JSON.parse(startingSelectionsJSON)));
    const [gameBoards, gameBoardsDispatch] = useContext(BoardContext)
    const [showingBoardSelector, setShowingBoardSelector] = useState(false);
    const renders = useContext(RenderContext)
  
    function onBoardSelection(boardNum) {
      if (boardNum == -1) {
        gameBoardsDispatch({type: "add", boardData: new BoardData(boardData)})
      } else {
        console.log("onBoardSelection ", boardNum);
        gameBoardsDispatch({type: "alter",
        id: gameBoards[boardNum].id,
        request: {
          accessor: "selections",
          newValue: JSON.parse(startingSelectionsJSON)
        }})
      }
    }
    
    console.log(`starting selection JSON: ${ startingSelectionsJSON }`);
    const [generationCount, setGenerationCount] = useState(0);
    const [startingSelectionsLength, setStartingSelectionsLength] = useState(0)
    const initialBoardDataView = useMemo(() => getPatternView( {selections: JSON.parse(startingSelectionsJSON).map(cell => new Selection(cell.row, cell.col))} ), [startingSelectionsJSON])
    useEffect( () => {
      setGenerationCount(renders.current.generationCount(startingSelectionsJSON));
      setStartingSelectionsLength(JSON.parse(startingSelectionsJSON).length)
    }, [])
  
    return (
      <div className="render-display">
        <div className="board-container">
          <GameBoard boardData={boardData} boardDataDispatch={boardDataDispatch} closable={false} editable={false} showToolBar={false} initialViewArea={initialBoardDataView} />
        </div>
  
        <div className='render-display-information'> 
          <span className='render-data'> # Of Generations: {generationCount} </span>
          <span className='render-data'> Starting Cell Count: {startingSelectionsLength} </span>  
  
          <button className={boardData.playback.enabled ? "selected" : ""} onClick={() => boardDataDispatch({type: "alter", request: { accessor: "playback.enabled", newValue: !boardData.playback.enabled}})} > Play </button>
          <button onClick={() => setShowingBoardSelector(!showingBoardSelector)}> Add to Main View </button>
          <button onClick={() => navigator.clipboard.writeText(JSON.stringify(renders.current.getRenderData(startingSelectionsJSON)))}> Copy JSON to Clipboard </button>
        </div>
  
        { showingBoardSelector && <BoardSelector onSelection={(num) => onBoardSelection(num)} onClose={() => setShowingBoardSelector(!showingBoardSelector)} /> }
      </div>
    )
  }