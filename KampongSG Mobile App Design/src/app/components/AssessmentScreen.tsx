import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { supabaseFunctionsApiBase } from '../../../utils/supabase/api';
import { LanguageContext } from '../App';
import { getTranslation } from '../utils/translations';

const ASSESSMENT_IDS = Array.from({ length: 12 }, (_, i) => i + 1);

const RESPONSE_OPTIONS = [
  { value: 0, labelKey: 'zbNever' },
  { value: 1, labelKey: 'zbRarely' },
  { value: 2, labelKey: 'zbSometimes' },
  { value: 3, labelKey: 'zbQuiteOften' },
  { value: 4, labelKey: 'zbNearlyAlways' },
] as const;

function zbKey(id: number) {
  return `zbQ${String(id).padStart(2, '0')}` as const;
}

export function AssessmentScreen({ user, profile, accessToken, patientId }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = (key: string, vars?: Record<string, string | number>) =>
    getTranslation(language, key, vars);

  const questionId = ASSESSMENT_IDS[currentQuestionIndex];

  function handleAnswer(questionId_: number, value: number) {
    const newAnswers = { ...answers, [questionId_]: value };
    setAnswers(newAnswers);

    if (currentQuestionIndex < ASSESSMENT_IDS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeAssessment(newAnswers);
    }
  }

  async function completeAssessment(finalAnswers: Record<number, number>) {
    const score = Object.values(finalAnswers).reduce((sum, val) => sum + val, 0);
    setTotalScore(score);
    setIsComplete(true);

    try {
      await fetch(`${supabaseFunctionsApiBase}/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          caregiverId: user.id,
          patientId: patientId || user.id,
          score,
          answers: finalAnswers,
        }),
      });
    } catch (error) {
      console.log('Error saving assessment:', error);
    }
  }

  function goBack() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      navigate('/');
    }
  }

  function getScoreInterpretation(score: number) {
    if (score <= 10) {
      return {
        levelKey: 'burdenLowTitle' as const,
        messageKey: 'burdenLowMsg' as const,
        color: 'text-green-700 bg-green-50 border-green-200',
      };
    }
    if (score <= 20) {
      return {
        levelKey: 'burdenMidTitle' as const,
        messageKey: 'burdenMidMsg' as const,
        color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
      };
    }
    return {
      levelKey: 'burdenHighTitle' as const,
      messageKey: 'burdenHighMsg' as const,
      color: 'text-red-700 bg-red-50 border-red-200',
    };
  }

  if (isComplete) {
    const interpretation = getScoreInterpretation(totalScore);

    return (
      <div className="size-full bg-gradient-to-b from-blue-50 to-white overflow-auto">
        <div className="max-w-2xl mx-auto p-4 pb-24">
          <div className="flex items-center gap-4 mb-6 pt-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-3xl font-bold text-gray-800">{t('assessmentCompleteTitle')}</h1>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl text-center mb-6">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('assessmentThankYou')}</h2>
            <p className="text-gray-600">{t('assessmentSubmitted')}</p>
          </div>

          <div className={`rounded-2xl p-5 mb-4 border ${interpretation.color}`}>
            <h3 className="font-semibold mb-2">{t(interpretation.levelKey)}</h3>
            <p className="text-sm">{t(interpretation.messageKey)}</p>
          </div>

          <div className="bg-blue-50 rounded-2xl p-5 mb-4">
            <h4 className="font-semibold text-blue-900 mb-2">{t('assessmentWhatNext')}</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>{t('assessmentNextBullet1')}</p>
              <p>{t('assessmentNextBullet2')}</p>
              <p>{t('assessmentNextBullet3')}</p>
            </div>
          </div>

          <div className="bg-green-50 rounded-2xl p-4 mb-4">
            <p className="text-sm text-green-800">{t('assessmentRememberCare')}</p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-semibold hover:bg-blue-700 transition-colors"
          >
            {t('backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestionIndex + 1) / ASSESSMENT_IDS.length) * 100;

  return (
    <div className="size-full bg-gradient-to-b from-blue-50 to-white overflow-auto">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center gap-4 mb-6 pt-4">
          <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{t('caregiverWellbeingTitle')}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {t('assessmentProgress', {
                current: currentQuestionIndex + 1,
                total: ASSESSMENT_IDS.length,
              })}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 text-center leading-relaxed">
            {t(zbKey(questionId))}
          </h2>
        </div>

        <div className="space-y-3">
          {RESPONSE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(questionId, option.value)}
              className="w-full bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl p-5 text-left transition-all font-medium text-gray-800 text-lg"
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full mt-6 text-gray-600 hover:text-gray-800 py-3 text-center font-medium"
        >
          {t('assessmentSkipForNow')}
        </button>
      </div>
    </div>
  );
}
