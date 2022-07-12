import { removeDuplicates } from "../functions";
import { Selection } from "./Selection";

export class Area {
    row: number
    col: number
    width: number
    height: number
    selected: Selection[]

    constructor(row: number = 0, col: number = 0, width: number = 0, height: number = 0) {
        this.row = row;
        this.col = col;
        this.width = width;
        this.height = height
        this.selected = []
    }
    
    get rightSide(): number {
        return this.col + this.width - 1
    }
  
    get bottomSide(): number {
        return this.row + this.height - 1
    }
  
    get area(): number {
        return this.width * this.height
    }

    get center(): Selection {
      return new Selection(this.row + Math.round(this.height / 2), this.col + Math.round(this.width / 2))
    }
  
    get info(): number[] {
        return [this.row, this.col, this.width, this.height]
    }

    get topLeft(): Selection {
      return new Selection(this.row, this.col)
    }

    get topRight(): Selection {
      return new Selection(this.row, this.rightSide)
    }

    get bottomLeft(): Selection {
      return new Selection(this.bottomSide, this.col)
    }

    get bottomRight(): Selection {
      return new Selection(this.bottomSide, this.rightSide);
    }

    static clone( { row, col, width, height }: { row: number, col: number, width: number, height: number } ) {
      return new Area(row, col, width, height)
    }

    static corners(points: Selection[]): Area {
      // const [first, second, third, fourth] = points
      if (points.length < 1) {
        console.error('not all corners available')
        return new Area(0, 0, 0, 0);
      } else if (points.length === 1) {
        const point = points[0]
        return new Area(point.row, point.col, 1, 1)
      }

      const row: number = Math.min(...points.map(point => point.row))
      const col: number = Math.min(...points.map(point => point.col))
      const width: number = Math.max(...points.map(point => Math.abs(col - point.col))) + 1
      const height: number = Math.max(...points.map(point => Math.abs(row - point.row))) + 1

      return new Area(row, col, width, height)
    }
  
    intersectsOrContains({row, col, width = 1, height = 1}: { row: number, col: number, width?: number, height?: number }) {
        if (this.width === 0 || this.height === 0 || width === 0 || height === 0) return false
        return ((this.row <= row && this.row + this.height > row) || (row <= this.row && row + height > this.row)) && ((this.col <= col && this.col + this.width > col) || (col <= this.col && col + width > this.col))
    }

    isSelectionOnEdge({row, col}: { row: number, col: number }) {
      if (this.width === 0 || this.height === 0) return false
      return ( (row === this.row || row === this.bottomSide) && (col >= this.col && col <= this.rightSide) ) || ( (col === this.col || col === this.rightSide) && (row >= this.row && row <= this.bottomSide) )
     }

     getEdgeAreas(): Area[] {
        const topEdge: Area = new Area(this.row, this.col, this.width, 1)
        const leftEdge: Area = new Area(this.row, this.col, 1, this.height)
        const bottomEdge: Area = new Area(this.bottomSide, this.col, this.width, 1)
        const rightEdge: Area = new Area(this.row, this.rightSide, 1, this.height)
       return [topEdge, leftEdge, bottomEdge, rightEdge]
     }

     getCellsOnEdge(): Selection[] {
      return removeDuplicates(this.getEdgeAreas().flatMap(area => area.getAllInnerCells()));
     }

    getAllInnerCells(): Selection[] {
      if (this.width === 0 || this.height === 0) return []

      const innerCells: Selection[] = []
      for (let row = this.row; row <= this.bottomSide; row++) {
        for (let col = this.col; col <= this.rightSide; col++) {
          innerCells.push(new Selection(row, col))
        }
      }
      return innerCells;
    }
  }