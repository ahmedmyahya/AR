# 3D AR Model Hosting and Management Platform

This is a full-stack web application designed for hosting and managing 3D AR models. Users can upload GLB/GLTF models, get shareable links for embedding, and manage their uploaded assets through a simple dashboard. The platform prioritizes clean, maintainable, scalable, and easily deployable code, adhering to modern software engineering best practices.

## Features

* **User Authentication:** Secure registration and login (bcryptjs, express-session).
* **3D Model Upload:**
    * Upload single GLB/GLTF models.
    * Bulk upload feature for multiple models (API only).
    * File validation (type, size).
    * Secure storage on the server.
* **AR Viewing & Embedding:**
    * Automatically generates unique, publicly accessible hosting links for each model.
    * Embeddable HTML page with `@google/model-viewer` for AR capabilities (webxr, scene-viewer, quick-look).
* **Model Management Dashboard:**
    * View all uploaded models for authenticated users.
    * Edit model details (name, description).
    * Delete uploaded models (removes both database entry and file).
* **RESTful API:** All core functionalities are accessible via a well-defined API.
* **Clean Code & Standards:** Adheres to camelCase naming conventions, robust error handling, and modular design.

## Technical Stack

* **Backend:** Node.js, Express.js
* **Database:** SQLite3 with Sequelize ORM
* **Templating Engine:** EJS
* **File Uploads:** Multer
* **Environment Variables:** Dotenv
* **Input Validation:** Express-validator
* **AR/3D Viewer:** `@google/model-viewer`
* **Session Management:** `express-session` with `session-file-store`
* **Password Hashing:** `bcryptjs`
* **Development:** Nodemon

## Project Structure
ar-model-platform/
├── public/
│   └── css/
│       └── style.css
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   ├── models/
│   │   ├── dashboard.ejs
│   │   └── upload.ejs
│   ├── 404.ejs  (Custom 404 error page)
│   ├── 500.ejs  (Custom 500 error page)
│   └── embed.ejs
├── uploads/ (Automatically created for storing 3D models)
├── config/
│   └── database.js
├── middleware/
│   └── authMiddleware.js
├── models/
│   ├── index.js
│   ├── User.js
│   └── Model.js
├── routes/
│   ├── authRoutes.js
│   ├── modelRoutes.js
│   └── viewRoutes.js
├── controllers/
│   ├── authController.js
│   └── modelController.js
├── utils/
│   ├── initDb.js
│   └── fileUtils.js
├── .env
├── .gitignore
├── server.js
└── README.md

## Setup and Installation

Follow these steps to get the project up and running on your local machine.

### 1. Clone the Repository (or create manually)

If you have this as a repository, clone it:
```bash
git clone <your-repo-url>
cd ar-model-platform

If you're creating files manually, create a directory named ar-model-platform and set up the directory structure as shown above.

2. Create Files
Create each file listed in the "Project Structure" section and copy the corresponding code provided into them.

3. Install Dependencies
Navigate to the project root directory in your terminal and install the required Node.js packages:

Bash

npm install
4. Configure Environment Variables
Create a .env file in the root of your project and add the following:

PORT=3000
SESSION_SECRET=your_super_secret_session_key_here
DATABASE_URL=./data/database.sqlite
Important: Replace your_super_secret_session_key_here with a long, random string. This is crucial for session security.

5. Initialize the Database
Run the database initialization script. This will create the database.sqlite file in a data directory (if it doesn't exist) and set up the Users and Models tables.

Bash

npm run init-db
Note: If you ever need to reset your database completely during development, you would modify utils/initDb.js to db.sequelize.sync({ force: true }); then run npm run init-db again. Do not use force: true in production.

6. Run the Application
Start the development server using Nodemon (for automatic restarts on file changes):

Bash

npm run dev
Alternatively, to run without Nodemon:

Bash

npm start
7. Access the Application
Open your web browser and navigate to:

http://localhost:3000
API Usage
All core functionalities are exposed via a RESTful API. Use tools like Postman, Insomnia, or curl to test these endpoints.

Authentication Endpoints
Register User:

POST /api/register

Body (JSON): {"username": "testuser", "email": "test@example.com", "password": "password123"}

Login User:

POST /api/login

Body (JSON): {"username": "testuser", "password": "password123"}

Logout User:

GET /api/logout (or POST for API consistency)

Model Management Endpoints (Require Authentication)
Upload Single Model:

POST /api/models/upload

Headers: Content-Type: multipart/form-data

Body (Form-data):

modelFile: (File) your GLB/GLTF file

modelName: (Text) e.g., "My Awesome Model"

description: (Text, optional) e.g., "A detailed description."

Upload Multiple Models (Bulk):

POST /api/models/bulkUpload

Headers: Content-Type: multipart/form-data

Body (Form-data):

modelFiles: (Multiple Files) select several GLB/GLTF files (e.g., modelFiles[0], modelFiles[1]...)

Get All User Models:

GET /api/models

Get Specific Model Details:

GET /api/models/:modelId (e.g., /api/models/a1b2c3d4-e5f6-7890-1234-567890abcdef)

Update Model Details:

PUT /api/models/:modelId

Body (JSON): {"modelName": "Updated Name", "description": "New description"} (Fields are optional)

Delete a Model:

DELETE /api/models/:modelId

Public Embedding Endpoint
Embed Model:

GET /embed/:modelId (e.g., http://localhost:3000/embed/a1b2c3d4-e5f6-7890-1234-567890abcdef)

This link is designed to be used directly in an <iframe>:

HTML

<iframe src="http://localhost:3000/embed/YOUR_MODEL_ID" width="600" height="400" frameborder="0" allowfullscreen></iframe>
Code Quality & Standards
Clean Code: Emphasis on readability, meaningful names, and clear responsibilities.

Maintainability: Modular structure with separation of concerns (routes, controllers, models, utils).

Scalability: Designed with future growth in mind, using a robust framework and ORM.

Deployability: Clear scripts in package.json and reliance on environment variables for configuration.

Naming Conventions: All code elements follow camelCase.

Error Handling: Robust error handling for both user-facing and API responses.

Input Validation: Uses express-validator to validate user inputs.

Security: Password hashing with bcryptjs, secure session management.

Comments: Comprehensive comments for complex logic, API endpoints, and database schema.

Troubleshooting
"Database connection failed": Ensure sqlite3 is correctly installed and your DATABASE_URL in .env is correct. Run npm run init-db first.

"No files uploaded" / "Invalid file type": Check your multer configuration in routes/modelRoutes.js and ensure you are uploading GLB or GLTF files.

"Unauthorized" / Redirects to login: Ensure you are logged in. For API routes, ensure your session cookie is being sent with the request.

_method not working: Ensure method-override middleware is correctly applied in server.js (app.use(methodOverride('_method'))).

Feel free to open an issue or contribute if you find any bugs or have suggestions for improvements!


---

### 24. `.gitignore` (Good Practice)

It's good practice to include a `.gitignore` file to prevent unnecessary files from being committed to version control.

```gitignore
# Node
node_modules/
.env
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.sqlite
data/*.sqlite # Ignore the actual database file
sessions/     # Ignore session files
uploads/      # Ignore uploaded files in version control (keep directory, but not content)