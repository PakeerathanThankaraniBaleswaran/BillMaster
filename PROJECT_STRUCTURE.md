# BillMaster - MERN Stack Project Structure

## Complete Folder Structure

```
BillMaster/
│
├── frontend/                          # React Frontend Application
│   ├── public/                        # Static assets
│   │   ├── vite.svg
│   │   └── favicon.ico
│   │
│   ├── src/                           # Source code
│   │   ├── components/                # Reusable React components
│   │   │   ├── common/                # Common components (Button, Input, etc.)
│   │   │   ├── layout/                # Layout components (Header, Footer, Sidebar)
│   │   │   └── index.js               # Component exports
│   │   │
│   │   ├── pages/                     # Page components (routes)
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   └── index.js               # Page exports
│   │   │
│   │   ├── hooks/                     # Custom React hooks
│   │   │   └── useAuth.js
│   │   │
│   │   ├── context/                   # React Context API
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── services/                  # API service functions
│   │   │   └── api.js
│   │   │
│   │   ├── utils/                     # Utility functions
│   │   │   └── constants.js
│   │   │
│   │   ├── App.jsx                    # Main App component with routing
│   │   ├── main.jsx                   # Application entry point
│   │   └── index.css                  # Global styles + Tailwind imports
│   │
│   ├── .env                           # Frontend environment variables
│   ├── .gitignore                     # Git ignore rules
│   ├── index.html                     # HTML template
│   ├── package.json                   # Frontend dependencies
│   ├── tailwind.config.js             # Tailwind CSS configuration
│   ├── postcss.config.js              # PostCSS configuration
│   └── vite.config.js                 # Vite configuration
│
├── backend/                           # Node.js Backend Application
│   ├── config/                        # Configuration files
│   │   └── db.js                      # MongoDB connection setup
│   │
│   ├── models/                        # Mongoose data models
│   │   └── User.model.js              # User model schema
│   │
│   ├── controllers/                   # Request handlers (business logic)
│   │   └── auth.controller.js         # Authentication controllers
│   │
│   ├── routes/                        # API route definitions
│   │   ├── auth.routes.js             # Authentication routes
│   │   └── index.js                   # Route aggregator
│   │
│   ├── middleware/                    # Custom middleware functions
│   │   ├── auth.middleware.js         # Authentication middleware
│   │   ├── error.middleware.js        # Error handling middleware
│   │   └── validate.middleware.js     # Request validation middleware
│   │
│   ├── utils/                         # Utility functions
│   │   ├── asyncHandler.js            # Async error handler wrapper
│   │   └── errorResponse.js           # Error response formatter
│   │
│   ├── .env                           # Backend environment variables
│   ├── .gitignore                     # Git ignore rules
│   ├── app.js                         # Express app configuration
│   ├── server.js                      # Server entry point
│   └── package.json                   # Backend dependencies
│
├── .gitignore                         # Root git ignore
└── README.md                          # Project documentation

```

## Folder & File Explanations

### 📁 Root Level
- **README.md**: Project documentation, setup instructions, and API documentation
- **.gitignore**: Files/folders to ignore in Git (node_modules, .env, etc.)

---

### 📁 frontend/ - React Frontend Application

#### **public/**
- Static assets served directly (images, icons, robots.txt, etc.)
- Files here are copied as-is to the build output

#### **src/components/**
- **common/**: Reusable UI components (Button, Input, Card, Modal, etc.)
- **layout/**: Layout components that structure the page (Header, Footer, Sidebar, Navbar)
- **index.js**: Central export file for easy imports (`import { Button } from '@/components'`)

#### **src/pages/**
- Full page components that correspond to routes
- Each file represents a complete page (Home, Login, Dashboard, etc.)
- **index.js**: Exports all pages for clean imports

#### **src/hooks/**
- Custom React hooks for reusable logic
- Example: `useAuth.js` for authentication state management

#### **src/context/**
- React Context API for global state management
- Example: `AuthContext.jsx` to share user auth state across components

#### **src/services/**
- API communication layer
- Centralized functions to call backend endpoints
- Example: `api.js` contains all fetch/axios calls

#### **src/utils/**
- Helper functions and constants
- Reusable pure functions (date formatters, validators, etc.)

#### **src/App.jsx**
- Main application component
- Contains React Router setup and route definitions
- Wraps the entire app with providers (Context, etc.)

#### **src/main.jsx**
- Application entry point
- Renders the App component to the DOM
- Initializes React application

#### **src/index.css**
- Global CSS styles
- Tailwind CSS imports (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)
- Custom CSS variables and base styles

#### **Configuration Files**
- **.env**: Frontend environment variables (API URLs, etc.)
- **package.json**: Dependencies and scripts for frontend
- **vite.config.js**: Vite build tool configuration
- **tailwind.config.js**: Tailwind CSS customization (themes, plugins)
- **postcss.config.js**: PostCSS configuration (required for Tailwind)

---

### 📁 backend/ - Node.js Backend Application

#### **config/**
- Application configuration files
- **db.js**: MongoDB connection using Mongoose
- Can add: `jwt.js` (JWT config), `cloudinary.js` (file upload config), etc.

#### **models/**
- Mongoose schema definitions
- Each file represents a database collection/model
- **User.model.js**: User schema with fields, validation, methods

#### **controllers/**
- Business logic layer (MVC pattern)
- Handles request processing and response
- Each controller file groups related operations
- **auth.controller.js**: Login, register, logout logic

#### **routes/**
- API endpoint definitions
- Maps URLs to controller functions
- **auth.routes.js**: `/api/auth/login`, `/api/auth/register` routes
- **index.js**: Aggregates all routes and exports router

#### **middleware/**
- Functions that run between request and response
- **auth.middleware.js**: Verify JWT tokens, protect routes
- **error.middleware.js**: Global error handler
- **validate.middleware.js**: Validate request data (using libraries like Joi/express-validator)

#### **utils/**
- Helper functions used across the backend
- **asyncHandler.js**: Wrapper to catch async errors automatically
- **errorResponse.js**: Standardized error response format

#### **app.js**
- Express application setup
- Middleware configuration (CORS, body-parser, morgan)
- Route mounting
- Error handling middleware

#### **server.js**
- Server entry point
- Connects to MongoDB
- Starts the Express server
- Environment validation

#### **Configuration Files**
- **.env**: Backend environment variables (MongoDB URI, JWT secret, port, etc.)
- **package.json**: Dependencies and scripts for backend

---

## Design Principles (Why This Structure?)

1. **Separation of Concerns**: Frontend and backend are completely separate, making deployment easier
2. **MVC Pattern**: Backend follows Model-View-Controller (Models = database, Controllers = business logic, Routes = URLs)
3. **Scalability**: Easy to add new features (new models, controllers, routes)
4. **Maintainability**: Clear organization makes code easy to find and modify
5. **Industry Standard**: Follows conventions used by major companies

---

## Next Steps

Once you approve this structure, I will:
1. Create all folders and files
2. Set up package.json files with dependencies
3. Configure Vite, Tailwind, and Express
4. Add MongoDB connection setup
5. Create starter code for Home and Login pages
6. Set up basic routing
7. Add environment variable templates
8. Create helpful npm scripts

**Ready to proceed with creating all these files?**

