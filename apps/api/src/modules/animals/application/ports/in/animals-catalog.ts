import type { AnimalIdentity, AnimalCard } from '../../results/animal';
export interface AnimalsCatalog {
  find(id: string): Promise<AnimalIdentity | null>;
  cards(ids: string[]): Promise<{ animal: AnimalIdentity; card: AnimalCard }[]>;
  completeAdoption(
    actorId: string,
    animalId: string,
    reason: string,
    requestId: string,
  ): Promise<void>;
}
export const ANIMALS_CATALOG = Symbol('ANIMALS_CATALOG');
