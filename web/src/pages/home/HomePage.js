import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, Star, Trophy } from 'lucide-react';
import InteractiveMap from '../../components/common/InteractiveMap';
import './HomePage.css';

const RIDES = [
  {
    id: '1',
    from: 'AUI Main Gate',
    to: 'Fez Airport',
    destination: 'Fez',
    time: '14:00',
    price: 50,
    driver: 'Ghita N.',
    initials: 'GN',
    rating: 4.8,
    seats: 2,
    totalSeats: 4
  },
  {
    id: '2',
    from: 'AUI Main Gate',
    to: 'Rabat',
    destination: 'Rabat',
    time: '17:30',
    price: 100,
    driver: 'Ahmed B.',
    initials: 'AB',
    rating: 3.9,
    seats: 1,
    totalSeats: 4
  },
  {
    id: '3',
    from: 'AUI Main Gate',
    to: 'Meknes',
    destination: 'Meknes',
    time: '15:30',
    price: 40,
    driver: 'Kenza N.',
    initials: 'KN',
    rating: 5.0,
    seats: 0,
    totalSeats: 4
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedRide, setSelectedRide] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [searchText, setSearchText] = useState('');

  return (
    <div className="home-content">
      {/* Map Panel - Full Width */}
      <div className="map-panel">
        <InteractiveMap
          rides={RIDES}
          selectedRide={selectedRide}
          onMarkerClick={setSelectedRide}
        />

        {/* Search Bar */}
        <div className="search-bar-container">
          <div className="search-bar">
            <Filter size={16} />
            <input
              type="text"
              placeholder="Where are you going?"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            <button onClick={() => setShowFilter(true)}><Search size={16} /></button>
          </div>
          <button className="community-badge"><Trophy size={14} /> Community</button>
        </div>

        {/* Ride Details Card */}
        {selectedRide && (
          <div className="details-box">
            <button className="close-btn" onClick={() => setSelectedRide(null)}>
              <X size={18} />
            </button>
            <h2 className="box-title">{selectedRide.destination}</h2>
            <div className="box-details">
              <div className="detail-row">
                <span>Route:</span>
                <span>{selectedRide.from} → {selectedRide.to}</span>
              </div>
              <div className="detail-row">
                <span>Price:</span>
                <span>{selectedRide.price} MAD</span>
              </div>
              <div className="detail-row">
                <span>Time:</span>
                <span>{selectedRide.time}</span>
              </div>
              <div className="detail-row">
                <span>Driver:</span>
                <span>{selectedRide.driver}</span>
              </div>
              <div className="detail-row">
                <span>Rating:</span>
                <span><Star size={11} fill="#F59E0B" /> {selectedRide.rating}</span>
              </div>
            </div>
            <button
              className="box-btn"
              onClick={() => navigate(/rides/)}
            >
              Book Now
            </button>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilter && (
        <div className="filter-overlay" onClick={() => setShowFilter(false)}>
          <div className="filter-box" onClick={e => e.stopPropagation()}>
            <div className="filter-top">
              <h3>Filters</h3>
              <button onClick={() => setShowFilter(false)}><X size={20} /></button>
            </div>
            <div className="filter-body">
              <div className="filter-group">
                <label>DESTINATION</label>
                <div className="chip-list">
                  <button className="chip active">Fez</button>
                  <button className="chip">Meknes</button>
                  <button className="chip">Casablanca</button>
                  <button className="chip">Rabat</button>
                </div>
              </div>
              <div className="filter-group">
                <label>DATE</label>
                <div className="chip-list">
                  <button className="chip active">Today</button>
                  <button className="chip">Tomorrow</button>
                </div>
              </div>
            </div>
            <button className="filter-apply" onClick={() => setShowFilter(false)}>
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}