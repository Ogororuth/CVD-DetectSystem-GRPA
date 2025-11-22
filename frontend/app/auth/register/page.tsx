'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/app/lib/api';
import PasswordStrengthIndicator from '@/app/components/PasswordStrengthIndicator';
import { validatePassword } from '@/app/lib/passwordValidator';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    age: '',
    gender: '',
    country: '',
    occupation: '',
    role: 'student'
  });

  // CVDetect Logo Component - same as dashboard
  const CVDetectLogo = () => (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-lg">CV</span>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-blue-500 font-semibold">CVDetect</p>
        <h1 className="text-xl font-semibold text-gray-900">Cardiovascular Analysis System</h1>
      </div>
    </div>
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError('Password does not meet security requirements');
      return;
    }

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register({
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name,
        last_name: formData.last_name,
        age: parseInt(formData.age),
        gender: formData.gender,
        country: formData.country,
        occupation: formData.occupation,
        role: formData.role
      });

      console.log('Registration response:', response.data);
      router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);

    } catch (err: any) {
      console.error('Registration error:', err);
      console.error('Full error response:', err.response?.data);
      
      const errorData = err.response?.data;
      let errorMessage = 'Registration failed. Please try again.';
      
      if (errorData) {
        if (errorData.email) {
          const emailError = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
          errorMessage = emailError;
        }
        else if (errorData.password) errorMessage = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        else if (errorData.first_name) errorMessage = `First name: ${Array.isArray(errorData.first_name) ? errorData.first_name[0] : errorData.first_name}`;
        else if (errorData.last_name) errorMessage = `Last name: ${Array.isArray(errorData.last_name) ? errorData.last_name[0] : errorData.last_name}`;
        else if (errorData.age) errorMessage = `Age: ${Array.isArray(errorData.age) ? errorData.age[0] : errorData.age}`;
        else if (errorData.gender) errorMessage = `Gender: ${Array.isArray(errorData.gender) ? errorData.gender[0] : errorData.gender}`;
        else if (errorData.country) errorMessage = `Country: ${Array.isArray(errorData.country) ? errorData.country[0] : errorData.country}`;
        else if (errorData.occupation) errorMessage = `Occupation: ${Array.isArray(errorData.occupation) ? errorData.occupation[0] : errorData.occupation}`;
        else if (errorData.error) errorMessage = errorData.error;
        else if (errorData.detail) errorMessage = errorData.detail;
        else if (typeof errorData === 'string') errorMessage = errorData;
        else errorMessage = JSON.stringify(errorData);
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Logo centered above the form container */}
        <div className="flex justify-center">
          <CVDetectLogo />
        </div>
        
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleRegister}>
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                      First Name *
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                      Last Name *
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter your last name"
                    />
                  </div>

                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                      Age *
                    </label>
                    <input
                      id="age"
                      name="age"
                      type="number"
                      required
                      min="13"
                      max="120"
                      value={formData.age}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter your age"
                    />
                  </div>

                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                      Gender *
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      required
                      value={formData.gender}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    >
                      <option value="">Select gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                      <option value="N">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                      Country *
                    </label>
                    <input
                      id="country"
                      name="country"
                      type="text"
                      required
                      value={formData.country}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter your country"
                    />
                  </div>

                  <div>
                    <label htmlFor="occupation" className="block text-sm font-medium text-gray-700">
                      Occupation *
                    </label>
                    <input
                      id="occupation"
                      name="occupation"
                      type="text"
                      required
                      value={formData.occupation}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter your occupation"
                    />
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                      I am a *
                    </label>
                    <select
                      id="role"
                      name="role"
                      required
                      value={formData.role}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    >
                      <option value="student">Student</option>
                      <option value="researcher">Researcher</option>
                      <option value="healthcare">Healthcare Professional</option>
                      <option value="personal">Personal Use</option>
                      <option value="technical">Technical Evaluation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password *
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Create a strong password"
                    />
                    <PasswordStrengthIndicator password={formData.password} />
                  </div>

                  <div>
                    <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700">
                      Confirm Password *
                    </label>
                    <input
                      id="password_confirm"
                      name="password_confirm"
                      type="password"
                      required
                      value={formData.password_confirm}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}