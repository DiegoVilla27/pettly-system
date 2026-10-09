import type { AnimalProfile } from '../results/animal';
export class CreateAnimalCommand {
  constructor(
    readonly actorId: string,
    readonly profile: AnimalProfile,
    readonly organizationId: string | null,
    readonly reason: string,
    readonly requestId: string,
  ) {}
}
export class UpdateAnimalCommand {
  constructor(
    readonly actorId: string,
    readonly animalId: string,
    readonly profile: Partial<AnimalProfile>,
    readonly reason: string,
    readonly requestId: string,
    readonly expectedVersion: number,
  ) {}
}
export class AnimalDecisionCommand {
  constructor(
    readonly actorId: string,
    readonly animalId: string,
    readonly reason: string,
    readonly requestId: string,
    readonly expectedVersion: number,
    readonly status?: 'active' | 'deceased' | 'archived',
  ) {}
}
export class UploadAnimalPhotoCommand extends AnimalDecisionCommand {
  constructor(
    actorId: string,
    animalId: string,
    reason: string,
    requestId: string,
    expectedVersion: number,
    readonly bytes: Uint8Array,
    readonly mime: string,
  ) {
    super(actorId, animalId, reason, requestId, expectedVersion);
  }
}
export class RemoveAnimalPhotoCommand extends AnimalDecisionCommand {
  constructor(
    actorId: string,
    animalId: string,
    reason: string,
    requestId: string,
    expectedVersion: number,
    readonly mediaId: string,
  ) {
    super(actorId, animalId, reason, requestId, expectedVersion);
  }
}
