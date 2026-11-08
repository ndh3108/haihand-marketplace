import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const InboxPage = () => {
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();
  const { socket } = useSocket(); 
  const user = React.useMemo(() => {
    const stored = localStorage.getItem('user');
    return stored && stored !== "undefined" ? JSON.parse(stored) : {};
  }, []);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const fetchConversations = async () => {
    if (!user._id) return;
    try {
      const { data } = await axios.get(`${API_URL}/api/messages/conversations/${user._id}`);
      setConversations(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!user._id) return;
    fetchConversations(); 
    if (!socket) return;
    socket.on("updateInbox", fetchConversations);
    return () => {
      socket.off("updateInbox", fetchConversations);
    };
  }, [user._id, socket]);

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      
      <div className="py-3 px-3 shadow-sm d-flex align-items-center" style={{ backgroundColor: '#ffc107' }}>
        <button onClick={() => navigate('/')} className="btn btn-link text-dark p-0 me-3 text-decoration-none">
          <span style={{fontSize: '24px'}}>←</span>
        </button>
        <h5 className="fw-bold m-0 text-dark">Chat của tôi</h5>
      </div>

      <div className="container mt-2">
        {conversations.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted">Chưa có cuộc hội thoại nào</p>
          </div>
        ) : (
          conversations.map((conv, idx) => (
            <div key={idx} className="d-flex align-items-center p-3 border-bottom" 
                 style={{ cursor: 'pointer' }}
                 onClick={() => navigate('/chat', { state: { receiver: conv.otherUser } })}>
              
              <div className="position-relative">
                <div className="rounded-circle bg-warning text-white d-flex align-items-center justify-content-center fw-bold" 
                     style={{ width: '50px', height: '50px', fontSize: '18px' }}>
                  {conv.otherUser.name?.charAt(0).toUpperCase()}
                </div>
                {conv.unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white">
                    {conv.unreadCount}
                  </span>
                )}
              </div>

              <div className="ms-3 flex-grow-1">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0 text-dark">{conv.otherUser.name}</h6>
                  <small className="text-muted" style={{fontSize: '11px'}}>
                    {new Date(conv.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </small>
                </div>
                <div className="text-muted text-truncate" style={{ maxWidth: '250px', fontSize: '14px' }}>
                  {conv.lastMessage}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InboxPage;