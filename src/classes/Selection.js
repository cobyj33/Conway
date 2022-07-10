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