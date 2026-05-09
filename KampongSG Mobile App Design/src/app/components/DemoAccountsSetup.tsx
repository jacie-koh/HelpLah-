import { useState } from 'react';
import { Users, Loader } from 'lucide-react';
import { publicAnonKey } from '../../../utils/supabase/info.tsx';
import { supabaseFunctionsApiBase } from '../../../utils/supabase/api';

const DEMO_ACCOUNTS = [
  // Patient - Uncle Tan (elderly patient with diabetes and mobility issues)
  { email: 'uncle.tan@kampongsg.com', password: 'Demo123!', name: 'Uncle Tan Ah Kow', role: 'patient', phoneNumber: '+65 8123 4567' },

  // Primary Caregiver - His daughter Sarah
  { email: 'sarah.tan@kampongsg.com', password: 'Demo123!', name: 'Sarah Tan', role: 'primary_caregiver', phoneNumber: '+65 9123 4567' },

  // Community Caregivers - Neighbor, friend, and volunteer
  { email: 'mei.ling@kampongsg.com', password: 'Demo123!', name: 'Mei Ling (Neighbor)', role: 'community_caregiver', phoneNumber: '+65 8456 7890' },
  { email: 'rashid@kampongsg.com', password: 'Demo123!', name: 'Rashid (Friend)', role: 'community_caregiver', phoneNumber: '+65 8567 8901' },
  { email: 'siti@kampongsg.com', password: 'Demo123!', name: 'Siti (Volunteer)', role: 'community_caregiver', phoneNumber: '+65 8678 9012' }
];

export function DemoAccountsSetup({ onClose }) {
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function createDemoAccounts() {
    setCreating(true);
    setError('');
    setProgress(0);

    try {
      for (let i = 0; i < DEMO_ACCOUNTS.length; i++) {
        const account = DEMO_ACCOUNTS[i];

        const response = await fetch(
          `${supabaseFunctionsApiBase}/signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify(account)
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.log(`Error creating ${account.email}:`, errorData);
          if (!errorData.error?.includes('already registered')) {
            setError(`Failed to create ${account.email}: ${errorData.error || JSON.stringify(errorData)}`);
            throw new Error(errorData.error || 'Account creation failed');
          }
        }

        setProgress(Math.round(((i + 1) / DEMO_ACCOUNTS.length) * 100));
      }

      setSuccess(true);
    } catch (err) {
      setError('Failed to create demo accounts: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-7 h-7" />
              Demo Accounts Setup
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8">×</button>
          </div>
        </div>

        <div className="p-6">
          {!success ? (
            <>
              <p className="text-gray-600 mb-6">Create 5 demo accounts for Uncle Tan's care network: 1 patient, 1 primary caregiver (daughter), and 3 community caregivers.</p>

              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-3">Uncle Tan's Care Network</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-2">👴 Patient:</p>
                    <div className="space-y-1 text-sm text-blue-700">
                      <div>• {DEMO_ACCOUNTS[0].name} - {DEMO_ACCOUNTS[0].email}</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-2">👩‍⚕️ Primary Caregiver (Daughter):</p>
                    <div className="space-y-1 text-sm text-blue-700">
                      <div>• {DEMO_ACCOUNTS[1].name} - {DEMO_ACCOUNTS[1].email}</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-2">🤝 Community Caregivers:</p>
                    <div className="space-y-1 text-sm text-blue-700">
                      {DEMO_ACCOUNTS.slice(2, 5).map((acc, idx) => (
                        <div key={idx}>• {acc.name} - {acc.email}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-blue-800"><strong>Password for all accounts:</strong> Demo123!</p>
                </div>
              </div>

              {creating && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Creating accounts...</span>
                    <span className="text-sm font-semibold text-blue-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">{error}</div>
              )}

              <button
                onClick={createDemoAccounts}
                disabled={creating}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating Accounts...
                  </>
                ) : (
                  'Create Demo Accounts'
                )}
              </button>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Care Network Created!</h3>
              <p className="text-gray-600 mb-6">All 5 accounts for Uncle Tan's care network have been set up successfully.</p>

              <div className="bg-green-50 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-green-800 mb-2"><strong>Try different perspectives:</strong></p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Patient: uncle.tan@kampongsg.com</li>
                  <li>• Primary Caregiver: sarah.tan@kampongsg.com</li>
                  <li>• Community: mei.ling@kampongsg.com</li>
                  <li><strong>Password for all:</strong> Demo123!</li>
                </ul>
              </div>

              <button onClick={onClose} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
