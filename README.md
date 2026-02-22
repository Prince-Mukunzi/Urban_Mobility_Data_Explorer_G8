# Urban Mobility Data Explorer (G8)

An interactive, full-stack web application designed to explore, analyze, and visualize NYC taxi trip data. This dashboard allows users to filter trips by various parameters (date, time, passengers, distance, fare, and borough), view aggregated statistics, and interact with a GeoJSON-based map of taxi zones.

[Demo Video](https://www.loom.com/share/f3cc6c7b99ad4c67a480b0de44d1e171)
[Team Task Sheet](https://docs.google.com/spreadsheets/d/1ORAIB03Wm-LioCZxz_5XgWB3j13AIiS9YiNJSEdSuAc/edit?usp=sharing)

## Features

- **Interactive Dashboard**: A sleek, modern UI built with React, shading, and Tailwind CSS.
- **Data Filtering & Aggregation**: Filter NYC taxi trips based on specific criteria like pickup hour, dates, passenger count, distance, fare, and boroughs.
- **Real-time Statistics**: View total trips, average fare, average distance, best borough, and peak hour based on selected filters.
- **Geospatial Visualization**: A fully integrated Leaflet map displaying NYC taxi zones using GeoJSON data.
- **User Authentication**: Basic user registration and login endpoints.
- **Pagination**: Browse through large datasets of trips effortlessly.

## Technologies Used

### Backend
- **Python & Flask**: Lightweight WSGI web application framework.
- **SQLAlchemy & PyMySQL**: ORM and database driver for interacting with the MySQL database.
- **Flask-CORS**: Handling Cross-Origin Resource Sharing.
- **MySQL**: Relational database storing the taxi locations and trip records (`taxi_system`).

### Frontend
- **React 19 & TypeScript**: UI library and typed JavaScript for robust frontend development.
- **Vite**: Next-generation frontend tooling for fast development and building.
- **Tailwind CSS & shadcn/ui**: Utility-first CSS framework and accessible, customizable component library based on Radix UI.
- **React-Leaflet**: React components for Leaflet maps.
- **TanStack Table**: Headless UI for building powerful tables and datagrids.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Python 3.8+**
- **Node.js (v18+) and npm**
- **MySQL Server**

## Setup and Installation

### 1. Database Setup
Ensure your MySQL server is running and you have a database configured for the application, typically named `taxi_system`. Make sure it's populated with the NYC taxi `locations` and `trip_data`.

### 2. Backend Setup
Navigate to the root directory of the project:

```bash
# Create and activate a virtual environment
python3 -m venv env
source env/bin/activate  # On Windows use `env\Scripts\activate`

# Install the required dependencies
pip install -r requirements.txt
```

Create a `.env` file in the root directory with your database credentials:
```env
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=taxi_system
```

Start the Flask backend server:
```bash
python3 backend/api/main.py
```
The backend will run on `http://localhost:3000`.

### 3. Frontend Setup
Open a new terminal and navigate to the `frontend` directory:

```bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend will typically run on `http://localhost:5173`. Open this URL in your browser to view the application.

## Project Structure

```text
Urban_Mobility_Data_Explorer_G8/
│
├── backend/
│   └── api/
│       ├── main.py              # Flask app entry point
│       ├── db.py                # SQLAlchemy DB initialization
│       ├── models.py            # Database models (Trip, Location)
│       └── routes/              # API Endpoints
│           ├── auth.py          # /api/auth/register, /api/auth/login
│           └── trips.py         # /api/trips, /api/stats, /api/zones
│
├── frontend/
│   ├── index.html               # Main HTML file
│   ├── package.json             # Frontend dependencies and scripts
│   ├── vite.config.ts           # Vite configuration
│   └── src/
│       ├── App.tsx              # Root React component
│       ├── index.css            # Global Tailwind styles
│       ├── components/          # Reusable UI components (shadcn/ui, Dashboard)
│       └── lib/                 # Utility functions
│
├── docs/
│   └── api_docs.md              # Detailed API documentation
│
├── requirements.txt             # Python dependencies
└── app.py                       # Legacy/Alternate Flask app
```

## API Documentation

The backend provides several RESTful endpoints to interact with the data. Detailed API documentation, including request/response formats and examples, can be found in `docs/api_docs.md`.

**Key Endpoints:**
- `GET /api/trips`: Paginated trip records with applied filters.
- `GET /api/stats`: Extracted statistics (total trips, avg fare, etc.) based on filters.
- `GET /api/zones`: GeoJSON data comprising details of taxi zones for the map.
- `POST /api/auth/register`: Create a new user.
- `POST /api/auth/login`: Authenticate an existing user.

## License
Please refer to the `LICENSE` file for more details.
