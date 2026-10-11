import {
  parseFilters,
  profileSchema,
  reasonSchema,
  birthDateSchema,
  mapAccess,
} from './users.mapper';
describe('User contract mapping', () => {
  it('normalizes URL filters and rejects unsupported values', () => {
    const query = new URLSearchParams(
      'page=-4&limit=999&status=unknown&role=owner&search=%20Camila%20&sortBy=password',
    );
    expect(parseFilters(query)).toEqual({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: 'Camila',
    });
  });
  it('validates names, real birth dates, phone, countries and privilege boundaries', () => {
    expect(
      profileSchema.safeParse({
        name: 'María-José',
        lastName: 'O’Connor',
        phone: '+573001234567',
        countryCode: 'CO',
        dateOfBirth: '1994-06-15',
      }).success,
    ).toBe(true);
    for (const profile of [
      { name: '123' },
      { phone: '3001234567' },
      { countryCode: 'XX' },
      { dateOfBirth: '2025-02-30' },
      { globalRole: 'super_admin' },
      { email: 'other@example.com' },
    ])
      expect(profileSchema.safeParse(profile).success).toBe(false);
    expect(birthDateSchema.safeParse('2999-01-01').success).toBe(false);
    expect(reasonSchema.safeParse('     abc    ').success).toBe(false);
    expect(reasonSchema.safeParse('A reason\nwith a newline').success).toBe(
      false,
    );
  });
  it('does not accept authorization belonging to a different account', () => {
    const id = '9d9dc708-d471-44d8-ab8a-463c04721baf';
    expect(() =>
      mapAccess(
        {
          userId: id,
          globalRole: 'user',
          globalPermissions: [],
          organizations: [],
        },
        '6ee2a5af-85e0-4109-b778-1d2eb73aad1c',
      ),
    ).toThrow('validar');
  });
});
