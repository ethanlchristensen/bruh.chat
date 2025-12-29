import logging
from config.celery import app
from asgiref.sync import async_to_sync

from .models import FlowExecution
from .services.flow_execution_service import FlowExecutionService

logger = logging.getLogger(__name__)


@app.task(bind=True, max_retries=3)
def execute_flow_task(self, execution_id: str):
    try:
        logger.info(f"Starting flow execution: {execution_id}")

        execution = FlowExecution.objects.select_related("flow", "user").get(id=execution_id)

        async_to_sync(FlowExecutionService.execute_flow_async)(execution)

        execution.refresh_from_db()

        logger.info(f"Completed flow execution: {execution_id} with status: {execution.status}")
        return {
            "execution_id": execution_id,
            "status": execution.status,
        }

    except FlowExecution.DoesNotExist:
        logger.error(f"FlowExecution not found: {execution_id}")
        raise

    except Exception as e:
        logger.exception(f"Flow execution failed: {execution_id}")

        try:
            execution = FlowExecution.objects.get(id=execution_id)
            execution.status = "failed"
            if not execution.execution_data:
                execution.execution_data = {}
            execution.execution_data["error"] = str(e)
            execution.save()
        except Exception:
            pass

        raise self.retry(exc=e, countdown=60)
