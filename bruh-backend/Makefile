.PHONY: help dev stop logs migrate seed shell superuser clean restart

help:
	@echo Available commands:
	@echo   make dev         - Start all services (Redis + Celery + Backend + Frontend)
	@echo   make stop        - Stop all services
	@echo   make restart     - Restart all services
	@echo   make logs        - View all logs
	@echo   make logs-backend    - View backend logs
	@echo   make logs-celery     - View Celery logs
	@echo   make logs-redis      - View Redis logs
	@echo   make migrate     - Run database migrations
	@echo   make seed        - Seed initial data
	@echo   make shell       - Open Django shell
	@echo   make superuser   - Create superuser
	@echo   make clean       - Stop and remove all containers and volumes

# Start all services
dev:
	docker-compose up --build

# Start in detached mode
dev-detached:
	docker-compose up -d --build

# Stop all services
stop:
	docker-compose down

# Restart services
restart:
	docker-compose restart

# View logs
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f bruhbackend

logs-celery:
	docker-compose logs -f celery

logs-redis:
	docker-compose logs -f redis

# Database operations
migrate:
	docker-compose exec bruhbackend python manage.py migrate

seed:
	docker-compose exec bruhbackend python manage.py seed_node_templates

# Development tools
shell:
	docker-compose exec bruhbackend python manage.py shell

superuser:
	docker-compose exec bruhbackend python manage.py createsuperuser

# Testing
test:
	docker-compose exec bruhbackend python manage.py test

# Cleanup
clean:
	docker-compose down -v
	@echo All containers and volumes removed

# Check service status
status:
	docker-compose ps

# Rebuild specific service
rebuild-backend:
	docker-compose up -d --build bruhbackend celery

rebuild-frontend:
	docker-compose up -d --build bruhfrontend