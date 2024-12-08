const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://IsaTepsurkaev:IsaTepsurkaev@atlascluster.orjj6ma.mongodb.net/auth_system');
        console.log('MongoDB подключен');
    } catch (error) {
        console.error('Ошибка подключения к MongoDB:', error);
        process.exit(1);
    }
};

module.exports = connectDB;