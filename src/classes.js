import { cloneDeep } from 'lodash'
import { average } from './functions'
export class Selection {
    constructor(row, col, type = 'cell') {
      this.row = row
      this.col = col
      this.type = type
    }

    static distanceBetween(first, second) {
      return Math.sqrt( Math.pow(( first.col - second.col), 2) + Math.pow(( first.row - second.row ), 2) )
    } 

    static clone(selection) {
      const {row, col, type} = selection
      return new Selection(row, col, type)
    }

    toString() {
      return JSON.stringify(this)
    }

    static StringToSelection(string) {
      const {row, col, type} = JSON.parse(string);
      return new Selection(Number(row), Number(col), type);
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

    encapsulates(area) {
      
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
      const currentData = this;
      if (previousData) {
        const clonedData = cloneDeep(previousData)
        Object.keys(clonedData).forEach(prop => {
          if (prop in currentData) {
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
        this.selections = selections;
      } else {
        const centerOfSelections = new Selection(average(selections.map(sel => sel.row)), average(selections.map(sel => sel.col)))
        this.selections = selections.map(sel => new Selection(sel.row - centerOfSelections.row, sel.col - centerOfSelections.col))
      }
    }

    get count() {
      return this.selections.length;
    }
  }

  let renderID = 0;
  export class Render {
    constructor(startingSelections = [], renders = []) {
      this.id = ++renderID;
      this.renders = renders
      this.startingSelections = startingSelections.map(sel => Selection.clone(sel))
    }
 
    generation(num) {
      return num < this.renders.length ? this.renders[num] : this.renders[this.renders.length - 1]
    }

    hasGeneration(num) {
      return num < this.renders.length;
    }
  } 
  class User {
    constructor(id) {
      
    }
  }