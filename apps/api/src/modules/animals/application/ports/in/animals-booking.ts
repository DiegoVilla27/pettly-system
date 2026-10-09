export interface AnimalsBooking {
  forBooking(
    actorId: string,
    animalId: string,
  ): Promise<{ id: string; name: string; species: string }>;
}
export const ANIMALS_BOOKING = Symbol('ANIMALS_BOOKING');
