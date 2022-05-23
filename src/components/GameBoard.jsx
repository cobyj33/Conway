import {useRef, useState, useEffect, useContext} from 'react'
import { Area, Selection, KeyBinding, Render } from '../classes.js'
import { FaArrowsAlt, FaEraser, FaBrush, FaRegTrashAlt, FaSearch, FaPlay, FaChevronCircleDown, FaWindowClose, FaUndo, FaCamera } from "react-icons/fa"
import { BsBoundingBox } from "react-icons/bs"
import { AiFillCloseCircle } from "react-icons/ai"
import "./gameboard.css"
import { ToolTip } from './ToolTip/ToolTip.jsx'
import { shuffle } from 'lodash'
import { getSortedSelections, getNextGeneration, removeDuplicates, getAdjacentNeighbors, equalSelectionLists, millisecondsToTimeString, average, currentTime } from '../functions.js'
import { AFK, RenderContext } from '../App.js'

//edit modes: draw, erase, pan, zoom, select
const DEFAULT_SCREEN_CELL_SPAN = 10;
const MAX_FILL_DEPTH = 100;
const MAX_CELL_WANDER_DISTANCE = 1000;
const MIN_EDIT_ZOOM = 0.05;
const MIN_PLAYBACK_ZOOM = 0.01;
const ZOOM_SHRINK_GRID_LINES = 0.1;
const DEFAULT_GRID_LINE_WIDTH = 1;

const initialRenderStatus = {
        queued: false,
        percentage: 0,
        timeToCompletion: 0,
        requested: {
            generationCount: 0,
            currentGenerationCount: 0,
            currentGeneration: "",
        },
    }

