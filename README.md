# AI-Powered Changelog Generator

A developer tool for automatically generating user-friendly changelogs from Git commits using AI.

![Greptile](https://prod-files-secure.s3.us-west-2.amazonaws.com/bf6af4dc-1413-4e62-ab50-02b018be0bc3/2792fa11-8feb-44d5-93ca-05a49b18ac12/Greptile_(16).png)

## Features

- **AI-Powered Changelog Generation:** Analyze Git commits and generate user-friendly changelog entries.
- **Developer Dashboard:** Interface for generating changelogs with custom commit ranges and version tags.
- **Public Changelog Page:** A clean, searchable, and filterable public-facing changelog website.
- **Database Integration:** Stores and manages changelog entries with Supabase.

## Getting Started

### Prerequisites

- Node.js (v16+)
- Git repository (local)
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
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
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

You can generate changelogs in two ways:

1. **Web Interface:**
   - Navigate to the dashboard
   - Specify a commit range (e.g., `HEAD~10..HEAD` for the last 10 commits)
   - Optionally add a version number
   - Click "Generate Changelog"

2. **Command Line:**
   ```
   npm run generate-changelog -- --range "HEAD~10..HEAD" --version "1.0.0"
   ```

### Viewing Changelogs

The public changelog page is available at `/changelog`. It offers:
- Chronological display of changelog entries
- Filtering by category
- Search functionality

## Technical Details

### Architecture

- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Node.js script for Git interaction and OpenAI integration
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI's API (gpt-4o model)

### Design Decisions

- **Separation of Tools:** The changelog generator is separate from the public display, allowing developers to integrate it into their workflow.
- **Markdown Support:** Descriptions are stored and rendered as Markdown for rich formatting.
- **Categorization:** Each changelog entry is categorized for better organization and filtering.
- **Responsive Design:** The public changelog is mobile-friendly.

## License

MIT 