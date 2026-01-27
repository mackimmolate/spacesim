/**
 * Crew Panel Component
 * 
 * Displays crew roster, candidates, hiring, and crew events
 */

import type { GameState } from '../../sim/types';
import type { Candidate, CrewMember } from '../../sim/crew/types';
import type { EventInstance } from '../../sim/events/types';
import { UIComponent, formatNumber } from './UIComponent';

export interface CrewPanelProps {
  className: string;
  onGenerateCandidates: () => void;
  onHireCandidate: (candidateId: string) => void;
  onResolveEvent: (choiceId: 'A' | 'B') => void;
}

export class CrewPanel extends UIComponent<CrewPanelProps> {
  private header!: HTMLElement;
  private opsEfficiency!: HTMLElement;
  private rosterList!: HTMLElement;
  private crewDetails!: HTMLElement;
  private candidateHeader!: HTMLElement;
  private generateButton!: HTMLButtonElement;
  private candidateList!: HTMLElement;
  private eventPanel!: HTMLElement;

  private selectedCrewId: string | null = null;
  private selectedCandidateId: string | null = null;
  
  private lastCrewKey = '';
  private lastCandidateKey = '';
  private lastEventKey = '';

  protected initialize(): void {
    this.header = this.createElement('div', 'crew-header', 'Crew');
    this.opsEfficiency = this.createElement('div', 'crew-ops');
    this.rosterList = this.createElement('div', 'crew-roster');
    this.crewDetails = this.createElement('div', 'crew-details');
    this.candidateHeader = this.createElement('div', 'crew-subhead', 'Candidates');
    this.generateButton = this.createButton(
      'Generate Candidates',
      () => this.props.onGenerateCandidates()
    );
    this.candidateList = this.createElement('div', 'crew-candidates');
    this.eventPanel = this.createElement('div', 'crew-event');

    this.element.appendChild(this.header);
    this.element.appendChild(this.opsEfficiency);
    this.element.appendChild(this.rosterList);
    this.element.appendChild(this.crewDetails);
    this.element.appendChild(this.candidateHeader);
    this.element.appendChild(this.generateButton);
    this.element.appendChild(this.candidateList);
    this.element.appendChild(this.eventPanel);
  }

  protected render(): void {
    // This is called by update() if needed
  }

  /**
   * Update the panel with current game state
   */
  public updateState(state: GameState): void {
    this.updateOpsEfficiency(state.company.opsEfficiency);
    this.updateRoster(state.company.crew);
    this.updateCandidates(state.company.candidates);
    this.updateCrewDetails(state.company.crew, state.company.candidates);
    this.updateEvent(state.company.pendingEvent);
  }

  private updateOpsEfficiency(efficiency: number): void {
    this.opsEfficiency.textContent = `Ops Efficiency: x${efficiency.toFixed(2)}`;
  }

  private updateRoster(crew: CrewMember[]): void {
    const crewKey = crew
      .map((member) => `${member.id}:${member.role}:${member.payRate}`)
      .join('|');

    if (crewKey === this.lastCrewKey) {
      // Just update selection state
      this.updateRosterSelection();
      return;
    }

    this.rosterList.innerHTML = '';
    crew.forEach((member) => {
      const button = this.createCrewButton(member);
      this.rosterList.appendChild(button);
    });

    // Check if selected crew still exists
    if (this.selectedCrewId && !crew.some((m) => m.id === this.selectedCrewId)) {
      this.selectedCrewId = null;
    }

    this.lastCrewKey = crewKey;
  }

  private createCrewButton(member: CrewMember): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'crew-entry';
    button.dataset.crewId = member.id;
    button.textContent = `${member.name} (${member.role}) - ${member.payRate} cr/day`;
    
    button.addEventListener('click', () => {
      const isSelected = this.selectedCrewId === member.id;
      this.selectedCrewId = isSelected ? null : member.id;
      if (!isSelected) {
        this.selectedCandidateId = null;
        this.crewDetails.scrollTo({ top: 0 });
      }
      this.updateRosterSelection();
      this.updateCandidateSelection();
    });
    
