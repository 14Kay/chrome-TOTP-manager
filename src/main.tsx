import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = createRoot(document.getElementById('root')!)

if (import.meta.env.DEV) {
	root.render(
		<StrictMode>
			<App />
		</StrictMode>
	)
} else {
	root.render(<App />)
}
