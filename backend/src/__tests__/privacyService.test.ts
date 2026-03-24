import { PrivacyService } from '../services/privacyService';

describe('PrivacyService', () => {
  const privacyService = new PrivacyService();

  test('maskEmail should hide parts of the email', () => {
    expect(privacyService.maskEmail('user@example.com')).toBe('u***@example.com');
  });

  test('maskHealthValue should hide data', () => {
    expect(privacyService.maskHealthValue(120)).toBe('***');
  });

  test('sanitizeRequestData should mask sensitive keys recursively', () => {
    const data = {
      email: 'user@test.com',
      profile: {
        fullName: 'John Doe',
        code: '123456'
      },
      readings: [{ value: 95 }]
    };
    
    const sanitized = privacyService.sanitizeRequestData(data);
    expect(sanitized.email).toBe('***');
    expect(sanitized.profile.code).toBe('***');
    expect(sanitized.readings[0].value).toBe('***');
    expect(sanitized.profile.fullName).toBe('John Doe');
  });
});