    return button;
  }

  private updateRosterSelection(): void {
    this.rosterList.querySelectorAll<HTMLButtonElement>('button.crew-entry').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.crewId === this.selectedCrewId);
    });
  }

  private updateCandidates(candidates: Candidate[]): void {
    const candidateKey = candidates
      .map((candidate) => `${candidate.id}:${candidate.signOnBonus}`)
      .join('|');

    if (candidateKey === this.lastCandidateKey) {
      this.updateCandidateSelection();
      return;
    }

    this.candidateList.innerHTML = '';

    if (candidates.length === 0) {
      const empty = this.createElement(
        'div',
        'candidate-empty',
        'No candidates available. Generate a new slate.'
      );
      this.candidateList.appendChild(empty);
    } else {
      candidates.forEach((candidate) => {
        const row = this.createCandidateRow(candidate);
        this.candidateList.appendChild(row);
      });
    }

    // Check if selected candidate still exists
    if (this.selectedCandidateId && !candidates.some((c) => c.id === this.selectedCandidateId)) {
      this.selectedCandidateId = null;
    }

    this.lastCandidateKey = candidateKey;
  }

  private createCandidateRow(candidate: Candidate): HTMLElement {
    const row = this.createElement('div', 'candidate-row');

    const info = document.createElement('button');
    info.type = 'button';
    info.className = 'candidate-info';
    info.dataset.candidateId = candidate.id;
    info.textContent = `${candidate.name} (${candidate.role}) - bonus ${candidate.signOnBonus} cr`;
    
    info.addEventListener('click', () => {
      const isSelected = this.selectedCandidateId === candidate.id;
      this.selectedCandidateId = isSelected ? null : candidate.id;
      if (!isSelected) {
        this.selectedCrewId = null;
      }
      this.updateCandidateSelection();
      this.updateRosterSelection();
    });

    const hire = this.createButton('Hire', () => this.props.onHireCandidate(candidate.id));

    row.appendChild(info);
    row.appendChild(hire);
    return row;
  }

  private updateCandidateSelection(): void {
    this.candidateList
      .querySelectorAll<HTMLButtonElement>('button.candidate-info')
      .forEach((button) => {
        button.classList.toggle(
          'is-selected',
          button.dataset.candidateId === this.selectedCandidateId
        );
      });
  }

  private updateCrewDetails(crew: CrewMember[], candidates: Candidate[]): void {
    const selectedCrew = crew.find((m) => m.id === this.selectedCrewId);
    const selectedCandidate = candidates.find((c) => c.id === this.selectedCandidateId);
    const detailTarget = selectedCrew ?? selectedCandidate;

    if (!detailTarget) {
      this.crewDetails.innerHTML = '';
      return;
    }

    this.crewDetails.innerHTML = '';

    const header = this.createElement(
      'div',
      'crew-detail-title',
      `${detailTarget.name} - ${detailTarget.role}`
    );

    const traits = this.createElement(
      'div',
      'crew-detail-traits',
      `Traits: ${detailTarget.traits.join(', ') || 'None'}`
    );

    const needs = this.createElement(
      'div',
      'crew-detail-needs',
      `Morale ${formatNumber(detailTarget.needs.morale)} | ` +
      `Stress ${formatNumber(detailTarget.needs.stress)} | ` +
      `Fatigue ${formatNumber(detailTarget.needs.fatigue)} | ` +
      `Loyalty ${formatNumber(detailTarget.needs.loyalty)}`
    );

    const summary = this.createElement(
      'div',
      'crew-detail-summary',
      detailTarget.background.summary
    );

    this.crewDetails.appendChild(header);
    this.crewDetails.appendChild(needs);
    this.crewDetails.appendChild(traits);
    this.crewDetails.appendChild(summary);

    if (detailTarget.background.contacts.length > 0) {
      const contact = detailTarget.background.contacts[0];
      const contactLine = this.createElement(
        'div',
        'crew-detail-contact',
        `Contact: ${contact.name} (${contact.relationship}) - ${contact.hook}`
      );
      this.crewDetails.appendChild(contactLine);
    }
  }

  private updateEvent(event: EventInstance | null): void {
    const eventKey = event
      ? `${event.id}:${event.choices.map((c) => c.id).join(',')}`
      : '';

    if (eventKey === this.lastEventKey) {
      return;
    }

    this.eventPanel.innerHTML = '';

    if (event) {
      const title = this.createElement('div', 'event-title', event.title);
      const description = this.createElement('div', 'event-desc', event.description);
      const choices = this.createElement('div', 'event-choices');

      event.choices.forEach((choice) => {
        const button = this.createButton(choice.label, () =>
          this.props.onResolveEvent(choice.id)
        );
        choices.appendChild(button);
      });

      this.eventPanel.appendChild(title);
      this.eventPanel.appendChild(description);
      this.eventPanel.appendChild(choices);

      // Trigger animation
      this.eventPanel.classList.remove('event-enter');
      void this.eventPanel.offsetWidth; // Force reflow
      this.eventPanel.classList.add('event-enter');
    }

    this.lastEventKey = eventKey;
  }
}
