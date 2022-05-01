import React, { createContext, useEffect, useReducer, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import './app.css'
import { GameBoard } from './components/GameBoard'
import { FaMoon } from "react-icons/fa"
import { BoardData } from './classes'
import { cloneDeep } from 'lodash'

const GlobalState = createContext(null)
const nextID = 0;

//request: {accessor = "", newValue}
function boardReducer(state, action) {
  const {type, id, request} = action;
  
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
      console.log('start of board data: ', request)

      const chosenBoard = state.filter(board => board.id === id)?.[0];
      if (!chosenBoard) return state
      // if (locked.current) {
      //   alterQueue.current.push([id, requests])
      //   return state;
      // }
        
      // locked.current = true;
        const newBoard = cloneDeep(chosenBoard)
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

    default:
      console.log("No valid selected dispatch type: ", type)
      return state
    }
}


export const App = () => {
    
    const [aboutMenu, setAboutMenu] = useState(false);
    const [boardDatas, boardDatasDispatch] = useReducer(boardReducer, [new BoardData()])
    const [theme, setTheme] = useState('')

    const globalState = {
        theme: theme
    }
    
    // const locked = useRef(false);
    // const alterQueue = useRef([])
    // useEffect(() => {
    //   locked.current = false;
    //   const nextInstruction = alterQueue.current.shift();
    //   console.log("Next Instruction: ", nextInstruction, " Instructions left: ", alterQueue.current.length)
    //   if (nextInstruction) {
    //     const [id, requests] = nextInstruction
    //     boardDatasDispatch({type: "alter", id: id, requests: requests } )
    //   }
    // }, [boardDatas])

    


  return (
      <GlobalState.Provider value={globalState}>

      <div className='game-area'> 
        { boardDatas.map(data => 
        <GameBoard key={`Board ID ${data.id}`}
        boardData={data}
        id={data.id}
        removeCallback={() => boardDatasDispatch({type: 'remove', id: data.id})}
        alterData={(accessor, newValue) => boardDatasDispatch({ type: 'alter', id: data.id, request: { accessor: accessor, newValue: newValue} })}
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