export const GameBoard = ( { boardData, dataDispatch, editable = true, closable = true, bounds = null, showToolBar = true, movable = true, drawGrid = true, initialViewArea = null } ) => {
    const alterData = (accessor, newValue) => dataDispatch({ type: 'alter', id: boardData.id, request: { accessor: accessor, newValue: newValue} })
    const removeCallback = () => { if (closable) { dataDispatch({type: 'remove', id: boardData.id}) } }
    const renders = useContext(RenderContext)
    const [renderStatus, setRenderStatus] = useState(initialRenderStatus)
    
    useEffect( () => {
        // console.log('loaded: centering camera')
        if (initialViewArea) {
            
        } else {
            centerCamera({row: 0, col: 0})
        }

    }, [])

    const canvasRef = useRef()
    const boardRef = useRef()
    const renderRequestRef = useRef()
    const [currentGeneration, setCurrentGeneration] = useState(0);
    const [selectedArea, setSelectedArea] = useState(new Area(0, 0, 0, 0));
    const [displayBackToCenter, showDisplayBackToCenter] = useState(false);
    // const [tempSelections, setTempSelections] = useState([]);
    const [canvasTooltip, setCanvasTooltip] = useState("")
    const [showingRenderPrompt, setShowingRenderPrompt] = useState(false)
    const [showingToolBar, setShowingToolBar] = useState(showToolBar)
    const [brush, setBrush] = useState({
        type: 'pixel',
        size: 1,
        paint: 'cell',
        extra: {
            lineStart: undefined
        }
    });


    const { id, settings, view, selections, editMode } = boardData
    
    const displayedSelections = useRef(JSON.stringify(boardData.selections));
    const setDisplayedSelections = (value) => {
        displayedSelections.current = value;
        draw();
    }

    const selectionSet = useRef(new Set())
    useEffect(() => {
        selectionSet.current = new Set(JSON.parse(displayedSelections.current).map(cell => JSON.stringify(cell)))
    }, [displayedSelections.current])


    const isSelected = (selection) => selectionSet.current.has(JSON.stringify(selection))
    
    const resizeCanvas = () => {
        if (!canvasRef.current) return
        canvasRef.current.width = getCanvasBounds().width;
        canvasRef.current.height = getCanvasBounds().height
    }

    const animationStartTime = useRef(Date.now())
    const lastTick = useRef(Date.now())
    const lastGeneration = useRef("")
    const lastHoveredCell = useRef(new Selection(0, 0))
    const movingSelectedArea = useRef(false)
    const isDragging = useRef(false)
    const getMillisecondsPerTick = () => 1000 / boardData.settings.tickSpeed
    const getContext = () => canvasRef.current.getContext("2d")
    const getCanvasBounds = () => canvasRef.current.getBoundingClientRect()
    const getCellSize = (zoom = boardData.view.zoom) => Math.min(getCanvasBounds().width, getCanvasBounds().height) / (DEFAULT_SCREEN_CELL_SPAN / Math.max(zoom)) //10 is the default span for the viewbox
    const getZoomfromCellSize = (cellSize) => (DEFAULT_SCREEN_CELL_SPAN * cellSize) / Math.min(getCanvasBounds().width, getCanvasBounds().height)
    const getCellsHorizontallyAcrossScreen = (zoom = boardData.view.zoom) => getCanvasBounds().width / getCellSize(zoom)
    const getCellsVerticallyAcrossScreen = (zoom = boardData.view.zoom) => getCanvasBounds().height / getCellSize(zoom)
    const getAspectRatio = () => canvasRef.current ? canvasRef.current.width / canvasRef.current.height : (16 / 9)
    const getCenterCell = (view = boardData.view) => new Selection(Math.round(view.coordinates.row + getCellsVerticallyAcrossScreen(view.zoom) / 2), Math.round(view.coordinates.col + getCellsHorizontallyAcrossScreen(view.zoom) / 2))
    const getViewArea = ( coordinates = boardData.view.coordinates, zoom = boardData.view.zoom ) => {
        const {row: viewRow, col: viewCol} = coordinates;
        const viewWidth = getCellsHorizontallyAcrossScreen(zoom)
        const viewHeight = getCellsVerticallyAcrossScreen(zoom)
        return new Area(viewRow, viewCol, viewWidth, viewHeight)
    }

    const anyCellsInView = () => {
        const viewBox = getViewArea()
        return selections.some(cell => viewBox.containsArea(cell))
    }

    const allCellsInView = () => {
        const viewBox = getViewArea()
        return selections.every(cell => viewBox.containsArea(cell))
    }

    const getViewRange = () => {
        const {row: rowStart, col: colStart} = boardData.view.coordinates
        const rowEnd = rowStart + getCanvasBounds().height / getCellSize()
        const colEnd = colStart + getCanvasBounds().width / getCellSize()
        return [Math.floor(rowStart), Math.floor(rowEnd), Math.floor(colStart), Math.floor(colEnd)]
    }

    const isInView = (selection) => {
        const [rowStart, rowEnd, colStart, colEnd] = getViewRange()
        return selection.row >= rowStart && selection.row < rowEnd && selection.col >= colStart && selection.col < colEnd
    }



    const isEmpty = (selections = displayedSelections.current) => selections.length == 0
    const isEqualSelection = (first, second) => first.row === second.row && first.col === second.col

    function centerCamera({row = 0, col = 0}, zoom = boardData.view.zoom) {
        alterData('view.coordinates', {
            row: row - getCellsVerticallyAcrossScreen(zoom) / 2,
            col: col - getCellsHorizontallyAcrossScreen(zoom) / 2
            })
    }

    function clear() {
        lastGeneration.current = ""
        alterData('selections', [])
      }

    function undo() {
        if (boardData.playback.enabled) {
            console.error("cannot undo during playback");
            return
        }

        const lastBoardState = boardData.popHistory();
        if (!lastBoardState) return
        dataDispatch({type: 'set state', newState: lastBoardState, id: boardData.id});
    }
  

    const isStable = (current = displayedSelections.current, last = lastGeneration.current) => current === last 

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
        const {row: coordinateRow, col: coordinateCol} = boardData.view.coordinates
        const col = Math.floor((event.clientX - bounds.x + (coordinateCol * getCellSize())) / getCellSize());
        const row = Math.floor((event.clientY - bounds.y + (coordinateRow * getCellSize())) / getCellSize());
        return new Selection(row, col)
    }
   
    const DragBrush = (event) => {
        if (!isDragging.current || !(editMode == 'draw' || editMode == 'erase') || movingSelectedArea.current) return
        const cell = getHoveredCell(event);
        const toEdit = getLine(lastHoveredCell.current, cell);
        if (editMode == 'erase') {
            const toEditSet = new Set(toEdit.map(cell => JSON.stringify(cell)))
            alterData("selections", removeDuplicates(selections.filter(cell => !toEditSet.has(JSON.stringify(cell)) )) )
        } else if (editMode == 'draw') {
            if (!isSelected(cell)) {
                alterData("selections", removeDuplicates(selections.concat(toEdit)) )
            }
        }
    }

    function fill(selection, depth = 0, selectionsToAdd = []) {
        if (depth > MAX_FILL_DEPTH) return

        const neighbors = shuffle(getAdjacentNeighbors(selection))
        neighbors.forEach(neighbor => {
            if (!isSelected(neighbor) && !selectionsToAdd.some(sel => sel.row === neighbor.row && sel.col === neighbor.col)) {
                selectionsToAdd.push(neighbor);
                fill(neighbor, depth + 1, selectionsToAdd)
            }
        })

        if (depth > 0)
            return 

        alterData('selections', selections.concat(...selectionsToAdd));
    }

    function getLine(firstPoint, secondPoint) {
        if (firstPoint == null || secondPoint == null) return []
        if (JSON.stringify(firstPoint) === JSON.stringify(secondPoint)) return [Selection.clone(firstPoint)];
        const {row: row1, col: col1} = firstPoint;
        const {row: row2, col: col2} = secondPoint;
        const intersections = []

        if (col1 === col2) {
            for (let row = Math.min(row1, row2); row <= Math.max(row1, row2); row++) {
                intersections.push(new Selection(Math.floor(row), Math.floor(col1)))
            }
        }
        else if (row1 === row2) {
            for (let col = Math.min(col1, col2); col <= Math.max(col1, col2); col++) {
                intersections.push(new Selection(Math.floor(row1), Math.floor(col)))
            }
        } else {
            const slope = (firstPoint.row - secondPoint.row) / (firstPoint.col - secondPoint.col)
            const yIntercept = row1 - (slope * col1);

            for (let col = Math.min(col1, col2); col <= Math.max(col1, col2); col++) {
                const row = (slope * col) + yIntercept;
                intersections.push(new Selection(Math.floor(row), Math.floor(col)));
            }

            for (let row = Math.min(row1, row2); row <= Math.max(row1, row2); row++) {
                const col = (row - yIntercept) / slope;
                intersections.push(new Selection(Math.floor(row), Math.floor(col)));
            }
        }   
        
        return removeDuplicates(intersections)
    }
    const drawLine = (firstPoint, secondPoint) => alterData("selections", removeDuplicates(selections.concat(getLine(firstPoint, secondPoint))))

    function getBox(firstPoint, secondPoint) {
        if (firstPoint == null || secondPoint == null) return []
        const {row: row1, col: col1} = firstPoint;
        const {row: row2, col: col2} = secondPoint;
        return [].concat(
            getLine(new Selection(Math.min(row1, row2), Math.min(col1, col2)), new Selection(Math.min(row1, row2), Math.max(col1, col2))),
            getLine(new Selection(Math.min(row1, row2), Math.min(col1, col2)), new Selection(Math.max(row1, row2), Math.min(col1, col2))),
            getLine(new Selection(Math.max(row1, row2), Math.max(col1, col2)), new Selection(Math.min(row1, row2), Math.max(col1, col2))),
            getLine(new Selection(Math.max(row1, row2), Math.max(col1, col2)), new Selection(Math.max(row1, row2), Math.min(col1, col2))),
        )
    }
    const drawBox = (firstPoint, secondPoint) => alterData("selections", removeDuplicates(selections.concat(getBox(firstPoint, secondPoint))))

    function getEllipse(firstPoint, secondPoint) {
        if (firstPoint == null || secondPoint == null) return []
        const {row: row1, col: col1} = firstPoint;
        const {row: row2, col: col2} = secondPoint;
        const centerCol = (col1 + col2) / 2
        const centerRow = (row1 + row2 ) / 2
        const horizontalRadius = Math.abs(col1 - col2) / 2;
        const verticalRadius = Math.abs(row1 - row2) / 2;
        const intersections = []

        if (firstPoint.col == secondPoint.col || firstPoint.row == secondPoint.row) {
            return getLine(firstPoint, secondPoint)
        }

        // const changeInX = (Math.abs(col1 - col2)) / (Selection.distanceBetween(firstPoint, secondPoint) * 2);
        // const changeInY = (Math.abs(row1 - row2)) / (Selection.distanceBetween(firstPoint, secondPoint) * 2);
        for (let col = Math.min(firstPoint.col, secondPoint.col); col <= Math.max(firstPoint.col, secondPoint.col); col += 1) {
            const evaluation = Math.sqrt(Math.pow(verticalRadius, 2) * (1  - (Math.pow(col - centerCol, 2) / Math.pow(horizontalRadius, 2) ) ))
            intersections.push(new Selection(Math.floor(centerRow + evaluation), Math.floor(col)));
            intersections.push(new Selection(Math.floor(centerRow - evaluation), Math.floor(col)));
        } 

        for (let row = Math.min(firstPoint.row, secondPoint.row); row <= Math.max(firstPoint.row, secondPoint.row); row += 1) {
            const evaluation = Math.sqrt(Math.pow(horizontalRadius, 2) * (1  - (Math.pow(row - centerRow, 2) / Math.pow(verticalRadius, 2) ) ))
            intersections.push(new Selection(Math.floor(row), Math.floor(centerCol + evaluation)));
            intersections.push(new Selection(Math.floor(row), Math.floor(centerCol - evaluation)));
        } 
        
        return removeDuplicates(intersections)
    }
    const drawEllipse = (firstPoint, secondPoint) => alterData("selections", removeDuplicates(selections.concat(getEllipse(firstPoint, secondPoint))))

    function isInBounds(inner = bounds, outer = getViewArea()) {
        if (inner == null || outer == null) return true;
        return inner.row >= outer.row && inner.col >= outer.col && inner.rightSide <= outer.rightSide && inner.bottomSide <= outer.bottomSide;
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
        const { view } = boardData
        const newCoordinates = { row: view.coordinates.row + rowOffset, col: view.coordinates.col + colOffset}
        lastMousePosition.current = getMousePositionInCanvas(event) 
        if (isInBounds(getViewArea(newCoordinates), bounds)) {
            alterData('view.coordinates', newCoordinates)
        }
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
        const { view } = boardData;
        lastMousePosition.current = getMousePositionInCanvas(event)

        const newZoom = view.zoom + zoomOffset;
        if (newZoom < (boardData.playback.enabled ? MIN_PLAYBACK_ZOOM : MIN_EDIT_ZOOM)) {
            console.log("Cannot zoom out any further than: ", (boardData.playback.enabled ? MIN_PLAYBACK_ZOOM : MIN_EDIT_ZOOM))
            return
        }

        const newCellSize = getCellSize(newZoom)
        const canvas = canvasRef.current;
        const changeInHorizontalCellSpan = getCellsHorizontallyAcrossScreen() - (canvas.width / newCellSize);
        const changeInVerticalCellSpan = getCellsVerticallyAcrossScreen() - (canvas.height / newCellSize);
        alterData('view', {
            coordinates: {
                row: view.coordinates.row + ( changeInVerticalCellSpan / 2 ),
                col: view.coordinates.col + ( changeInHorizontalCellSpan / 2)
            },
            zoom: newZoom
        })
        // alterData('view.coordinates', {row: centerCell.row - (canvas.height / newCellSize / 2), col: view.coordinates.col - (canvas.width / newCellSize / 2)})
    }

    
    const select = (centerSelection) => {
        const { pattern } = boardData
        if (editMode == 'erase') {
            alterData("selections", selections.filter(cell => JSON.stringify(cell) !== JSON.stringify(centerSelection)))
            // alterData("selections", selections.filter(sel => 
            // !pattern.some(patternCell => 
            // isEqualSelection(new Selection(patternCell.row + centerSelection.row, patternCell.col + centerSelection.col), sel))) )
        } else if (editMode == 'draw') {
            alterData("selections", selections.concat(centerSelection))
            // alterData("selections", selections.concat(...pattern.map(sel => new Selection(sel.row + centerSelection.row, sel.col + centerSelection.col))))
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

        alterData("selections", boardData.selections.map(sel => {
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
        alterData("selections", boardData.selections.map(sel => sel.isSelected ? new Selection(sel.row + newLocation.row - selectedArea.row, sel.col + newLocation.col - selectedArea.col) : new Selection(sel.row, sel.col)) )
        lastMousePosition.current = getMousePositionInCanvas(event)
    }

    const getBackgroundColor = () => {
        if (boardData.playback.enabled) {
            //  if (isStable() && !isEmpty() && boardData.playback.currentGeneration > 1) {
            //     return 'darkred'
            // }
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
        const getLineWidth = (bolded = true, zoom = boardData.view.zoom) => DEFAULT_GRID_LINE_WIDTH / ( zoom < ZOOM_SHRINK_GRID_LINES ? 2 : 1 ) * ( bolded ? 2 : 1)
        context.lineWidth = getLineWidth(false);
        const [rowStart, rowEnd, colStart, colEnd] = getViewRange()
        const cellSize = getCellSize()
        const { view } = boardData
        const currentBox = (row, col, width = 1, height = 1) => [(col - view.coordinates.col) * cellSize, (row - view.coordinates.row) * cellSize, cellSize * width, cellSize * height]

        JSON.parse(displayedSelections.current).forEach(selection => context.fillRect(...currentBox(selection.row, selection.col)) )

        context.beginPath()
        if (!boardData.playback.enabled && drawGrid) {
            for (let row = rowStart - 1; row < rowEnd + 1; row++) {
                if (row == 0) {
                    context.stroke();
                    context.beginPath();
                }

                context.moveTo(0, (row - view.coordinates.row) * cellSize);
                context.lineTo(canvas.width,  (row - view.coordinates.row) * cellSize)

                if (row == 0) {
                    context.lineWidth = getLineWidth(true);
                    context.stroke();
                    context.lineWidth = getLineWidth(false);
                    context.beginPath();
                }
            }

            for (let col = colStart - 1; col < colEnd + 1; col++) {
                if (col == 0) {
                    context.stroke();
                    context.beginPath();
                }

                context.moveTo((col - view.coordinates.col) * cellSize, 0)
                context.lineTo((col - view.coordinates.col) * cellSize, canvas.height)

                if (col == 0) {
                    context.lineWidth = getLineWidth(true);
                    context.stroke();
                    context.lineWidth = getLineWidth(false);
                    context.beginPath();
                }
            }   

            context.stroke();
        }

        context.globalAlpha = selectedArea.containsArea(lastMousePosition.current) ? 0.5 : 0.25
        context.fillRect(...currentBox(...selectedArea.info))
        context.globalAlpha = 1;
    }

    const drawMouseShadow = (event) => {
        const { pattern, view } = boardData
        const hoveredCell = getHoveredCell(event)
        if (boardData.playback.enabled || isEqualSelection(lastHoveredCell.current, hoveredCell)) return
        const context = getContext()
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        draw()
        context.fillStyle = 'white'
        const cellSize = getCellSize()
        const currentBox = (row, col) => [(col - view.coordinates.col) * cellSize, (row - view.coordinates.row) * cellSize, cellSize, cellSize]
        context.globalAlpha = 0.5
        
        if (editMode == "draw") {
            switch (brush.type) {
                case "pixel": context.fillRect(...currentBox(hoveredCell.row, hoveredCell.col)); break;
                case "pattern": pattern.forEach(cell => {
                context.fillRect(...currentBox(cell.row + hoveredCell.row, cell.col + hoveredCell.col))
                    }); break;
                case "line": getLine(brush.extra.lineStart, hoveredCell).forEach(cell => context.fillRect(...currentBox(cell.row, cell.col))); break;
                case "box": getBox(brush.extra.lineStart, hoveredCell).forEach(cell => context.fillRect(...currentBox(cell.row, cell.col))); break;
                case "ellipse": getEllipse(brush.extra.lineStart, hoveredCell).forEach(cell => context.fillRect(...currentBox(cell.row, cell.col))); break;
                default: context.fillRect(...currentBox(hoveredCell.row, hoveredCell.col)); break;
            }
        }
        
        
        context.globalAlpha = 1;
    }


    const observer = useRef(new ResizeObserver(() => {resizeCanvas(); draw()}));
    useEffect(() => {
        observer.current.disconnect()
        draw()
        observer.current = new ResizeObserver(() => {resizeCanvas(); draw()})
        observer.current.observe(document.documentElement)
        
        if (!canvasRef.current) return
        showDisplayBackToCenter(!anyCellsInView())
    })

    
    const frameRequested = useRef(false);
    const isAnimating = useRef(boardData.playback.enabled)
    useEffect(() => { 
        animationStartTime.current = Date.now() 
        isAnimating.current = boardData.playback.enabled
        
        if (boardData.playback.enabled) {
            alterData('selections', removeDuplicates(boardData.selections.map(cell => Selection.clone(cell))))
        } else {
            lastGeneration.current = ""
            frameRequested.current = false;
            setDisplayedSelections(JSON.stringify(boardData.selections))
            setCurrentGeneration(0)

            if (boardData.view.zoom < MIN_EDIT_ZOOM) {
                const centerCell = getCenterCell();
                alterData("view", { 
                    coordinates: {
                        row: centerCell.row - getCellsVerticallyAcrossScreen(MIN_EDIT_ZOOM) / 2,
                        col: centerCell.col - getCellsHorizontallyAcrossScreen(MIN_EDIT_ZOOM) / 2
                    },
                    zoom: MIN_EDIT_ZOOM
                })
            }
        }
        
      }, [boardData.playback.enabled])

      
      useEffect(() => {
          requestAnimationFrame( () => {
            function getNextTick() {
                if (isAnimating.current) {
                    if (Date.now() - lastTick.current > getMillisecondsPerTick()) {
                        const nextGeneration = renders.current.getNextFrame(displayedSelections.current) || ( JSON.stringify((getNextGeneration(JSON.parse(displayedSelections.current), selectionSet.current))) );
                        lastTick.current = Date.now()
                        lastGeneration.current = displayedSelections.current
                        if (isAnimating.current) {
                            frameRequested.current = false;
                            setDisplayedSelections(nextGeneration)
                            setCurrentGeneration(curr => curr + 1)
                        }
                    } else {
                        setTimeout(() => getNextTick(), getMillisecondsPerTick() - (Date.now() - lastTick.current))
                    }
                }
            }
            
            if (!frameRequested.current && boardData.playback.enabled) {
                frameRequested.current = true;
                getNextTick()
            } else {
                console.log('get next tick not called', !frameRequested.current, boardData.playback.enabled)
            }
         }
        )

    }, [boardData.playback.enabled, currentGeneration])

    useEffect(() => {
        if (!boardData.playback.enabled)
            setDisplayedSelections(JSON.stringify(boardData.selections))
    }, [boardData.selections])

    const keyEvents = [
        new KeyBinding({key: "Enter", onDown: () => alterData('playback.enabled', !boardData.playback.enabled)}),
        new KeyBinding({key: "Delete", onDown: () => clear()}),
        new KeyBinding({key: "c", onDown: () => clear()}),
        new KeyBinding({key: "-", onDown: () => alterData('view.zoom', boardData.view.zoom - 0.05)}),
        new KeyBinding({key: "=", onDown: () => alterData('view.zoom', boardData.view.zoom + 0.05)}),
        new KeyBinding({key: "UpArrow", onDown: () => alterData('view.coordinates.row', boardData.view.coordinates.row - 1)}),
        new KeyBinding({key: "LeftArrow", onDown: () => alterData('view.coordinates.col', boardData.view.coordinates.col - 1)}),
        new KeyBinding({key: "DownArrow", onDown: () => alterData('view.coordinates.row', boardData.view.coordinates.row + 1)}),
        new KeyBinding({key: "RightArrow", onDown: () => alterData('view.coordinates.col', boardData.view.coordinates.col + 1)}),
        new KeyBinding({key: "1", onDown: () => alterData('editMode', 'draw')}),
        new KeyBinding({key: "2", onDown: () => alterData('editMode', 'erase')}),
        new KeyBinding({key: "3", onDown: () => alterData('editMode', 'pan')}),
        new KeyBinding({key: "4", onDown: () => alterData('editMode', 'zoom')}),
        new KeyBinding({key: "5", onDown: () => alterData('editMode', 'select')}),
        new KeyBinding({key: "Escape", onDown: () => removeCallback?.() }),
        new KeyBinding({key: "Shift", onDown: () => alterData('editMode', 'pan'), onUp: () => alterData('editMode', 'draw')}),
        new KeyBinding({key: "Control", onDown: () => alterData('editMode', 'zoom'), onUp: () => alterData('editMode', 'draw')}),
        new KeyBinding({key: "Alt", onDown: () => alterData('editMode', 'select'), onUp: () => alterData('editMode', 'draw')}),
        new KeyBinding({key: "r", onDown: () => randomizeSelections() }),
        new KeyBinding({key: 'z', onControl: true, onDown: undo}),
        new KeyBinding({key: 'c', onControl: true, onDown: copy}),
        new KeyBinding({key: 'v', onControl: true, onDown: paste}),
        new KeyBinding({key: 's', onControl: true, onDown: paste}),
        // new KeyBinding({key: 'BackSpace', onDown: })
    ]

    function copy() {
        console.log('copy');
        if (selectedArea.area <= 0) return
        if (boardData.playback.enabled) return

        const center = new Selection(Math.round(selectedArea.row + selectedArea.height / 2), Math.round(selectedArea.col + selectedArea.width / 2))
        const copied = selections.filter(cell => selectedArea.containsArea(cell)).map(cell => new Selection(cell.row - center.row, cell.col - center.col))
        localStorage.setItem(`Copy Data`, JSON.stringify(copied));
    }

    function paste() {
        console.log('paste');
        if (localStorage.getItem(`Copy Data`) == null) return
        if (boardData.playback.enabled) return

        
        const focusCell = lastHoveredCell.current;
        const toPaste = JSON.parse(localStorage.getItem(`Copy Data`)
        ).map(cell => new Selection(cell.row + focusCell.row, cell.col + focusCell.col));
        alterData('selections', selections.concat(...toPaste));
    }

    // function save() {
    //     if (selectedArea.area > 0) {

    //     } else {

    //     }
    // }

    function keyListener(keyEvent) {
        // console.log(keyEvent.key)
        keyEvents.forEach(binding => binding.testAndRunDown(keyEvent))
    }

    function keyUpListener(keyEvent) {
        // console.log(' on up ', keyEvent)
        keyEvents.forEach(binding => binding.testAndRunUp(keyEvent))
    }

    function mouseDownListener(mouseEvent) {
        boardData.pushHistory();
        isDragging.current = true;
        startAreaSelection(mouseEvent)
        if (!(editMode == 'draw' || editMode == 'erase')) return

        // if (clickedSelectedArea(mouseEvent)) {
        //     movingSelectedArea.current = true;
        //     moveSelectedArea(mouseEvent); return;
        // }

        if (clickedSelectedArea(mouseEvent) && mouseEvent.button == 2) {
            setSelectedArea(new Area(0, 0, 0, 0));
        }


        
        if (!boardData.playback.enabled && editable) {
            if (editMode == "erase") {
                select(getHoveredCell(mouseEvent))
            } else {
                switch(brush.type) {
                    case 'pixel': select(getHoveredCell(mouseEvent)); break;
                    case 'fill': fill(getHoveredCell(mouseEvent)); break;
                    case 'box':
                    case 'ellipse':
                    case 'line': setBrush({...brush, extra: {...brush.extra, lineStart: getHoveredCell(mouseEvent)}}); break;
                }
            }
        }
    }

    function mouseMoveListener(mouseEvent) {
        if (editable) {
            if (!boardData.playback.enabled && (brush.type == 'pixel' || brush.type == 'pattern' || editMode == "erase")) {
                DragBrush(mouseEvent); 
            }
            drawMouseShadow(mouseEvent); 
        }

        const hoveredCell = getHoveredCell(mouseEvent)
        if (selectedArea.containsArea(hoveredCell)) {
            setCanvasTooltip("Ctrl C to copy")
        } else {
            if (canvasTooltip !== "")
                setCanvasTooltip("")
        }

        if (movable) {
            mousePan(mouseEvent); 
            mouseZoom(mouseEvent); 
        }
        selectingArea(mouseEvent);
        moveSelectedArea(mouseEvent);
        lastHoveredCell.current = getHoveredCell(mouseEvent)
    }


    const onInputStop = (event) => {
        lastMousePosition.current = {x: 0, y: 0}
        isDragging.current = false
        movingSelectedArea.current = false;
        setSelectedArea(new Area(Math.round(selectedArea.row), Math.round(selectedArea.col), Math.round(selectedArea.width), Math.round(selectedArea.height)))
        // alterData('selections', selections.map(sel => new Selection(Math.round(sel.row), Math.round(sel.col))) )
    }

    const onContextMenu = (event) => {
        event.preventDefault();

        onInputStop();
    }
    
    const onMouseUp = (event) => {
        // console.log("MOUSE UP");
        if (boardData.editMode == 'draw') {
            switch (brush.type) {
                case "line": drawLine(brush.extra.lineStart, getHoveredCell(event)); break;
                case "box": drawBox(brush.extra.lineStart, getHoveredCell(event)); break;
                case "ellipse": drawEllipse(brush.extra.lineStart, getHoveredCell(event)); break;
            }
        }
        brush.extra.lineStart = undefined;
        onInputStop(event);
    }

    const onMouseEnter = (event) => {
        event.target.focus();
    }

    function randomizeSelections() {
      const randomized = []
      const [rowStart, rowEnd, colStart, colEnd] = getViewRange()
      for (let i = 0; i < (rowEnd - rowStart) * (colEnd - colStart) / 2; i++) {
        randomized.push(new Selection(rowStart + Math.round(Math.random() * rowEnd), colStart + Math.round(Math.random() * colEnd)))
      }
      alterData('selections', randomized)
    }   

    function requestRender(startingJSON, generationCount = 0) {
        setRenderStatus(current => {
            return {
                ...current,
                queued: true,
                requested: {
                    ...current.requested,
                    currentGeneration: startingJSON,
                    generationCount: generationCount
                }
            }
        })
    }


    const lastRenderTime = useRef(currentTime());
    const timesBetweenFrames = useRef([])
    useEffect( () => {
        requestAnimationFrame( () => {
        if (renderStatus.queued == false ||
            renderStatus.requested.generationCount <= 0 || 
            renderStatus.percentage >= 100 ||
            renderStatus.requested.currentGeneration in renders.current.frames ||
            renderStatus.requested.currentGenerationCount > renderStatus.requested.generationCount) {
            setRenderStatus(initialRenderStatus)
            setShowingRenderPrompt(false)
            timesBetweenFrames.current = []
            return
        } else {
            if (renderStatus.requested.currentGenerationCount === 0) {
                renders.current.starters.push(renderStatus.requested.currentGeneration)
                lastRenderTime.current = currentTime()
            }

            timesBetweenFrames.current.push( ( currentTime() - lastRenderTime.current ) * 1000 )
            console.log(timesBetweenFrames.current)
            console.log("recorded time: ", millisecondsToTimeString(timesBetweenFrames.current.reduce((acc, curr) => acc + curr, 0)))

            const nextGenerationJSON = JSON.stringify( (getNextGeneration(JSON.parse(renderStatus.requested.currentGeneration)) ) )
            renders.current.frames[renderStatus.requested.currentGeneration] = nextGenerationJSON
            const currentPercentage = Math.round( ( (renderStatus.requested.currentGenerationCount + 1)  / renderStatus.requested.generationCount) * 100)
            lastRenderTime.current = currentTime()
            setTimeout( () => setRenderStatus( current => { return {...current,
                percentage: currentPercentage,
                timeToCompletion: average(timesBetweenFrames.current) * (current.requested.generationCount - current.requested.currentGenerationCount) * 2,
                requested: {
                    ...current.requested,
                    currentGenerationCount: current.requested.currentGenerationCount + 1,
                    currentGeneration: nextGenerationJSON
                    }

                    }
                }
            ), AFK ? 0 : 10);
        }  } )

    }, [renderStatus] )


    const [showBoardDataDisplay, setShowBoardDataDisplay] = useState(false)
    const [showingDrawingOptions, setShowingDrawingOptions] = useState(false)
    const [showingErasingOptions, setShowingErasingOptions] = useState(false)

    let cursor = 'auto'
    switch (editMode) {
        case 'draw': switch (brush.type) {
            case 'pixel':
            case 'pattern': cursor = 'url("https://img.icons8.com/ios-glyphs/30/000000/pencil-tip.png"), crosshair'; break;
            case 'fill': cursor = 'url("https://www.pinclipart.com/picdir/big/534-5348253_bucket-icon-png-ms-paint-paint-bucket-tool.png"), crosshair'; break;
            default: cursor = 'crosshair'; break;
        } break;
        case 'zoom': cursor = 'url("https://img.icons8.com/external-royyan-wijaya-detailed-outline-royyan-wijaya/24/000000/external-magnifying-glass-interface-royyan-wijaya-detailed-outline-royyan-wijaya.png"), nwse-resize'; break;
        case 'erase': cursor = 'url("https://img.icons8.com/material-rounded/24/00000/eraser.png"), crosshair'; break;
        case 'pan': cursor = 'move'; break;
        case 'select': cursor = 'crosshair'; break;
    }

  return (
    <div className='game-board' ref={boardRef}>
            <canvas className='game-canvas' ref={canvasRef} onMouseDown={mouseDownListener} onMouseUp={onMouseUp} onContextMenu={onContextMenu} onMouseEnter={onMouseEnter} onMouseLeave={onInputStop} onMouseMove={mouseMoveListener} onKeyDown={keyListener} onKeyUp={keyUpListener} tabIndex={0} style={{cursor: cursor}}/>
        { boardData.playback.enabled && <div className='animating-ui'>
                <h3 className='generation-display'> Current Generation: { currentGeneration } </h3>
                <div className='flex-column'>
                    <label htmlFor="speed-slider"> FPS: { boardData.settings.tickSpeed } </label>
                    <input id="speed-slider" type='range' min='1' max='100' value={boardData.settings.tickSpeed} onChange={(event) => alterData('settings.tickSpeed', Number(event.target.value))} />
                </div>

                <button onClick={() => alterData('settings.isScreenFit', !boardData.settings.isScreenFit)} className={`game-tool ${boardData.settings.isScreenFit ? 'selected' : 'unselected'}`}> Fit Screen </button>
             </div> }
            
        { displayBackToCenter && <button className='flex-row back-to-center-button' onClick={centerCamera}> <AiFillCloseCircle /> <span> Back <br/> To <br/> Center <br /> </span> </button> }
        
        { canvasTooltip !== "" && <ToolTip> { canvasTooltip } </ToolTip>}

        { showingRenderPrompt && <div className='render-prompt'>
                <h3> How Many Generations: </h3>
                <input ref={renderRequestRef} /> 
                <button onClick={() => {
                    if (isNaN(renderRequestRef?.current?.value)) {
                        console.error("Invalid number value entered for the number of generations to render");
                        setShowingRenderPrompt(false); return;
                    }

                    const requestedGenerations = Number(renderRequestRef?.current?.value)
                    
                    if (requestedGenerations <= 0) {
                        console.error("Must render 1 or more generations");
                        setShowingRenderPrompt(false); return;
                    }

                    requestRender(JSON.stringify(boardData.selections), requestedGenerations)
                    }}> Submit </button>

                    { renderStatus.percentage > 0 && <div className='progress-bar'>
                        <span className='progress-bar-percentage'> { renderStatus.percentage }% </span> 
                        <span className='progress-bar-ETA'> { millisecondsToTimeString(renderStatus.timeToCompletion) } </span> 
                        <div className="progress-bar-status" style={{width: `${renderStatus.percentage}%` }}/> 
                        </div>}
            </div> }
        
        {showingToolBar && <div className='game-toolbar flex-row'>
            
            <div className="drawing-options" onMouseLeave={() => setShowingDrawingOptions(false)}>
                <button onClick={() => editMode != 'draw' ? alterData('editMode', 'draw') : ''} onMouseEnter={() => setShowingDrawingOptions(true)}  className={`game-tool ${boardData.editMode == 'draw' ? 'selected' : 'unselected'}`}> <FaBrush /> <ToolTip> 1: Draw </ToolTip> </button>
                {showingDrawingOptions && 
                <div className="drawing-options-menu">

                    <div className="flex-column"> 
                        <button onClick={() => setBrush({...brush, type: 'pixel'})} className={`game-tool ${brush.type == 'pixel' ? 'selected' : 'unselected'}`}> Pixel <ToolTip> Default Pixel Tool </ToolTip> </button>
                        <button onClick={() => setBrush({...brush, type: 'line'})} className={`game-tool ${brush.type == 'line' ? 'selected' : 'unselected'}`}> Line <ToolTip> Line Tool </ToolTip> </button>
                        <button onClick={() => setBrush({...brush, type: 'box'})} className={`game-tool ${brush.type == 'box' ? 'selected' : 'unselected'}`}> Box <ToolTip> Box Tool </ToolTip> </button>
                        <button onClick={() => setBrush({...brush, type: 'ellipse'})} className={`game-tool ${brush.type == 'ellipse' ? 'selected' : 'unselected'}`}> Ellipse <ToolTip> Ellipse Tool </ToolTip> </button>
                        <button onClick={() => setBrush({...brush, type: 'fill'})} className={`game-tool ${brush.type == 'fill' ? 'selected' : 'unselected'}`}> Fill <ToolTip> Fill Tool </ToolTip> </button>
                        <button onClick={() => setBrush({...brush, type: 'pattern'})} className={`game-tool ${brush.type == 'pattern' ? 'selected' : 'unselected'}`}> Pattern <ToolTip> Pattern Tool </ToolTip> </button>
                    </div>

                    <div className="flex-column"> 
                        <button onClick={() => setBrush({...brush, paint: 'cell'})} className={`game-tool ${brush.paint == 'cell' ? 'selected' : 'unselected'}`}> Cell <ToolTip> Default Cell Paint </ToolTip> </button>
                        <button onClick={() => setBrush({...brush, paint: 'wall'})} className={`game-tool ${brush.paint == 'wall' ? 'selected' : 'unselected'}`}> Wall <ToolTip> Wall Paint </ToolTip> </button>
                    </div>

                </div> }
            </div>

            <div className="erasing-options" onMouseLeave={() => setShowingErasingOptions(false)}>
                <button onClick={() => editMode != 'erase' ? alterData('editMode', 'erase') : ''} className={`game-tool ${boardData.editMode == 'erase' ? 'selected' : 'unselected'}`} onMouseEnter={() => setShowingErasingOptions(true)}> <FaEraser /> <ToolTip> 2: Erase </ToolTip> </button>
                {showingErasingOptions && 
                <div className="erasing-options-menu">
                    <h2> Brush Size: </h2> 
                    <input type="number" value={brush.size} onChange={(event) => setBrush({...brush, size: Number(event.target.value)})} />
                </div> }
            </div>

            <button onClick={() => editMode != 'pan' ? alterData('editMode', 'pan') : ''} className={`game-tool ${boardData.editMode == 'pan' ? 'selected' : 'unselected'}`}> <FaArrowsAlt /> <ToolTip> 3 (Shift + Drag): Pan </ToolTip> </button>
            <button onClick={() => editMode != 'zoom' ? alterData('editMode', 'zoom') : ''} className={`game-tool ${boardData.editMode == 'zoom' ? 'selected' : 'unselected'}`}>  <FaSearch /> <ToolTip> 4 (Ctrl + Drag): Zoom </ToolTip> </button>
            <button onClick={() => editMode != 'select' ? alterData('editMode', 'select') : ''} className={`game-tool ${boardData.editMode == 'select' ? 'selected' : 'unselected'}`}> <BsBoundingBox /> <ToolTip> 5 (Alt + Drag): Select </ToolTip> </button>
            <button onClick={() => alterData( "playback.enabled", !boardData.playback.enabled )} className={`game-tool ${boardData.playback.enabled ? "selected" : 'unselected'}`}> <FaPlay /> <ToolTip> Enter: Play </ToolTip> </button>
            {/* <button> <FaBackspace /> </button> */}
            <button onClick={clear} className={`game-tool`}> <FaRegTrashAlt /> <ToolTip> C: Clear </ToolTip> </button> 
            <button onClick={undo} className={`game-tool`}> <FaUndo /> <ToolTip> Ctrl + Z: Undo </ToolTip> </button> 
            <button onClick={() => setShowingRenderPrompt(!showingRenderPrompt)} className={`game-tool`}> <FaCamera /> <ToolTip> R: Render </ToolTip> </button> 

            <div className='flex-column'>
                <button onClick={() => setShowBoardDataDisplay(!showBoardDataDisplay)} className={`game-tool ${showBoardDataDisplay ? 'selected' : 'unselected'}`}> <FaChevronCircleDown />  <ToolTip> Board Data </ToolTip> </button>

                { showBoardDataDisplay && 
                <div className='game-display-information'>
                    <div className='coordinate-display flex-column' >
                        View <br/>
                        Row: <span> {Math.round(view.coordinates.row * 100) / 100} </span> <br/>
                        Col: <span> {Math.round(view.coordinates.col * 100) / 100} </span> <br/>
                    </div>

                    <label htmlFor='zoom-input'> Zoom: {Math.round(view.zoom * 100) / 100} </label>
                    <input type="range" id='zoom-input' min="0.05" max='3' step="0.05" value={view.zoom} onChange={(event) => alterData('view.zoom', Number(event.target.value)) }/>
                </div> } 
        </div>
            <button onClick={() => removeCallback?.()} className={`game-tool`}> <FaWindowClose /> <ToolTip> Esc: Exit </ToolTip> </button> 
        </div>}
    </div>
  )
}

