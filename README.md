# AI-Powered Changelog Generator

A developer tool for automatically generating user-friendly changelogs from Git commits using AI.

![Greptile](https://prod-files-secure.s3.us-west-2.amazonaws.com/bf6af4dc-1413-4e62-ab50-02b018be0bc3/2792fa11-8feb-44d5-93ca-05a49b18ac12/Greptile_(16).png)

## Features

- **AI-Powered Changelog Generation:** Analyzes Git commits fetched from GitHub and generates user-friendly changelog entries.
- **Developer Dashboard:** Interface for triggering changelog generation (shows instructions).
- **Public Changelog Page:** A clean, searchable, and filterable public-facing changelog website.
- **Database Integration:** Stores and manages changelog entries with Supabase.
- **GitHub Integration:** Fetches commits directly from a specified GitHub repository.

## Getting Started

### Prerequisites

- Node.js (v16+)
- Supabase account
- OpenAI API key
- GitHub Personal Access Token (PAT) with `repo` scope.

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
   
   # GitHub Configuration for backend script
   GITHUB_TOKEN=your_github_personal_access_token # Needs 'repo' scope
   GITHUB_REPO_OWNER=your_github_username_or_org
   GITHUB_REPO_NAME=your_github_repo_name
   
   # GitHub Configuration for frontend display
   VITE_GITHUB_REPO_OWNER=your_github_username_or_org
   VITE_GITHUB_REPO_NAME=your_github_repo_name
   ```

4. Set up the database:
   Run the SQL script in the Supabase SQL editor to create the required table:
   ```sql
   -- scripts/create_changelog_table.sql
   ```

5. Start the development server:
   ```
   npm run dev
   ```

## Usage

### Generating Changelogs

You generate changelogs via the command line:

1.  **Ensure Environment Variables are Set:** Make sure `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, and `GITHUB_REPO_NAME` are correctly set in your `.env` file.
2.  **Run the Script:**
    ```bash
    # Generate from the last 10 commits (default)
    npm run generate-changelog
    
    # Generate from the last 20 commits
    npm run generate-changelog -- --count 20
    
    # Generate with a specific version tag
    npm run generate-changelog -- --count 15 --version "v1.1.0"
    ```

The script will:
   - Fetch the specified number of commits from the configured GitHub repository.
   - Send the commit details to OpenAI for summarization.
   - Save the generated changelog entry to your Supabase database.

### Viewing Changelogs

The public changelog page is available at `/changelog`. It offers:
- Chronological display of changelog entries
- Filtering by category
- Search functionality

## Technical Details

### Architecture

- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend Script:** Node.js/TypeScript script for GitHub API interaction (via Octokit) and OpenAI integration.
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI's API (gpt-4o model)

### Design Decisions

- **GitHub API Integration:** Fetches commits directly from the source repository, removing the need for local git access during generation.
- **Environment Configuration:** Sensitive keys (OpenAI, GitHub PAT) and repository details are managed via environment variables.
- **Separation of Tools:** The changelog generator is separate from the public display, allowing developers to integrate it into their workflow.
- **Markdown Support:** Descriptions are stored and rendered as Markdown for rich formatting.
- **Categorization:** Each changelog entry is categorized for better organization and filtering.
- **Responsive Design:** The public changelog is mobile-friendly.

## License

MIT 