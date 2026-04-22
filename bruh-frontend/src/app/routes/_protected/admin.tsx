import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, CheckCircle, Clock, Users, RotateCcw, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types/api.types";

export const Route = createFileRoute("/_protected/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  if (!user?.is_superuser) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  const { data: unapprovedUsers, isLoading: isLoadingUnapproved } = useQuery({
    queryKey: ["admin", "unapproved-users"],
    queryFn: () => api.get<User[]>("/users/unapproved"),
  });

  const { data: approvedUsers, isLoading: isLoadingApproved } = useQuery({
    queryKey: ["admin", "approved-users"],
    queryFn: () => api.get<User[]>("/users/approved"),
  });

  const approveMutation = useMutation({
    mutationFn: (userId: number) => api.post(`/users/${userId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "unapproved-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "approved-users"] });
      toast.success("User approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: number) => api.delete(`/users/${userId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "unapproved-users"] });
      toast.success("User rejected and deleted");
    },
  });

  const resetQuotaMutation = useMutation({
    mutationFn: (userId: number) => api.post<User>(`/users/${userId}/quota/reset`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "approved-users"] });
      toast.success("Daily quota reset");
    },
    onError: () => toast.error("Failed to reset quota"),
  });

  const updateQuotaMutation = useMutation({
    mutationFn: ({ userId, daily_ai_limit, max_flows }: { userId: number; daily_ai_limit?: number; max_flows?: number }) =>
      api.patch<User>(`/users/${userId}/quota`, { daily_ai_limit, max_flows }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "approved-users"] });
      toast.success("Quota updated");
    },
    onError: () => toast.error("Failed to update quota"),
  });

  const pendingCount = unapprovedUsers?.length ?? 0;

  return (
    <div className="container mx-auto py-8 max-w-6xl px-4 flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, quotas, and approvals.</p>
      </div>

      <Tabs defaultValue="users" className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-fit">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Approved Users
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Approvals
            {pendingCount > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="flex-1 min-h-0 mt-4">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Approved Users
              </CardTitle>
              <CardDescription>
                Manage daily limits, flow caps, and view usage. Click any limit value to edit it inline.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              {isLoadingApproved ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !approvedUsers || approvedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed bg-muted/50">
                  <Users className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No approved users yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-3 pr-4 font-medium">User</th>
                        <th className="text-left py-3 px-4 font-medium">Today's Usage</th>
                        <th className="text-left py-3 px-4 font-medium">All-time Usage</th>
                        <th className="text-left py-3 px-4 font-medium">Daily Limit</th>
                        <th className="text-left py-3 px-4 font-medium">Max Flows</th>
                        <th className="text-left py-3 pl-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {approvedUsers.map((u) => (
                        <UserRow
                          key={u.id}
                          u={u}
                          onReset={() => resetQuotaMutation.mutate(u.id)}
                          isResetting={resetQuotaMutation.isPending && resetQuotaMutation.variables === u.id}
                          onUpdateQuota={(daily_ai_limit, max_flows) =>
                            updateQuotaMutation.mutate({ userId: u.id, daily_ai_limit, max_flows })
                          }
                          isUpdating={updateQuotaMutation.isPending && (updateQuotaMutation.variables as any)?.userId === u.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="flex-1 min-h-0 mt-4">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Approvals
              </CardTitle>
              <CardDescription>
                Users waiting for administrator approval to access the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              {isLoadingUnapproved ? (
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
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
                    >
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
                              if (confirm(`Reject and permanently delete user "${u.username}"?`)) {
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserRow({
  u,
  onReset,
  isResetting,
  onUpdateQuota,
  isUpdating,
}: {
  u: User;
  onReset: () => void;
  isResetting: boolean;
  onUpdateQuota: (daily_ai_limit?: number, max_flows?: number) => void;
  isUpdating: boolean;
}) {
  const profile = u.profile;
  const dailyTotal = profile.daily_ai_invocations_count;
  const dailyFlow = profile.daily_flow_invocations_count;
  const dailyChat = dailyTotal - dailyFlow;
  const allTimeTotal = profile.total_ai_invocations_count;
  const allTimeFlow = profile.total_flow_invocations_count;
  const allTimeChat = allTimeTotal - allTimeFlow;

  const [editingLimit, setEditingLimit] = useState(false);
  const [limitValue, setLimitValue] = useState(String(profile.daily_ai_limit));

  const [editingMaxFlows, setEditingMaxFlows] = useState(false);
  const [maxFlowsValue, setMaxFlowsValue] = useState(String(profile.max_flows));

  const saveLimit = () => {
    const val = parseInt(limitValue, 10);
    if (!isNaN(val) && val >= 0) {
      onUpdateQuota(val, undefined);
    }
    setEditingLimit(false);
  };

  const saveMaxFlows = () => {
    const val = parseInt(maxFlowsValue, 10);
    if (!isNaN(val) && val >= 0) {
      onUpdateQuota(undefined, val);
    }
    setEditingMaxFlows(false);
  };

  const cancelLimit = () => {
    setLimitValue(String(profile.daily_ai_limit));
    setEditingLimit(false);
  };

  const cancelMaxFlows = () => {
    setMaxFlowsValue(String(profile.max_flows));
    setEditingMaxFlows(false);
  };

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* User */}
      <td className="py-3 pr-4">
        <p className="font-medium">{u.username}</p>
        <p className="text-xs text-muted-foreground">{u.email}</p>
      </td>

      {/* Today's Usage */}
      <td className="py-3 px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-default">
              <p className="font-medium tabular-nums">
                {dailyTotal}
                {profile.daily_ai_limit > 0 && (
                  <span className="text-muted-foreground font-normal"> / {profile.daily_ai_limit}</span>
                )}
                {profile.daily_ai_limit === 0 && (
                  <span className="text-muted-foreground font-normal"> / ∞</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {dailyChat} chat · {dailyFlow} flow
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            Today: {dailyChat} from chat, {dailyFlow} from flows
          </TooltipContent>
        </Tooltip>
      </td>

      {/* All-time Usage */}
      <td className="py-3 px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-default">
              <p className="font-medium tabular-nums">{allTimeTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {allTimeChat.toLocaleString()} chat · {allTimeFlow.toLocaleString()} flow
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            All-time: {allTimeChat.toLocaleString()} from chat, {allTimeFlow.toLocaleString()} from flows
          </TooltipContent>
        </Tooltip>
      </td>

      {/* Daily Limit */}
      <td className="py-3 px-4">
        {editingLimit ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveLimit();
                if (e.key === "Escape") cancelLimit();
              }}
              className="h-7 w-20 text-sm"
              autoFocus
            />
            <button onClick={saveLimit} disabled={isUpdating} className="text-green-500 hover:text-green-600">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={cancelLimit} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setLimitValue(String(profile.daily_ai_limit));
              setEditingLimit(true);
            }}
            className="text-left hover:underline tabular-nums"
          >
            {profile.daily_ai_limit === 0 ? "∞" : profile.daily_ai_limit}
          </button>
        )}
      </td>

      {/* Max Flows */}
      <td className="py-3 px-4">
        {editingMaxFlows ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              value={maxFlowsValue}
              onChange={(e) => setMaxFlowsValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveMaxFlows();
                if (e.key === "Escape") cancelMaxFlows();
              }}
              className="h-7 w-20 text-sm"
              autoFocus
            />
            <button onClick={saveMaxFlows} disabled={isUpdating} className="text-green-500 hover:text-green-600">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={cancelMaxFlows} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setMaxFlowsValue(String(profile.max_flows));
              setEditingMaxFlows(true);
            }}
            className="text-left hover:underline tabular-nums"
          >
            {profile.max_flows === 0 ? "∞" : profile.max_flows}
          </button>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 pl-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onReset}
              disabled={isResetting}
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Reset today's usage to 0</TooltipContent>
        </Tooltip>
      </td>
    </tr>
  );
}
