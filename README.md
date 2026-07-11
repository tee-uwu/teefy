# Teefy 🎵 📼

Teefy is a lightweight, single-page web application that brings a retro aesthetic to a shared community music library. Users can upload their favorite tracks, browse a universal library, and play music through dynamic, nostalgically designed vinyl and cassette interfaces. 

## Features

*   **Single-Page Architecture**: The entire application frontend is contained within a single `index.html` file.
*   **Authentication**: Secure user sign-up and login functionality is powered by Supabase Auth.
*   **Universal Library**: Any authenticated user can upload audio tracks to the shared public database.
*   **Community Playback**: Every logged-in user can browse and play tracks uploaded by others in the universal library.
*   **Retro Interfaces**: Users can toggle between a neumorphic vinyl record player and a classic cassette tape UI.
*   **Automatic Metadata Extraction**: The app uses `jsmediatags` client-side to automatically pull ID3 tags (title, artist, cover art) from uploaded audio files.
*   **Direct Streaming**: The HTML5 `<audio>` element streams music directly from public Supabase Storage URLs.

## Tech Stack

*   **Frontend**: HTML, vanilla JavaScript, and Tailwind CSS (via CDN).
*   **Backend/BaaS**: Supabase (Auth, PostgreSQL, Storage).
*   **Dependencies**: `jsmediatags` for local file reading.

## Setup & Deployment

### 1. Database & Storage Configuration
You will need a Supabase account and project to host the database and audio files. 

*   Create a new project in your Supabase dashboard.
*   Navigate to the SQL Editor in your Supabase dashboard.
*   Paste and run the contents of `setup.sql`.
*   This script will create the `songs` table to store metadata.
*   The script also configures Row Level Security (RLS) so users can only delete their own uploads while allowing everyone to browse.
*   Finally, the script automatically creates two public storage buckets: `audio-files` and `cover-art`.

### 2. Application Setup
*   Navigate to **Project Settings → API** in your Supabase dashboard.
*   Copy your Project URL and your `anon` public key.
*   Open `index.html` and paste these values into the `SUPABASE_URL` and `SUPABASE_ANON_KEY` constants near the top of the script tag.
*   Deploy the `index.html` file to any static hosting service (e.g., Netlify, GitHub Pages, Vercel). 

## Known Limitations & Roadmap

*   **File Size Limits**: To accommodate the Supabase free tier, client-side uploads are currently capped at 25MB via the `MAX_UPLOAD_MB` constant.
*   **Free Tier Constraints**: The default Supabase free plan provides 1GB of storage and 5GB of monthly bandwidth, which is ideal for small groups but will require a paid plan for larger public deployment. 
*   **AI Lore Feature**: The codebase includes styles for a lore modal that requires a Google Gemini API key to function.
*   **Password Reset**: Supabase supports password resets natively, but the UI flow for this feature is not yet built into the frontend application.
*   **Track Deletion**: Database policies are already configured to allow users to delete their own tracks. However, the frontend currently lacks a delete button in the Library UI to trigger this action.

![image alt](https://github.com/tee-uwu/teefy/blob/3ef3716a17e6f61f3062032dff49925879a66f48/c6a375e4-2b00-48e9-866c-28742cb99f68.png)
