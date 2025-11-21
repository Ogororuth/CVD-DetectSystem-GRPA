'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/app/lib/api';
import { ChevronLeft, User, Shield, Calendar, X } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [twoFAModal, setTwoFAModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    gender: '',
    country: '',
    occupation: '',
    role: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
      setFormData({
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        age: response.data.age.toString(),
        gender: response.data.gender,
        country: response.data.country,
        occupation: response.data.occupation,
        role: response.data.role,
      });
      setLoading(false);
    } catch (err) {
      alert('Unable to load profile');
      router.push('/dashboard');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({
        ...formData,
        age: parseInt(formData.age),
      });
      alert('Profile updated successfully');
      setEditing(false);
      fetchProfile();
    } catch (err: any) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const enable2FA = async () => {
    setTwoFALoading(true);
    setTwoFAError('');

    try {
      const response = await authAPI.enable2FA();
      setQrCode(response.data.qr_code);
      setTwoFAModal(true);
    } catch (err: any) {
      setTwoFAError(err.response?.data?.error || 'Failed to enable two-factor authentication');
    } finally {
      setTwoFALoading(false);
    }
  };

  const verify2FA = async () => {
    if (!verificationCode) {
      setTwoFAError('Please enter verification code');
      return;
    }

    setTwoFALoading(true);
    setTwoFAError('');

    try {
      await authAPI.verify2FA(verificationCode);
      setTwoFAModal(false);
      setQrCode('');
      setVerificationCode('');
      fetchProfile();
    } catch (err: any) {
      setTwoFAError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setTwoFALoading(false);
    }
  };

  const disable2FA = async () => {
    if (!disablePassword) {
      setTwoFAError('Please enter your password');
      return;
    }

    setTwoFALoading(true);
    setTwoFAError('');

    try {
      await authAPI.disable2FA(disablePassword);
      setTwoFAModal(false);
      setDisablePassword('');
      fetchProfile();
    } catch (err: any) {
      setTwoFAError(err.response?.data?.error || 'Failed to disable two-factor authentication');
    } finally {
      setTwoFALoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-6 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                {user.first_name} {user.last_name}
              </h1>
              <p className="text-gray-600 mt-1 text-sm">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium capitalize border border-blue-100">
                  {user.role}
                </span>
                {user.two_fa_enabled && (
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium border border-green-100">
                    Two-Factor Enabled
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium"
              >
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
              {!user.two_fa_enabled ? (
                <button
                  onClick={enable2FA}
                  disabled={twoFALoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>{twoFALoading ? 'Setting Up...' : 'Enable 2FA'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setTwoFAModal(true)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Security</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {twoFAModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Two-Factor Authentication
                </h3>
                <button
                  onClick={() => setTwoFAModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {twoFAError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{twoFAError}</p>
                </div>
              )}

              {!user.two_fa_enabled && qrCode ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Scan this QR code with your authenticator application
                  </p>
                  
                  <div className="flex justify-center p-4 bg-gray-50 rounded-md border border-gray-200">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-mono text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="000000"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={verify2FA}
                      disabled={twoFALoading || verificationCode.length !== 6}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {twoFALoading ? 'Verifying...' : 'Verify and Enable'}
                    </button>
                    <button
                      onClick={() => setTwoFAModal(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : user.two_fa_enabled ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-md border border-green-200">
                    <span className="text-sm font-medium text-green-800">
                      Two-factor authentication is currently enabled
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter password to disable
                    </label>
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Your password"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={disable2FA}
                      disabled={twoFALoading}
                      className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                    <button
                      onClick={() => setTwoFAModal(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium text-sm"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-md text-gray-900 text-sm">{user.first_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium text-sm"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-md text-gray-900 text-sm">{user.last_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              {editing ? (
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium text-sm"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-md text-gray-900 text-sm">{user.age}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              {editing ? (
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium text-sm"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                  <option value="N">Prefer not to say</option>
                </select>
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-md text-gray-900 text-sm">
                  {user.gender === 'M' ? 'Male' : user.gender === 'F' ? 'Female' : user.gender === 'O' ? 'Other' : 'Prefer not to say'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium text-sm"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-md text-gray-900 text-sm">{user.country}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Occupation
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium text-sm"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-md text-gray-900 text-sm">{user.occupation}</p>
              )}
            </div>
          </div>

          {editing && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <Calendar className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-600 mb-1">Member Since</p>
            <p className="text-sm font-semibold text-gray-900">
              {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <User className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-600 mb-1">Email Status</p>
            <p className="text-sm font-semibold text-gray-900">
              {user.email_verified ? 'Verified' : 'Unverified'}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <Shield className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-600 mb-1">Two-Factor Auth</p>
            <p className="text-sm font-semibold text-gray-900">
              {user.two_fa_enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <Calendar className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-600 mb-1">Last Login</p>
            <p className="text-sm font-semibold text-gray-900">
              {user.last_login ? new Date(user.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}