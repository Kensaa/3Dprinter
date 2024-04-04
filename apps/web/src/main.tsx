import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './main.scss'
import '~normalize.css/normalize.css'

import { Buffer as BufferPolyfill } from 'buffer'
globalThis.Buffer = BufferPolyfill

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <App />
)
