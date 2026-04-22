import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, Clock } from "lucide-react";
import type { User } from "@/types/api.types";

export const Route = createFileRoute("/_protected/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Redirect or block if not superuser
  if (!user?.is_superuser) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  const { data: unapprovedUsers, isLoading } = useQuery({
    queryKey: ["admin", "unapproved-users"],
    queryFn: async () => {
      return await api.get<User[]>("/users/unapproved");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await api.post(`/users/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "unapproved-users"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await api.delete(`/users/${userId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "unapproved-users"] });
    },
  });

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage system configurations and user approvals.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>
              Users waiting for administrator approval to access the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !unapprovedUsers || unapprovedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed bg-muted/50">
                <CheckCircle className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No pending approvals</p>
                <p className="text-sm text-muted-foreground opacity-75">All users have been approved.</p>
              </div>
            ) : (
              <div className="divide-y border rounded-md">
                {unapprovedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold">{u.username}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground text-right hidden sm:block">
                        Joined<br />
                        {new Date(u.date_joined).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => approveMutation.mutate(u.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          size="sm"
                        >
                          {approveMutation.isPending ? "Approving..." : "Approve"}
                        </Button>
                        <Button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to reject and delete user ${u.username}?`)) {
                              rejectMutation.mutate(u.id);
                            }
                          }}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          variant="destructive"
                          size="sm"
                        >
                          {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
