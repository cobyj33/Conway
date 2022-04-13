import {useRef, useState, useEffect} from 'react'
import { Area, Selection, KeyBinding } from '../classes.js'
import { FaArrowsAlt, FaEraser, FaBrush, FaBackspace, FaRegTrashAlt, FaSearch, FaPlay, FaChevronCircleDown } from "react-icons/fa"
import { BsBoundingBox } from "react-icons/bs"
import { AiFillCloseCircle } from "react-icons/ai"
import "./gameboard.css"
import { ToolTip } from './ToolTip/ToolTip.jsx'

//edit modes: draw, erase, pan, zoom, select

export const GameBoard = ( { sendBoardData, removeCallback } ) => {
  const canvasRef = useRef()
  const historyStack = useRef([])
    const [animating, setAnimating] = useState(false)
    const [selections, setSelections] = useState([])
    const [currentGeneration, setCurrentGeneration] = useState(0)
    const [pattern, setPattern] = useState([{row: 0, col: 0}])
    const [selectedArea, setSelectedArea] = useState(new Area(0, 0, 0, 0))
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
        if (!isDragging.current || !(editMode == 'draw' || editMode == 'erase') || movingSelectedArea.current) return
        const cell = getHoveredCell(event);
        if (editMode == 'erase') {
            setSelections(selections.filter(sel => !isEqualSelection(cell, sel)))
        } else if (editMode == 'draw') {
            if (!isSelected(cell)) {
                setSelections(selections.concat(cell))
            }
        }
    }

    const lastMousePosition = useRef({x: 0, y: 0})
    const mousePan = (event) => {
        if (editMode != 'pan' || !isDragging.current) return
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
        if (editMode != 'zoom' || !isDragging.current) return
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
        if (editMode == 'erase') {
            setSelections(selections.filter(sel => 
            !pattern.some(patternCell => 
            isEqualSelection(new Selection(patternCell.row + centerSelection.row, patternCell.col + centerSelection.col), sel))))
        } else if (editMode == 'draw') {
            setSelections(selections.concat(...pattern.map(sel => new Selection(sel.row + centerSelection.row, sel.col + centerSelection.col))))
        }
    }

    const clickedSelectedArea = event => selectedArea.containsArea(getHoveredCell(event))
    const selectedAreaAnchor = useRef(new Selection(0, 0))

    const startAreaSelection = (event) => {
        if (editMode != 'select') return
        const hoveredCell = getHoveredCell(event)
        selectedAreaAnchor.current = hoveredCell;
        setSelectedArea(new Area(hoveredCell.row, hoveredCell.col, 1, 1))
    }

    const selectingArea = (event) => {
        if (editMode != 'select' || !isDragging.current) return

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
        if (editMode != 'select' || !movingSelectedArea.current) return
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
        new KeyBinding({key: "Enter", onDown: () => setAnimating(!animating)}),
        new KeyBinding({key: "Delete", onDown: () => clear()}),
        new KeyBinding({key: "-", onDown: () => setView({...view, zoom: view.zoom - 0.05 })}),
        new KeyBinding({key: "=", onDown: () => setView({...view, zoom: view.zoom + 0.05 })}),
        new KeyBinding({key: "UpArrow", onDown: () => setView({...view, coordinates: {...view.coordinates, row: view.coordinates.row - 1}})}),
        new KeyBinding({key: "LeftArrow", onDown: () => setView({...view, coordinates: {...view.coordinates, col: view.coordinates.col - 1}})}),
        new KeyBinding({key: "DownArrow", onDown: () => setView({...view, coordinates: {...view.coordinates, row: view.coordinates.row + 1}})}),
        new KeyBinding({key: "RightArrow", onDown: () => setView({...view, coordinates: {...view.coordinates, col: view.coordinates.col + 1}})}),
        new KeyBinding({key: "1", onDown: () => setEditMode('draw')}),
        new KeyBinding({key: "2", onDown: () => setEditMode('erase')}),
        new KeyBinding({key: "3", onDown: () => setEditMode('pan')}),
        new KeyBinding({key: "4", onDown: () => setEditMode('zoom')}),
        new KeyBinding({key: "5", onDown: () => setEditMode('select')}),
        new KeyBinding({key: "Escape", onDown: () => removeCallback?.() }),
        new KeyBinding({key: "Shift", onDown: () => setEditMode('pan'), onUp: () => setEditMode('draw')}),
        new KeyBinding({key: "Control", onDown: () => setEditMode('zoom'), onUp: () => setEditMode('draw')}),
        new KeyBinding({key: "Alt", onDown: () => setEditMode('select'), onUp: () => setEditMode('draw')}),
    ]

    function keyListener(keyEvent) {
        console.log(keyEvent.key)
        keyEvents.forEach(binding => binding.testAndRunDown(keyEvent))
    }

    function keyUpListener(keyEvent) {
        console.log(' on up ', keyEvent)
        keyEvents.forEach(binding => binding.testAndRunUp(keyEvent))
    }

    function mouseDownListener(mouseEvent) {
        isDragging.current = true;
        startAreaSelection(mouseEvent)
        if (editMode !== 'draw' || editMode !== 'erase') return

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
        moveSelectedArea(mouseEvent);
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

    let cursor = 'auto'
    switch (editMode) {
        case 'draw': cursor = 'url("https://img.icons8.com/ios-glyphs/30/000000/pencil-tip.png"), crosshair'; break;
        case 'zoom': cursor = 'url("https://img.icons8.com/external-royyan-wijaya-detailed-outline-royyan-wijaya/24/000000/external-magnifying-glass-interface-royyan-wijaya-detailed-outline-royyan-wijaya.png"), nwse-resize'; break;
        case 'erase': cursor = 'url("https://img.icons8.com/material-rounded/24/000000/eraser.png"), crosshair'; break;
        case 'pan': cursor = 'move'; break;
        case 'select': cursor = 'crosshair'; break;
    }

  return (
    <div className='game-board'>
        <canvas className='game-canvas' ref={canvasRef} onMouseDown={mouseDownListener} onMouseUp={onMouseUp} onContextMenu={onMouseUp} onMouseLeave={onMouseUp} onMouseMove={mouseMoveListener} onKeyDown={keyListener} onKeyUp={keyUpListener} tabIndex={0} style={{cursor: cursor}}/>
        { animating && <div className='animating-ui'>
                <h3 className='generation-display'> Current Generation: { currentGeneration } </h3>
                <div className='flex-column'>
                    <label htmlFor="speed-slider"> FPS: { settings.tickSpeed } </label>
                    <input id="speed-slider" type='range' min='1' max='100' value={settings.tickSpeed} onChange={(event) => setSettings({...settings, tickSpeed: Number(event.target.value) }) } />
                </div>
             </div>}

        <div className='game-toolbar flex-row'>
            

            <button onClick={() => editMode != 'draw' ? setEditMode('draw') : ''} className={`game-tool ${editMode == 'draw' ? 'selected' : 'unselected'}`}> <FaBrush /> <ToolTip> 1: Draw </ToolTip> </button>
            <button onClick={() => editMode != 'erase' ? setEditMode('erase') : ''} className={`game-tool ${editMode == 'erase' ? 'selected' : 'unselected'}`}> <FaEraser /> <ToolTip> 2: Erase </ToolTip> </button>
            <button onClick={() => editMode != 'pan' ? setEditMode('pan') : ''} className={`game-tool ${editMode == 'pan' ? 'selected' : 'unselected'}`}> <FaArrowsAlt /> <ToolTip> 3 (Shift + Drag): Pan </ToolTip> </button>
            <button onClick={() => editMode != 'zoom' ? setEditMode('zoom') : ''} className={`game-tool ${editMode == 'zoom' ? 'selected' : 'unselected'}`}>  <FaSearch /> <ToolTip> 4 (Ctrl + Drag): Zoom </ToolTip> </button>
            <button onClick={() => editMode != 'select' ? setEditMode('select') : ''} className={`game-tool ${editMode == 'select' ? 'selected' : 'unselected'}`}> <BsBoundingBox /> <ToolTip> 5 (Alt + Drag): Select </ToolTip> </button>
            <button onClick={() => setAnimating(!animating)} className={`game-tool ${animating ? "selected" : 'unselected'}`}> <FaPlay /> <ToolTip> Enter: Play </ToolTip> </button>
            {/* <button> <FaBackspace /> </button> */}
            <button onClick={clear} className={`game-tool`}> <FaRegTrashAlt /> <ToolTip> Delete: Clear </ToolTip> </button> 

            <div className='flex-column'>
                <button onClick={() => setShowBoardData(!showBoardData)} className={`game-tool ${showBoardData ? 'selected' : 'unselected'}`}> <FaChevronCircleDown />  <ToolTip> Board Data </ToolTip> </button>

                { showBoardData && 
                <div className='game-display-information'>
                    <div className='coordinate-display flex-column' >
                        View <br/>
                        Row: <span> {Math.round(view.coordinates.row * 100) / 100} </span> <br/>
                        Col: <span> {Math.round(view.coordinates.col * 100) / 100} </span> <br/>
                    </div>

                    <label htmlFor='zoom-input'> Zoom: {Math.round(view.zoom * 100) / 100} </label>
                    <input type="range" id='zoom-input' min="0.05" max='3' step="0.05" value={view.zoom} onChange={(event) => setView({...view, zoom: Number(event.target.value)}) }/>
                </div> } 
        </div>
            <button onClick={() => removeCallback?.()} className={`game-tool`}> <AiFillCloseCircle /> <ToolTip> Esc: Exit </ToolTip> </button> 
        </div>
    </div>
  )
}
