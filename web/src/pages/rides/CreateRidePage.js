import React, { useState } from 'react';
import { MapPin, ArrowUpDown, Plus, Calendar, Clock, Car, Send } from 'lucide-react';
import './CreateRidePage.css';

function Toggle({ label, sub, val, onToggle }) {
  return (
    <div className="cr-toggle-row">
      <div><div className="cr-toggle-label">{label}</div>{sub&&<div className="cr-toggle-sub">{sub}</div>}</div>
      <button className={`cr-toggle ${val?'on':''}`} onClick={onToggle}>
        <div className="cr-thumb"/>
      </button>
    </div>
  );
}

function Pills({ options, selected, onSelect }) {
  return (
    <div className="cr-pills">
      {options.map(o=>(
        <button key={o} className={`cr-pill ${selected===o?'active':''}`} onClick={()=>onSelect(o)}>{o}</button>
      ))}
    </div>
  );
}

export default function CreateRidePage() {
  const [from,      setFrom]      = useState('AUI Main Gate');
  const [to,        setTo]        = useState('');
  const [date,      setDate]      = useState('Feb 20, 2026');
  const [time,      setTime]      = useState('14:00');
  const [seats,     setSeats]     = useState(3);
  const [price,     setPrice]     = useState('50');
  const [womenOnly, setWomenOnly] = useState(false);
  const [noSmoke,   setNoSmoke]   = useState(true);
  const [driving,   setDriving]   = useState('Calm');

  const preview = { from: from||'Departure', to: to||'Destination', time, date, seats, price };

  return (
    <div className="cr-layout">
      {/* Form side */}
      <div className="cr-form-panel">
        <div className="cr-header"><h2 className="cr-title">Create a Ride</h2></div>
        <div className="cr-scroll">
          {/* Route */}
          <div className="cr-card">
            <div className="cr-route-field">
              <MapPin size={14} color="var(--color-primary)"/>
              <input className="cr-route-input" value={from} onChange={e=>setFrom(e.target.value)} placeholder="Departure"/>
            </div>
            <button className="cr-swap"><ArrowUpDown size={14}/></button>
            <div className="cr-route-field">
              <MapPin size={14} color="var(--color-error)"/>
              <input className="cr-route-input" value={to} onChange={e=>setTo(e.target.value)} placeholder="Destination"/>
            </div>
            <button className="cr-add-stop"><Plus size={12}/>Add a stop</button>
          </div>

          {/* Date & Time */}
          <div className="cr-card">
            <div className="cr-card-title">Date & Time</div>
            <div className="cr-two-col">
              <div className="cr-field"><label className="cr-label">Date</label>
                <div className="cr-select-field"><Calendar size={13}/><span>{date}</span></div>
              </div>
              <div className="cr-field"><label className="cr-label">Time</label>
                <div className="cr-select-field"><Clock size={13}/><span>{time}</span></div>
              </div>
            </div>
          </div>

          {/* Seats & Price */}
          <div className="cr-card">
            <div className="cr-card-title">Seats & Price</div>
            <div className="cr-two-col">
              <div className="cr-field"><label className="cr-label">Seats</label>
                <div className="cr-stepper">
                  <button className="cr-step" onClick={()=>seats>1&&setSeats(s=>s-1)}>−</button>
                  <span className="cr-step-val">{seats}</span>
                  <button className="cr-step" onClick={()=>setSeats(s=>s+1)}>+</button>
                </div>
              </div>
              <div className="cr-field"><label className="cr-label">Price / seat (MAD)</label>
                <input className="cr-input" value={price} onChange={e=>setPrice(e.target.value)} type="number" placeholder="50"/>
              </div>
            </div>
            <div className="cr-field" style={{marginTop:12}}>
              <label className="cr-label">Vehicle</label>
              <div className="cr-select-field"><Car size={13}/><span>Dacia Logan (White)</span></div>
            </div>
          </div>

          {/* Preferences */}
          <div className="cr-card">
            <div className="cr-card-title">Preferences</div>
            <Toggle label="Women Only" sub="Restrict to women passengers" val={womenOnly} onToggle={()=>setWomenOnly(v=>!v)}/>
            <div className="cr-divider"/>
            <Toggle label="No Smoking" sub="Smoking not allowed" val={noSmoke} onToggle={()=>setNoSmoke(v=>!v)}/>
            <div className="cr-divider"/>
            <div className="cr-field" style={{marginTop:8}}>
              <label className="cr-label">Driving Style</label>
              <Pills options={['Calm','Moderate','Fast']} selected={driving} onSelect={setDriving}/>
            </div>
          </div>
        </div>
        <div className="cr-footer">
          <button className="cr-publish-btn"><Send size={14}/>Publish Ride</button>
        </div>
      </div>

      {/* Preview side */}
      <div className="cr-preview-panel">
        <div className="cr-preview-header">Ride Preview</div>
        <div className="cr-preview-card">
          <div className="cr-preview-route">
            <div className="cr-preview-dot cr-dot-g"/><span className="cr-preview-city">{preview.from}</span>
          </div>
          <div className="cr-preview-arrow">↓</div>
          <div className="cr-preview-route">
            <div className="cr-preview-dot cr-dot-r"/><span className="cr-preview-city">{preview.to}</span>
          </div>
          <div className="cr-preview-divider"/>
          <div className="cr-preview-meta">
            <span>{preview.date}</span>
            <span>{preview.time}</span>
            <span>{preview.seats} seats · {preview.price} MAD</span>
          </div>
        </div>
        <p className="cr-preview-note">This is how your ride will appear to other users</p>
      </div>
    </div>
  );
}
