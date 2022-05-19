import React, { createContext, useEffect, useReducer, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import './app.css'
import { GameBoard } from './components/GameBoard'
import { FaMoon } from "react-icons/fa"
import { BoardData, Pattern } from './classes'
import { cloneDeep } from 'lodash'
import { PatternMenu } from './components/PatternMenu'
import { Alert } from './components/Alert'
import { nextLargestPerfectSquare, boardStatesReducer } from './functions'
import icon from "./assets/Conway Logo.png"
const patterns = require("./assets/patterns.json")
.map(patternData => new Pattern(patternData))

const nextID = 0;

//request: {accessor = "", newValue}

export const ThemeContext = createContext();
export const PatternContext = createContext();
export const BoardContext = createContext();
export const RenderContext = createContext();
export const App = () => {
    
    const [aboutMenu, setAboutMenu] = useState(false);
    const [showingPatternMenu, setShowingPatternMenu] = useState(false);
    const [boardDatas, dataDispatch] = useReducer(boardStatesReducer, [new BoardData()])
    const renders = useRef([]);
    const [savedPatterns, setSavedPatterns] = useState(patterns);
    const [theme, setTheme] = useState('')

    const numOfCols = Math.ceil(Math.sqrt(boardDatas.length))
    const numOfRows = (numOfCols - 1) + (boardDatas.length > nextLargestPerfectSquare(boardDatas.length) - Math.sqrt(nextLargestPerfectSquare(boardDatas.length)))

    const boardGrid = {
      gridTemplateColumns: `repeat(${numOfCols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${numOfRows}, minmax(0, 1fr))`
    }


  return (
      <ThemeContext.Provider value={[theme, setTheme]}>
        <BoardContext.Provider value={[boardDatas, dataDispatch]} >
          <PatternContext.Provider value={[savedPatterns, setSavedPatterns]} >
            
            <RenderContext.Provider value={renders}>
              <div className='game-area' style={boardGrid}> 
              {/* <Alert> This is a test </Alert> */}
                { boardDatas.map(data => 
                <GameBoard key={`Board ID ${data.id}`}
                boardData={data}
                dataDispatch={dataDispatch}
                />)}
              </div>
            </RenderContext.Provider>

            <Sidebar>
                <img src={icon} style={{width: "80%", aspectRatio: "2175 / 1025", display: 'inline-block'}} />
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

                <button className={`add-board-button`} onClick={() => dataDispatch({type: 'add'})}> Add Board </button>
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
            
            <RenderContext.Provider value={renders}>
              { showingPatternMenu && <PatternMenu patterns={savedPatterns} setPatterns={setSavedPatterns} close={() => setShowingPatternMenu(false)}/>}
            </RenderContext.Provider>
          </PatternContext.Provider>
        </BoardContext.Provider>
      </ThemeContext.Provider>
  )
}

export default App