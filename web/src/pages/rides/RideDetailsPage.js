import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RideDetailsPage.css';

/* ── SVG icons ── */
const ChevronLeftIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ShareIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const ClockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const RulerIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>;
const TimerIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="12" y2="8"/><circle cx="12" cy="14" r="8"/></svg>;
const StarIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const BanIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const GaugeIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>;
const CarIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
const UsersIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const MessageIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const XIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CopyIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

const COORDS = { 'Fez Airport':[34.0181,-5.0097], 'Fez':[34.0181,-5.0097], 'Rabat Agdal':[34.0209,-6.8416], 'Rabat':[34.0209,-6.8416], 'Meknes Centre':[33.8869,-5.5550], 'Meknes':[33.8869,-5.5550] };
const AUI = [33.5331, -5.1097];

const FALLBACK_RIDE = {
  departure:'AUI Main Gate', destination:'Fez Airport', departureTime:'14:00', date:'Today, Feb 20',
  distance:'65 km', duration:'~55 min',
  driver:{ name:'Ghita Nafa', initials:'GN', rating:4.8, rides:23 },
  vehicle:{ brand:'Dacia', model:'Logan', color:'White', plate:'12345-AB-67', size:'Medium', luggage:3 },
  totalSeats:4, availableSeats:2, price:50, smoking:false, drivingStyle:'Calm driver',
  stops:['Ifrane Marché','Ifrane DT'],
  passengers:[
    { name:'Ahmed Benali', initials:'AB', seat:1 },
    { name:'Sara Mansour', initials:'SM', seat:2 },
  ],
};

