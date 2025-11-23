import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({ component: App })

function App() {

  return (
    <div>
      <span className="font-2xl text-primary">HELLO WORLD!</span>
    </div>
  )
}
