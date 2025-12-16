# bruh.chat

A modern, full-stack AI chat application that provides access to multiple AI models through OpenRouter API. Built with Django Ninja and React, featuring support for image generation, file uploads, reasoning models, and streaming responses.

![Application Screenshot](README/chatpage.png)

## ✨ Features

- 🤖 **Multi-Model Support** - Access to numerous AI models via OpenRouter API
- 🖼️ **Image Generation** - Create images using AI models
- 📁 **File & Image Upload** - Upload and process files and images
- 🧠 **Reasoning Support** - Advanced reasoning capabilities with supported models
- ⚡ **Real-time Streaming** - Streaming responses for better UX
- 🐳 **Docker Support** - Easy deployment with Docker Compose
- 🎨 **Modern UI** - Clean interface built with shadcn components
- ✨ **Personas** - Create your own Personas guided with instructions and sample dialogue

![Personas Screenshot](README/personas.png)

## 🛠️ Tech Stack

### Backend
- **Python 3.13**
- **Django** with **Django Ninja** (API framework)
- **Daphne** (ASGI server)
- **Poetry** (dependency management)

### Frontend
- **React** with **TypeScript**
- **Vite** (build tool)
- **TailwindCSS** (styling)
- **shadcn/ui** (component library)
- **TanStack Router** (routing)
- **TanStack Query** (data fetching)
- **Nginx** (production server)

## 📋 Prerequisites

### For Local Development
- Python 3.13+
- Node.js 20+
- Poetry

### For Docker Deployment
- Docker
- Docker Compose

## 🚀 Getting Started

### Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/ethanlchristensen/bruh.chat.git
   cd bruh.chat
   ```

2. **Create configuration files**
   
   Create `bruh-backend/config.json` from the sample:
   ```bash
   cp bruh-backend/sample.config.json bruh-backend/config.json
   ```
   
   Edit `config.json` with your settings:
   ```json
   {
      "open_router": {
         "open_router_api_key": "sk-...",
         "open_router_default_model": "openai/gpt-5-nano"
      },
      "ollama": {
         "ollama_host": "localhost:11434",
         "ollama_default_model": null
      },
      "allowed_hosts": [
         "localhost",
         "127.0.0.1"
      ],
      "media_root": "media"
   }
   ```

3. **Create environment file**
   ```bash
   cp .env-sample .env
   ```
   
   Edit `.env` with your settings:
   ```env
   DJANGO_SUPERUSER_USERNAME=admin
   DJANGO_SUPERUSER_EMAIL=admin@example.com
   DJANGO_SUPERUSER_PASSWORD=secure_password_here
   SECRET_KEY=your_django_secret_key_here
   
   VITE_APP_BACKEND_API_URL=http://localhost:8001
   VITE_APP_BACKEND_API_VERSION=api
   ```

4. **Start the application**
   ```bash
   docker-compose up --build -d
   ```

5. **Access the application**
   - Frontend: http://localhost:5174
   - Backend API: http://localhost:8001
   - Admin Panel: http://localhost:8001/admin

### Local Development

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd bruh-backend
   ```

2. **Install dependencies**
   ```bash
   poetry install
   ```

3. **Set up configuration**
   - Copy `sample.config.json` to `config.json`
   - Update with your OpenRouter API key and settings

4. **Run migrations**
   ```bash
   poetry run python manage.py migrate
   ```

5. **Create superuser**
   ```bash
   poetry run python manage.py createsuperuser
   ```

6. **Start development server**
   ```bash
   poetry run python manage.py runserver
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd bruh-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.sample .env
   ```
   
   Update with your backend URL:
   ```env
   VITE_APP_BACKEND_API_URL=http://localhost:8000
   VITE_APP_BACKEND_API_VERSION=api
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Backend Configuration (`bruh-backend/config.json`)

- `open_router_api_key`: Your OpenRouter API key
- `open_router_default_model`: Default AI model to use
- `allowed_hosts`: List of allowed hosts for Django
- `media_root`: Directory for media file storage

### Environment Variables

See `.env-sample` for all available environment variables.

## 📦 Docker Services

- **bruhbackend**: Django backend (port 8001)
- **bruhfrontend**: React frontend with Nginx (ports 5174, 8443)

Volumes:
- `db_data`: SQLite database persistence
- `media_data`: Uploaded media files

## 🔮 Future Plans

- 🦙 **Ollama Integration** - Support for locally hosted models via Ollama
- 📊 **Intents** - Various different use cases that can be invoked with slash commands. (Currently the only intents are default chat and image generation)

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for more details.

---

Built with ❤️ by `bruh`
![bruhshelllogo](README/bruhshelllogo2.png)