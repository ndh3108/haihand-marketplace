import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SellerOrders from './SellerOrders';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../components/Toast';

// 1. Mock axiosClient
jest.mock('../../api/axiosClient', () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn()
}));

// 2. Mock useToast
const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
};
jest.mock('../../components/Toast', () => ({
    useToast: () => mockToast
}));

// 3. Mock useConfirm
jest.mock('../../components/ConfirmModal', () => ({
    useConfirm: () => jest.fn().mockResolvedValue(true)
}));

describe('SellerOrders - Tạo đơn giao hàng GHN (handleShipGHN)', () => {
    const mockOrder = {
        _id: 'order_ghn_test_123',
        buyer: {
            name: 'Nguyễn Văn A',
            phone: '0987654321',
            address: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1'
        },
        shippingAddress: {
            fullName: 'Nguyễn Văn A',
            phone: '0987654321',
            street: '123 Đường Nguyễn Huệ',
            address: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1',
            wardCode: '20308',
            districtId: 1442
        },
        status: 'Pending',
        canonicalStatus: 'Pending',
        orderItems: [
            {
                _id: 'item_01',
                name: 'Áo thun HaiHand Vintage',
                price: 250000,
                quantity: 1,
                weight: 200,
                image: 'uploads/aothun.jpg'
            }
        ],
        totalPrice: 250000,
        shippingCarrier: '',
        shippingCode: '',
        trackingCode: '',
        shipment: null,
        createdAt: new Date().toISOString()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mặc định API get danh sách đơn trả về 1 đơn Pending chưa có mã vận đơn
        axiosClient.get.mockResolvedValue({
            data: [JSON.parse(JSON.stringify(mockOrder))]
        });
    });

    /**
     * Case 1: Khi bấm nút "Tạo đơn GHN", nút chuyển sang trạng thái Loading (disable)
     */
    test('Case 1: Khi bấm nút, nút chuyển sang trạng thái Loading và bị disable', async () => {
        let resolveApi;
        // Mock API post ở trạng thái Pending Promise (chưa giải quyết ngay) để test loading
        axiosClient.post.mockImplementation(() => new Promise((resolve) => {
            resolveApi = resolve;
        }));

        render(<SellerOrders />);

        // Chờ tải xong đơn hàng và hiển thị nút "Tạo đơn GHN"
        const shipButton = await screen.findByRole('button', { name: /Tạo đơn GHN/i });
        expect(shipButton).toBeInTheDocument();
        expect(shipButton).toBeEnabled();

        // Bấm nút "Tạo đơn GHN"
        fireEvent.click(shipButton);

        // Kiểm tra ngay lập tức: Nút hiển thị text Loading và bị disabled
        expect(screen.getByRole('button', { name: /Đang tạo đơn GHN.../i })).toBeInTheDocument();
        const loadingButton = screen.getByRole('button', { name: /Đang tạo đơn GHN.../i });
        expect(loadingButton).toBeDisabled();

        // Cleanup Promise pending
        await act(async () => {
            resolveApi({ data: { success: true, trackingCode: 'GHN_DUMMY' } });
        });
    });

    /**
     * Case 2: Khi API trả về thành công, UI ẩn nút bấm và hiển thị mã trackingCode
     */
    test('Case 2: Khi API trả về thành công, UI ẩn nút bấm và hiển thị mã trackingCode', async () => {
        const expectedTrackingCode = 'GHN_VN_889900';
        axiosClient.post.mockResolvedValueOnce({
            data: {
                success: true,
                trackingCode: expectedTrackingCode,
                order_code: expectedTrackingCode,
                message: 'Tạo đơn GHN thành công'
            }
        });

        render(<SellerOrders />);

        // Tìm và click nút "Tạo đơn GHN"
        const shipButton = await screen.findByRole('button', { name: /Tạo đơn GHN/i });
        fireEvent.click(shipButton);

        // Chờ API hoàn thành và UI cập nhật
        await waitFor(() => {
            // Nút "Tạo đơn GHN" phải biến mất khỏi UI
            expect(screen.queryByRole('button', { name: /Tạo đơn GHN/i })).not.toBeInTheDocument();
        });

        // Kiểm tra mã trackingCode xuất hiện trên UI
        expect(screen.getByText(expectedTrackingCode)).toBeInTheDocument();
        // Kiểm tra huy hiệu "Đã cấp mã GHN" hiển thị
        expect(screen.getByText(/Đã cấp mã GHN/i)).toBeInTheDocument();

        // Kiểm tra thông báo Toast thành công được gọi
        expect(mockToast.success).toHaveBeenCalledWith(
            expect.stringContaining(expectedTrackingCode)
        );
    });

    /**
     * Case 3: Khi API thất bại, hiển thị thông báo lỗi toast
     */
    test('Case 3: Khi API thất bại (VD: Sai token GHN), hiển thị thông báo lỗi toast', async () => {
        const errorMessage = 'Token GHN không hợp lệ hoặc đã hết hạn!';
        axiosClient.post.mockRejectedValueOnce({
            response: {
                data: {
                    message: errorMessage
                }
            }
        });

        render(<SellerOrders />);

        // Tìm và click nút "Tạo đơn GHN"
        const shipButton = await screen.findByRole('button', { name: /Tạo đơn GHN/i });
        fireEvent.click(shipButton);

        // Chờ toast.error được gọi với thông điệp lỗi chính xác từ GHN
        await waitFor(() => {
            expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
        });

        // Nút "Tạo đơn GHN" không bị mất và được kích hoạt lại (không còn loading / disabled)
        const reenabledButton = await screen.findByRole('button', { name: /Tạo đơn GHN/i });
        expect(reenabledButton).toBeInTheDocument();
        expect(reenabledButton).toBeEnabled();
    });
});
