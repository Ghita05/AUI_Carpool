import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import './SplashPage.css';

export default function SplashPage() {
  const navigate = useNavigate();
  const barRef = useRef(null);

  useEffect(() => {
    // Animate loading bar then navigate
    if (barRef.current) {
      barRef.current.style.width = '50%';
    }
    const timer = setTimeout(() => navigate('/login'), 2200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash">
      <div className="splash-logo">
        <Car size={48} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
      </div>
      <div className="splash-text">
        <h1 className="splash-title">AUI Carpool</h1>
        <p className="splash-tag">Your campus, connected.</p>
      </div>
      <div className="splash-bar-track">
        <div className="splash-bar-fill" ref={barRef} />
      </div>
    </div>
  );
}
