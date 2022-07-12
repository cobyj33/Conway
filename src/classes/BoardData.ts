// import { cloneDeep } from "lodash";
import { Pattern } from "./Pattern";
import { Playback } from "./Playback";
import { Selection } from "./Selection";
import { BoardDataSave } from "./BoardDataSave";
import { BoardSettings } from "./BoardSettings";
import { HistoryStack } from "./HistoryStack";
import { View } from "./View";
import { Coordinates } from "./Coordinates"

let boardIDs = 0;
export class BoardData {
    readonly id: number;
    selections: Selection[];
    pattern: Pattern;
    playback: Playback;
    view: View;
    brush: any;
    eraser: any;
    settings: BoardSettings;
    editMode: string;
    history: HistoryStack<BoardDataSave>;
    
    //TODO: CHANGE EDIT MODE TO EDITMODE TYPE
    //TODO: CHANGE HISTORY, PUSH HISTORY, ALL THAT

    // static FromSave(saveData: BoardDataSave) {
    //   Object.keys(saveData).forEach((prop: any) => {
    //     if (prop in this) {
    //       this[prop] = saveData[prop]
    //     }
    //   })
    // }

    static FromSelections(selections: Selection[]): BoardData {
      const data: BoardData = new BoardData();
      data.selections = [...selections];
      return data;
    }

    constructor() {
      this.id = ++boardIDs;
  
      this.selections = []
      this.pattern = new Pattern({ selections: [new Selection(0, 0)], name: "Pixel Pattern" });
      this.playback = new Playback();
      
      this.history = new HistoryStack<BoardDataSave>();
      // this.history = {
      //   past: [],
      //   future: []
      // }
      //maxLength = 2
  
      // this.view = {
      //   coordinates: {
      //     row: 0,
      //     col: 0
      //   },
      //   zoom: 1
      // }
      this.view = new View(new Coordinates(0, 0), 1);

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
  
      this.settings = BoardSettings.getDefault();
      this.editMode = 'draw'
      // const currentData = this;
      // if (previousData) {
      //   const clonedData = cloneDeep(previousData)
      //   Object.keys(clonedData).forEach(prop => {
      //     if (prop in currentData && prop !== "id") {
      //       currentData[prop] = clonedData[prop]
      //     }
      //   })
      // }
    }
    

    // pushHistory() {
    //   const historyState = {};
    //   Object.keys(this).forEach(key => {
    //     if (key !== "history") {
    //       historyState[key] = this[key]
    //     }
    //   })

    //   if (this.history.past.length > 30) {
    //     this.history.past.shift();
    //   }

    //   this.history.past.push(historyState)
    // } 
    
    // //NOTE: EDITED POPHISTORY
    // //NOTE: ABOVE NOTE MIGHT NOT BE TRUE
    // //TODO: UPDATE HISTORY TO SUPPORT HISTORYSTACK
    // popHistory() {
    //   console.log("history length: ", this.history.past.length);
    //   console.log(this.history)
    //   const lastBoard = new BoardData();
    //   const lastState = this.history.past.pop();
    //   if (!lastState) {
    //     console.log("empty history: id: ", this.id)
    //     return
    //   }

    //   Object.keys(lastState).forEach(key => lastBoard[key] = lastState[key])
    //   lastBoard.history = this.history;
    //   console.log('last board', lastBoard)
    //   return lastBoard;
    // }

    toPattern() {
      return new Pattern({selections: this.selections})
    }
  }