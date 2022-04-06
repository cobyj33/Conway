import React, { useEffect, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import './app.css'

export class Selection {
    constructor(row, col) {
        this.row = row
        this.col = col
    }
}

export const App = () => {
    const canvasRef = useRef()
    const [animating, setAnimating] = useState(false)
    const [selections, setSelections] = useState([])
    const [settings, setSettings] = useState({
      size: {
        rows: 10,
        cols: 10
      },
      tickSpeed: 5,
      randomizeAmount: 10,
    })
    const isAnimating = useRef(animating)
    const animationStartTime = useRef(Date.now())
    const selectionsBeforeAnimation = useRef(selections);
    const cloneSelections = (selectionList) => selectionList.map(({row, col}) => new Selection(row, col))
    useEffect(() => { 
      isAnimating.current = animating;
      animationStartTime.current = Date.now() 
      
      if (animating) {
        selectionsBeforeAnimation.current = cloneSelections(selections)
      } else {
        setSelections(selectionsBeforeAnimation.current)
      }
    }, [animating])

    const lastTick = useRef(Date.now())
    const isDragging = useRef(false)
    const dragMode = useRef('erasing')
    const getMillisecondsPerTick = () => 1000 / settings.tickSpeed
    const getMillisecondsSinceLastTick = () => Date.now() - lastTick.current
    const isInBounds = ({row, col}) => row >= 0 && col >= 0 && row < settings.size.rows && col < settings.size.cols
    const getContext = () => canvasRef.current.getContext("2d")
    const getCanvasBounds = () => canvasRef.current.getBoundingClientRect()
    const getCellSize = () => {
        return {
            width: getCanvasBounds().width / settings.size.cols,
            height: getCanvasBounds().height / settings.size.rows
        }
    }
    const getY = (row) => row * getCellSize().height
    const getX = (col) => col * getCellSize().width
    const isSelected = ({row, col}) => selections.some(sel => sel.row === row && sel.col === col)
    const isEqualSelection = (first, second) => first.row === second.row && first.col === second.col
    const removeDuplicates = (selectionList) => {
        const tracker = []
        return selectionList.filter(selection => {
            if (tracker.some(cell => isEqualSelection(cell, selection))) {
                return false
            } else {
                tracker.push(selection)
                return true
            }
        })
    }

    const removeOutOfBounds = (selectionList) => {
        return selectionList.filter(sel => isInBounds(sel))
    }

    const getClickedSelection = (event) => {
        const {width: cellWidth, height: cellHeight} = getCellSize()
        const bounds = getCanvasBounds();

        const col = Math.floor((event.clientX - bounds.x) / cellWidth);
        const row = Math.floor((event.clientY - bounds.y) / cellHeight);
        return new Selection(row, col)
    }


    const select = (selection) => {
        console.log(selection)
        if (isSelected(selection)) {
            console.log('selected')
            setSelections(selections.filter(sel => !isEqualSelection(selection, sel)))
        } else {
            setSelections(selections.concat(selection))
        }
    }

    function draw() {
        if (!canvasRef.current) return
        const context = getContext()
        canvasRef.current.style.backgroundColor = animating ? 'black' : ""
        context.fillStyle = 'white'
        context.strokeStyle = 'black'
        context.lineWidth = 1;
        const {width: cellWidth, height: cellHeight} = getCellSize()
        const {rows, cols} = settings.size;



        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (isSelected(new Selection(row, col))) {
                    context.fillRect(getX(col), getY(row), cellWidth, cellHeight)
                }
                context.strokeRect(getX(col), getY(row), cellWidth, cellHeight)
            }
        }
    }

//  If the cell is alive, then it stays alive if it has either 2 or 3 live neighbors

