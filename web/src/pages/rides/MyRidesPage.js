import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, DollarSign, Users, Star, Plus, Search, ChevronRight } from 'lucide-react';
import './MyRidesPage.css';

const P_UPCOMING = [
  { id:'1', from:'AUI Main Gate', to:'Fez Airport', date:'Feb 20', time:'14:00', cost:50, status:'upcoming', driver:'Ghita N.', initials:'GN', rating:4.8 },
  { id:'2', from:'AUI Main Gate', to:'Rabat', date:'Feb 25', time:'09:00', cost:100, status:'upcoming', driver:'Ahmed B.', initials:'AB', rating:3.9 },
];
const P_PAST = [
  { id:'3', from:'AUI Main Gate', to:'Meknes', date:'Feb 10', time:'15:30', cost:40, status:'completed', driver:'Kenza N.', initials:'KN', rating:5.0 },
];
const D_UPCOMING = [
  { id:'1', from:'AUI Main Gate', to:'Fez', date:'Feb 20', time:'14:00', price:50, status:'upcoming', passengers:3, totalSeats:4 },
];
const D_PAST = [
  { id:'2', from:'AUI Main Gate', to:'Meknes', date:'Feb 10', time:'15:30', price:40, status:'completed', passengers:4, totalSeats:4 },
];

function PassengerCard({ ride, onViewDetails }) {
  return (
    <div className="ride-card-mr" onClick={() => onViewDetails(ride)}>
      <div className="ride-header">
        <div>
          <div className="ride-title">{ride.from} → {ride.to}</div>
          <div className="ride-meta-row">
            <span className="meta-item"><Calendar size={13} />{ride.date}</span>
            <span className="meta-item"><Clock size={13} />{ride.time}</span>
            <span className="meta-item price"><DollarSign size={13} />{ride.cost} MAD</span>
          </div>
        </div>
        <span className={`badge badge-${ride.status}`}>{ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}</span>
      </div>
      <div className="ride-driver">
        <div className="driver-info">
          <div className="avatar sm">{ride.initials}</div>
          <div>
            <div className="driver-name">{ride.driver}</div>
            <div className="rating"><Star size={11} fill="#F59E0B" color="#F59E0B" />{ride.rating}</div>
          </div>
        </div>
        <button className="view-btn">View Details <ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function DriverCard({ ride, onManage }) {
  return (
    <div className="ride-card-mr">
      <div className="ride-header">
        <div>
          <div className="ride-title">{ride.from} → {ride.to}</div>
          <div className="ride-meta-row">
            <span className="meta-item"><Calendar size={13} />{ride.date}</span>
            <span className="meta-item"><Clock size={13} />{ride.time}</span>
            <span className="meta-item price"><DollarSign size={13} />{ride.price} MAD</span>
          </div>
        </div>
        <span className={`badge badge-${ride.status}`}>{ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}</span>
      </div>
      <div className="ride-footer">
        <span className="passengers"><Users size={13} />{ride.passengers} of {ride.totalSeats} passengers</span>
        {ride.status === 'upcoming' && <button className="manage-btn" onClick={() => onManage(ride)}>Manage</button>}
      </div>
    </div>
  );
}

export default function MyRidesPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('passenger');
  const [tab, setTab] = useState('upcoming');

  const upcoming = role === 'passenger' ? P_UPCOMING : D_UPCOMING;
  const past = role === 'passenger' ? P_PAST : D_PAST;
  const data = tab === 'upcoming' ? upcoming : past;

  const handleViewDetails = (ride) => {
    navigate(`/rides/${ride.id}`, { state: { ride } });
  };

  const handleManage = (ride) => {
    navigate(`/rides/${ride.id}`, { state: { ride, mode: 'manage' } });
  };

  return (
    <div className="my-rides-page">
      {/* Header */}
      <div className="mr-header">
        <h1>My Rides</h1>
        <div className="role-toggle">
          {['Passenger', 'Driver'].map((label, idx) => (
            <button
              key={idx}
              className={`role-btn ${role === label.toLowerCase() ? 'active' : ''}`}
              onClick={() => setRole(label.toLowerCase())}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mr-content">
        {/* Tabs */}
        <div className="mr-tabs">
          {['upcoming', 'past'].map(t => (
            <button
              key={t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Rides List */}
        <div className="rides-list">
          {data.length === 0 ? (
            <div className="empty-state">
              <Plus size={40} />
              <p>No {tab} rides</p>
            </div>
          ) : (
            data.map(ride =>
              role === 'passenger' ? (
                <PassengerCard key={ride.id} ride={ride} onViewDetails={handleViewDetails} />
              ) : (
                <DriverCard key={ride.id} ride={ride} onManage={handleManage} />
              )
            )
          )}
        </div>
      </div>

      {/* CTA Button */}
      <div className="mr-footer">
        <button
          className="primary-cta"
          onClick={() => navigate(role === 'passenger' ? '/home' : '/rides/create')}
        >
          {role === 'passenger' ? (
            <>
              <Search size={16} /> Find a Ride
            </>
          ) : (
            <>
              <Plus size={16} /> Post a Ride
            </>
          )}
        </button>
      </div>
    </div>
  );
}
