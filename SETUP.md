# ExpenseEase India - Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB** (local installation or MongoDB Atlas account)
3. **npm** or **yarn**

## Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `backend` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expenseease
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
```

4. **MongoDB Setup:**
   - **Local MongoDB**: Make sure MongoDB is running on your system
   - **MongoDB Atlas**: Update `MONGODB_URI` with your Atlas connection string

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

## Frontend Setup

1. Navigate to the project root (if not already there):
```bash
cd ..
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Create a `.env` file in the project root (optional, defaults to localhost:5000):
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:8080`

## Testing the Setup

1. **Start MongoDB** (if using local MongoDB)

2. **Start the backend server:**
```bash
cd backend
npm run dev
```

You should see:
```
MongoDB Connected: localhost:27017
Server running on port 5000
```

3. **Start the frontend:**
```bash
npm run dev
```

4. **Test the application:**
   - Open `http://localhost:8080` in your browser
   - Navigate to the signup/login page
   - Create a new account or login
   - Verify that authentication works

## Troubleshooting

### Backend won't start
- Check if MongoDB is running
- Verify the `MONGODB_URI` in `.env` is correct
- Check if port 5000 is available

### Frontend can't connect to backend
- Verify backend is running on port 5000
- Check CORS settings in `backend/server.js`
- Verify `VITE_API_URL` in frontend `.env` matches backend URL

### Authentication errors
- Check browser console for errors
- Verify JWT_SECRET is set in backend `.env`
- Check network tab for API request/response details

### MongoDB connection errors
- Verify MongoDB is running (local) or connection string is correct (Atlas)
- Check MongoDB logs for errors
- Ensure MongoDB is accessible from your network

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Groups
- `GET /api/groups` - Get all groups (protected)
- `GET /api/groups/:id` - Get single group (protected)
- `POST /api/groups` - Create group (protected)

### Expenses
- `GET /api/expenses` - Get expenses (protected)
- `POST /api/expenses` - Create expense (protected)

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard data (protected)

### Activity
- `GET /api/activity` - Get activity logs (protected)

## Development

- Backend uses Express.js with MongoDB (Mongoose)
- Frontend uses React with TypeScript and Vite
- Authentication uses JWT tokens stored in localStorage
- CORS is configured to allow frontend-backend communication

