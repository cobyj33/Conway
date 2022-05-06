import React, { createContext, useEffect, useReducer, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import './app.css'
import { GameBoard } from './components/GameBoard'
import { FaMoon } from "react-icons/fa"
import { BoardData, Pattern } from './classes'
import { cloneDeep } from 'lodash'
import { PatternMenu } from './components/PatternMenu'
import { Alert } from './components/Alert'

const GlobalState = createContext(null)
const nextID = 0;

//request: {accessor = "", newValue}


function boardReducer(state, action) {
  const {type, id, request} = action;
  const chosenBoard = state.filter(board => board.id === id)?.[0];
  const newBoard = cloneDeep(chosenBoard);
  switch (type) {
    case "remove":
      if (!id) {
        console.log("cannot remove a board with no id");
        return state;
      }

      return state.filter(board => board.id !== id)
    case "add":
      return state.concat(new BoardData())
    case "alter":
      if (!chosenBoard) return state
        const {accessor = "", newValue} = request
        const keys = accessor.split('.')
        if (keys.length == 0 || !("newValue" in request) || !chosenBoard) return state
    
        
        let currentProperty = newBoard
        while (keys.length > 1) {
            const key = keys.shift()
            if (`${key}` in currentProperty) {
                currentProperty = currentProperty[key] 
            } else {
                console.log("key ", key, " does not exist in board ", newBoard.id)
                return state;
            }
        }

        
        const finalKey = keys.pop()
        console.log('final key: ', finalKey)
    
        if (`${finalKey}` in currentProperty) {
            currentProperty[finalKey] = newValue
        } else {
            console.log("key ", finalKey, " does not exist in ", chosenBoard)
              return state;
        }
      return state.filter(board => board.id !== id).concat(newBoard).sort((first, second) => first.id - second.id)
      case "set state":
        if (!id) {
          console.log("no valid id");
          return state;
        }

        const { newState } = action;
        return state.filter(board => board.id !== id).concat(newState);
    default:
      console.log("No valid selected dispatch type: ", type)
      return state
    }
}


const themeContext = createContext();
const patternContext = createContext();
const boardContext = createContext();
export const App = () => {
    
    const [aboutMenu, setAboutMenu] = useState(false);
    const [showingPatternMenu, setShowingPatternMenu] = useState(false);
    const [boardDatas, boardDatasDispatch] = useReducer(boardReducer, [new BoardData()])
    const [savedPatterns, setSavedPatterns] = useState([]);
    const [theme, setTheme] = useState('')

    const globalState = {
        theme: theme
    }
    


  return (
      <GlobalState.Provider value={globalState}>

      <div className='game-area'> 
      {/* <Alert> This is a test </Alert> */}
        { boardDatas.map(data => 
        <GameBoard key={`Board ID ${data.id}`}
        boardData={data}
        boardDatasDispatch={boardDatasDispatch}
        />)}
      </div>

        <Sidebar>
            <div> Conway's Game Of Life <br /> Made By: Jacoby Johnson </div>
            {/* <button className={`examples-button ${examplesMenu ? 'opened' : ''}`} onClick={() => setExamplesMenu(!examplesMenu)}> Examples </button>
            { examplesMenu && <div className='examples'>
              Examples
              </div> }

            <button className={`settings-button ${settingsMenu ? 'opened' : ''}`} onClick={() => setSettingsMenu(!settingsMenu)}> Settings </button>
            { settingsMenu && <div className='settings'>
                <div className="flex-column">
                    <button onClick={() => theme != 'dark' ? setTheme('dark') : setTheme('')} className={theme == 'dark' ? 'on' : ''}> <FaMoon /> Dark Mode <FaMoon /> </button>
                </div>

              </div>} */}

            <button className={`add-board-button`} onClick={() => boardDatasDispatch({type: 'add'})}> Add Board </button>
            <button className={`pattern-button ${showingPatternMenu ? 'opened' : ''}`} onClick={() => setShowingPatternMenu(!showingPatternMenu)}> Pattern Menu </button>

            <button className={`about-button ${aboutMenu ? 'opened' : ''}`} onClick={() => setAboutMenu(!aboutMenu)}> About </button>
            { aboutMenu && <div className='about'>
                Rules: <br/><br/>
                Any live cell with two or three live neighbors survives. <br/><br/>

                Any dead cell with three live neighbors becomes a live cell.<br/><br/>

                Be Creative!
              </div>}

            <a href="https://www.github.com/cobyj33/Conway" target="_blank"> <button> Project Link </button> </a>
            <a href="https://www.github.com/cobyj33/" target="_blank"> <button> Other Creations </button> </a>
        </Sidebar>

        { showingPatternMenu && <PatternMenu patterns={savedPatterns} setPatterns={setSavedPatterns} close={() => setShowingPatternMenu(false)}/>}
      </GlobalState.Provider>
  )
}

export default App