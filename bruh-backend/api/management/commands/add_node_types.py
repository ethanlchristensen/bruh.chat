from django.core.management.base import BaseCommand
from api.features.flows.models import Flow


class Command(BaseCommand):
    help = "Add nodeType field to existing flow nodes"

    def handle(self, *args, **options):
        flows = Flow.objects.all()
        updated_count = 0

        for flow in flows:
            flow_data = flow.flow_data
            nodes = flow_data.get("nodes", [])

            updated = False
            for node in nodes:
                # Add nodeType from type if missing
                if "data" in node and isinstance(node["data"], dict):
                    if "nodeType" not in node["data"]:
                        node["data"]["nodeType"] = node.get("type")
                        updated = True

            if updated:
                flow.flow_data = flow_data
                flow.save()
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully updated {updated_count} flows"))
