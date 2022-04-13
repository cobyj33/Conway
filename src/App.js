import React, { createContext, useEffect, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import './app.css'
import { GameBoard } from './components/GameBoard'
import { FaMoon } from "react-icons/fa"

const GlobalState = createContext(null)
export const App = () => {
    
    const [aboutMenu, setAboutMenu] = useState(false);
    const [settingsMenu, setSettingsMenu] = useState(false);
    const [examplesMenu, setExamplesMenu] = useState(false);
    const [theme, setTheme] = useState('')

    const globalState = {
        theme: theme
    }

    


  return (
      <GlobalState.Provider value={globalState}>

      <div className='game-area'> 
        <GameBoard />
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
      </GlobalState.Provider>
  )
}

export default App