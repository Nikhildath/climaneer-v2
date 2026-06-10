# AquaClimaWeb — Local run instructions (Windows)

This project includes a React + TypeScript frontend and a small Express server. I updated the npm scripts so they work on Windows by using `cross-env`.

Quick start (Windows)

1. Open an Administrator Command Prompt or PowerShell (recommended: Command Prompt to avoid PowerShell execution policy issues).

2. Install dependencies:

```powershell
# Use PowerShell with temporary bypass if you get script execution blocked
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; npm install

# Or open cmd.exe and run:
# npm install
```

3. Start the dev server:

```powershell
# In PowerShell (after install)
npm run dev

# Or in Command Prompt (cmd.exe)
npm run dev
```

Notes and troubleshooting

- If PowerShell blocks running npm (error about npm.ps1 and execution policy), either run the `Set-ExecutionPolicy` command shown above (temporary for the session) or use Command Prompt (cmd.exe).

- The app fetches data from the Firebase Realtime Database via REST (configured URL currently hard-coded to `https://aquaclima-datatabase-default-rtdb.firebaseio.com`). If you want to change the DB URL, update `client/src/App.tsx` or replace with an env var (I can update that next).

- If your Firebase rules require authentication for reads/writes, the simple REST calls will fail. Recommended fixes:
  - Use a small server-side proxy that stores credentials and forwards requests.
  - Or use Firebase SDK with proper auth tokens on the client (more involved).

Windows-specific script changes

- I added `cross-env` to `devDependencies` and updated the `dev`, `build`, and `start` scripts to use `cross-env NODE_ENV=...` which makes those scripts work cross-platform.

If you'd like, I can:
- Move the Firebase URL into an env variable (Vite .env) and update the code.
- Extract Firebase logic into `client/src/lib/firebase.ts` and add tests.
- Add a small server proxy that handles authenticated Firebase access.

If you want me to run `npm install` and `npm run dev` here in the workspace, tell me and I'll try — note: if your machine's PowerShell blocks scripts, the terminal may need the temporary bypass shown above.