require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Atlas Connected");
        process.exit(0);
    } catch (err) {
        console.error("❌ Atlas Error:");
        console.error(err);
        process.exit(1);
    }
})();