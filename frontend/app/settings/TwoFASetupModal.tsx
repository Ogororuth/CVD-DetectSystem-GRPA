'use client';

import { useState } from 'react';
import { authAPI } from '@/app/lib/api';

interface TwoFASetupModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function TwoFASetupModal({ onClose, onComplete }: TwoFASetupModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const handleEnable2FA = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await authAPI.enable2FA();
      setQrCode(response.data.qr_code);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode) {
      setError('Please enter verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.verify2FA(verificationCode);
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Setup Two-Factor Authentication
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!qrCode ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Two-factor authentication adds an extra layer of security to your account. 
              You'll need to scan a QR code with an authenticator app.
            </p>
            <button
              onClick={handleEnable2FA}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Setting Up...' : 'Start Setup'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scan this QR code with your authenticator app:
            </p>
            
            <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-mono"
                placeholder="000000"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleVerify}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}