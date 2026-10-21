import type {
  AnimalResult,
  AnimalAudit,
  AnimalPhotoResult,
} from '../../results/animal';
import type { ListAnimalsQuery } from '../../queries/animal.queries';
export interface AnimalsWork {
  lock(key: string): Promise<void>;
  find(id: string): Promise<AnimalResult | null>;
  findMany(ids: string[]): Promise<AnimalResult[]>;
  create(state: AnimalResult): Promise<void>;
  save(state: AnimalResult): Promise<void>;
  list(query: ListAnimalsQuery): Promise<{
    items: AnimalResult[];
    total: number;
    page: number;
    limit: number;
  }>;
  photosMany(ids: string[]): Promise<AnimalPhotoResult[]>;
  photos(animalId: string): Promise<AnimalPhotoResult[]>;
  attach(photo: AnimalPhotoResult): Promise<void>;
  removePhoto(id: string): Promise<void>;
  audit(entry: AnimalAudit): Promise<void>;
  audits(
    id: string,
    page: number,
    limit: number,
  ): Promise<{
    items: AnimalAudit[];
    total: number;
    page: number;
    limit: number;
  }>;
}
export interface AnimalsRepository {
  run<T>(work: (context: AnimalsWork) => Promise<T>): Promise<T>;
}
export const ANIMALS_REPOSITORY = Symbol('ANIMALS_REPOSITORY');
