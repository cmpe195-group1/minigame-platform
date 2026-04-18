/** A single cell on the Sudoku board */
export interface Cell {
  row: number;
  col: number;
  value: number;       // 0 = empty
  isGiven: boolean;    // true = pre-filled, cannot be changed
  playerId: number;    // which player filled this cell (0 = none / given)
  isCorrect: boolean;  // validity flag set after a move
}

/** Full 9×9 board */
export type Board = Cell[][];

/** Create an empty 9×9 board */
export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => ({
      row,
      col,
      value: 0,
      isGiven: false,
      playerId: 0,
      isCorrect: false,
    }))
  );
}

/** Deep-clone a board */
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/** Check whether placing `num` at (row, col) is valid per Sudoku rules */
export function isValidPlacement(
  board: Board,
  row: number,
  col: number,
  num: number
): boolean {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c].value === num) return false;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col].value === num) return false;
  }
  // Check 3×3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c].value === num) return false;
    }
  }
  return true;
}

/** Returns true when every cell has a non-zero value */
export function isBoardFull(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell.value !== 0));
}

/** Count cells that have been filled by players (not given) */
export function countFilledCells(board: Board): number {
  return board.flat().filter((c) => !c.isGiven && c.value !== 0).length;
}
