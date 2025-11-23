import { ThemeProvider } from "@/components/theme/theme-provider"
import { ThemeToggle } from "./components/theme/theme-toggle"

import { Button } from "./components/ui/button"
 
function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ThemeToggle />
      <Button>Click Me!</Button>
    </ThemeProvider>
  )
}
 
export default App