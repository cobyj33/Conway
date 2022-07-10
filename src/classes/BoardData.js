import { cloneDeep } from "lodash";
import { Pattern } from "./Pattern";

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