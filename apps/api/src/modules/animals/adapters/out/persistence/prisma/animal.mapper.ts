import type { Animal } from '@prisma/client';
import type { AnimalResult } from '../../../../application/results/animal';
export class AnimalPersistenceMapper {
  static result(row: Animal): AnimalResult {
    return {
      ...row,
      species: row.species as AnimalResult['species'],
      sex: row.sex as AnimalResult['sex'],
      size: row.size as AnimalResult['size'],
      status: row.status as AnimalResult['status'],
      dateOfBirth: row.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    };
  }
  static data(state: AnimalResult) {
    return {
      ...state,
      dateOfBirth: state.dateOfBirth
        ? new Date(state.dateOfBirth + 'T00:00:00Z')
        : null,
    };
  }
}
