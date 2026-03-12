import React, { useState } from 'react';
import { Camera, Lock, ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react';
import './AccountSettingsPage.css';

const SMOKING = ['Non-smoker', 'Smoker'];
const DRIVING = ['Calm', 'Moderate', 'Fast'];
const V_SIZES = ['Small', 'Medium', 'Large'];

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
        <button
          key={o}
          className={`as-pill ${selected === o ? 'active' : ''}`}
          onClick={() => onSelect(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = () => {
    if (!currentPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Change Password</h3>
        <div className="modal-field">
          <label className="modal-label">Current Password</label>
          <div className="modal-input-wrapper">
            <input
              type={showCurrent ? 'text' : 'password'}
              className="modal-input"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="Enter current password"
            />
            <button
              className="modal-input-toggle"
              onClick={() => setShowCurrent(!showCurrent)}
            >
              {showCurrent ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>
        </div>
        <div className="modal-field">
          <label className="modal-label">New Password</label>
          <div className="modal-input-wrapper">
            <input
              type={showNew ? 'text' : 'password'}
              className="modal-input"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="Enter new password"
            />
            <button
              className="modal-input-toggle"
              onClick={() => setShowNew(!showNew)}
            >
              {showNew ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>
        </div>
        <div className="modal-field">
          <label className="modal-label">Confirm Password</label>
          <div className="modal-input-wrapper">
            <input
              type={showConfirm ? 'text' : 'password'}
              className="modal-input"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Confirm new password"
            />
            <button
              className="modal-input-toggle"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-btn-submit"
            onClick={handleUpdate}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeactivateAccountModal({ onClose }) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDeactivate = () => {
    if (!confirmed) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-danger" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Deactivate Account</h3>
        <p className="modal-warning">
          This action cannot be undone. Your account and all associated data will be permanently deleted.
        </p>
        <div className="modal-checkbox">
          <input
            type="checkbox"
            id="confirm-deactivate"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
          />
          <label htmlFor="confirm-deactivate">
            I understand and want to deactivate my account
          </label>
        </div>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-btn-danger"
            onClick={handleDeactivate}
            disabled={!confirmed || loading}
          >
            {loading ? 'Deactivating...' : 'Deactivate Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  const [firstName, setFirstName] = useState('Ghita');
  const [lastName, setLastName] = useState('Nafa');
  const [phone, setPhone] = useState('+212 612 345 678');
  const [smoking, setSmoking] = useState('Non-smoker');
  const [driving, setDriving] = useState('Calm');
  const isDriver = true;
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

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    }, 800);
  };

  return (
    <div className="as-layout">
      <div className="as-cols">
        {/* Left column */}
        <div className="as-col-left">
          {/* Avatar */}
          <div className="as-avatar-section">
            <div className="as-avatar-wrap">
              <div className="as-avatar">GN</div>
              <button className="as-camera-badge">
                <Camera size={12} />
              </button>
            </div>
            <button className="as-change-photo">Change photo</button>
          </div>

          {/* Personal Info */}
          <Card title="Personal Information">
            <div className="as-two-col">
              <div className="as-field">
                <label className="as-label">First Name</label>
                <input
                  className="as-input"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>
              <div className="as-field">
                <label className="as-label">Last Name</label>
                <input
                  className="as-input"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="as-field">
              <label className="as-label">AUI Email</label>
              <div className="as-email-locked">
                <Lock size={13} color="var(--color-primary)" />
                <span>g.nafa@aui.ma</span>
                <span className="as-verified-badge">✓ Verified</span>
              </div>
            </div>
            <div className="as-field">
              <label className="as-label">Phone Number</label>
              <input
                className="as-input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </Card>

          {/* Preferences */}
          <Card title="Travel Preferences">
            <div className="as-field">
              <label className="as-label">Smoking Preference</label>
              <Pills options={SMOKING} selected={smoking} onSelect={setSmoking} />
            </div>
            <div className="as-field" style={{ marginTop: 16 }}>
              <label className="as-label">Driving Style</label>
              <Pills options={DRIVING} selected={driving} onSelect={setDriving} />
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="as-col-right">
          {/* Vehicle */}
          {isDriver && (
            <Card
              title="My Vehicle"
              action={<button className="as-edit-link">Edit</button>}
            >
              <div className="as-two-col">
                <div className="as-field">
                  <label className="as-label">Brand</label>
                  <input
                    className="as-input"
                    value={vBrand}
                    onChange={e => setVBrand(e.target.value)}
                  />
                </div>
                <div className="as-field">
                  <label className="as-label">Model</label>
                  <input
                    className="as-input"
                    value={vModel}
                    onChange={e => setVModel(e.target.value)}
                  />
                </div>
              </div>
              <div className="as-two-col">
                <div className="as-field">
                  <label className="as-label">Color</label>
                  <input
                    className="as-input"
                    value={vColor}
                    onChange={e => setVColor(e.target.value)}
                  />
                </div>
                <div className="as-field">
                  <label className="as-label">Year</label>
                  <input
                    className="as-input"
                    value={vYear}
                    onChange={e => setVYear(e.target.value)}
                  />
                </div>
              </div>
              <div className="as-field">
                <label className="as-label">License Plate</label>
                <input
                  className="as-input"
                  value={vPlate}
                  onChange={e => setVPlate(e.target.value)}
                />
              </div>
              <div className="as-field" style={{ marginTop: 12 }}>
                <label className="as-label">Vehicle Size</label>
                <Pills options={V_SIZES} selected={vSize} onSelect={setVSize} />
              </div>
              <div className="as-field" style={{ marginTop: 12 }}>
                <label className="as-label">Luggage Capacity (bags)</label>
                <div className="as-stepper">
                  <button
                    className="as-step-btn"
                    onClick={() => setVLug(v => Math.max(1, v - 1))}
                  >
                    −
                  </button>
                  <span className="as-step-val">{vLug}</span>
                  <button
                    className="as-step-btn"
                    onClick={() => setVLug(v => v + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Security */}
          <Card title="Security">
            <button
              className="as-security-row"
              onClick={() => setShowPasswordModal(true)}
            >
              <Lock size={16} color="var(--color-text-primary)" />
              <span>Change Password</span>
              <ChevronRight
                size={16}
                color="var(--color-text-secondary)"
                style={{ marginLeft: 'auto' }}
              />
            </button>
            <div className="as-sec-divider" />
            <button
              className="as-security-row as-danger"
              onClick={() => setShowDeactivateModal(true)}
            >
              <Trash2 size={16} />
              <span>Deactivate Account</span>
              <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
            </button>
          </Card>

          {saveStatus && <div className="as-save-status">{saveStatus}</div>}
          <button
            className="as-save-btn"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {showDeactivateModal && (
        <DeactivateAccountModal onClose={() => setShowDeactivateModal(false)} />
      )}
    </div>
  );
}
