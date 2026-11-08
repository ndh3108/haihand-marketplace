require('dotenv').config();
const mongoose = require('mongoose');
const { processChatbot } = require('./services/chatbotService');

async function runTest() {
    console.log("1. Đang kết nối MongoDB...");
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(uri);
        console.log("-> Kết nối MongoDB Atlas thành công!");

        const testQuestion = "Đơn hàng của tôi bị hỏng, tôi muốn hoàn tiền ngay!";
        console.log(`\n2. Đang gửi câu hỏi test sang LM Studio (port 1235): "${testQuestion}"...`);

        const res = await processChatbot(testQuestion);

        console.log("\n================ KẾT QUẢ AI PHẢN HỒI ================");
        console.log("Trả lời:\n", res.reply);
        console.log("\nSản phẩm tìm thấy từ Database:", res.products.length, "sản phẩm");
        if (res.products.length > 0) {
            console.log(res.products.map(p => ({ ten: p.name, gia: p.price, vitri: p.location })));
        }
        console.log("=====================================================");

    } catch (err) {
        console.error("Lỗi test:", err.message);
    } finally {
        await mongoose.connection.close();
    }
}

runTest();
