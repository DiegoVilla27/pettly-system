import { ApplicationError } from '../../../../shared/domain/application-error';
import { text } from '../value-objects/product-details';
export interface CategoryState {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'active' | 'inactive' | 'archived';
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
export class Category {
  static create(
    id: string,
    name: string,
    slug: string,
    description: string | null,
    now: Date,
  ): CategoryState {
    return {
      id,
      ...this.details(name, slug, description),
      status: 'active',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
  }
  static details(name: string, slug: string, description: string | null) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Use a lowercase category slug.',
      );
    return {
      name: text(name, 2, 100),
      slug,
      description: description === null ? null : text(description, 2, 1000),
    };
  }
  static update(
    state: CategoryState,
    details: Partial<
      Pick<CategoryState, 'name' | 'slug' | 'description' | 'status'>
    >,
    expected: number,
    now: Date,
  ): CategoryState {
    if (state.version !== expected)
      throw new ApplicationError('CONFLICT', 'The category changed.');
    if (state.status === 'archived')
      throw new ApplicationError(
        'CONFLICT',
        'Archived categories are terminal.',
      );
    if (
      details.status &&
      !['active', 'inactive', 'archived'].includes(details.status)
    )
      throw new ApplicationError('INVALID_INPUT', 'Invalid category status.');
    return {
      ...state,
      ...this.details(
        details.name ?? state.name,
        details.slug ?? state.slug,
        details.description === undefined
          ? state.description
          : details.description,
      ),
      status: details.status ?? state.status,
      version: state.version + 1,
      updatedAt: now,
    };
  }
}
