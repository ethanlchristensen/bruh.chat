.PHONY: run migrate migrations superuser shell test

run:
	poetry run daphne -b 0.0.0.0 -p 8000 config.asgi:application

migrate:
	poetry run python manage.py migrate

migrations:
	poetry run python manage.py makemigrations

superuser:
	poetry run python manage.py createsuperuser

shell:
	poetry run python manage.py shell

test:
	poetry run python manage.py test