import type { CredentialDto } from '../models/credential';
export const credentialFixture: CredentialDto = {
  id: '83657018-e4e5-49b1-ac69-3dcfc36e50b2',
  organizationId: '7b6670df-16a7-4f24-82aa-58b9d80dd322',
  professionalId: 'cb8a53b4-f521-4e71-aeeb-c9e32c61bca0',
  resourceId: '031d78af-7ea9-4943-a099-7bed2a5f4e89',
  profession: 'veterinarian',
  registrationNumber: '123456',
  university: 'Universidad de prueba',
  consent: true,
  status: 'pending',
  version: 5,
  documents: [
    {
      mediaId: 'e9bba636-b773-4cce-88f6-fb9b8201826a',
      kind: 'professional_card',
    },
  ],
  reviewedBy: null,
  reviewedAt: null,
  verifiedUntil: null,
  verificationReference: null,
  createdAt: '2026-10-09T10:00:00.000Z',
  updatedAt: '2026-10-09T11:00:00.000Z',
};
