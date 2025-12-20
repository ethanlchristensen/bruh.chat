FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VERSION=2.2.0\
    POETRY_HOME="/opt/poetry" \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    PYTHONPATH=/app

ENV PATH="$POETRY_HOME/bin:$PATH"

RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && curl -sSL https://install.python-poetry.org | python3 -

WORKDIR /app

COPY pyproject.toml poetry.lock ./

RUN poetry install --no-root --only main

COPY . .

ENV DJANGO_SETTINGS_MODULE=config.settings \
    STATIC_ROOT=/app/static \
    SECRET_KEY=temp-secret-key-for-build

RUN mkdir -p /app/static && \
    python manage.py collectstatic --noinput

# Flexible entrypoint that accepts commands
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
# If no command provided, run web server\n\
if [ "$1" = "web" ] || [ -z "$1" ]; then\n\
  echo "Running database migrations..."\n\
  python manage.py migrate --noinput\n\
  echo "Ensuring superuser exists..."\n\
  python manage.py ensure_superuser\n\
  echo "Populating Default Flow Templates"\n\
  python manage.py seed_node_templates\n\
  echo "Fxing old node types"\n\
  python manage.py add_node_types\n\
  echo "Starting daphne..."\n\
  exec daphne -b 0.0.0.0 -p 8000 config.asgi:application\n\
elif [ "$1" = "celery" ]; then\n\
  echo "Starting Celery worker..."\n\
  exec celery -A config worker --loglevel=info --pool=solo\n\
else\n\
  # Run custom command\n\
  exec "$@"\n\
fi\n' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["web"]