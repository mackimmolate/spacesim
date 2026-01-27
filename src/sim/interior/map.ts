export const MAP_WIDTH = 24;
export const MAP_HEIGHT = 16;

export type InteriorTile = '#' | '.';

const WALL: InteriorTile = '#';
const FLOOR: InteriorTile = '.';

const interiorGrid: InteriorTile[][] = Array.from({ length: MAP_HEIGHT }, (_, y) =>
  Array.from({ length: MAP_WIDTH }, (_, x) => {
    if (x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1) {
      return WALL;
    }
    return FLOOR;
  })
);

export function getInteriorTile(x: number, y: number): InteriorTile | null {
  if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) {
    return null;
  }
  return interiorGrid[y][x];
}

export function isWalkable(x: number, y: number): boolean {
  return getInteriorTile(x, y) === FLOOR;
}
