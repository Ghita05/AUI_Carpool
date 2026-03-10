import React, { useState } from 'react';
import { MapPin, Clock, Ruler, Timer, Star, Ban, Gauge, Car, Users, ChevronLeft, Share2, MessageSquare, Map } from 'lucide-react';
import './RideDetailsPage.css';

const RIDE = {
  departure: 'AUI Main Gate', destination: 'Fez Airport',
  departureTime: '14:00', date: 'Today, Feb 20',
  distance: '65 km', duration: '~55 min',
  driver: { name: 'Ghita Nafa', initials: 'GN', rating: 4.8, rides: 23 },
  vehicle: { brand: 'Dacia', model: 'Logan', color: 'White', plate: '12345-AB-67', size: 'Medium', luggage: 3 },
  totalSeats: 4, availableSeats: 2, price: 50,
  smoking: false, drivingStyle: 'Calm driver', genderPref: 'All',
  stops: ['Ifrane Marché', 'Hay Riad'],
};

export default function RideDetailsPage({ onBack, onBook }) {
  return (
    <div className="rd-layout">
      {/* Left Panel */}
      <div className="rd-panel">
        {/* Header */}
        <div className="rd-header">
          <button className="rd-back-btn" onClick={onBack}>
            <ChevronLeft size={18} />
            <span>Back</span>
          </button>
          <h2 className="rd-title">Ride Details</h2>
          <button className="rd-icon-btn"><Share2 size={16} /></button>
        </div>

        <div className="rd-scroll">
          {/* Route Card */}
          <div className="rd-card">
            <div className="rd-route-row">
              <div className="rd-route-dots">
                <div className="rd-dot rd-dot-green" />
                <div className="rd-dashed" />
                <div className="rd-dot rd-dot-red" />
              </div>
              <div className="rd-route-labels">
                <span className="rd-route-stop">{RIDE.departure}</span>
                <span className="rd-route-stop">{RIDE.destination}</span>
              </div>
            </div>
            <div className="rd-divider" />
            <div className="rd-stats-row">
              {[
                { icon: <Clock size={14} />, val: RIDE.departureTime, label: 'Departure' },
                { icon: <Ruler size={14} />, val: RIDE.distance, label: 'Distance' },
                { icon: <Timer size={14} />, val: RIDE.duration, label: 'Est. time' },
              ].map((s, i) => (
                <div key={i} className="rd-stat">
                  {s.icon}
                  <span className="rd-stat-val">{s.val}</span>
                  <span className="rd-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Driver Card */}
          <div className="rd-card">
            <div className="rd-driver-row">
              <div className="rd-avatar">{RIDE.driver.initials}</div>
              <div className="rd-driver-info">
                <span className="rd-driver-name">{RIDE.driver.name}</span>
                <div className="rd-rating">
                  <Star size={12} fill="#F59E0B" color="#F59E0B" />
                  <span>{RIDE.driver.rating} · {RIDE.driver.rides} rides</span>
                </div>
              </div>
            </div>
            <div className="rd-tags">
              <span className="rd-tag rd-tag-green"><Ban size={11} />Non-smoking</span>
              <span className="rd-tag rd-tag-gray"><Gauge size={11} />{RIDE.drivingStyle}</span>
            </div>
          </div>

          {/* Vehicle Card */}
          <div className="rd-card rd-vehicle-row">
            <Car size={18} color="var(--color-text-secondary)" />
            <div className="rd-vehicle-info">
              <span className="rd-vehicle-main">{RIDE.vehicle.brand} {RIDE.vehicle.model} · {RIDE.vehicle.color}</span>
              <span className="rd-vehicle-sub">{RIDE.vehicle.size} · {RIDE.vehicle.luggage} luggage spots</span>
            </div>
            <span className="rd-plate">{RIDE.vehicle.plate}</span>
          </div>

          {/* Seats Card */}
          <div className="rd-card">
            <div className="rd-row-between">
              <span className="rd-card-label">Available Seats</span>
              <span className="rd-seats-count">{RIDE.availableSeats} of {RIDE.totalSeats} remaining</span>
            </div>
            <div className="rd-seat-icons">
              {Array.from({ length: RIDE.totalSeats }).map((_, i) => (
                <span key={i} className={`rd-seat-icon ${i < RIDE.totalSeats - RIDE.availableSeats ? 'rd-seat-taken' : ''}`}>
                  <Users size={18} />
                </span>
              ))}
            </div>
            <span className="rd-price-note">{RIDE.price} MAD per seat</span>
          </div>

          {/* Stops Card */}
          <div className="rd-card">
            <div className="rd-row-between" style={{ marginBottom: 4 }}>
              <span className="rd-card-label">Route & Stops</span>
              <span className="rd-seats-count">{RIDE.stops.length} stops</span>
            </div>
            <p className="rd-stops-hint">You can request a stop when booking</p>
            <div className="rd-stops-list">
              {[RIDE.departure, ...RIDE.stops, RIDE.destination].map((stop, i, arr) => (
                <div key={stop} className="rd-stop-item">
                  <div className={`rd-stop-dot ${i === 0 || i === arr.length - 1 ? 'rd-stop-dot-active' : ''}`} />
                  <span className={`rd-stop-label ${i === 0 || i === arr.length - 1 ? 'rd-stop-label-bold' : ''}`}>{stop}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="rd-actions">
          <button className="rd-msg-btn"><MessageSquare size={15} />Message Driver</button>
          <button className="rd-book-btn" onClick={onBook}>Book Now · {RIDE.price} MAD</button>
        </div>
      </div>

      {/* Map Panel */}
      <div className="rd-map">
        <div className="rd-map-placeholder">
          <Map size={32} color="rgba(255,255,255,0.6)" />
          <span>Route Map</span>
          <span className="rd-map-sub">{RIDE.departure} → {RIDE.destination}</span>
        </div>
      </div>
    </div>
  );
}
