"use client";

import * as React from "react";
import { MessageCircle, Info, Command } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

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
import { Switch } from "@/components/ui/switch";

// This is sample data
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
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
  conversations: [
    {
      id: "1",
      title: "Help with React components",
      model: "GPT-4",
      timestamp: "09:34 AM",
      messageCount: 12,
      preview:
        "I need help understanding how to create reusable components in React.\nCan you explain the best practices for component composition?",
    },
    {
      id: "2",
      title: "TypeScript type safety",
      model: "GPT-4",
      timestamp: "Yesterday",
      messageCount: 8,
      preview:
        "What's the difference between interface and type in TypeScript?\nI want to make sure I'm using the right approach for my project.",
    },
    {
      id: "3",
      title: "API integration patterns",
      model: "Claude",
      timestamp: "2 days ago",
      messageCount: 15,
      preview:
        "I'm building a REST API client and need advice on error handling.\nWhat are some common patterns for managing API state?",
    },
    {
      id: "4",
      title: "Performance optimization",
      model: "GPT-4",
      timestamp: "2 days ago",
      messageCount: 10,
      preview:
        "My React app is running slow with large lists.\nCan you suggest some optimization techniques like virtualization?",
    },
    {
      id: "5",
      title: "Database design discussion",
      model: "Claude",
      timestamp: "1 week ago",
      messageCount: 20,
      preview:
        "I'm designing a relational database schema for an e-commerce platform.\nWhat are the best practices for modeling products and orders?",
    },
    {
      id: "6",
      title: "CSS styling strategies",
      model: "GPT-4",
      timestamp: "1 week ago",
      messageCount: 6,
      preview:
        "Should I use CSS modules, Tailwind, or styled-components?\nI want to understand the trade-offs of each approach.",
    },
    {
      id: "7",
      title: "Authentication implementation",
      model: "GPT-4",
      timestamp: "1 week ago",
      messageCount: 18,
      preview:
        "I need to implement JWT authentication in my Next.js app.\nWhat's the recommended way to handle tokens and refresh logic?",
    },
    {
      id: "8",
      title: "Testing strategies",
      model: "Claude",
      timestamp: "1 week ago",
      messageCount: 9,
      preview:
        "What's the difference between unit, integration, and e2e tests?\nI want to set up a comprehensive testing strategy for my project.",
    },
    {
      id: "9",
      title: "Git workflow questions",
      model: "GPT-4",
      timestamp: "1 week ago",
      messageCount: 7,
      preview:
        "I'm confused about when to rebase vs merge in Git.\nCan you explain the pros and cons of each approach?",
    },
    {
      id: "10",
      title: "Deployment configuration",
      model: "Claude",
      timestamp: "1 week ago",
      messageCount: 11,
      preview:
        "I'm deploying my app to Vercel for the first time.\nWhat environment variables do I need to configure for production?",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { user } = useAuth();
  const [conversations, setConversations] = React.useState(data.conversations);
  const { setOpen } = useSidebar();

  const activeItem = React.useMemo(
    () => data.navMain.find((item) => item.url === location.pathname) || data.navMain[0],
    [location.pathname]
  )

  return (
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
                <Link to="/">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Acme Inc</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
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
                      <Link to={item.url} onClick={() => setOpen(true)}>
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
        <SidebarFooter>
          { user && <NavUser user={user} /> }
        </SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <span>Recent</span>
              <Switch className="shadow-none" />
            </Label>
          </div>
          <SidebarInput placeholder="Search conversations..." />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {conversations.map((conversation) => (
                <Link
                  to="/"
                  key={conversation.id}
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="font-medium">{conversation.title}</span>
                    <span className="ml-auto text-xs">{conversation.timestamp}</span>
                  </div>
                  <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
                    <span>{conversation.model}</span>
                    <span>•</span>
                    <span>{conversation.messageCount} messages</span>
                  </div>
                  <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces text-muted-foreground">
                    {conversation.preview}
                  </span>
                </Link>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
