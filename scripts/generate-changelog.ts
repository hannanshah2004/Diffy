#!/usr/bin/env ts-node

import simpleGit from 'simple-git';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Initialize clients
const git = simpleGit();
const openai = new OpenAI({
  apiKey: openaiApiKey,
});
const supabase = createClient(supabaseUrl, supabaseKey);

// Parse command line arguments
const args = process.argv.slice(2);
let range = 'HEAD~10..HEAD'; // Default: last 10 commits
let version: string | null = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--range' && args[i + 1]) {
    range = args[i + 1];
    i++;
  } else if (args[i] === '--version' && args[i + 1]) {
    version = args[i + 1];
    i++;
  }
}

interface Commit {
  hash: string;
  date: string;
  message: string;
  body: string;
  author_name: string;
  author_email: string;
}

interface ChangelogOutput {
  title: string;
  description: string;
  category: string;
}

/**
 * Get commit history from git
 */
async function getCommitHistory(range: string): Promise<Commit[]> {
  try {
    const log = await git.log({ from: range.split('..')[0], to: range.split('..')[1] || 'HEAD' });
    return log.all.map(commit => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      body: commit.body,
      author_name: commit.author_name,
      author_email: commit.author_email,
    }));
  } catch (error) {
    console.error('Error fetching git history:', error);
    return [];
  }
}

/**
 * Generate changelog using OpenAI
 */
async function generateChangelog(commits: Commit[]): Promise<ChangelogOutput | null> {
  if (commits.length === 0) {
    console.error('No commits found for the specified range');
    return null;
  }

  const commitText = commits.map(commit => 
    `${commit.hash.substring(0, 7)} - ${commit.date} - ${commit.author_name}: ${commit.message}\n${commit.body}`
  ).join('\n\n');

  try {
    const prompt = `
You are a developer tool that helps generate user-facing changelogs for software projects.
Please analyze these git commits and generate a professional changelog entry.

Here are the recent commits:

${commitText}

Create a user-friendly changelog with the following:
1. A concise title that summarizes the main changes
2. A brief description explaining the key updates in user-friendly terms
3. Categorize the change as one of: "New Feature", "Enhancement", "Bug Fix", "Breaking Change", "Performance", "Documentation", or "Other"
4. Focus only on what would be relevant and meaningful to end-users
5. Ignore purely internal changes or minor fixes that don't affect the user experience
6. Format the output as compact JSON with fields: title, description, category

JSON output:
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates professional software changelogs from git commits."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content?.trim() || '';
    // Extract JSON from the response
    const jsonMatch = content.match(/```json\n([\s\S]*)\n```/) || content.match(/({[\s\S]*})/);
    
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    } else {
      try {
        return JSON.parse(content);
      } catch (error: unknown) {
        console.error('Failed to parse OpenAI response as JSON:', content);
        console.error('Error details:', error);
        return null;
      }
    }
  } catch (error) {
    console.error('Error generating changelog with OpenAI:', error);
    return null;
  }
}

/**
 * Save the changelog to the database
 */
async function saveChangelog(changelog: ChangelogOutput, version: string | null) {
  try {
    const entry = {
      title: changelog.title,
      description: changelog.description,
      category: changelog.category,
      version: version || null,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('changelog_entries')
      .insert([entry])
      .select();

    if (error) {
      console.error('Error saving to Supabase:', error);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Error saving changelog to database:', error);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(`Fetching commits from range: ${range}`);
    const commits = await getCommitHistory(range);
    console.log(`Found ${commits.length} commits`);

    if (commits.length === 0) {
      console.error('No commits found in the specified range');
      process.exit(1);
    }

    console.log('Generating changelog from commits...');
    const changelog = await generateChangelog(commits);

    if (!changelog) {
      console.error('Failed to generate changelog');
      process.exit(1);
    }

    console.log('\nGenerated Changelog:');
    console.log(JSON.stringify(changelog, null, 2));

    console.log('\nSaving to database...');
    const entry = await saveChangelog(changelog, version);

    if (entry) {
      console.log('Successfully saved changelog entry to database!');
      console.log(`ID: ${entry.id}`);
      console.log(`Title: ${entry.title}`);
      console.log(`Category: ${entry.category}`);
      console.log(`Published At: ${entry.published_at}`);
    } else {
      console.error('Failed to save changelog to database');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 