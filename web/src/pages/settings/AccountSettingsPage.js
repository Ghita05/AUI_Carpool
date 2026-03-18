import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AccountSettingsPage.css';

const CameraIcon = ({ size = 12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const LockIcon = ({ size = 16, color = 'var(--color-text-primary)' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const ChevronRightIcon = ({ size = 16, color = 'var(--color-text-secondary)' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const TrashIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const EyeIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

const SMOKING = ['Non-smoker', 'Smoker'];
const DRIVING = ['Calm', 'Moderate', 'Fast'];
const V_SIZES = ['Small', 'Medium', 'Large'];

function Card({ title, children, action }) {
  return (<div className="as-card"><div className="as-card-header"><h3 className="as-card-title">{title}</h3>{action}</div>{children}</div>);
}
function Pills({ options, selected, onSelect, disabled }) {
  return (<div className="as-pills">{options.map(o => (<button key={o} className={`as-pill ${selected === o ? 'active' : ''}`} onClick={() => !disabled && onSelect(o)} disabled={disabled}>{o}</button>))}</div>);
}

function ChangePasswordModal({ onClose }) {
  const [currentPw,setCurrentPw]=useState(''),[newPw,setNewPw]=useState(''),[confirmPw,setConfirmPw]=useState('');
  const [showCurrent,setShowCurrent]=useState(false),[showNew,setShowNew]=useState(false),[showConfirm,setShowConfirm]=useState(false);
  const [loading,setLoading]=useState(false);
  const handleUpdate=()=>{if(!currentPw||!newPw||!confirmPw||newPw!==confirmPw)return;setLoading(true);setTimeout(()=>{setLoading(false);onClose();},800);};
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e=>e.stopPropagation()}>
      <h3 className="modal-title">Change Password</h3>
      {[{label:'Current Password',val:currentPw,set:setCurrentPw,show:showCurrent,toggle:()=>setShowCurrent(s=>!s)},{label:'New Password',val:newPw,set:setNewPw,show:showNew,toggle:()=>setShowNew(s=>!s)},{label:'Confirm Password',val:confirmPw,set:setConfirmPw,show:showConfirm,toggle:()=>setShowConfirm(s=>!s)}].map((f,i)=>(
        <div key={i} className="modal-field"><label className="modal-label">{f.label}</label><div className="modal-input-wrapper"><input type={f.show?'text':'password'} className="modal-input" value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.label}/><button className="modal-input-toggle" onClick={f.toggle}>{f.show?<EyeOffIcon size={16}/>:<EyeIcon size={16}/>}</button></div></div>
      ))}
      <div className="modal-actions"><button className="modal-btn-cancel" onClick={onClose}>Cancel</button><button className="modal-btn-submit" onClick={handleUpdate} disabled={loading}>{loading?'Updating...':'Update Password'}</button></div>
    </div></div>
  );
}

function DeactivateAccountModal({ onClose }) {
  const [confirmed,setConfirmed]=useState(false),[loading,setLoading]=useState(false);
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content modal-danger" onClick={e=>e.stopPropagation()}>
      <h3 className="modal-title">Deactivate Account</h3>
      <p className="modal-warning">This action cannot be undone. Your account and all associated data will be permanently deleted.</p>
      <div className="modal-checkbox"><input type="checkbox" id="confirm-deactivate" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><label htmlFor="confirm-deactivate">I understand and want to deactivate my account</label></div>
      <div className="modal-actions"><button className="modal-btn-cancel" onClick={onClose}>Cancel</button><button className="modal-btn-danger" onClick={()=>{setLoading(true);setTimeout(()=>{setLoading(false);onClose();},800);}} disabled={!confirmed||loading}>{loading?'Deactivating...':'Deactivate Account'}</button></div>
    </div></div>
  );
}

export default function AccountSettingsPage() {
  const { user, isDriver } = useAuth();
  const photoInputRef = useRef(null);
  const carPhotoInputRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [carPhotoUrl, setCarPhotoUrl] = useState(null);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || 'Ghita');
  const [lastName, setLastName] = useState(user.lastName || 'Nafa');
  const [phone, setPhone] = useState('+212 612 345 678');
  const [smoking, setSmoking] = useState('Non-smoker');
  const [driving, setDriving] = useState('Calm');
  const [vBrand, setVBrand] = useState('Dacia');
  const [vModel, setVModel] = useState('Logan');
  const [vColor, setVColor] = useState('White');
  const [vYear, setVYear] = useState('2022');
  const [vPlate, setVPlate] = useState('12345-AB-67');
  const [vSize, setVSize] = useState('Medium');
  const [vLug, setVLug] = useState(3);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const handleSave = () => { setLoading(true); setTimeout(() => { setLoading(false); setEditing(false); setSaveStatus('Saved successfully!'); setTimeout(() => setSaveStatus(''), 3000); }, 800); };
  const handlePhotoChange = (e) => { const file = e.target.files[0]; if (file) setPhotoUrl(URL.createObjectURL(file)); };
  const handleCarPhotoChange = (e) => { const file = e.target.files[0]; if (file) setCarPhotoUrl(URL.createObjectURL(file)); };

  return (
    <div className="as-layout">
      <div className="as-cols">
        <div className="as-col-left">
          {/* Avatar with working photo upload */}
          <div className="as-avatar-section">
            <div className="as-avatar-wrap">
              {photoUrl ? <img src={photoUrl} alt="Profile" className="as-avatar-img" /> : <div className="as-avatar">{user.initials || 'GN'}</div>}
              <button className="as-camera-badge" onClick={() => photoInputRef.current?.click()}><CameraIcon size={12} /></button>
            </div>
            <button className="as-change-photo" onClick={() => photoInputRef.current?.click()}>Change photo</button>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>

          <Card title="Personal Information" action={<button className="as-edit-link" onClick={() => setEditing(e => !e)}>{editing ? 'Lock' : 'Edit'}</button>}>
            <div className="as-two-col">
              <div className="as-field"><label className="as-label">First Name</label><input className="as-input" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={!editing} /></div>
              <div className="as-field"><label className="as-label">Last Name</label><input className="as-input" value={lastName} onChange={e => setLastName(e.target.value)} disabled={!editing} /></div>
            </div>
            <div className="as-field"><label className="as-label">AUI Email</label><div className="as-email-locked"><LockIcon size={13} color="var(--color-primary)" /><span>{user.email || 'g.nafa@aui.ma'}</span><span className="as-verified-badge">✓ Verified</span></div></div>
            <div className="as-field"><label className="as-label">Phone Number</label><input className="as-input" value={phone} onChange={e => setPhone(e.target.value)} disabled={!editing} /></div>
          </Card>

          <Card title="Travel Preferences">
            <div className="as-field"><label className="as-label">Smoking Preference</label><Pills options={SMOKING} selected={smoking} onSelect={setSmoking} disabled={!editing} /></div>
            <div className="as-field" style={{ marginTop: 16 }}><label className="as-label">Driving Style</label><Pills options={DRIVING} selected={driving} onSelect={setDriving} disabled={!editing} /></div>
          </Card>
        </div>

        <div className="as-col-right">
          {/* Vehicle — only for drivers */}
          {isDriver && (
            <Card title="My Vehicle" action={<button className="as-edit-link" onClick={() => setEditing(e => !e)}>{editing ? 'Lock' : 'Edit'}</button>}>
              <div className="as-two-col">
                <div className="as-field"><label className="as-label">Brand</label><input className="as-input" value={vBrand} onChange={e => setVBrand(e.target.value)} disabled={!editing} /></div>
                <div className="as-field"><label className="as-label">Model</label><input className="as-input" value={vModel} onChange={e => setVModel(e.target.value)} disabled={!editing} /></div>
              </div>
              <div className="as-two-col">
                <div className="as-field"><label className="as-label">Color</label><input className="as-input" value={vColor} onChange={e => setVColor(e.target.value)} disabled={!editing} /></div>
                <div className="as-field"><label className="as-label">Year</label><input className="as-input" value={vYear} onChange={e => setVYear(e.target.value)} disabled={!editing} /></div>
              </div>
              <div className="as-field"><label className="as-label">License Plate</label><input className="as-input" value={vPlate} onChange={e => setVPlate(e.target.value)} disabled={!editing} /></div>
              <div className="as-field" style={{ marginTop: 12 }}><label className="as-label">Vehicle Size</label><Pills options={V_SIZES} selected={vSize} onSelect={setVSize} disabled={!editing} /></div>
              <div className="as-field" style={{ marginTop: 12 }}><label className="as-label">Luggage Capacity (bags)</label>
                <div className="as-stepper"><button className="as-step-btn" onClick={() => editing && setVLug(v => Math.max(1, v - 1))} disabled={!editing}>−</button><span className="as-step-val">{vLug}</span><button className="as-step-btn" onClick={() => editing && setVLug(v => v + 1)} disabled={!editing}>+</button></div>
              </div>
              <div className="as-field" style={{ marginTop: 16 }}><label className="as-label">Vehicle Photo</label>
                {carPhotoUrl ? <div className="as-car-photo-wrap"><img src={carPhotoUrl} alt="Vehicle" className="as-car-photo"/>{editing && <button className="as-car-photo-change" onClick={() => carPhotoInputRef.current?.click()}>Change</button>}</div>
                : <label className="as-car-upload" onClick={() => editing && carPhotoInputRef.current?.click()} style={{opacity:editing?1:0.5,cursor:editing?'pointer':'not-allowed'}}>
                    <CameraIcon size={20}/><span>Upload a photo of your vehicle</span>
                  </label>}
                <input ref={carPhotoInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleCarPhotoChange}/>
              </div>
            </Card>
          )}

          <Card title="Security">
            <button className="as-security-row" onClick={() => setShowPasswordModal(true)}><LockIcon size={16} color="var(--color-text-primary)" /><span>Change Password</span><ChevronRightIcon size={16} /></button>
            <div className="as-sec-divider" />
            <button className="as-security-row as-danger" onClick={() => setShowDeactivateModal(true)}><TrashIcon size={16} /><span>Deactivate Account</span><ChevronRightIcon size={16} /></button>
          </Card>

          {saveStatus && <div className="as-save-status">{saveStatus}</div>}
          {editing && <button className="as-save-btn" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>}
        </div>
      </div>
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showDeactivateModal && <DeactivateAccountModal onClose={() => setShowDeactivateModal(false)} />}
    </div>
  );
}
