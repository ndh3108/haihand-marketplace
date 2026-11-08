import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppHeader } from "../components/AppHeader";
import { AppFooter } from "../components/AppFooter";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

const HaiPayResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(
    "⏳ Đang xác thực giao dịch qua VNPAY...",
  );
  const [isOrder, setIsOrder] = useState(false);

  useEffect(() => {
    const verifyTransaction = async () => {
      const responseCode = searchParams.get("vnp_ResponseCode");
      const txnRef = searchParams.get("vnp_TxnRef");
      const amount = searchParams.get("vnp_Amount");

      if (responseCode === "00") {
        try {
          await axios.post("http://localhost:4000/api/haipay/verify", {
            txnRef,
            responseCode,
            amount,
          });
          setStatus("🎉 Nạp tiền HàiPay thành công! Số dư đã được cập nhật.");

          const currentUser = JSON.parse(localStorage.getItem("user"));
          const actualAmount = parseInt(amount) / 100;
          currentUser.walletBalance =
            (currentUser.walletBalance || 0) + actualAmount;
          localStorage.setItem("user", JSON.stringify(currentUser));

          window.dispatchEvent(new Event("userUpdated"));
        } catch (error) {
          setStatus("❌ Lỗi hệ thống khi cộng tiền vào ví!");
        }
      } else {
        // Case B: Order Checkout Payment
        setIsOrder(true);
        try {
          const currentUser = JSON.parse(localStorage.getItem("user"));
          await axios.post(`${API_URL}/api/vnpay/verify`, {
            orderId: txnRef,
            responseCode,
            userId: currentUser?._id,
            vnp_Params: allParams,
            secureHash,
          });
          if (responseCode === "00") {
            setStatus(
              "🎉 Thanh toán đơn hàng thành công qua VNPAY! Người bán đang chuẩn bị hàng.",
            );
            window.dispatchEvent(new Event("cartUpdated"));
          } else {
            setStatus(
              "❌ Thanh toán đơn hàng thất bại hoặc bạn đã hủy giao dịch!",
            );
          }
        } catch (error) {
          setStatus(
            "❌ " +
              (error.response?.data?.message ||
                "Lỗi hệ thống khi xác nhận thanh toán đơn hàng!"),
          );
        }
      }
    };
    verifyTransaction();
  }, [searchParams]);

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <AppHeader />
      <div className="container d-flex flex-column align-items-center justify-content-center my-auto py-5">
        <div
          className="card p-5 shadow-lg border-0 text-center rounded-4"
          style={{ maxWidth: "600px" }}
        >
          <div className="display-4 mb-4">
            {status.includes("thành công") ? "✅" : "❌"}
          </div>
          <h3 className="fw-bold mb-4 text-dark" style={{ lineHeight: "1.4" }}>
            {status}
          </h3>
          {isOrder ? (
            <button
              onClick={() => navigate("/profile?tab=orders_buy")}
              className="btn btn-warning fw-bold px-5 py-3 rounded-pill shadow-sm"
            >
              🛍️ Vào xem Đơn mua của tôi
            </button>
          ) : (
            <button
              onClick={() => navigate("/haipay")}
              className="btn btn-warning fw-bold px-5 py-3 rounded-pill shadow-sm"
            >
              💳 Quay lại Ví HaiPay
            </button>
          )}
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default HaiPayResult;
