# Quick Setup Guide

## 📦 Step 1: Install Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## 🔧 Step 2: Configure Environment Variables

### Backend Configuration
Create `backend/.env` file with the following:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/billmaster
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d
CORS_ORIGIN=http://localhost:3000
```

**Note:** 
- For MongoDB Atlas, use: `mongodb+srv://username:password@cluster.mongodb.net/billmaster`
- Generate a strong JWT_SECRET (e.g., use `openssl rand -base64 32`)

### Frontend Configuration
Create `frontend/.env` file with the following:
```env
VITE_API_URL=http://localhost:5000/api
```

## 🗄️ Step 3: Start MongoDB

Make sure MongoDB is running on your system:

**Local MongoDB:**
```bash
# On Linux/Mac
sudo systemctl start mongod

# Or check if it's running
mongosh
```

**MongoDB Atlas:**
- No local setup needed, just use your connection string in `.env`

## 🚀 Step 4: Run the Application

### Terminal 1 - Start Backend
```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Connected: ...
🚀 Server running in development mode on port 5000
📍 Server URL: http://localhost:5000
```

### Terminal 2 - Start Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## ✅ Step 5: Verify Setup

1. **Backend Health Check:**
   - Open browser: `http://localhost:5000/api/health`
   - Should return: `{"success":true,"message":"Server is running!"}`

2. **Frontend:**
   - Open browser: `http://localhost:3000`
   - Should see the BillMaster welcome page

## 🧪 Test API Endpoints

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
- **Error: "MongoServerError: connect ECONNREFUSED"**
  - Make sure MongoDB is running: `sudo systemctl status mongod`
  - Check your MONGODB_URI in `.env`

### Port Already in Use
- **Error: "Port 5000 already in use"**
  - Change PORT in `backend/.env`
  - Or kill the process: `lsof -ti:5000 | xargs kill`

### Frontend Can't Connect to Backend
- Check CORS_ORIGIN in `backend/.env` matches frontend URL
- Verify VITE_API_URL in `frontend/.env`

## 📚 Next Steps

1. ✅ Your MERN stack is ready!
2. Start building features by adding:
   - New models in `backend/models/`
   - New controllers in `backend/controllers/`
   - New routes in `backend/routes/`
   - New pages in `frontend/src/pages/`
   - New components in `frontend/src/components/`

Happy Coding! 🎉

