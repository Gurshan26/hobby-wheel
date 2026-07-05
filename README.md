# Self-Discovery Hobby Wheel

A personal Next.js app for spinning a filtered activity wheel, keeping unfinished activities pending, logging how the activity felt, and watching patterns emerge over time.

## Run Locally

```bash
npm install
npm run dev
```

`npm run dev` generates the Prisma client, applies the checked-in SQLite migration, seeds `activities.json`, then starts Next.js. The seed is idempotent, so rerunning it will not duplicate the 202 activities.

Open `http://localhost:3000`.

## Use From A Phone

Keep the dev server running, find your computer's local network IP, then open:

```text
http://YOUR_LOCAL_IP:3000
```

For a stable phone URL and proper install prompts, deploy to Vercel. This project uses local SQLite through Prisma because it is the simplest single-user setup. Local SQLite is perfect for your computer, but Vercel serverless file storage is not durable for writes. For long-term hosted use, swap the database URL to a hosted SQLite-compatible service such as Turso/libSQL and keep the same Prisma models.

## Data And Weighting

- `activities.json` is seeded into the `Activity` table.
- Starting an activity creates a pending `LogEntry`; completing the log updates that row.
- Weeks 1-4 use random selection while avoiding the last category when possible.
- Weeks 5-8 mildly upweight the top three categories by average Hobby Fit Score after 15 completed logs.
- Week 9+ can show a deepening note when a category has at least five strong completed logs.

Hobby Fit Score is:

```text
enjoyment + curiosity + feltLikeMe + proudCapable + calmAfter - frictionExperienced
```
