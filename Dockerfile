FROM python:3.13
COPY --from=ghcr.io/astral-sh/uv:0.10.9 /uv /uvx /bin/

WORKDIR /app

COPY src ./src
COPY pyproject.toml ./
COPY uv.lock ./

ENV PYTHONPATH=/app/src

RUN uv sync

EXPOSE 8000/tcp

ENTRYPOINT ["uv", "run"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
