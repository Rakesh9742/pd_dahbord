# EDA Dashboard

A modern web application for Electronic Design Automation (EDA) data management and visualization.

## 🚀 Features

- **User Authentication**: Role-based login system
- **Multi-User Support**: Admin, Engineer, Lead, Program Manager, Customer roles
- **EDA Domain Support**: PD, RTL, DV, CD, CL, DFT domains
- **Project Management**: Create and manage EDA projects
- **Data Collection**: Store and analyze PD data metrics
- **Modern UI**: Responsive design with orange and blue gradients

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd dashboard
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Edit .env file with your MySQL credentials
```

Update the `.env` file in the backend folder:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=eda_dashboard
DB_PORT=3306
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
PORT=5000
CORS_ORIGIN=http://localhost:3000
```

### 3. Database Setup

```bash
# Run the database setup script
node scripts/setup-db.js
```

This will:
- Create the database and tables
- Insert default roles and domains
- Create a default admin user

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start the development server
npm start
```

## 🎯 API Testing

After running the database setup, test the API endpoints using Postman:

1. **Create Admin User**: `POST /api/auth/register`
2. **Login**: `POST /api/auth/login`
3. **Get User Info**: `GET /api/auth/me`

See `API_DOCUMENTATION.md` for detailed Postman examples.

## 🚀 Running the Application

### Start Backend Server
```bash
cd backend
npm run dev
```

The backend will run on: http://localhost:5000

### Start Frontend Server
```bash
cd frontend
npm start
```

The frontend will run on: http://localhost:3000

## 📊 Database Schema

The application uses a comprehensive database schema with the following main tables:

- **user_roles**: Role definitions (Admin, Engineer, Lead, etc.)
- **users**: User accounts with role assignments
- **domains**: EDA domains (PD, RTL, DV, etc.)
- **projects**: Project management
- **project_users**: Many-to-many user-project relationships
- **pd_data_raw**: Physical Design data collection

## 🎨 UI Features

- **Modern Design**: Clean, responsive interface
- **Gradient Themes**: Orange and blue gradient styling
- **Role-Based Access**: Different interfaces for different user roles
- **Responsive Layout**: Works on desktop and mobile devices

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Health Check
- `GET /api/health` - API health status

## 📁 Project Structure

```
dashboard/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   └── auth.js
│   ├── scripts/
│   │   └── setup-db.js
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   └── Login.css
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
└── README.md
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password encryption
- **CORS Protection**: Cross-origin request handling
- **Input Validation**: Server-side data validation

## 🎯 Next Steps

1. **Data Upload**: Implement CSV data upload functionality
2. **Dashboard Analytics**: Add charts and data visualization
3. **Project Management**: Complete project CRUD operations
4. **User Management**: Admin panel for user management
5. **Reporting**: Generate reports and exports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository. 