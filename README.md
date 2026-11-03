# gitlab-node-practice

A Next.js contacts app for practicing CI/CD with runners on a local Windows machine, using both [GitLab CI/CD](#how-cicd-works) and [GitHub Actions](#github-actions). Each pipeline builds a Docker image and runs it as a container on that machine. You can browse and search sample contacts, then send one of them an email.

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

### Run it in Docker

You need Docker Desktop running. To build and run the image yourself on port 3000:

```powershell
docker build -t contacts-app:local .
docker run --rm -p 127.0.0.1:3000:3000 contacts-app:local
```

## Set up email

The app shows and searches contacts without any setup, but sending needs an SMTP account from an email provider. Until it is set up, the form shows "Email is not set up yet".

1. Copy `.env.example` to `.env.local`.
2. Fill in your provider's SMTP details. Many providers, such as Gmail, require an app password rather than your normal password.
3. Restart `npm run dev`.

The sample contacts use `example.com` addresses, which can't receive mail. To test sending, put your own address on a contact in `src/lib/contacts.mjs`.

`.env.local` is ignored by Git and Docker and is used only by `npm run dev`. Never commit it or put your password in `.gitlab-ci.yml` or a GitHub workflow file.

## How the app works

The contacts page runs in the browser. When you send an email, it posts the contact's ID, the subject, and the message to `/api/send-email`. The server finds that contact's address and sends the email with [Nodemailer](https://nodemailer.com/).

| Route | Purpose |
|---|---|
| `/` | The contacts page |
| `POST /api/send-email` | Sends an email to a contact |
| `GET /api/health` | Returns `{"status":"ok","commit":"<commit ID>"}` |

`commit` shows which commit is running. It is `local` unless the app was built by a pipeline.

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
| `Dockerfile` | Builds the app and packages it as an image |
| `scripts/build.js` | Assembles `dist/` and writes `build-info.json` |
| `scripts/build-image.ps1` | Builds the Docker image for a commit |
| `scripts/deploy.ps1` | Replaces the running container and checks that the new one is serving |
| `.gitlab-ci.yml` | Defines the GitLab pipeline |
| `.github/workflows/ci-cd.yml` | Defines the GitHub Actions workflow |

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
2. **`build`** builds a Docker image tagged `contacts-app:<commit ID>`. It stays in this machine's Docker, so no registry is needed.
3. **`deploy`** removes the running container and starts a new one from that image. The job fails unless the new commit is serving within 30 seconds.

### Runner requirements

Jobs run on a GitLab Runner on your own machine, using the `local-windows` tag and the shell executor. For a job to run:

- The runner must be running. Otherwise, jobs stay **pending** until it starts:

  ```powershell
  cd C:\GitLab-Runner
  .\gitlab-runner.exe run
  ```

- Docker Desktop must be running, and the runner's account must be able to use it.
- Node.js and Git must be installed on the machine.
- The shell set in the runner's `config.toml` must be installed. If it is `pwsh`, that means PowerShell 7.

## Where it is deployed

The app runs as a container in the Docker on the machine running the runner:

| | GitLab | GitHub Actions |
|---|---|---|
| App address | http://localhost:3000 | http://localhost:3001 |
| Container | `contacts-app-gitlab` | `contacts-app-github` |

The containers accept connections only from that machine.

To confirm which version is running, open `/api/health` at the app's address and compare `commit` with the commit ID in GitLab or GitHub.

### How the app keeps running

Containers use the `unless-stopped` restart policy, so Docker restarts them if the app crashes and when Docker Desktop starts. To bring them back after a reboot, turn on **Settings → General → Start Docker Desktop when you sign in**.

These examples use the GitLab container:

| To do this | Run this in PowerShell |
|---|---|
| Check the container | `docker ps --filter name=contacts-app` |
| See the logs | `docker logs --tail 20 contacts-app-gitlab` |
| Stop the app | `docker stop contacts-app-gitlab` |
| Start the app again | `docker start contacts-app-gitlab` |
| List the images | `docker image ls contacts-app` |
| Delete an old image | `docker image rm contacts-app:<commit ID>` |

Each commit adds an image, and old images aren't deleted automatically.

If the job fails because the port is in use, stop whatever is using it, such as `npm run dev`, then retry the job.

### Email in the deployed app

The container doesn't read `.env` or `.env.local`. Add its settings in GitLab under **Settings → CI/CD → Variables**:

| Key | Example | Visibility |
|---|---|---|
| `SMTP_HOST` | `smtp.example.com` | Visible |
| `SMTP_PORT` | `587` | Visible |
| `SMTP_USER` | `you@example.com` | Masked |
| `SMTP_PASS` | Your app password, without spaces | Masked |
| `EMAIL_FROM` | `Your Name <you@example.com>` | Visible |

Keep **Protect variable** selected, which limits the variables to protected branches such as `main`. They take effect on the next deployment, so rerun the `deploy` job after changing them.

The settings aren't stored in the image, but anyone who can use this machine's Docker can read them with `docker inspect`, so only use this on a machine you trust.

## GitHub Actions

The sections above describe GitLab. The GitHub Actions workflow runs the same `test`, `build`, and `deploy` jobs, with the same triggers. You can also start it from **Actions → CI/CD → Run workflow**.

The two pipelines run independently, and each deploys its own container, as shown in [Where it is deployed](#where-it-is-deployed).

### Set up the GitHub runner

Keep the GitHub repository private. Jobs run on your own machine, so anyone who can change a workflow can run commands there.

1. On GitHub, open **Settings → Actions → Runners → New self-hosted runner** and select **Windows** and **x64**.
2. Run the commands GitHub shows, accepting the default labels. They download the runner, configure it, and start it with `run.cmd`.

The runner must be running. Otherwise, jobs stay **queued** until it starts:

```powershell
cd C:\actions-runner
.\run.cmd
```

Docker Desktop must be running too.

### Email in the GitHub deployment

Add the settings under **Settings → Secrets and variables → Actions**, then rerun the `deploy` job:

| Name | Example | Tab |
|---|---|---|
| `SMTP_HOST` | `smtp.example.com` | Variables |
| `SMTP_PORT` | `587` | Variables |
| `EMAIL_FROM` | `Your Name <you@example.com>` | Variables |
| `SMTP_USER` | `you@example.com` | Secrets |
| `SMTP_PASS` | Your app password | Secrets |

### Push to both

The `origin` remote points to GitLab, and the `github` remote points to GitHub. Push to each one:

```powershell
git push origin main
git push github main
```
