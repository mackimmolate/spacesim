import { hashSeedToUint32, nextRng } from '../../sim/rng';

export interface StarLayerSpec {
  id: 'far' | 'mid' | 'near';
  parallax: number;
  count: number;
  radiusRange: [number, number];
  alphaRange: [number, number];
  color: number;
}

export interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export interface PlanetDescriptor {
  id: number;
  position: { x: number; y: number };
  radius: number;
  color: number;
  shadowColor: number;
  highlightColor: number;
  atmosphereColor: number;
  bandColors: number[];
  hasRings: boolean;
  ringColor: number;
  ringTilt: number;
  moons: Array<{ angle: number; distance: number; radius: number; color: number }>;
  parallax: number;
}

export interface SpaceDescriptor {
  seed: string;
  layers: StarLayerSpec[];
  planets: PlanetDescriptor[];
}

export const CHUNK_SIZE = 64;

function createSeededRng(seed: string): () => number {
  let state = hashSeedToUint32(seed);
  return () => {
    const next = nextRng(state);
    state = next.nextState;
    return next.value;
  };
}

function hslToHex(h: number, s: number, l: number): number {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r, g, b] = [0, 0, 0];
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const toHex = (value: number) => Math.round((value + m) * 255);
  return (toHex(r) << 16) + (toHex(g) << 8) + toHex(b);
}

export function generateSpaceDescriptor(seed: string): SpaceDescriptor {
  const rng = createSeededRng(seed);

  const layers: StarLayerSpec[] = [
    {
      id: 'far',
      parallax: 0.15,
      count: 160,
      radiusRange: [0.03, 0.06],
      alphaRange: [0.2, 0.5],
      color: 0x9db5ff
    },
    {
      id: 'mid',
      parallax: 0.35,
      count: 90,
      radiusRange: [0.05, 0.1],
      alphaRange: [0.35, 0.7],
      color: 0xcde1ff
    },
    {
      id: 'near',
      parallax: 0.65,
      count: 40,
      radiusRange: [0.08, 0.16],
      alphaRange: [0.55, 0.9],
      color: 0xffffff
    }
  ];

  const planetCount = 2 + Math.floor(rng() * 3);
  const planets: PlanetDescriptor[] = [];

  for (let i = 0; i < planetCount; i += 1) {
    const hue = rng() * 360;
    const baseColor = hslToHex(hue, 0.5 + rng() * 0.3, 0.4 + rng() * 0.2);
    const shadowColor = hslToHex(hue, 0.45, 0.2 + rng() * 0.15);
    const highlightColor = hslToHex(hue, 0.5, 0.65 + rng() * 0.15);
    const atmosphereColor = hslToHex((hue + 30) % 360, 0.6, 0.7);
    const bandCount = 3 + Math.floor(rng() * 4);
    const bandColors = Array.from({ length: bandCount }, () =>
      hslToHex((hue + rng() * 30) % 360, 0.35, 0.35 + rng() * 0.2)
    );
    const hasRings = rng() > 0.6;
    const moonCount = Math.floor(rng() * 3);
    const moons = Array.from({ length: moonCount }, () => ({
      angle: rng() * Math.PI * 2,
      distance: 1.6 + rng() * 1.5,
      radius: 0.15 + rng() * 0.2,
      color: hslToHex(hue, 0.2, 0.7 + rng() * 0.2)
    }));

    planets.push({
      id: i,
      position: {
        x: (rng() - 0.5) * 1800,
        y: (rng() - 0.5) * 1200
      },
      radius: 40 + rng() * 90,
      color: baseColor,
      shadowColor,
      highlightColor,
      atmosphereColor,
      bandColors,
      hasRings,
      ringColor: hslToHex(hue, 0.3, 0.6),
      ringTilt: (rng() - 0.5) * 0.6,
      moons,
      parallax: 0.12 + rng() * 0.08
    });
  }

  return {
    seed,
    layers,
    planets
  };
}

export function generateStarChunk(
  seed: string,
  layer: StarLayerSpec,
  chunkX: number,
  chunkY: number
): Star[] {
  const rng = createSeededRng(`${seed}-${layer.id}-${chunkX}-${chunkY}`);
  const stars: Star[] = [];
  for (let i = 0; i < layer.count; i += 1) {
    const x = rng() * CHUNK_SIZE;
    const y = rng() * CHUNK_SIZE;
    const radius = layer.radiusRange[0] + rng() * (layer.radiusRange[1] - layer.radiusRange[0]);
    const alpha = layer.alphaRange[0] + rng() * (layer.alphaRange[1] - layer.alphaRange[0]);
    stars.push({ x, y, radius, alpha });
  }
  return stars;
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashSpaceDescriptor(descriptor: SpaceDescriptor): string {
  const planets = descriptor.planets
    .map((planet) => {
      const moonHash = planet.moons
        .map((moon) => `${moon.angle.toFixed(3)}:${moon.distance.toFixed(2)}:${moon.radius.toFixed(2)}`)
        .join(',');
      return [
        planet.position.x.toFixed(2),
        planet.position.y.toFixed(2),
        planet.radius.toFixed(2),
        planet.color.toString(16),
        planet.hasRings ? '1' : '0',
        planet.ringTilt.toFixed(2),
        moonHash
      ].join('|');
    })
    .join('~');
  const layers = descriptor.layers
    .map((layer) => `${layer.id}:${layer.count}:${layer.parallax.toFixed(2)}`)
    .join('|');
  return hashString(`${descriptor.seed}|${layers}|${planets}`);
}
