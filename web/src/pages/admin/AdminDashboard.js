import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  fetchStats,
  fetchUsers,
  fetchRides,
  fetchReviews,
  fetchReports,
  fetchReportDetail,
  updateReport,
  contactReporter,
  fetchConversation,
  sendAdminMessage,
  suspendUser,
  unsuspendUser,
  warnUser,
  cancelRideAdmin,
  removeReview,
} from '../../services/adminApi';
import './AdminDashboard.css';

// ── Icons ─────────────────────────────────────────────────────────────────────
const LogOutIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const UsersIcon   = ({size=24,color='#1b5e20'}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const CarIcon     = ({size=24,color='#1b5e20'}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
const AlertIcon   = ({size=24,color='#ef4444'}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const ChartIcon   = ({size=24,color='#f59e0b'}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
const SearchIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const CheckIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const BanIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const XIcon       = ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const MailIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const StarIcon    = ({filled}) => <svg width="12" height="12" viewBox="0 0 24 24" fill={filled?'#F59E0B':'#ddd'} stroke={filled?'#F59E0B':'#ddd'} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const TrashIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const FlagIcon    = ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;

// ── Bar chart (overview) ──────────────────────────────────────────────────────
function MiniBarChart({ data }) {
  const max = Math.max(...data.map(d => d.rides), 1);
  return (
    <div className="ad-chart">
      {data.map((d, i) => (
        <div key={i} className="ad-chart-col">
          <div className="ad-chart-bar-wrap">
            <div className="ad-chart-bar" style={{ height: `${(d.rides / max) * 100}%` }} />
          </div>
          <span className="ad-chart-label">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function userStatus(u) {
  if (u.accountStatus === 'Suspended')   return 'suspended';
  if (u.accountStatus === 'Deactivated') return 'deactivated';
  if (!u.verificationStatus)             return 'pending';
  return 'verified';
}

function rideStatusBadge(s) {
  const map = {
    Open: 'active', Active: 'active', Full: 'active', Accepted: 'active', OnGoing: 'active',
    Completed: 'completed',
    Cancelled: 'cancelled', Expired: 'cancelled', Dismissed: 'cancelled',
  };
  return map[s] || (s ? s.toLowerCase() : 'unknown');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserDetailModal({ user, token, onClose, onAction }) {
  const [msg, setMsg]                   = useState('');
  const [sending, setSending]           = useState(false);
  const [sent, setSent]                 = useState(false);
  const [actLoading, setActLoading]     = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendForm, setShowSuspendForm] = useState(false);

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?';
  const status   = userStatus(user);

  const handleSendMessage = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await warnUser(token, user._id, msg.trim());
      setSent(true);
      setMsg('');
      setTimeout(() => setSent(false), 3000);
    } catch (e) { alert(e.message); }
    finally { setSending(false); }
  };

  const handleSuspend = async () => {
    const reason = suspendReason.trim() || 'Suspended by admin';
    setActLoading(true);
    try {
      await suspendUser(token, user._id, reason);
      onAction('suspended', user._id);
      onClose();
    } catch (e) { alert(e.message); }
    finally { setActLoading(false); }
  };

  const handleUnsuspend = async () => {
    setActLoading(true);
    try {
      await unsuspendUser(token, user._id);
      onAction('unsuspended', user._id);
      onClose();
    } catch (e) { alert(e.message); }
    finally { setActLoading(false); }
  };

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-user-modal" onClick={e => e.stopPropagation()}>
        <div className="ad-modal-header">
          <span className="ad-modal-title">User Details</span>
          <button className="ad-modal-close" onClick={onClose}><XIcon size={18} /></button>
        </div>

        <div className="ad-user-detail-header">
          <div className="ad-user-detail-avatar">{initials}</div>
          <div className="ad-user-detail-info">
            <span className="ad-user-detail-name">{user.firstName} {user.lastName}</span>
            <span className="ad-user-detail-email">{user.email}</span>
            <span className={`ad-badge ad-badge-${status}`}>{status}</span>
          </div>
        </div>

        <div className="ad-user-detail-stats">
          <div><span className="ad-health-val" style={{ color: 'var(--color-primary)' }}>{user.totalCompletedRides ?? 0}</span><span className="ad-health-label">Rides</span></div>
          <div><span className="ad-health-val" style={{ color: 'var(--color-accent)' }}>{user.averageRating > 0 ? user.averageRating.toFixed(1) : '—'}</span><span className="ad-health-label">Rating</span></div>
          <div><span className="ad-health-val" style={{ color: 'var(--color-text-primary)' }}>{user.role}</span><span className="ad-health-label">Role</span></div>
        </div>

        <div className="ad-user-detail-fields">
          <div className="ad-udf-row"><span>Phone</span><span>{user.phoneNumber || '—'}</span></div>
          <div className="ad-udf-row"><span>Joined</span><span>{fmtDate(user.registrationDate)}</span></div>
          <div className="ad-udf-row"><span>Gender</span><span>{user.gender || '—'}</span></div>
          <div className="ad-udf-row"><span>Smoking</span><span>{user.smokingPreference || '—'}</span></div>
          {user.role === 'Driver' && (
            <>
              <div className="ad-udf-row"><span>Driving Style</span><span>{user.drivingStyle || '—'}</span></div>
              <div className="ad-udf-row"><span>License Verified</span><span>{user.driverLicenseVerified ? 'Yes' : 'No'}</span></div>
            </>
          )}
          <div className="ad-udf-row"><span>CashWallet Verified</span><span>{user.cashWalletVerified ? 'Yes' : 'No'}</span></div>
          <div className="ad-udf-row"><span>Cancellations</span><span>{user.cancellationCount ?? 0}</span></div>
          <div className="ad-udf-row"><span>Rating</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(s => <StarIcon key={s} filled={s <= Math.round(user.averageRating || 0)} />)}
            </div>
          </div>
        </div>

        {/* Send Admin Notification */}
        <div className="ad-user-msg-section">
          <label className="ad-user-msg-label">Send Admin Notification</label>
          {sent
            ? <p style={{ color: 'var(--color-success)', fontSize: 13, fontWeight: 600 }}>Notification sent to {user.firstName}!</p>
            : <>
              <textarea
                className="ad-user-msg-input"
                rows={3}
                placeholder={`Write a message to ${user.firstName}...`}
                value={msg}
                onChange={e => setMsg(e.target.value)}
              />
              <button className="ad-user-msg-send" disabled={!msg.trim() || sending} onClick={handleSendMessage}>
                <MailIcon /> {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </>
          }
        </div>

        {/* Actions */}
        <div className="ad-user-detail-actions">
          {status !== 'suspended' && (
            showSuspendForm ? (
              <div style={{width:'100%',display:'flex',flexDirection:'column',gap:8}}>
                <input
                  className="ad-user-msg-input"
                  style={{resize:'none',minHeight:'unset',padding:'8px 12px',fontSize:13}}
                  placeholder="Suspension reason (optional)…"
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                />
                <div style={{display:'flex',gap:8}}>
                  <button className="ad-action-btn-lg ad-action-ban-lg" disabled={actLoading} onClick={handleSuspend}>
                    <BanIcon /> Confirm Suspend
                  </button>
                  <button className="ad-action-btn-lg" style={{flex:1,background:'var(--color-border)',color:'var(--color-text-secondary)',border:'none'}} onClick={() => setShowSuspendForm(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="ad-action-btn-lg ad-action-ban-lg" disabled={actLoading} onClick={() => setShowSuspendForm(true)}>
                <BanIcon /> Suspend Account
              </button>
            )
          )}
          {status === 'suspended' && (
            <button className="ad-action-btn-lg ad-action-verify-lg" disabled={actLoading} onClick={handleUnsuspend}>
              <CheckIcon /> Reactivate Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Report Detail Modal ───────────────────────────────────────────────────────
function ReportDetailModal({ reportId, token, adminId, onClose, onAction }) {
  const [report, setReport]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [adminNote, setAdminNote]       = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendInput, setShowSuspendInput] = useState(false);
  const [contactMsg, setContactMsg]     = useState('');
  const [showContactInput, setShowContactInput] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [thread, setThread]             = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadMsg, setThreadMsg]       = useState('');
  const [threadSending, setThreadSending] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    fetchReportDetail(token, reportId)
      .then(d => {
        const r = d.report;
        setReport(r);
        setAdminNote(r.adminNote || '');
        if (r.reporterId?._id) {
          setThreadLoading(true);
          fetchConversation(token, r.reporterId._id)
            .then(t => setThread(t.messages || []))
            .catch(() => {})
            .finally(() => setThreadLoading(false));
        }
      })
      .catch(e => { alert(e.message); onClose(); })
      .finally(() => setLoading(false));
  }, [reportId, token, onClose]);

  const handleSendThreadMsg = async () => {
    if (!threadMsg.trim()) return;
    setThreadSending(true);
    try {
      const res = await sendAdminMessage(token, report.reporterId._id, threadMsg.trim());
      setThread(prev => [...prev, res.message]);
      setThreadMsg('');
    } catch (e) { alert(e.message); } finally { setThreadSending(false); }
  };

  const handleMarkReviewed = async () => {
    setSaving(true);
    try { await updateReport(token, reportId, 'Reviewed', adminNote); onAction('reviewed', reportId); onClose(); }
    catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const handleResolve = async () => {
    setSaving(true);
    try { await updateReport(token, reportId, 'Resolved', adminNote); onAction('resolved', reportId); onClose(); }
    catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const handleContact = async () => {
    if (!contactMsg.trim()) return;
    setSaving(true);
    try {
      await contactReporter(token, reportId, contactMsg.trim());
      setShowContactInput(false); setContactMsg('');
      onAction('contacted', reportId);
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) { alert('Please enter a suspension reason.'); return; }
    setSaving(true);
    try {
      await suspendUser(token, report.subjectId._id, suspendReason.trim());
      await updateReport(token, reportId, 'Resolved', adminNote || 'Subject account suspended.');
      onAction('resolved', reportId);
      onClose();
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="ad-modal-overlay">
      <div className="ad-report-modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading report…</p>
      </div>
    </div>
  );
  if (!report) return null;

  const reporter = report.reporterId || {};
  const subject  = report.subjectId  || {};
  const isSuspended = subject.accountStatus === 'Suspended';
  const isResolved  = report.status === 'Resolved';

  const statusColor = { Open: 'cancelled', Reviewed: 'active', Resolved: 'completed' }[report.status] || 'active';

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-report-modal" onClick={e => e.stopPropagation()}>
        <div className="ad-modal-header">
          <span className="ad-modal-title"><FlagIcon size={16} /> &nbsp;Report Details</span>
          <button className="ad-modal-close" onClick={onClose}><XIcon size={18} /></button>
        </div>

        <div className="ad-report-modal-body">
          {/* Reporter → Subject */}
          <div className="ad-report-users-row">
            <div className="ad-report-user-card">
              <span className="ad-report-user-role-label">Reporter</span>
              <div className="ad-user-detail-avatar" style={{ width: 42, height: 42, fontSize: 15 }}>
                {`${reporter.firstName?.[0] || ''}${reporter.lastName?.[0] || ''}`.toUpperCase() || '?'}
              </div>
              <span className="ad-report-user-name">{reporter.firstName} {reporter.lastName}</span>
              <span className="ad-report-user-email">{reporter.email}</span>
            </div>
            <div className="ad-report-users-arrow">→</div>
            <div className="ad-report-user-card">
              <span className="ad-report-user-role-label">Subject</span>
              <div className="ad-user-detail-avatar" style={{ width: 42, height: 42, fontSize: 15, background: isSuspended ? '#fee2e2' : '' }}>
                {`${subject.firstName?.[0] || ''}${subject.lastName?.[0] || ''}`.toUpperCase() || '?'}
              </div>
              <span className="ad-report-user-name">{subject.firstName} {subject.lastName}</span>
              <span className="ad-report-user-email">{subject.email}</span>
              {isSuspended && <span className="ad-badge ad-badge-suspended" style={{ fontSize: 10, marginTop: 2 }}>suspended</span>}
            </div>
          </div>

          {/* Meta row */}
          <div className="ad-report-meta-row">
            <span className="ad-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{report.category}</span>
            <span className="ad-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{report.context}</span>
            <span className={`ad-badge ad-badge-${statusColor}`}>{report.status}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>{fmtDate(report.createdAt)}</span>
          </div>

          {/* Description */}
          {report.description && (
            <div className="ad-report-section">
              <p className="ad-report-section-label">Description</p>
              <p className="ad-report-description">{report.description}</p>
            </div>
          )}

          {/* Ride details */}
          {report.context === 'Ride' && report.rideId && (
            <div className="ad-report-section">
              <p className="ad-report-section-label">Ride</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                {report.rideId.departureLocation} → {report.rideId.destination}
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {fmtDate(report.rideId.departureDateTime)} · {report.rideId.state}
              </p>
            </div>
          )}

          {/* Message snapshot */}
          {report.context === 'Message' && report.messageSnapshot?.content && (
            <div className="ad-report-section">
              <p className="ad-report-section-label">Reported Message</p>
              <div className="ad-message-bubble">
                <p>{report.messageSnapshot.content}</p>
                {report.messageSnapshot.sentAt && (
                  <span className="ad-msg-time">{fmtDate(report.messageSnapshot.sentAt)} {fmtTime(report.messageSnapshot.sentAt)}</span>
                )}
              </div>
            </div>
          )}

          {/* Admin note */}
          <div className="ad-report-section">
            <p className="ad-report-section-label">Admin Note</p>
            <textarea
              className="ad-admin-note-input"
              rows={2}
              placeholder="Add a note (optional)…"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              disabled={isResolved}
            />
          </div>

          {/* Conversation thread */}
          <div className="ad-report-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p className="ad-report-section-label" style={{ margin: 0 }}>Conversation with Reporter</p>
              {threadLoading && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Loading…</span>}
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px', background: 'var(--color-background)', marginBottom: 8 }}>
              {thread.length === 0 && !threadLoading
                ? <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, textAlign: 'center' }}>No messages yet. Use “Contact Reporter” below to start.</p>
                : thread.map(msg => {
                    const fromAdmin = (msg.senderId?._id || msg.senderId)?.toString() === adminId?.toString();
                    return (
                      <div key={msg._id} style={{ display: 'flex', flexDirection: 'column', alignItems: fromAdmin ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '78%', background: fromAdmin ? 'var(--color-primary)' : '#fff', color: fromAdmin ? '#fff' : 'var(--color-text-primary)', border: fromAdmin ? 'none' : '1px solid var(--color-border)', borderRadius: fromAdmin ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '8px 12px', fontSize: 13 }}>
                          <p style={{ margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
                          <span style={{ fontSize: 10, opacity: 0.65, display: 'block', marginTop: 3 }}>
                            {fromAdmin ? 'You' : (report.reporterId?.firstName || 'Reporter')} &middot; {new Date(msg.date || msg.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="ad-admin-note-input"
                style={{ flex: 1 }}
                placeholder="Send a follow-up message to reporter…"
                value={threadMsg}
                onChange={e => setThreadMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendThreadMsg(); } }}
                disabled={isResolved}
              />
              <button
                className="ad-action-btn-lg"
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', flexShrink: 0, minWidth: 72 }}
                onClick={handleSendThreadMsg}
                disabled={threadSending || !threadMsg.trim() || isResolved}
              >
                <MailIcon /> Send
              </button>
            </div>
          </div>

          {/* Actions */}}
          {!isResolved && (
            <div className="ad-report-actions">
              {/* Contact reporter */}
              {showContactInput ? (
                <div className="ad-report-inline-form">
                  <input className="ad-admin-note-input" style={{ flex: 1 }} placeholder="Message to reporter…" value={contactMsg} onChange={e => setContactMsg(e.target.value)} />
                  <button className="ad-action-btn-lg" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', flexShrink: 0 }} onClick={handleContact} disabled={saving || !contactMsg.trim()}><MailIcon /> Send</button>
                  <button className="ad-action-btn-lg" style={{ background: 'var(--color-border)', color: 'var(--color-text-secondary)', border: 'none', flexShrink: 0 }} onClick={() => setShowContactInput(false)}>Cancel</button>
                </div>
              ) : (
                <button className="ad-action-btn-lg" onClick={() => setShowContactInput(true)} disabled={saving}><MailIcon /> Contact Reporter</button>
              )}

              {/* Mark reviewed */}
              {report.status === 'Open' && (
                <button className="ad-action-btn-lg" onClick={handleMarkReviewed} disabled={saving}><CheckIcon /> Mark Reviewed</button>
              )}

              {/* Resolve */}
              <button className="ad-action-btn-lg ad-action-verify-lg" onClick={handleResolve} disabled={saving}><CheckIcon /> Resolve</button>

              {/* Suspend subject */}
              {!isSuspended && (
                showSuspendInput ? (
                  <div className="ad-report-inline-form">
                    <input className="ad-admin-note-input" style={{ flex: 1 }} placeholder="Suspension reason (required)…" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} />
                    <button className="ad-action-btn-lg ad-action-ban-lg" onClick={handleSuspend} disabled={saving || !suspendReason.trim()}><BanIcon /> Confirm</button>
                    <button className="ad-action-btn-lg" style={{ background: 'var(--color-border)', color: 'var(--color-text-secondary)', border: 'none', flexShrink: 0 }} onClick={() => setShowSuspendInput(false)}>Cancel</button>
                  </div>
                ) : (
                  <button className="ad-action-btn-lg ad-action-ban-lg" onClick={() => setShowSuspendInput(true)} disabled={saving}><BanIcon /> Suspend Subject</button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { admin, token, logout } = useAdminAuth();

  const [tab, setTab]                   = useState('overview');
  const [toast, setToast]               = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // ── Overview state ──
  const [stats, setStats]               = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Users state ──
  const [users, setUsers]               = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch]     = useState('');
  const [roleFilter, setRoleFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Rides state ──
  const [rides, setRides]               = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [rideSearch, setRideSearch]     = useState('');
  const [rideStatusFilter, setRideStatusFilter] = useState('all');

  // ── Reviews state ──
  const [reviews, setReviews]               = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSearch, setReviewSearch]     = useState('');

  // ── Reports state ──
  const [reports, setReports]               = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  // ── Fetch stats on mount ──
  useEffect(() => {
    if (!token) return;
    setStatsLoading(true);
    fetchStats(token)
      .then(data => setStats(data))
      .catch(e => showToast(`Stats error: ${e.message}`))
      .finally(() => setStatsLoading(false));
  }, [token, showToast]);

  // ── Fetch users when tab or filters change ──
  useEffect(() => {
    if (tab !== 'users' || !token) return;
    setUsersLoading(true);
    fetchUsers(token, { search: userSearch, role: roleFilter, status: statusFilter })
      .then(d => setUsers(d.users || []))
      .catch(e => showToast(`Users error: ${e.message}`))
      .finally(() => setUsersLoading(false));
  }, [tab, token, userSearch, roleFilter, statusFilter, showToast]);

  // ── Fetch rides when tab or filters change ──
  useEffect(() => {
    if (tab !== 'rides' || !token) return;
    setRidesLoading(true);
    fetchRides(token, { search: rideSearch, status: rideStatusFilter })
      .then(d => setRides(d.rides || []))
      .catch(e => showToast(`Rides error: ${e.message}`))
      .finally(() => setRidesLoading(false));
  }, [tab, token, rideSearch, rideStatusFilter, showToast]);

  // ── Fetch reviews when tab changes ──
  useEffect(() => {
    if (tab !== 'reviews' || !token) return;
    setReviewsLoading(true);
    fetchReviews(token, { search: reviewSearch })
      .then(d => setReviews(d.reviews || []))
      .catch(e => showToast(`Reviews error: ${e.message}`))
      .finally(() => setReviewsLoading(false));
  }, [tab, token, reviewSearch, showToast]);

  // ── Fetch reports when tab or filter changes ──
  useEffect(() => {
    if (tab !== 'reports' || !token) return;
    setReportsLoading(true);
    fetchReports(token, reportStatusFilter !== 'all' ? { status: reportStatusFilter.charAt(0).toUpperCase() + reportStatusFilter.slice(1) } : {})
      .then(d => setReports(d.reports || []))
      .catch(e => showToast(`Reports error: ${e.message}`))
      .finally(() => setReportsLoading(false));
  }, [tab, token, reportStatusFilter, showToast]);

  // ── Handlers ──
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleCancelRide = async (rideId) => {
    if (!window.confirm('Cancel this ride? This cannot be undone.')) return;
    try {
      await cancelRideAdmin(token, rideId, 'Cancelled by admin');
      setRides(prev => prev.map(r => r._id === rideId ? { ...r, state: 'Cancelled' } : r));
      showToast('Ride cancelled');
    } catch (e) { showToast(`Error: ${e.message}`); }
  };

  const handleRemoveReview = async (reviewId) => {
    if (!window.confirm('Remove this review permanently?')) return;
    try {
      await removeReview(token, reviewId);
      setReviews(prev => prev.filter(r => r._id !== reviewId));
      showToast('Review removed');
    } catch (e) { showToast(`Error: ${e.message}`); }
  };

  const handleReportAction = (action, reportId) => {
    setReports(prev => prev.map(r => {
      if (r._id !== reportId) return r;
      if (action === 'reviewed') return { ...r, status: 'Reviewed' };
      if (action === 'resolved') return { ...r, status: 'Resolved' };
      return r;
    }));
    if (action === 'resolved') showToast('Report resolved');
    if (action === 'reviewed') showToast('Report marked as reviewed');
    if (action === 'contacted') showToast('Reporter notified');
  };

  const handleUserAction = (action, userId) => {
    setUsers(prev => prev.map(u => {
      if (u._id !== userId) return u;
      if (action === 'suspended')   return { ...u, accountStatus: 'Suspended' };
      if (action === 'unsuspended') return { ...u, accountStatus: 'Active' };
      return u;
    }));
    showToast(action === 'suspended' ? 'Account suspended' : 'Account reactivated');
  };

  const TABS = ['overview', 'users', 'rides', 'reviews', 'reports'];

  const statCards = stats ? [
    { icon: <UsersIcon size={22} color="#1b5e20" />, label: 'Total Users',  val: stats.totalUsers,  accent: 'green' },
    { icon: <CarIcon   size={22} color="#1b5e20" />, label: 'Total Rides',  val: stats.totalRides,  accent: 'green' },
    { icon: <ChartIcon size={22} color="#f59e0b" />, label: 'Active Now',   val: stats.activeRides, accent: 'amber' },
    { icon: <AlertIcon size={22} color="#ef4444" />, label: 'Open Reports', val: stats.openReports, accent: 'red'   },
  ] : [];

  return (
    <div className="ad-container">
      {/* Header */}
      <div className="ad-header">
        <div className="ad-header-left">
          <div className="ad-logo">AUI Carpool</div>
          <div>
            <h1 className="ad-title">Admin Dashboard</h1>
            <p className="ad-subtitle">
              Signed in as <strong>{admin?.firstName} {admin?.lastName}</strong> · {admin?.email}
            </p>
          </div>
        </div>
        <button className="ad-logout" onClick={handleLogout}><LogOutIcon /> Logout</button>
      </div>

      {/* Stat cards */}
      <div className="ad-stats">
        {statsLoading
          ? <p style={{ color: 'var(--color-text-secondary)', padding: '0 8px' }}>Loading stats…</p>
          : statCards.map((s, i) => (
            <div key={i} className={`ad-stat-card ad-stat-${s.accent}`}>
              {s.icon}
              <div><p className="ad-stat-label">{s.label}</p><p className="ad-stat-val">{s.val}</p></div>
            </div>
          ))
        }
      </div>

      {/* Tabs */}
      <div className="ad-tabs">
        {TABS.map(t => (
          <button key={t} className={`ad-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="ad-content">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="ad-overview">
            <div className="ad-overview-row">
              <div className="ad-overview-card">
                <h3 className="ad-section-title">Rides This Week</h3>
                {stats ? <MiniBarChart data={stats.weekly} /> : <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>}
              </div>
              <div className="ad-overview-card">
                <h3 className="ad-section-title">Platform Health</h3>
                {stats
                  ? <div className="ad-health-grid">
                    <div className="ad-health-item"><span className="ad-health-val" style={{ color: 'var(--color-primary)' }}>{stats.health.avgRating}</span><span className="ad-health-label">Avg Rating</span></div>
                    <div className="ad-health-item"><span className="ad-health-val" style={{ color: 'var(--color-accent)' }}>{stats.health.completionRate}%</span><span className="ad-health-label">Completion Rate</span></div>
                    <div className="ad-health-item"><span className="ad-health-val" style={{ color: 'var(--color-primary)' }}>{stats.health.completedCount}</span><span className="ad-health-label">Completed</span></div>
                    <div className="ad-health-item"><span className="ad-health-val" style={{ color: 'var(--color-error)' }}>{stats.health.cancelledCount}</span><span className="ad-health-label">Cancelled</span></div>
                  </div>
                  : <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
                }
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div>
            <div className="ad-toolbar">
              <div className="ad-search-box">
                <SearchIcon />
                <input className="ad-search-input" placeholder="Search users by name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              <div className="ad-filter-row">
                <div className="ad-filter-group">
                  <span className="ad-filter-label">Role:</span>
                  {['all', 'driver', 'passenger'].map(r => (
                    <button key={r} className={`ad-filter-btn ${roleFilter === r ? 'active' : ''}`} onClick={() => setRoleFilter(r)}>
                      {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="ad-filter-group">
                  <span className="ad-filter-label">Status:</span>
                  {['all', 'verified', 'pending', 'suspended', 'deactivated'].map(s => (
                    <button key={s} className={`ad-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <span className="ad-toolbar-count">{usersLoading ? '…' : `${users.length} users`}</span>
            </div>

            {usersLoading
              ? <p style={{ color: 'var(--color-text-secondary)' }}>Loading users…</p>
              : <table className="ad-table">
                <thead>
                  <tr><th>User</th><th>Email</th><th>Role</th><th>Rides</th><th>Rating</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const st = userStatus(u);
                    return (
                      <tr key={u._id} className="ad-clickable-row" onClick={() => setSelectedUser(u)}>
                        <td>
                          <div className="ad-user-cell">
                            <div className="ad-user-avatar">{`${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase()}</div>
                            {u.firstName} {u.lastName}
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.totalCompletedRides ?? 0}</td>
                        <td>{u.averageRating > 0 ? u.averageRating.toFixed(1) : '—'}</td>
                        <td><span className={`ad-badge ad-badge-${st}`}>{st}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="ad-action-btns">
                            {st !== 'suspended'
                              ? <button className="ad-action-btn ad-action-ban" title="Suspend" onClick={async () => { try { await suspendUser(token, u._id, 'Suspended by admin'); handleUserAction('suspended', u._id); } catch (e) { showToast(e.message); } }}><BanIcon /></button>
                              : <button className="ad-action-btn ad-action-verify" title="Reactivate" onClick={async () => { try { await unsuspendUser(token, u._id); handleUserAction('unsuspended', u._id); } catch (e) { showToast(e.message); } }}><CheckIcon /></button>
                            }
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            }
          </div>
        )}

        {/* ── RIDES ── */}
        {tab === 'rides' && (
          <div>
            <div className="ad-toolbar">
              <div className="ad-search-box">
                <SearchIcon />
                <input className="ad-search-input" placeholder="Search by driver or destination…" value={rideSearch} onChange={e => setRideSearch(e.target.value)} />
              </div>
              <div className="ad-filter-group">
                <span className="ad-filter-label">Status:</span>
                {['all', 'active', 'completed', 'cancelled'].map(s => (
                  <button key={s} className={`ad-filter-btn ${rideStatusFilter === s ? 'active' : ''}`} onClick={() => setRideStatusFilter(s)}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <span className="ad-toolbar-count">{ridesLoading ? '…' : `${rides.length} rides`}</span>
            </div>

            {ridesLoading
              ? <p style={{ color: 'var(--color-text-secondary)' }}>Loading rides…</p>
              : <table className="ad-table">
                <thead>
                  <tr><th>Driver</th><th>Route</th><th>Date</th><th>Time</th><th>Price</th><th>Seats</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {rides.map(r => {
                    const driver = r.driverId;
                    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : '—';
                    const badgeSt = rideStatusBadge(r.state);
                    const bookedSeats = Math.max(0, (r.totalSeats || 0) - (r.availableSeats || 0));
                    return (
                      <tr key={r._id}>
                        <td>{driverName}</td>
                        <td>{r.departureLocation} → {r.destination}</td>
                        <td>{fmtDate(r.departureDateTime)}</td>
                        <td>{fmtTime(r.departureDateTime)}</td>
                        <td>{r.pricePerSeat} MAD</td>
                        <td>{bookedSeats}/{r.totalSeats ?? 0}</td>
                        <td><span className={`ad-badge ad-badge-${badgeSt}`}>{r.state}</span></td>
                        <td>
                          {(['Active', 'OnGoing', 'Full', 'Accepted', 'Open'].includes(r.state)) && (
                            <button className="ad-action-btn ad-action-ban" title="Cancel Ride" onClick={() => handleCancelRide(r._id)}><XIcon /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            }
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab === 'reviews' && (
          <div>
            <div className="ad-toolbar">
              <div className="ad-search-box">
                <SearchIcon />
                <input className="ad-search-input" placeholder="Search reviews by content or user…" value={reviewSearch} onChange={e => setReviewSearch(e.target.value)} />
              </div>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}
                onClick={() => {
                  setReviewsLoading(true);
                  fetchReviews(token, { search: reviewSearch })
                    .then(d => setReviews(d.reviews || []))
                    .catch(e => showToast(e.message))
                    .finally(() => setReviewsLoading(false));
                }}
              >
                <RefreshIcon /> Refresh
              </button>
              <span className="ad-toolbar-count">{reviewsLoading ? '…' : `${reviews.length} reviews`}</span>
            </div>

            {reviewsLoading
              ? <p style={{ color: 'var(--color-text-secondary)' }}>Loading reviews…</p>
              : <table className="ad-table">
                <thead>
                  <tr><th>Author</th><th>Subject</th><th>Rating</th><th>Content</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {reviews.map(rv => (
                    <tr key={rv._id}>
                      <td>{rv.authorId ? `${rv.authorId.firstName} ${rv.authorId.lastName}` : '—'}</td>
                      <td>{rv.subjectId ? `${rv.subjectId.firstName} ${rv.subjectId.lastName}` : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(s => <StarIcon key={s} filled={s <= rv.rating} />)}
                        </div>
                      </td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rv.content || <em style={{ color: 'var(--color-text-secondary)' }}>No text</em>}
                      </td>
                      <td>{fmtDate(rv.date || rv.createdAt)}</td>
                      <td>
                        <button className="ad-action-btn ad-action-ban" title="Remove review" onClick={() => handleRemoveReview(rv._id)}>
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab === 'reports' && (
          <div>
            <div className="ad-toolbar">
              <div className="ad-filter-group">
                <span className="ad-filter-label">Status:</span>
                {['all', 'open', 'reviewed', 'resolved'].map(s => (
                  <button key={s} className={`ad-filter-btn ${reportStatusFilter === s ? 'active' : ''}`} onClick={() => setReportStatusFilter(s)}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}
                onClick={() => {
                  setReportsLoading(true);
                  fetchReports(token, reportStatusFilter !== 'all' ? { status: reportStatusFilter.charAt(0).toUpperCase() + reportStatusFilter.slice(1) } : {})
                    .then(d => setReports(d.reports || []))
                    .catch(e => showToast(e.message))
                    .finally(() => setReportsLoading(false));
                }}
              >
                <RefreshIcon /> Refresh
              </button>
              <span className="ad-toolbar-count">{reportsLoading ? '…' : `${reports.length} reports`}</span>
            </div>

            {reportsLoading
              ? <p style={{ color: 'var(--color-text-secondary)' }}>Loading reports…</p>
              : reports.length === 0
                ? <p style={{ color: 'var(--color-text-secondary)', padding: '24px 0' }}>No reports found.</p>
                : <table className="ad-table">
                  <thead>
                    <tr><th>Reporter</th><th>Subject</th><th>Category</th><th>Context</th><th>Date</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {reports.map(rp => {
                      const reporter = rp.reporterId || {};
                      const subject  = rp.subjectId  || {};
                      const statusColor = { Open: 'cancelled', Reviewed: 'active', Resolved: 'completed' }[rp.status] || 'active';
                      return (
                        <tr key={rp._id} className="ad-clickable-row" onClick={() => setSelectedReport(rp._id)}>
                          <td>{reporter.firstName} {reporter.lastName}</td>
                          <td>{subject.firstName} {subject.lastName}</td>
                          <td>{rp.category}</td>
                          <td>{rp.context}</td>
                          <td>{fmtDate(rp.createdAt)}</td>
                          <td><span className={`ad-badge ad-badge-${statusColor}`}>{rp.status}</span></td>
                          <td onClick={e => e.stopPropagation()}>
                            <button className="ad-action-btn" title="View report" onClick={() => setSelectedReport(rp._id)}>
                              <FlagIcon />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            }
          </div>
        )}

      </div>

      {/* User detail modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          token={token}
          onClose={() => setSelectedUser(null)}
          onAction={handleUserAction}
        />
      )}

      {/* Report detail modal */}
      {selectedReport && (
        <ReportDetailModal
          reportId={selectedReport}
          token={token}
          adminId={admin?._id}
          onClose={() => setSelectedReport(null)}
          onAction={handleReportAction}
        />
      )}

      {/* Toast */}
      {toast && <div className="ad-toast">{toast}</div>}
    </div>
  );
}
