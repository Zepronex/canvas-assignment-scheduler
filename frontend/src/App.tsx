import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:8000/api/user')
      .then(response => {
        setUser(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Error loading user data</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Canvas Assignment Manager</h1>
      <p>Welcome, {user.name}!</p>
      <p>API Connection: ✅ Working</p>
    </div>
  );
}

export default App;
