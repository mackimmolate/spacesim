export type CrewRole = 'pilot' | 'engineer' | 'tech' | 'medic' | 'security' | 'generalist';

export interface CrewSkills {
  engineering: number;
  piloting: number;
  ops: number;
  medical: number;
  social: number;
}

export interface CrewContact {
  factionId?: string;
  name: string;
  relationship: 'ally' | 'rival' | 'debtor';
  hook: string;
}

export interface CrewBackground {
  origin: string;
  formerEmployer: string;
  notableEvent: string;
  reasonForHiring: string;
  personalGoal: string;
  contacts: CrewContact[];
  summary: string;
}

export interface CrewNeeds {
  stress: number;
  morale: number;
  fatigue: number;
  loyalty: number;
}

export interface CrewMember {
  id: string;
  name: string;
  portraitSeed: number;
  age?: number;
  role: CrewRole;
  skills: CrewSkills;
  traits: string[];
  background: CrewBackground;
  needs: CrewNeeds;
  payRate: number;
}

export interface Candidate extends CrewMember {
  signOnBonus: number;
}
