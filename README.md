# gitlab-node-practice

A Next.js contacts app for practicing CI/CD with both [GitLab CI/CD](#how-cicd-works) and [GitHub Actions](#github-actions). Each pipeline delivers a Docker image that runs as a container on a local Windows machine. You can browse and search sample contacts, then send one of them an email.

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

The app needs an SMTP account from an email provider to send email. With `npm run dev`, it still shows and searches contacts without one, and the form shows "Email is not set up yet". Deployments require all five settings and stop if any are missing.

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
| `scripts/watch-deploy.ps1` | Deploys each new image that GitHub Actions publishes |
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

The app runs as a container in the local machine's Docker:

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

The GitLab container doesn't read `.env` or `.env.local`. Add its settings in GitLab under **Settings → CI/CD → Variables**:

| Key | Example | Visibility |
|---|---|---|
| `SMTP_HOST` | `smtp.example.com` | Visible |
| `SMTP_PORT` | `587` | Visible |
| `SMTP_USER` | `you@example.com` | Masked |
| `SMTP_PASS` | Your app password, without spaces | Masked |
| `EMAIL_FROM` | `Your Name <you@example.com>` | Visible |

All five are required. If any are missing, the `deploy` job fails with their names and leaves the running container alone.

Keep **Protect variable** selected, which limits the variables to protected branches such as `main`. They take effect on the next deployment, so rerun the `deploy` job after changing them.

The settings aren't stored in the image, but anyone who can use this machine's Docker can read them with `docker inspect`, so only use this on a machine you trust.

## GitHub Actions

The workflow runs on GitHub-hosted runners, so no runner is needed on your machine. Those runners can't connect to your machine, so your machine fetches each new image itself:

1. **`test`** runs on GitHub, on every push, and runs `npm ci` and `npm test`.
2. **`build`** runs on GitHub, if `test` passes, and builds the Docker image. On `main`, it also publishes the image to the GitHub Container Registry as `ghcr.io/tadelachewu/gitlab-node-practice`.
3. **`scripts/watch-deploy.ps1`** runs on your machine and checks the registry every minute. When there is a new image, it replaces the `contacts-app-github` container and checks that the new commit is serving. If it isn't, the script goes back to the previous image and doesn't retry that image.

A green workflow means the image was published, not that it was deployed. To confirm a deployment, check `watch-deploy.log` in the project folder, or open http://localhost:3001/api/health and compare `commit` with the commit ID on GitHub.

The script only deploys while it and Docker Desktop are running. If either is stopped, it deploys the latest image once both are running again.

You can also start the workflow from **Actions → CI/CD → Run workflow**.

### Set up your machine

Do this once:

1. On GitHub, open **Settings → Developer settings → Personal access tokens → Tokens (classic)** and create a token with only the `read:packages` scope.
2. Log in to the registry, and paste the token when asked for a password:

   ```powershell
   docker login ghcr.io -u <your-github-username>
   ```

3. Put the email settings in `.env` in the project folder, with no `#` in front of them. See `.env.example` for the names. All five are required.
4. Start the script from the project folder, and keep the window open:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\watch-deploy.ps1
   ```

The script and `.env` run from your local copy of the project. Pushing to GitHub doesn't update them, so run `git pull` and restart the script if `scripts/` changes.

### Start the script automatically

To start the script whenever you log on, run this from the project folder instead of step 4, then log off and on again:

```powershell
$action = New-ScheduledTaskAction -Execute powershell.exe -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PWD\scripts\watch-deploy.ps1`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName contacts-app-watch-deploy -Action $action -Trigger $trigger -Settings $settings
```

To remove it, run `Unregister-ScheduledTask contacts-app-watch-deploy`.

### Email in the GitHub deployment

The container gets its email settings from `.env` on your machine, not from GitHub, so GitHub never holds your password. `.env` is never copied into the image.

If `.env` or any setting is missing, the script logs which ones, leaves the running container alone, and checks again every minute, so it deploys once you fix the file.

Settings apply when a new container starts. To apply a change right away, remove the container, and the script creates it again within a minute:

```powershell
docker rm -f contacts-app-github
```

### Push to both

The `origin` remote points to GitLab, and the `github` remote points to GitHub. Push to each one:

```powershell
git push origin main
git push github main
```
