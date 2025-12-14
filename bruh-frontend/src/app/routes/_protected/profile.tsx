// src/app/routes/_protected/profile.tsx
import { createFileRoute } from "@tanstack/react-router";
import ProfileCard from "@/features/profile/profile-card";
import { ThemeSettings } from "@/components/theme/theme-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Palette } from "lucide-react";

export const Route = createFileRoute("/_protected/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="overflow-y-scroll h-full w-full">
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your profile information and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <ProfileCard />
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <ThemeSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
