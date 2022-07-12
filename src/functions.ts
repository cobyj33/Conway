
import { cloneDeep } from "lodash";
import { Selection } from "./classes/Selection"
import { Area } from "./classes/Area"
import { BoardData } from "./classes/BoardData";
import { ReducerAction, ReducerState } from "react";


const audioContext: AudioContext = new AudioContext()
const VIEW_PADDING: number = 10;
export function currentTime(): number { return audioContext.currentTime }

  export function getAdjacentNeighbors(selection: Selection): Selection[] {
    const {row: centerRow, col: centerCol} = selection
    return [
        new Selection(centerRow - 1, centerCol),
        new Selection(centerRow + 1, centerCol),
        new Selection(centerRow, centerCol - 1),
        new Selection(centerRow, centerCol + 1)
    ]
  }

  export function getNeighbors(selection: Selection): Selection[] {
    const {row, col} = selection;
    return getAdjacentNeighbors(selection).concat([
        new Selection(row + 1, col + 1),
        new Selection(row - 1, col + 1),
        new Selection(row + 1, col - 1),
        new Selection(row - 1, col - 1)
    ])
  } 

  export function removeDuplicates(selectionList: Selection[]): Selection[] {
    const tracker = new Set<string>([])

    return selectionList.filter(cell => {
        const cellString: string = JSON.stringify(cell);
        if (tracker.has(cellString)) {
            return false;
        } else {
            tracker.add(cellString)
            return true
        }
    })
  }

  export function getLiveNeighbors(selection: Selection, living: Set<string>): Selection[] {
    return getNeighbors(selection).filter(neighbor => living.has(JSON.stringify(neighbor)))
  }

  export function getLiveNeighborCount(selection: Selection, living: Set<string>): number {
    let count: number = 0;
    for (let row = selection.row - 1; row <= selection.row + 1; row++) {
      for (let col = selection.col - 1; col <= selection.col + 1; col++) {
        if ( !(row === selection.row && col === selection.col)) {
          count += living.has(JSON.stringify(new Selection(row, col))) ? 1 : 0;
        }
      }
    }
    return count;
  }

  //TODO: Create Set type that would remove the need for JSON Stringify and Parsing for checking equality
  export function getAreasToCheck(selections: Selection[]): Selection[] {
      const areas: Set<string> = new Set<string>([])
      selections.forEach(cell => [...getNeighbors(cell), Selection.clone(cell)].forEach(checkedCell => areas.add(JSON.stringify(checkedCell))))
      return [...areas].map(area => JSON.parse(area))
  }

  export function getNextGeneration(selections: Selection[], selectionSet: Set<string> = new Set<string>()): Selection[] {
    if (selectionSet.size < selections.length) {
      selectionSet = new Set(selections.map(cell => JSON.stringify(cell)))
    }

    const testCells: Selection[] = getAreasToCheck(selections);
    const nextGenFilter = (cell: Selection) => {
        const numOfLiveNeighbors: number = getLiveNeighborCount(cell, selectionSet)
        if (selectionSet.has(JSON.stringify(cell))) {
            return numOfLiveNeighbors === 2 || numOfLiveNeighbors === 3 
        } 
        return numOfLiveNeighbors === 3
    }

    return testCells.filter(nextGenFilter)
  }

  // export async function getNextGenerationParallel(selections, selectionSet) {
  //   if (selectionSet == null) {
  //     selectionSet = new Set(selections.map(cell => JSON.stringify(cell)))
  //   }

    
  // }

  export function equalSelectionLists(firstList: Selection[], secondList: Selection[]) {
    if (firstList.length !== secondList.length) return false
    const firstSet = new Set(firstList.map(sel => JSON.stringify(sel)))
    return secondList.every(sel => firstSet.has(JSON.stringify(sel)))
  }

  export function getPatternView({ selections }: { selections: Selection[] }): Area {
    console.log("get pattern view:  " + selections);
    const initialArea: Area = Area.corners(selections);
    const { row, col, width, height }: { row: number, col: number, width: number, height: number} = initialArea;
    return new Area(row - VIEW_PADDING, col - VIEW_PADDING, width + VIEW_PADDING, height + VIEW_PADDING)
  }

  export function rotateSelections90(selections: Selection[]): Selection[]  {
    const centerPoint: Selection = Area.corners(selections).center;
    return translateSelectionsAroundPoint(translateSelectionsAroundPoint(selections, new Selection(0, 0)).map(cell => new Selection(-cell.col, cell.row)), centerPoint)  ;
  }

  export function mirrorOverY(selections: Selection[]): Selection[]  {
    const centerPoint: Selection = Area.corners(selections).center;
    return translateSelectionsAroundPoint(translateSelectionsAroundPoint(selections, new Selection(0, 0)).map(cell => new Selection(cell.row, -cell.col)), centerPoint)  ;
  }

  export function mirrorOverX(selections: Selection[]): Selection[] {
    const centerPoint: Selection = Area.corners(selections).center;
    return translateSelectionsAroundPoint(translateSelectionsAroundPoint(selections, new Selection(0, 0)).map(cell => new Selection(-cell.row, cell.col)), centerPoint)  ;
  }

  export function translateSelectionsAroundPoint(selections: Selection[], selection: Selection): Selection[] {
    const patternArea: Area = Area.corners(selections);
    const verticalTranslation: number = selection.row - patternArea.center.row
    const horizontalTranslation: number = selection.col - patternArea.center.col
    return selections.map(cell => new Selection(cell.row + verticalTranslation, cell.col + horizontalTranslation) )
  }

  export function translateSelections(selections: Selection[], rows: number, cols: number): Selection[] {
    return selections.map(cell => new Selection(cell.row + rows, cell.col + cols))
  }

  export function getLine(firstPoint: Selection, secondPoint: Selection): Selection[] {
    if (firstPoint == null || secondPoint == null) return []
    if (JSON.stringify(firstPoint) === JSON.stringify(secondPoint)) return [Selection.clone(firstPoint)];
    const {row: row1, col: col1} = firstPoint;
    const {row: row2, col: col2} = secondPoint;
    const intersections: Selection[] = []

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
        const slope: number = (firstPoint.row - secondPoint.row) / (firstPoint.col - secondPoint.col)
        const yIntercept: number = row1 - (slope * col1);

        for (let col = Math.min(col1, col2); col <= Math.max(col1, col2); col++) {
            const row: number = (slope * col) + yIntercept;
            intersections.push(new Selection(Math.floor(row), Math.floor(col)));
        }

        for (let row = Math.min(row1, row2); row <= Math.max(row1, row2); row++) {
            const col: number = (row - yIntercept) / slope;
            intersections.push(new Selection(Math.floor(row), Math.floor(col)));
        }
    }   
    
    return removeDuplicates(intersections)
}

  export function getBox(firstPoint: Selection, secondPoint: Selection): Selection[] {
    if (firstPoint == null || secondPoint == null) return []
    const {row: row1, col: col1} = firstPoint;
    const {row: row2, col: col2} = secondPoint;
    const box: Selection[] = [];
    return box.concat(
        getLine(new Selection(Math.min(row1, row2), Math.min(col1, col2)), new Selection(Math.min(row1, row2), Math.max(col1, col2))),
        getLine(new Selection(Math.min(row1, row2), Math.min(col1, col2)), new Selection(Math.max(row1, row2), Math.min(col1, col2))),
        getLine(new Selection(Math.max(row1, row2), Math.max(col1, col2)), new Selection(Math.min(row1, row2), Math.max(col1, col2))),
        getLine(new Selection(Math.max(row1, row2), Math.max(col1, col2)), new Selection(Math.max(row1, row2), Math.min(col1, col2))),
    )
  }

  export function getFilledBox(firstPoint: Selection, secondPoint: Selection): Selection[] {
    return Area.corners([firstPoint, secondPoint]).getAllInnerCells();
  }

  export function getEllipse(firstPoint: Selection, secondPoint: Selection) {
    if (firstPoint == null || secondPoint == null) return []
    const {row: row1, col: col1} = firstPoint;
    const {row: row2, col: col2} = secondPoint;
    const centerCol: number = (col1 + col2) / 2
    const centerRow: number = (row1 + row2 ) / 2
    const horizontalRadius: number = Math.abs(col1 - col2) / 2;
    const verticalRadius: number = Math.abs(row1 - row2) / 2;
    const intersections: Selection[] = []

    if (firstPoint.col == secondPoint.col || firstPoint.row == secondPoint.row) {
        return getLine(firstPoint, secondPoint)
    }
   
    for (let col = Math.min(firstPoint.col, secondPoint.col); col <= Math.max(firstPoint.col, secondPoint.col); col += 1) {
        const evaluation: number = Math.sqrt(Math.pow(verticalRadius, 2) * (1  - (Math.pow(col - centerCol, 2) / Math.pow(horizontalRadius, 2) ) ))
        intersections.push(new Selection(Math.floor(centerRow + evaluation), Math.floor(col)));
        intersections.push(new Selection(Math.floor(centerRow - evaluation), Math.floor(col)));
    } 

    for (let row = Math.min(firstPoint.row, secondPoint.row); row <= Math.max(firstPoint.row, secondPoint.row); row += 1) {
        const evaluation: number = Math.sqrt(Math.pow(horizontalRadius, 2) * (1  - (Math.pow(row - centerRow, 2) / Math.pow(verticalRadius, 2) ) ))
        intersections.push(new Selection(Math.floor(row), Math.floor(centerCol + evaluation)));
        intersections.push(new Selection(Math.floor(row), Math.floor(centerCol - evaluation)));
    } 
    
    return removeDuplicates(intersections)
}


