import { boardReducer } from "../functions";
import { BoardData } from "../classes";
import { useReducer, useContext, useState, useMemo, useEffect } from "react";
import { RenderContext, BoardContext } from "../App";
import { GameBoard } from "./GameBoard";
import { BoardSelector } from "./BoardSelector";
import { getRenderView } from "../functions";
import "./creationmenu.css"


export const RenderDisplay = ({ startingSelectionsJSON }) => {
    const [boardData, boardDataDispatch] = useReducer(boardReducer, new BoardData({selections: JSON.parse(startingSelectionsJSON), }));
    const [gameBoards, gameBoardsDispatch] = useContext(BoardContext)
    const [showingBoardSelector, setShowingBoardSelector] = useState(false);
    const renders = useContext(RenderContext)
  
    function onBoardSelection(boardNum) {
      if (boardNum == -1) {
        gameBoardsDispatch({type: "add", boardData: new BoardData(boardData)})
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
    const initialBoardDataView = useMemo(() => getRenderView(renders, startingSelectionsJSON), [startingSelectionsJSON])
    useEffect( () => {
      setGenerationCount(renders.current.generationCount(startingSelectionsJSON));
      setStartingSelectionsLength(JSON.parse(startingSelectionsJSON).length)
    }, [])
  
    return (
      <div className="render-display">
        <div className="board-container">
          <GameBoard boardData={boardData} dataDispatch={boardDataDispatch} closable={false} editable={false} showToolBar={false} initialViewArea={initialBoardDataView} />
        </div>
  
        <div className='render-display-information'> 
          <span className='render-data'> # Of Generations: {generationCount} </span>
          <span className='render-data'> Starting Cell Count: {startingSelectionsLength} </span>  
  
          <button > Play </button>
          <button onClick={() => setShowingBoardSelector(!showingBoardSelector)}> Add to Main View </button>
        </div>
  
        { showingBoardSelector && <BoardSelector onSelection={(num) => onBoardSelection(num)} onClose={() => setShowingBoardSelector(!showingBoardSelector)} /> }
      </div>
    )
  }