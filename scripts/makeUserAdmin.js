import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';

dotenv.config();

const makeUserAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Get email from command line argument
        const email = process.argv[2];

        if (!email) {
            console.log('❌ Please provide an email address');
            console.log('Usage: node makeUserAdmin.js user@example.com');
            process.exit(1);
        }

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`❌ User not found with email: ${email}`);
            process.exit(1);
        }

        // Update user role to admin
        user.role = 'admin';
        await user.save();

        console.log('✅ User updated to admin successfully!');
        console.log('👤 Name:', user.name);
        console.log('📧 Email:', user.email);
        console.log('🔑 Role:', user.role);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

makeUserAdmin();
