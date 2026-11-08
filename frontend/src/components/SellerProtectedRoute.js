import React, { useMemo } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useToast } from './Toast';

const SellerProtectedRoute = () => {
    const toast = useToast();

    const user = useMemo(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored && stored !== "undefined" ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }, []);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const isApprovedSeller = user.isSeller === true && user.sellerStatus === 'approved';

    if (!isApprovedSeller) {
        if (user.sellerStatus === 'pending') {
            toast.info('Hồ sơ đang chờ duyệt', 'Hồ sơ mở Shop của bạn đang được Admin xét duyệt.');
        } else {
            toast.warning('Yêu cầu mở Shop', 'Vui lòng hoàn tất đăng ký Người bán B2C để truy cập Kênh Người Bán.');
        }
        return <Navigate to="/register-seller" replace />;
    }

    return <Outlet />;
};

export default SellerProtectedRoute;
