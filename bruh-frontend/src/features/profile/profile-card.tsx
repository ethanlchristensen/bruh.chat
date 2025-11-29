import type React from "react";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ModelSelector } from "@/components/shared/model-selector/model-selector";
import { api } from "@/lib/api-client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export default function ProfileCard() {
  const { user, isLoading, refreshUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [defaultModel, setDefaultModel] = useState<string | undefined>(
    undefined
  );
  const [defaultAuxModel, setDefaultAuxModel] = useState<string | undefined>(
    undefined
  );
  const [autoGenerateTitles, setAutoGenerateTitles] = useState(false);
  const [titleGenerationFrequency, setTitleGenerationFrequency] =
    useState<number>(4);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [initialValues, setInitialValues] = useState({
    bio: "",
    defaultModel: undefined as string | undefined,
    defaultAuxModel: undefined as string | undefined,
    autoGenerateTitles: false,
    titleGenerationFrequency: 4,
  });

  useEffect(() => {
    if (user?.profile) {
      const values = {
        bio: user.profile.bio || "",
        defaultModel: user.profile.default_model || undefined,
        defaultAuxModel: user.profile.default_aux_model || undefined,
        autoGenerateTitles: user.profile.auto_generate_titles ?? false,
        titleGenerationFrequency: user.profile.title_generation_frequency ?? 4,
      };
      setBio(values.bio);
      setProfileImage(user.profile.profile_image || "");
      setDefaultModel(values.defaultModel);
      setDefaultAuxModel(values.defaultAuxModel);
      setAutoGenerateTitles(values.autoGenerateTitles);
      setTitleGenerationFrequency(values.titleGenerationFrequency);
      setInitialValues(values);
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let hasChanges = false;

      if (imageFile) {
        const formData = new FormData();
        formData.append("profile_image", imageFile);

        await api.post("/users/me/profile/image", formData);
        hasChanges = true;
      }

      const updates: Record<string, any> = {};

      if (bio !== initialValues.bio) {
        updates.bio = bio;
        hasChanges = true;
      }

      if (defaultModel !== initialValues.defaultModel) {
        updates.default_model = defaultModel || null;
        hasChanges = true;
      }

      if (defaultAuxModel !== initialValues.defaultAuxModel) {
        updates.default_aux_model = defaultAuxModel || null;
        hasChanges = true;
      }

      if (autoGenerateTitles !== initialValues.autoGenerateTitles) {
        updates.auto_generate_titles = autoGenerateTitles;
        hasChanges = true;
      }

      if (titleGenerationFrequency !== initialValues.titleGenerationFrequency) {
        updates.title_generation_frequency = titleGenerationFrequency;
        hasChanges = true;
      }

      if (Object.keys(updates).length > 0) {
        await api.patch("/users/me/profile", updates);
        hasChanges = true;
      }

      if (!hasChanges) {
        toast.info("No changes to save");
        setSaving(false);
        return;
      }

      if (refreshUser) {
        await refreshUser();
      }

      toast.success("Profile updated successfully");

      setInitialValues({
        bio,
        defaultModel,
        defaultAuxModel,
        autoGenerateTitles,
        titleGenerationFrequency,
      });

      setPreviewUrl(null);
      setImageFile(null);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setBio(initialValues.bio);
    setDefaultModel(initialValues.defaultModel);
    setDefaultAuxModel(initialValues.defaultAuxModel);
    setAutoGenerateTitles(initialValues.autoGenerateTitles);
    setTitleGenerationFrequency(initialValues.titleGenerationFrequency);
    setPreviewUrl(null);
    setImageFile(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  const displayImage =
    previewUrl || profileImage || "/placeholder.svg?height=128&width=128";
  const userInitials =
    `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile information and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your profile picture, bio, and model preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image */}
            <div className="space-y-2">
              <Label>Profile Image</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24 rounded-xl">
                  <AvatarImage src={displayImage} alt={user.username} />
                  <AvatarFallback className="text-2xl">
                    {userInitials || <UserIcon className="h-12 w-12" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    id="profile-image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("profile-image")?.click()
                    }
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload new image
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* User Info (Read-only) */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Username</Label>
                <p className="text-sm font-medium">{user.username}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">First Name</Label>
                <p className="text-sm font-medium">{user.first_name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Last Name</Label>
                <p className="text-sm font-medium">{user.last_name}</p>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a little about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Brief description for your profile. Maximum 500 characters.
              </p>
            </div>

            {/* Default Model */}
            <div className="space-y-2">
              <Label>Default Model</Label>
              <ModelSelector
                selectedModelId={defaultModel}
                onModelSelect={setDefaultModel}
              />
              <p className="text-xs text-muted-foreground">
                Your default AI model for chatting. You can also select any
                model on the conversation page already.
              </p>
            </div>

            {/* Default Auxiliary Model */}
            <div className="space-y-2">
              <Label>Default Auxiliary Model</Label>
              <ModelSelector
                variant="by-provider"
                structuredOutputOnly={true}
                selectedModelId={defaultAuxModel}
                onModelSelect={setDefaultAuxModel}
              />
              <p className="text-xs text-muted-foreground">
                Secondary model for auxiliary tasks that also utilize structured
                outputs.
              </p>
            </div>

            {/* Auto Generate Titles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-generate-titles">
                    Auto-Generate Conversation Titles
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically generate titles for your conversations using
                    AI
                  </p>
                </div>
                <Switch
                  id="auto-generate-titles"
                  checked={autoGenerateTitles}
                  onCheckedChange={setAutoGenerateTitles}
                />
              </div>
            </div>

            {/* Title Generation Frequency */}
            {autoGenerateTitles && (
              <div className="space-y-2">
                <Label htmlFor="title-frequency">
                  Title Generation Frequency
                </Label>
                <Input
                  id="title-frequency"
                  type="number"
                  min="1"
                  max="100"
                  value={titleGenerationFrequency}
                  onChange={(e) =>
                    setTitleGenerationFrequency(Number(e.target.value))
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Generate a new title after this many messages (1-100)
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
