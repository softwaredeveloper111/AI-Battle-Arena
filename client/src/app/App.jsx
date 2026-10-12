import { RouterProvider } from 'react-router-dom'
import router from './router/AppRouter'
import '../styles/globals.scss'

const App = () => {
  return <RouterProvider router={router} />
}

export default App