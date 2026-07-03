import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './app/providers'
import { router } from './app/router'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode><AppProviders><Suspense fallback={<div className="route-loading"><span className="spinner"/>Loading Edvixa…</div>}><RouterProvider router={router}/></Suspense></AppProviders></StrictMode>)
