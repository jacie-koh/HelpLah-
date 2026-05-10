import { useContext, useState } from 'react';
import { User, Lock, Phone, UserCircle, Users } from 'lucide-react';
import { DemoAccountsSetup } from './DemoAccountsSetup';
import { LanguageContext } from '../App';
import { getTranslation } from '../utils/translations';

function KampongLandingIllustration() {
  return (
    <div className="relative h-64 sm:h-72 w-full overflow-hidden rounded-b-[2rem] bg-[#eef7fb]">
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[#dcefe2]" />
      <div className="absolute left-[-8%] bottom-7 h-24 w-[48%] rounded-[55%] bg-[#9fcead]" />
      <div className="absolute left-[8%] bottom-4 h-28 w-[52%] rounded-[55%] bg-[#7fbe91]" />
      <div className="absolute right-[-12%] bottom-5 h-24 w-[46%] rounded-[55%] bg-[#b5d8a8]" />

      <div className="absolute left-[8%] top-16 h-36 w-32 -skew-y-6 rounded-t-lg border border-[#b8c7be] bg-[#f7efe3] shadow-sm">
        <div className="absolute left-3 right-3 top-5 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className="h-8 rounded-md border border-[#c6b9aa] bg-[#d7e8ec]" />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 h-9 w-full bg-[#e3d6c3]" />
      </div>

      <div className="absolute left-[27%] top-7 h-44 w-36 rounded-t-lg border border-[#aebdb7] bg-[#fff8eb] shadow-md">
        <div className="absolute -right-5 top-2 h-40 w-5 skew-y-[-22deg] border border-[#9eaaa5] bg-[#d7cbbb]" />
        <div className="absolute right-3 top-3 text-[10px] font-bold text-[#65736d]">367</div>
        <div className="absolute left-6 right-6 top-10 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <span key={item} className="h-8 rounded-md border border-[#c8bbad] bg-[#dbe8ec]" />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 h-11 w-full bg-[#e8dcc9]" />
      </div>

      <div className="absolute bottom-11 left-[13%] h-3 w-[54%] rounded-full bg-[#547d61]" />
      <div className="absolute bottom-7 left-[24%] h-10 w-2 rotate-[22deg] rounded-full bg-[#547d61]" />
      <div className="absolute bottom-7 left-[29%] h-10 w-2 rotate-[-22deg] rounded-full bg-[#547d61]" />
    </div>
  );
}

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
    <div className="size-full overflow-auto bg-[#f6f4ee]">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center px-4 py-6 sm:justify-center sm:py-10">
        <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#d7d2c7] bg-white shadow-[0_20px_70px_rgba(30,41,59,0.14)]">
          <KampongLandingIllustration />

          <div className="relative -mt-10 px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="mx-auto max-w-md rounded-2xl border border-[#d6c7aa] bg-[#fffaf0] p-4 shadow-[0_14px_36px_rgba(120,82,36,0.15)]">
              <h1 className="text-center text-4xl font-bold tracking-normal text-[#27364a]">{t('brandName')}</h1>
              <p className="mt-1 text-center text-sm text-[#627064]">{t('brandTagline')}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#ede4d2] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError('');
                  }}
                  className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                    !isSignUp
                      ? 'bg-[#2f5f4a] text-white shadow-sm'
                      : 'text-[#49554c] hover:bg-white/60'
                  }`}
                >
                  {t('signIn')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                  }}
                  className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                    isSignUp
                      ? 'bg-[#2f5f4a] text-white shadow-sm'
                      : 'text-[#49554c] hover:bg-white/60'
                  }`}
                >
                  {t('signUp')}
                </button>
              </div>
            </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
                  className="w-full px-4 py-3 border border-[#cfc7b8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2f5f4a]"
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
                  className="w-full px-4 py-3 border border-[#cfc7b8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2f5f4a]"
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
              className="w-full px-4 py-3 border border-[#cfc7b8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2f5f4a]"
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
              className="w-full px-4 py-3 border border-[#cfc7b8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2f5f4a]"
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
                        ? 'border-[#2f5f4a] bg-[#e8f1eb] text-[#2f5f4a]'
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
                        ? 'border-[#2f5f4a] bg-[#e8f1eb] text-[#2f5f4a]'
                        : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    {t('communityCaregiver')}
                  </button>
                </div>
              </div>

              {role === 'primary_caregiver' && (
                <>
                  <div className="bg-[#eef7f1] rounded-xl p-4 border border-[#cfe2d4]">
                    <p className="text-sm font-semibold text-[#2f5f4a] mb-3">{t('patient')}</p>
                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-[#2f5f4a] mb-1">
                          <UserCircle className="w-4 h-4" />
                          {t('patientName')}
                        </label>
                        <input
                          type="text"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          className="w-full px-4 py-3 border border-[#bfd6c6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2f5f4a]"
                          required
                          placeholder={t('patientName')}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-[#2f5f4a] mb-1">
                          <Phone className="w-4 h-4" />
                          {t('patientPhone')}
                        </label>
                        <input
                          type="tel"
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          className="w-full px-4 py-3 border border-[#bfd6c6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2f5f4a]"
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
            className="w-full bg-[#d9572a] text-white py-3 rounded-xl font-semibold hover:bg-[#c8491f] transition-colors disabled:opacity-50"
          >
            {loading ? t('saving') : isSignUp ? t('signUp') : t('signIn')}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowDemoSetup(true)}
              className="inline-flex items-center gap-2 text-[#2f5f4a] hover:text-[#244838] font-medium text-sm"
            >
              <Users className="w-4 h-4" />
              {t('createDemoAccounts')}
            </button>
          </div>
        </div>
          </div>
        </div>
      </div>

      {showDemoSetup && (
        <DemoAccountsSetup onClose={() => setShowDemoSetup(false)} />
      )}
    </div>
  );
}