export function nextLargestPerfectSquare(num: number): number {
    return (Math.pow(Math.ceil(Math.sqrt(num)) , 2))
}

export function nextSmallestPerfectSquare(num: number): number {
    return (Math.pow(Math.floor(Math.sqrt(num)) , 2))
}

export function average(nums: number[]): number {
    return nums.reduce((acc, curr) => acc + curr, 0) / nums.length
}

const COLUMN_PRECISION = Math.pow(2, 16);
export function getSortedSelections(selections: Selection[]): Selection[] {
  return selections.map(cell => Selection.clone(cell))
  .sort((cell1, cell2) => cell1.row - cell2.row + (cell1.col - cell2.col) / COLUMN_PRECISION)
}

export function isCellInSortedSelections(selection: Selection, selectionList: Selection[]) {
  const testIndex: number = binarySearch(selectionList.map(cell => cell.row), selection.row)
  if (testIndex === -1)
    return false;


  const range: Selection[] = getRowRange(selectionList, testIndex)
  return binarySearch(range.map(cell => cell.col), selection.col) !== -1
}

function getRowRange(selectionList: Selection[], index: number): Selection[] {
  const range: Selection[] = [];
  const desiredRow = selectionList[index].row;
  let indexIterator: number = -1;
  while ((index + indexIterator) >= 0) {
    if (selectionList[index + indexIterator].row === desiredRow) {
      indexIterator--;
    } else { break; }
  }

  indexIterator++;
  while ((index + indexIterator) < selectionList.length) {
    if (selectionList[index + indexIterator].row === desiredRow) {
      range.push(Selection.clone(selectionList[index + indexIterator]))
      indexIterator++;
    } else { break; }
  }

  return range;
}

