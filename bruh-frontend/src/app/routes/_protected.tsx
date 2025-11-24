import { createFileRoute, redirect, Outlet } from "@tanstack/react-router"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { ContentLayout } from "@/components/layouts"
import { useAuth } from "@/lib/auth-context"
import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/_protected")({
  beforeLoad: ({ location }) => {
    const tokens = localStorage.getItem("auth_tokens")
    
    if (!tokens) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: ProtectedLayout,
})

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) {
    console.log("auth state is loading");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log("User is not authenticated and cannot access a protected route.");
    return null
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <ContentLayout>
          <Outlet />
        </ContentLayout>
      </SidebarInset>
    </>
  )
}