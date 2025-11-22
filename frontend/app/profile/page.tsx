'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/app/lib/api';
import { ChevronLeft, User, Shield, Calendar, X, Smartphone, QrCode, KeyRound } from 'lucide-react';

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
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition text-sm font-medium"
              >
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
              {!user.two_fa_enabled ? (
                <button
                  onClick={enable2FA}
                  disabled={twoFALoading}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Shield className="w-4 h-4" />
                  <span>{twoFALoading ? 'Setting Up...' : 'Set up 2-Step'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setTwoFAModal(true)}
                  className="px-5 py-2.5 border border-blue-200 text-blue-700 rounded-full hover:bg-blue-50 transition text-sm font-semibold flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Manage 2-Step</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {twoFAModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500 mb-1">Security</p>
                  <h3 className="text-2xl font-semibold text-gray-900">Google-style 2-Step Verification</h3>
                </div>
                <button
                  onClick={() => setTwoFAModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {twoFAError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {twoFAError}
                </div>
              )}

              {!user.two_fa_enabled && qrCode ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Smartphone className="w-5 h-5 text-blue-600" />
                        <p className="text-sm font-semibold text-gray-900">Install authenticator</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Download Google Authenticator, Microsoft Authenticator, or any TOTP-compatible app.
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <QrCode className="w-5 h-5 text-blue-600" />
                        <p className="text-sm font-semibold text-gray-900">Scan QR code</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Use the app to scan the QR code below or enter the setup key provided.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 flex flex-col items-center gap-3">
                      <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50">
                        <img src={qrCode} alt="Authenticator QR Code" className="w-48 h-48" />
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        If you can’t scan, add the key manually in your authenticator app.
                      </p>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enter 6-digit verification code
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl tracking-[0.5em] font-mono text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="••••••"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Use the rotating code from your authenticator app.
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={verify2FA}
                          disabled={twoFALoading || verificationCode.length !== 6}
                          className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
                        >
                          {twoFALoading ? 'Verifying...' : 'Verify & Enable'}
                        </button>
                        <button
                          onClick={() => setTwoFAModal(false)}
                          className="px-5 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : user.two_fa_enabled ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">2-Step Verification is active</p>
                      <p className="text-sm text-green-800">
                        You’ll be asked for an authenticator code each time you sign in.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Enter password to disable protection
                    </label>
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Your password"
                    />
                    <p className="text-xs text-gray-500">
                      For your safety, disabling 2FA requires password confirmation.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={disable2FA}
                      disabled={twoFALoading || !disablePassword}
                      className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-semibold"
                    >
                      {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                    <button
                      onClick={() => setTwoFAModal(false)}
                      className="px-5 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Preparing secure setup...
                </div>
              )}
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
        </div>
      </div>
    </div>
  );
}