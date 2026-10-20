import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import { Toaster } from 'sonner';

createRoot(document.getElementById('root')).render(
  <>
  <App />
  <Toaster position='top-right' />
  </>
)
