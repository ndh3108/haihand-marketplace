const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        const conn = await mongoose.connect(mongoUri);
        console.log(`Đã kết nối MongoDB: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Lỗi: ${error.message}`);
    }
};

module.exports = connectDB;