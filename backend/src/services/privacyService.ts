/**
 * Privacy Service
 * Handles masking and sanitization of PII (Personally Identifiable Information)
 * and sensitive health data for logging and storage.
 */

export class PrivacyService {
  /**
   * Masks sensitive health values (e.g., blood sugar, blood pressure)
   */
  maskHealthValue(value: string | number | undefined | null): string {
    if (value === undefined || value === null) return 'N/A';
    return '***';
  }

  /**
   * Masks email addresses (e.g., user@example.com -> u***@example.com)
   */
  maskEmail(email: string | undefined | null): string {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local[0]}***@${domain}`;
  }

  /**
   * Sanitizes a log object by masking known sensitive keys
   */
  sanitizeRequestData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = ['value', 'systolic', 'diastolic', 'pulse', 'email', 'password', 'code'];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeRequestData(sanitized[key]);
      }
    }

    return sanitized;
  }
}

export const privacyService = new PrivacyService();
