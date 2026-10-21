import {AppRouter} from './router/AppRouter'
import '../styles/globals.scss'
import  AppErrorBoundary from "../utils/ErrorBoundary"
import {useEffect} from "react";
import useAuth from '../features/auth/hooks/useAuth';

const App = () => {

  const {initializeAuth} = useAuth();

  useEffect(()=>{

    initializeAuth();
    
  },[initializeAuth])

  return (
    <AppErrorBoundary>
      <AppRouter/>
    </AppErrorBoundary>
  )
}

export default App