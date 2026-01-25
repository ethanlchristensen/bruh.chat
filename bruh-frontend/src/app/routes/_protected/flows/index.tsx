// src/app/routes/_protected/flows/index.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  Copy,
  Edit,
  MoreVertical,
  Workflow,
  Loader2,
} from "lucide-react";
import {
  useFlows,
  useCreateFlow,
  useDeleteFlow,
  useDuplicateFlow,
} from "@/features/flows/api/flows";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import type {
  InputNodeData,
  OutputNodeData,
  FlowNode,
} from "@/types/flow.types";

export const Route = createFileRoute("/_protected/flows/")({
  component: FlowsListPage,
});

function FlowsListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading, error } = useFlows({
    page,
    pageSize: 20,
    search: searchQuery || undefined,
  });

  const createMutation = useCreateFlow();
  const deleteMutation = useDeleteFlow();
  const duplicateMutation = useDuplicateFlow();

  const createInitialNodes = (): FlowNode[] => [
    {
      id: `input_${Date.now()}`,
      type: "input" as const,
      position: { x: 100, y: 200 },
      data: {
        label: "Input",
        status: "idle",
        value: "",
        multiline: false,
        placeholder: "Enter your input...",
        variableName: "userInput",
        handles: [{ id: "output", type: "source", position: "right" }],
      } as InputNodeData,
    },
    {
      id: `output_${Date.now() + 1}`,
      type: "output" as const,
      position: { x: 500, y: 200 },
      data: {
        label: "Output",
        status: "idle",
        format: "text",
        copyable: true,
        downloadable: false,
        handles: [{ id: "input", type: "target", position: "left" }],
      } as OutputNodeData,
    },
  ];

  const handleCreateFlow = async () => {
    try {
      const flow = await createMutation.mutateAsync({
        name: "Untitled Flow",
        description: "",
        nodes: createInitialNodes(),
        edges: [],
      });
      navigate({ to: "/flows/$flowId", params: { flowId: flow.id } });
    } catch (error) {
      console.error("Failed to create flow:", error);
    }
  };

  const handleDeleteClick = (flowId: string, name: string) => {
    setFlowToDelete({ id: flowId, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (flowToDelete) {
      await deleteMutation.mutateAsync(flowToDelete.id);
      setDeleteDialogOpen(false);
      setFlowToDelete(null);
    }
  };

  const handleDuplicate = (flowId: string) => {
    duplicateMutation.mutate(flowId);
  };

    return (
    <div className="flex flex-col h-full">
      <div className="container mx-auto max-w-6xl py-8 px-4 flex flex-col h-full gap-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Flows</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Workflow className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Flows</h1>
              <p className="text-muted-foreground">
                Create and manage your automation workflows
              </p>
            </div>
          </div>
          <Button
            onClick={handleCreateFlow}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            New Flow
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search flows..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        {isLoading && (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading flows...</p>
            </div>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">
                  Failed to load flows
                </p>
                <p className="text-xs text-muted-foreground">{error.message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {data && data.items.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Workflow className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">No flows yet</CardTitle>
              <CardDescription className="mb-4">
                Create your first flow to get started
              </CardDescription>
              <Button onClick={handleCreateFlow}>
                <Plus className="mr-2 h-4 w-4" />
                Create Flow
              </Button>
            </CardContent>
          </Card>
        )}

                {data && data.items.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 overflow-y-auto flex-1 min-h-0 content-start p-2">
              {data.items.map((flow) => (
                <Link
                  key={flow.id}
                  to="/flows/$flowId"
                  params={{ flowId: flow.id }}
                  className="flex-1 min-w-0"
                >
                  <Card className="group hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="group-hover:text-primary transition-colors line-clamp-1">
                          {flow.name}
                        </CardTitle>
                        <FlowDropdownMenu
                          onEdit={() =>
                            navigate({
                              to: "/flows/$flowId",
                              params: { flowId: flow.id },
                            })
                          }
                          onDuplicate={() => handleDuplicate(flow.id)}
                          onDelete={() => handleDeleteClick(flow.id, flow.name)}
                        />
                      </div>
                      {flow.description && (
                        <CardDescription className="line-clamp-2">
                          {flow.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {flow.nodeCount} nodes
                        </Badge>
                        <Badge variant="outline">
                          {flow.executionCount} runs
                        </Badge>
                      </div>
                    </CardContent>

                    <CardFooter className="text-xs text-muted-foreground">
                      Updated{" "}
                      {formatDistanceToNow(new Date(flow.updatedAt), {
                        addSuffix: true,
                      })}
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>

            {(data.hasNext || data.hasPrev) && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!data.hasPrev}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {data.page} of {Math.ceil(data.total / data.pageSize)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.hasNext}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete "
              {flowToDelete?.name}" and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FlowDropdownMenu({
  onEdit,
  onDuplicate,
  onDelete,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
