import { removeDuplicates } from "../functions";
import { Selection } from "./Selection";

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

    static clone( { row, col, width, height } ) {
      return new Area(row, col, width, height)
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