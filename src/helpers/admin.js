const User = require("../models/User");
require("dotenv").config();

const adminData = {
  fullName: process.env.ADMIN_FULLNAME,
  email: process.env.ADMIN_EMAIL,
  phone: process.env.ADMIN_PHONE,
  password: process.env.ADMIN_PASSWORD,
};

module.exports.checkOrCreateAdmin = async () => {
  try {
    if (!adminData.fullName || !adminData.email || !adminData.password) {
      console.error("❌ Missing admin credentials in .env file");
      return;
    }

    const existingAdmin = await User.findOne({ where: { role: "admin" } });

    if (existingAdmin) {
      console.log("✅ Admin already exists:", existingAdmin.email);
      return;
    }

    // No admin found, create one (password will be hashed by the model hook)
    const newAdmin = await User.create({
      fullName: adminData.fullName,
      email: adminData.email.toLowerCase(),
      phone: adminData.phone,
      password: adminData.password, // plain password, hook will hash
      role: "admin",
      category: "admin",
      isAdmin: true,
    });

    console.log("🎉 Admin account created:", newAdmin.email);
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
  }
};
