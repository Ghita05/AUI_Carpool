import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const LogOutIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const UsersIcon = ({size=24,color='#1b5e20'}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const CarIcon = ({size=24,color='#1b5e20'}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
const AlertIcon = ({size=24,color='#ef4444'}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const ChartIcon = ({size=24,color='#f59e0b'}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const BanIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const XIcon = ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const MailIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const StarIcon = ({filled}) => <svg width="12" height="12" viewBox="0 0 24 24" fill={filled?'#F59E0B':'#ddd'} stroke={filled?'#F59E0B':'#ddd'} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;

const USERS = [
  { id:1,name:'Ghita Nafa',email:'g.nafa@aui.ma',role:'Driver',joined:'2024-03-01',status:'verified',rides:23,rating:4.8,phone:'+212 612 345 678',smoking:'Non-smoker',driving:'Calm' },
  { id:2,name:'Ahmed Benali',email:'a.benali@aui.ma',role:'Driver',joined:'2024-02-15',status:'verified',rides:15,rating:3.9,phone:'+212 622 111 222',smoking:'Non-smoker',driving:'Moderate' },
  { id:3,name:'Sara Mansour',email:'s.mansour@aui.ma',role:'Passenger',joined:'2024-02-20',status:'verified',rides:8,rating:4.5,phone:'+212 633 444 555',smoking:'Non-smoker',driving:'—' },
  { id:4,name:'Kenza Nouri',email:'k.nouri@aui.ma',role:'Driver',joined:'2024-01-10',status:'verified',rides:31,rating:5.0,phone:'+212 644 777 888',smoking:'Non-smoker',driving:'Calm' },
  { id:5,name:'Youssef Amrani',email:'y.amrani@aui.ma',role:'Passenger',joined:'2024-03-15',status:'pending',rides:0,rating:0,phone:'+212 655 999 000',smoking:'Smoker',driving:'—' },
  { id:6,name:'Fatima Zahra',email:'f.zahra@aui.ma',role:'Passenger',joined:'2024-03-18',status:'banned',rides:2,rating:1.2,phone:'+212 666 111 333',smoking:'Non-smoker',driving:'—' },
];
const RIDES = [
  { id:1,driver:'Ghita N.',from:'AUI Main Gate',to:'Fez Airport',date:'Feb 20',time:'14:00',price:50,passengers:2,seats:4,status:'active' },
  { id:2,driver:'Ahmed B.',from:'AUI Main Gate',to:'Rabat',date:'Feb 25',time:'09:00',price:100,passengers:3,seats:4,status:'active' },
  { id:3,driver:'Kenza N.',from:'AUI Main Gate',to:'Meknes',date:'Feb 10',time:'15:30',price:40,passengers:4,seats:4,status:'completed' },
  { id:4,driver:'Ghita N.',from:'AUI Main Gate',to:'Casablanca',date:'Feb 28',time:'07:00',price:150,passengers:0,seats:4,status:'active' },
  { id:5,driver:'Ahmed B.',from:'AUI Main Gate',to:'Fez',date:'Feb 5',time:'10:00',price:50,passengers:4,seats:4,status:'completed' },
];
const REPORTS = [
  { id:1,reporter:'Sara M.',against:'Youssef A.',type:'No-show',date:'Feb 19',status:'open',description:'Passenger did not show up at the meeting point.' },
  { id:2,reporter:'Kenza N.',against:'Fatima Z.',type:'Rude behavior',date:'Feb 17',status:'open',description:'Passenger was very rude during the ride.' },
  { id:3,reporter:'Ahmed B.',against:'Unknown',type:'App bug',date:'Feb 15',status:'resolved',description:'Map was not loading properly on mobile.' },
  { id:4,reporter:'Ghita N.',against:'Youssef A.',type:'Late payment',date:'Feb 12',status:'open',description:'Passenger has not paid for 2 rides.' },
  { id:5,reporter:'Sara M.',against:'Ahmed B.',type:'Unsafe driving',date:'Feb 8',status:'resolved',description:'Driver was speeding on the highway.' },
];
const WEEKLY = [{day:'Mon',rides:12},{day:'Tue',rides:18},{day:'Wed',rides:22},{day:'Thu',rides:15},{day:'Fri',rides:30},{day:'Sat',rides:8},{day:'Sun',rides:5}];

function MiniBarChart({data}){const max=Math.max(...data.map(d=>d.rides));return(<div className="ad-chart">{data.map((d,i)=>(<div key={i} className="ad-chart-col"><div className="ad-chart-bar-wrap"><div className="ad-chart-bar" style={{height:`${(d.rides/max)*100}%`}}/></div><span className="ad-chart-label">{d.day}</span></div>))}</div>);}

/* User Detail Modal */
function UserDetailModal({ user, onClose, onBan, onVerify }) {
  const [msg,setMsg]=useState('');
  const [sent,setSent]=useState(false);
  const initials = user.name.split(' ').map(n=>n[0]).join('');
  return (
    <div className="ad-modal-overlay" onClick={onClose}><div className="ad-user-modal" onClick={e=>e.stopPropagation()}>
      <div className="ad-modal-header"><span className="ad-modal-title">User Details</span><button className="ad-modal-close" onClick={onClose}><XIcon size={18}/></button></div>
      <div className="ad-user-detail-header">
        <div className="ad-user-detail-avatar">{initials}</div>
        <div className="ad-user-detail-info">
          <span className="ad-user-detail-name">{user.name}</span>
          <span className="ad-user-detail-email">{user.email}</span>
          <span className={`ad-badge ad-badge-${user.status}`}>{user.status}</span>
        </div>
      </div>
      <div className="ad-user-detail-stats">
        <div><span className="ad-health-val" style={{color:'var(--color-primary)'}}>{user.rides}</span><span className="ad-health-label">Rides</span></div>
        <div><span className="ad-health-val" style={{color:'var(--color-accent)'}}>{user.rating>0?user.rating:'—'}</span><span className="ad-health-label">Rating</span></div>
        <div><span className="ad-health-val" style={{color:'var(--color-text-primary)'}}>{user.role}</span><span className="ad-health-label">Role</span></div>
      </div>
      <div className="ad-user-detail-fields">
        <div className="ad-udf-row"><span>Phone</span><span>{user.phone}</span></div>
        <div className="ad-udf-row"><span>Joined</span><span>{user.joined}</span></div>
        <div className="ad-udf-row"><span>Smoking</span><span>{user.smoking}</span></div>
        {user.role==='Driver' && <div className="ad-udf-row"><span>Driving Style</span><span>{user.driving}</span></div>}
        <div className="ad-udf-row"><span>Rating</span><div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(s=><StarIcon key={s} filled={s<=Math.round(user.rating)}/>)}</div></div>
      </div>
      {/* Send message */}
      <div className="ad-user-msg-section">
        <label className="ad-user-msg-label">Send Direct Message</label>
        {sent ? <p style={{color:'var(--color-success)',fontSize:13,fontWeight:600}}>Message sent to {user.name}!</p> : <>
          <textarea className="ad-user-msg-input" rows={3} placeholder={`Write a message to ${user.name.split(' ')[0]}...`} value={msg} onChange={e=>setMsg(e.target.value)}/>
          <button className="ad-user-msg-send" disabled={!msg.trim()} onClick={()=>{setSent(true);setTimeout(()=>setSent(false),3000);setMsg('');}}><MailIcon/> Send Message</button>
        </>}
      </div>
      {/* Actions */}
      <div className="ad-user-detail-actions">
        {user.status!=='verified' && <button className="ad-action-btn-lg ad-action-verify-lg" onClick={()=>{onVerify(user.id);onClose();}}><CheckIcon/> Verify User</button>}
        {user.status!=='banned' ? <button className="ad-action-btn-lg ad-action-ban-lg" onClick={()=>{onBan(user.id);onClose();}}><BanIcon/> Ban User</button>
        : <button className="ad-action-btn-lg ad-action-verify-lg" onClick={()=>{onVerify(user.id);onClose();}}><CheckIcon/> Unban User</button>}
      </div>
    </div></div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab,setTab]=useState('overview');
  const [userSearch,setUserSearch]=useState('');
  const [roleFilter,setRoleFilter]=useState('all');
  const [statusFilter,setStatusFilter]=useState('all');
  const [rideSearch,setRideSearch]=useState('');
  const [rideStatusFilter,setRideStatusFilter]=useState('all');
  const [users,setUsers]=useState(USERS);
  const [rides,setRides]=useState(RIDES);
  const [reports,setReports]=useState(REPORTS);
  const [toast,setToast]=useState('');
  const [selectedUser,setSelectedUser]=useState(null);

  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(''),2500);};
  const toggleUserStatus=(id,newStatus)=>{setUsers(p=>p.map(u=>u.id===id?{...u,status:newStatus}:u));showToast(`User ${newStatus==='banned'?'banned':'verified'}`);};
  const cancelRide=(id)=>{setRides(p=>p.map(r=>r.id===id?{...r,status:'cancelled'}:r));showToast('Ride cancelled');};
  const resolveReport=(id)=>{setReports(p=>p.map(r=>r.id===id?{...r,status:'resolved'}:r));showToast('Report resolved');};

  let filteredUsers = users.filter(u=>u.name.toLowerCase().includes(userSearch.toLowerCase())||u.email.toLowerCase().includes(userSearch.toLowerCase()));
  if(roleFilter!=='all') filteredUsers = filteredUsers.filter(u=>u.role.toLowerCase()===roleFilter);
  if(statusFilter!=='all') filteredUsers = filteredUsers.filter(u=>u.status===statusFilter);

  let filteredRides = rides.filter(r=>r.driver.toLowerCase().includes(rideSearch.toLowerCase())||r.to.toLowerCase().includes(rideSearch.toLowerCase()));
  if(rideStatusFilter!=='all') filteredRides = filteredRides.filter(r=>r.status===rideStatusFilter);

  const stats={totalUsers:users.length,totalRides:rides.length,activeRides:rides.filter(r=>r.status==='active').length,openReports:reports.filter(r=>r.status==='open').length};
  const TABS=['overview','users','rides','reports','settings'];

  return (
    <div className="ad-container">
      <div className="ad-header"><div className="ad-header-left"><div className="ad-logo">AUI Carpool</div><div><h1 className="ad-title">Admin Dashboard</h1><p className="ad-subtitle">Manage users, rides, and platform activity</p></div></div><button className="ad-logout" onClick={()=>navigate('/splash')}><LogOutIcon/> Logout</button></div>

      <div className="ad-stats">{[{icon:<UsersIcon size={22} color="#1b5e20"/>,label:'Total Users',val:stats.totalUsers,accent:'green'},{icon:<CarIcon size={22} color="#1b5e20"/>,label:'Total Rides',val:stats.totalRides,accent:'green'},{icon:<ChartIcon size={22} color="#f59e0b"/>,label:'Active Now',val:stats.activeRides,accent:'amber'},{icon:<AlertIcon size={22} color="#ef4444"/>,label:'Open Reports',val:stats.openReports,accent:'red'}].map((s,i)=>(<div key={i} className={`ad-stat-card ad-stat-${s.accent}`}>{s.icon}<div><p className="ad-stat-label">{s.label}</p><p className="ad-stat-val">{s.val}</p></div></div>))}</div>

      <div className="ad-tabs">{TABS.map(t=>(<button key={t} className={`ad-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>))}</div>

      <div className="ad-content">
        {tab==='overview' && (
          <div className="ad-overview">
            <div className="ad-overview-row"><div className="ad-overview-card"><h3 className="ad-section-title">Rides This Week</h3><MiniBarChart data={WEEKLY}/></div><div className="ad-overview-card"><h3 className="ad-section-title">Platform Health</h3><div className="ad-health-grid"><div className="ad-health-item"><span className="ad-health-val" style={{color:'var(--color-primary)'}}>4.6</span><span className="ad-health-label">Avg Rating</span></div><div className="ad-health-item"><span className="ad-health-val" style={{color:'var(--color-accent)'}}>92%</span><span className="ad-health-label">Completion Rate</span></div><div className="ad-health-item"><span className="ad-health-val" style={{color:'var(--color-primary)'}}>3.2</span><span className="ad-health-label">Avg Riders/Trip</span></div><div className="ad-health-item"><span className="ad-health-val" style={{color:'var(--color-error)'}}>2.1%</span><span className="ad-health-label">Cancellation</span></div></div></div></div>
            <div className="ad-overview-card"><h3 className="ad-section-title">Recent Activity</h3><table className="ad-table"><thead><tr><th>Driver</th><th>Route</th><th>Date</th><th>Passengers</th><th>Status</th></tr></thead><tbody>{rides.slice(0,5).map(r=>(<tr key={r.id}><td>{r.driver}</td><td>{r.from} → {r.to}</td><td>{r.date}</td><td>{r.passengers}/{r.seats}</td><td><span className={`ad-badge ad-badge-${r.status}`}>{r.status}</span></td></tr>))}</tbody></table></div>
          </div>
        )}

        {tab==='users' && (
          <div>
            <div className="ad-toolbar">
              <div className="ad-search-box"><SearchIcon/><input className="ad-search-input" placeholder="Search users..." value={userSearch} onChange={e=>setUserSearch(e.target.value)}/></div>
              <div className="ad-filter-row">
                <div className="ad-filter-group"><span className="ad-filter-label">Role:</span>{['all','driver','passenger'].map(r=>(<button key={r} className={`ad-filter-btn ${roleFilter===r?'active':''}`} onClick={()=>setRoleFilter(r)}>{r==='all'?'All':r.charAt(0).toUpperCase()+r.slice(1)}</button>))}</div>
                <div className="ad-filter-group"><span className="ad-filter-label">Status:</span>{['all','verified','pending','banned'].map(s=>(<button key={s} className={`ad-filter-btn ${statusFilter===s?'active':''}`} onClick={()=>setStatusFilter(s)}>{s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}</button>))}</div>
              </div>
              <span className="ad-toolbar-count">{filteredUsers.length} users</span>
            </div>
            <table className="ad-table">
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Rides</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{filteredUsers.map(u=>(<tr key={u.id} className="ad-clickable-row" onClick={()=>setSelectedUser(u)}>
                <td><div className="ad-user-cell"><div className="ad-user-avatar">{u.name.split(' ').map(n=>n[0]).join('')}</div>{u.name}</div></td>
                <td>{u.email}</td><td>{u.role}</td><td>{u.rides}</td><td>{u.rating>0?u.rating:'—'}</td>
                <td><span className={`ad-badge ad-badge-${u.status}`}>{u.status}</span></td>
                <td onClick={e=>e.stopPropagation()}><div className="ad-action-btns">
                  {u.status!=='verified'&&<button className="ad-action-btn ad-action-verify" onClick={()=>toggleUserStatus(u.id,'verified')} title="Verify"><CheckIcon/></button>}
                  {u.status!=='banned'&&<button className="ad-action-btn ad-action-ban" onClick={()=>toggleUserStatus(u.id,'banned')} title="Ban"><BanIcon/></button>}
                  {u.status==='banned'&&<button className="ad-action-btn ad-action-verify" onClick={()=>toggleUserStatus(u.id,'verified')} title="Unban"><CheckIcon/></button>}
                </div></td>
              </tr>))}</tbody>
            </table>
          </div>
        )}

        {tab==='rides' && (
          <div>
            <div className="ad-toolbar">
              <div className="ad-search-box"><SearchIcon/><input className="ad-search-input" placeholder="Search rides..." value={rideSearch} onChange={e=>setRideSearch(e.target.value)}/></div>
              <div className="ad-filter-group"><span className="ad-filter-label">Status:</span>{['all','active','completed','cancelled'].map(s=>(<button key={s} className={`ad-filter-btn ${rideStatusFilter===s?'active':''}`} onClick={()=>setRideStatusFilter(s)}>{s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}</button>))}</div>
              <span className="ad-toolbar-count">{filteredRides.length} rides</span>
            </div>
            <table className="ad-table"><thead><tr><th>Driver</th><th>Route</th><th>Date</th><th>Time</th><th>Price</th><th>Passengers</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filteredRides.map(r=>(<tr key={r.id}><td>{r.driver}</td><td>{r.from} → {r.to}</td><td>{r.date}</td><td>{r.time}</td><td>{r.price} MAD</td><td>{r.passengers}/{r.seats}</td><td><span className={`ad-badge ad-badge-${r.status}`}>{r.status}</span></td><td>{r.status==='active'&&<button className="ad-action-btn ad-action-ban" onClick={()=>cancelRide(r.id)} title="Cancel"><XIcon/></button>}</td></tr>))}</tbody></table>
          </div>
        )}

        {tab==='reports' && (
          <div>
            <h2 className="ad-section-title">User Reports ({reports.filter(r=>r.status==='open').length} open)</h2>
            <div className="ad-reports-list">{reports.map(r=>(<div key={r.id} className={`ad-report-card ${r.status==='resolved'?'ad-report-resolved':''}`}>
              <div className="ad-report-header"><div><span className="ad-report-type">{r.type}</span><span className={`ad-badge ad-badge-${r.status==='open'?'active':'completed'}`}>{r.status}</span></div><span className="ad-report-date">{r.date}</span></div>
              <p className="ad-report-desc">{r.description}</p>
              <div className="ad-report-meta"><span>Reported by: <strong>{r.reporter}</strong></span><span>Against: <strong>{r.against}</strong></span></div>
              {r.status==='open'&&<button className="ad-report-resolve" onClick={()=>resolveReport(r.id)}>Mark as Resolved</button>}
            </div>))}</div>
          </div>
        )}

        {tab==='settings' && (
          <div className="ad-settings">
            <h2 className="ad-section-title">Platform Settings</h2>
            <div className="ad-settings-grid">
              <div className="ad-setting-card"><h4>Ride Limits</h4>
                <div className="ad-setting-row"><span>Max seats per ride</span><input className="ad-setting-input" type="number" defaultValue={4}/></div>
                <div className="ad-setting-row"><span>Max price per seat (MAD)</span><input className="ad-setting-input" type="number" defaultValue={200}/></div>
                <div className="ad-setting-row"><span>Max stops per ride</span><input className="ad-setting-input" type="number" defaultValue={5}/></div>
              </div>
              <div className="ad-setting-card"><h4>Notifications</h4>
                <div className="ad-setting-row"><span>Email on new report</span><div className="ad-toggle on"><div className="ad-toggle-thumb"/></div></div>
                <div className="ad-setting-row"><span>Daily summary email</span><div className="ad-toggle"><div className="ad-toggle-thumb"/></div></div>
                <div className="ad-setting-row"><span>Notify drivers on ride request</span><div className="ad-toggle on"><div className="ad-toggle-thumb"/></div></div>
              </div>
              <div className="ad-setting-card"><h4>Safety</h4>
                <div className="ad-setting-row"><span>Max cancellations before warning</span><input className="ad-setting-input" type="number" defaultValue={3}/></div>
                <div className="ad-setting-row"><span>Min rating before review</span><input className="ad-setting-input" type="number" defaultValue={2} step={0.1}/></div>
                <div className="ad-setting-row"><span>Auto-ban after reports</span><input className="ad-setting-input" type="number" defaultValue={5}/></div>
              </div>
            </div>
            <button className="ad-save-btn" onClick={()=>showToast('Settings saved')}>Save Settings</button>
          </div>
        )}
      </div>

      {selectedUser && <UserDetailModal user={selectedUser} onClose={()=>setSelectedUser(null)} onBan={(id)=>toggleUserStatus(id,'banned')} onVerify={(id)=>toggleUserStatus(id,'verified')}/>}
      {toast && <div className="ad-toast">{toast}</div>}
    </div>
  );
}
