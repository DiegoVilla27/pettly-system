export class GetAnimalQuery {
  constructor(
    readonly actorId: string,
    readonly animalId: string,
  ) {}
}
export class ListAnimalsQuery {
  constructor(
    readonly actorId: string,
    readonly organizationId: string | null = null,
    readonly page = 1,
    readonly limit = 20,
    readonly search?: string,
    readonly species?: string,
    readonly status?: string,
  ) {}
}
