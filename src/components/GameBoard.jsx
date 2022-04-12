import {useRef, useState, useEffect} from 'react'
import { Area, Selection, KeyBinding } from '../classes.js'
import { FaArrowsAlt, FaEraser, FaBrush, FaBackspace, FaRegTrashAlt, FaSearch, FaPlay, FaChevronCircleDown } from "react-icons/fa"
import { BsBoundingBox } from "react-icons/bs"
import { AiFillCloseCircle } from "react-icons/ai"
import "./gameboard.css"

//edit modes: draw, erase, pan, zoom, select

export const GameBoard = ( { sendBoardData } ) => {
  const canvasRef = useRef()
    const [animating, setAnimating] = useState(false)
    const [selections, setSelections] = useState([])
    const [currentGeneration, setCurrentGeneration] = useState(0)
    const [pattern, setPattern] = useState([{row: 0, col: 0}])
    const [selectedArea, setSelectedArea] = useState(new Area(0, 0, 5, 2))
    const [view, setView] = useState({
        coordinates: { //x is cols, y is rows
            row: 0,
            col: 0
        },
        zoom: 1
    })

    const [editMode, setEditMode] = useState('draw')

    const [settings, setSettings] = useState({
      tickSpeed: 5,
      randomizeAmount: 10,
      autoExpand: false
    })


    const resizeCanvas = () => {
        if (!canvasRef.current) return
        canvasRef.current.width = getCanvasBounds().width;
        canvasRef.current.height = getCanvasBounds().height
    }

    const isAnimating = useRef(animating)
    const animationStartTime = useRef(Date.now())
    const movingSelectedArea = useRef(false)
    const selectionsBeforeAnimation = useRef(selections);
    const lastGeneration = useRef([])
    const lastTick = useRef(Date.now())
    const isDragging = useRef(false)
    const dragMode = useRef('erasing')
    const getMillisecondsPerTick = () => 1000 / settings.tickSpeed
    const getContext = () => canvasRef.current.getContext("2d")
    const getCanvasBounds = () => canvasRef.current.getBoundingClientRect()
    const getCellSize = () => Math.min(getCanvasBounds().width, getCanvasBounds().height) / (10 / Math.max(0.05, view.zoom))
    const getAspectRatio = () => canvasRef.current ? canvasRef.current.width / canvasRef.current.height : (16 / 9)

    const getViewRange = () => {
        const {row: rowStart, col: colStart} = view.coordinates
        const rowEnd = rowStart + getCanvasBounds().height / getCellSize()
        const colEnd = colStart + getCanvasBounds().width / getCellSize()
        return [Math.floor(rowStart), Math.floor(rowEnd), Math.floor(colStart), Math.floor(colEnd)]
    }

    const isInView = (selection) => {
        const [rowStart, rowEnd, colStart, colEnd] = getViewRange()
        return selection.row >= rowStart && selection.row < rowEnd && selection.col >= colStart && selection.col < colEnd
    }

    const isSelected = ({row, col}) => selections.some(sel => sel.row === row && sel.col === col)
    const isEmpty = () => selections.length == 0
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

    const cloneSelections = (selectionList) => selectionList.map(({row, col}) => new Selection(row, col))

    function clear() {
        selectionsBeforeAnimation.current = []
        setSelections([])
        lastGeneration.current = []
        setCurrentGeneration(0)
      }

    const isStable = () => selections.every(lastCell => lastGeneration.current.some(cell => isEqualSelection(cell, lastCell))) && lastGeneration.current.length == selections.length
    const getMousePositionInCanvas = (mouseEvent) => {
        if (!canvasRef.current) return {x: 0, y: 0}
        const bounds = getCanvasBounds()
        return {
            x: mouseEvent.clientX - bounds.left,
            y: mouseEvent.clientY - bounds.top
        }
    }

    const getHoveredCell = (event) => {
        const bounds = getCanvasBounds();
        const col = Math.floor((event.clientX - bounds.x + (view.coordinates.col * getCellSize())) / getCellSize());
        const row = Math.floor((event.clientY - bounds.y + (view.coordinates.row * getCellSize())) / getCellSize());
        return new Selection(row, col)
    }
   
    const DragBrush = (event) => {
        if (!isDragging.current || event.shiftKey || event.ctrlKey || event.altKey || animating || movingSelectedArea.current) return
        const cell = getHoveredCell(event);
        if (dragMode.current == 'erasing') {
            setSelections(selections.filter(sel => !isEqualSelection(cell, sel)))
        } else if (dragMode.current == 'drawing') {
            if (!isSelected(cell)) {
                setSelections(selections.concat(cell))
            }
        }
    }

    const lastMousePosition = useRef({x: 0, y: 0})
    const mousePan = (event) => {
        if (!event.shiftKey || event.ctrlKey || !isDragging.current) return
        const {x: lastX, y: lastY} = lastMousePosition.current
        if (lastX == 0 && lastY == 0) {
            lastMousePosition.current = getMousePositionInCanvas(event)
            return
        }

        const {x: currentX, y: currentY} = getMousePositionInCanvas(event)
        const colOffset = (currentX - lastX) / getCellSize();
        const rowOffset = (currentY - lastY) / getCellSize();
        console.log('rowOffset: ', rowOffset, 'colOffset: ', colOffset)
        console.log(view.coordinates)
        setView({...view, coordinates: { row: view.coordinates.row + rowOffset, col: view.coordinates.col + colOffset}})
        lastMousePosition.current = getMousePositionInCanvas(event)
    }

    const mouseZoom = event => {
        if (!event.ctrlKey || event.shiftKey || !isDragging.current) return
        const {x: lastX, y: lastY} = lastMousePosition.current
        if (lastX == 0 && lastY == 0) {
            lastMousePosition.current = getMousePositionInCanvas(event)
            return
        }

        const {y: currentY} = getMousePositionInCanvas(event)
        const zoomOffset = (currentY - lastY) / 100;
        setView({...view, zoom: view.zoom + zoomOffset})
        lastMousePosition.current = getMousePositionInCanvas(event)
    }

    
    const select = (centerSelection) => {
        if (isSelected(centerSelection)) {
            console.log('selected')
            setSelections(selections.filter(sel => 
            !pattern.some(patternCell => 
            isEqualSelection(new Selection(patternCell.row + centerSelection.row, patternCell.col + centerSelection.col), sel))))
        } else {
            setSelections(selections.concat(...pattern.map(sel => new Selection(sel.row + centerSelection.row, sel.col + centerSelection.col))))
        }
    }

    const clickedSelectedArea = event => selectedArea.containsArea(getHoveredCell(event))
    const selectedAreaAnchor = useRef(new Selection(0, 0))

    const startAreaSelection = (event) => {
        if (!event.altKey || event.shiftKey || event.ctrlKey) return
        const hoveredCell = getHoveredCell(event)
        selectedAreaAnchor.current = hoveredCell;
        setSelectedArea(new Area(hoveredCell.row, hoveredCell.col, 1, 1))
    }

    const selectingArea = (event) => {
        if (!event.altKey || event.shiftKey || event.ctrlKey || !isDragging.current) return

        const hoveredCell = getHoveredCell(event)
        const anchor = selectedAreaAnchor.current
        setSelectedArea(new Area(
            Math.min(hoveredCell.row, anchor.row),
            Math.min(hoveredCell.col, anchor.col), 
            Math.abs(hoveredCell.col - anchor.col),
            Math.abs(hoveredCell.row - anchor.row)
        ))

        setSelections(selections.map(sel => {
            const copy = new Selection(sel.row, sel.col)
            if (selectedArea.containsArea(sel))
                copy.isSelected = true;
            return copy;
        }))
    }

    const moveSelectedArea = event => {
        if (event.ctrlKey || event.shiftKey || !movingSelectedArea.current) return
        const {x: lastX, y: lastY} = lastMousePosition.current
        if (lastX == 0 && lastY == 0) {
            lastMousePosition.current = getMousePositionInCanvas(event)
            return
        }

        const {x: currentX, y: currentY} = getMousePositionInCanvas(event)
        const colOffset = (currentX - lastX) / getCellSize();
        const rowOffset = (currentY - lastY) / getCellSize();
        const newLocation = new Area(selectedArea.row + rowOffset, selectedArea.col + colOffset, selectedArea.width, selectedArea.height)
        setSelectedArea(newLocation)
        console.log(selections.filter(sel => sel.isSelected).length)
        setSelections(selections.map(sel => sel.isSelected ? new Selection(sel.row + newLocation.row - selectedArea.row, sel.col + newLocation.col - selectedArea.col) : new Selection(sel.row, sel.col)))
        lastMousePosition.current = getMousePositionInCanvas(event)
    }

    const getBackgroundColor = () => {
        if (animating) {
             if (isStable() && !isEmpty() && currentGeneration > 1) {
                return 'darkred'
            }
            return 'black'
        }
        return ''
    }

    function draw() {
        const canvas = canvasRef.current
        if (!canvasRef.current) return
        const context = getContext()
        canvas.style.backgroundColor = getBackgroundColor()
        context.fillStyle = 'white'
        context.strokeStyle = 'black'
        context.lineWidth = 1;
        const [rowStart, rowEnd, colStart, colEnd] = getViewRange()
        const cellSize = getCellSize()
        const currentBox = (row, col, width = 1, height = 1) => [(col - view.coordinates.col) * cellSize, (row - view.coordinates.row) * cellSize, cellSize * width, cellSize * height]


        selections.forEach(selection => context.fillRect(...currentBox(selection.row, selection.col)) )

        context.beginPath()
        if (!animating) {
            for (let row = rowStart - 1; row < rowEnd + 1; row++) {
                context.moveTo(0, (row - view.coordinates.row) * cellSize);
                context.lineTo(canvas.width,  (row - view.coordinates.row) * cellSize)
            }

            for (let col = colStart - 1; col < colEnd + 1; col++) {
                context.moveTo((col - view.coordinates.col) * cellSize, 0)
                context.lineTo((col - view.coordinates.col) * cellSize, canvas.height)
            }   
            context.stroke();
        }

        context.globalAlpha = selectedArea.containsArea(lastMousePosition.current) ? 0.5 : 0.25
        context.fillRect(...currentBox(...selectedArea.info))
        context.globalAlpha = 1;
    }

    const lastHoveredCell = useRef(new Selection(0, 0))
    const drawMouseShadow = (event) => {
        const hoveredCell = getHoveredCell(event)
        if (animating || isEqualSelection(lastHoveredCell.current, hoveredCell)) return
        lastHoveredCell.current = hoveredCell
        const context = getContext()
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        draw()
        context.fillStyle = 'white'
        const cellSize = getCellSize()
        const currentBox = (row, col) => [(col - view.coordinates.col) * cellSize, (row - view.coordinates.row) * cellSize, cellSize, cellSize]
        context.globalAlpha = 0.5
        
        pattern.forEach(cell => {
            context.fillRect(...currentBox(cell.row + hoveredCell.row, cell.col + hoveredCell.col))
        })

        context.globalAlpha = 1;
    }

//  If the cell is alive, then it stays alive if it has either 2 or 3 live neighbors

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
        return neighbors
    }

    function getLiveNeighbors(selection) {
        return getNeighbors(selection).filter(sel => isSelected(sel))
    }

    function getAreasToCheck() {
        return removeDuplicates(selections.flatMap(sel => [...getNeighbors(sel), sel]))
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

        const living = testCells.filter(nextGenFilter)

        console.log('filtered', living.length)
        console.log('unfiltered', testCells.length)
        setSelections(living)
        setCurrentGeneration(currentGeneration + 1)
        lastTick.current = Date.now()
        lastGeneration.current = cloneSelections(selections)
        console.log('updating');
    }


    const observer = useRef(new ResizeObserver(() => {resizeCanvas(); draw()}));
    useEffect(() => {resizeCanvas(); draw()}, [])
    useEffect(() => {
        observer.current.disconnect()
        observer.current = new ResizeObserver(() => {resizeCanvas(); draw()})
        observer.current.observe(canvasRef.current)
    })

    
    const frameRequested = useRef(false);
    useEffect(() => { 
        isAnimating.current = animating;
        animationStartTime.current = Date.now() 
        
        if (animating) {
            setSelections(removeDuplicates(selections))
            selectionsBeforeAnimation.current = cloneSelections(selections)
        } else {
            setSelections(selectionsBeforeAnimation.current)
            setCurrentGeneration(0)
            lastGeneration.current = []
            frameRequested.current = false;
        }
      }, [animating])


    useEffect(() => {
        function getNextTick() {
            if (isAnimating.current) {
                if (Date.now() - lastTick.current > getMillisecondsPerTick()) {
                    tick()
                    frameRequested.current = false;
                } else {
                    setTimeout(() => getNextTick(), getMillisecondsPerTick() - (Date.now() - lastTick.current))
                }
            }
        }
        
        if (!frameRequested.current && isAnimating.current) {
            console.log(frameRequested.current)
            frameRequested.current = true;
            getNextTick()
        }
    })

    const keyEvents = [
        new KeyBinding({key: "Enter", callback: () => setAnimating(!animating)}),
        new KeyBinding({key: "Delete", callback: () => clear()}),
        new KeyBinding({key: "-", callback: () => setView({...view, zoom: view.zoom - 0.05 })}),
        new KeyBinding({key: "=", callback: () => setView({...view, zoom: view.zoom + 0.05 })}),
        new KeyBinding({key: "w", callback: () => setView({...view, coordinates: {...view.coordinates, row: view.coordinates.row - 1}})}),
        new KeyBinding({key: "a", callback: () => setView({...view, coordinates: {...view.coordinates, col: view.coordinates.col - 1}})}),
        new KeyBinding({key: "s", callback: () => setView({...view, coordinates: {...view.coordinates, row: view.coordinates.row + 1}})}),
        new KeyBinding({key: "d", callback: () => setView({...view, coordinates: {...view.coordinates, col: view.coordinates.col + 1}})}),
        new KeyBinding({key: "UpArrow", callback: () => setView({...view, coordinates: {...view.coordinates, row: view.coordinates.row - 1}})}),
        new KeyBinding({key: "LeftArrow", callback: () => setView({...view, coordinates: {...view.coordinates, col: view.coordinates.col - 1}})}),
        new KeyBinding({key: "DownArrow", callback: () => setView({...view, coordinates: {...view.coordinates, row: view.coordinates.row + 1}})}),
        new KeyBinding({key: "RightArrow", callback: () => setView({...view, coordinates: {...view.coordinates, col: view.coordinates.col + 1}})})
    ]

    function keyListener(keyEvent) {
        console.log(keyEvent.key)
        keyEvents.forEach(binding => binding.testAndRun(keyEvent))
    }

    function mouseDownListener(mouseEvent) {
        isDragging.current = true;
        startAreaSelection(mouseEvent)
        if (mouseEvent.shiftKey || mouseEvent.altKey || mouseEvent.ctrlKey) return

        if (clickedSelectedArea(mouseEvent)) {
            movingSelectedArea.current = true;
            moveSelectedArea(mouseEvent); return;
        }

        if (!animating) {
            isSelected(getHoveredCell(mouseEvent)) ? dragMode.current = 'erasing' : dragMode.current = 'drawing'
            select(getHoveredCell(mouseEvent))
        }
    }

    function mouseMoveListener(mouseEvent) {
        DragBrush(mouseEvent); 
        mousePan(mouseEvent); 
        mouseZoom(mouseEvent); 
        drawMouseShadow(mouseEvent); 
        selectingArea(mouseEvent);
        moveSelectedArea(mouseEvent)
    }

    const onMouseUp = (event) => {
        lastMousePosition.current = {x: 0, y: 0}
        isDragging.current = false
        movingSelectedArea.current = false;
        setSelectedArea(new Area(Math.round(selectedArea.row), Math.round(selectedArea.col), Math.round(selectedArea.width), Math.round(selectedArea.height)))
        setSelections(selections.map(sel => new Selection(Math.round(sel.row), Math.round(sel.col))))
    }

    const save = () => sendBoardData ? sendBoardData(cloneSelections(selections)) : ''

    function randomizeSelections() {
      const randomized = []
      const [rowStart, rowEnd, colStart, colEnd] = getViewRange()
      for (let i = 0; i < settings.randomizeAmount; i++) {
        randomized.push(new Selection(rowStart + Math.round(Math.random() * rowEnd), colStart + Math.round(Math.random() * colEnd)))
      }
      setSelections(randomized);
    }

    const [showBoardData, setShowBoardData] = useState(false)



  return (
    <div className='game-board'>
        <canvas className='game-canvas' ref={canvasRef} onMouseDown={mouseDownListener} onMouseUp={onMouseUp} onContextMenu={onMouseUp} onMouseLeave={onMouseUp} onMouseMove={mouseMoveListener} onKeyDown={keyListener} tabIndex={0} />
        { animating && <div className='animating-ui'>
                <h3 className='generation-display'> Current Generation: { currentGeneration } </h3>
                <div className='flex-column'>
                    <label htmlFor="speed-slider"> FPS: { settings.tickSpeed } </label>
                    <input id="speed-slider" type='range' min='1' max='100' value={settings.tickSpeed} onChange={(event) => setSettings({...settings, tickSpeed: Number(event.target.value) }) } />
                </div>
             </div>}

        <div className='game-display-information flex-column'>
            <button onClick={() => setShowBoardData(!showBoardData)}> <FaChevronCircleDown /> </button>

            { showBoardData && 
            <>
              <div className='coordinate-display flex-column' >
                  View <br/>
                  Row: <span> {Math.round(view.coordinates.row * 100) / 100} </span> <br/>
                  Col: <span> {Math.round(view.coordinates.col * 100) / 100} </span> <br/>
              </div>

              <label htmlFor='zoom-input'> Zoom: {Math.round(view.zoom * 100) / 100} </label>
              <input type="range" id='zoom-input' min="0.05" max='3' step="0.05" value={view.zoom} onChange={(event) => setView({...view, zoom: Number(event.target.value)}) }/>
            </> } 
        </div>

        <div className='game-toolbar flex-row'>
            

            <button onClick={() => editMode == 'pan' ? 'draw' : 'pan'}> <FaArrowsAlt /> </button>
            <button onClick={() => editMode == 'zoom' ? 'draw' : 'zoom'}> <FaSearch /> </button>
            <button onClick={() => editMode == 'select' ? 'draw' : 'select'}> <BsBoundingBox /> </button>
            <button onClick={() => editMode == 'erase' ? 'draw' : 'erase'}> <FaEraser /> </button>
            <button onClick={() => editMode == 'draw' ? 'draw' : 'draw'}> <FaBrush /> </button>
            <button onClick={() => setAnimating(!animating)}> <FaPlay /> </button>
            <button> <FaBackspace /> </button>
            <button onClick={clear}> <FaRegTrashAlt /> </button> 
            <button onClick={() => console.log(this)}> <AiFillCloseCircle /> </button> 
        </div>
    </div>
  )
}
