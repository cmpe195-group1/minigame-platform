import { type Board, createEmptyBoard } from "./SudokuBoard";

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Recursively fill the board using backtracking.
 * Works on the raw number grid (number[][]) for speed.
 */
function fillGrid(grid: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (canPlace(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false; // backtrack
      }
    }
  }
  return true; // all cells filled
}

function canPlace(grid: number[][], row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num) return false;
    if (grid[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

/**
 * Remove `clues` cells from the grid to create a puzzle.
 * `clues` = number of cells to KEEP (hint cells).
 */
function removeNumbers(grid: number[][], clues: number): number[][] {
  const puzzle = grid.map((r) => [...r]);
  let removed = 81 - clues;
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => i)
  );
  for (const pos of positions) {
    if (removed <= 0) break;
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      removed--;
    }
  }
  return puzzle;
}

/**
 * Generate a complete Sudoku puzzle.
 * Returns a Board with `isGiven` set for pre-filled cells.
 * Difficulty controls how many given cells remain (30–45 range).
 */
export function generateSudokuBoard(clues = 36): Board {
  // Build a fully solved grid
  const solved: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillGrid(solved);

  // Remove numbers to create the puzzle
  const puzzle = removeNumbers(solved, clues);

  // Convert to Board structure
  const board = createEmptyBoard();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = puzzle[r][c];
      board[r][c].value = val;
      board[r][c].isGiven = val !== 0;
      board[r][c].isCorrect = val !== 0;
      // Store solved value for validation later
      (board[r][c] as any).solvedValue = solved[r][c];
    }
  }
  return board;
}

/** Check if a number placed by a player is correct (matches the solved value) */
export function checkPlacement(board: Board, row: number, col: number, num: number): boolean {
  const solvedValue = (board[row][col] as any).solvedValue;
  return solvedValue === num;
}
