import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const FollowPage = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('followers'); 
    const [list, setList] = useState([]);
    
    
    const [counts, setCounts] = useState({ followers: 0, following: 0 });
    
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
    const user = JSON.parse(localStorage.getItem('user'));

    
    useEffect(() => {
        if (!user) return;
        axios.get(`${API_URL}/api/users/public-profile/${user._id}`)
            .then(res => setCounts({ 
                followers: res.data.followersCount || 0, 
                following: res.data.followingCount || 0 
            }))
            .catch(err => console.log(err));
    }, [user?._id]);

    
    useEffect(() => {
        const fetchList = async () => {
            if (!user) return;
            try {
                const { data } = await axios.get(`${API_URL}/api/users/${user._id}/follow-list?type=${tab}`);
                setList(data);
            } catch (error) { 
                console.error("Lỗi lấy danh sách bạn bè", error); 
            }
        };
        fetchList();
    }, [tab, user?._id]);

    return (
        <div className="bg-light min-vh-100">
            <AppHeader />
            
            <div className="bg-white border-bottom shadow-sm">
                <div className="container d-flex gap-5">
                    <button 
                        onClick={() => setTab('followers')} 
                        className={`py-3 border-bottom border-3 bg-transparent border-0 transition-all ${tab === 'followers' ? 'border-warning fw-bold text-dark' : 'border-transparent text-muted'}`}>
                        ĐƯỢC THEO DÕI ({counts.followers})
                    </button>
                    <button 
                        onClick={() => setTab('following')} 
                        className={`py-3 border-bottom border-3 bg-transparent border-0 transition-all ${tab === 'following' ? 'border-warning fw-bold text-dark' : 'border-transparent text-muted'}`}>
                        THEO DÕI ({counts.following})
                    </button>
                </div>
            </div>

            <div className="container py-4">
                <div className="row g-3">
                    {list.length === 0 ? (
                        <div className="col-12 text-center py-5 bg-white rounded-4 shadow-sm">
                            <p className="text-muted mb-0">Chưa có ai trong danh sách này cả.</p>
                        </div>
                    ) : (
                        list.map(item => {
                            
                            if (!item.follower || !item.following) return null;

                            
                            const person = tab === 'followers' ? item.follower : item.following;
                            
                            return (
                                <div key={item._id} className="col-md-6">
                                    <div className="bg-white p-3 rounded-4 shadow-sm d-flex align-items-center justify-content-between border hover-scale transition-all">
                                        <div className="d-flex align-items-center gap-3" onClick={() => navigate(`/public-profile/${person._id}`)} style={{cursor:'pointer'}}>
                                            <img src={person.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} className="rounded-circle border" style={{width:'55px', height:'55px', objectFit:'cover'}} alt="avt"/>
                                            <div>
                                                <h6 className="fw-bold mb-0 text-dark">{person.name}</h6>
                                                <small className="text-muted">Xem trang cá nhân</small>
                                            </div>
                                        </div>
                                        <button onClick={() => navigate('/chat', { state: { receiver: person } })} className="btn btn-sm btn-outline-warning rounded-pill px-3 fw-bold">
                                            Nhắn tin
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            <AppFooter />
        </div>
    );
};

export default FollowPage;