import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MemberList from './pages/MemberList';
import MemberDetail from './pages/MemberDetail';
import AddMember from './pages/AddMember';
import SearchResults from './pages/SearchResults';
import './index.css';

function App() {
  const [members, setMembers] = useState([]); // This would be fetched from an API/Mock

  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/members" element={<MemberList />} />
            <Route path="/members/:id" element={<MemberDetail />} />
            <Route path="/add-member" element={<AddMember />} />
            <Route path="/search" element={<SearchResults />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
