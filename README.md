# M2 DKAI Internship Tracker — 2027

A personal internship-search dashboard for Muzna Farooq’s six-month M2 DKAI internship, preferably starting in April 2027.

## Features

- Employer/host, project title, location, start timing, duration and research area.
- Provisional fit with ML, NLP, Frugal AI and Hybrid AI interests.
- Application deadlines, recruitment status, document preparation and next actions.
- Combined filters for fit, location, research area and status, plus text search.
- Deadline sorting with unknown dates placed last.
- Application-progress summary and document readiness counts.
- Add, edit and delete opportunities locally.
- Browser-local persistence and JSON backup import/export.
- Responsive layout, labelled controls and keyboard-accessible buttons.

## Repository files

| File | Purpose |
| --- | --- |
| `dist/index.html` | Main page, table, filters, details and editing forms |
| `dist/styles.css` | Styling and responsive layout |
| `dist/app.js` | Rendering, UI events, browser storage and backups |
| `dist/core.js` | Data validation, filtering, sorting and progress calculations |
| `dist/seed.js` | 12 initial internship leads and historical references |
| `tests/core.test.cjs` | Data, validation and sorting checks |
| `tests/interactions.test.cjs` | Application-event, editing, storage and backup checks |
| `package.json` | Project metadata and `npm test` command |
| `.gitignore` | Keeps local files, secrets and tracker backups out of commits |

## Run locally

No build step or JavaScript dependencies are required.

For a quick preview, open `dist/index.html` in a browser. For a consistent browser-storage origin, run the following from the project folder with Python installed:

```bash
python -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`.

Edits are stored per browser and origin. Data saved on the hosted tracker is not automatically included in this repository. Use **Export backup** on the hosted tracker, then **Import** in your local copy to transfer your records.

## Test

With Node.js 18 or newer installed, run:

```bash
npm test
```

The suite checks combined filters, chronological deadline sorting, summary counts, add/edit, document states, reload persistence, backup import/export, deletion, malformed input and storage errors.

Tests use a DOM/event harness. Visual browser QA has not been performed.

## Upload to GitHub

1. Create a repository, for example `m2-dkai-internship-tracker-2027`.
2. Select **Private** to preserve the tracker’s privacy.
3. Extract this ZIP and upload its contents: `dist/`, `tests/`, `README.md`, `package.json` and `.gitignore`.
4. Keep the directory structure intact. Do not upload the ZIP as a substitute for the source files.
5. Commit the files with a message such as `Add 2027 internship tracker`.

The export omits Git history, original hosting identity and credentials. It does not change the deployed tracker or its access settings.

## Data and privacy

The initial data is personalized. Historical leads, tentative research fit, unspecified dates and unconfirmed recruitment progress are labelled accordingly. They are not verified current openings. Add confirmed information as your search develops.

The code uses no external analytics or backend data service, and it does not submit applications. Local storage is not encrypted. Access control for the original hosted tracker is provided by its private hosting; this static export has no built-in login.
