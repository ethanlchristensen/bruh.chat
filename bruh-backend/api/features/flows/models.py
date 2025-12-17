from django.db import models
from django.contrib.auth.models import User
import uuid


class Flow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="flows", db_index=True)

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    # nodes[], edges[], variables{}
    flow_data = models.JSONField(default=dict)

    version = models.IntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "-updated_at"]),
        ]

    def __str__(self):
        return f"{self.name} (v{self.version})"

    def validate_flow_structure(self):
        required_keys = ["nodes", "edges", "variables"]
        for key in required_keys:
            if key not in self.flow_data:
                raise ValueError(f"Flow data missing required key: {key}")

        for node in self.flow_data.get("nodes", []):
            if not all(k in node for k in ["id", "type", "position", "data"]):
                raise ValueError(f"Invalid node structure: {node}")

        return True

    def get_node_count(self):
        return len(self.flow_data.get("nodes", []))

    def get_execution_count(self):
        return self.executions.count()


class FlowExecution(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flow = models.ForeignKey(
        Flow, on_delete=models.CASCADE, related_name="executions", db_index=True
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending", db_index=True
    )

    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    total_execution_time = models.IntegerField(
        null=True, blank=True, help_text="Total execution time in milliseconds"
    )

    # nodeResults[], finalOutput, error{}
    execution_data = models.JSONField(default=dict)

    error_message = models.TextField(blank=True, default="")
    failed_node_id = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-start_time"]
        indexes = [
            models.Index(fields=["flow", "-start_time"]),
            models.Index(fields=["user", "-start_time"]),
            models.Index(fields=["status", "-start_time"]),
        ]

    def __str__(self):
        return f"Execution {self.id} - {self.status}"

    def mark_running(self):
        """Mark execution as running"""
        self.status = "running"
        self.save(update_fields=["status"])

    def mark_completed(self, execution_data):
        """Mark execution as completed with results"""
        from django.utils import timezone

        self.status = "completed"
        self.end_time = timezone.now()
        self.execution_data = execution_data

        if self.start_time and self.end_time:
            delta = self.end_time - self.start_time
            self.total_execution_time = int(delta.total_seconds() * 1000)

        self.save()

    def mark_failed(self, error_message, failed_node_id=None):
        """Mark execution as failed"""
        from django.utils import timezone

        self.status = "failed"
        self.end_time = timezone.now()
        self.error_message = error_message

        if failed_node_id:
            self.failed_node_id = failed_node_id

        if self.start_time and self.end_time:
            delta = self.end_time - self.start_time
            self.total_execution_time = int(delta.total_seconds() * 1000)

        self.save()

    def get_node_results(self):
        """Get all node execution results"""
        return self.execution_data.get("nodeResults", [])

    def get_final_output(self):
        """Get the final output of the flow"""
        return self.execution_data.get("finalOutput")


class NodeExecutionLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    execution = models.ForeignKey(FlowExecution, on_delete=models.CASCADE, related_name="node_logs")

    node_id = models.CharField(max_length=255, db_index=True)
    node_type = models.CharField(max_length=50)

    status = models.CharField(
        max_length=20,
        choices=[
            ("idle", "Idle"),
            ("running", "Running"),
            ("success", "Success"),
            ("error", "Error"),
        ],
        default="idle",
    )

    input_data = models.JSONField(null=True, blank=True)
    output_data = models.JSONField(null=True, blank=True)

    error_message = models.TextField(blank=True, default="")
    error_code = models.CharField(max_length=100, blank=True, default="")
    error_details = models.JSONField(null=True, blank=True)

    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    execution_time = models.IntegerField(
        null=True, blank=True, help_text="Execution time in milliseconds"
    )

    model_used = models.CharField(max_length=255, blank=True, default="")
    tokens_used = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["start_time"]
        indexes = [
            models.Index(fields=["execution", "start_time"]),
            models.Index(fields=["node_id", "status"]),
        ]

    def __str__(self):
        return f"{self.node_type} ({self.node_id}) - {self.status}"

    def mark_completed(self, output_data):
        """Mark node execution as completed"""
        from django.utils import timezone

        self.status = "success"
        self.output_data = output_data
        self.end_time = timezone.now()

        if self.start_time and self.end_time:
            delta = self.end_time - self.start_time
            self.execution_time = int(delta.total_seconds() * 1000)

        self.save()

    def mark_failed(self, error_message, error_code=None, error_details=None):
        """Mark node execution as failed"""
        from django.utils import timezone

        self.status = "error"
        self.error_message = error_message
        self.error_code = error_code or ""
        self.error_details = error_details
        self.end_time = timezone.now()

        if self.start_time and self.end_time:
            delta = self.end_time - self.start_time
            self.execution_time = int(delta.total_seconds() * 1000)

        self.save()


class FlowTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(
        max_length=100,
        choices=[
            ("conversation", "Conversation"),
            ("analysis", "Analysis"),
            ("generation", "Generation"),
            ("other", "Other"),
        ],
        default="other",
    )

    template_data = models.JSONField(default=dict)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    is_public = models.BooleanField(default=True)
    times_used = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-times_used", "-created_at"]

    def __str__(self):
        return self.name

    def clone_to_flow(self, user, name=None):
        """Clone this template to a new Flow for a user"""
        flow = Flow.objects.create(
            user=user,
            name=name or f"{self.name} (Copy)",
            description=self.description,
            flow_data=self.template_data.copy(),
        )

        self.times_used += 1
        self.save(update_fields=["times_used"])

        return flow


class NodeTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(
        max_length=50,
        choices=[
            ("input", "Input"),
            ("llm", "LLM"),
            ("output", "Output"),
        ],
    )

    icon = models.CharField(max_length=50, default="circle")
    color = models.CharField(max_length=20, default="blue")

    default_config = models.JSONField(default=dict)

    category = models.CharField(
        max_length=100,
        choices=[
            ("input_output", "Input/Output"),
            ("processing", "Processing"),
            ("logic", "Logic"),
            ("integration", "Integration"),
        ],
        default="processing",
    )

    is_active = models.BooleanField(default=True)
    is_premium = models.BooleanField(default=False)

    display_order = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "display_order", "name"]

    def __str__(self):
        return f"{self.name} ({self.type})"
