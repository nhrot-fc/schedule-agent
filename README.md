# Python Backend Template

## Prerequisites
- uv: modern Python package manager.
- Docker: engine and compose plugins.
- Visual Studio Code: editor (optional).

## Installation

Clone the repository.
```bash
$ git clone git@github.com:ManuelLoaizaV/python-backend-template.git
$ cd python-backend-template
```

Install [Visual Studio Code](https://code.visualstudio.com/Download) and the
[Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python),
[Ruff](https://marketplace.visualstudio.com/items?itemName=charliermarsh.ruff),
[ty](https://marketplace.visualstudio.com/items?itemName=astral-sh.ty),
and [GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens) extensions.

Setup the `.vscode/settings.json` file with the contents of the `.vscode/settings.json.example` file.
```bash
$ cp .vscode/settings.json.example .vscode/settings.json
```

Create the `.env` file from the `.env.example` file and fill the required values. Do not commit secrets or large files.
You **must** ask for the required values from another member of the backend team.

Install [uv](https://docs.astral.sh/uv/) and install either the development or production dependencies.
```bash
# Install all dependencies including dev tools
$ uv sync --all-groups
# Or install only production dependencies
$ uv sync
```

## Testing

This project uses `pytest` for testing.
Tests are organized into three categories:
`unit`, `integration` and `e2e`.

### Running tests with Docker

The most reliable way to run the full test suite is by
using the provided Docker Compose setup.
This ensures tests run in a clean.
containerized environment with all dependencies.

```bash
$ make test
```

You can start the application using the development server
to ensure all services are running.
The command below will also apply any pending
database migration before starting the server.

```bash
$ make dev
```

For more information about **Makefile** commands,
read [Makefile.md](docs/Makefile.md).

### API access points

Once the application is running, the API will be available at the following links:
- **Application**: http://localhost:8000
- **Health Check**: http://localhost:8000/healthz
- **Interactive docs**: http://localhost:8000/docs
- **OpenAPI spec**: http://localhost:8000/openapi.json

## Code conventions

Ensure your code follows these conventions before committing:
- **Commit Messages**: use [Conventional Commits](https://conventionalcommits.org/)
  - `feat(users): add email validation`
  - `fix(api): handle duplicate user creation`
  - `docs(readme): update deployment guide`
- **Code Style**: follow Ruff configuration in `pyproject.toml`

If you have done changes to the database schema,
remember to create a new migration:

```bash
$ uv run alembic revision --autogenerate -m "describe your changes"
```

