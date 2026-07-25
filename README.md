# Teefy — retro music player with a shared library

A single-page app (one `index.html` file) with:

- **Login / Sign up** (email + password, via Supabase Auth)
- **Universal library** — any logged-in user can upload a track, and every
  other user can browse and play it
- The original Vinyl / Cassette retro player UI, now playing tracks from
  the shared library instead of local files

No build step, no server code to write — it's a static HTML file that
talks directly to Supabase (a free backend-as-a-service that handles
your users, database, and file storage).

---

## 1. Create your Supabase project (~2 minutes)

1. Go to [supabase.com](https://supabase.com) → **New project** (the free
   tier is enough to get started).
2. Once it's created, open **SQL Editor** in the left sidebar → **New query**.
3. Paste in the entire contents of `supabase-setup.sql` (included alongside
   this file) and click **Run**. This creates:
   - a `songs` table (title, artist, uploader, audio URL, cover URL, duration)
   - security rules so people can only upload as themselves, and can only
     delete their own tracks
   - two storage buckets: `audio-files` and `cover-art`

## 2. Connect the app to your project

1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `index.html`, find this block near the top of the `<script>` tag:

   ```js
   const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-PUBLIC-KEY";
   ```

4. Replace both values with your own, then save.

That's it — the app is now fully wired up to your database and storage.

## 3. (Recommended) Turn off "Confirm email" while testing

By default, Supabase requires new users to click a confirmation link
before they can log in. That's great for production, but slows down
testing. To skip it while you're trying things out:

**Authentication → Sign In / Providers → Email → toggle "Confirm email" off.**

You can turn it back on before sharing the app publicly.

## 4. Try it locally

Just open `index.html` in a browser — no server needed for local testing
(Supabase is a remote API call, not a local file). Sign up, upload an
MP3, log in from another browser/incognito window to confirm the track
shows up for other users too.

## 5. Deploy it for real

Since it's a static file, any static host works. Easiest options:

- **[Netlify Drop](https://app.netlify.com/drop)** — drag the folder in,
  done.
- **Vercel** — `vercel deploy` from this folder, or connect a GitHub repo.
- **GitHub Pages** — push this folder to a repo and enable Pages.

Once deployed, share the URL — anyone who signs up can upload and everyone
sees the shared library.

---

## How it works, in short

- **Auth**: Supabase Auth handles sign up / login / sessions. A user's
  display name is stored as `user_metadata.username` at sign-up time.
- **Uploading**: when you pick an audio file, the app reads its ID3 tags
  (title/artist/cover art) client-side to prefill the form, uploads the
  audio (and cover, if found) to Supabase Storage, then inserts a row
  into the `songs` table with the public URLs.
- **Library**: the Library tab fetches every row from `songs` and lists
  it. Tapping ▶ loads that track (and the rest of the library, so
  next/prev keep working) into the Vinyl/Cassette player.
- **Playback**: the `<audio>` element streams directly from the public
  Supabase Storage URL — nothing is downloaded through your own server.

## Known limits worth knowing about

- **File size**: the app blocks uploads over 25MB client-side
  (`MAX_UPLOAD_MB` near the top of the script) to be considerate of the
  free storage tier. Raise it if you upgrade your plan — Supabase's own
  per-file default limit is 50MB unless you change it in
  **Storage → Configuration**.
- **Free tier storage**: Supabase's free plan currently includes 1GB of
  storage and 5GB of monthly bandwidth. Fine for testing/small groups;
  you'll want a paid plan for a larger public library.
- **The ✨ "lore" button** (the sparkle button that generates a fun fact
  about the current track) calls Google's Gemini API and needs its own
  API key pasted into the `apiKey` constant to work — it's optional
  flavor, unrelated to login/library, and safe to ignore or delete.
- **No password reset flow** yet — Supabase supports it
  (`auth.resetPasswordForEmail`), it's just not wired into this UI. Happy
  to add it if you want it.
- **Deleting tracks** isn't in the UI yet, though the database policies
  already allow a user to delete their own songs — this would just need
  a delete button wired up in the Library tab.
