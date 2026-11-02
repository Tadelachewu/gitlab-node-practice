# gitlab-node-practice

A small Node.js web server for practicing GitLab CI/CD with a runner on a local Windows machine. It has no external dependencies.

## Run the app

You need [Node.js](https://nodejs.org/) installed. The commands below use PowerShell.

```powershell
npm test     # run the tests
npm start    # start the server on http://localhost:3000
```

Press `Ctrl+C` to stop the server.

To use a different port:

```powershell
$env:PORT = 4000
npm start
```

## How the app works

The server responds with JSON:

| Route | Status | Response |
|---|---|---|
| `/` | 200 | `{"message":"Hello from GitLab CI/CD!"}` |
| `/health` | 200 | `{"status":"ok","commit":"<commit ID>"}` |
| Anything else | 404 | `{"error":"Not found"}` |

`commit` shows which commit is running. It is `local` unless the app was built by the pipeline.

| File | Purpose |
|---|---|
| `src/app.js` | Defines the routes and responses |
| `src/server.js` | Starts the server |
| `test/app.test.js` | Tests each type of route |
| `scripts/build.js` | Copies `src/` to `dist/` and writes `build-info.json` |
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

The deploy job only copies files. It doesn't start or restart the server, so do that yourself after each deployment:

```powershell
node $env:USERPROFILE\deployments\gitlab-node-practice\server.js
```

To confirm which version is running, open http://localhost:3000/health and compare `commit` with the commit ID in GitLab.
