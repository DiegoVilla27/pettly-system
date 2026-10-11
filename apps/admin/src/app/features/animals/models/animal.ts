import type {
  ApiRequest,
  ApiResponse,
  ApiQuery,
  ApiMultipart,
} from '@pettly/api-client';
export type Animal = ApiResponse<'getAnimal'>;
export type AnimalRecord = ApiResponse<'createAnimal'>;
export type AnimalSummary = Pick<
  AnimalRecord,
  | 'id'
  | 'organizationId'
  | 'name'
  | 'species'
  | 'sex'
  | 'status'
  | 'version'
  | 'createdAt'
>;
export type AnimalPage = Omit<ApiResponse<'listAnimals'>, 'items'> & {
  items: AnimalSummary[];
};
export type AnimalQuery = ApiQuery<'listAnimals'> & {
  organizationId: string;
  page: number;
  limit: number;
};
export type AnimalProfile = ApiRequest<'createAnimal'>['profile'];
export type AnimalAudit = ApiResponse<'listAnimalAudit'>;
export type AnimalDecision = ApiRequest<'archiveAnimal'>;
export type AnimalUpload = ApiMultipart<'uploadAnimalPhoto'>;
export interface Shelter {
  id: string;
  name: string;
}
export interface AnimalContext {
  organizationId: string;
  animalId: string;
}
export type AnimalCommand = { context: AnimalContext } & (
  | { action: 'update'; body: ApiRequest<'updateAnimal'> }
  | { action: 'deceased'; body: ApiRequest<'updateAnimalStatus'> }
  | { action: 'archive'; body: AnimalDecision }
  | { action: 'upload'; body: AnimalUpload }
  | { action: 'remove'; mediaId: string; body: AnimalDecision }
);
export const species = [
  { value: 'dog', label: 'Perro' },
  { value: 'cat', label: 'Gato' },
  { value: 'bird', label: 'Ave' },
  { value: 'rabbit', label: 'Conejo' },
  { value: 'reptile', label: 'Reptil' },
  { value: 'rodent', label: 'Roedor' },
  { value: 'equine', label: 'Equino' },
  { value: 'other', label: 'Otra especie' },
] as const;
export const sexes = [
  { value: 'unknown', label: 'Sin determinar' },
  { value: 'female', label: 'Hembra' },
  { value: 'male', label: 'Macho' },
] as const;
export const sizes = [
  { value: 'unknown', label: 'Sin determinar' },
  { value: 'small', label: 'Pequeño' },
  { value: 'medium', label: 'Mediano' },
  { value: 'large', label: 'Grande' },
  { value: 'extra_large', label: 'Muy grande' },
] as const;
export const statuses = [
  { value: 'active', label: 'Activo' },
  { value: 'adopted', label: 'Adoptado' },
  { value: 'deceased', label: 'Fallecido' },
  { value: 'archived', label: 'Archivado' },
] as const;
export function speciesLabel(value: AnimalRecord['species']) {
  return species.find((s) => s.value === value)?.label ?? value;
}
export function statusLabel(value: AnimalRecord['status']) {
  return statuses.find((s) => s.value === value)?.label ?? value;
}
export const auditLabels: Record<
  AnimalAudit['items'][number]['action'],
  string
> = {
  'animal.created': 'Registro creado',
  'animal.updated': 'Perfil actualizado',
  'animal.status_changed': 'Estado actualizado',
  'animal.photo_added': 'Fotografía añadida',
  'animal.photo_removed': 'Fotografía eliminada',
  'animal.adopted': 'Adopción confirmada',
};
