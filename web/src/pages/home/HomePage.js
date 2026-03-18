import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './HomePage.css';

const MOCK_RIDES = [
  { id: '1', from: 'AUI Main Gate', to: 'Fez Airport', destination: 'Fez', price: 50, time: '14:00 today', driver: 'Ghita N.', rating: 4.8, seatsTotal: 4, seatsTaken: 2, initials: 'GN', lat: 34.0181, lng: -5.0097 },
  { id: '2', from: 'AUI Main Gate', to: 'Rabat Agdal', destination: 'Rabat', price: 100, time: '17:30 today', driver: 'Ahmed B.', rating: 3.9, seatsTotal: 4, seatsTaken: 3, initials: 'AB', lat: 34.0209, lng: -6.8416 },
  { id: '3', from: 'AUI Main Gate', to: 'Meknes Centre', destination: 'Meknes', price: 40, time: '15:30 today', driver: 'Kenza N.', rating: 5.0, seatsTotal: 4, seatsTaken: 4, initials: 'KN', lat: 33.8869, lng: -5.5550 },
];
const AUI_CENTER = [33.5331, -5.1097];

const SearchIcon = ({ size = 17 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const FilterIcon = ({ size = 17 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
const TrophyIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
const XIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CalendarIcon = ({ size = 12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;

function createPinIcon(color) {
  return L.divIcon({ html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="white"/></svg>`, className: 'hp-leaflet-pin', iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -42] });
}
const greenPin = createPinIcon('#1B5E20'), amberPin = createPinIcon('#F59E0B'), greyPin = createPinIcon('#9CA3AF');
function getPinIcon(r) { const a = r.seatsTotal - r.seatsTaken; return a === 0 ? greyPin : a === 1 ? amberPin : greenPin; }

/* Community Modal */
function CommunityModal({ onClose }) {
  const stats = [{ label:'Top Driver', name:'Ghita Nafa', stat:'4.8 avg · 23 rides', initials:'GN' },{ label:'Top Passenger', name:'Ahmed Benali', stat:'4.9 avg · 15 trips', initials:'AB' },{ label:'Most Active', name:'Kenza Nouri', stat:'5.0 avg · 31 rides', initials:'KN' }];
  const routes = [{ route:'AUI → Fez', count:142, pct:100 },{ route:'AUI → Rabat', count:98, pct:69 },{ route:'AUI → Meknes', count:76, pct:54 },{ route:'AUI → Casablanca', count:45, pct:32 }];
  return (
    <div className="hp-modal-overlay" onClick={onClose}><div className="hp-community-modal" onClick={e=>e.stopPropagation()}>
      <div className="hp-filter-header"><span className="hp-filter-title">Community Leaderboard</span><button className="hp-filter-close" onClick={onClose}><XIcon size={18}/></button></div>
      <div className="hp-comm-section"><p className="hp-filter-label">TOP MEMBERS</p>{stats.map((s,i)=>(<div key={i} className="hp-comm-member"><div className="hp-comm-rank">#{i+1}</div><div className="hp-comm-avatar">{s.initials}</div><div className="hp-comm-info"><span className="hp-comm-name">{s.name}</span><span className="hp-comm-sub">{s.label} · {s.stat}</span></div></div>))}</div>
      <div className="hp-comm-section"><p className="hp-filter-label">MOST POPULAR ROUTES</p>{routes.map((r,i)=>(<div key={i} className="hp-comm-route"><span className="hp-comm-route-name">{r.route}</span><div className="hp-comm-bar-track"><div className="hp-comm-bar-fill" style={{width:`${r.pct}%`}}/></div><span className="hp-comm-route-count">{r.count} rides</span></div>))}</div>
      <div className="hp-comm-section hp-comm-totals"><div><span className="hp-comm-big">248</span><span className="hp-comm-sub">Total Users</span></div><div><span className="hp-comm-big">1,042</span><span className="hp-comm-sub">Rides Completed</span></div><div><span className="hp-comm-big">4.6</span><span className="hp-comm-sub">Avg Rating</span></div></div>
    </div></div>
  );
}

/* Filter Modal */
function FilterModal({ onClose, onApply }) {
  const [maxPrice,setMaxPrice]=useState(100),[gender,setGender]=useState('All'),[smoking,setSmoking]=useState('Any'),[destFilter,setDestFilter]=useState('Fez'),[dateFilter,setDateFilter]=useState('Today');
  return (
    <div className="hp-modal-overlay" onClick={onClose}><div className="hp-filter-modal" onClick={e=>e.stopPropagation()}>
      <div className="hp-filter-header"><span className="hp-filter-title">Filters</span><button className="hp-filter-close" onClick={onClose}><XIcon size={18}/></button></div>
      <div className="hp-filter-section"><p className="hp-filter-label">DESTINATION</p><div className="hp-filter-pills">{['Fez','Meknes','Casablanca','Rabat'].map(d=>(<button key={d} className={`hp-chip ${destFilter===d?'hp-chip-active':''}`} onClick={()=>setDestFilter(d)}>{d}</button>))}<button className="hp-chip">+ More</button></div></div>
      <div className="hp-filter-section"><p className="hp-filter-label">DATE</p><div className="hp-filter-pills">{['Today','Tomorrow'].map(d=>(<button key={d} className={`hp-chip ${dateFilter===d?'hp-chip-active':''}`} onClick={()=>setDateFilter(d)}>{d}</button>))}<button className="hp-chip hp-chip-outline"><CalendarIcon size={12}/> Pick date</button></div></div>
      <div className="hp-filter-section"><p className="hp-filter-label">MAX PRICE PER SEAT</p><div className="hp-price-row"><span className="hp-price-label">0 MAD</span><input type="range" min={0} max={200} value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="hp-slider"/><span className="hp-price-label">200 MAD</span></div><p className="hp-price-value">{maxPrice} MAD</p></div>
      <div className="hp-filter-section hp-prefs-row"><div className="hp-pref-col"><p className="hp-filter-label">GENDER</p><div className="hp-filter-pills">{['All','Women only'].map(g=>(<button key={g} className={`hp-chip ${gender===g?'hp-chip-active':''}`} onClick={()=>setGender(g)}>{g}</button>))}</div></div><div className="hp-pref-col"><p className="hp-filter-label">SMOKING</p><div className="hp-filter-pills">{['Any','Non-smoking'].map(s=>(<button key={s} className={`hp-chip ${smoking===s?'hp-chip-active':''}`} onClick={()=>setSmoking(s)}>{s}</button>))}</div></div></div>
      <button className="hp-filter-apply" onClick={()=>{onApply();onClose();}}>Show Rides</button>
      <button className="hp-filter-request">Post Ride Request</button>
    </div></div>
  );
}

/* Ride Request Modal — shown when search finds no rides */
function RideRequestModal({ destination, onClose }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return (
    <div className="hp-modal-overlay" onClick={onClose}><div className="hp-modal" onClick={e=>e.stopPropagation()} style={{textAlign:'center'}}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1B5E20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <h3 style={{margin:'12px 0 8px',fontSize:18,fontWeight:700}}>Request Submitted!</h3>
      <p style={{fontSize:13,color:'var(--color-text-secondary)',marginBottom:20}}>We'll notify you when a driver posts a ride to <strong>{destination}</strong>.</p>
      <button className="hp-modal-book" onClick={onClose}>Done</button>
    </div></div>
  );
  return (
    <div className="hp-modal-overlay" onClick={onClose}><div className="hp-modal" onClick={e=>e.stopPropagation()}>
      <button className="hp-modal-close" onClick={onClose}><XIcon size={20}/></button>
      <h3 className="hp-modal-title">No rides to "{destination}"</h3>
      <p style={{fontSize:13,color:'var(--color-text-secondary)',marginBottom:20}}>No rides are currently available to this destination. You can submit a ride request and we'll notify matching drivers.</p>
      <div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Preferred Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:'100%',height:42,border:'1px solid var(--color-border)',borderRadius:8,padding:'0 12px',fontSize:13,fontFamily:'var(--font-family)'}}/></div>
      <div style={{marginBottom:20}}><label style={{fontSize:11,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:4}}>Preferred Time</label><input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{width:'100%',height:42,border:'1px solid var(--color-border)',borderRadius:8,padding:'0 12px',fontSize:13,fontFamily:'var(--font-family)'}}/></div>
      <button className="hp-modal-book" onClick={()=>setSubmitted(true)}>Submit Ride Request</button>
    </div></div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [rideRequestDest, setRideRequestDest] = useState(null);

  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center: AUI_CENTER, zoom: 8, zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

    const auiIcon = L.divIcon({ html: '<div class="hp-aui-marker">AUI</div>', className: 'hp-aui-marker-container', iconSize: [44, 28], iconAnchor: [22, 14] });
    L.marker([33.5331, -5.1097], { icon: auiIcon }).addTo(map);

    // Markers — clicking directly navigates to ride details (no popup button needed)
    MOCK_RIDES.forEach(ride => {
      const avail = ride.seatsTotal - ride.seatsTaken;
      const statusText = avail === 0 ? 'Full' : avail === 1 ? '1 seat' : `${avail} seats`;
      const marker = L.marker([ride.lat, ride.lng], { icon: getPinIcon(ride) }).addTo(map);
      marker.bindTooltip(`${ride.destination} · ${statusText}`, { direction: 'top', offset: [0, -44] });
      marker.on('click', () => {
        navigate(`/rides/${ride.id}`, { state: { ride } });
      });
      markersRef.current.push({ marker, ride });
    });

    MOCK_RIDES.forEach(ride => {
      L.polyline([AUI_CENTER, [ride.lat, ride.lng]], { color: '#1B5E20', weight: 2, opacity: 0.3, dashArray: '8, 8' }).addTo(map);
    });

    mapInstanceRef.current = map;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim() || !mapInstanceRef.current) return;
    const match = MOCK_RIDES.find(r => r.destination.toLowerCase().includes(text.toLowerCase()) || r.to.toLowerCase().includes(text.toLowerCase()));
    if (match) mapInstanceRef.current.flyTo([match.lat, match.lng], 11, { duration: 1 });
  };

  const handleSearchSubmit = () => {
    if (!search.trim()) return;
    const match = MOCK_RIDES.find(r => r.destination.toLowerCase().includes(search.toLowerCase()));
    if (match) {
      navigate(`/rides/${match.id}`, { state: { ride: match } });
    } else {
      // No matching ride — suggest ride request
      setRideRequestDest(search.trim());
    }
  };

  return (
    <div className="hp-map-area">
      <div ref={mapRef} className="hp-leaflet-map" />
      <div className="hp-search-container">
        <div className="hp-search-bar">
          <SearchIcon size={17} />
          <input className="hp-search-input" placeholder="Where are you going?" value={search} onChange={e => handleSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()} />
          <button className="hp-search-btn" onClick={() => setShowFilter(true)} title="Open filters"><FilterIcon size={17} /></button>
        </div>
        <button className="hp-community-badge" onClick={() => setShowCommunity(true)}><TrophyIcon size={14} /><span>Community</span></button>
      </div>
      {showFilter && <FilterModal onClose={() => setShowFilter(false)} onApply={() => {}} />}
      {showCommunity && <CommunityModal onClose={() => setShowCommunity(false)} />}
      {rideRequestDest && <RideRequestModal destination={rideRequestDest} onClose={() => setRideRequestDest(null)} />}
    </div>
  );
}
