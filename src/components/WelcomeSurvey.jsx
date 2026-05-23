import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function WelcomeSurvey({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    primaryDevice: '',
    professionType: '',
    hearAboutUs: '',
    biggestChallenge: '',
    otherText: {}
  });
  const [otherInput, setOtherInput] = useState('');

  const questions = [
    {
      key: 'primaryDevice',
      question: 'What is your primary work device?',
      options: ['Mac laptop', 'Windows laptop', 'iPad', 'Other']
    },
    {
      key: 'professionType',
      question: 'What type of practitioner are you?',
      options: ['RMT', 'RCC / Counsellor', 'Physiotherapist', 'Acupuncturist', 'Other']
    },
    {
      key: 'hearAboutUs',
      question: 'How did you hear about CUB?',
      options: ['Personal referral', 'Social media', 'Google search', 'Other']
    },
    {
      key: 'biggestChallenge',
      question: 'What\'s your biggest patient communication challenge?',
      options: [
        'Patients texting my personal number',
        'Missing messages after hours',
        'No separation between work and personal',
        'Other'
      ]
    }
  ];

  const currentQuestion = questions[step];

  const handleSelect = (option) => {
    const newAnswers = { ...answers, [currentQuestion.key]: option };
    setAnswers(newAnswers);
    setOtherInput('');
    if (option !== 'Other') {
      advance(newAnswers);
    }
  };

  const handleOtherSubmit = () => {
    const value = otherInput.trim() ? `Other: ${otherInput.trim()}` : 'Other';
    const newAnswers = { ...answers, [currentQuestion.key]: value };
    setAnswers(newAnswers);
    advance(newAnswers);
  };

  const advance = async (newAnswers) => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('practitioners').update({
            survey_primary_device: newAnswers.primaryDevice,
            survey_hear_about_us: newAnswers.hearAboutUs,
            survey_biggest_challenge: newAnswers.biggestChallenge,
            survey_profession_type: newAnswers.professionType
          }).eq('user_email', session.user.email);
        }
      } catch (err) {
        console.error('Survey save error:', err);
      }
      onComplete();
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#F7F6F2', zIndex: 300, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Logo */}
      <svg width="56" height="56" viewBox="0 0 120 120" style={{ marginBottom: '24px' }}>
        <rect x="0" y="0" width="120" height="120" rx="22" fill="#EAF3DE" />
        <text x="60" y="95" fontFamily="Georgia, serif" fontSize="36" fontWeight="700" fill="#526659" textAnchor="middle" letterSpacing="-0.5">cub</text>
      </svg>

      {/* Progress */}
      <div style={{ width: '100%', maxWidth: '400px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Quick setup
          </span>
          <span style={{ fontSize: '10px', color: '#94A3B8' }}>
            {step + 1} of {questions.length}
          </span>
        </div>
        <div style={{ background: '#E2E8E1', borderRadius: '6px', height: '4px' }}>
          <div style={{
            background: '#588157', height: '4px', borderRadius: '6px',
            width: `${((step + 1) / questions.length) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{
          fontSize: '18px', fontWeight: '600', color: '#2F3E46',
          marginBottom: '20px', lineHeight: '1.4', textAlign: 'center'
        }}>
          {currentQuestion.question}
        </h2>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {currentQuestion.options.map(option => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              style={{
                width: '100%', padding: '14px 16px',
                background: '#fff', border: '0.5px solid #E2E8E1',
                borderRadius: '12px', fontSize: '13px', color: '#2F3E46',
                cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                textAlign: 'left', transition: 'all 0.15s ease',
                fontWeight: '500'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#F0F4EE';
                e.currentTarget.style.borderColor = '#9CAF88';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#E2E8E1';
              }}
            >
              {option}
            </button>
          ))}
        </div>

        {answers[currentQuestion.key] === 'Other' && (
          <div style={{ marginTop: '12px' }}>
            <input
              type="text"
              placeholder="Please describe..."
              value={otherInput}
              onChange={e => setOtherInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleOtherSubmit()}
              autoFocus
              style={{
                width: '100%', padding: '14px 16px',
                border: '0.5px solid #E2E8E1', borderRadius: '12px',
                fontSize: '13px', color: '#2F3E46',
                fontFamily: "'Outfit', sans-serif", outline: 'none',
                boxSizing: 'border-box', marginBottom: '10px',
                background: '#fff'
              }}
            />
            <button
              onClick={handleOtherSubmit}
              style={{
                width: '100%', padding: '14px 16px',
                background: '#588157', border: 'none',
                borderRadius: '12px', fontSize: '13px', color: '#fff',
                cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                textAlign: 'center', fontWeight: '500'
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Skip */}
        <button
          onClick={onComplete}
          style={{
            background: 'none', border: 'none', color: '#C5CAD2',
            fontSize: '11px', cursor: 'pointer', marginTop: '20px',
            fontFamily: "'Outfit', sans-serif", display: 'block',
            margin: '20px auto 0'
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

export default WelcomeSurvey;