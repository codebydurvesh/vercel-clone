# Next.js Frontend Flow

This frontend is a small deployment UI for the Vercel-clone backend.

## How It Works

1. User enters a GitHub repo URL (or copies the sample test repo in idle state).
2. On Upload, frontend calls upload-service `POST /deploy`.
3. Backend returns a deployment `id`; frontend starts polling `GET /status/:id` every 2 seconds.
4. Status moves from `uploading` -> `building` -> `deployed`.
5. When status is `deployed`:
   - Upload form is hidden.
   - Frontend shows deployed URL: `http://{id}.{BACKEND_REQ_HOST}:3001/index.html`.
   - Frontend requests `/api/snapshot` to render a static preview image.
6. While snapshot is generating, a loading overlay is shown. If snapshot fails, a fallback message is shown.

## Required Frontend Env

Create `.env` inside `nextjs-frontend`:

```env
NEXT_PUBLIC_BACKEND_UPLOAD_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_REQ_URL=http://localhost:3001
```

## Run

```bash
npm install
npm run dev
```
