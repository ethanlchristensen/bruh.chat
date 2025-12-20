.PHONY: run, cel

run:
	poetry run daphne -b 0.0.0.0 -p 8000 config.asgi:application

cel:
	poetry run celery -A config worker --loglevel=info --pool=solo