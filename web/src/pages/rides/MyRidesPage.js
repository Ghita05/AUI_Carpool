import React, { useState } from 'react';
import { Car, Calendar, Clock, DollarSign, Users, Star, Plus, Search } from 'lucide-react';
import './MyRidesPage.css';

const P_UPCOMING = [
  { id:'1', from:'AUI Main Gate', to:'Fez Airport', date:'Today', time:'14:00', cost:50, status:'upcoming', driver:'Ghita N.', initials:'GN', rating:4.8 },
  { id:'2', from:'AUI Main Gate', to:'Rabat',       date:'Feb 25', time:'09:00', cost:100, status:'upcoming', driver:'Ahmed B.', initials:'AB', rating:4.6 },
];
const P_PAST = [
  { id:'3', from:'AUI Main Gate', to:'Meknes', date:'Feb 10', time:'15:30', cost:40, status:'completed', driver:'Kenza N.', initials:'KN', rating:4.9, rated:false },
  { id:'4', from:'Casablanca', to:'AUI Main Gate', date:'Jan 28', time:'10:00', cost:120, status:'cancelled', driver:'Omar S.', initials:'OS', rating:4.2, rated:true },
];
const D_UPCOMING = [
  { id:'1', from:'AUI Main Gate', to:'Fez',   date:'Today',  time:'14:00', price:50,  status:'upcoming', passengers:3, totalSeats:4 },
  { id:'2', from:'AUI Main Gate', to:'Rabat', date:'Feb 25', time:'09:00', price:100, status:'upcoming', passengers:2, totalSeats:4 },
];
const D_PAST = [
  { id:'3', from:'AUI Main Gate', to:'Meknes', date:'Feb 10', time:'15:30', price:40, status:'completed', passengers:4, totalSeats:4 },
];

const STATUS = {
  upcoming:  { label:'Upcoming',  cls:'badge-upcoming'  },
  completed: { label:'Completed', cls:'badge-completed' },
  cancelled: { label:'Cancelled', cls:'badge-cancelled' },
};

function PassengerCard({ ride }) {
  return (
    <div className="mr-card">
      <div className="mr-card-top">
        <div className="mr-route">
          <div className="mr-dots">
            <div className="mr-dot mr-dot-g" />
            <div className="mr-line" />
            <div className="mr-dot mr-dot-r" />
          </div>
          <div>
            <div className="mr-city">{ride.from}</div>
            <div className="mr-city">{ride.to}</div>
          </div>
        </div>
        <span className={`mr-badge ${STATUS[ride.status].cls}`}>{STATUS[ride.status].label}</span>
      </div>
      <div className="mr-meta">
        <span><Calendar size={12}/>{ride.date}</span>
        <span><Clock size={12}/>{ride.time}</span>
        <span><DollarSign size={12}/>{ride.cost} MAD</span>
      </div>
      <div className="mr-bottom">
        <div className="mr-driver-chip">
          <div className="mr-mini-avatar">{ride.initials}</div>
          <span>{ride.driver}</span>
          <Star size={11} fill="#F59E0B" color="#F59E0B" style={{marginLeft:4}}/>
          <span className="mr-rating">{ride.rating}</span>
        </div>
        {ride.status === 'upcoming'
          ? <button className="mr-action-btn">View Details</button>
          : ride.status === 'completed' && !ride.rated
          ? <button className="mr-action-btn mr-action-rate"><Star size={11}/>Rate</button>
          : null}
      </div>
    </div>
  );
}

function DriverCard({ ride }) {
  return (
    <div className="mr-card">
      <div className="mr-card-top">
        <div className="mr-route">
          <div className="mr-dots">
            <div className="mr-dot mr-dot-g" />
            <div className="mr-line" />
            <div className="mr-dot mr-dot-r" />
          </div>
          <div>
            <div className="mr-city">{ride.from}</div>
            <div className="mr-city">{ride.to}</div>
          </div>
        </div>
        <span className={`mr-badge ${STATUS[ride.status].cls}`}>{STATUS[ride.status].label}</span>
      </div>
      <div className="mr-meta">
        <span><Calendar size={12}/>{ride.date}</span>
        <span><Clock size={12}/>{ride.time}</span>
        <span><DollarSign size={12}/>{ride.price} MAD</span>
      </div>
      <div className="mr-bottom">
        <div className="mr-pass-chip"><Users size={13}/>{ride.passengers}/{ride.totalSeats} booked</div>
        {ride.status === 'upcoming' && <button className="mr-action-btn">Manage</button>}
      </div>
    </div>
  );
}

export default function MyRidesPage() {
  const [role, setRole] = useState('passenger');
  const [tab,  setTab]  = useState('upcoming');

  const upcoming = role === 'passenger' ? P_UPCOMING : D_UPCOMING;
  const past      = role === 'passenger' ? P_PAST     : D_PAST;
  const data      = tab === 'upcoming'   ? upcoming   : past;

  return (
    <div className="mr-layout">
      {/* Sidebar */}
      <div className="mr-sidebar">
        <div className="mr-sidebar-header">
          <h2 className="mr-sidebar-title">My Rides</h2>
          <div className="mr-role-toggle">
            {['passenger','driver'].map(r => (
              <button
                key={r}
                className={`mr-role-btn ${role === r ? 'active' : ''}`}
                onClick={() => { setRole(r); setTab('upcoming'); }}
              >
                {r.charAt(0).toUpperCase()+r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mr-tabs">
          {['upcoming','past'].map(t => (
            <button
              key={t}
              className={`mr-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase()+t.slice(1)} ({t==='upcoming' ? upcoming.length : past.length})
            </button>
          ))}
        </div>

        <div className="mr-list">
          {data.length === 0
            ? <div className="mr-empty"><Car size={32} color="#ccc"/><span>No {tab} rides</span></div>
            : data.map(ride => role === 'passenger'
                ? <PassengerCard key={ride.id} ride={ride} />
                : <DriverCard    key={ride.id} ride={ride} />
            )
          }
        </div>

        <div className="mr-sidebar-footer">
          {role === 'passenger'
            ? <button className="mr-cta-btn"><Search size={15}/>Find a Ride</button>
            : <button className="mr-cta-btn"><Plus size={15}/>Post a Ride</button>
          }
        </div>
      </div>

      {/* Map */}
      <div className="mr-map">
        <div className="mr-map-placeholder">
          <Car size={32} color="rgba(255,255,255,0.5)"/>
          <span>Select a ride to view details</span>
        </div>
      </div>
    </div>
  );
}
