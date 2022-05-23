import React, { createContext, useReducer, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import './app.css'
import { GameBoard } from './components/GameBoard'
import { BoardData, Pattern, Selection } from './classes'
import { PatternMenu } from './components/PatternMenu'
import { boardStatesReducer, getBoardGridStyle, selectionListToString, getNextGeneration} from './functions'
import icon from "./assets/Conway Logo.png"
const patterns = require("./assets/patterns.json")
.map(patternData => new Pattern(patternData))

const nextID = 0;

//request: {accessor = "", newValue}

export const ThemeContext = createContext();
export const PatternContext = createContext();
export const BoardContext = createContext();
export const RenderContext = createContext();

export let AFK = false;
const TIME_TO_AFK_MODE = 1000;
let lastInput = Date.now();

function onInput() {
  lastInput = Date.now();
  setTimeout(() => { AFK = Date.now() - lastInput > TIME_TO_AFK_MODE; console.log("is AFK: ", AFK) } , TIME_TO_AFK_MODE + 500)
}

window.addEventListener("mouseup", onInput)
window.addEventListener("mousedown", onInput)
window.addEventListener("keydown", onInput)
window.addEventListener("keyup", onInput)

export const App = () => {
    
    const [aboutMenu, setAboutMenu] = useState(false);
    // const [showingPatternMenu, setShowingPatternMenu] = useState(false);
    const [boardDatas, dataDispatch] = useReducer(boardStatesReducer, [new BoardData()])
    const renders = useRef({
      starters: [],
      frames: {

      },

      isCycled(startingSelectionsJSON) {
        let currentString = startingSelectionsJSON
        const passedThrough = new Set([])

        while (!passedThrough.has(currentString) && ( currentString in this.frames ) ) {
          passedThrough.add(currentString)
          currentString = this.frames[currentString]
        }

        return passedThrough.has(currentString)
      },

      generationCount(startingSelectionsJSON) {
        let count = 0;
        let currentString = startingSelectionsJSON
        const passedThrough = new Set([])

        while (!passedThrough.has(currentString) && ( currentString in this.frames ) ) {
          passedThrough.add(currentString)
          currentString = this.frames[currentString]
          count++;
        }

        if (passedThrough.has(currentString))
          return Infinity;
        return count;
      },

      render(startingSelectionsJSON, generations = 0) {
        console.log("generations: ", generations)
        if (generations <= 0) {
          console.error("[App.render()] cannot render " + generations + " generations");
          return
        }
        
        let currentString = startingSelectionsJSON
        if (this.starters.some(selListString => selListString === currentString)) {
          console.log("already rendered");
        }
        let currentGeneration = 0;
        this.starters.push(startingSelectionsJSON)

        while ( currentGeneration <= generations && !( currentString in this.frames) ) {
          this.frames[currentString] = JSON.stringify( (getNextGeneration(JSON.parse(currentString)) ) )
          currentString = this.frames[currentString]
          currentGeneration++
          this.status.percentage = Math.round( (currentGeneration / generations) * 100)
        }

        console.log("renders object: ", this)
        this.status.percentage = 0;
      }, 

      getNextFrame(currentFrameString) {
        return this.frames[currentFrameString]
      }
    });

    const [savedPatterns, setSavedPatterns] = useState(patterns);
    const [theme, setTheme] = useState('')
    const boardGrid = getBoardGridStyle(boardDatas.length)

    const [mainMenu, setMainMenu] = useState("game");
    
    function getMenu(menu) {

      const gameMenu = boardDatas.length > 0 ? <div className='game-area' style={boardGrid}> 
        { boardDatas.map(data => 
        <GameBoard key={`Board ID ${data.id}`}
        boardData={data}
        dataDispatch={dataDispatch}
        />)}
      </div> : <div className="empty-game-area"> 
          <span style={{fontSize: "40px"}}> No Board Loaded </span>
          <button onClick={() => dataDispatch({type: "add"})} style={{fontSize: "30px"}} > Add Board </button>
      </div>;

      switch(menu) {
        case "game": return gameMenu;
        case "pattern": return <PatternMenu patterns={savedPatterns} setPatterns={setSavedPatterns} close={() => setMainMenu("game")}/>;
        default: return gameMenu;
      }
    }

    

    


  return (
      <ThemeContext.Provider value={[theme, setTheme]}>
        <BoardContext.Provider value={[boardDatas, dataDispatch]} >
          <PatternContext.Provider value={[savedPatterns, setSavedPatterns]} >
            
            <RenderContext.Provider value={renders}>
              <div className='main-menu'>
                { getMenu(mainMenu) }
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
                <button className={`game-menu-button ${mainMenu == "game" ? 'opened' : ''}`} onClick={() => setMainMenu('game')}> Game Menu </button>
                <button className={`pattern-menu-button ${mainMenu == "pattern" ? 'opened' : ''}`} onClick={() => setMainMenu('pattern')}> Pattern Menu </button>

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
            


          </PatternContext.Provider>
        </BoardContext.Provider>
      </ThemeContext.Provider>
  )
}


export default App