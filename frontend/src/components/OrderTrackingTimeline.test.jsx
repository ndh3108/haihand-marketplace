/**
 * Automated Frontend QA Test Suite: OrderTrackingTimeline Component
 * File: frontend/src/components/OrderTrackingTimeline.test.jsx
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import OrderTrackingTimeline from './OrderTrackingTimeline';

describe('OrderTrackingTimeline Component - Real-time GHN Tracking UI', () => {
  const mockOrderWith3Logs = {
    _id: '66b998877665544332211000',
    shippingStatus: 'delivered',
    trackingCode: 'GHN_889900',
    trackingLogs: [
      {
        status: 'picking',
        description: 'Bưu tá GHN đang lấy hàng tại kho người bán Quận 1',
        updated_at: '2026-10-30T08:00:00.000Z'
      },
      {
        status: 'delivering',
        description: 'Kiện hàng đang trên đường giao tới địa chỉ người nhận Quận 7',
        updated_at: '2026-10-30T10:30:00.000Z'
      },
      {
        status: 'delivered',
        description: 'Giao hàng thành công. Người nhận: Nguyễn Văn A',
        updated_at: '2026-10-30T14:15:00.000Z'
      }
    ]
  };

  /**
   * Core Requirement Test:
   * Mock 1 order object gồm 3 trackingLogs, render component và assert cả 3 statuses
   * đều hiển thị đầy đủ và đúng thứ tự thời gian (chronologically) trên màn hình.
   */
  test('Case 1: Hiển thị đầy đủ 3 trạng thái trong trackingLogs theo đúng thứ tự thời gian (chronologically)', () => {
    render(<OrderTrackingTimeline order={mockOrderWith3Logs} />);

    // 1. Kiểm tra cả 3 trạng thái đều xuất hiện trên màn hình
    expect(screen.getByText('picking')).toBeInTheDocument();
    expect(screen.getByText('delivering')).toBeInTheDocument();
    expect(screen.getByText('delivered')).toBeInTheDocument();

    // 2. Kiểm tra mô tả chi tiết (Reason/Description) của cả 3 mốc đều hiển thị
    expect(
      screen.getByText('Bưu tá GHN đang lấy hàng tại kho người bán Quận 1')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Kiện hàng đang trên đường giao tới địa chỉ người nhận Quận 7')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Giao hàng thành công. Người nhận: Nguyễn Văn A')
    ).toBeInTheDocument();

    // 3. Assert thứ tự hiển thị theo thời gian (Chronological Order: picking -> delivering -> delivered)
    const timelineItems = screen.getAllByTestId('tracking-log-item');
    expect(timelineItems).toHaveLength(3);

    expect(within(timelineItems[0]).getByTestId('tracking-status-code')).toHaveTextContent('picking');
    expect(within(timelineItems[1]).getByTestId('tracking-status-code')).toHaveTextContent('delivering');
    expect(within(timelineItems[2]).getByTestId('tracking-status-code')).toHaveTextContent('delivered');
  });

  /**
   * Test Case 2: Nếu mảng trackingLogs truyền vào bị xáo trộn thời gian,
   * component vẫn tự động sắp xếp lại theo đúng thứ tự thời gian (cũ -> mới).
   */
  test('Case 2: Tự động sắp xếp lại 3 trackingLogs theo đúng trình tự thời gian nếu dữ liệu đầu vào bị xáo trộn', () => {
    const unorderedOrder = {
      _id: '66b998877665544332211999',
      shippingStatus: 'delivered',
      trackingLogs: [
        {
          status: 'delivered',
          description: 'Đã giao thành công',
          updated_at: '2026-10-30T15:00:00.000Z'
        },
        {
          status: 'ready_to_pick',
          description: 'Mới tạo vận đơn GHN',
          updated_at: '2026-10-30T07:00:00.000Z'
        },
        {
          status: 'delivering',
          description: 'Đang trung chuyển giao hàng',
          updated_at: '2026-10-30T11:00:00.000Z'
        }
      ]
    };

    render(<OrderTrackingTimeline trackingLogs={unorderedOrder.trackingLogs} />);

    const statusCodes = screen.getAllByTestId('tracking-status-code');
    expect(statusCodes).toHaveLength(3);
    expect(statusCodes[0]).toHaveTextContent('ready_to_pick');
    expect(statusCodes[1]).toHaveTextContent('delivering');
    expect(statusCodes[2]).toHaveTextContent('delivered');
  });

  /**
   * Test Case 3: Hiển thị trạng thái rỗng (Empty State) khi đơn hàng chưa có trackingLogs
   */
  test('Case 3: Hiển thị thông báo trống khi trackingLogs rỗng', () => {
    render(<OrderTrackingTimeline trackingLogs={[]} />);

    expect(screen.getByTestId('empty-tracking-timeline')).toBeInTheDocument();
    expect(screen.getByText(/Chưa có lịch sử hành trình vận đơn/i)).toBeInTheDocument();
  });
});

