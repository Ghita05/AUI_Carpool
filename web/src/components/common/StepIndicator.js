import React from 'react';
import './StepIndicator.css';

export default function StepIndicator({ currentStep = 1, totalSteps = 3 }) {
  return (
    <div className="step-indicator">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const step = i + 1;
        const isActive = step <= currentStep;
        const isLast = step === totalSteps;
        return (
          <div key={step} className="step-item">
            <div className={`step-dot ${isActive ? 'step-dot-active' : ''}`} />
            {!isLast && (
              <div className={`step-line ${step < currentStep ? 'step-line-active' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
