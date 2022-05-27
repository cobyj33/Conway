import { cloneDeep } from 'lodash'
import { average, getSortedSelections, removeDuplicates } from './functions'
export class Selection {
    constructor(row, col, isSelected = false) {
      this.row = row
      this.col = col
      this.isSelected = isSelected
    }

    static distanceBetween(first, second) {
      return Math.sqrt( Math.pow(( first.col - second.col), 2) + Math.pow(( first.row - second.row ), 2) )
    } 

    static clone({row, col, isSelected}) {
      return new Selection(row, col, isSelected)
    }
  }
  
  export class Area {
    constructor(row = 0, col = 0, width = 0, height = 0) {
        this.row = row;
        this.col = col;
        this.width = width;
        this.height = height
        this.selected = []
    }
    
    get rightSide() {
        return this.col + this.width - 1
    }
  
    get bottomSide() {
        return this.row + this.height - 1
    }
  
    get area() {
        return this.width * this.height
    }

    get center() {
      return new Selection(this.row + Math.round(this.height / 2), this.col + Math.round(this.width / 2))
    }
  
    get info() {
        return [this.row, this.col, this.width, this.height]
    }

    get topLeft() {
      return new Selection(this.row, this.col)
    }

    get topRight() {
      return new Selection(this.row, this.rightSide)
    }

    get bottomLeft() {
      return new Selection(this.bottomSide, this.col)
    }

    get bottomRight() {
      return new Selection(this.bottomSide, this.rightSide);
    }

    static corners(points) {
      // const [first, second, third, fourth] = points
      if (points.length < 1) {
        console.log('not all corners available')
        return
      } else if (points.length === 1) {
        const point = points[0]
        return new Area(point.row, point.col, 1, 1)
      }

      const row = Math.min(...points.map(point => point.row))
      const col = Math.min(...points.map(point => point.col))
      const width = Math.max(...points.map(point => Math.abs(col - point.col))) + 1
      const height = Math.max(...points.map(point => Math.abs(row - point.row))) + 1

      return new Area(row, col, width, height)
    }
  
    intersectsOrContains({row, col, width = 1, height = 1}) {
        if (this.width === 0 || this.height === 0 || width === 0 || height === 0) return false
        return ((this.row <= row && this.row + this.height > row) || (row <= this.row && row + height > this.row)) && ((this.col <= col && this.col + this.width > col) || (col <= this.col && col + width > this.col))
    }

    isSelectionOnEdge({row, col}) {
      if (this.width === 0 || this.height === 0) return false
      return ( (row === this.row || row === this.bottomSide) && (col >= this.col && col <= this.rightSide) ) || ( (col === this.col || col === this.rightSide) && (row >= this.row && row <= this.bottomSide) )
     }

     getEdgeAreas() {
        const topEdge = new Area(this.row, this.col, this.width, 1)
        const leftEdge = new Area(this.row, this.col, 1, this.height)
        const bottomEdge = new Area(this.bottomSide, this.col, this.width, 1)
        const rightEdge = new Area(this.row, this.rightSide, 1, this.height)
       return [topEdge, leftEdge, bottomEdge, rightEdge]
     }

     getCellsOnEdge() {
      return removeDuplicates(this.getEdgeAreas.flatMap(area => area.getAllInnerCells()));
     }

    getAllInnerCells() {
      if (this.width === 0 || this.height === 0) return []
      const innerCells = []
      for (let row = this.row; row <= this.bottomSide; row++) {
        for (let col = this.col; col <= this.rightSide; col++) {
          innerCells.push(new Selection(row, col))
        }
      }
      return innerCells;
    }
  }
  
  export class KeyBinding {
    constructor({key = 'any', onDown = () => console.log('key pressed'), onUp = () => console.log('key lifted'), onShift = false, onControl = false, onAlt = false}) {
        this.onDown = onDown;
        this.onUp = onUp
        this.key = key;
        this.onShift = key === 'Shift' ? true : onShift;
        this.onControl = key === 'Control' ? true : onControl;
        this.onAlt = key === 'Alt' ? true : onAlt;
    }
  
    testDown(event) {
        return event.type == 'keydown' && (event.key == this.key || this.key == 'any') && this.onShift == event.shiftKey && this.onControl == event.ctrlKey && this.onAlt == event.altKey
    }

    runDown(event) {
        this.onDown(event)
    }

    testAndRunDown(event) {
        if (this.testDown(event)) {
            this.runDown(event)
        }
    }

    testUp(event) {
        return event.type == 'keyup' && (event.key == this.key || this.key == 'any') 
         && (this.onShift ? this.onShift != event.shiftKey : this.onShift == event.shiftKey)
         && (this.onControl ? this.onControl != event.ctrlKey : this.onControl == event.ctrlKey)
         && (this.onAlt ? this.onAlt != event.altKey : this.onAlt == event.altKey)
    }

    runUp(event) {
        this.onUp(event)
    }
  
    testAndRunUp(event) {
        if (this.testUp(event)) {
            // console.log(event)
            this.runUp(event)
        }
    }
  }


