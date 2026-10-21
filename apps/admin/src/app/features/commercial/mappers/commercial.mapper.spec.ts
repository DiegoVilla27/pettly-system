import {
  mapPolicy,
  validateRequest,
  decimalAmount,
  percentToBasis,
} from './commercial.mapper';
import type { PolicyRequest } from '../models/commercial';
const id = '83657018-e4e5-49b1-ac69-3dcfc36e50b2';
const body: PolicyRequest = {
  currency: 'COP',
  enabled: true,
  pickupAddress: null,
  shippingRules: [{ countryCode: 'CO', city: 'Bogotá', feeMinor: 0 }],
  taxMode: 'included',
  taxRates: {},
  shippingTaxBasisPoints: 0,
  collector: 'platform',
  terms: 'Condiciones comerciales verificadas.',
  reason: 'Configuración comercial explícita',
  expectedVersion: 0,
};
describe('Commercial policy boundaries', () => {
  it('uses exact minor COP and basis points without rounding', () => {
    expect(decimalAmount('12000,50')).toBe(1200050);
    expect(decimalAmount('0')).toBe(0);
    expect(decimalAmount('1.999')).toBeNull();
    expect(percentToBasis('19')).toBe(1900);
    expect(percentToBasis('100.01')).toBeNull();
  });
  it('requires delivery, Colombia, split and unique cities', () => {
    expect(validateRequest(body)).toEqual(body);
    for (const override of [
      { shippingRules: [] },
      { collector: 'seller' },
      { currency: 'USD' },
      { shippingRules: [{ countryCode: 'US', city: 'Miami', feeMinor: 0 }] },
      {
        shippingRules: [
          ...body.shippingRules,
          { countryCode: 'CO', city: 'bogotá', feeMinor: 1 },
        ],
      },
    ])
      expect(() =>
        validateRequest({ ...body, ...override } as PolicyRequest),
      ).toThrow();
  });
  it('does not add tax to prices with included tax', () => {
    expect(() =>
      validateRequest({ ...body, shippingTaxBasisPoints: 1900 }),
    ).toThrow();
    expect(() =>
      validateRequest({ ...body, taxRates: { [id]: 1900 } }),
    ).toThrow();
    expect(
      validateRequest({ ...body, taxMode: 'added', taxRates: { [id]: 1900 } })
        .taxRates,
    ).toEqual({ [id]: 1900 });
  });
  it('rejects another organization and malformed responses', () => {
    expect(mapPolicy({ policy: null }, id)).toBeNull();
    expect(() =>
      mapPolicy(
        {
          policy: {
            ...body,
            organizationId: crypto.randomUUID(),
            version: 1,
            updatedAt: new Date().toISOString(),
          },
        },
        id,
      ),
    ).toThrow();
    expect(() =>
      mapPolicy({ policy: { ...body, organizationId: id, version: 0 } }, id),
    ).toThrow();
  });
});
