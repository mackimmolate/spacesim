import type { Candidate, CrewMember } from '../crew/types';
import type { EventInstance } from '../events/types';

export interface CompanyState {
  credits: number;
  payrollDueTime: number;
  maxCrew: number;
  crew: CrewMember[];
  candidates: Candidate[];
  hiringSeed: number;
  opsEfficiency: number;
  pendingEvent: EventInstance | null;
}
