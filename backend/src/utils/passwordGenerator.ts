interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
  minNumbers: number;
  minSpecial: number;
  avoidAmbiguous: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL = '@!*&#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'il1Lo0O';

export const generatePassword = (options: PasswordOptions): string => {
  let charset = '';
  let password = '';

  if (options.uppercase) charset += UPPERCASE;
  if (options.lowercase) charset += LOWERCASE;
  if (options.numbers) charset += NUMBERS;
  if (options.special) charset += SPECIAL;

  if (options.avoidAmbiguous) {
    charset = charset.split('').filter(char => !AMBIGUOUS.includes(char)).join('');
  }

  // Ensure minimum requirements
  if (options.numbers && options.minNumbers > 0) {
    for (let i = 0; i < options.minNumbers; i++) {
      password += NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
    }
  }

  if (options.special && options.minSpecial > 0) {
    for (let i = 0; i < options.minSpecial; i++) {
      password += SPECIAL[Math.floor(Math.random() * SPECIAL.length)];
    }
  }

  // Fill remaining length
  const remainingLength = options.length - password.length;
  for (let i = 0; i < remainingLength; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};
