/**
 * Ship.ts - Ship definitions for the Battleship game
 *
 * Each ship has a position, size, orientation, and a name.
 */

/** Represents a single ship placed on the board */
export interface Ship {
  x: number;        // Starting column (0-9)
  y: number;        // Starting row (0-9)
  size: number;     // Length of the ship (2-5)
  horizontal: boolean; // true = horizontal, false = vertical
  name: string;     // Ship name (e.g., "Carrier")
}

/** Ship template used when creating ships */
export interface ShipTemplate {
  size: number;
  name: string;
}

/**
 * Standard Battleship fleet:
 * - Carrier: 5
 * - Battleship: 4
 * - Cruiser: 3
 * - Submarine: 3
 * - Destroyer: 2
 */
export const SHIP_TEMPLATES: ShipTemplate[] = [
  { size: 5, name: "Carrier" },
  { size: 4, name: "Battleship" },
  { size: 3, name: "Cruiser" },
  { size: 3, name: "Submarine" },
  { size: 2, name: "Destroyer" },
];

/** Total number of ship cells (for win detection) */
export const TOTAL_SHIP_CELLS = SHIP_TEMPLATES.reduce((sum, t) => sum + t.size, 0);
