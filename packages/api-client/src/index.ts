import type { operations } from './generated/schema';
export { operationRoutes } from './generated/routes';
export type { operations, components, paths } from './generated/schema';
export type OperationId = keyof operations;
export type ApiRequest<K extends OperationId> = operations[K] extends {
  requestBody: { content: { 'application/json': infer T } };
}
  ? T
  : never;
type Success<R> = {
  [K in keyof R]: `${K & (string | number)}` extends `2${string}`
    ? R[K] extends { content: { 'application/json': infer T } }
      ? T
      : never
    : never;
}[keyof R];
export type ApiResponse<K extends OperationId> = Success<
  operations[K]['responses']
>;

export type ApiPath<K extends OperationId> = NonNullable<
  operations[K]['parameters']['path']
>;
export type ApiQuery<K extends OperationId> = NonNullable<
  operations[K]['parameters']['query']
>;

export { countryCodes } from './generated/reference-data';

/** Operations returning an authenticated JPEG rather than JSON. */
export type ApiImageOperationId = {
  [K in OperationId]: operations[K]['responses'] extends {
    200: { content: { 'image/jpeg': unknown } };
  }
    ? K
    : never;
}[OperationId];

/** File uploads derive their fields and paths from the multipart OpenAPI contract. */
export type ApiMultipartOperationId = {
  [K in OperationId]: operations[K] extends {
    requestBody: { content: { 'multipart/form-data': { file: string } } };
  }
    ? K
    : never;
}[OperationId];
export type ApiMultipart<K extends ApiMultipartOperationId> =
  operations[K] extends {
    requestBody: { content: { 'multipart/form-data': infer T } };
  }
    ? Omit<T, 'file'> & { file: File }
    : never;
