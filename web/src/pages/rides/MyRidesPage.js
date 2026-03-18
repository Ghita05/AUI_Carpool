import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './MyRidesPage.css';

/* ── Inline SVG icons ── */
const CalendarIcon = ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const ClockIcon = ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const DollarIcon = ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const UsersIcon = ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const StarIcon = ({ size = 11 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const PlusIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const SearchIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const ChevronRightIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;

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
            <span className="meta-item"><CalendarIcon />{ride.date}</span>
            <span className="meta-item"><ClockIcon />{ride.time}</span>
            <span className="meta-item price"><DollarIcon />{ride.cost} MAD</span>
          </div>
        </div>
        <span className={`badge badge-${ride.status}`}>{ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}</span>
      </div>
      <div className="ride-driver">
        <div className="driver-info">
          <div className="avatar sm">{ride.initials}</div>
          <div>
            <div className="driver-name">{ride.driver}</div>
            <div className="rating"><StarIcon />{ride.rating}</div>
          </div>
        </div>
        <button className="view-btn">View Details <ChevronRightIcon /></button>
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
            <span className="meta-item"><CalendarIcon />{ride.date}</span>
            <span className="meta-item"><ClockIcon />{ride.time}</span>
            <span className="meta-item price"><DollarIcon />{ride.price} MAD</span>
          </div>
        </div>
        <span className={`badge badge-${ride.status}`}>{ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}</span>
      </div>
      <div className="ride-footer-mr">
        <span className="passengers"><UsersIcon />{ride.passengers} of {ride.totalSeats} passengers</span>
        {ride.status === 'upcoming' && <button className="manage-btn" onClick={() => onManage(ride)}>Manage</button>}
      </div>
    </div>
  );
}

export default function MyRidesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [role, setRole] = useState(user.role);
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
      <div className="mr-header">
        <h1>My Rides</h1>
        {user.role === 'driver' && (
          <div className="role-toggle">
            {['Passenger', 'Driver'].map((label) => (
              <button
                key={label}
                className={`role-btn ${role === label.toLowerCase() ? 'active' : ''}`}
                onClick={() => setRole(label.toLowerCase())}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mr-content">
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

        <div className="rides-list">
          {data.length === 0 ? (
            <div className="empty-state">
              <PlusIcon size={40} />
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

      <div className="mr-footer">
        <button
          className="primary-cta"
          onClick={() => navigate(role === 'passenger' ? '/home' : '/rides/create')}
        >
          {role === 'passenger' ? (
            <><SearchIcon /> Find a Ride</>
          ) : (
            <><PlusIcon /> Post a Ride</>
          )}
        </button>
      </div>
    </div>
  );
}
