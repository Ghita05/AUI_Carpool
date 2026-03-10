import React from 'react';
import { CheckCircle, UserPlus, XCircle, Clock, Flag, Info } from 'lucide-react';
import './NotificationsPage.css';

const NOTIFS = [
  { group:'Bookings', items:[
    { id:'1', title:'Booking Confirmed', preview:'Your ride to Fez on Feb 20 is confirmed', time:'5 min ago', type:'booking_confirmed', unread:true },
    { id:'2', title:'New Booking',       preview:'Ahmed Benali booked a seat on your Rabat ride', time:'1 hr ago', type:'booking_new', unread:true },
    { id:'3', title:'Booking Cancelled', preview:'Your booking for Meknes was cancelled', time:'2 hrs ago', type:'booking_cancelled', unread:false },
  ]},
  { group:'Rides', items:[
    { id:'4', title:'Departure Reminder', preview:'Your ride to Fez departs in 1 hour', time:'3 hrs ago', type:'ride_reminder', unread:true },
    { id:'5', title:'Ride Completed',     preview:'Your trip is complete. Rate your experience!', time:'Yesterday', type:'ride_completed', unread:false },
  ]},
  { group:'System', items:[
    { id:'6', title:'Account Verified', preview:'Your AUI email has been successfully verified', time:'Feb 15', type:'system', unread:false },
  ]},
];

const CFG = {
  booking_confirmed:{ Icon:CheckCircle, bg:'var(--color-primary-bg)', color:'var(--color-primary)' },
  booking_new:      { Icon:UserPlus,    bg:'var(--color-primary-bg)', color:'var(--color-primary)' },
  booking_cancelled:{ Icon:XCircle,     bg:'var(--color-error-bg)',   color:'var(--color-error)'   },
  ride_reminder:    { Icon:Clock,       bg:'#FEF3C7',                 color:'#D97706'              },
  ride_completed:   { Icon:Flag,        bg:'var(--color-primary-bg)', color:'var(--color-primary)' },
  system:           { Icon:Info,        bg:'var(--color-background)', color:'var(--color-text-secondary)' },
};

export default function NotificationsPage() {
  const total = NOTIFS.flatMap(g=>g.items).filter(i=>i.unread).length;
  return (
    <div className="np-layout">
      <div className="np-container">
        <div className="np-header">
          <h2 className="np-title">Notifications {total>0 ? `(${total})` : ''}</h2>
          <button className="np-mark-all">Mark all as read</button>
        </div>
        {NOTIFS.map(group => (
          <div key={group.group} className="np-group">
            <div className="np-group-label">{group.group.toUpperCase()}</div>
            {group.items.map(item => {
              const { Icon, bg, color } = CFG[item.type] || CFG.system;
              return (
                <div key={item.id} className={`np-item ${item.unread ? 'unread' : ''}`}>
                  {item.unread && <div className="np-unread-dot"/>}
                  <div className="np-icon-circle" style={{ background: bg }}>
                    <Icon size={18} color={color}/>
                  </div>
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
