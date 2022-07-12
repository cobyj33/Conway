import { RecordWithTtl } from "dns"

export interface ISelection {
  readonly row: number;
    readonly col: number;
    readonly isSelected: boolean;
}
export class Selection implements ISelection {
    readonly  row: number;
    readonly  col: number;
    readonly  isSelected: boolean;

    constructor(row: number, col: number, isSelected: boolean = false) {
      this.row = row
      this.col = col
      this.isSelected = isSelected
    }

    static distanceBetween(first: Selection, second: Selection): number {
      return Math.sqrt( Math.pow(( first.col - second.col), 2) + Math.pow(( first.row - second.row ), 2) )
    } 

    static clone({row, col, isSelected}: { row: number, col: number, isSelected?: boolean}): Selection {
      return new Selection(row, col, isSelected)
    }

    static fromInterface(selection: ISelection): Selection {
      return new Selection(selection.row, selection.col, selection.isSelected);
    }
  }