export function getBoardGridStyle(numOfBoards: number): { gridTemplateRows: string, gridTemplateColumns: string} {
  const numOfCols: number = Math.ceil(Math.sqrt(numOfBoards))
  const numOfRows: number = (numOfCols - 1) + Number((numOfBoards > nextLargestPerfectSquare(numOfBoards) - Math.sqrt(nextLargestPerfectSquare(numOfBoards))))

  return {
    gridTemplateColumns: `repeat(${numOfCols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${numOfRows}, minmax(0, 1fr))`
  }
}

export function millisecondsToTimeString(milliseconds: number): string {
  const minutes: number = Math.floor(milliseconds / 1000 / 60)
  const seconds: number = Math.floor(( milliseconds - ( minutes * 60 * 1000) ) / 1000)
  const remainingMilliseconds: number = Math.floor(milliseconds - (seconds * 1000) - (minutes * 1000 * 60))
  return ` ${ minutes } minute${minutes === 1 ? "" : "s"}, ${ seconds } second${seconds === 1 ? "" : "s"}, ${ remainingMilliseconds } m${remainingMilliseconds === 1 ? "" : "s"} `
}

//TODO: TYPE ALL REDUCERS

export function boardStatesReducer(state: any, action: any): any {
    const {type, id, request, all = false} = action;
    const chosenBoard: any = state.filter((board: any) => board.id === id)?.[0];
    const newBoard: any = cloneDeep(chosenBoard);
    switch (type) {
      case "remove":
        if (id == null && !all) {
          console.log("cannot remove a board with no id");
          return state;
        }
        
        return all ? [] : state.filter((board: any) => board.id !== id)
      case "add":
        const { boardData } = action;
        if (boardData == null) {
          console.log("cannot add null board")
          return state
        }
        return state.concat(boardData).sort((first: any, second: any) => first.id - second.id)
      case "alter":
        if (!chosenBoard) return state
          const {accessor = "", newValue} = request
          const keys = accessor.split('.')
          if (keys.length === 0 || !("newValue" in request) || !chosenBoard) return state
      
          
          let currentProperty = newBoard
          while (keys.length > 1) {
              const key = keys.shift()
              if (`${key}` in currentProperty) {
                  currentProperty = currentProperty[key] 
              } else {
                  console.log("key ", key, " does not exist in board ", newBoard.id)
                  return state;
              }
          }
  
          
          const finalKey = keys.pop()
          // console.log('final key: ', finalKey)
      
          if (`${finalKey}` in currentProperty) {
              currentProperty[finalKey] = newValue
          } else {
              console.log("key ", finalKey, " does not exist in ", chosenBoard)
                return state;
          }

          // if (finalKey === 'selections') {
          //   currentProperty[finalKey] = getSortedSelections(newValue)
          // }

        return state.filter((board: any) => board.id !== id).concat(newBoard).sort((first: any, second: any) => first.id - second.id)
        case "set state":
          if (!id) {
            console.log("no valid id");
            return state;
          }
  
          const { newState } = action;
          return state.filter((board: any) => board.id !== id).concat(newState).sort((first: any, second: any) => first.id - second.id );
      default:
        console.log("No valid selected dispatch type: ", type)
        return state
      }
  }

  export function boardReducer(state: any, action: any): any {
    const {type, request} = action;
    const newBoard = cloneDeep(state);
    switch (type) {
      case "alter":
          if (request == null) return;
          const {accessor = "", newValue} = request
          const keys = accessor.split('.')
          if (keys.length === 0 || !("newValue" in request)) return state
      
          
          let currentProperty = newBoard
          while (keys.length > 1) {
              const key = keys.shift()
              if (`${key}` in currentProperty) {
                  currentProperty = currentProperty[key] 
              } else {
                  console.log("key ", key, " does not exist in board")
                  return state;
              }
          }
  
          
          const finalKey = keys.pop()
          // console.log('final key: ', finalKey)
      
          if (`${finalKey}` in currentProperty) {
              currentProperty[finalKey] = newValue
          } else {
              console.log("key ", finalKey, " does not exist in board")
              return state;
          }

          // if (finalKey === 'selections') {
          //   currentProperty[finalKey] = getSortedSelections(newValue)
          // }

          return newBoard
        case "set state":
          const { newState } = action;
          if (newState === null) {
            console.log("[boardReducer type 'set state'] Cannot set state to a new state because 'newState' is null " )
            return state;
          }
          return newState
      default:
        console.log("No valid selected dispatch type: ", type)
        return state
      }
  }

  export function patternsReducer(state: any, action: any): any {
    const { type, id } = action;
    switch (type) {
      case "add": {
        const { pattern } = action;
        if (pattern == null) {
          console.log("cannot add pattern with no pattern"); return state;
        }
        return state.concat(pattern)
      }
      case "set": {
        const { newState } = action;
        if (newState == null) {
          console.log("cannot set pattern array state without newState"); return state;
        }
        return newState;
      }
      case "replace": {
        const {oldPattern, newPattern} = action;
        const clonedState = cloneDeep(state);
        if (oldPattern == null) {
          console.log("cannot replace pattern array state without old pattern state"); return state;
        } else if (newPattern == null) {
          console.log("cannot set pattern array state without new pattern state"); return state;
        }

        for (let i = 0; i < clonedState.length; i++) {
          if (JSON.stringify(clonedState[i]) === JSON.stringify(oldPattern)) {
            clonedState[i] = newPattern;
            break;
          }
        }

        return clonedState; 
      }
      // case "edit": {

      // } break;
      default: console.log("cannot execute pattern action of type: ", type); return state;
    }
  }

export function binarySearch<Number>(list: Array<Number>, target: Number) {
    let left = 0;
    let right = list.length - 1
    let mid = Math.floor((right + left) / 2);
  
    while (left < right) {
      mid = Math.floor((right + left) / 2);
  
      if (list[mid] === target) {
        return mid;
      } else if (list[mid] < target) {
        left = mid + 1;
      } else if (list[mid] > target) {
        right = mid - 1
      }
    }
  
    mid = Math.floor((right + left) / 2);
    if (list[mid] === target) {
      return mid;
    }
  
    return -1;
  }