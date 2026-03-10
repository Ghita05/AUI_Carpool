import React, { useState } from 'react';
import {
  Car, MapPin, Search,
  SlidersHorizontal, Calendar, DollarSign,
  Users, User, Trophy, Filter
} from 'lucide-react';
import './HomePage.css';

const MOCK_RIDES = [
  { id: '1', destination: 'Fez',    price: 50,  time: '14:00 today', driver: 'Ghita N.',  rating: 4.8, seatsTotal: 4, seatsTaken: 2 },
  { id: '2', destination: 'Rabat',  price: 100, time: '17:30 today', driver: 'Ahmed B.',  rating: 5.5, seatsTotal: 4, seatsTaken: 3 },
  { id: '3', destination: 'Meknes', price: 40,  time: '15:30 today', driver: 'Kenza N.',  rating: 8.5, seatsTotal: 4, seatsTaken: 4 },
];

function PersonSeats({ total, taken }) {
  return (
    <div className="seat-persons">
      {Array.from({ length: total }).map((_, i) => (
        <User
          key={i}
          size={13}
          color={i < taken ? 'var(--color-primary)' : 'var(--color-border)'}
          fill={i < taken ? 'var(--color-primary)' : 'none'}
        />
      ))}
    </div>
  );
}

function RideCard({ ride }) {
  const available = ride.seatsTotal - ride.seatsTaken;
  const isFull = available === 0;
  const isAlmostFull = available === 1;
  const initials = ride.driver.split(' ').map(n => n[0]).join('');

  return (
    <div className="ride-card">
      <div className="ride-card-top">
        <div className="ride-dest-row">
          <MapPin size={13} color={isFull ? 'var(--color-text-secondary)' : isAlmostFull ? 'var(--color-accent)' : 'var(--color-primary)'} fill={isFull ? 'var(--color-text-secondary)' : isAlmostFull ? 'var(--color-accent)' : 'var(--color-primary)'} />
          <span className="ride-dest">{ride.destination}</span>
        </div>
        <span className="ride-price">{ride.price} MAD</span>
      </div>

      <div className="ride-card-mid">
        <span className="ride-meta-item">
          <Clock size={11} />
          {ride.time}
        </span>
      </div>

      <div className="ride-driver-row">
        <div className="ride-driver-avatar">{initials}</div>
        <span className="ride-driver-name">{ride.driver}</span>
        <div className="ride-rating">
          <Star size={11} fill="#F59E0B" color="#F59E0B" />
          <span>{ride.rating}</span>
        </div>
      </div>

      <PersonSeats total={ride.seatsTotal} taken={ride.seatsTaken} />
    </div>
  );
}

function FilterModal({ onClose }) {
  const [maxPrice, setMaxPrice] = useState(100);
  const [gender, setGender] = useState('All');
  const [smoking, setSmoking] = useState('Any');
  const [destFilter, setDestFilter] = useState('Fez');
  const [dateFilter, setDateFilter] = useState('Today');

  return (
    <div className="filter-overlay" onClick={onClose}>
      <div className="filter-modal" onClick={e => e.stopPropagation()}>
        <div className="filter-header">
          <span className="filter-title">Filters</span>
          <button className="filter-close" onClick={onClose}>✕</button>
        </div>

        <div className="filter-section">
          <p className="filter-label">DESTINATION</p>
          <div className="filter-pills-row">
            {['Fez', 'Meknes', 'Casablanca', 'Rabat'].map(d => (
              <button key={d} className={`filter-chip ${destFilter === d ? 'filter-chip-active' : ''}`} onClick={() => setDestFilter(d)}>{d}</button>
            ))}
            <button className="filter-chip">+ More</button>
          </div>
        </div>

        <div className="filter-section">
          <p className="filter-label">DATE</p>
          <div className="filter-pills-row">
            {['Today', 'Tomorrow'].map(d => (
              <button key={d} className={`filter-chip ${dateFilter === d ? 'filter-chip-active' : ''}`} onClick={() => setDateFilter(d)}>{d}</button>
            ))}
            <button className="filter-chip filter-chip-outline">
              <Calendar size={12} style={{ marginRight: 4 }} />Pick date
            </button>
          </div>
        </div>

        <div className="filter-section">
          <p className="filter-label">MAX PRICE PER SEAT</p>
          <div className="filter-price-row">
            <span className="filter-price-label">0 MAD</span>
            <input type="range" min={0} max={200} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="filter-slider" />
            <span className="filter-price-label">200 MAD</span>
          </div>
          <p className="filter-price-value">{maxPrice} MAD</p>
        </div>

        <div className="filter-section filter-prefs-row">
          <div className="filter-pref-col">
            <p className="filter-label">GENDER</p>
            <div className="filter-pills-row">
              {['All', 'Women only'].map(g => (
                <button key={g} className={`filter-chip ${gender === g ? 'filter-chip-active' : ''}`} onClick={() => setGender(g)}>{g}</button>
              ))}
            </div>
          </div>
          <div className="filter-pref-col">
            <p className="filter-label">SMOKING</p>
            <div className="filter-pills-row">
              {['Any', 'Non-smoking'].map(s => (
                <button key={s} className={`filter-chip ${smoking === s ? 'filter-chip-active' : ''}`} onClick={() => setSmoking(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        <button className="filter-apply-btn">Show 4 Rides</button>
        <button className="filter-request-btn">Post Ride Request</button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  return (
    <div className="home-layout">
      {/* ── Map area (full content area) ── */}
      <main className="map-area">
        {/* Satellite map background */}
        <div className="map-bg" />

        {/* Floating search bar */}
        <div className="map-search-bar">
          <SlidersHorizontal size={17} color="var(--color-text-secondary)" />
          <input
            className="map-search-input"
            placeholder="Where are you going?"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="map-search-icon-btn" onClick={() => setShowFilter(true)}>
            <Search size={17} color="var(--color-text-secondary)" />
          </button>
        </div>

        {/* Map pins */}
        <div className="map-pin pin-green" style={{ top: '28%', left: '30%' }}>
          <MapPin size={13} style={{ marginRight: 5 }} />Fez · 3 seats
        </div>
        <div className="map-pin pin-amber" style={{ top: '42%', right: '28%' }}>
          <MapPin size={13} style={{ marginRight: 5 }} />Rabat · 1 seat
        </div>
        <div className="map-pin pin-grey" style={{ bottom: '32%', left: '45%' }}>
          <MapPin size={13} style={{ marginRight: 5 }} />Meknes · Full
        </div>

        {/* Community badge */}
        <button className="community-badge">
          <Trophy size={14} color="var(--color-primary)" />
          <span>Community</span>
        </button>

        {/* Filter modal */}
        {showFilter && <FilterModal onClose={() => setShowFilter(false)} />}
      </main>
    </div>
  );
}
