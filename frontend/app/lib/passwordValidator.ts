export interface PasswordValidation {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  }
  
  export function validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('One uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('One lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('One number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('One special character');
    }
    
    // Calculate strength
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    const passedChecks = 5 - errors.length;
    
    if (passedChecks >= 5) strength = 'strong';
    else if (passedChecks >= 3) strength = 'medium';
    
    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }