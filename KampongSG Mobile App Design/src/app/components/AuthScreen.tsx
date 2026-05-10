import { useContext, useState } from 'react';
import { User, Lock, Phone, UserCircle, Heart, Users } from 'lucide-react';
import { DemoAccountsSetup } from './DemoAccountsSetup';
import { LanguageContext } from '../App';
import { getTranslation } from '../utils/translations';

export function AuthScreen({ onSignIn, onSignUp }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('primary_caregiver');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemoSetup, setShowDemoSetup] = useState(false);
  const { language } = useContext(LanguageContext);
  const t = (key: string, vars?: Record<string, string | number>) => getTranslation(language, key, vars);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (role === 'primary_caregiver' && (!patientName || !patientPhone)) {
          setError(t('errorProvidePatientInfo'));
          setLoading(false);
          return;
        }
        await onSignUp(email, password, name, role, phoneNumber, patientName, patientPhone);
      } else {
        await onSignIn(email, password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message?.trim() ? message : t('authErrorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="size-full flex items-center justify-center isomer-app-shell p-4">
      <div className="w-full max-w-md isomer-card p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-700 rounded-full mb-4">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">{t('brandName')}</h1>
          <p className="text-gray-600 mt-2">{t('brandTagline')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <UserCircle className="w-4 h-4" />
                  {t('name')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder={t('placeholderYourName')}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4" />
                  {t('phoneNumber')}
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+65 1234 5678"
                />
              </div>
            </>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4" />
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Lock className="w-4 h-4" />
              {t('password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="••••••••"
            />
          </div>

          {isSignUp && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t('iAmA')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('primary_caregiver')}
                    className={`px-3 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      role === 'primary_caregiver'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    {t('primaryCaregiver')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('community_caregiver')}
                    className={`px-3 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      role === 'community_caregiver'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    {t('communityCaregiver')}
                  </button>
                </div>
              </div>

              {role === 'primary_caregiver' && (
                <>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-3">{t('patient')}</p>
                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                          <UserCircle className="w-4 h-4" />
                          {t('patientName')}
                        </label>
                        <input
                          type="text"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          placeholder={t('patientName')}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
                          <Phone className="w-4 h-4" />
                          {t('patientPhone')}
                        </label>
                        <input
                          type="tel"
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          placeholder="+65 1234 5678"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {loading ? t('saving') : isSignUp ? t('signUp') : t('signIn')}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            {isSignUp ? t('alreadyHaveAccount') : t('dontHaveAccount')}
          </button>

          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowDemoSetup(true)}
              className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 font-medium text-sm"
            >
              <Users className="w-4 h-4" />
              {t('createDemoAccounts')}
            </button>
          </div>
        </div>
      </div>

      {showDemoSetup && (
        <DemoAccountsSetup onClose={() => setShowDemoSetup(false)} />
      )}
    </div>
  );
}
