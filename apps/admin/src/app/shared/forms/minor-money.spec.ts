import { copToMinor, minorToInput } from './minor-money';
describe('Exact COP conversion', () => {
  it.each([
    ['19999,95', 1999995],
    ['0.01', 1],
    ['21474836.47', 2147483647],
    ['1.1', 110],
  ])('converts %s with integer arithmetic', (input, expected) =>
    expect(copToMinor(String(input))).toBe(expected),
  );
  it.each(['0', '-1', '1e3', '1,000.00', '1.001', '21474836.48'])(
    'rejects %s',
    (input) => expect(copToMinor(input)).toBeNull(),
  );
  it('round-trips maximum price', () =>
    expect(copToMinor(minorToInput(2147483647))).toBe(2147483647));
});
