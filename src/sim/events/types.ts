export type EventChoiceId = 'A' | 'B';

export interface EventChoice {
  id: EventChoiceId;
  label: string;
}

export interface EventTemplate {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

export interface EventInstance {
  id: string;
  title: string;
  description: string;
  crewId?: string;
  choices: EventChoice[];
}
