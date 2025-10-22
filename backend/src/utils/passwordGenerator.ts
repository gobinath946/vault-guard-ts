interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
  minNumbers?: number;
  minSpecial?: number;
  avoidAmbiguous?: boolean;
}

const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
const numberChars = '0123456789';
const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const ambiguousChars = '1lI0Oo';

export const generatePassword = (options: PasswordOptions): string => {
  const {
    length,
    uppercase,
    lowercase,
    numbers,
    special,
    minNumbers = 0,
    minSpecial = 0,
    avoidAmbiguous = false,
  } = options;

  let charPool = '';
  let password = '';

  // Build character pool based on options
  if (uppercase) {
    charPool += avoidAmbiguous 
      ? uppercaseChars.split('').filter(c => !ambiguousChars.includes(c)).join('')
      : uppercaseChars;
  }
  if (lowercase) {
    charPool += avoidAmbiguous
      ? lowercaseChars.split('').filter(c => !ambiguousChars.includes(c)).join('')
      : lowercaseChars;
  }
  if (numbers) {
    charPool += avoidAmbiguous
      ? numberChars.split('').filter(c => !ambiguousChars.includes(c)).join('')
      : numberChars;
  }
  if (special) {
    charPool += specialChars;
  }

  // Ensure minimum requirements are met
  if (charPool.length === 0) {
    throw new Error('At least one character type must be selected');
  }

  // Add required numbers
  for (let i = 0; i < minNumbers; i++) {
    const numChars = avoidAmbiguous
      ? numberChars.split('').filter(c => !ambiguousChars.includes(c)).join('')
      : numberChars;
    password += numChars[Math.floor(Math.random() * numChars.length)];
  }

  // Add required special characters
  for (let i = 0; i < minSpecial; i++) {
    password += specialChars[Math.floor(Math.random() * specialChars.length)];
  }

  // Fill the rest with random characters from the pool
  while (password.length < length) {
    password += charPool[Math.floor(Math.random() * charPool.length)];
  }

  // Shuffle the password to mix the required characters
  password = password.split('').sort(() => Math.random() - 0.5).join('');

  return password;
};