import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useToast } from './Toast';


const FloatingAdminChat = () => {
    const toast = useToast();
    const navigate = useNavigate();
    
    
    const [isHidden, setIsHidden] = useState(false); 
    const [isOpen, setIsOpen] = useState(false);
    const [adminUser, setAdminUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    
    const { socket } = useSocket();
    const scrollRef = useRef();
    
    const currentUser = React.useMemo(() => {
        const stored = localStorage.getItem('user');
        return stored && stored !== "undefined" ? JSON.parse(stored) : null;
    }, []);
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

    const isEmbedded = window.self !== window.top;
    const isAdmin = currentUser?.role === 'Admin';

    
    
    
    useEffect(() => {
        if (isAdmin || isEmbedded) return; 
        const fetchAdmin = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/admin/contact`);
                setAdminUser(data);
            } catch (err) { console.error("Chưa có Admin CSKH"); }
        };
        fetchAdmin();
    }, [isAdmin, isEmbedded, API_URL]);

    useEffect(() => {
        if (isOpen && currentUser && adminUser && !isEmbedded) {
            axios.get(`${API_URL}/api/messages/${currentUser._id}/${adminUser._id}`)
                .then(res => setMessages(res.data))
                .catch(err => console.log(err));

            if (!socket) return;

            const handleGetMessage = (data) => {
                if (data.senderId === adminUser._id) {
                    setMessages(prev => [...prev, { sender: data.senderId, content: data.text, createdAt: Date.now() }]);
                }
            };

            socket.on('getMessage', handleGetMessage);
            return () => {
                socket.off('getMessage', handleGetMessage);
            };
        }
    }, [isOpen, currentUser, adminUser, isEmbedded, API_URL, socket]);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

    
    if (isAdmin || isEmbedded || isHidden) return null;

    const handleToggle = (e) => {
        if (!currentUser) {
            toast.warning('Yêu cầu đăng nhập', "Bác vui lòng đăng nhập để chat với Hỗ trợ viên nhé!");
            navigate('/login');
            return;
        }
        if (!adminUser) {
            toast.info('Thông báo', "Hệ thống hiện tại chưa có Admin trực ban!");
            return;
        }
        setIsOpen(!isOpen);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageData = new FormData();
        messageData.append('senderId', currentUser._id);
        messageData.append('receiverId', adminUser._id);
        messageData.append('text', newMessage);

        try {
            const { data } = await axios.post(`${API_URL}/api/messages`, messageData);
            if (socket) {
                socket.emit('sendMessage', { senderId: currentUser._id, receiverId: adminUser._id, text: newMessage });
            }
            setMessages(prev => [...prev, data]);
            setNewMessage('');
        } catch (err) { console.error("Lỗi gửi tin:", err); }
    };

    return (
        
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
            
            
            {isOpen && (
                <div className="bg-white shadow-lg rounded-4 overflow-hidden d-flex flex-column mb-3 position-relative" 
                     style={{ width: '350px', height: '450px', border: '1px solid #ddd', transition: 'opacity 0.3s' }}>
                    
                    <div className="bg-warning px-3 py-2 d-flex justify-content-between align-items-center shadow-sm">
                        <div className="d-flex align-items-center gap-2">
                            <div className="bg-white rounded-circle d-flex justify-content-center align-items-center fw-bold text-warning" style={{width:'35px', height:'35px'}}>🎧</div>
                            <div>
                                <h6 className="fw-bold mb-0 text-dark">Hỗ trợ CSKH</h6>
                                <small className="text-dark fw-bold" style={{fontSize: '10px'}}>● Luôn luôn lắng nghe</small>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="btn btn-sm text-dark fs-5 fw-bold">✕</button>
                    </div>

                    <div className="flex-grow-1 p-3 overflow-auto d-flex flex-column gap-2" style={{ backgroundColor: '#f4f4f4' }}>
                        <div className="text-center mb-2"><small className="bg-secondary text-white px-2 py-1 rounded-pill" style={{fontSize: '10px'}}>Trò chuyện với Admin</small></div>
                        {messages.map((m, idx) => (
                            <div key={idx} ref={scrollRef} className={`d-flex ${m.sender === currentUser._id ? 'justify-content-end' : 'justify-content-start'}`}>
                                <div className={`p-2 rounded-3 shadow-sm ${m.sender === currentUser._id ? 'bg-warning text-dark' : 'bg-white text-dark'}`} style={{ maxWidth: '80%', fontSize: '14px', borderRadius: m.sender === currentUser._id ? '15px 15px 0 15px' : '15px 15px 15px 0' }}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-2 bg-white border-top d-flex gap-2">
                        <input type="text" className="form-control rounded-pill bg-light border-0" placeholder="Nhập tin nhắn..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} style={{ fontSize: '14px' }} />
                        <button type="submit" className="btn btn-warning rounded-circle fw-bold shadow-sm d-flex justify-content-center align-items-center" style={{width: '40px', height: '40px'}}>➤</button>
                    </form>
                </div>
            )}

            
            <div className="position-absolute" style={{ bottom: '0', right: '0', width: '60px', height: '60px' }}>
                
                
                {!isOpen && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsHidden(true); }}
                        className="position-absolute bg-white text-danger rounded-circle border shadow-sm d-flex justify-content-center align-items-center hover-scale"
                        style={{ 
                            top: '-5px', left: '-5px', width: '22px', height: '22px', 
                            fontSize: '12px', fontWeight: 'black', zIndex: 10, cursor: 'pointer' 
                        }}
                        title="Tắt bong bóng Chat"
                    >
                        ✕
                    </button>
                )}

                
                <div 
                    onClick={handleToggle}
                    className="shadow-lg d-flex align-items-center justify-content-center w-100 h-100"
                    style={{
                        backgroundColor: '#ffc107', 
                        borderRadius: '50%',
                        cursor: 'pointer', 
                        transition: 'transform 0.2s', 
                        border: '3px solid white'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    title="Tư vấn chăm sóc khách hàng"
                >
                    {isOpen ? <span style={{ fontSize: '24px', fontWeight: 'bold' }}>✕</span> : <span style={{ fontSize: '28px' }}>🎧</span>}
                    
                    {!isOpen && <span className="position-absolute bg-success border border-2 border-white rounded-circle" style={{ top: '2px', right: '2px', width: '15px', height: '15px' }}></span>}
                </div>
            </div>

        </div>
    );
};

export default FloatingAdminChat;