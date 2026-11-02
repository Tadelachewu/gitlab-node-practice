# gitlab-node-practice

A Next.js contacts app for practicing GitLab CI/CD with a runner on a local Windows machine. You can browse and search sample contacts, then send one of them an email.

## Run the app

You need [Node.js](https://nodejs.org/) installed. The commands below use PowerShell.

```powershell
npm install
npm run dev
```

Open http://localhost:3000, and press `Ctrl+C` to stop the server.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the development server, which reloads when you change code |
| `npm test` | Runs the tests |
| `npm run build` | Creates the production build in `dist/` |
| `npm start` | Runs the production build from `dist/` |

## Set up email

The app shows and searches contacts without any setup, but sending needs an SMTP account from an email provider. Until it is set up, the form shows "Email is not set up yet".

1. Copy `.env.example` to `.env.local`.
2. Fill in your provider's SMTP details. Many providers, such as Gmail, require an app password rather than your normal password.
3. Restart `npm run dev`.

The sample contacts use `example.com` addresses, which can't receive mail. To test sending, put your own address on a contact in `src/lib/contacts.mjs`.

`.env.local` is ignored by Git and is used only by `npm run dev`. Never commit it or put your password in `.gitlab-ci.yml`.

## How the app works

The contacts page runs in the browser. When you send an email, it posts the contact's ID, the subject, and the message to `/api/send-email`. The server finds that contact's address and sends the email with [Nodemailer](https://nodemailer.com/).

| Route | Purpose |
|---|---|
| `/` | The contacts page |
| `POST /api/send-email` | Sends an email to a contact |
| `GET /api/health` | Returns `{"status":"ok","commit":"<commit ID>"}` |

`commit` shows which commit is running. It is `local` unless the app was built by the pipeline.

The app can only email people in its contact list, but it has no login, so anyone who can reach it can use your email account to send to those contacts. Keep it on your own machine.

| File | Purpose |
|---|---|
| `src/app/page.js` | Loads the contacts page |
| `src/components/ContactsApp.js` | The contact list, search, and email form |
| `src/app/api/send-email/route.js` | Validates a request and sends the email |
| `src/app/api/health/route.js` | The health check |
| `src/lib/contacts.mjs` | The sample contacts and search logic |
| `src/lib/email.mjs` | Email validation, SMTP settings, and message building |
| `test/` | Tests for the code in `src/lib/` |
| `scripts/build.js` | Assembles `dist/` and writes `build-info.json` |
| `.gitlab-ci.yml` | Defines the pipeline |

## How CI/CD works

### When the pipeline runs

| Event | `test` | `build` | `deploy` |
|---|---|---|---|
| Push to `main` | Yes | Yes | Yes |
| Push to another branch | Yes | Yes | No |
| Push a tag | Yes | Yes | No |

`deploy` runs only on the project's default branch, which is assumed here to be `main`.

You can also start a pipeline from **Build → Pipelines → New pipeline** in GitLab. The same rules apply to the branch you choose.

### What each stage does

The stages run in order, and if one fails, the later stages don't run.

1. **`test`** installs dependencies with `npm ci` and runs `npm test`.
2. **`build`** runs `npm run build` to create `dist/`, then saves it as an artifact for one week.
3. **`deploy`** replaces the deployment folder with the contents of `dist/`.

### Runner requirements

Jobs run on a GitLab Runner on your own machine, using the `local-windows` tag and the shell executor. For a job to run:

- The runner must be running. Otherwise, jobs stay **pending** until it starts:

  ```powershell
  cd C:\GitLab-Runner
  .\gitlab-runner.exe run
  ```

- Node.js and Git must be installed on the machine.
- The shell set in the runner's `config.toml` must be installed. If it is `pwsh`, that means PowerShell 7.

## Where it is deployed

The app is deployed to this folder on the machine running the runner, under the account that runs the runner:

```text
%USERPROFILE%\deployments\gitlab-node-practice
```

Each deployment deletes the folder's previous contents first.

The deploy job only copies files. It doesn't start or restart the server, so do that yourself after each deployment. Setting `HOSTNAME` keeps the app reachable only from your own machine:

```powershell
$env:HOSTNAME = "127.0.0.1"
node $env:USERPROFILE\deployments\gitlab-node-practice\server.js
```

To confirm which version is running, open http://localhost:3000/api/health and compare `commit` with the commit ID in GitLab.

### Email in the deployed app

The deployed app doesn't read `.env.local`. To send email from it, set the same settings in the terminal before starting the server:

```powershell
$env:SMTP_HOST = "smtp.example.com"
$env:SMTP_PORT = "587"
$env:SMTP_USER = "your-username"
$env:SMTP_PASS = "your-password"
$env:EMAIL_FROM = "Your Name <you@example.com>"
```
