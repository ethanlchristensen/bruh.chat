import * as React from "react";
import {
  MessageCircle,
  Info,
  Command,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  Link,
  useLocation,
  useParams,
  useNavigate,
} from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { NavUser } from "@/components/sidebar/nav-user";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
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
import { Switch } from "@/components/ui/switch";
import { TimeAgo } from "@/features/chat/components/time-ago";
import { toast } from "sonner";

import {
  useConversations,
  useUpdateConversationTitle,
  useDeleteConversation,
} from "@/features/chat/api/conversation";

const data = {
  navMain: [
    {
      title: "Conversations",
      url: "/",
      icon: MessageCircle,
      isActive: true,
    },
    {
      title: "About",
      url: "/about",
      icon: Info,
      isActive: false,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setOpen, open } = useSidebar();
  const params = useParams({ strict: false });

  const { data: conversationsData, isLoading } = useConversations();
  const conversations = conversationsData?.conversations || [];

  const updateTitleMutation = useUpdateConversationTitle();
  const deleteMutation = useDeleteConversation();

  const currentConversationId = (params as any)?.conversationId;

  const [showRecentOnly, setShowRecentOnly] = React.useState(() => {
    const saved = localStorage.getItem("sidebar-show-recent");
    return saved ? JSON.parse(saved) : false;
  });

  const [searchQuery, setSearchQuery] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [conversationToDelete, setConversationToDelete] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    localStorage.setItem("sidebar-open", JSON.stringify(open));
  }, [open]);

  React.useEffect(() => {
    localStorage.setItem("sidebar-show-recent", JSON.stringify(showRecentOnly));
  }, [showRecentOnly]);

  const filteredConversations = React.useMemo(() => {
    let filtered = conversations;

    if (showRecentOnly) {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      filtered = filtered.filter((conversation) => {
        const updatedAt = new Date(conversation.updated_at);
        return updatedAt >= twentyFourHoursAgo;
      });
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((conversation) =>
        conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [conversations, showRecentOnly, searchQuery]);

  const activeItem = React.useMemo(
    () =>
      data.navMain.find((item) => item.url === location.pathname) ||
      data.navMain[0],
    [location.pathname]
  );

  const handleStartEdit = (conversation: any) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleSaveEdit = async (conversationId: string) => {
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    try {
      await updateTitleMutation.mutateAsync({
        conversationId,
        title: editTitle.trim(),
      });
      setEditingId(null);
      setEditTitle("");
    } catch (error) {
      console.error("Failed to update conversation title:", error);
    }
  };

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!conversationToDelete) return;

    const deletingCurrentConversation =
      currentConversationId === conversationToDelete;

    // Navigate away BEFORE deleting if we're viewing this conversation
    if (deletingCurrentConversation) {
      navigate({ to: "/" });
    }

    try {
      await deleteMutation.mutateAsync(conversationToDelete);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
        {...props}
      >
        {/* This is the first sidebar */}
        <Sidebar
          collapsible="none"
          className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
        >
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                  <Link to="/" className="relative overflow-hidden">
                    <img
                      src="/bruh.chat.png"
                      alt="Company Logo"
                      className="h-8 w-full object-cover rounded-lg"
                    />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent className="px-1.5 md:px-0">
                <SidebarMenu>
                  {data.navMain.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={{
                          children: item.title,
                          hidden: false,
                        }}
                        asChild
                        isActive={activeItem?.title === item.title}
                        className="px-2.5 md:px-2"
                      >
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
        </Sidebar>

        {/* This is the second sidebar */}
        <Sidebar
          collapsible="none"
          className="hidden flex-1 md:flex overflow-hidden border-none!"
        >
          <SidebarHeader className="gap-3.5 border-b p-4">
            <div className="flex w-full items-center justify-between">
              <div className="text-foreground text-base font-medium">
                Conversations
              </div>
              <Label className="flex items-center gap-2 text-sm">
                <span>Recent</span>
                <Switch
                  className="shadow-none"
                  checked={showRecentOnly}
                  onCheckedChange={setShowRecentOnly}
                />
              </Label>
            </div>
            <SidebarInput
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Link
              to="/"
              className="flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
            >
              <MessageCircle className="h-4 w-4" />
              New Chat
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="p-0">
              <SidebarGroupContent className="overflow-hidden">
                {isLoading ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Loading conversations...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    {showRecentOnly
                      ? "No recent conversations in the last 24 hours."
                      : "No conversations yet. Start a new chat!"}
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const isActive = currentConversationId === conversation.id;
                    const isEditing = editingId === conversation.id;

                    return (
                      <div
                        key={conversation.id}
                        className={cn(
                          "group/item relative border-b last:border-b-0",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        {isEditing ? (
                          <div className="flex items-center p-4 gap-2">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveEdit(conversation.id);
                                } else if (e.key === "Escape") {
                                  handleCancelEdit();
                                }
                              }}
                              className="flex-1 bg-background border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(conversation.id)}
                              className="hover:bg-sidebar-accent-foreground/10 rounded-sm p-1.5"
                              aria-label="Save"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="hover:bg-sidebar-accent-foreground/10 rounded-sm p-1.5"
                              aria-label="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Link
                              to="/chat/$conversationId"
                              params={{ conversationId: conversation.id }}
                              className="flex items-center p-4 text-sm min-w-0"
                            >
                              <div className="flex w-full items-center gap-2 min-w-0">
                                <span className="font-medium truncate min-w-0">
                                  {conversation.title}
                                </span>
                                <span className="text-xs shrink-0 whitespace-nowrap ml-auto group-hover/item:opacity-0 transition-opacity">
                                  <TimeAgo isoDate={conversation.updated_at} />
                                </span>
                              </div>
                            </Link>

                            <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover/item:flex items-center gap-1 pr-2 pl-8 bg-linear-to-r from-transparent via-sidebar-accent/80 to-sidebar-accent">
                              <button
                                className="hover:bg-sidebar-accent-foreground/10 rounded-sm p-1.5 relative z-10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleStartEdit(conversation);
                                }}
                                aria-label="Rename conversation"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                className="hover:bg-destructive/10 rounded-sm p-1.5 text-destructive relative z-10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteClick(conversation.id);
                                }}
                                aria-label="Delete conversation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </Sidebar>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}