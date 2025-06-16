import { useState } from 'react';
import './App.css';

function App() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '' });
  const [userStatus, setUserStatus] = useState<string>('');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);

    try {
      const response = await fetch('/api/media/worker.png', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer your-auth-secret'
        },
        body: formData
      });

      if (response.ok) {
        setImageUrl('/api/media/worker.png');
        setUploadStatus('Upload successful!');
      } else {
        setUploadStatus('Upload failed');
      }
    } catch (error) {
      setUploadStatus('Upload failed');
      console.error('Upload error:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserStatus('Creating user...');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setUserStatus('User created successfully!');
        setNewUser({ email: '', name: '', password: '' });
        fetchUsers(); // Refresh the users list
      } else {
        const error = await response.text();
        setUserStatus(`Failed to create user: ${error}`);
      }
    } catch (error) {
      setUserStatus('Error creating user');
      console.error('Create user error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json() as { results: Array<{
          id: number;
          email: string;
          name: string;
          created_at: string;
        }>};
        setUsers(data.results || []);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  return (
    <div className="container">
      <h1>Media Upload and Database Testing</h1>
      
      {/* Video Player Section */}
      <section className="video-section">
        <h2>Video Player</h2>
        <video controls width="100%" style={{ maxWidth: '800px' }}>
          <source src="/api/video/register_detail.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </section>

      {/* Image Upload Section */}
      <section className="upload-section">
        <h2>Image Upload</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ marginBottom: '1rem' }}
        />
        {uploadStatus && <p>{uploadStatus}</p>}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Uploaded"
            style={{ maxWidth: '100%', marginTop: '1rem' }}
          />
        )}
      </section>

      {/* Database Testing Section */}
      <section className="database-section">
        <h2>Database Testing</h2>
        
        {/* Create User Form */}
        <form onSubmit={handleCreateUser} className="user-form">
          <h3>Create New User</h3>
          <div>
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
            />
          </div>
          <button type="submit">Create User</button>
          {userStatus && <p>{userStatus}</p>}
        </form>

        {/* Users List */}
        <div className="users-list">
          <h3>Users List</h3>
          <button onClick={fetchUsers}>Refresh Users</button>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{new Date(user.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App; 