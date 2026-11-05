# gitlab-node-practice

A Next.js contacts app for practicing CI/CD with both [GitLab CI/CD](#how-cicd-works) and [GitHub Actions](#github-actions). Each pipeline delivers a Docker image that runs as a container on a local Windows machine. You can browse, search, add, and edit contacts, then send one of them an email.

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

The contacts page runs in the browser. Select a contact to email them, use **Edit contact** to change their details, or use **Add contact** to create a new one. When you send an email, the page posts the contact's ID, the subject, and the message to `/api/send-email`. The server finds that contact's address and sends the email with [Nodemailer](https://nodemailer.com/).

Contacts start as six samples. The first time you add or edit one, the whole list is saved to `contacts.json` in the folder set by `DATA_DIR`, which defaults to `data/` in the folder the server runs from. With `npm run dev`, that is `data/` in the project folder, which is ignored by Git.

| Route | Purpose |
|---|---|
| `/` | The contacts page |
| `POST /api/contacts` | Adds a contact |
| `PUT /api/contacts/<id>` | Updates a contact |
| `POST /api/send-email` | Sends an email to a contact |
| `GET /api/health` | Returns `{"status":"ok","commit":"<commit ID>"}` |

`commit` shows which commit is running. It is `local` unless the app was built by a pipeline.

The app has no login. Anyone who can reach it can add any address as a contact and send email to it from your email account, so keep it on your own machine. `npm run dev` and the deployed containers accept connections only from that machine.

| File | Purpose |
|---|---|
| `src/app/page.js` | Loads the contacts page |
| `src/components/ContactsApp.js` | The contact list, search, and email form |
| `src/components/ContactForm.js` | The form for adding and editing a contact |
| `src/app/api/contacts/` | Validates and saves added and edited contacts |
| `src/app/api/send-email/route.js` | Validates a request and sends the email |
| `src/app/api/health/route.js` | The health check |
| `src/lib/contacts.mjs` | The sample contacts, search logic, and contact validation |
| `src/lib/contact-store.mjs` | Reads and saves `contacts.json` |
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

### Where contacts are kept

Each container saves its contacts in its own Docker volume, `contacts-app-gitlab-data` or `contacts-app-github-data`, so they survive deployments and restarts. The two deployments don't share contacts.

Removing a container, as in [Email in the GitHub deployment](#email-in-the-github-deployment), keeps its contacts. Deleting the volume with `docker volume rm` permanently deletes them, and the app goes back to the samples.

To save a copy of the GitHub deployment's contacts:

```powershell
docker cp contacts-app-github:/app/data/contacts.json .\data\contacts-backup.json
```

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

### Test Vault with a self-hosted runner

This optional job reads the email settings from Vault instead of `.env`. It is off by default, and the setup above keeps working either way.

When the `CICD_SELF_HOSTED` repository variable is `true`, `test` and `build` still run on GitHub, and a `deploy-vault` job then runs on your machine. GitHub-hosted runners can't reach a Vault on your machine, and only workflow jobs get a GitHub OIDC token, so a job on your machine is the one place that has both.

The job logs in to Vault at `http://127.0.0.1:8200`, reads `secret/apps/gitlab-node-practice/smtp`, and deploys its own copy of the app:

| | `watch-deploy.ps1` | `deploy-vault` job |
|---|---|---|
| App address | http://localhost:3001 | http://localhost:3002 |
| Container | `contacts-app-github` | `contacts-app-vault` |
| Contacts volume | `contacts-app-github-data` | `contacts-app-vault-data` |
| Email settings | `.env` | Vault |

To set it up:

1. Store the five settings in Vault, using these exact names:

   ```powershell
   vault kv put secret/apps/gitlab-node-practice/smtp `
     SMTP_HOST="smtp.example.com" `
     SMTP_PORT="587" `
     SMTP_USER="you@example.com" `
     SMTP_PASS="your-app-password" `
     EMAIL_FROM="Your Name <you@example.com>"
   ```

2. Allow the job to read them. `bound_claims` must match the capitals in the repository's name on GitHub, because Vault compares it exactly. `bound_audiences` must match `$Audience` in `scripts/deploy-vault.ps1`.

   ```powershell
   vault policy write github-smtp-read github-smtp-read.hcl

   @'
   {
     "role_type": "jwt",
     "user_claim": "repository",
     "bound_audiences": ["https://github.com/tadelachewu"],
     "bound_claims": {
       "repository": "Tadelachewu/gitlab-node-practice",
       "ref": "refs/heads/main"
     },
     "token_policies": ["github-smtp-read"],
     "token_ttl": "5m"
   }
   '@ | Set-Content .\github-actions-role.json -Encoding ascii

   vault write auth/jwt/role/github-actions "@github-actions-role.json"
   Remove-Item .\github-actions-role.json
   ```

   The role is written from a file because Windows PowerShell can strip the double quotes from JSON passed directly to a command.

3. On GitHub, open **Settings → Actions → Runners → New self-hosted runner** and select **Windows** and **x64**. Run the commands GitHub shows, accepting the default labels and answering `N` to running as a service, so the job can use your Docker Desktop. Then start the runner with `.\run.cmd`, and keep the window open.
4. Under **Settings → Secrets and variables → Actions → Variables**, add `CICD_SELF_HOSTED` with the value `true`.
5. Push to `main`, or use **Run workflow**. The machine must already be logged in with `docker login ghcr.io`.

To confirm it worked, open http://localhost:3002/api/health and compare `commit` with the commit ID on GitHub. To turn it off, delete the variable. If the variable is `true` and the runner isn't running, the workflow waits on `deploy-vault` until the runner starts or GitHub times the job out.

Keep the repository private while this runner is registered, because anyone who can change a workflow could run commands on your machine.

### Push to both

The `origin` remote points to GitLab, and the `github` remote points to GitHub. Push to each one:

```powershell
git push origin main
git push github main
```


amazing cicd