import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { projectId } from '../../../utils/supabase/info.tsx';

// Zarit Burden Interview - Short Form (12 items)
const ASSESSMENT_QUESTIONS = [
  {
    id: 1,
    text: "Do you feel that your relative asks for more help than he/she needs?"
  },
  {
    id: 2,
    text: "Do you feel that because of the time you spend with your relative that you don't have enough time for yourself?"
  },
  {
    id: 3,
    text: "Do you feel stressed between caring for your relative and trying to meet other responsibilities for your family or work?"
  },
  {
    id: 4,
    text: "Do you feel embarrassed over your relative's behavior?"
  },
  {
    id: 5,
    text: "Do you feel angry when you are around your relative?"
  },
  {
    id: 6,
    text: "Do you feel that your relative currently affects your relationship with other family members or friends in a negative way?"
  },
  {
    id: 7,
    text: "Are you afraid what the future holds for your relative?"
  },
  {
    id: 8,
    text: "Do you feel your relative is dependent on you?"
  },
  {
    id: 9,
    text: "Do you feel strained when you are around your relative?"
  },
  {
    id: 10,
    text: "Do you feel your health has suffered because of your involvement with your relative?"
  },
  {
    id: 11,
    text: "Do you feel that you don't have as much privacy as you would like because of your relative?"
  },
  {
    id: 12,
    text: "Do you feel that your social life has suffered because you are caring for your relative?"
  }
];

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Quite Frequently' },
  { value: 4, label: 'Nearly Always' }
];

export function AssessmentScreen({ user, profile, accessToken, patientId }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const navigate = useNavigate();

  function handleAnswer(questionId, value) {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentQuestion < ASSESSMENT_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      completeAssessment(newAnswers);
    }
  }

  async function completeAssessment(finalAnswers) {
    const score = Object.values(finalAnswers).reduce((sum, val) => sum + val, 0);
    setTotalScore(score);
    setIsComplete(true);

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fd25410b/assessment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            caregiverId: user.id,
            patientId: patientId || user.id,
            score,
            answers: finalAnswers
          })
        }
      );
    } catch (error) {
      console.log('Error saving assessment:', error);
    }
  }

  function goBack() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else {
      navigate('/');
    }
  }

  function getScoreInterpretation(score) {
    if (score <= 10) {
      return {
        level: 'Low Burden',
        color: 'text-green-700 bg-green-50 border-green-200',
        message: 'You are coping well with caregiving responsibilities. Continue taking care of yourself.'
      };
    } else if (score <= 20) {
      return {
        level: 'Mild to Moderate Burden',
        color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
        message: 'You may be experiencing some stress. Consider reaching out to your support network more often.'
      };
    } else {
      return {
        level: 'Moderate to Severe Burden',
        color: 'text-red-700 bg-red-50 border-red-200',
        message: 'You are experiencing significant caregiver stress. We will increase community caregiver support to help you. Please also consider talking to a healthcare professional.'
      };
    }
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
            <h1 className="text-3xl font-bold text-gray-800">Assessment Complete</h1>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl text-center mb-6">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
            <p className="text-gray-600">Your check-in has been submitted.</p>
          </div>

          <div className="bg-blue-50 rounded-2xl p-5 mb-4">
            <h4 className="font-semibold text-blue-900 mb-2">What Happens Next</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>✓ Your responses help us coordinate better support</p>
              <p>✓ We'll automatically adjust task delegation when you need extra help</p>
              <p>✓ Your community care network stays ready to assist</p>
            </div>
          </div>

          <div className="bg-green-50 rounded-2xl p-4 mb-4">
            <p className="text-sm text-green-800">
              <strong>Remember:</strong> It's okay to ask for help. Your community caregivers are here to support you and Uncle Tan.
            </p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const question = ASSESSMENT_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / ASSESSMENT_QUESTIONS.length) * 100;

  return (
    <div className="size-full bg-gradient-to-b from-blue-50 to-white overflow-auto">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center gap-4 mb-6 pt-4">
          <button
            onClick={goBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">Caregiver Wellbeing Check</h1>
            <p className="text-sm text-gray-600 mt-1">
              Question {currentQuestion + 1} of {ASSESSMENT_QUESTIONS.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-3xl p-8 shadow-xl mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 text-center leading-relaxed">
            {question.text}
          </h2>
        </div>

        {/* Response Options */}
        <div className="space-y-3">
          {RESPONSE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(question.id, option.value)}
              className="w-full bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl p-5 text-left transition-all font-medium text-gray-800 text-lg"
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Skip Button */}
        <button
          onClick={() => navigate('/')}
          className="w-full mt-6 text-gray-600 hover:text-gray-800 py-3 text-center font-medium"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
