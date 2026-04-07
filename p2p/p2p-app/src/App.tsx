import { ArrowRight } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'

function App() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className='border border-solid border-red-500 w-1/3 h-screen'>
        Sidebar
      </div>

      <div className='w-2/3 border border-solid border-green-500 h-screen'>
        Body
      </div>
    </main>
  )
}

export default App;
