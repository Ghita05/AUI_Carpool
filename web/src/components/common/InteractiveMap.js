import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './InteractiveMap.css';

// CUSTOM LARGER MARKER ICONS
const createIcon = (color) => new L.Icon({
  iconUrl: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTIiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA1MiA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjYgMEMxMS42IDAgMCAxMS42IDAgMjZjMCAyLjYgMCA1LjIgMTMgMTMuM0MyNiAzOSAyNiA0MiAyNiA1MHMtMTEuNiAxNCAyNiAxNGMyNi01LjYgMjYtOSAyNi0xNHMwLTUuMi0xMy0xMy4zQzI2IDM5IDI2IDM2IDI2IDI2YzAtMTQuNCAyNi0yNiAyNi0yNkMzOC40IDAgMjYgMCAyNiAweiIgZmlsbD0iJHtjb2xvcn0iIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==`,
  iconSize: [52, 64],
  iconAnchor: [26, 64],
  popupAnchor: [0, -64],
  className: 'map-marker-icon'
});

const greenIcon = createIcon('%231b5e20');
const amberIcon = createIcon('%23f59e0b');
const greyIcon = createIcon('%23d1d5db');

export default function InteractiveMap({ rides, selectedRide, onMarkerClick }) {
  const navigate = useNavigate();
  
  // Center map on middle of Morocco
  const center = [33.5731, -5.0898];
  const zoomLevel = 7;

  // Ride coordinates (approximate Morocco locations)
  const rideCoordinates = {
    'Fez': [34.0181, -5.0097],
    'Rabat': [34.0209, -6.8416],
    'Meknes': [33.8869, -5.5550]
  };

  const getMarkerIcon = (idx) => {
    if (selectedRide?.destination === rides[idx].destination) return greenIcon;
    if (idx === 0) return greenIcon;
    if (idx === 1) return amberIcon;
    return greyIcon;
  };

  const handleMarkerClick = (ride) => {
    onMarkerClick(ride);
  };

  const handleViewDetails = (ride) => {
    navigate(`/rides/${ride.destination.toLowerCase()}`);
  };

  return (
    <MapContainer center={center} zoom={zoomLevel} className="interactive-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {rides.map((ride, idx) => {
        const coords = rideCoordinates[ride.destination] || center;
        return (
          <Marker
            key={ride.id}
            position={coords}
            icon={getMarkerIcon(idx)}
            eventHandlers={{
              click: () => handleMarkerClick(ride)
            }}
          >
            <Popup closeButton={true} autoClose={false}>
              <div className="map-popup">
                <div className="popup-header">
                  <strong className="popup-destination">{ride.destination}</strong>
                  <span className="popup-price">{ride.price} MAD</span>
                </div>
                <div className="popup-details">
                  <p className="popup-time">📍 {ride.time}</p>
                  <p className="popup-driver">👤 {ride.driver}</p>
                </div>
                <button 
                  className="popup-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(ride);
                  }}
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
