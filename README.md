# Compliance 360

Compliance 360 is a full-stack application designed to help organizations manage their compliance requirements efficiently.

## Project Structure

The project is divided into two main parts:

-   **`backend/`**: A Django-based API server.
-   **`frontend/`**: A React + Vite based user interface.

## Getting Started

To run the application locally, you will need to set up both the backend and frontend servers.

### Backend Setup

1.  Navigate to the `backend` directory.
2.  Create and activate a virtual environment.
3.  Install dependencies: `pip install -r requirements.txt`
4.  Run migrations: `python manage.py migrate`
5.  Start the server: `python manage.py runserver`

For detailed instructions, see the [Backend README](backend/README.md).

### Frontend Setup

1.  Navigate to the `frontend` directory.
2.  Install dependencies: `npm install`
3.  Start the development server: `npm run dev`

For detailed instructions, see the [Frontend README](frontend/README.md).

## Development

-   **Backend URL**: http://127.0.0.1:8000/
-   **Frontend URL**: http://localhost:5173/ (default Vite port)
