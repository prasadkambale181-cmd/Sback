import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Admin credentials - CHANGE THESE!
        const adminData = {
            name: 'Admin User',
            email: 'admin@sudharnayak.com',
            password: 'admin123456', // Change this to a strong password
            role: 'admin'
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('❌ Admin user already exists with this email');
            process.exit(1);
        }

        // Create admin user
        const admin = await User.create(adminData);
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', admin.email);
        console.log('🔑 Password:', adminData.password);
        console.log('👤 Role:', admin.role);
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

createAdmin();
