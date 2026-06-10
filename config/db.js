const mongoose = require('mongoose');

// Disable buffering so queries fail immediately if DB is offline rather than hanging
mongoose.set('bufferCommands', false);

const connectDB = async () => {
    const options = {
        autoIndex: true,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
    };

    try {
        console.log('🔌 Attempting to connect to MongoDB Atlas...');
        const conn = await mongoose.connect(process.env.MONGO_URI, options);
        console.log(`✅ MongoDB Connected to Atlas: ${conn.connection.host}`);
        setupListeners();
        return conn;
    } catch (err) {
        console.warn(`⚠️ MongoDB Atlas Connection Failed: ${err.message}`);
        console.log('🔌 Attempting connection to local MongoDB fallback (mongodb://127.0.0.1:27017/jaipur_gifts)...');
        
        try {
            const localURI = 'mongodb://127.0.0.1:27017/jaipur_gifts';
            const conn = await mongoose.connect(localURI, options);
            console.log(`✅ Connected to Local MongoDB fallback: ${conn.connection.host}`);
            setupListeners();
            return conn;
        } catch (localErr) {
            console.error(`❌ Both MongoDB Atlas and Local MongoDB Connection Failed!`);
            console.error(`Atlas Error: ${err.message}`);
            console.error(`Local Error: ${localErr.message}`);
            console.log('\n👉 HOW TO FIX THIS ERROR:');
            console.log('1. Whitelist your current IP address in your MongoDB Atlas dashboard:');
            console.log('   Go to Network Access -> Add IP Address -> Add Current IP Address (or 0.0.0.0/0 to allow all).');
            console.log('2. Alternatively, start a local MongoDB server on port 27017.');
            console.log('3. Check if a firewall/VPN is blocking port 27017 or 27015.\n');
            console.warn('⚠️ Server will run in OFFLINE/MOCKED DB Mode. Database queries will fail, but the API server is up.');
        }
    }
};

const setupListeners = () => {
    mongoose.connection.on('error', (err) => {
        console.error(`❌ MongoDB Runtime Error:`, err);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB Disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
        console.log('♻️ MongoDB Reconnected Successfully');
    });
};

module.exports = connectDB;
