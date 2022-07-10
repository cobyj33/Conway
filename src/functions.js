
import { cloneDeep } from "lodash";
import { Selection } from "./classes/Selection.js"
import { Area } from "./classes/Area.js"


const audioContext = new AudioContext()
const VIEW_PADDING = 10;
export function currentTime() { return audioContext.currentTime }

  export function getAdjacentNeighbors(selection) {
    const {row: centerRow, col: centerCol} = selection
    return [
        new Selection(centerRow - 1, centerCol),
        new Selection(centerRow + 1, centerCol),
        new Selection(centerRow, centerCol - 1),
        new Selection(centerRow, centerCol + 1)
    ]
  }

  export function getNeighbors(selection) {
    const {row, col} = selection;
    return getAdjacentNeighbors(selection).concat([
        new Selection(row + 1, col + 1),
        new Selection(row - 1, col + 1),
        new Selection(row + 1, col - 1),
        new Selection(row - 1, col - 1)
    ])
  } 

  export function removeDuplicates(selectionList) {
    const tracker = new Set([])

    return selectionList.filter(cell => {
        const cellString = JSON.stringify(cell);
        if (tracker.has(cellString)) {
            return false;
        } else {
            tracker.add(cellString)
            return true
        }
    })
  }

  export function getLiveNeighbors(selection, living) {
    return getNeighbors(selection).filter(neighbor => living.has(JSON.stringify(neighbor)))
  }

  export function getLiveNeighborCount(selection, living) {
    let count = 0;
    for (let row = selection.row - 1; row <= selection.row + 1; row++) {
      for (let col = selection.col - 1; col <= selection.col + 1; col++) {
        if ( !(row === selection.row && col === selection.col)) {
          count += living.has(JSON.stringify(new Selection(row, col)))
        }
      }
    }
    return count;
  }

  export function getAreasToCheck(selections) {
      const areas = new Set([])
      selections.forEach(cell => [...getNeighbors(cell), Selection.clone(cell)].forEach(checkedCell => areas.add(JSON.stringify(checkedCell))))
      return [...areas].map(area => JSON.parse(area))
  }

  export function getNextGeneration(selections, selectionSet) {
    if (selectionSet == null) {
      selectionSet = new Set(selections.map(cell => JSON.stringify(cell)))
    }

    const testCells = getAreasToCheck(selections);
    const nextGenFilter = cell => {
        const numOfLiveNeighbors = getLiveNeighborCount(cell, selectionSet)
        if (selectionSet.has(JSON.stringify(cell))) {
            return numOfLiveNeighbors === 2 || numOfLiveNeighbors === 3 
        } 
        return numOfLiveNeighbors === 3
    }

    return testCells.filter(nextGenFilter)
  }

  export async function getNextGenerationParallel(selections, selectionSet) {
    if (selectionSet == null) {
      selectionSet = new Set(selections.map(cell => JSON.stringify(cell)))
    }

    
  }

  export function equalSelectionLists(firstList, secondList) {
    if (firstList.length !== secondList.length) return false
    const firstSet = new Set(firstList.map(sel => JSON.stringify(sel)))
    return secondList.every(sel => firstSet.has(JSON.stringify(sel)))
  }

  export function getRenderView(rendersRef, startingSelectionsJSON) {
    // const frames = rendersRef.current.getFrames(startingSelectionsJSON)
    // if (frames.length === 0) return null
    // const firstFrame = JSON.parse(frames[0])
    // let [minRow, minCol, maxRow, maxCol] = [Math.min(...firstFrame.map(cell => cell.row)),
    //   Math.min(...firstFrame.map(cell => cell.col)),
    //   Math.max(...firstFrame.map(cell => cell.row)),
    //   Math.max(...firstFrame.map(cell => cell.col))];

    // console.log(minRow, minCol, maxRow, maxCol)
    // frames.forEach(frame => {
    //   const data = JSON.parse(frame)
    //   console.log("data: ", data)
    //   const rows = data.map(cell => cell.row)
    //   const cols = data.map(cell => cell.col)
    //   minRow = Math.min(minRow, Math.min(...rows))
    //   minCol = Math.min(minCol, Math.min(...cols))
    //   maxRow = Math.max(maxRow, Math.max(...rows))
    //   maxCol = Math.max(maxCol, Math.max(...cols))
    // })

    // return Area.corners([{row: minRow, col: minCol}, {row: maxRow, col: maxCol}])
    return getPatternView({ selections: JSON.parse(startingSelectionsJSON) })
  }

  export function getPatternView({ selections }) {
    const initialArea = Area.corners(selections);
    const { row, col, width, height } = initialArea;
    return new Area(row - VIEW_PADDING, col - VIEW_PADDING, width + VIEW_PADDING, height + VIEW_PADDING)
  }

  export function rotateSelections90(selections) {
    const centerPoint = Area.corners(selections).center;
    return translateSelectionsAroundPoint(translateSelectionsAroundPoint(selections, {row: 0, col: 0}).map(cell => new Selection(-cell.col, cell.row)), centerPoint)  ;
  }

  export function mirrorOverY(selections) {
    const centerPoint = Area.corners(selections).center;
    return translateSelectionsAroundPoint(translateSelectionsAroundPoint(selections, {row: 0, col: 0}).map(cell => new Selection(cell.row, -cell.col)), centerPoint)  ;
  }

  export function mirrorOverX(selections) {
    const centerPoint = Area.corners(selections).center;
    return translateSelectionsAroundPoint(translateSelectionsAroundPoint(selections, {row: 0, col: 0}).map(cell => new Selection(-cell.row, cell.col)), centerPoint)  ;
  }

  export function translateSelectionsAroundPoint(selections, selection) {
    const patternArea = Area.corners(selections);
    const verticalTranslation = selection.row - patternArea.center.row
    const horizontalTranslation = selection.col - patternArea.center.col
    return selections.map(cell => new Selection(cell.row + verticalTranslation, cell.col + horizontalTranslation) )
  }

  export function translateSelections(selections, rows, cols) {
    return selections.map(cell => new Selection(cell.row + rows, cell.col + cols))
  }

  export function getLine(firstPoint, secondPoint) {
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

  export function getBox(firstPoint, secondPoint) {
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

  export function getFilledBox(firstPoint, secondPoint) {

  }

  export function getEllipse(firstPoint, secondPoint) {
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


export function nextLargestPerfectSquare(num) {
    return (Math.pow(Math.ceil(Math.sqrt(num)) , 2))
}

export function nextSmallestPerfectSquare(num) {
    return (Math.pow(Math.floor(Math.sqrt(num)) , 2))
}

export function average(nums) {
    return nums.reduce((acc, curr) => acc + curr, 0) / nums.length
}

const COLUMN_PRECISION = Math.pow(2, 16);
export function getSortedSelections(selections) {
  return selections.map(cell => Selection.clone(cell))
  .sort((cell1, cell2) => cell1.row - cell2.row + (cell1.col - cell2.col) / COLUMN_PRECISION)
}

export function isCellInSortedSelections(selection, selectionList) {
  const testIndex = binarySearch(selectionList.map(cell => cell.row), selection.row)
  if (testIndex === -1)
    return false;


  const range = getRowRange(selectionList, testIndex)
  return binarySearch(range.map(cell => cell.col), selection.col) !== -1
}

function getRowRange(selectionList, index) {
  const range = [];
  const desiredRow = selectionList[index].row;
  let indexIterator = -1;
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

export function getBoardGridStyle(numOfBoards) {
  const numOfCols = Math.ceil(Math.sqrt(numOfBoards))
  const numOfRows = (numOfCols - 1) + (numOfBoards > nextLargestPerfectSquare(numOfBoards) - Math.sqrt(nextLargestPerfectSquare(numOfBoards)))

  return {
    gridTemplateColumns: `repeat(${numOfCols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${numOfRows}, minmax(0, 1fr))`
  }
}

export function millisecondsToTimeString(milliseconds) {
  const minutes = Math.floor(milliseconds / 1000 / 60)
  const seconds = Math.floor(( milliseconds - ( minutes * 60 * 1000) ) / 1000)
  const remainingMilliseconds = Math.floor(milliseconds - (seconds * 1000) - (minutes * 1000 * 60))
  return ` ${ minutes } minute${minutes === 1 ? "" : "s"}, ${ seconds } second${seconds === 1 ? "" : "s"}, ${ remainingMilliseconds } m${remainingMilliseconds === 1 ? "" : "s"} `
}

export function boardStatesReducer(state, action) {
    const {type, id, request, all = false} = action;
    const chosenBoard = state.filter(board => board.id === id)?.[0];
    const newBoard = cloneDeep(chosenBoard);
    switch (type) {
      case "remove":
        if (id == null && !all) {
          console.log("cannot remove a board with no id");
          return state;
        }

        
        return all ? [] : state.filter(board => board.id !== id)
      case "add":
        const { boardData } = action;
        if (boardData == null) {
          console.log("cannot add null board")
          return state
        }
        return state.concat(boardData).sort((first, second) => first.id - second.id)
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

        return state.filter(board => board.id !== id).concat(newBoard).sort((first, second) => first.id - second.id)
        case "set state":
          if (!id) {
            console.log("no valid id");
            return state;
          }
  
          const { newState } = action;
          return state.filter(board => board.id !== id).concat(newState).sort((first, second) => first.id - second.id );
      default:
        console.log("No valid selected dispatch type: ", type)
        return state
      }
  }

  export function boardReducer(state, action) {
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

  export function patternsReducer(state, action) {
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

export function binarySearch(list, target) {
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