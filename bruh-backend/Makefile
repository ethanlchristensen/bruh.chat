.PHONY: run, cel, migrations, migrate, format, install, templates

run:
	poetry run daphne -b 0.0.0.0 -p 8000 config.asgi:application

cel:
	poetry run celery -A config worker --loglevel=info --pool=solo

migrations:
	poetry run python manage.py makemigrations

migrate:
	poetry run python manage.py migrate

format:
	poetry run ruff format .

install:
	poetry install

templates:
	poetry run python manage.py seed_node_templates