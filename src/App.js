import React, { Context, createContext, useReducer, useRef, useState } from 'react'
import { Sidebar } from './components/SideBar/Sidebar'
import './app.css'
import { GameBoard } from './components/Game Board/GameBoard'
import { BoardData } from './classes/BoardData'
import { Pattern } from './classes/Pattern'
import { CreationMenu } from './components/Creation Menu/CreationMenu'
import { boardStatesReducer, patternsReducer, getBoardGridStyle, getNextGeneration} from './functions.ts'
import icon from "./assets/Conway Logo.png"
import { Alert } from './components/Alert/Alert'
import { GPU } from 'gpu.js'
import { Renders } from './classes/Renders'
const patterns = require("./assets/patterns.json")
.map(patternData => new Pattern(patternData))

const nextID = 0;

//request: {accessor = "", newValue}

export const ThemeContext = createContext(null);
export const PatternContext = createContext(null);
export const BoardContext = createContext(null);
export const RenderContext = createContext(null);
export const AlertContext = createContext(null);

export let currentMousePosition = { x: 0, y: 0 }
window.addEventListener("mousemove", (mouseEvent) => {
  currentMousePosition = { x: mouseEvent.clientX, y: mouseEvent.clientY }
})

document.addEventListener("keydown", event => {
  if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
  }
})


const initialAlertState = {
  started: false,
  children: "",
  duration: 0,
  startTime: Date.now()
}

export const gpu = new GPU();

export const App = () => {
    
    const [aboutMenu, setAboutMenu] = useState(false);
    // const [showingCreationMenu, setShowingCreationMenu] = useState(false);
    const [boardDatas, boardDataDispatch] = useReducer(boardStatesReducer, [new BoardData()])
    const [savedPatterns, savedPatternsDispatch] = useReducer(patternsReducer, patterns);
    const [currentAlert, setCurrentAlert] = useState('')
    const [theme, setTheme] = useState('')
    const boardGrid = getBoardGridStyle(boardDatas.length)
    const [mainMenu, setMainMenu] = useState("game");
    const [alert, setAlert] = useState(initialAlertState)
    const renders = useRef(new Renders());

    function getMenu(menu) {

      const gameMenu = boardDatas.length > 0 ? <div className='game-area' style={boardGrid}> 
        { boardDatas.map(data => 
        <GameBoard key={`Board ID ${data.id}`}
        boardData={data}
        boardDataDispatch={boardDataDispatch}
        />)}
      </div> : <div className="empty-game-area"> 
          <span style={{fontSize: "40px"}}> No Board Loaded </span>
          <button onClick={() => boardDataDispatch({type: "add", boardData: new BoardData()})} style={{fontSize: "30px"}} > Add Board </button>
      </div>;

      switch(menu) {
        case "game": return gameMenu;
        case "pattern": return <CreationMenu close={() => setMainMenu("game")}/>;
        default: return gameMenu;
      }
    }

    const lastAlertTimeout = useRef(null)
    function sendAlert(children, duration = 1000) {
      if (lastAlertTimeout.current != null) {
        clearTimeout(lastAlertTimeout.current);
      }

      setAlert({
        started: true,
        children: children,
        startTime: Date.now(),
        duration: duration,
      })

      lastAlertTimeout.current = setTimeout( () => {
        setAlert(initialAlertState)
      }, duration)

    }

    


  return (
      <ThemeContext.Provider value={[theme, setTheme]}>
        <BoardContext.Provider value={[boardDatas, boardDataDispatch]} >
          <PatternContext.Provider value={[savedPatterns, savedPatternsDispatch]} >
            <AlertContext.Provider value={sendAlert}>
            
            <RenderContext.Provider value={renders}>
              <div className='main-menu'>
                { getMenu(mainMenu) }
              </div>
            </RenderContext.Provider>

            <Sidebar>
                <img src={icon} style={{width: "80%", aspectRatio: "2175 / 1025", display: 'inline-block'}} />
                <div> Conway's Game Of Life <br /> Made By: Jacoby Johnson </div>

                <button className={`add-board-button`} onClick={() => boardDataDispatch({type: 'add', boardData: new BoardData()})}> Add Board </button>
                <button className={`game-menu-button ${mainMenu == "game" ? 'opened' : ''}`} onClick={() => setMainMenu('game')}> Game Menu </button>
                <button className={`creation-menu-button ${mainMenu == "pattern" ? 'opened' : ''}`} onClick={() => setMainMenu('pattern')}> Creation Menu </button>

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

            { alert.started && <Alert startTime={alert.startTime} duration={alert.duration} close={() => setAlert(alert => { return {...alert, duration: 0 } })}> {alert.children} </Alert>}
                  
              {/* <Alert> This is An Alert </Alert> */}
            </AlertContext.Provider>
          </PatternContext.Provider>
        </BoardContext.Provider>
      </ThemeContext.Provider>
  )
}


export default App