export type InteriorObjectType = 'command-chair' | 'bed' | 'galley' | 'water';

export interface InteriorObject {
  id: string;
  type: InteriorObjectType;
  name: string;
  x: number;
  y: number;
}

export const INTERIOR_OBJECTS: InteriorObject[] = [
  { id: 'chair-01', type: 'command-chair', name: 'Command Chair', x: 12, y: 8 },
  { id: 'bed-01', type: 'bed', name: 'Bed', x: 4, y: 12 },
  { id: 'galley-01', type: 'galley', name: 'Galley', x: 18, y: 4 },
  { id: 'water-01', type: 'water', name: 'Water Dispenser', x: 20, y: 4 }
];

export function getObjectAt(x: number, y: number): InteriorObject | undefined {
  return INTERIOR_OBJECTS.find((object) => object.x === x && object.y === y);
}

export function getNearbyObject(x: number, y: number): InteriorObject | undefined {
  const options = INTERIOR_OBJECTS.map((object) => ({
    object,
    distance: Math.abs(object.x - x) + Math.abs(object.y - y)
  }))
    .filter((entry) => entry.distance <= 1)
    .sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      if (a.object.type === 'command-chair' && b.object.type !== 'command-chair') {
        return -1;
      }
      if (b.object.type === 'command-chair' && a.object.type !== 'command-chair') {
        return 1;
      }
      return a.object.name.localeCompare(b.object.name);
    });

  return options[0]?.object;
}
