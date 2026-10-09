export interface ServiceResourceDirectory {
  find(id: string): Promise<{
    id: string;
    organizationId: string;
    kind: string;
    capacity: number;
    status: string;
  } | null>;
}
export const SERVICE_RESOURCE_DIRECTORY = Symbol('SERVICE_RESOURCE_DIRECTORY');
