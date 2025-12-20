from django.core.management.base import BaseCommand
from api.features.flows.models import NodeTemplate


class Command(BaseCommand):
    help = "Seed initial node templates"

    def handle(self, *args, **options):
        templates = [
            {
                "name": "Text Input",
                "description": "Allows users to input text to start the flow",
                "type": "input",
                "icon": "text-cursor-input",
                "color": "blue",
                "category": "input_output",
                "default_config": {
                    "label": "Text Input",
                    "value": "",
                    "multiline": False,
                    "placeholder": "Enter your input...",
                    "status": "idle",
                    "handles": [{"id": "output", "type": "source", "position": "right"}],
                },
                "display_order": 1,
            },
            {
                "name": "Multi-line Input",
                "description": "Text input with support for multiple lines",
                "type": "input",
                "icon": "file-text",
                "color": "blue",
                "category": "input_output",
                "default_config": {
                    "label": "Multi-line Input",
                    "value": "",
                    "multiline": True,
                    "placeholder": "Enter your text...",
                    "status": "idle",
                    "handles": [{"id": "output", "type": "source", "position": "right"}],
                },
                "display_order": 2,
            },
            {
                "name": "Ollama LLM",
                "description": "Process input with a local Ollama model",
                "type": "llm",
                "icon": "brain",
                "color": "purple",
                "category": "processing",
                "default_config": {
                    "label": "Ollama LLM",
                    "provider": "ollama",
                    "model": "",
                    "systemPrompt": "",
                    "userPromptTemplate": "{{input}}",
                    "temperature": 0.7,
                    "maxTokens": 2000,
                    "stream": True,
                    "maxRetries": 3,
                    "retryDelay": 1000,
                    "status": "idle",
                    "handles": [
                        {"id": "input", "type": "target", "position": "left"},
                        {"id": "output", "type": "source", "position": "right"},
                    ],
                },
                "display_order": 1,
            },
            {
                "name": "OpenRouter LLM",
                "description": "Process input with an OpenRouter model",
                "type": "llm",
                "icon": "zap",
                "color": "purple",
                "category": "processing",
                "default_config": {
                    "label": "OpenRouter LLM",
                    "provider": "openrouter",
                    "model": "",
                    "systemPrompt": "",
                    "userPromptTemplate": "{{input}}",
                    "temperature": 0.7,
                    "maxTokens": 2000,
                    "stream": True,
                    "maxRetries": 3,
                    "retryDelay": 1000,
                    "status": "idle",
                    "handles": [
                        {"id": "input", "type": "target", "position": "left"},
                        {"id": "output", "type": "source", "position": "right"},
                    ],
                },
                "display_order": 2,
            },
            {
                "name": "Text Output",
                "description": "Display the final result as plain text",
                "type": "output",
                "icon": "file-output",
                "color": "green",
                "category": "input_output",
                "default_config": {
                    "label": "Text Output",
                    "format": "text",
                    "copyable": True,
                    "downloadable": False,
                    "status": "idle",
                    "handles": [{"id": "input", "type": "target", "position": "left"}],
                },
                "display_order": 1,
            },
            {
                "name": "Markdown Output",
                "description": "Display the result with markdown formatting",
                "type": "output",
                "icon": "file-text",
                "color": "green",
                "category": "input_output",
                "default_config": {
                    "label": "Markdown Output",
                    "format": "markdown",
                    "copyable": True,
                    "downloadable": True,
                    "status": "idle",
                    "handles": [{"id": "input", "type": "target", "position": "left"}],
                },
                "display_order": 2,
            },
            {
                "name": "JSON Output",
                "description": "Display structured JSON data",
                "type": "output",
                "icon": "braces",
                "color": "green",
                "category": "input_output",
                "default_config": {
                    "label": "JSON Output",
                    "format": "json",
                    "copyable": True,
                    "downloadable": True,
                    "status": "idle",
                    "handles": [{"id": "input", "type": "target", "position": "left"}],
                },
                "display_order": 3,
            },
            {
                "name": "JSON Extractor",
                "description": "Extract values from JSON data using paths",
                "type": "json_extractor",
                "icon": "braces",
                "color": "orange",
                "category": "processing",
                "default_config": {
                    "label": "JSON Extractor",
                    "extractions": [
                        {
                            "key": "output",
                            "path": "$",
                            "fallback": None,
                        }
                    ],
                    "strictMode": False,
                    "outputFormat": "singleValue",
                    "status": "idle",
                    "handles": [
                        {"id": "input", "type": "target", "position": "left"},
                        {"id": "output", "type": "source", "position": "right"},
                    ],
                },
                "display_order": 3,
            },
            {
                "name": "Conditional Router",
                "description": "Route flow to different paths based on conditions",
                "type": "conditional",
                "icon": "git-branch",
                "color": "yellow",
                "category": "processing",
                "default_config": {
                    "label": "Conditional Router",
                    "conditions": [
                        {
                            "id": "condition_1",
                            "operator": "contains",
                            "value": "",
                            "outputHandle": "output_1",
                            "label": "Condition 1",
                        }
                    ],
                    "defaultOutputHandle": "default",
                    "caseSensitive": False,
                    "status": "idle",
                    "handles": [
                        {"id": "input", "type": "target", "position": "left"},
                        {
                            "id": "output_1",
                            "type": "source",
                            "position": "right",
                            "label": "Condition 1",
                        },
                        {
                            "id": "default",
                            "type": "source",
                            "position": "right",
                            "label": "Default",
                        },
                    ],
                },
                "display_order": 4,
            },
            {
                "name": "Image Generator",
                "description": "Generate images from text prompts using AI models",
                "type": "image_gen",
                "icon": "image",
                "color": "pink",
                "category": "processing",
                "default_config": {
                    "label": "Image Generator",
                    "provider": "openrouter",
                    "model": "",
                    "promptTemplate": "{{input}}",
                    "aspectRatio": "1:1",
                    "maxRetries": 3,
                    "retryDelay": 1000,
                    "status": "idle",
                    "handles": [
                        {"id": "input", "type": "target", "position": "left"},
                        {"id": "output", "type": "source", "position": "right"},
                    ],
                },
                "display_order": 3,
            },
            {
                "name": "Image Output",
                "description": "Display generated images",
                "type": "image_output",
                "icon": "image",
                "color": "green",
                "category": "input_output",
                "default_config": {
                    "label": "Image Output",
                    "alt": "Generated image",
                    "maxWidth": 800,
                    "maxHeight": 800,
                    "showPrompt": True,
                    "downloadable": True,
                    "downloadFilename": "generated-image.png",
                    "status": "idle",
                    "handles": [{"id": "input", "type": "target", "position": "left"}],
                },
                "display_order": 4,
            },
        ]

        for template_data in templates:
            NodeTemplate.objects.get_or_create(
                name=template_data["name"],
                type=template_data["type"],
                defaults=template_data,
            )

        self.stdout.write(
            self.style.SUCCESS(f"Successfully seeded {len(templates)} node templates")
        )
