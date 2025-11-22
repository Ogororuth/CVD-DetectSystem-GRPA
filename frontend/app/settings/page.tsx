'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/app/lib/api';
import TwoFASetupModal from './TwoFASetupModal';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  
  const [disable2FAPassword, setDisable2FAPassword] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
      setLoading(false);
    } catch (err) {
      router.push('/dashboard');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      alert('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
        new_password_confirm: passwordData.new_password_confirm,
      });
      alert('Password changed successfully');
      setPasswordData({ old_password: '', new_password: '', new_password_confirm: '' });
    } catch (err: any) {
      alert(err.response?.data?.old_password?.[0] || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendVerification = async () => {
    setSendingVerification(true);
    try {
      await authAPI.resendVerification(user.email);
      alert('Verification email sent. Please check your inbox.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send verification email');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleEnable2FA = () => {
    setShow2FASetup(true);
  };

  const handleDisable2FA = async () => {
    if (!disable2FAPassword) {
      alert('Please enter your password to disable 2FA');
      return;
    }

    if (!confirm('Are you sure you want to disable Two-Factor Authentication? This will reduce your account security.')) {
      return;
    }

    setDisabling2FA(true);
    try {
      await authAPI.disable2FA(disable2FAPassword);
      await fetchUser();
      setDisable2FAPassword('');
      alert('Two-Factor Authentication has been disabled');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to disable 2FA. Please check your password.');
    } finally {
      setDisabling2FA(false);
    }
  };

  const handle2FASetupComplete = () => {
    setShow2FASetup(false);
    fetchUser();
  };

  const handleDeleteAccount = async () => {
    const password = prompt('Enter your password to confirm permanent account deletion:');
    if (!password) return;
    
    if (confirm('FINAL WARNING: This will permanently delete your account and all data. This action cannot be undone.')) {
      try {
        await authAPI.deleteAccount(password);
        alert('Account has been permanently deleted.');
        router.push('/');
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete account. Please check your password.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mb-6 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Email Address</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <span className="text-sm text-gray-500">Cannot be changed</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Email Verification Status</p>
                <p className="text-sm text-gray-600">
                  {user.email_verified ? (
                    <span className="inline-flex items-center text-green-700">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="text-amber-600">Not verified</span>
                  )}
                </p>
              </div>
              {!user.email_verified && (
                <button 
                  onClick={handleSendVerification}
                  disabled={sendingVerification}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                >
                  {sendingVerification ? 'Sending...' : 'Send Verification Email'}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Account Status</p>
                <p className="text-sm text-gray-600">
                  <span className="text-green-700">Active</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>

          {/* Change Password */}
          <div className="mb-6 pb-6 border-b">
            <h3 className="font-medium text-gray-900 mb-3">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({...passwordData, old_password: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.new_password_confirm}
                  onChange={(e) => setPasswordData({...passwordData, new_password_confirm: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition font-medium disabled:opacity-50"
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Enhance your account security with an additional verification layer
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.two_fa_enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {user.two_fa_enabled ? 'Active' : 'Inactive'}
              </div>
            </div>
            
            {user.two_fa_enabled ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-800">
                    Two-factor authentication is currently enabled on your account
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your password to disable 2FA
                  </label>
                  <input
                    type="password"
                    value={disable2FAPassword}
                    onChange={(e) => setDisable2FAPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent mb-3"
                  />
                </div>
                <button
                  onClick={handleDisable2FA}
                  disabled={disabling2FA || !disable2FAPassword}
                  className="px-6 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition font-medium disabled:opacity-50"
                >
                  {disabling2FA ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-800">
                    We recommend enabling two-factor authentication to protect your account
                  </p>
                </div>
                <button
                  onClick={handleEnable2FA}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium"
                >
                  Enable Two-Factor Authentication
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Primary Use Case</p>
                <p className="text-sm text-gray-600 capitalize">
                  {user.primary_use_case || user.role}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">Receive updates about your scans and account</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-900">Delete Account</p>
                <p className="text-sm text-red-700">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-medium"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {show2FASetup && (
        <TwoFASetupModal
          onClose={() => setShow2FASetup(false)}
          onComplete={handle2FASetupComplete}
        />
      )}
    </div>
  );
}