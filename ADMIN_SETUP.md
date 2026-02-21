# Admin User Setup Guide

## Method 1: Create a New Admin User

1. **Edit the admin credentials** in `scripts/createAdmin.js`:
   ```javascript
   const adminData = {
       name: 'Your Name',
       email: 'youremail@example.com',
       password: 'your-strong-password',
       role: 'admin'
   };
   ```

2. **Run the script**:
   ```bash
   cd backend
   npm run create-admin
   ```

3. **Login** with the admin credentials at `/login`

4. **Access Admin Dashboard** at `/admin`

---

## Method 2: Make an Existing User Admin

1. **Register a normal user** through the website

2. **Run the script** with the user's email:
   ```bash
   cd backend
   npm run make-admin user@example.com
   ```

3. **Login** with that user's credentials

4. **Access Admin Dashboard** at `/admin`

---

## Method 3: Update Directly in MongoDB

### Using MongoDB Compass:
1. Connect to your MongoDB database
2. Go to the `users` collection
3. Find the user you want to make admin
4. Edit the document and change `role` from `"citizen"` to `"admin"`
5. Save the changes

### Using MongoDB Shell:
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin" } }
)
```

---

## Default Admin Credentials (from createAdmin.js)

**Email:** admin@sudharnayak.com  
**Password:** admin123456  

⚠️ **IMPORTANT:** Change these credentials before running the script!

---

## Admin Features

Once logged in as admin, you can:
- ✅ View all reported issues
- ✅ Update issue status (Pending → In Progress → Resolved)
- ✅ Delete issues
- ✅ View user statistics
- ✅ Manage all comments

---

## Troubleshooting

**Error: "Admin user already exists"**
- Use Method 2 to make a different user admin
- Or delete the existing admin from MongoDB and try again

**Error: "User not found"**
- Make sure the email is correct
- Check if the user has registered on the website

**Can't access /admin page**
- Make sure you're logged in
- Verify your user role is "admin" in the database
- Check browser console for errors
