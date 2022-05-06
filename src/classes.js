import { cloneDeep } from 'lodash'
export class Selection {
    constructor(row, col, type = 'cell') {
      this.row = row
      this.col = col
      this.type = type
    }

    distanceFrom(selection) {
      return Math.sqrt( Math.pow(( this.col - selection.col), 2) + Math.pow(( this.row - selection.row ), 2) )
    } 
  }
  
  export class Area {
    constructor(row = 0, col = 0, width = 0, height = 0) {
        this.row = row;
        this.col = col;
        this.width = width;
        this.height = height
    }
    
    get rightSide() {
        return this.col + this.width
    }
  
    get bottomSide() {
        return this.row + this.height
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

    static corners(...points) {
      // const [first, second, third, fourth] = points
      if (points.length < 2) {
        console.log('not all corners available')
        return
      }

      const row = Math.min(...points.map(point => point.row))
      const col = Math.min(...points.map(point => point.col))
      const width = Math.max(...points.map(point => Math.abs(col - point.col))) + 1
      const height = Math.max(...points.map(point => Math.abs(row - point.row))) + 1

      console.log(row, col, width, height)
      console.log(points);
      return new Area(row, col, width, height)
    }
  
    containsArea({row, col, width = 1, height = 1}) {
        if (this.width == 0 || this.height == 0) return false
        
        return ((this.row <= row && this.row + this.height > row) || (row <= this.row && row + height > this.row)) && ((this.col <= col && this.col + this.width > col) || (col <= this.col && col + width > this.col))
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

let patternCount = 0;
export class Pattern {
  constructor(data) {
    if (data instanceof Pattern) {
      const clonedData = cloneDeep(data)
      Object.keys(clonedData).forEach(prop => this[prop] = clonedData[prop])
    }

    this.name = data?.name ? data.name : `pattern ${++patternCount}`
    this.cells = data?.cells ? data.cells : [];
  }
}

let boardIDs = 0;
export class BoardData {
    constructor(previousData) {
      if (previousData) {
        const clonedData = cloneDeep(previousData)
        Object.keys(clonedData).forEach(prop => this[prop] = clonedData[prop])
      }
      this.id = ++boardIDs;
  
      this.selections = []
      this.walls = []
      this.selectionsBeforeAnimation = []
      this.pattern = [{row: 0, col: 0}];
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
  
      this.settings = {
        tickSpeed: 5,
        randomizeAmount: 10,
        isScreenFit: false,
      }
  
      this.editMode = 'draw'
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
  }