# Compliance 360 Backend

This is the backend for the Compliance 360 application, built with Django.

## Prerequisites

- Python 3.10 or higher
- pip (Python package installer)

## Setup

1.  **Navigate to the backend directory:**

    ```bash
    cd backend
    ```

2.  **Create a virtual environment:**

    ```bash
    # Windows
    python -m venv venv

    # macOS/Linux
    python3 -m venv venv
    ```

3.  **Activate the virtual environment:**

    ```bash
    # Windows
    venv\Scripts\activate

    # macOS/Linux
    source venv/bin/activate
    ```

4.  **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

5.  **Apply migrations:**

    ```bash
    python manage.py migrate
    ```

6.  **Run the development server:**

    ```bash
    python manage.py runserver
    ```

    The API will be available at `http://127.0.0.1:8000/`.

## Project Structure

-   `core/`: Main Django project configuration.
-   `manage.py`: Django's command-line utility for administrative tasks.