// If the cell is dead, then it springs to life only in the case that it has 3 live neighbors


    function getNeighbors(selection) {
        const neighbors = []
        const {row: centerRow, col: centerCol} = selection
        for (let row = centerRow - 1; row <= centerRow + 1; row++) {
            for (let col = centerCol - 1; col <= centerCol + 1; col++) {
                if (!(row === centerRow && col === centerCol)) {
                    neighbors.push(new Selection(row, col))
                }
            }
        }
        // console.log('selections', selections.length)
        // console.log(selections)
        return neighbors
    }

    function getLiveNeighbors(selection) {
        return getNeighbors(selection).filter(sel => isSelected(sel))
    }

    function getAreasToCheck() {
        return removeOutOfBounds(removeDuplicates(selections.flatMap(sel => [...getNeighbors(sel), sel])))
    }

    function tick() {
        const testCells = getAreasToCheck().map(cell => new Selection(cell.row, cell.col));
        const nextGenFilter = cell => {
            const numOfLiveNeighbors = getLiveNeighbors(cell).length
            if (isSelected(cell)) {
                return numOfLiveNeighbors === 2 || numOfLiveNeighbors === 3 
            }
            return numOfLiveNeighbors === 3
        }

        console.log('filtered', testCells.filter(nextGenFilter).length)
        console.log('unfiltered', testCells.length)
        setSelections(testCells.filter(nextGenFilter))
        lastTick.current = Date.now()
        console.log('updating');
    }

    const resizeCanvas = () => {
        if (!canvasRef.current) return
        canvasRef.current.width = getCanvasBounds().width;
        canvasRef.current.height = getCanvasBounds().height
    }

    useEffect(() => {
        function update() { resizeCanvas(); draw(); };
        update()
        const observer = new ResizeObserver(() => update());
        observer.observe(canvasRef.current)
    })

    

    useEffect(() => {
        function getNextTick() {
            if (isAnimating.current) {
                if (Date.now() - lastTick.current > getMillisecondsPerTick()) {
                    tick()
                } else {
                    setTimeout(() => getNextTick(), getMillisecondsPerTick() - (Date.now() - lastTick.current))
                }
            }
        }
        getNextTick()
    })

    const keyEvents = {
        Enter: () => setAnimating(!animating)
    }

    function keyListener(keyEvent) {
        console.log(keyEvent.key)
        if (Object.keys(keyEvents).some(key => key === keyEvent.key)) {
            keyEvents[keyEvent.key]()
        }
    }

    function randomizeSelections() {
      const randomized = []
      for (let i = 0; i < settings.randomizeAmount; i++) {
        randomized.push(new Selection(Math.round(Math.random() * settings.size.rows), Math.round(Math.random() * settings.size.cols)))
      }
      setSelections(randomized);
    }

    function clear() {
      selectionsBeforeAnimation.current = []
      setSelections([])
    }


    const [aboutMenu, setAboutMenu] = useState(false);
    const [settingsMenu, setSettingsMenu] = useState(false);
    const [examplesMenu, setExamplesMenu] = useState(false);

  return (
      <>
        <canvas className='game-canvas' ref={canvasRef} onMouseDown={(event) => {
        isDragging.current = true;
        select(getClickedSelection(event))
    }
    } onMouseUp={() => isDragging.current = false} onMouseMove={(event) => isDragging.current ? getClickedSelection(event) : ''}onKeyDown={keyListener} tabIndex={0} />

        <Sidebar>
            <div> Conway's Game Of Life </div>
            <button className='randomize' onClick={(e) => { randomizeSelections(); e.target.blur(); } }> Randomize </button>
            <button className={`animate-button ${animating ? 'on' : ''}`} onClick={() => setAnimating(!animating)}> Animate </button>
            <button className='clear-button' onClick={clear}> Clear </button>

            <button className={`examples-button ${examplesMenu ? 'opened' : ''}`} onClick={() => setExamplesMenu(!examplesMenu)}> Examples </button>
            { examplesMenu && <div className='examples'>
              Examples
              </div>}

            <button className={`settings-button ${settingsMenu ? 'opened' : ''}`} onClick={() => setSettingsMenu(!settingsMenu)}> Settings </button>
            { settingsMenu && <div className='settings'>
                <div className='settings-size'>
                  <label htmlFor="row-input"> Rows: </label>
                  <input id="row-input" type='number' value={settings.size.rows} onChange={(event) => setSettings({...settings, size: { ...settings.size, rows: event.target.value}})} />
                  <label htmlFor="col-input"> Cols: </label>
                  <input id="col-input" type='number' value={settings.size.cols} onChange={(event) => setSettings({...settings, size: { ...settings.size, cols: event.target.value}})} />
                </div>

                <label htmlFor="randomize-amount-input"> Amount to Randomize: </label>
                <input id="randomize-amount-input" type='number' value={settings.randomizeAmount} onChange={(event) => setSettings({...settings, randomizeAmount: event.target.value })} />
                <label htmlFor="tick-speed-input"> Frames Per Second: </label>
                <input id="tick-speed-input" type='number' value={settings.tickSpeed} onChange={(event) => setSettings({...settings, tickSpeed: event.target.value })} />
              </div>}

            <button className={`about-button ${aboutMenu ? 'opened' : ''}`} onClick={() => setAboutMenu(!aboutMenu)}> About </button>
            { aboutMenu && <div className='about'>
                Rules: <br/><br/>
                Any live cell with two or three live neighbors survives. <br/><br/>

                Any dead cell with three live neighbors becomes a live cell.<br/><br/>

                Be Creative!
              </div>}
        </Sidebar>
      </>
  )
}

export default App