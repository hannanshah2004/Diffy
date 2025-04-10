# AI-Powered Changelog Generator

A full-stack application for automatically generating user-friendly changelogs from Git commits using AI.

![Greptile](https://prod-files-secure.s3.us-west-2.amazonaws.com/bf6af4dc-1413-4e62-ab50-02b018be0bc3/2792fa11-8feb-44d5-93ca-05a49b18ac12/Greptile_(16).png)

## Features

- **AI-Powered Changelog Generation:** Analyzes Git commits fetched from GitHub and generates user-friendly changelog entries.
- **GitHub Integration:** Fetches commits directly from any GitHub repository using user-provided credentials.
- **Two Generation Modes:**
  - **Recent Mode:** Generate from the most recent commits
  - **Comprehensive History Mode:** Generate multiple changelog entries spanning the entire repository history
- **User-friendly Dashboard:** Input GitHub credentials directly in the UI (no .env file needed).
- **Public Changelog Page:** A clean, searchable, and filterable public-facing changelog website.
- **Client-side Storage:** GitHub tokens are stored in the browser's localStorage for convenience.
- **Separate Frontend/Backend:** Clean separation of concerns with API-based architecture.

## Architecture Overview

The application consists of two main components:

1. **Frontend (React/TypeScript/Vite)**
   - User interface for configuring and triggering changelog generation
   - Public changelog display
   - GitHub credential management

2. **Backend (Express API)**
   - Processes GitHub API requests
   - Handles OpenAI integration
   - Manages database operations

## Getting Started

### Prerequisites

- Node.js (v16+)
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd changelog-generator
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```env
   # Supabase Credentials
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # OpenAI API Key
   OPENAI_API_KEY=your_openai_api_key
   
   # Optional API URL override for production
   # VITE_API_URL=https://your-backend-api-url.com/api
   ```

4. Set up the database:
   Run the SQL script in the Supabase SQL editor to create the required table:
   ```sql
   -- scripts/create_changelog_table.sql
   ```

## Development

Run the frontend and backend separately during development:

1. **Frontend:**
   ```bash
   npm run dev
   ```
   This will start the Vite development server at http://localhost:5173

2. **Backend:**
   ```bash
   npm run server
   ```
   This will start the Express API server at http://localhost:3001

## Deployment

This application is designed to be deployed as two separate components:

### Frontend Deployment (Netlify/Vercel/etc.)

1. Build the frontend:
   ```bash
   npm run build:frontend
   ```

2. Deploy the `dist` directory to your preferred hosting service:
   - Netlify: Connect your GitHub repository or drag and drop the `dist` folder
   - Vercel: Connect your GitHub repository and set the build command to `npm run build:frontend`

3. Set environment variables on your hosting provider:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (pointing to your deployed backend)

### Backend Deployment (Render/Railway/etc.)

1. Deploy to a Node.js hosting service:
   - **Render.com**: Create a new Web Service, connect your GitHub repository, set the start command to `npm run start`
   - **Railway.app**: Connect your GitHub repository, add environment variables
   - **Heroku**: Deploy using the Heroku CLI or GitHub integration

2. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `PORT` (optional, typically auto-set by the platform)

3. Update your frontend's `VITE_API_URL` to point to your deployed backend URL.

## Usage

### User Flow

1. **Access the Dashboard:**
   - Navigate to the application in your browser

2. **Enter GitHub Credentials:**
   - Enter your GitHub Personal Access Token (with 'repo' scope)
   - Specify the repository owner (username or organization)
   - Specify the repository name
   - These credentials are stored in your browser's localStorage for convenience

3. **Configure Generation Settings:**
   - Choose between "Recent Commits" or "Full History" mode
   - Set the number of commits or batch settings
   - Optionally provide a version label

4. **Generate Changelog:**
   - Click the "Generate Changelog" button
   - Wait for the generation process to complete
   - View the results in the "Recent Changelogs" panel

5. **View Public Changelog:**
   - Click "View" on any changelog entry to see the public-facing changelog page

### Security Considerations

- GitHub tokens are stored in the browser's localStorage and sent directly to your backend API
- Tokens are never stored on the server (they're only used for the current request)
- For enhanced security in production, consider:
  - Implementing proper authentication for your application
  - Using HTTPS for all API communications
  - Setting appropriate CORS policies on your backend

## Technical Details

### Architecture

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js/Express, GitHub API (Octokit), OpenAI API
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI's API (gpt-4o model)

### Design Decisions

- **GitHub Token Handling:** User-provided through UI rather than environment variables for better UX
- **API-Based Architecture:** Clean separation between frontend and backend for flexible deployment
- **Comprehensive History Mode:** Provides a way to generate a complete project history through batched processing
- **Batch Processing:** Handles large repositories by processing commits in manageable batches
- **Responsive Design:** Mobile-friendly interface with accessible UI components

## License

MIT 