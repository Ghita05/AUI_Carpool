import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './SplashPage.css';

const CarIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
);

export default function SplashPage() {
  const navigate = useNavigate();
  const barRef = useRef(null);

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = '50%';
    }
    const timer = setTimeout(() => navigate('/login'), 2200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash">
      <div className="splash-logo">
        <CarIcon />
      </div>
      <div className="splash-text">
        <h1 className="splash-title">AUI Carpool</h1>
        <p className="splash-tag">A Peer-to-Peer Ride Sharing Platform</p>
      </div>
      <div className="splash-bar-track">
        <div className="splash-bar-fill" ref={barRef} />
      </div>
    </div>
  );
}
