import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateRidePage.css';

const MapPinIcon = ({ size = 14, color = 'currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const ArrowUpDownIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="18 15 12 21 6 15"/><polyline points="6 9 12 3 18 9"/></svg>;
const PlusIcon = ({ size = 12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const CarIcon = ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
const SendIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const XIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CheckIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1B5E20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

function Toggle({ label, sub, val, onToggle }) {
  return (
    <div className="cr-toggle-row">
      <div><div className="cr-toggle-label">{label}</div>{sub && <div className="cr-toggle-sub">{sub}</div>}</div>
      <button className={`cr-toggle ${val ? 'on' : ''}`} onClick={onToggle}><div className="cr-thumb" /></button>
    </div>
  );
}

function Pills({ options, selected, onSelect }) {
  return (
    <div className="cr-pills">
      {options.map(o => (<button key={o} className={`cr-pill ${selected === o ? 'active' : ''}`} onClick={() => onSelect(o)}>{o}</button>))}
    </div>
  );
}

/* ── Publish confirmation modal ── */
function PublishModal({ preview, onClose, onConfirm }) {
  return (
    <div className="cr-overlay" onClick={onClose}>
      <div className="cr-publish-modal" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}><CheckIcon /></div>
        <h3 className="cr-publish-title">Ride Published!</h3>
        <p className="cr-publish-sub">Your ride from <strong>{preview.from}</strong> to <strong>{preview.to}</strong> is now visible to passengers.</p>
        <div className="cr-publish-summary">
          <div className="cr-pub-row"><span>Date:</span><span>{preview.date}</span></div>
          <div className="cr-pub-row"><span>Time:</span><span>{preview.time}</span></div>
          <div className="cr-pub-row"><span>Seats:</span><span>{preview.seats}</span></div>
          <div className="cr-pub-row"><span>Price:</span><span>{preview.price} MAD/seat</span></div>
        </div>
        <button className="cr-pub-btn" onClick={onConfirm}>Go to My Rides</button>
        <button className="cr-pub-btn-outline" onClick={onClose}>Post Another</button>
      </div>
    </div>
  );
}

export default function CreateRidePage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState('AUI Main Gate');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('2026-02-20');
  const [time, setTime] = useState('14:00');
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState('50');
  const [womenOnly, setWomenOnly] = useState(false);
  const [noSmoke, setNoSmoke] = useState(true);
  const [driving, setDriving] = useState('Calm');
  const [stops, setStops] = useState([]);
  const [newStop, setNewStop] = useState('');
  const [showAddStop, setShowAddStop] = useState(false);
  const [showPublished, setShowPublished] = useState(false);

  const handleSwap = () => { const tmp = from; setFrom(to); setTo(tmp); };
  const handleAddStop = () => {
    if (newStop.trim()) { setStops(s => [...s, newStop.trim()]); setNewStop(''); setShowAddStop(false); }
  };
  const handleRemoveStop = (idx) => setStops(s => s.filter((_, i) => i !== idx));
  const handlePublish = () => setShowPublished(true);

  const preview = { from: from || 'Departure', to: to || 'Destination', time, date, seats, price };

  return (
    <div className="cr-layout">
      <div className="cr-form-panel">
        <div className="cr-header"><h2 className="cr-title">Post a Ride</h2></div>
        <div className="cr-scroll">
          {/* Route */}
          <div className="cr-card">
            <div className="cr-route-field">
              <MapPinIcon size={14} color="var(--color-primary)" />
              <input className="cr-route-input" value={from} onChange={e => setFrom(e.target.value)} placeholder="Departure point" />
            </div>
            <button className="cr-swap" onClick={handleSwap} title="Swap departure and destination"><ArrowUpDownIcon size={14} /></button>
            <div className="cr-route-field">
              <MapPinIcon size={14} color="var(--color-error)" />
              <input className="cr-route-input" value={to} onChange={e => setTo(e.target.value)} placeholder="Destination" />
            </div>
            {/* Existing stops */}
            {stops.map((s, i) => (
              <div key={i} className="cr-stop-chip">
                <MapPinIcon size={11} color="var(--color-text-secondary)" />
                <span>{s}</span>
                <button className="cr-stop-remove" onClick={() => handleRemoveStop(i)}><XIcon size={10} /></button>
              </div>
            ))}
            {/* Add stop input */}
            {showAddStop ? (
              <div className="cr-add-stop-row">
                <input className="cr-route-input cr-stop-input" value={newStop} onChange={e => setNewStop(e.target.value)} placeholder="Stop name" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddStop()} />
                <button className="cr-stop-confirm" onClick={handleAddStop}>Add</button>
                <button className="cr-stop-cancel" onClick={() => { setShowAddStop(false); setNewStop(''); }}>Cancel</button>
              </div>
            ) : (
              <button className="cr-add-stop" onClick={() => setShowAddStop(true)}><PlusIcon size={12} />Add a stop</button>
            )}
          </div>

          {/* Date & Time */}
          <div className="cr-card">
            <div className="cr-card-title">Date & Time</div>
            <div className="cr-two-col">
              <div className="cr-field"><label className="cr-label">Date</label><input className="cr-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div className="cr-field"><label className="cr-label">Time</label><input className="cr-input" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
            </div>
          </div>

          {/* Seats & Price */}
          <div className="cr-card">
            <div className="cr-card-title">Seats & Price</div>
            <div className="cr-two-col">
              <div className="cr-field"><label className="cr-label">Seats</label>
                <div className="cr-stepper">
                  <button className="cr-step" onClick={() => seats > 1 && setSeats(s => s - 1)}>−</button>
                  <span className="cr-step-val">{seats}</span>
                  <button className="cr-step" onClick={() => setSeats(s => s + 1)}>+</button>
                </div>
              </div>
              <div className="cr-field"><label className="cr-label">Price / seat (MAD)</label><input className="cr-input" value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="50" /></div>
            </div>
            <div className="cr-field" style={{ marginTop: 12 }}>
              <label className="cr-label">Vehicle</label>
              <div className="cr-select-field"><CarIcon size={13} /><span>Dacia Logan (White)</span></div>
            </div>
          </div>

          {/* Preferences */}
          <div className="cr-card">
            <div className="cr-card-title">Preferences</div>
            <Toggle label="Women Only" sub="Restrict to women passengers" val={womenOnly} onToggle={() => setWomenOnly(v => !v)} />
            <div className="cr-divider" />
            <Toggle label="No Smoking" sub="Smoking not allowed" val={noSmoke} onToggle={() => setNoSmoke(v => !v)} />
            <div className="cr-divider" />
            <div className="cr-field" style={{ marginTop: 8 }}>
              <label className="cr-label">Driving Style</label>
              <Pills options={['Calm', 'Moderate', 'Fast']} selected={driving} onSelect={setDriving} />
            </div>
          </div>
        </div>
        <div className="cr-footer">
          <button className="cr-publish-btn" onClick={handlePublish}><SendIcon size={14} />Publish Ride</button>
        </div>
      </div>

      {/* Preview side */}
      <div className="cr-preview-panel">
        <div className="cr-preview-header">Ride Preview</div>
        <div className="cr-preview-card">
          <div className="cr-preview-route"><div className="cr-preview-dot cr-dot-g" /><span className="cr-preview-city">{preview.from}</span></div>
          {stops.map((s, i) => (<div key={i} className="cr-preview-route"><div className="cr-preview-dot cr-dot-stop" /><span className="cr-preview-city cr-preview-stop">{s}</span></div>))}
          <div className="cr-preview-arrow">↓</div>
          <div className="cr-preview-route"><div className="cr-preview-dot cr-dot-r" /><span className="cr-preview-city">{preview.to}</span></div>
          <div className="cr-preview-divider" />
          <div className="cr-preview-meta">
            <span>{preview.date}</span>
            <span>{preview.time}</span>
            <span>{preview.seats} seats · {preview.price} MAD</span>
          </div>
        </div>
        <p className="cr-preview-note">This is how your ride will appear to other users</p>
      </div>

      {showPublished && <PublishModal preview={preview} onClose={() => setShowPublished(false)} onConfirm={() => navigate('/rides')} />}
    </div>
  );
}
