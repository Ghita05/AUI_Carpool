import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './NotificationsPage.css';

const CheckCircleIcon = ({ size=18,color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const UserPlusIcon = ({ size=18,color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
const XCircleIcon = ({ size=18,color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
const ClockIcon = ({ size=18,color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const FlagIcon = ({ size=18,color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const InfoIcon = ({ size=18,color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const CarIcon = ({ size=18,color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
const SearchIcon = ({ size=18,color='currentColor' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

const CFG = {
  booking_confirmed:{ Icon:CheckCircleIcon, bg:'var(--color-primary-bg)', color:'var(--color-primary)' },
  booking_new:      { Icon:UserPlusIcon,    bg:'var(--color-primary-bg)', color:'var(--color-primary)' },
  booking_cancelled:{ Icon:XCircleIcon,     bg:'var(--color-error-bg)',   color:'var(--color-error)'   },
  ride_reminder:    { Icon:ClockIcon,       bg:'#FEF3C7',                 color:'#D97706'              },
  ride_completed:   { Icon:FlagIcon,        bg:'var(--color-primary-bg)', color:'var(--color-primary)' },
  ride_posted:      { Icon:CarIcon,         bg:'var(--color-primary-bg)', color:'var(--color-primary)' },
  ride_request:     { Icon:SearchIcon,      bg:'var(--color-warning-bg)', color:'#D97706'              },
  ride_request_match:{ Icon:CheckCircleIcon,bg:'var(--color-success-bg)', color:'var(--color-success)' },
  system:           { Icon:InfoIcon,        bg:'var(--color-background)', color:'var(--color-text-secondary)' },
};

const INITIAL_NOTIFS = [
  { group:'Bookings', items:[
    { id:'1', title:'Booking Confirmed', preview:'Your ride to Fez on Feb 20 is confirmed. Meet at AUI Main Gate at 13:50.', time:'5 min ago', type:'booking_confirmed', unread:true, link:'/rides/1' },
    { id:'2', title:'New Booking', preview:'Ahmed Benali booked a seat on your Rabat ride (Feb 25, 09:00)', time:'1 hr ago', type:'booking_new', unread:true, link:'/rides/2' },
    { id:'3', title:'Booking Cancelled', preview:'Your booking for Meknes was cancelled by the driver', time:'2 hrs ago', type:'booking_cancelled', unread:false },
  ]},
  { group:'Rides', items:[
    { id:'4', title:'Departure Reminder', preview:'Your ride to Fez departs in 1 hour. Don\'t forget your luggage!', time:'3 hrs ago', type:'ride_reminder', unread:true, link:'/rides/1' },
    { id:'5', title:'Ride Published', preview:'Your ride AUI → Casablanca (Feb 28, 07:00) is now live. 4 seats available.', time:'Yesterday', type:'ride_posted', unread:false },
    { id:'6', title:'Ride Completed', preview:'Your trip to Meknes is complete. Rate your experience!', time:'Yesterday', type:'ride_completed', unread:false },
  ]},
  { group:'Ride Requests', items:[
    { id:'7', title:'Ride Request Submitted', preview:'Your request for a ride to Tangier has been submitted. We\'ll notify you when a match is found.', time:'2 days ago', type:'ride_request', unread:false },
    { id:'8', title:'Ride Request Match!', preview:'A new ride to Tangier was just posted by Youssef A. — check it out!', time:'3 days ago', type:'ride_request_match', unread:true, link:'/home' },
  ]},
  { group:'System', items:[
    { id:'9', title:'Welcome to AUI Carpool', preview:'Your account has been verified successfully. Start exploring rides!', time:'Feb 15', type:'system', unread:false },
  ]},
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { isDriver } = useAuth();
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const [filter, setFilter] = useState('all');

  const allItems = notifs.flatMap(g => g.items);
  const unreadCount = allItems.filter(i => i.unread).length;

  const markAllRead = () => {
    setNotifs(prev => prev.map(g => ({ ...g, items: g.items.map(i => ({ ...i, unread: false })) })));
  };

  const markRead = (id) => {
    setNotifs(prev => prev.map(g => ({ ...g, items: g.items.map(i => i.id === id ? { ...i, unread: false } : i) })));
  };

  const handleClick = (item) => {
    markRead(item.id);
    if (item.link) navigate(item.link);
  };

  const filteredGroups = filter === 'all' ? notifs
    : filter === 'unread' ? notifs.map(g => ({ ...g, items: g.items.filter(i => i.unread) })).filter(g => g.items.length > 0)
    : notifs.filter(g => g.group.toLowerCase().includes(filter));

  return (
    <div className="np-layout">
      <div className="np-container">
        <div className="np-header">
          <h2 className="np-title">Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}</h2>
          <button className="np-mark-all" onClick={markAllRead}>Mark all as read</button>
        </div>
        {/* Filter pills */}
        <div className="np-filters">
          {['all','unread','bookings','rides','ride requests','system'].map(f => (
            <button key={f} className={`np-filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        {filteredGroups.length === 0 && <div className="np-empty">No notifications to show</div>}
        {filteredGroups.map(group => (
          <div key={group.group} className="np-group">
            <div className="np-group-label">{group.group.toUpperCase()}</div>
            {group.items.map(item => {
              const { Icon, bg, color } = CFG[item.type] || CFG.system;
              return (
                <div key={item.id} className={`np-item ${item.unread ? 'unread' : ''} ${item.link ? 'np-clickable' : ''}`} onClick={() => handleClick(item)}>
                  {item.unread && <div className="np-unread-dot"/>}
                  <div className="np-icon-circle" style={{ background: bg }}><Icon size={18} color={color}/></div>
                  <div className="np-content">
                    <div className="np-top-row">
                      <span className={`np-item-title ${item.unread ? 'bold' : ''}`}>{item.title}</span>
                      <span className="np-time">{item.time}</span>
                    </div>
                    <span className="np-preview">{item.preview}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
