import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function FeedbackPrompt({ day, onComplete, onDismiss, userEmail }) {
  const [answers, setAnswers] = useState({
    setupSmooth: '',
    setupNotes: '',
    understood: '',
    featureUsed: '',
    featureOther: '',
    improvement: '',
    recommend: '',
    dayToDay: '',
    trialQuestion: '',
    allowTestimonial: false
  });
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = day === 3 ? 2 : day === 14 ? 4 : 3;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from('feedback').insert([{
        practitioner_id: session.user.id,
        user_email: userEmail,
        day_prompt: day,
        understood_cub: answers.understood || answers.setupSmooth,
        feature_used_most: answers.featureUsed === 'Other' ? answers.featureOther : answers.featureUsed,
        improvement_suggestion: answers.improvement || answers.setupNotes || answers.dayToDay,
        would_recommend: answers.recommend,
        allow_testimonial: answers.allowTestimonial,
        created_at: new Date().toISOString()
      }]);

      await supabase.from('practitioners')
        .update({ [`feedback_day${day}_completed`]: true })
        .eq('user_email', userEmail);

      setSubmitted(true);
      setTimeout(() => onComplete(), 2000);
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const optionStyle = (selected) => ({
    width: '100%', padding: '12px 14px', marginBottom: '8px',
    border: selected ? '1.5px solid #588157' : '0.5px solid #E2E8E1',
    borderRadius: '10px', fontSize: '13px', color: '#2F3E46',
    background: selected ? '#F0F4EE' : '#fff',
    cursor: 'pointer', textAlign: 'left', fontFamily: "'Outfit', sans-serif",
    fontWeight: selected ? '500' : '400'
  });

  const BackButton = () => (
    <button onClick={() => setStep(step - 1)} style={{
      background: 'none', border: 'none', color: '#9CAF88',
      fontSize: '11px', fontWeight: '600', cursor: 'pointer',
      fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
      letterSpacing: '0.08em', marginBottom: '16px', padding: 0
    }}>‹ Back</button>
  );

  const continueBtn = (onClick) => (
    <button onClick={onClick} style={{
      width: '100%', marginTop: '12px', padding: '12px',
      background: '#588157', border: 'none', borderRadius: '10px',
      fontSize: '11px', fontWeight: '600', color: 'white',
      cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
      textTransform: 'uppercase', letterSpacing: '0.08em'
    }}>Continue →</button>
  );

  if (submitted) return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(47,62,70,0.85)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", padding: '24px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '40px 24px',
        width: '100%', maxWidth: '400px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🌿</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#2F3E46', marginBottom: '8px' }}>
          Thank you so much!
        </div>
        <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.6' }}>
          Your feedback means everything at this stage.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(47,62,70,0.85)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", padding: '24px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '32px 24px',
        width: '100%', maxWidth: '420px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <svg width="44" height="44" viewBox="0 0 120 120" style={{ marginBottom: '12px' }}>
            <rect x="0" y="0" width="120" height="120" rx="22" fill="#EAF3DE" />
            <text x="60" y="95" fontFamily="Georgia, serif" fontSize="36" fontWeight="700" fill="#526659" textAnchor="middle" letterSpacing="-0.5">cub</text>
          </svg>
          <div style={{ fontSize: '10px', color: '#9CAF88', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
            Day {day} Check-in
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#2F3E46', lineHeight: '1.4' }}>
            {day === 3 && "How's CUB working so far?"}
            {day === 14 && "Two weeks in — we'd love your honest take."}
            {day === 25 && "Almost there — a quick note before your trial ends."}
          </div>
        </div>

        {/* Progress */}
        <div style={{ background: '#E2E8E1', borderRadius: '6px', height: '3px', marginBottom: '24px' }}>
          <div style={{
            background: '#588157', height: '3px', borderRadius: '6px',
            width: `${(step / totalSteps) * 100}%`, transition: 'width 0.3s ease'
          }} />
        </div>

        {/* ── DAY 3 ── */}
        {day === 3 && step === 1 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '16px' }}>
              Did setup go smoothly?
            </div>
            {['Yes, all good!', 'Mostly — had a small hiccup', 'Not really — I need help'].map(option => (
              <button key={option}
                onClick={() => { setAnswers({ ...answers, setupSmooth: option }); setStep(2); }}
                style={optionStyle(answers.setupSmooth === option)}>
                {option}
              </button>
            ))}
          </div>
        )}

        {day === 3 && step === 2 && (
          <div>
            <BackButton />
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '16px' }}>
              Any questions or confusion so far?
            </div>
            <textarea
              placeholder="Anything at all — we're here to help."
              value={answers.setupNotes}
              onChange={e => setAnswers({ ...answers, setupNotes: e.target.value })}
              style={{
                width: '100%', height: '100px', padding: '12px 14px',
                border: '0.5px solid #E2E8E1', borderRadius: '10px',
                fontSize: '13px', color: '#2F3E46', resize: 'none',
                fontFamily: "'Outfit', sans-serif", outline: 'none',
                boxSizing: 'border-box', marginBottom: '12px'
              }}
            />
            <button onClick={handleSubmit} disabled={submitting} style={{
              width: '100%', padding: '12px', background: '#588157',
              border: 'none', borderRadius: '10px', fontSize: '11px',
              fontWeight: '600', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              {submitting ? 'Submitting...' : 'Submit →'}
            </button>
            <button onClick={handleSubmit} style={{
              width: '100%', marginTop: '8px', padding: '8px', background: 'none',
              border: 'none', fontSize: '11px', color: '#C5CAD2',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif"
            }}>Skip this question</button>
          </div>
        )}

        {/* ── DAY 14 ── */}
        {day === 14 && step === 1 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '16px' }}>
              Did you understand what CUB does before you signed up?
            </div>
            {[
              'Yes, completely',
              'Mostly — took a bit to click',
              'Not really — it became clearer after using it',
              'Still figuring it out'
            ].map(option => (
              <button key={option}
                onClick={() => { setAnswers({ ...answers, understood: option }); setStep(2); }}
                style={optionStyle(answers.understood === option)}>
                {option}
              </button>
            ))}
          </div>
        )}

        {day === 14 && step === 2 && (
          <div>
            <BackButton />
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '16px' }}>
              Which feature have you used most?
            </div>
            {['Messaging patients', 'Voice calling', 'Status / Off Duty', 'Auto-reply', 'Other'].map(option => (
              <button key={option}
                onClick={() => setAnswers({ ...answers, featureUsed: option })}
                style={optionStyle(answers.featureUsed === option)}>
                {option}
              </button>
            ))}
            {answers.featureUsed === 'Other' && (
              <input type="text" placeholder="Tell us more..."
                value={answers.featureOther}
                onChange={e => setAnswers({ ...answers, featureOther: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', border: '0.5px solid #E2E8E1',
                  borderRadius: '10px', fontSize: '13px', color: '#2F3E46',
                  fontFamily: "'Outfit', sans-serif", outline: 'none',
                  boxSizing: 'border-box', marginTop: '4px'
                }}
              />
            )}
            {answers.featureUsed && continueBtn(() => setStep(3))}
          </div>
        )}

        {day === 14 && step === 3 && (
          <div>
            <BackButton />
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '16px' }}>
              What would make CUB better for your practice?
            </div>
            <textarea
              placeholder="Anything at all — we read every response."
              value={answers.improvement}
              onChange={e => setAnswers({ ...answers, improvement: e.target.value })}
              style={{
                width: '100%', height: '100px', padding: '12px 14px',
                border: '0.5px solid #E2E8E1', borderRadius: '10px',
                fontSize: '13px', color: '#2F3E46', resize: 'none',
                fontFamily: "'Outfit', sans-serif", outline: 'none',
                boxSizing: 'border-box', marginBottom: '12px'
              }}
            />
            {continueBtn(() => setStep(4))}
            <button onClick={() => setStep(4)} style={{
              width: '100%', marginTop: '8px', padding: '8px', background: 'none',
              border: 'none', fontSize: '11px', color: '#C5CAD2',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif"
            }}>Skip this question</button>
          </div>
        )}

        {day === 14 && step === 4 && (
          <div>
            <BackButton />
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '16px' }}>
              Would you recommend CUB to a colleague?
            </div>
            {['Definitely', 'Probably', 'Not sure yet', 'Probably not'].map(option => (
              <button key={option}
                onClick={() => setAnswers({ ...answers, recommend: option })}
                style={optionStyle(answers.recommend === option)}>
                {option}
              </button>
            ))}
            {answers.recommend && (
              <>
                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  marginTop: '16px', marginBottom: '12px',
                  fontSize: '11px', color: '#64748B', lineHeight: '1.6',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={answers.allowTestimonial}
                    onChange={e => setAnswers({ ...answers, allowTestimonial: e.target.checked })}
                    style={{ accentColor: '#588157', marginTop: '2px', flexShrink: 0 }}
                  />
                  I'm happy for CUB to use my feedback anonymously on their website
                </label>
                <button onClick={handleSubmit} disabled={submitting} style={{
                  width: '100%', marginTop: '12px', padding: '12px',
                  background: '#588157', border: 'none', borderRadius: '10px',
                  fontSize: '11px', fontWeight: '600', color: 'white',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  {submitting ? 'Submitting...' : 'Submit Feedback →'}
                </button>
              </>
            )}
          </div>
        )}
        {/* ── DAY 25 ── */}
        {day === 25 && step === 1 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '8px' }}>
              How has CUB changed your day to day?
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.6' }}>
              Your trial ends in 5 days. We'd love to hear what's shifted for you.
            </p>
            <textarea
              placeholder="Even small changes count..."
              value={answers.dayToDay}
              onChange={e => setAnswers({ ...answers, dayToDay: e.target.value })}
              style={{
                width: '100%', height: '100px', padding: '12px 14px',
                border: '0.5px solid #E2E8E1', borderRadius: '10px',
                fontSize: '13px', color: '#2F3E46', resize: 'none',
                fontFamily: "'Outfit', sans-serif", outline: 'none',
                boxSizing: 'border-box', marginBottom: '12px'
              }}
            />
            {continueBtn(() => setStep(2))}
          </div>
        )}

        {day === 25 && step === 2 && (
          <div>
            <BackButton />
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '16px' }}>
              Would you recommend CUB to a colleague?
            </div>
            {['Definitely', 'Probably', 'Not sure yet', 'Probably not'].map(option => (
              <button key={option}
                onClick={() => setAnswers({ ...answers, recommend: option })}
                style={optionStyle(answers.recommend === option)}>
                {option}
              </button>
            ))}
            {answers.recommend && continueBtn(() => setStep(3))}
          </div>
        )}

        {day === 25 && step === 3 && (
          <div>
            <BackButton />
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '8px' }}>
              Any questions before your trial ends?
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.6' }}>
              Your plan continues automatically at your locked rate. You can cancel anytime from Settings → Manage Billing.
            </p>
            <textarea
              placeholder="Questions, concerns, anything at all..."
              value={answers.trialQuestion}
              onChange={e => setAnswers({ ...answers, trialQuestion: e.target.value })}
              style={{
                width: '100%', height: '80px', padding: '12px 14px',
                border: '0.5px solid #E2E8E1', borderRadius: '10px',
                fontSize: '13px', color: '#2F3E46', resize: 'none',
                fontFamily: "'Outfit', sans-serif", outline: 'none',
                boxSizing: 'border-box', marginBottom: '12px'
              }}
            />
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              marginTop: '4px', marginBottom: '12px',
              fontSize: '11px', color: '#64748B', lineHeight: '1.6',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={answers.allowTestimonial}
                onChange={e => setAnswers({ ...answers, allowTestimonial: e.target.checked })}
                style={{ accentColor: '#588157', marginTop: '2px', flexShrink: 0 }}
              />
              I'm happy for CUB to use my feedback anonymously on their website
            </label>
            <button onClick={handleSubmit} disabled={submitting} style={{
              width: '100%', padding: '12px', background: '#588157',
              border: 'none', borderRadius: '10px', fontSize: '11px',
              fontWeight: '600', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>
              {submitting ? 'Submitting...' : 'Submit →'}
            </button>
            <button onClick={handleSubmit} style={{
              width: '100%', marginTop: '8px', padding: '8px', background: 'none',
              border: 'none', fontSize: '11px', color: '#C5CAD2',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif"
            }}>Skip this question</button>
          </div>
        )}

        {/* Remind me later */}
        <button onClick={onDismiss} style={{
          width: '100%', marginTop: '12px', padding: '8px',
          background: 'none', border: 'none', fontSize: '10px',
          color: '#C5CAD2', cursor: 'pointer', fontFamily: "'Outfit', sans-serif"
        }}>
          Remind me later
        </button>
      </div>
    </div>
  );
}

export default FeedbackPrompt;