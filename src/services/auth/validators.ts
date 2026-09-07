/**
 * EOM Authentication & Form Validators
 * Phase 1: Authentication & Access Control
 * Strict validation for Ethiopian phone numbers, email uniqueness,
 * password strength policy, and account inputs.
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 4
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  errors: string[];
}

export interface EthiopianPhoneValidationResult {
  isValid: boolean;
  normalized: string;
  carrier?: 'Ethio Telecom' | 'Safaricom Ethiopia';
  error?: string;
}

/**
 * Validates Email according to standard RFC 5322 regex
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required.' };
  }
  const cleanEmail = email.trim();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. user@example.com).' };
  }
  return { isValid: true };
}

/**
 * Validates and Normalizes Ethiopian Phone Numbers
 * Valid prefixes: +251 9... / +251 7... / 09... / 07... / 9... / 7...
 */
export function validateEthiopianPhone(phone: string): EthiopianPhoneValidationResult {
  if (!phone || !phone.trim()) {
    return { isValid: false, normalized: '', error: 'Phone number is required.' };
  }

  // Remove whitespace, hyphens, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  let normalized = '';
  let carrier: 'Ethio Telecom' | 'Safaricom Ethiopia' | undefined;

  // Case 1: Starts with +251
  if (cleaned.startsWith('+251')) {
    const subscriber = cleaned.slice(4);
    if (/^[97]\d{8}$/.test(subscriber)) {
      normalized = `+251${subscriber}`;
      carrier = subscriber.startsWith('9') ? 'Ethio Telecom' : 'Safaricom Ethiopia';
    }
  } 
  // Case 2: Starts with 00251
  else if (cleaned.startsWith('00251')) {
    const subscriber = cleaned.slice(5);
    if (/^[97]\d{8}$/.test(subscriber)) {
      normalized = `+251${subscriber}`;
      carrier = subscriber.startsWith('9') ? 'Ethio Telecom' : 'Safaricom Ethiopia';
    }
  }
  // Case 3: Starts with 251 (without +)
  else if (cleaned.startsWith('251') && cleaned.length === 12) {
    const subscriber = cleaned.slice(3);
    if (/^[97]\d{8}$/.test(subscriber)) {
      normalized = `+251${subscriber}`;
      carrier = subscriber.startsWith('9') ? 'Ethio Telecom' : 'Safaricom Ethiopia';
    }
  }
  // Case 4: Starts with 09 or 07 (10 digits)
  else if (cleaned.startsWith('0') && cleaned.length === 10) {
    const subscriber = cleaned.slice(1);
    if (/^[97]\d{8}$/.test(subscriber)) {
      normalized = `+251${subscriber}`;
      carrier = subscriber.startsWith('9') ? 'Ethio Telecom' : 'Safaricom Ethiopia';
    }
  }
  // Case 5: Starts with 9 or 7 (9 digits)
  else if (/^[97]\d{8}$/.test(cleaned)) {
    normalized = `+251${cleaned}`;
    carrier = cleaned.startsWith('9') ? 'Ethio Telecom' : 'Safaricom Ethiopia';
  }

  if (!normalized) {
    return {
      isValid: false,
      normalized: '',
      error: 'Invalid Ethiopian phone format. Must be an Ethio Telecom (09...) or Safaricom (07...) number (e.g. +251 91 234 5678).'
    };
  }

  return {
    isValid: true,
    normalized,
    carrier
  };
}

/**
 * Validates Password strength according to secure policy
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const hasMinLength = (password || '').length >= 8;
  const hasUppercase = /[A-Z]/.test(password || '');
  const hasLowercase = /[a-z]/.test(password || '');
  const hasNumber = /[0-9]/.test(password || '');
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password || '');

  if (!hasMinLength) errors.push('At least 8 characters long');
  if (!hasUppercase) errors.push('At least one uppercase letter (A-Z)');
  if (!hasLowercase) errors.push('At least one lowercase letter (a-z)');
  if (!hasNumber) errors.push('At least one number (0-9)');
  if (!hasSpecialChar) errors.push('At least one special character (!@#$%^&*)');

  let score = 0;
  if (hasMinLength) score++;
  if (hasUppercase && hasLowercase) score++;
  if (hasNumber) score++;
  if (hasSpecialChar) score++;

  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  return {
    isValid,
    score,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    errors
  };
}

/**
 * Validates Full Name
 */
export function validateFullName(name: string): { isValid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Full name is required.' };
  }
  const cleanName = name.trim();
  if (cleanName.length < 3) {
    return { isValid: false, error: 'Full name must be at least 3 characters.' };
  }
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { isValid: false, error: 'Please provide both first and last name.' };
  }
  return { isValid: true };
}
