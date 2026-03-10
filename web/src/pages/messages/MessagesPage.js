import React, { useState } from 'react';
import { Search, Send, Info } from 'lucide-react';
import './MessagesPage.css';

const CONVS = [
  { id:'1', name:'Ghita Nafa', initials:'GN', lastMsg:'See you at 2pm at the main gate!', time:'14:32', unread:2, rideTag:'AUI → Fez' },
  { id:'2', name:'Ahmed Benali', initials:'AB', lastMsg:'The car is white Dacia Logan', time:'11:05', unread:0, rideTag:'AUI → Rabat' },
  { id:'3', name:'Kenza Nouri', initials:'KN', lastMsg:'Great, see you tomorrow!', time:'Yesterday', unread:0, rideTag:'AUI → Meknes' },
];

const MSGS = [
  { id:'1', text:'Hi! Where exactly is the meeting point?', sender:'them', time:'14:00' },
  { id:'2', text:'At the AUI main gate, right by the security booth.', sender:'me', time:'14:05' },
  { id:'3', text:'Perfect! And what time should I be there?', sender:'them', time:'14:10' },
  { id:'4', text:'Please be there by 13:50 so we can leave on time.', sender:'me', time:'14:15' },
  { id:'5', text:'See you at 2pm at the main gate!', sender:'them', time:'14:32' },
];

export default function MessagesPage() {
  const [active, setActive] = useState(CONVS[0]);
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState(MSGS);
  const [search, setSearch] = useState('');

  const filtered = CONVS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.rideTag.toLowerCase().includes(search.toLowerCase())
  );

  const send = () => {
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { id: String(prev.length+1), text: msg.trim(), sender:'me', time:'Now' }]);
    setMsg('');
  };

  return (
    <div className="mp-layout">
      {/* Conv list */}
      <div className="mp-sidebar">
        <div className="mp-sidebar-header">
          <h2 className="mp-title">Messages</h2>
          <div className="mp-search-box">
            <Search size={14} color="var(--color-text-secondary)"/>
            <input className="mp-search-input" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        <div className="mp-conv-list">
          {filtered.map(c => (
            <div
              key={c.id}
              className={`mp-conv-item ${active?.id===c.id ? 'active' : ''}`}
              onClick={() => setActive(c)}
            >
              <div className="mp-conv-avatar">{c.initials}</div>
              <div className="mp-conv-content">
                <div className="mp-conv-top">
                  <span className="mp-conv-name">{c.name}</span>
                  <span className="mp-conv-time">{c.time}</span>
                </div>
                <div className="mp-conv-bottom">
                  <span className="mp-conv-preview">{c.lastMsg}</span>
                  {c.unread>0 && <span className="mp-unread">{c.unread}</span>}
                </div>
                <span className="mp-ride-tag">{c.rideTag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      {active ? (
        <div className="mp-chat">
          <div className="mp-chat-header">
            <div className="mp-chat-avatar">{active.initials}</div>
            <div className="mp-chat-info">
              <span className="mp-chat-name">{active.name}</span>
              <span className="mp-chat-ride">{active.rideTag}</span>
            </div>
            <button className="mp-info-btn"><Info size={16}/></button>
          </div>
          <div className="mp-messages">
            {messages.map(m => (
              <div key={m.id} className={`mp-bubble-row ${m.sender==='me' ? 'me' : ''}`}>
                <div className={`mp-bubble ${m.sender==='me' ? 'mp-bubble-me' : 'mp-bubble-them'}`}>
                  <span>{m.text}</span>
                  <span className="mp-bubble-time">{m.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mp-input-bar">
            <input
              className="mp-chat-input"
              placeholder="Type a message..."
              value={msg}
              onChange={e=>setMsg(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&send()}
            />
            <button className={`mp-send-btn ${!msg.trim()?'disabled':''}`} onClick={send}>
              <Send size={15}/>
            </button>
          </div>
        </div>
      ) : (
        <div className="mp-empty-chat">Select a conversation</div>
      )}
    </div>
  );
}
