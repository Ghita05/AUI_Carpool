import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './InteractiveMap.css';

// Custom marker icons
const greenIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJjMCAyLjI1IDAgNC43NSAxMCAxMGMxMCA1LjI1IDEwIDcuNzUgMTAgMTBzLTQuNDggOC04IDE4YzAtMiAwLTQuNzUtMTAtMTBDMiAxNi43NSAyIDE0LjI1IDIgMTJjMC01LjUyIDQuNDgtMTAgMTAtMTB6IiBmaWxsPSIjMWI1ZTIwIi8+PC9zdmc+',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

const amberIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJjMCAyLjI1IDAgNC43NSAxMCAxMGMxMCA1LjI1IDEwIDcuNzUgMTAgMTBzLTQuNDggOC04IDE4YzAtMiAwLTQuNzUtMTAtMTBDMiAxNi43NSAyIDE0LjI1IDIgMTJjMC01LjUyIDQuNDgtMTAgMTAtMTB6IiBmaWxsPSIjZjU5ZTBiIi8+PC9zdmc+',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

const greyIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJjMCAyLjI1IDAgNC43NSAxMCAxMGMxMCA1LjI1IDEwIDcuNzUgMTAgMTBzLTQuNDggOC04IDE4YzAtMiAwLTQuNzUtMTAtMTBDMiAxNi43NSAyIDE0LjI1IDIgMTJjMC01LjUyIDQuNDgtMTAgMTAtMTB6IiBmaWxsPSIjZDFkNWRiIi8+PC9zdmc+',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

export default function InteractiveMap({ rides, selectedRide, onMarkerClick }) {
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
              click: () => onMarkerClick(ride)
            }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{ride.destination}</strong>
                <p>{ride.price} MAD</p>
                <small>{ride.time}</small>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
