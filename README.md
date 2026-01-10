# Budget Tracker

A mobile-responsive web application for tracking expenses and managing budget categories.

## Features

- **Budget Tracking**: Add and categorize expenses with custom categories
- **Category Management**: Create, edit, and delete expense categories with budgets
- **Monthly View**: Track expenses by month with budget vs actual comparisons
- **Mobile Responsive**: Fully responsive design that works on all devices

## Tech Stack

- **Frontend**: Vue 3, Vue Router, Vite
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose

## Local Development

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (running locally or MongoDB Atlas connection string)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/budget
NODE_ENV=development
```

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Deployment

### Backend (Fly.io)

1. Install Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/

2. Login to Fly.io:
```bash
fly auth login
```

3. Navigate to backend directory:
```bash
cd backend
```

4. Launch the app (first time only):
```bash
fly launch
```
- Use existing app name: `budget-backend` (or create new)
- Select region (e.g., `iad` for US East)
- Don't deploy yet if prompted

5. Set environment variables:
```bash
fly secrets set MONGODB_URI=your_mongodb_atlas_connection_string
fly secrets set NODE_ENV=production
```

6. Deploy:
```bash
fly deploy
```

7. Auto-deploy on push: Fly.io will automatically detect pushes to your GitHub repo if connected via `fly dashboard`

### Frontend (Vercel)

1. Go to [Vercel](https://vercel.com) and sign in with GitHub

2. Click "Add New Project"

3. Import your GitHub repository

4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

5. Add Environment Variable:
   - `VITE_API_URL`: Your Fly.io backend URL (e.g., `https://budget-backend.fly.dev`)

6. Deploy - Vercel will auto-deploy on every push to main branch

7. Update API proxy: Update the `rewrites` in `frontend/vercel.json` with your actual Fly.io backend URL

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a category
- `PUT /api/categories/:id` - Update a category
- `DELETE /api/categories/:id` - Delete a category

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create an expense
- `PUT /api/expenses/:id` - Update an expense
- `DELETE /api/expenses/:id` - Delete an expense
- `GET /api/expenses/by-category?month=1&year=2024` - Get expenses grouped by category for a specific month

## Project Structure

```
budget/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── server.js        # Express server
│   ├── fly.toml         # Fly.io configuration
│   ├── Dockerfile       # Docker configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/         # API client
│   │   ├── router/      # Vue Router config
│   │   ├── views/       # Vue components
│   │   ├── App.vue      # Root component
│   │   └── main.js      # Entry point
│   ├── vercel.json      # Vercel configuration
│   └── package.json
└── README.md
```
