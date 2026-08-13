import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/index.css' // আগের ঠিকানায় ফেরত নেওয়া হলো

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)