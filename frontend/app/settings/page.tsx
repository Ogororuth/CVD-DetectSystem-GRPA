'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/app/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });

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
      alert('Password changed successfully!');
      setPasswordData({ old_password: '', new_password: '', new_password_confirm: '' });
    } catch (err: any) {
      alert(err.response?.data?.old_password?.[0] || 'Failed to change password');
    } finally {
      setChangingPassword(false);
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
          className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mb-6"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Account Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <span className="text-sm text-gray-500">Cannot be changed</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Email Verification</p>
                <p className="text-sm text-gray-600">
                  {user.email_verified ? 'Verified ' : 'Not verified'}
                </p>
              </div>
              {!user.email_verified && (
                <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Send Verification
                </button>
              )}
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Account Status</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Security</h2>

          {/* Change Password */}
          <div className="mb-6">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* 2FA Settings */}
          <div className="pt-6 border-t">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Add an extra layer of security to your account
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.two_fa_enabled 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {user.two_fa_enabled ? '🔒 Enabled' : '🔓 Disabled'}
              </div>
            </div>
            
            {user.two_fa_enabled ? (
              <button
                onClick={() => alert('2FA disable functionality coming soon')}
                className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition font-medium"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={() => alert('2FA setup functionality coming soon')}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                Enable 2FA
              </button>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Primary Use Case</p>
                <p className="text-sm text-gray-600 capitalize">
                  {user.primary_use_case || user.role}
                </p>
              </div>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Change
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-t">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">Receive updates about your scans</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-900">Delete Account</p>
                <p className="text-sm text-red-700">
                  Permanently delete your account and all data
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete your account? This cannot be undone!')) {
                    alert('Account deletion functionality coming soon');
                  }
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}