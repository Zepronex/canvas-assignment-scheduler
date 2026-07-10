import React from 'react';
import ReactDOM from 'react-dom/client';
import { Popup } from './Popup';
import '../styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
