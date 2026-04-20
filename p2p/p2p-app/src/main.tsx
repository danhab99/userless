import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserlessProvider } from './components/UserlessProvider/UserlessProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserlessProvider>
      <App />
    </UserlessProvider>
  </StrictMode>,
)
