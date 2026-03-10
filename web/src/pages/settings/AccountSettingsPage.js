import React, { useState } from 'react';
import { Camera, Lock, ChevronRight, Trash2 } from 'lucide-react';
import './AccountSettingsPage.css';

const SMOKING = ['Non-smoker','Smoker'];
const DRIVING = ['Calm','Moderate','Fast'];
const V_SIZES = ['Small','Medium','Large'];

function Card({ title, children, action }) {
  return (
    <div className="as-card">
      <div className="as-card-header">
        <h3 className="as-card-title">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Pills({ options, selected, onSelect }) {
  return (
    <div className="as-pills">
      {options.map(o => (
        <button key={o} className={`as-pill ${selected===o?'active':''}`} onClick={()=>onSelect(o)}>{o}</button>
      ))}
    </div>
  );
}

export default function AccountSettingsPage() {
  const [firstName, setFirstName] = useState('Ghita');
  const [lastName,  setLastName]  = useState('Nafa');
  const [phone,     setPhone]     = useState('+212 612 345 678');
  const [smoking,   setSmoking]   = useState('Non-smoker');
  const [driving,   setDriving]   = useState('Calm');
  const isDriver = true;
  const [vBrand, setVBrand] = useState('Dacia');
  const [vModel, setVModel] = useState('Logan');
  const [vColor, setVColor] = useState('White');
  const [vYear,  setVYear]  = useState('2022');
  const [vPlate, setVPlate] = useState('12345-AB-67');
  const [vSize,  setVSize]  = useState('Medium');
  const [vLug,   setVLug]   = useState(3);

  return (
    <div className="as-layout">
      <div className="as-cols">
        {/* Left column */}
        <div className="as-col-left">
          {/* Avatar */}
          <div className="as-avatar-section">
            <div className="as-avatar-wrap">
              <div className="as-avatar">GN</div>
              <button className="as-camera-badge"><Camera size={12}/></button>
            </div>
            <button className="as-change-photo">Change photo</button>
          </div>

          {/* Personal Info */}
          <Card title="Personal Information">
            <div className="as-two-col">
              <div className="as-field">
                <label className="as-label">First Name</label>
                <input className="as-input" value={firstName} onChange={e=>setFirstName(e.target.value)}/>
              </div>
              <div className="as-field">
                <label className="as-label">Last Name</label>
                <input className="as-input" value={lastName} onChange={e=>setLastName(e.target.value)}/>
              </div>
            </div>
            <div className="as-field">
              <label className="as-label">AUI Email</label>
              <div className="as-email-locked">
                <Lock size={13} color="var(--color-primary)"/>
                <span>g.nafa@aui.ma</span>
                <span className="as-verified-badge">✓ Verified</span>
              </div>
            </div>
            <div className="as-field">
              <label className="as-label">Phone Number</label>
              <input className="as-input" value={phone} onChange={e=>setPhone(e.target.value)}/>
            </div>
          </Card>

          {/* Preferences */}
          <Card title="Travel Preferences">
            <div className="as-field">
              <label className="as-label">Smoking Preference</label>
              <Pills options={SMOKING} selected={smoking} onSelect={setSmoking}/>
            </div>
            <div className="as-field" style={{marginTop:16}}>
              <label className="as-label">Driving Style</label>
              <Pills options={DRIVING} selected={driving} onSelect={setDriving}/>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="as-col-right">
          {/* Vehicle */}
          {isDriver && (
            <Card title="My Vehicle" action={<button className="as-edit-link">Edit</button>}>
              <div className="as-two-col">
                <div className="as-field"><label className="as-label">Brand</label><input className="as-input" value={vBrand} onChange={e=>setVBrand(e.target.value)}/></div>
                <div className="as-field"><label className="as-label">Model</label><input className="as-input" value={vModel} onChange={e=>setVModel(e.target.value)}/></div>
              </div>
              <div className="as-two-col">
                <div className="as-field"><label className="as-label">Color</label><input className="as-input" value={vColor} onChange={e=>setVColor(e.target.value)}/></div>
                <div className="as-field"><label className="as-label">Year</label><input className="as-input" value={vYear} onChange={e=>setVYear(e.target.value)}/></div>
              </div>
              <div className="as-field"><label className="as-label">License Plate</label><input className="as-input" value={vPlate} onChange={e=>setVPlate(e.target.value)}/></div>
              <div className="as-field" style={{marginTop:12}}>
                <label className="as-label">Vehicle Size</label>
                <Pills options={V_SIZES} selected={vSize} onSelect={setVSize}/>
              </div>
              <div className="as-field" style={{marginTop:12}}>
                <label className="as-label">Luggage Capacity (bags)</label>
                <div className="as-stepper">
                  <button className="as-step-btn" onClick={()=>setVLug(v=>Math.max(1,v-1))}>−</button>
                  <span className="as-step-val">{vLug}</span>
                  <button className="as-step-btn" onClick={()=>setVLug(v=>v+1)}>+</button>
                </div>
              </div>
            </Card>
          )}

          {/* Security */}
          <Card title="Security">
            <button className="as-security-row">
              <Lock size={16} color="var(--color-text-primary)"/>
              <span>Change Password</span>
              <ChevronRight size={16} color="var(--color-text-secondary)" style={{marginLeft:'auto'}}/>
            </button>
            <div className="as-sec-divider"/>
            <button className="as-security-row as-danger">
              <Trash2 size={16}/>
              <span>Deactivate Account</span>
              <ChevronRight size={16} style={{marginLeft:'auto'}}/>
            </button>
          </Card>

          <button className="as-save-btn">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