let boardIDs = 0;
export class BoardData {
    constructor(previousData) {
      
      this.id = ++boardIDs;
  
      this.selections = []
      this.walls = []
      this.pattern = new Pattern({ selections: [{row: 0, col: 0}], name: "Pixel Pattern" });
      this.playback = {
        enabled: false,
        paused: false,
        currentGeneration: 1,
      }
  
      this.history = {
        past: [],
        future: []
      }
      //maxLength = 2
  
      this.view = {
        coordinates: {
          row: 0,
          col: 0
        },
        zoom: 1
      }

      this.brush = {
        type: 'pixel',
        size: 1,
        paint: 'cell',
        extra: {
            lineStart: undefined
        }
      }

      this.eraser = {
        type: "pixel",
        size: 1
      }
  
      this.settings = {
        tickSpeed: 5,
        randomizeAmount: 10,
        isScreenFit: false,
      }
  
      this.editMode = 'draw'
      const currentData = this;
      if (previousData) {
        const clonedData = cloneDeep(previousData)
        Object.keys(clonedData).forEach(prop => {
          if (prop in currentData && prop !== "id") {
            currentData[prop] = clonedData[prop]
          }
        })
      }
    }

    pushHistory() {
      const historyState = {};
      Object.keys(this).forEach(key => {
        if (key !== "history") {
          historyState[key] = this[key]
        }
      })

      if (this.history.past.length > 30) {
        this.history.past.shift();
      }

      this.history.past.push(historyState)
    }

    popHistory() {
      console.log("history length: ", this.history.past.length);
      console.log(this.history)
      const lastBoard = new BoardData();
      const lastState = this.history.past.pop();
      if (!lastState) {
        console.log("empty history: id: ", this.id)
        return
      }

      Object.keys(lastState).forEach(key => lastBoard[key] = lastState[key])
      lastBoard.history = this.history;
      console.log('last board', lastBoard)
      return lastBoard;
    }

    toPattern() {
      return new Pattern(this.selections)
    }
  }

  let patternCount = 0;
  const getPatternID = () => `Pattern #${patternCount++}`
  export class Pattern {
    constructor({ selections = [], name = getPatternID(), creator = "Jacoby", description = " A Pattern ", dateCreated = new Date(), lastModified = new Date() }) {
      this.name = name;
      this.id = name.startsWith("Pattern #") ? name : getPatternID()
      this.creator = creator;
      this.description = description;
      this.dateCreated = dateCreated
      this.lastModified = lastModified


      if (selections.length == 0) {
        this.selections = getSortedSelections(selections);
      } else {
        const averageVerticalDistanceToCenter = Math.round(average(selections.map(cell => cell.row)))
        const averageHorizontalDistanceToCenter = Math.round(average(selections.map(cell => cell.col)))
        this.selections = getSortedSelections(selections.map(cell => new Selection(cell.row - averageVerticalDistanceToCenter, cell.col - averageHorizontalDistanceToCenter, cell?.type, cell?.isSelected)))
      }
    }

    get count() {
      return this.selections.length;
    }
  }

  let renderID = 0;
  export class Render {
    constructor(startingSelectionsJSON = "", frames = {}) {
      this.id = ++renderID;
      this.frames = frames
      this.startingSelectionsJSON = startingSelectionsJSON
    }

    get numOfFrames() {
      return Object.keys(this.frames).length
    }
 
  } 

  class User {
    constructor(id) {
      
    }
  }