# Luxury Car Rental App

## Project Structure

- **server.js**: Main server file that initializes the Express server and sets up routes.
- **routes/**: Directory containing route handlers for different collections (users, cars, brands, categories).

## Setup Instructions
1. Navigate to the server directory:
   ```bash
   cd luxury-car-rental-server
   ```
2. Install the necessary dependencies:
   ```bash
   npm install express firebase-admin
   ```
3. Create a Firebase service account key and place it in the project directory.
4. Start the server:
   ```bash
   node server.js
   ```

## API Endpoints
- **GET** `/api/users`: Get all users
- **POST** `/api/users`: Create a new user
- **GET** `/api/cars`: Get all cars
- **POST** `/api/cars`: Add a new car
- **GET** `/api/brands`: Get all brands
- **POST** `/api/brands`: Add a new brand
- **GET** `/api/categories`: Get all categories
- **POST** `/api/categories`: Add a new category
