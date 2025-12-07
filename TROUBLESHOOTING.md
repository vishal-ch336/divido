# Troubleshooting Guide

## MongoDB Authentication Error

### Error: "bad auth : authentication failed"

This means your MongoDB connection string has incorrect credentials. Follow these steps:

### Quick Fix Options:

#### Option 1: Use Local MongoDB (Easiest for Development)

1. **Start MongoDB locally:**
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Or if installed differently
   mongod --dbpath ~/data/db
   ```

2. **Update `backend/.env`:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/expenseease
   ```

3. **Restart backend:**
   ```bash
   cd backend
   npm run dev
   ```

#### Option 2: Use MongoDB Atlas (Cloud - Recommended)

1. **Create free account:** https://www.mongodb.com/cloud/atlas
2. **Create cluster** (free M0 tier)
3. **Create database user:**
   - Go to Database Access → Add New Database User
   - Choose Password authentication
   - Save username and password
4. **Whitelist IP:**
   - Go to Network Access → Add IP Address
   - Click "Allow Access from Anywhere" for development
5. **Get connection string:**
   - Go to Database → Connect → Connect your application
   - Copy the connection string
6. **Update `backend/.env`:**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/expenseease?retryWrites=true&w=majority
   ```
   Replace `username`, `password`, and `cluster0.xxxxx` with your actual values.

7. **URL encode special characters in password:**
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - `%` → `%25`

8. **Restart backend**

See `backend/MONGODB_SETUP.md` for detailed instructions.

## Testing Connectivity

### Step 1: Test Backend Health

Open in browser: `http://localhost:5000/api/health`

Should return:
```json
{
  "success": true,
  "message": "Server is running",
  "database": "connected" or "disconnected",
  "timestamp": "..."
}
```

### Step 2: Test Frontend-Backend Connection

1. **Open browser console** (F12)
2. **Run this command:**
   ```javascript
   fetch('http://localhost:5000/api/health')
     .then(r => r.json())
     .then(d => console.log('✅ Backend connected:', d))
     .catch(e => console.error('❌ Backend error:', e))
   ```

### Step 3: Test Signup Endpoint

```javascript
fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'test123',
    fullName: 'Test User'
  })
})
.then(r => r.json())
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e))
```

## Common Issues

### Issue: "Cannot connect to server"
**Symptoms:** Frontend shows network error
**Solutions:**
- ✅ Backend server is running (`npm run dev` in backend folder)
- ✅ Backend is on port 5000
- ✅ No firewall blocking port 5000
- ✅ Check browser console for CORS errors

### Issue: CORS Error
**Symptoms:** Browser console shows CORS policy error
**Solutions:**
- ✅ Check `FRONTEND_URL` in `backend/.env` matches your frontend URL
- ✅ Default should be `http://localhost:8080`
- ✅ Restart backend after changing `.env`

### Issue: "MongoDB Connection Error"
**Symptoms:** Backend logs show connection refused or auth failed
**Solutions:**
- ✅ MongoDB is running (local) or Atlas cluster is accessible
- ✅ Connection string in `.env` is correct
- ✅ For Atlas: IP is whitelisted, credentials are correct
- ✅ For local: MongoDB service is started

### Issue: Signup/Login Not Working
**Symptoms:** Form submits but nothing happens or shows error
**Solutions:**
- ✅ Check browser console for errors
- ✅ Check Network tab - see if request is sent
- ✅ Check backend terminal for error logs
- ✅ Verify MongoDB is connected (check `/api/health` endpoint)
- ✅ Check JWT_SECRET is set in backend `.env`

### Issue: "JWT_SECRET is not defined"
**Solutions:**
- ✅ Add `JWT_SECRET=your-secret-key` to `backend/.env`
- ✅ Use a long random string (at least 32 characters)
- ✅ Restart backend

## Verification Checklist

Before testing signup/login, verify:

- [ ] Backend server is running (`npm run dev` in backend folder)
- [ ] MongoDB is connected (check backend logs or `/api/health`)
- [ ] Frontend server is running (`npm run dev` in root folder)
- [ ] No errors in browser console
- [ ] No errors in backend terminal
- [ ] `.env` file exists in `backend/` folder with correct values
- [ ] CORS is configured correctly
- [ ] Network requests show in browser DevTools Network tab

## Getting Help

If issues persist:

1. **Check backend logs** - Look for error messages
2. **Check browser console** - Look for JavaScript errors
3. **Check Network tab** - See actual HTTP requests/responses
4. **Verify environment variables** - Make sure `.env` files are correct
5. **Test endpoints directly** - Use the test commands above

## Quick Test Commands

```bash
# Test backend health
curl http://localhost:5000/api/health

# Test signup (replace with your values)
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","fullName":"Test User"}'
```