/* ── Share Modal ── */
function ShareModal({ ride, onClose }) {
  const [copied, setCopied] = useState(false);
  const link = `https://aui-carpool.app/rides/share/${ride?.departure?.replace(/\s/g,'-')}`;
  const handleCopy = () => { navigator.clipboard.writeText(link).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div className="rd-overlay" onClick={onClose}>
      <div className="rd-share-modal" onClick={e=>e.stopPropagation()}>
        <div className="rd-share-header"><span className="rd-share-title">Share this ride</span><button className="rd-share-close" onClick={onClose}><XIcon/></button></div>
        <p className="rd-share-sub">Share this ride with friends via link</p>
        <div className="rd-share-link-row">
          <input className="rd-share-input" value={link} readOnly />
          <button className="rd-share-copy" onClick={handleCopy}>{copied ? <><CheckIcon/> Copied</> : <><CopyIcon/> Copy</>}</button>
        </div>
        <div className="rd-share-btns">
          <button className="rd-share-btn" onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(link)}`)}>WhatsApp</button>
          <button className="rd-share-btn" onClick={()=>window.open(`mailto:?subject=Check this ride&body=${encodeURIComponent(link)}`)}>Email</button>
        </div>
      </div>
    </div>
  );
}

/* ── Manage Passengers Modal (driver only) ── */
function ManageModal({ ride, onClose }) {
  const passengers = ride.passengers || FALLBACK_RIDE.passengers;
  return (
    <div className="rd-overlay" onClick={onClose}>
      <div className="rd-manage-modal" onClick={e=>e.stopPropagation()}>
        <div className="rd-share-header"><span className="rd-share-title">Manage Passengers</span><button className="rd-share-close" onClick={onClose}><XIcon/></button></div>
        <p className="rd-share-sub">{passengers.length} of {ride.totalSeats} seats booked</p>
        <div className="rd-manage-list">
          {passengers.map((p,i)=>(
            <div key={i} className="rd-manage-item">
              <div className="rd-manage-avatar">{p.initials}</div>
              <div className="rd-manage-info"><span className="rd-manage-name">{p.name}</span><span className="rd-manage-seat">Seat {p.seat}</span></div>
              <button className="rd-manage-remove">Remove</button>
            </div>
          ))}
          {passengers.length === 0 && <p style={{textAlign:'center',color:'var(--color-text-secondary)',padding:20}}>No passengers yet</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Manage Ride Modal (driver only) ── */
function ManageRideModal({ ride, onClose }) {
  const [from, setFrom] = useState(ride.departure);
  const [to, setTo] = useState(ride.destination);
  const [time, setTime] = useState(ride.departureTime);
  const [price, setPrice] = useState(ride.price);
  const [seats, setSeats] = useState(ride.totalSeats);
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 1500); };
  return (
    <div className="rd-overlay" onClick={onClose}>
      <div className="rd-manage-modal" onClick={e=>e.stopPropagation()}>
        <div className="rd-share-header"><span className="rd-share-title">Manage Ride</span><button className="rd-share-close" onClick={onClose}><XIcon/></button></div>
        {saved ? <div style={{textAlign:'center',padding:'32px 0'}}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1B5E20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><p style={{fontSize:15,fontWeight:700,color:'var(--color-text-primary)',marginTop:12}}>Ride Updated!</p></div> : <>
          <div className="rd-mng-field"><label className="rd-mng-label">Departure</label><input className="rd-mng-input" value={from} onChange={e=>setFrom(e.target.value)}/></div>
          <div className="rd-mng-field"><label className="rd-mng-label">Destination</label><input className="rd-mng-input" value={to} onChange={e=>setTo(e.target.value)}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="rd-mng-field"><label className="rd-mng-label">Departure Time</label><input className="rd-mng-input" type="time" value={time} onChange={e=>setTime(e.target.value)}/></div>
            <div className="rd-mng-field"><label className="rd-mng-label">Price (MAD)</label><input className="rd-mng-input" type="number" value={price} onChange={e=>setPrice(e.target.value)}/></div>
          </div>
          <div className="rd-mng-field"><label className="rd-mng-label">Total Seats</label>
            <div style={{display:'flex',alignItems:'center',gap:12}}><button className="rd-mng-step" onClick={()=>seats>1&&setSeats(s=>s-1)}>−</button><span style={{fontSize:18,fontWeight:700,minWidth:24,textAlign:'center'}}>{seats}</span><button className="rd-mng-step" onClick={()=>setSeats(s=>s+1)}>+</button></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:16}}>
            <button style={{flex:1,padding:12,border:'1.5px solid var(--color-error)',borderRadius:8,background:'none',color:'var(--color-error)',fontWeight:600,cursor:'pointer',fontFamily:'var(--font-family)',fontSize:13}}>Cancel Ride</button>
            <button style={{flex:1,padding:12,background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:8,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-family)',fontSize:13}} onClick={handleSave}>Save Changes</button>
          </div>
        </>}
      </div>
    </div>
  );
}

/* ── Booking Modal (passenger) ── */
function BookingModal({ ride, onClose, onConfirm }) {
  const [seats, setSeats] = useState(1);
  const [luggage, setLuggage] = useState('1 suitcase');
  const [stopRequest, setStopRequest] = useState('');
  const total = seats * ride.price;
  return (
    <div className="rd-overlay" onClick={onClose}><div className="rd-booking-modal" onClick={e=>e.stopPropagation()}>
      <div className="rd-share-header"><span className="rd-share-title">Book a Ride</span><button className="rd-share-close" onClick={onClose}><XIcon/></button></div>
      {/* Ride summary */}
      <div className="rd-book-summary">
        <div className="rd-book-route">{ride.departure} → {ride.destination}</div>
        <div className="rd-book-meta-row">
          <div className="rd-book-meta"><span className="rd-book-meta-label">Departure</span><span className="rd-book-meta-val">{ride.departureTime}</span></div>
          <div className="rd-book-meta"><span className="rd-book-meta-label">Driver</span><span className="rd-book-meta-val">{ride.driver.name}</span></div>
          <div className="rd-book-meta"><span className="rd-book-meta-label">Vehicle</span><span className="rd-book-meta-val">{ride.vehicle.brand} {ride.vehicle.model}</span></div>
        </div>
      </div>
      {/* Seats */}
      <div className="rd-book-section">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span className="rd-book-label">Number of Seats</span><span style={{fontSize:12,color:'var(--color-text-secondary)'}}>{ride.availableSeats} available</span></div>
        <div className="rd-book-stepper"><button className="rd-book-step" onClick={()=>seats>1&&setSeats(s=>s-1)}>−</button><span className="rd-book-step-val">{seats}</span><button className="rd-book-step" onClick={()=>seats<ride.availableSeats&&setSeats(s=>s+1)}>+</button></div>
      </div>
      {/* Stop suggestions */}
      <div className="rd-book-section">
        <span className="rd-book-label">Stop Suggestions</span>
        <div className="rd-book-stops-pills">
          {ride.stops.map((s,i)=><span key={i} className="rd-book-stop-pill">{s}</span>)}
        </div>
        <input className="rd-book-input" placeholder="+ Suggest a stop" value={stopRequest} onChange={e=>setStopRequest(e.target.value)}/>
      </div>
      {/* Luggage */}
      <div className="rd-book-section">
        <span className="rd-book-label">Luggage Declaration</span>
        <div className="rd-book-luggage-pills">
          {['No luggage','1 small bag','1 suitcase','Other'].map(l=>(
            <button key={l} className={`rd-book-lug-pill ${luggage===l?'active':''}`} onClick={()=>setLuggage(l)}>{l}</button>
          ))}
        </div>
        <p style={{fontSize:11,color:'var(--color-text-secondary)',margin:'6px 0 0'}}>Drivers need to plan space in advance</p>
      </div>
      {/* Summary */}
      <div className="rd-book-total">
        <div className="rd-book-total-row"><span>{seats} seat{seats>1?'s':''}</span><span>{total} MAD</span></div>
        <div className="rd-book-total-row rd-book-total-final"><span>Total</span><span>{total} MAD</span></div>
      </div>
      <button className="rd-book-confirm-btn" onClick={()=>onConfirm({seats,luggage,stopRequest,total})}>Confirm Booking</button>
      <p style={{fontSize:11,color:'var(--color-text-secondary)',textAlign:'center',margin:'8px 0 0'}}>You won't be charged until the driver confirms</p>
    </div></div>
  );
}

/* ── Booking Confirmation ── */
function BookingConfirmation({ ride, booking, onClose, onGoToRides }) {
  return (
    <div className="rd-overlay" onClick={onClose}><div className="rd-confirm-modal" onClick={e=>e.stopPropagation()}>
      <div className="rd-confirm-banner">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1B5E20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <h3>You're all set!</h3>
        <p>Booking #4001 confirmed</p>
      </div>
      <div className="rd-confirm-details">
        <p className="rd-confirm-section-label">RIDE DETAILS</p>
        <div className="rd-confirm-row"><span>{ride.departure} → {ride.destination}</span></div>
        <div className="rd-confirm-row"><span>Date: {ride.date}</span><span>Departure: {ride.departureTime}</span></div>
        <div className="rd-confirm-row"><span>Driver: {ride.driver.name}</span><span>Vehicle: {ride.vehicle.brand} {ride.vehicle.model}</span></div>
        <div className="rd-confirm-row"><span>Luggage: {booking.luggage}</span></div>
        <div className="rd-confirm-total">Total To Be Paid: <strong>{booking.total} MAD</strong></div>
      </div>
      <div className="rd-confirm-next">
        <p className="rd-confirm-section-label">What's Next?</p>
        <div className="rd-confirm-steps">
          <div className="rd-confirm-step"><span className="rd-confirm-num">1</span><div><strong>Driver confirms your booking</strong><span>Usually within a few hours</span></div></div>
          <div className="rd-confirm-step"><span className="rd-confirm-num">2</span><div><strong>You'll receive a notification</strong><span>Check your alerts tab</span></div></div>
          <div className="rd-confirm-step"><span className="rd-confirm-num">3</span><div><strong>Meet at departure time</strong><span>{ride.departure}</span></div></div>
        </div>
      </div>
      <button className="rd-book-confirm-btn" onClick={onGoToRides}>Back to My Rides</button>
    </div></div>
  );
}

/* ── Driver Profile Modal (passenger view) ── */
function DriverProfileModal({ driver, onClose }) {
  const reviews = [
    { name: 'Ahmed B.', initials: 'AB', rating: 5, text: 'Great driver, very punctual.', date: 'Feb 18', route: 'AUI → Fez' },
    { name: 'Kenza N.', initials: 'KN', rating: 5, text: 'Comfortable ride, highly recommend!', date: 'Feb 01', route: 'AUI → Fez' },
    { name: 'Salma M.', initials: 'SM', rating: 3, text: 'Late departure :(', date: 'Jan 10', route: 'AUI → Rabat' },
  ];
  const StarFill = ({ filled }) => <svg width="12" height="12" viewBox="0 0 24 24" fill={filled?'#F59E0B':'#ddd'} stroke={filled?'#F59E0B':'#ddd'} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
  return (
    <div className="rd-overlay" onClick={onClose}>
      <div className="rd-profile-modal" onClick={e=>e.stopPropagation()}>
        <div className="rd-share-header"><span className="rd-share-title">Driver Profile</span><button className="rd-share-close" onClick={onClose}><XIcon/></button></div>
        {/* Profile header */}
        <div className="rd-prof-header">
          <div className="rd-prof-avatar">{driver.initials}</div>
          <div className="rd-prof-info">
            <span className="rd-prof-name">{driver.name}</span>
            <span className="rd-prof-role">Student · Driver</span>
          </div>
        </div>
        {/* Stats row */}
        <div className="rd-prof-stats">
          <div className="rd-prof-stat"><span className="rd-prof-big">{driver.rides}</span><span className="rd-prof-label">Rides</span></div>
          <div className="rd-prof-stat"><span className="rd-prof-big">{driver.rating}</span><span className="rd-prof-label">Rating</span></div>
          <div className="rd-prof-stat"><span className="rd-prof-big">0</span><span className="rd-prof-label">Cancellations</span></div>
        </div>
        {/* Preferences */}
        <div className="rd-prof-section">
          <p className="rd-prof-section-title">Travel Preferences</p>
          <div className="rd-tags" style={{marginTop:4}}>
            <span className="rd-tag rd-tag-green"><BanIcon/> Non-smoker</span>
            <span className="rd-tag rd-tag-gray"><GaugeIcon/> Calm driver</span>
          </div>
        </div>
        {/* Reviews */}
        <div className="rd-prof-section">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <p className="rd-prof-section-title">Reviews ({reviews.length})</p>
          </div>
          <div className="rd-prof-reviews">
            {reviews.map((r,i)=>(
              <div key={i} className="rd-prof-review">
                <div className="rd-prof-review-top">
                  <div className="rd-manage-avatar">{r.initials}</div>
                  <div style={{flex:1}}>
                    <span className="rd-manage-name">{r.name}</span>
                    <div style={{display:'flex',gap:2,marginTop:2}}>{[1,2,3,4,5].map(s=><StarFill key={s} filled={s<=r.rating}/>)}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span style={{fontSize:11,color:'var(--color-text-secondary)'}}>{r.date}</span>
                    <span className="rd-prof-route-tag">{r.route}</span>
                  </div>
                </div>
                <p className="rd-prof-review-text">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Route Map (Leaflet) ── */
function RouteMap({ departure, destination }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    if (!mapRef.current) return;

    const destCoords = COORDS[destination] || COORDS['Fez'];
    const map = L.map(mapRef.current, { center: [(AUI[0]+destCoords[0])/2,(AUI[1]+destCoords[1])/2], zoom: 9, zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

    // Start pin (green)
    const startIcon = L.divIcon({ html:'<div style="background:#1B5E20;color:#fff;font-size:10px;font-weight:700;padding:4px 8px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,.25);white-space:nowrap;font-family:Plus Jakarta Sans,sans-serif;">Start</div>', className:'', iconSize:[48,24], iconAnchor:[24,12] });
    L.marker(AUI, { icon: startIcon }).addTo(map).bindPopup(`<strong>${departure}</strong>`);

    // End pin (red)
    const endIcon = L.divIcon({ html:`<div style="background:#EF4444;color:#fff;font-size:10px;font-weight:700;padding:4px 8px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,.25);white-space:nowrap;font-family:Plus Jakarta Sans,sans-serif;">${destination}</div>`, className:'', iconSize:[60,24], iconAnchor:[30,12] });
    L.marker(destCoords, { icon: endIcon }).addTo(map).bindPopup(`<strong>${destination}</strong>`);

    // Route line
    L.polyline([AUI, destCoords], { color: '#1B5E20', weight: 4, opacity: 0.8 }).addTo(map);

    // Fit bounds
    map.fitBounds([AUI, destCoords], { padding: [40, 40] });
    mapInstance.current = map;

    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [departure, destination]);

  return <div ref={mapRef} style={{ width:'100%', height:'100%' }} />;
}

/* ── Main Page ── */
export default function RideDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { isDriver } = useAuth();
  const [showShare, setShowShare] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showManageRide, setShowManageRide] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const passedRide = location.state?.ride;
  const RIDE = passedRide ? {
    departure: passedRide.from || 'AUI Main Gate',
    destination: passedRide.to || passedRide.destination || 'Fez Airport',
    departureTime: passedRide.time?.split(' ')[0] || '14:00',
    date: 'Today, Feb 20', distance: '65 km', duration: '~55 min',
    driver: { name: passedRide.driver || 'Ghita Nafa', initials: passedRide.initials || 'GN', rating: passedRide.rating || 4.8, rides: 23 },
    vehicle: FALLBACK_RIDE.vehicle,
    totalSeats: passedRide.seatsTotal || 4,
    availableSeats: passedRide.seatsTotal ? passedRide.seatsTotal - passedRide.seatsTaken : 2,
    price: passedRide.price || 50, smoking: false, drivingStyle: 'Calm driver',
    stops: ['Ifrane Marché', 'Ifrane DT'],
    passengers: FALLBACK_RIDE.passengers,
  } : FALLBACK_RIDE;

  const isManageMode = location.state?.mode === 'manage';

  return (
    <div className="rd-layout">
      <div className="rd-panel">
        <div className="rd-header">
          <button className="rd-back-btn" onClick={() => navigate(-1)}><ChevronLeftIcon /><span>Back</span></button>
          <h2 className="rd-title">Ride Details</h2>
          <button className="rd-icon-btn" onClick={() => setShowShare(true)}><ShareIcon /></button>
        </div>

        <div className="rd-scroll">
          {/* Route */}
          <div className="rd-card">
            <div className="rd-route-row"><div className="rd-route-dots"><div className="rd-dot rd-dot-green"/><div className="rd-dashed"/><div className="rd-dot rd-dot-red"/></div><div className="rd-route-labels"><span className="rd-route-stop">{RIDE.departure}</span><span className="rd-route-stop">{RIDE.destination}</span></div></div>
            <div className="rd-divider"/>
            <div className="rd-stats-row">{[{icon:<ClockIcon/>,val:RIDE.departureTime,label:'Departure'},{icon:<RulerIcon/>,val:RIDE.distance,label:'Distance'},{icon:<TimerIcon/>,val:RIDE.duration,label:'Est. time'}].map((s,i)=>(<div key={i} className="rd-stat">{s.icon}<span className="rd-stat-val">{s.val}</span><span className="rd-stat-label">{s.label}</span></div>))}</div>
          </div>
          {/* Driver — clickable for passengers */}
          <div className={`rd-card ${!isDriver ? 'rd-card-clickable' : ''}`} onClick={!isDriver ? () => setShowProfile(true) : undefined}>
            <div className="rd-driver-row"><div className="rd-avatar">{RIDE.driver.initials}</div><div className="rd-driver-info"><span className="rd-driver-name">{RIDE.driver.name}</span><div className="rd-rating"><StarIcon/><span>{RIDE.driver.rating} · {RIDE.driver.rides} rides</span></div></div>{!isDriver && <span className="rd-view-profile-hint">View Profile →</span>}</div>
            <div className="rd-tags"><span className="rd-tag rd-tag-green"><BanIcon/> Non-smoking</span><span className="rd-tag rd-tag-gray"><GaugeIcon/> {RIDE.drivingStyle}</span></div>
          </div>
          {/* Vehicle */}
          <div className="rd-card rd-vehicle-row"><CarIcon/><div className="rd-vehicle-info"><span className="rd-vehicle-main">{RIDE.vehicle.brand} {RIDE.vehicle.model} · {RIDE.vehicle.color}</span><span className="rd-vehicle-sub">{RIDE.vehicle.size} · {RIDE.vehicle.luggage} luggage spots</span></div><span className="rd-plate">{RIDE.vehicle.plate}</span></div>
          {/* Seats */}
          <div className="rd-card">
            <div className="rd-row-between"><span className="rd-card-label">Available Seats</span><span className="rd-seats-count">{RIDE.availableSeats} of {RIDE.totalSeats} remaining</span></div>
            <div className="rd-seat-icons">{Array.from({length:RIDE.totalSeats}).map((_,i)=>(<span key={i} className={`rd-seat-icon ${i<RIDE.totalSeats-RIDE.availableSeats?'rd-seat-taken':''}`}><UsersIcon size={18}/></span>))}</div>
            <span className="rd-price-note">{RIDE.price} MAD per seat</span>
          </div>
          {/* Stops */}
          <div className="rd-card">
            <div className="rd-row-between" style={{marginBottom:4}}><span className="rd-card-label">Route & Stops</span><span className="rd-seats-count">{RIDE.stops.length} stops</span></div>
            <p className="rd-stops-hint">You can request a stop when booking</p>
            <div className="rd-stops-list">{[RIDE.departure,...RIDE.stops,RIDE.destination].map((stop,i,arr)=>(<div key={i} className="rd-stop-item"><div className={`rd-stop-dot ${i===0||i===arr.length-1?'rd-stop-dot-active':''}`}/><span className={`rd-stop-label ${i===0||i===arr.length-1?'rd-stop-label-bold':''}`}>{stop}</span></div>))}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="rd-actions">
          {isDriver || isManageMode ? (
            <>
              <button className="rd-msg-btn" onClick={() => setShowManage(true)}><UsersIcon size={15}/> Manage Passengers</button>
              <button className="rd-book-btn" onClick={() => setShowManageRide(true)}>Manage Ride</button>
            </>
          ) : (
            <>
              <button className="rd-msg-btn" onClick={() => navigate('/messages')}><MessageIcon/> Message Driver</button>
              <button className="rd-book-btn" onClick={() => setShowBooking(true)}>Book Now · {RIDE.price} MAD</button>
            </>
          )}
        </div>
      </div>

      {/* Route Map — interactive Leaflet */}
      <div className="rd-map">
        <RouteMap departure={RIDE.departure} destination={RIDE.destination} />
      </div>

      {showShare && <ShareModal ride={RIDE} onClose={() => setShowShare(false)} />}
      {showManage && <ManageModal ride={RIDE} onClose={() => setShowManage(false)} />}
      {showProfile && <DriverProfileModal driver={RIDE.driver} onClose={() => setShowProfile(false)} />}
      {showBooking && <BookingModal ride={RIDE} onClose={() => setShowBooking(false)} onConfirm={(booking) => { setShowBooking(false); setBookingResult(booking); }} />}
      {bookingResult && <BookingConfirmation ride={RIDE} booking={bookingResult} onClose={() => setBookingResult(null)} onGoToRides={() => navigate('/rides')} />}
      {showManage && <ManageModal ride={RIDE} onClose={() => setShowManage(false)} />}
      {showManageRide && <ManageRideModal ride={RIDE} onClose={() => setShowManageRide(false)} />}  
    </div>
  );
}
