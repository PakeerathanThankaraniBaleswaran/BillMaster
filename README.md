# BillMaster - Invoice Management System

A full-stack MERN (MongoDB, Express, React, Node.js) application for managing invoices and billing.

## 🚀 Project Structure

This project follows a clean, scalable architecture with separate frontend and backend:

```
BillMaster/
├── frontend/          # React + Vite + Tailwind CSS
└── backend/           # Node.js + Express + MongoDB
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas account)

## 🛠️ Installation & Setup

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd BillMaster
```

### 2. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env file with your configuration:
# - MONGODB_URI: Your MongoDB connection string
# - JWT_SECRET: A secure random string
# - PORT: Server port (default: 5000)
```

**Example .env file:**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/billmaster
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=30d
CORS_ORIGIN=http://localhost:3000
```

### 3. Frontend Setup

```bash
# Navigate to frontend folder (from project root)
cd frontend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env file:
# - VITE_API_URL: Your backend API URL
```

**Example .env file:**
```env
VITE_API_URL=http://localhost:5000/api
```

## 🏃 Running the Application

### Start Backend Server

```bash
cd backend
npm run dev    # Development mode with auto-reload
# or
npm start      # Production mode
```

The backend will run on `http://localhost:5000`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## 📁 Project Structure Explained

### Frontend (`/frontend`)
- **src/components/**: Reusable React components
- **src/pages/**: Page components (routes)
- **src/services/**: API service functions
- **src/utils/**: Utility functions and constants
- **src/hooks/**: Custom React hooks
- **src/context/**: React Context for state management

### Backend (`/backend`)
- **config/**: Configuration files (database, etc.)
- **models/**: Mongoose data models
- **controllers/**: Business logic handlers
- **routes/**: API route definitions
- **middleware/**: Custom middleware (auth, validation, error handling)
- **utils/**: Helper functions

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile (Protected)

### Health Check
- `GET /api/health` - Server health check

## 🛡️ Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## 🔧 Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

## 📝 Environment Variables

Make sure to set up your environment variables in both frontend and backend `.env` files. Never commit `.env` files to version control!

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions, please open an issue on the repository.

---

**Built with ❤️ using the MERN stack**

