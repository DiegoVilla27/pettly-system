import { convertToParamMap } from '@angular/router';
import {
  createCategorySchema,
  updateCategorySchema,
  parseQueue,
  moneyLabel,
} from './catalog.mapper';
describe('Catalog contracts and price presentation', () => {
  it('keeps supported queue filters on reload and discards malformed URL values', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    expect(
      parseQueue(
        convertToParamMap({
          search: '  Alimento  ',
          organizationId: id,
          categoryId: 'invalid',
          page: '2',
          limit: '10',
        }),
      ),
    ).toEqual({ page: 2, limit: 10, search: 'Alimento', organizationId: id });
    expect(
      parseQueue(
        convertToParamMap({
          search: 'bad\nquery',
          page: '10001',
          limit: '999',
        }),
      ),
    ).toEqual({ page: 1, limit: 20 });
  });
  it('requires audit reasons, a normalized slug and an explicit nonterminal category change', () => {
    const reason = 'Reviewed taxonomy change';
    expect(
      createCategorySchema.safeParse({ name: 'Food', slug: 'Bad Slug', reason })
        .success,
    ).toBe(false);
    expect(
      updateCategorySchema.safeParse({
        profile: {},
        expectedVersion: 1,
        reason,
      }).success,
    ).toBe(false);
    expect(
      updateCategorySchema.safeParse({
        profile: { status: 'archived' },
        expectedVersion: 1,
        reason,
      }).success,
    ).toBe(false);
    expect(
      updateCategorySchema.safeParse({
        profile: { description: null, status: 'inactive' },
        expectedVersion: 1,
        reason,
      }).success,
    ).toBe(true);
  });
  it('scales integer minor units consistently and retains the actual currency', () => {
    expect(moneyLabel(1250000, 'COP')).toMatch(/COP.*12[.,]500[.,]00/);
    expect(moneyLabel(1250, 'USD')).toMatch(/USD.*12[.,]50/);
  });
});
