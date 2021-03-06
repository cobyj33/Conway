import React, { useContext, useState, useEffect } from 'react'
import { BoardContext } from '../../App'
import { FaWindowClose } from "react-icons/fa"
import "./boardselector.css"
import { getBoardGridStyle } from '../../functions'

export const BoardSelector = ({ onSelection, onClose }) => {
    const [gameBoards, gameBoardsDispatch] = useContext(BoardContext)
    const boardGridStyle = getBoardGridStyle(gameBoards.length)
    const [buttons, setButtons] = useState(getButtons())

    useEffect(() => {
        setButtons(getButtons())
    }, [onSelection])
    

    function getButtons() {
        const buttons = [];
        for (let i = 0; i < gameBoards.length; i++) {
            const boardData = gameBoards[i];
            const callback = () => onSelection(i)
            buttons.push(<button className='board-selection-button' onClick={callback} key={`${callback} ${i}`}> {i} </button>)
        }

        const callback = () => onSelection(-1)
        buttons.push(<button className='board-selection-button' onClick={callback} key={`${callback} ${-1}`}> New Board </button>)
        return buttons;
    }

  return (
    <div className='notice board-selector'>
        <div className='top-bar'>
            <h3> Select Board </h3>
            <button onClick={ onClose !== null ? () => onClose() : console.log("No available closing callback [BoardSelector.jsx]") }> <FaWindowClose /> </button>
        </div>

        <div className='board-areas' style={boardGridStyle}>
            { buttons }
        </div>
    </div>
  )
}
