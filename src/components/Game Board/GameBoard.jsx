import {useRef, useState, useEffect, useContext, useTransition} from 'react'

import { Area } from "../../classes/Area";
import { Selection } from "../../classes/Selection";
import { KeyBinding } from "../../classes/KeyBinding";
import { Pattern } from "../../classes/Pattern";


import { FaArrowsAlt, FaEraser, FaBrush, FaRegTrashAlt, FaSearch, FaPlay, FaChevronCircleDown, FaWindowClose, FaUndo, FaCamera } from "react-icons/fa"
import { BsBoundingBox, BsClipboardData, BsFileBreakFill } from "react-icons/bs"
import { AiFillCloseCircle } from "react-icons/ai"
import "./gameboard.css"
import { ToolTip } from '../ToolTip/ToolTip'
import { shuffle, cloneDeep } from 'lodash'
import { getLine, getBox, getEllipse, mirrorOverX, mirrorOverY, getNextGeneration, removeDuplicates, getAdjacentNeighbors, equalSelectionLists, rotateSelections90, millisecondsToTimeString, average, currentTime, translateSelectionsAroundPoint } from '../../functions'
import { AlertContext, gpu, PatternContext, RenderContext } from '../../App'
import { ContextMenu } from '../Context Menu/ContextMenu'
import { PatternEditor } from '../Pattern Editor/PatternEditor'
import { isCompositeComponent } from 'react-dom/test-utils'
import { isConstructorDeclaration } from 'typescript';
// import { drawCanvas } from '../functions/gpufunctions.js';

