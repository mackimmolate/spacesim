import type { GameState } from './types';

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashState(state: GameState): string {
  const parts = [
    state.seed,
    state.renderSeed,
    state.rngState.toString(16),
    state.tick.toString(),
    state.time.toFixed(6),
    state.mode,
    state.player.roomId,
    state.player.x.toString(),
    state.player.y.toString(),
    state.player.moveCooldown.toFixed(3),
    state.inventory.rations.toString(),
    state.needs.hunger.toFixed(3),
    state.needs.thirst.toFixed(3),
    state.needs.fatigue.toFixed(3),
    state.needs.stress.toFixed(3),
    state.needs.morale.toFixed(3),
    state.company.credits.toFixed(2),
    state.company.payrollDueTime.toFixed(2),
    state.company.maxCrew.toString(),
    state.company.hiringSeed.toString(),
    state.company.opsEfficiency.toFixed(3),
    state.company.crew
      .map((member) => [
        member.id,
        member.role,
        member.payRate.toString(),
        member.needs.stress.toFixed(2),
        member.needs.morale.toFixed(2),
        member.needs.fatigue.toFixed(2),
        member.needs.loyalty.toFixed(2)
      ].join(','))
      .join(';'),
    state.company.candidates.map((candidate) => candidate.id).join(';'),
    state.company.pendingEvent ? state.company.pendingEvent.id : 'no-event',
    state.sector.nodes.length.toString(),
    state.sector.edges.length.toString(),
    state.sectorShip.nodeId,
    state.sectorShip.inTransit ? `${state.sectorShip.inTransit.fromId}-${state.sectorShip.inTransit.toId}-${state.sectorShip.inTransit.progress01.toFixed(3)}` : 'no-transit',
    state.shipStats.fuel.toFixed(2),
    state.shipStats.hull.toFixed(2),
    state.shipStats.towCapacity.toString(),
    state.shipStats.salvageRigLevel.toString(),
    state.shipStats.scannerKits.toString(),
    state.shipStats.salvageParts.toString(),
    state.shipStats.surveyData.toString(),
    state.factions.factions.map((faction) => `${faction.id}:${faction.reputation}`).join(';'),
    state.contracts.contracts
      .map((contract) => `${contract.id}:${contract.status}:${contract.type}`)
      .join(';'),
    state.contracts.activeOperation ? `${state.contracts.activeOperation.contractId}:${state.contracts.activeOperation.remainingTicks}` : 'no-op'
    state.ship.position.x.toFixed(6),
    state.ship.position.y.toFixed(6),
    state.ship.velocity.x.toFixed(6),
    state.ship.velocity.y.toFixed(6),
    state.camera.x.toFixed(3),
    state.camera.y.toFixed(3),
    state.camera.zoom.toFixed(3),
    state.log.join('~')
  ];
  return hashString(parts.join('|'));
}
