'use client';

import { validatePassword } from '@/app/lib/passwordValidator';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: Props) {
  if (!password) return null;
  
  const validation = validatePassword(password);
  
  const strengthColors = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500'
  };
  
  const strengthText = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong'
  };
  
  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${strengthColors[validation.strength]}`}
            style={{ 
              width: validation.strength === 'strong' ? '100%' : 
                     validation.strength === 'medium' ? '66%' : '33%' 
            }}
          />
        </div>
        <span className={`text-xs font-medium ${
          validation.strength === 'strong' ? 'text-green-600' :
          validation.strength === 'medium' ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {strengthText[validation.strength]}
        </span>
      </div>
      
      {/* Requirements Checklist */}
      <div className="text-xs space-y-1">
        {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 
          'One number', 'One special character'].map((req, idx) => {
          const isPassed = !validation.errors.includes(req);
          return (
            <div key={idx} className="flex items-center gap-2">
              {isPassed ? (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-gray-400" />
              )}
              <span className={isPassed ? 'text-green-600' : 'text-gray-500'}>
                {req}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}