//edit modes: draw, erase, pan, zoom, select
const DEFAULT_SCREEN_CELL_SPAN = 8;
const MAX_FILL_DEPTH = 100;
const MAX_CELL_WANDER_DISTANCE = 1000;
const MIN_EDIT_ZOOM = 0.001;
const MIN_PLAYBACK_ZOOM = 0.001;

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
    
    export const GameBoard = ( { boardData, boardDataDispatch, editable = true, closable = true, bounds = null, showToolBar = true, movable = true, drawGrid = true, initialViewArea = null, alwaysCenter = false } ) => {

        const editModes = [];

        const currentBoardData = useRef(boardData);
        useEffect( () => {
            currentBoardData.current = cloneDeep(boardData);
        }, [boardData])

        const isMounted = useRef(false);

        const alterData = (accessor, newValue) => { 
            const keys = accessor.split(".")
        let currentProperty = currentBoardData.current;
        while (keys.length > 1) {
            currentProperty = currentProperty[keys.shift()];
        }
        currentProperty[keys.shift()] = newValue;
        boardDataDispatch({ type: 'alter', id: boardData.id, request: { accessor: accessor, newValue: newValue} })
     }
    const removeCallback = () => { if (closable) { boardDataDispatch({type: 'remove', id: boardData.id}) } }
    const renders = useContext(RenderContext)
    const [savedPatterns, savedPatternsDispatch ] = useContext(PatternContext) 
    const [renderStatus, setRenderStatus] = useState(initialRenderStatus)
    const sendAlert = useContext(AlertContext)

    function focusCameraOnArea(area) {
        const newZoom = Math.min(getZoomFromCellsHorizontallyAcrossScreen(area.width), getZoomFromCellsVerticallyAcrossScreen(area.height))
        const centerCell = area.center;
        // const centerCell = new Selection(Math.round(average(currentBoardData.current.selections.map(cell => cell.row))) || 0, Math.round(average(currentBoardData.current.selections.map(cell => cell.col))) || 0)
        alterData("view", { 
            coordinates: {
                row: centerCell.row - getCellsVerticallyAcrossScreen(newZoom) / 2,
                col: centerCell.col - getCellsHorizontallyAcrossScreen(newZoom) / 2
            },
            zoom: newZoom
        })
    }


    useEffect( () => {
        if (initialViewArea !== null) {
            focusCameraOnArea(initialViewArea)
        } else {
            centerCamera({row: 0, col: 0})
        }

    }, [])

    const mouseInBoard = useRef(false);
    const canvasRef = useRef()
    const boardRef = useRef()
    const renderRequestRef = useRef()
    const [currentGeneration, setCurrentGeneration] = useState(0);
    const [selectedArea, setSelectedArea] = useState(new Area(0, 0, 0, 0));
    const [showingBackToCenterDisplay, setShowingBackToCenterDisplay] = useState(false);
    // const [tempSelections, setTempSelections] = useState([]);
    const [canvasTooltip, setCanvasTooltip] = useState("")
    const [showingRenderPrompt, setShowingRenderPrompt] = useState(false)
    const [showingToolBar, setShowingToolBar] = useState(showToolBar)
    const [cursor, setCursor] = useState('');
    const [isPending, startTransition] = useTransition()

    
    const displayedSelections = useRef(JSON.stringify(currentBoardData.current.selections));
    const selectionSet = useRef(new Set())
    const setDisplayedSelections = (value) => {
        displayedSelections.current = value;
        selectionSet.current = new Set(JSON.parse(displayedSelections.current).map(cell => JSON.stringify(cell)))
        draw();
    }



    const isAlive = (selection) => selectionSet.current.has(JSON.stringify(selection))
    
    const resizeCanvas = () => {
        if (canvasRef.current == null) return
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
    const getCanvasBounds = () => canvasRef?.current?.getBoundingClientRect()
    const getCellSize = (zoom = boardData.view.zoom) => Math.min(getCanvasBounds().width, getCanvasBounds().height) * (zoom / DEFAULT_SCREEN_CELL_SPAN) //10 is the default span for the viewbox
    const getZoomFromCellSize = (cellSize) => (DEFAULT_SCREEN_CELL_SPAN * cellSize) / Math.min(getCanvasBounds().width, getCanvasBounds().height)
    const getCellsHorizontallyAcrossScreen = (zoom = boardData.view.zoom) => getCanvasBounds().width / getCellSize(zoom)
    const getCellsVerticallyAcrossScreen = (zoom = boardData.view.zoom) => getCanvasBounds().height / getCellSize(zoom)

    const getZoomFromCellsVerticallyAcrossScreen = (numOfCells) => {
        const DEFAULT_VERTICAL_CELL_SPAN = getCellsVerticallyAcrossScreen(1)
        return (DEFAULT_VERTICAL_CELL_SPAN / numOfCells) || DEFAULT_VERTICAL_CELL_SPAN
    }

    const getZoomFromCellsHorizontallyAcrossScreen = (numOfCells) => {
        const DEFAULT_HORIZONTAL_CELL_SPAN = getCellsHorizontallyAcrossScreen(1)
        return (DEFAULT_HORIZONTAL_CELL_SPAN / numOfCells) || DEFAULT_HORIZONTAL_CELL_SPAN
    }

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
        return currentBoardData.current.selections.some(cell => viewBox.intersectsOrContains(cell))
    }

    const allCellsInView = () => {
        const viewBox = getViewArea()
        return currentBoardData.current.selections.every(cell => viewBox.intersectsOrContains(cell))
    }

    function getEraserBox(center, size) {
        if (size === 1) {
            return Area.corners([center]);
        }
        return new Area(Math.floor(center.row - size / 2), Math.floor(center.col - size / 2), size, size)
    }


    const isEmpty = (selections = displayedSelections.current) => selections.length == 0
    const isEqualSelection = (first, second) => first.row === second.row && first.col === second.col

    function centerCamera({row = 0, col = 0}, zoom = boardData.view.zoom) {
        alterData('view.coordinates', {
            row: row - getCellsVerticallyAcrossScreen(zoom) / 2,
            col: col - getCellsHorizontallyAcrossScreen(zoom) / 2
            })
    }

    function putAllCellsInView() {

    }

    function clear() {
        // boardData.pushHistory();
        console.error("TODO: FIX BOARD DATA PUSH HISTORY")
        lastGeneration.current = ""
        alterData('selections', [])
      }

      //TODO: FIX THIS
    function undo() {
        console.error("TODO: FIX UNDO")
        // if (boardData.playback.enabled) {
        //     console.error("cannot undo during playback");
        //     return
        // }

        // const lastBoardState = boardData.popHistory();
        // if (!lastBoardState) return
        // boardDataDispatch({type: 'set state', newState: lastBoardState, id: boardData.id});
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
        const {row: coordinateRow, col: coordinateCol} = currentBoardData.current.view.coordinates
        const col = Math.floor((event.clientX - bounds.x + (coordinateCol * getCellSize())) / getCellSize());
        const row = Math.floor((event.clientY - bounds.y + (coordinateRow * getCellSize())) / getCellSize());
        return new Selection(row, col)
    }

    function getSelectionsInArea(area) {
        return currentBoardData.current.selections.filter(cell => area.intersectsOrContains(cell)).map(cell => Selection.clone(cell))
    }

    function DragErase(event) {
        if (!isDragging.current ||  currentBoardData.current.editMode != 'erase' || movingSelectedArea.current) return
        const cell = getHoveredCell(event);
        const movementLine = getLine(cell, lastHoveredCell.current)
        const forbiddenArea = movementLine.map(cell => getEraserBox(cell, currentBoardData.current.eraser.size))
        alterData("selections", currentBoardData.current.selections.filter(cell =>  !forbiddenArea.some(area => area.intersectsOrContains(cell))))
    }
   
    const DragBrush = (event) => {
        if (!isDragging.current || currentBoardData.current.editMode != 'draw' || movingSelectedArea.current) return
        const cell = getHoveredCell(event);
        const drawingLine = getLine(lastHoveredCell.current, cell)
        let toEdit = drawingLine;
        switch (boardData.brush.type) {
            case "pattern": const translatedPatternSelections = translateSelectionsAroundPoint(boardData.pattern.selections, cell);
            const lastTranslatedPatternSelections = translateSelectionsAroundPoint(boardData.pattern.selections, lastHoveredCell.current);
            for (let i = 0; i < translatedPatternSelections.length; i++) {
                toEdit.push(...getLine(lastTranslatedPatternSelections[i], translatedPatternSelections[i]));
            }
            toEdit = removeDuplicates(toEdit); break;
            default: toEdit = drawingLine;
        }
        alterData("selections", removeDuplicates(boardData.selections.concat(toEdit)) )
    }

    function fill(selection, depth = 0, selectionsToAdd = []) {
        if (depth > MAX_FILL_DEPTH) return

        const neighbors = shuffle(getAdjacentNeighbors(selection))
        neighbors.forEach(neighbor => {
            if (!isAlive(neighbor) && !selectionsToAdd.some(sel => sel.row === neighbor.row && sel.col === neighbor.col)) {
                selectionsToAdd.push(neighbor);
                fill(neighbor, depth + 1, selectionsToAdd)
            }
        })

        if (depth > 0)
            return 

        alterData('selections', selections.concat(...selectionsToAdd));
    }

    const drawLine = (firstPoint, secondPoint) => alterData("selections", removeDuplicates(currentBoardData.current.selections.concat(getLine(firstPoint, secondPoint))))
    const drawBox = (firstPoint, secondPoint) => alterData("selections", removeDuplicates(currentBoardData.current.selections.concat(getBox(firstPoint, secondPoint))))
    const drawEllipse = (firstPoint, secondPoint) => alterData("selections", removeDuplicates(currentBoardData.current.selections.concat(getEllipse(firstPoint, secondPoint))))

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

    function erase(centerSelection) {
        const eraseArea = getEraserBox(centerSelection, boardData.eraser.size);
        alterData("selections", selections.filter(cell => !eraseArea.intersectsOrContains(cell)))
    }

    function select(centerSelection) {
        const translatedPatternSelections = translateSelectionsAroundPoint(boardData.pattern.selections, centerSelection)
        switch (boardData.brush.type) {
            case "pattern": alterData("selections", removeDuplicates(selections.concat(translatedPatternSelections))); break;
            default: alterData("selections", removeDuplicates(selections.concat(centerSelection)))
        }
    }

    const selectedAreaAnchor = useRef(new Selection(0, 0))
    const mouseInSelectedArea = event => selectedArea.intersectsOrContains(getHoveredCell(event));
    const mouseOnEdgeOfSelectedArea = event => selectedArea.isSelectionOnEdge(getHoveredCell(event))
    const moveAnchorBasedOnClick = event => {
        const [topEdge, leftEdge, bottomEdge, rightEdge] = selectedArea.getEdgeAreas();
        const hoveredCell = getHoveredCell(event);
        if (topEdge.intersectsOrContains(hoveredCell)) {
            selectedAreaAnchor.current = selectedArea.bottomRight;
        } else if (leftEdge.intersectsOrContains(hoveredCell)) {
            selectedAreaAnchor.current = selectedArea.bottomRight;
        } else if (bottomEdge.intersectsOrContains(hoveredCell)) {
            selectedAreaAnchor.current = selectedArea.topLeft;
        } else if (rightEdge.intersectsOrContains(hoveredCell)) {
            selectedAreaAnchor.current = selectedArea.topLeft;
        }
    }

    const startAreaSelection = (event) => {
        if (editMode != 'select') return
        const hoveredCell = getHoveredCell(event)
        selectedAreaAnchor.current = hoveredCell;
        alterData("selections", currentBoardData.current.selections.map(cell => Selection.clone({...cell, isSelected: false})))
        setSelectedArea(new Area(hoveredCell.row, hoveredCell.col, 1, 1))
    }

    const selectingArea = (event) => {
        if (editMode != 'select' || !isDragging.current || movingSelectedArea.current) return

        const hoveredCell = getHoveredCell(event)
        const anchor = selectedAreaAnchor.current
        setSelectedArea(new Area(
            Math.min(hoveredCell.row, anchor.row),
            Math.min(hoveredCell.col, anchor.col), 
            Math.abs(hoveredCell.col - anchor.col),
            Math.abs(hoveredCell.row - anchor.row)
        ))

        alterData("selections", currentBoardData.current.selections.map(sel => {
            const copy = Selection.clone(sel)
            if (selectedArea.intersectsOrContains(copy)) {
                copy.isSelected = true;
                console.log("selected area selects: ", copy)
            }
            return copy;
        }))
        console.log(currentBoardData.current.selections.filter(cell => cell.isSelected))

    }

    const moveSelectedArea = event => {
        if (editMode != 'select' || !movingSelectedArea.current) return
        const {x: lastX, y: lastY} = lastMousePosition.current
        if (lastX == 0 && lastY == 0) {
            lastMousePosition.current = getMousePositionInCanvas(event); return;
        }

        console.log("moving selected area");
        const {x: currentX, y: currentY} = getMousePositionInCanvas(event)
        const colOffset = (currentX - lastX) / getCellSize();
        const rowOffset = (currentY - lastY) / getCellSize();
        const newLocation = new Area(selectedArea.row + rowOffset, selectedArea.col + colOffset, selectedArea.width, selectedArea.height)
        selectedAreaAnchor.current = newLocation.topLeft;
        setSelectedArea(newLocation)
        console.log(currentBoardData.current.selections.filter(cell => cell.isSelected))
        alterData("selections", currentBoardData.current.selections.map(cell => cell.isSelected ? Selection.clone({...cell, row: cell.row + rowOffset, col: cell.col + colOffset}) : Selection.clone(cell)) )
    }

    async function draw() {
        const canvas = canvasRef.current

        // drawCanvas.setOutput([canvas.width, canvas.height]);
        // const drawnCanvas = drawCanvas()




        if (!canvasRef.current) return
        const context = getContext()
        canvas.style.backgroundColor = boardData.playback.enabled ? 'black' : ''
        context.fillStyle = 'white'
        context.strokeStyle = 'black'
        const cellSize = getCellSize();
        const getLineWidth = (bolded = true, zoom = boardData.view.zoom) => (cellSize / 10) * ( bolded ? 2 : 1)
        context.lineWidth = getLineWidth(false);
        const viewArea = getViewArea();
        const { view } = boardData
        const currentBox = ({row, col, width = 1, height = 1}) => [(col - view.coordinates.col) * cellSize, (row - view.coordinates.row) * cellSize, cellSize * width, cellSize * height]
        context.clearRect(0, 0, canvas.width, canvas.height);
        const parsedCellData = JSON.parse(displayedSelections.current)

        parsedCellData.forEach(cell => context.fillRect(...currentBox(cell)) )

        context.beginPath()
        if (!boardData.playback.enabled && drawGrid) {
            for (let row = Math.floor(viewArea.row - 1); row < viewArea.bottomSide + 1; row++) {
                if (row == 0) {
                    context.stroke();
                    context.beginPath();
                }

                context.moveTo(0, (row - viewArea.row) * cellSize);
                context.lineTo(canvas.width,  (row - viewArea.row) * cellSize)

                if (row == 0) {
                    context.lineWidth = getLineWidth(true);
                    context.stroke();
                    context.lineWidth = getLineWidth(false);
                    context.beginPath();
                }
            }

            for (let col = Math.floor(viewArea.col - 1); col < viewArea.rightSide + 1; col++) {
                if (col == 0) {
                    context.stroke();
                    context.beginPath();
                }

                context.moveTo((col - viewArea.col) * cellSize, 0)
                context.lineTo((col - viewArea.col) * cellSize, canvas.height)

                if (col == 0) {
                    context.lineWidth = getLineWidth(true);
                    context.stroke();
                    context.lineWidth = getLineWidth(false);
                    context.beginPath();
                }
            }   
            context.stroke();
        }   

        context.setLineDash([1, 1])
        context.strokeStyle = 'lightgreen'
        context.lineWidth = 2;
        parsedCellData.filter(cell => cell.isSelected).forEach(cell => context.rect(...currentBox(cell)))
        context.setLineDash([])
        context.strokeStyle = 'black'
        context.lineWidth = 1;
        
        context.globalAlpha = selectedArea.intersectsOrContains(lastHoveredCell.current) ? 0.5 : 0.25
        context.fillRect(...currentBox(selectedArea))
        context.fillStyle = '#222'
        selectedArea.getEdgeAreas().forEach(area => context.fillRect(...currentBox(area)))
        context.fillstyle = "white";
        context.globalAlpha = 1;
        drawMouseShadow(lastHoveredCell.current)
    }

    const drawMouseShadow = (hoveredCell) => {
        const { pattern, view } = boardData
        if (boardData.playback.enabled || !mouseInBoard.current) return
        const context = getContext()
        context.fillStyle = 'white'
        const cellSize = getCellSize()
        const currentBox = ({row, col, width = 1, height = 1}) => [(col - view.coordinates.col) * cellSize, (row - view.coordinates.row) * cellSize, cellSize * width, cellSize * height]
        context.globalAlpha = 0.5
        
        if (editMode == "draw") {
            switch (boardData.brush.type) {
                case "pixel": context.fillRect(...currentBox(hoveredCell)); break;
                case "pattern": translateSelectionsAroundPoint(pattern.selections, hoveredCell).forEach(cell => {context.fillRect(...currentBox(cell)) }); break;
                case "line": getLine(boardData.brush.extra.lineStart, hoveredCell).forEach(cell => context.fillRect(...currentBox(cell))); break;
                case "box": getBox(boardData.brush.extra.lineStart, hoveredCell).forEach(cell => context.fillRect(...currentBox(cell))); break;
                case "ellipse": getEllipse(boardData.brush.extra.lineStart, hoveredCell).forEach(cell => context.fillRect(...currentBox(cell))); break;
                default: context.fillRect(...currentBox(hoveredCell)); break;
            }
        } else if (editMode == "erase") {
            context.fillRect(...currentBox(getEraserBox(hoveredCell, boardData.eraser.size)))
        }
        
        
        context.globalAlpha = 1;
    }


    const observer = useRef(new ResizeObserver(() => {resizeCanvas(); draw()}));
    useEffect(() => {
        observer.current.disconnect()
        draw()
        observer.current = new ResizeObserver(() => { if (alwaysCenter) {
            centerCamera({row: 0, col: 0})
        }; resizeCanvas(); draw();  })
        observer.current.observe(document.documentElement)
        
        if (!canvasRef.current) return
    })

    
    const frameRequested = useRef(false);
    const isAnimating = useRef(boardData.playback.enabled)
    useEffect(() => { 
        animationStartTime.current = Date.now() 
        isAnimating.current = boardData.playback.enabled
        
        if (boardData.playback.enabled) {
            alterData('selections', removeDuplicates(currentBoardData.current.selections.map(cell => Selection.clone(cell))))
        } else {
            lastGeneration.current = ""
            frameRequested.current = false;
            setDisplayedSelections(JSON.stringify(currentBoardData.current.selections))
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
        setShowingBackToCenterDisplay(!anyCellsInView() && currentBoardData.current.selections.length > 0)
      }, [boardData.view])



      useEffect(() => {
          requestAnimationFrame( () => {
            function getNextTick() {
                if (isAnimating.current) {
                    if (Date.now() - lastTick.current > getMillisecondsPerTick()) {
                        const nextGeneration = renders.current.hasNextFrame(displayedSelections.current) ? renders.current.getNextFrame(displayedSelections.current) : JSON.stringify((getNextGeneration(JSON.parse(displayedSelections.current), selectionSet.current)));
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
        if (!currentBoardData.current.playback.enabled)
            setDisplayedSelections(JSON.stringify(currentBoardData.current.selections))
    }, [currentBoardData.current.selections])

    const lastSelectedEditMode = useRef(boardData.editMode);
    const keyEvents = [
        new KeyBinding({key: "Enter", onDown: () => alterData('playback.enabled', !boardData.playback.enabled)}),
        new KeyBinding({key: "Delete", onDown: () => { if (!boardData.playback.enabled) { clear() } } }),
        new KeyBinding({key: "c", onDown: () => { if (!boardData.playback.enabled) { clear() } }}),
        new KeyBinding({key: "-", onDown: () => alterData('view.zoom', boardData.view.zoom - 0.05)}),
        new KeyBinding({key: "=", onDown: () => alterData('view.zoom', boardData.view.zoom + 0.05)}),
        // new KeyBinding({key: "UpArrow", onDown: () => alterData('view.coordinates.row', boardData.view.coordinates.row - 1)}),
        // new KeyBinding({key: "LeftArrow", onDown: () => alterData('view.coordinates.col', boardData.view.coordinates.col - 1)}),
        // new KeyBinding({key: "DownArrow", onDown: () => alterData('view.coordinates.row', boardData.view.coordinates.row + 1)}),
        // new KeyBinding({key: "RightArrow", onDown: () => alterData('view.coordinates.col', boardData.view.coordinates.col + 1)}),
        new KeyBinding({key: "1", onDown: () => alterData('editMode', 'draw')}),
        new KeyBinding({key: "2", onDown: () => alterData('editMode', 'erase')}),
        new KeyBinding({key: "3", onDown: () => alterData('editMode', 'pan')}),
        new KeyBinding({key: "4", onDown: () => alterData('editMode', 'zoom')}),
        new KeyBinding({key: "5", onDown: () => alterData('editMode', 'select')}),
        new KeyBinding({key: "Escape", onDown: () => removeCallback?.() }),
        new KeyBinding({key: "Shift", onDown: () => { lastSelectedEditMode.current = currentBoardData.current.editMode; alterData('editMode', 'pan');  }, onUp: () => { alterData('editMode', lastSelectedEditMode.current); }}),
        new KeyBinding({key: "Control", onDown: () => { lastSelectedEditMode.current = currentBoardData.current.editMode; alterData('editMode', 'zoom')}, onUp: () => alterData('editMode', lastSelectedEditMode.current)}),
        new KeyBinding({key: "Alt", onDown: () => { lastSelectedEditMode.current = currentBoardData.current.editMode; alterData('editMode', 'select')}, onUp: () => alterData('editMode', lastSelectedEditMode.current)}),
        new KeyBinding({key: " ", onDown: () => setShowingRenderPrompt(!showingRenderPrompt) }),
        new KeyBinding({key: "r", onDown: () => alterData('pattern', {...boardData.pattern, selections: rotateSelections90(boardData.pattern.selections) }) }),
        new KeyBinding({key: "ArrowLeft", onDown: () => alterData('pattern', {...boardData.pattern, selections: mirrorOverY(boardData.pattern.selections) }) }),
        new KeyBinding({key: "ArrowRight", onDown: () => alterData('pattern', {...boardData.pattern, selections: mirrorOverY(boardData.pattern.selections) }) }),
        new KeyBinding({key: "ArrowUp", onDown: () => alterData('pattern', {...boardData.pattern, selections: mirrorOverX(boardData.pattern.selections) }) }),
        new KeyBinding({key: "ArrowDown", onDown: () => alterData('pattern', {...boardData.pattern, selections: mirrorOverX(boardData.pattern.selections) }) }),
        new KeyBinding({key: 'z', onControl: true, onDown: undo}),
        new KeyBinding({key: 'c', onControl: true, onDown: copy}),
        new KeyBinding({key: 'v', onControl: true, onDown: paste}),
        new KeyBinding({key: 's', onControl: true, onDown: () => {
            selectedArea.area === 0 ? saveBoardAsPattern() : saveSelectedAreaAsPattern();
        }}),
        new KeyBinding({key: 'Backspace', onDown: () => {
            const selectedSelections = getSelectionsInArea(selectedArea)
            const selectedSelectionsSet = new Set(selectedSelections.map(cell => JSON.stringify(cell)));
            alterData("selections", currentBoardData.current.selections.filter(cell => !selectedSelectionsSet.has(JSON.stringify(cell))))
        }})
    ]

    function copy() {
        console.log('copy');
        if (selectedArea.area <= 0) return
        if (boardData.playback.enabled) return

        const center = new Selection(Math.round(selectedArea.row + selectedArea.height / 2), Math.round(selectedArea.col + selectedArea.width / 2))
        const copied = currentBoardData.current.selections.filter(cell => selectedArea.intersectsOrContains(cell)).map(cell => new Selection(cell.row - center.row, cell.col - center.col))
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


    function keyListener(keyEvent) {
        keyEvents.forEach(binding => binding.testAndRunDown(keyEvent))
    }

    function keyUpListener(keyEvent) {
        keyEvents.forEach(binding => binding.testAndRunUp(keyEvent))
    }

    function doubleClickListener(mouseEvent) {
        switch (boardData.editMode) {
            case "select": {
                if (mouseInSelectedArea(mouseEvent)) {
                    setSelectedArea(new Area(0, 0, 0, 0));
                    selectedAreaAnchor.current = new Selection(0, 0)
                }
            }; break;
            default: console.log("double click"); break;
        }
    }

    function mouseDownListener(mouseEvent) {
        // boardData.pushHistory();
        console.error("TODO: FIX BOARD DATA PUSH HISTORY")
        isDragging.current = true;

        switch (boardData.editMode) {
            case "select": {
                if (mouseInSelectedArea(mouseEvent) && !mouseOnEdgeOfSelectedArea(mouseEvent)) {
                    console.log("clicked selected area");
                    movingSelectedArea.current = true;
                } else if (mouseOnEdgeOfSelectedArea(mouseEvent)) {
                    moveAnchorBasedOnClick(mouseEvent)
                } else {
                    startAreaSelection(mouseEvent)
                }
            }; break;
            case "erase": {
                if (boardData.playback.enabled || !editable || mouseEvent.button === 2) break;
                erase(getHoveredCell(mouseEvent))
            }; break;
            case "draw": {
                if (boardData.playback.enabled || !editable || mouseEvent.button === 2) break;
                switch(boardData.brush.type) {
                    case 'pixel': select(getHoveredCell(mouseEvent)); break;
                    case "pattern": select(getHoveredCell(mouseEvent)); break;
                    case 'fill': fill(getHoveredCell(mouseEvent)); break;
                    case 'box':
                    case 'ellipse':
                    case 'line': alterData('brush', {...boardData.brush, extra: {...boardData.brush.extra, lineStart: getHoveredCell(mouseEvent)}}); break;
                }
            }; break;
        }
    }

    function mouseMoveListener(mouseEvent) {

        switch (boardData.editMode) {
            case "select": {
                if (mouseOnEdgeOfSelectedArea(mouseEvent)) {
                    setCursor("nw-resize");
                } else if (mouseInSelectedArea(mouseEvent) ) {
                    setCursor('move');
                } else {
                    setCursor('crosshair')
                }

                if (movingSelectedArea.current) {
                    setCursor('grab');
                    moveSelectedArea(mouseEvent)
                } else {
                    selectingArea(mouseEvent)
                }
            }; break;
            case "erase": {
                if (boardData.playback.enabled || !editable) break;
                DragErase(mouseEvent);
            }; break;
            case "draw": {
                if (boardData.playback.enabled || !editable) break;
                if ( boardData.brush.type == "pixel" || boardData.brush.type == 'pattern') {
                    DragBrush(mouseEvent);
                }
            }; break;
            case "pan": {
                if (movable) {
                    mousePan(mouseEvent);
                }
            }; break;
            case "zoom": {
                if (movable) {
                    mouseZoom(mouseEvent);
                }
            }; break;
        }

        lastHoveredCell.current = getHoveredCell(mouseEvent)
        lastMousePosition.current = getMousePositionInCanvas(mouseEvent);
        // if (selectedArea.intersectsOrContains(lastHoveredCell.current)) {
        //     setCanvasTooltip("Ctrl C to copy")
        // } else {
        //     if (canvasTooltip !== "")
        //         setCanvasTooltip("")
        // }
        draw();
    }


    const onInputStop = (event) => {
        lastMousePosition.current = {x: 0, y: 0}
        isDragging.current = false
        movingSelectedArea.current = false;
        startTransition( () => {
            const fixedSelectedArea = new Area(Math.round(selectedArea.row), Math.round(selectedArea.col), Math.round(selectedArea.width), Math.round(selectedArea.height))
            setSelectedArea(fixedSelectedArea)
            selectedAreaAnchor.current = fixedSelectedArea.topLeft;
            alterData('selections', currentBoardData.current.selections.map(cell => Selection.clone({...cell, row: Math.floor(cell.row), col: Math.floor(cell.col)})) )
        } )
    }

    const onContextMenu = (event) => {
        event.preventDefault();

        onInputStop();
    }
    
    const onMouseUp = (event) => {
        // console.log("MOUSE UP");
        switch (boardData.editMode) {
            case "draw": {
                switch (boardData.brush.type) {
                    case "line": drawLine(boardData.brush.extra.lineStart, getHoveredCell(event)); break;
                    case "box": drawBox(boardData.brush.extra.lineStart, getHoveredCell(event)); break;
                    case "ellipse": drawEllipse(boardData.brush.extra.lineStart, getHoveredCell(event)); break;
                 }
            }; break;
            case "select": {
                
            }; break;
        }
        boardData.brush.extra.lineStart = undefined;
        onInputStop(event);
    }

    const onMouseEnter = (event) => {
        event.target.focus();
        mouseInBoard.current = true;
    }

    const onMouseLeave = event => {
        mouseInBoard.current = false;
    }

    // function randomizeSelections() {
    //   const randomized = []
    //   const viewArea = getViewArea()
    //   for (let i = 0; i < (viewArea.width) * (viewArea.height) / 2; i++) {
    //     randomized.push(new Selection(viewArea.row + Math.round(Math.random() * viewArea.height), viewArea.col + Math.round(Math.random() * viewArea.width)))
    //   }
    //   alterData('selections', randomized)
    // }   

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
        if (renderStatus.queued == false || renderStatus.requested.generationCount <= 0 || renderStatus.requested.currentGenerationCount > renderStatus.requested.generationCount) {
            setRenderStatus(initialRenderStatus)
            setShowingRenderPrompt(false)
            timesBetweenFrames.current = []
            // sendAlert("Render rendered", 1000);
            return
        } else {
            if (renderStatus.requested.currentGenerationCount === 0) {
                renders.current.addStarter(renderStatus.requested.currentGeneration)
                lastRenderTime.current = currentTime()

                if (renderStatus.requested.currentGeneration in renders.current.frames) {
                    let currentGeneration = renderStatus.requested.currentGeneration
                    let currentGenerationCount = renderStatus.requested.currentGenerationCount
                    while (currentGeneration in renders.current.frames && currentGeneration != null) {
                        currentGeneration = renders.current.getNextFrame(currentGeneration)
                        currentGenerationCount++;
                    }

                    setRenderStatus( currentState => { return {
                        ...currentState,
                        requested: { 
                            ...currentState.requested,
                            currentGeneration: currentGeneration,
                            currentGenerationCount: currentGenerationCount
                        }
                    }})
                    return
                }
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
            ), 0);
        }  } )
    }, [renderStatus] )

    useEffect( () => {
        return () => {
            console.log("checking if render finished or not");
            if (JSON.stringify(renderStatus) !== JSON.stringify(initialRenderStatus)) {
                console.log("QUEUE UP RENDER");
                const { currentGeneration, generationCount, currentGenerationCount } = renderStatus.requested;
                renders.current.render(currentGeneration, generationCount - currentGenerationCount)
            }
        }
    }, [])

    function saveBoardAsPattern() {
        const clonedSelections = currentBoardData.current.selections.map(cell => Selection.clone(cell))
        if (clonedSelections.length === 0) {
            console.log("cannot save 0 selections as pattern");
            return;
        }

        setEditingPattern(new Pattern({ selections: clonedSelections }))
        setShowingPatternEditor(true)
    }

    function renderSelectedArea() {
        const clonedSelections = getSelectionsInArea(selectedArea)
        if (clonedSelections.length === 0) {
            console.log("cannot rebder 0 selections");
            return;
        }

        specialRenderRequest.current = getSelectionsInArea(selectedArea)
        setShowingRenderPrompt(true);
    }

    function saveSelectedAreaAsPattern() {
        const clonedSelections = getSelectionsInArea(selectedArea)
        if (clonedSelections.length === 0) {
            console.log("cannot save 0 selections as pattern");
            return;
        }

        setEditingPattern(new Pattern({ selections: clonedSelections }))
        setShowingPatternEditor(true)
    }

    function selectSelectedAreaAsPattern() {
        const clonedSelections = getSelectionsInArea(selectedArea)
        if (clonedSelections.length === 0) {
            console.log("cannot select 0 selections as pattern");
            return;
        }

        alterData("brush.type", "pattern")
        alterData("pattern", new Pattern({ selections: clonedSelections }))
    }

    const specialRenderRequest = useRef(null)
    const [showBoardDataDisplay, setShowBoardDataDisplay] = useState(false)
    const [showingDrawingOptions, setShowingDrawingOptions] = useState(false)
    const [showingErasingOptions, setShowingErasingOptions] = useState(false)
    const [showingPatternOptions, setShowingPatternOptions] = useState(false)
    const [showingPatternEditor, setShowingPatternEditor] = useState(false)
    const [editingPattern, setEditingPattern] = useState(null)
    
    useEffect( () => {
        if (showingRenderPrompt === false) {
            specialRenderRequest.current = null
        }
    }, [showingRenderPrompt])

    useEffect( () => {
        switch(boardData.editMode) {
        case 'draw': switch (boardData.brush.type) {
            case 'pixel':
            case 'pattern': setCursor('url("https://img.icons8.com/ios-glyphs/30/000000/pencil-tip.png"), crosshair'); break;
            case 'fill': setCursor('url("https://www.pinclipart.com/picdir/big/534-5348253_bucket-icon-png-ms-paint-paint-bucket-tool.png"), crosshair'); break;
            default: setCursor('crosshair'); break;
        } break;
        case 'zoom': setCursor('url("https://img.icons8.com/external-royyan-wijaya-detailed-outline-royyan-wijaya/24/000000/external-magnifying-glass-interface-royyan-wijaya-detailed-outline-royyan-wijaya.png"), nwse-resize'); break;
        case 'erase': setCursor('url("https://img.icons8.com/material-rounded/24/00000/eraser.png"), crosshair'); break;
        case 'pan': setCursor('move'); break;
        case 'select': setCursor('crosshair'); break;
        }
    }, [boardData.editMode])

    const [showingFPSSlider, setShowingFPSSlider] = useState(false);
    const { editMode, view, selections } = currentBoardData.current

  return (
    <div className='game-board' ref={boardRef}>
            <canvas className='game-canvas' ref={canvasRef} onPointerDown={mouseDownListener} onPointerUp={onMouseUp} onContextMenu={onContextMenu} onPointerEnter={onMouseEnter}  onPointerLeave={() => { onMouseLeave(); onInputStop(); } } onPointerMove={mouseMoveListener} onKeyDown={keyListener} onKeyUp={keyUpListener} onDoubleClick={doubleClickListener} tabIndex={0} style={{cursor: cursor}}/>
        { boardData.playback.enabled && <div className='animating-ui' onMouseLeave={() => setShowingFPSSlider(false)}>
                <h3 className='generation-display' style={{fontSize: Math.max(12, getCanvasBounds().width / 150 ) }} onMouseEnter={() => setShowingFPSSlider(true)}> Current Generation: { currentGeneration }  { !showingFPSSlider && ">" } </h3>
                { showingFPSSlider && <div className='flex-column'>
                    <label htmlFor="speed-slider"> FPS: { boardData.settings.tickSpeed } </label>
                    <input id="speed-slider" type='range' min='1' max='100' value={boardData.settings.tickSpeed} onChange={(event) => alterData('settings.tickSpeed', Number(event.target.value))} style={{width: "100px"}} />
                </div>}

                {/* <button onClick={() => alterData('settings.isScreenFit', !boardData.settings.isScreenFit)} className={`game-tool ${boardData.settings.isScreenFit ? 'selected' : 'unselected'}`}> Fit Screen </button> */}
             </div> }
            
        { showingBackToCenterDisplay && <button className='flex-row back-to-center-button' onClick={centerCamera}> <AiFillCloseCircle /> <span> Back <br/> To <br/> Center <br /> </span> </button> }
        
        { canvasTooltip !== "" && <ToolTip> { canvasTooltip } </ToolTip>}

        { showingRenderPrompt && <div className='render-prompt'>
                <button onClick={() => (JSON.stringify(renderStatus) === JSON.stringify(initialRenderStatus)) ? setShowingRenderPrompt(false) : console.log("Cannot close render prompt while rendering") }> Close Render Prompt  </button>
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

                    requestRender( specialRenderRequest.current || (JSON.stringify(currentBoardData.current.selections)), requestedGenerations)
                    }}> Submit </button>

                    { renderStatus.percentage > 0 && <div className='progress-bar'>
                        <span className='progress-bar-percentage'> { renderStatus.percentage }% </span> 
                        <span className='progress-bar-ETA'> { millisecondsToTimeString(renderStatus.timeToCompletion) } </span> 
                        <div className="progress-bar-status" style={{width: `${renderStatus.percentage}%` }}/> 
                        </div>}
            </div> }
        
        {showingToolBar && <div className='game-toolbar flex-row'>
            
            <div className="drawing-options" onMouseLeave={() => { setShowingDrawingOptions(false); setShowingPatternOptions(false); } }>
                <button onClick={() => alterData('editMode', 'draw') } onMouseEnter={() => setShowingDrawingOptions(true)}  className={`game-tool ${boardData.editMode == 'draw' ? 'selected' : 'unselected'}`}> <FaBrush /> <ToolTip> 1: Draw </ToolTip> </button>
                {showingDrawingOptions && 
                <div className="drawing-options-menu">

                    <div className="flex-column"> 
                        <button onClick={() => { alterData('brush', {...boardData.brush, type: 'pixel'}); alterData("editMode", "draw") } } className={`game-tool ${boardData.brush.type == 'pixel' ? 'selected' : 'unselected'}`}> Pixel <ToolTip> Default Pixel Tool </ToolTip> </button>
                        <button onClick={() => { alterData('brush', {...boardData.brush, type: 'line'}); alterData("editMode", "draw") }  } className={`game-tool ${boardData.brush.type == 'line' ? 'selected' : 'unselected'}`}> Line <ToolTip> Line Tool </ToolTip> </button>
                        <button onClick={() => { alterData('brush', {...boardData.brush, type: 'box'}); alterData("editMode", "draw") }  } className={`game-tool ${boardData.brush.type == 'box' ? 'selected' : 'unselected'}`}> Box <ToolTip> Box Tool </ToolTip> </button>
                        <button onClick={() => { alterData('brush', {...boardData.brush, type: 'ellipse'}); alterData("editMode", "draw") }  } className={`game-tool ${boardData.brush.type == 'ellipse' ? 'selected' : 'unselected'}`}> Ellipse <ToolTip> Ellipse Tool </ToolTip> </button>
                        <button onClick={() => { alterData('brush', {...boardData.brush, type: 'fill'}); alterData("editMode", "draw") }  } className={`game-tool ${boardData.brush.type == 'fill' ? 'selected' : 'unselected'}`}> Fill <ToolTip> Fill Tool </ToolTip> </button>
                        <div className="pattern-options">
                            <button onClick={() => { alterData('brush', {...boardData.brush, type: 'pattern'}); alterData("editMode", "draw") } } className={`game-tool ${boardData.brush.type == 'pattern' ? 'selected' : 'unselected'}`} onMouseEnter={() => setShowingPatternOptions(true)}>  Pattern <ToolTip> Pattern Tool </ToolTip> </button>
                            { showingPatternOptions && <div className='pattern-options-menu'>
                                { (( savedPatterns.some(pattern => JSON.stringify(pattern.selections) === JSON.stringify(boardData.pattern.selections)) ? savedPatterns : [ boardData.pattern, ...savedPatterns ] )).map(pattern => <button className={`pattern-option ${JSON.stringify(boardData.pattern.selections) === JSON.stringify(pattern.selections) ? "selected" : ""}`} key={JSON.stringify(pattern)} onClick={ () => { alterData("pattern", cloneDeep(pattern)); alterData('brush', {...boardData.brush, type: 'pattern'}); alterData("editMode", "draw") } } >  <span> { pattern?.name } </span> </button> ) }
                            </div> }
                        </div>
                    </div>

                </div> }
            </div>

            <div className="erasing-options" onMouseLeave={() => setShowingErasingOptions(false)}>
                <button onClick={() => alterData('editMode', 'erase') } className={`game-tool ${boardData.editMode == 'erase' ? 'selected' : 'unselected'}`} onMouseEnter={() => setShowingErasingOptions(true)}> <FaEraser /> <ToolTip> 2: Erase </ToolTip> </button>
                {showingErasingOptions && 
                <div className="erasing-options-menu">
                    <h4> Brush Size: { boardData.eraser.size } </h4> 
                    <input type="range" min="1" max="100" value={boardData.eraser.size} onChange={(event) => alterData('eraser', {...boardData.eraser, size: Number(event.target.value)})} />
                </div> }
            </div>

            <button onClick={() => alterData('editMode', 'pan') } className={`game-tool ${boardData.editMode == 'pan' ? 'selected' : 'unselected'}`}> <FaArrowsAlt /> <ToolTip> 3 (Shift + Drag): Pan </ToolTip> </button>
            <button onClick={() => alterData('editMode', 'zoom')} className={`game-tool ${boardData.editMode == 'zoom' ? 'selected' : 'unselected'}`}>  <FaSearch /> <ToolTip> 4 (Ctrl + Drag): Zoom </ToolTip> </button>
            <button onClick={() => alterData('editMode', 'select') } className={`game-tool ${boardData.editMode == 'select' ? 'selected' : 'unselected'}`}> <BsBoundingBox /> <ToolTip> 5 (Alt + Drag): Select </ToolTip> </button>
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
                        <span> Row:  {Math.round(view.coordinates.row * 100) / 100} </span> <br/>
                        <span> Col: {Math.round(view.coordinates.col * 100) / 100} </span> <br/>
                    </div>

                    <label htmlFor='zoom-input'> Zoom: {Math.round(view.zoom * 100) / 100} </label>
                    <input type="range" id='zoom-input' min={`${boardData.playback.enabled ? MIN_PLAYBACK_ZOOM : MIN_EDIT_ZOOM}`} max='3' step="0.05" value={boardData.view.zoom} onChange={(event) => alterData('view.zoom', Number(event.target.value)) }/>
                </div> } 
        </div>
            <button onClick={() => removeCallback?.()} className={`game-tool`}> <FaWindowClose /> <ToolTip> Esc: Exit </ToolTip> </button> 
        </div>}

        <ContextMenu bindReference={canvasRef}>
            <button onClick={() => setShowingRenderPrompt(!showingRenderPrompt)} > Render Board </button>
            <button onClick={saveBoardAsPattern}> Save Board as Pattern </button>
            <button onClick={renderSelectedArea}> Render Selected Area </button>
            <button onClick={saveSelectedAreaAsPattern}> Save Selected Area as Pattern </button>
            <button onClick={selectSelectedAreaAsPattern}> Select Selected Area as Pattern </button> 
            <button style={{backgroundColor: "red", fontWeight: "bold"}}> Close Menu </button>


        </ContextMenu>

        { showingPatternEditor && <PatternEditor currentPattern={editingPattern} close={() => setShowingPatternEditor(!showingPatternEditor)}/>  }
    </div>
  )
}

