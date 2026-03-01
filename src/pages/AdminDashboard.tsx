import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Building2, Trash2, Shield, AlertCircle, CheckCircle, XCircle, Search, Eye, Phone, Mail, BarChart3, Download, Globe } from 'lucide-react';
import { User, Property, Lead } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'agents' | 'properties' | 'visitors'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<(Property & { agent_name: string, agent_email: string })[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalProperties: 0, totalAgents: 0, totalCustomers: 0, totalVisitors: 0, indiaVisitors: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Leads Modal State
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [agentLeads, setAgentLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [leadPage, setLeadPage] = useState(1);
  const leadsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, propsRes, statsRes, visitorsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/properties'),
        fetch('/api/admin/stats'),
        fetch('/api/admin/visitors')
      ]);
      
      const usersData = await usersRes.json();
      const propsData = await propsRes.json();
      const statsData = await statsRes.json();
      const visitorsData = await visitorsRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setProperties(Array.isArray(propsData) ? propsData : []);
      setStats(statsData || null);
      setVisitors(Array.isArray(visitorsData) ? visitorsData : []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setUsers([]);
      setProperties([]);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    if (!window.confirm(`Are you sure you want to ${newStatus === 'blocked' ? 'block' : 'activate'} this user?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const handleDeleteProperty = async (propertyId: number) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete property');
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Error deleting property');
    }
  };

  const handleViewLeads = async (agent: User) => {
    setSelectedAgent(agent);
    setSelectedProperty(null);
    setLoadingLeads(true);
    setLeadSearchTerm('');
    setLeadPage(1);
    try {
      const res = await fetch(`/api/agent/leads/${agent.id}`);
      if (res.ok) {
        setAgentLeads(await res.json());
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleViewPropertyLeads = async (property: Property) => {
    setSelectedProperty(property);
    setSelectedAgent(null);
    setLoadingLeads(true);
    setLeadSearchTerm('');
    setLeadPage(1);
    try {
      const res = await fetch(`/api/property/leads/${property.id}`);
      if (res.ok) {
        setAgentLeads(await res.json());
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const closeLeadsModal = () => {
    setSelectedAgent(null);
    setSelectedProperty(null);
    setAgentLeads([]);
    setLeadSearchTerm('');
    setLeadPage(1);
  };

  const downloadLeadsCSV = () => {
    const headers = ['Agent Name', 'Property Title', 'Interest Type', 'Customer Name', 'Customer Email', 'Customer Phone', 'User Role', 'Date'];
    
    const escapeCsv = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    const agentName = selectedAgent ? selectedAgent.name : (selectedProperty?.agent_name || 'Unknown Agent');

    const rows = agentLeads.map(lead => [
      agentName,
      lead.property_title,
      lead.type === 'view_number' ? 'Contacted' : 'Interested',
      lead.user_name,
      lead.user_email,
      lead.user_phone || 'N/A',
      lead.user_role === 'agent' ? 'Agent' : 'Customer',
      new Date(lead.created_at).toLocaleString()
    ].map(escapeCsv));

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-report-${agentName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.agent_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Chart Data Preparation
  const userRoleData = [
    { name: 'Customers', value: stats?.totalCustomers || 0 },
    { name: 'Agents', value: stats?.totalAgents || 0 },
  ];
  const ROLE_COLORS = ['#8b5cf6', '#10b981'];

  const propertyStatusData = [
    { name: 'Available', count: properties.filter(p => p.status === 'available').length },
    { name: 'Rented', count: properties.filter(p => p.status === 'rented').length },
  ];

  // Leads calculations
  const interestedCount = agentLeads.filter(l => l.type === 'interested').length;
  const viewedCount = agentLeads.filter(l => l.type === 'view_number').length;
  
  const filteredLeads = agentLeads.filter(l => 
    l.user_name.toLowerCase().includes(leadSearchTerm.toLowerCase()) || 
    l.user_email.toLowerCase().includes(leadSearchTerm.toLowerCase()) || 
    (l.user_phone && l.user_phone.includes(leadSearchTerm)) ||
    l.property_title.toLowerCase().includes(leadSearchTerm.toLowerCase())
  );
  
  const leadsByProperty = filteredLeads.reduce((acc, lead) => {
    const key = lead.property_title;
    if (!acc[key]) {
      acc[key] = {
        image: lead.property_image,
        leads: []
      };
    }
    acc[key].leads.push(lead);
    return acc;
  }, {} as Record<string, { image: string, leads: Lead[] }>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="bg-gray-900 text-white pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-orange-500" />
              Admin Portal
            </h1>
            <div className="flex flex-wrap gap-2 md:gap-4">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'overview' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('customers')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'customers' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                Customers
              </button>
              <button 
                onClick={() => setActiveTab('agents')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'agents' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                Agents
              </button>
              <button 
                onClick={() => setActiveTab('properties')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'properties' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                Properties
              </button>
              <button 
                onClick={() => setActiveTab('visitors')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'visitors' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                Visitors
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 pb-12">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-500 font-medium">Total Users</h3>
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-500 font-medium">Total Properties</h3>
                  <Building2 className="h-6 w-6 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalProperties.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-500 font-medium">Unique Visitors (India)</h3>
                  <Globe className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.indiaVisitors.toLocaleString()}</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                  User Distribution
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userRoleData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {userRoleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  Properties by Status
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={propertyStatusData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        cursor={{ fill: '#f9fafb' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Customer Management</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search customers..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.filter(u => u.role === 'customer').map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{u.name}</div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {u.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => handleUserStatus(u.id, u.status || 'active')}
                            className={`text-sm font-medium ${u.status === 'active' ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                          >
                            {u.status === 'active' ? 'Block' : 'Unblock'}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Agent Management</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search agents..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ads Posted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.filter(u => u.role === 'agent').map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{u.name}</div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {(u.ads_count || 0).toLocaleString()} Ads
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {u.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleViewLeads(u)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View Leads
                          </button>
                          <button 
                            onClick={() => handleUserStatus(u.id, u.status || 'active')}
                            className={`text-sm font-medium ${u.status === 'active' ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                          >
                            {u.status === 'active' ? 'Block' : 'Unblock'}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Property Management</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search properties..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredProperties.map((p) => (
                <div key={p.id} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="h-48 bg-gray-200 relative">
                    <img src={p.images?.[0] || 'https://via.placeholder.com/400'} alt={p.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold">
                      ID: #{p.id}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1 truncate">{p.title}</h3>
                    <p className="text-sm text-gray-500 mb-3 truncate">{p.location}</p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-orange-600">₹{p.price.toLocaleString()}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.status === 'rented' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {p.status?.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="mb-4 space-y-1">
                      <div className="text-xs text-gray-500 flex items-center justify-between">
                        <span>Interested:</span>
                        <span className="font-bold text-gray-900 bg-blue-50 px-2 py-0.5 rounded-full">{(p.interest_count || 0).toLocaleString()} Users</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Agent: <span className="font-medium text-gray-900">{p.agent_name}</span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span className="font-medium text-gray-900">{p.agent_phone || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleViewPropertyLeads(p)}
                        className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View Leads
                      </button>
                      <button 
                        onClick={() => handleDeleteProperty(p.id)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                        title="Delete Property"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'visitors' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="h-6 w-6 text-orange-500" />
                Website Visitors
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by IP, city, or country..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-64"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 font-semibold text-gray-600 text-sm">IP Address</th>
                    <th className="p-4 font-semibold text-gray-600 text-sm">Location</th>
                    <th className="p-4 font-semibold text-gray-600 text-sm">Country</th>
                    <th className="p-4 font-semibold text-gray-600 text-sm">Visited At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visitors.filter(v => 
                    v.ip_address.includes(searchTerm) || 
                    (v.city && v.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (v.country && v.country.toLowerCase().includes(searchTerm.toLowerCase()))
                  ).map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-mono text-sm text-gray-900">{visitor.ip_address}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900">
                          {visitor.city !== 'Unknown' ? `${visitor.city}, ${visitor.region}` : 'Unknown Location'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          visitor.country === 'India' || visitor.country === 'IN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {visitor.country}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-500">
                          {new Date(visitor.visited_at).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visitors.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No visitors tracked yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Leads Modal */}
      {(selectedAgent || selectedProperty) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedAgent ? `Leads for ${selectedAgent.name}` : `Leads for "${selectedProperty?.title}"`}
                </h2>
                <p className="text-sm text-gray-500">Showing all interested users and interactions</p>
              </div>
              <div className="flex items-center gap-3">
                {agentLeads.length > 0 && (
                  <button
                    onClick={downloadLeadsCSV}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Report
                  </button>
                )}
                <button 
                  onClick={closeLeadsModal}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <XCircle className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingLeads ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : agentLeads.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No leads found.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                      <div className="text-orange-600 text-xs font-bold uppercase tracking-wider mb-1">Total Leads</div>
                      <div className="text-2xl font-black text-gray-900">{agentLeads.length.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <div className="text-green-600 text-xs font-bold uppercase tracking-wider mb-1">Interested</div>
                      <div className="text-2xl font-black text-gray-900">{interestedCount.toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Contacted</div>
                      <div className="text-2xl font-black text-gray-900">{viewedCount.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Search and Filter */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search leads by name, email, phone, or property..." 
                      value={leadSearchTerm}
                      onChange={(e) => { setLeadSearchTerm(e.target.value); setLeadPage(1); }}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Leads List Grouped by Property */}
                  <div className="space-y-6">
                    {Object.entries(leadsByProperty).map(([title, data], index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                              {data.image ? (
                                <img src={data.image} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Building2 className="h-6 w-6 m-auto text-gray-400 mt-3" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-lg">{title}</h4>
                              <p className="text-sm text-gray-500 font-medium">{data.leads.length} Total Leads</p>
                            </div>
                          </div>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {data.leads.map((lead, lIndex) => (
                            <div key={lIndex} className="p-4 hover:bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  lead.type === 'interested' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {lead.type === 'interested' ? 'Marked Interested' : 'Contacted'}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  lead.user_role === 'agent' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {lead.user_role === 'agent' ? 'Agent' : 'Customer'}
                                </span>
                                <span className="text-xs text-gray-500 font-medium">
                                  {new Date(lead.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              
                              <div className="flex flex-col gap-1 text-sm min-w-[250px]">
                                <div className="font-bold text-gray-900">{lead.user_name}</div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                                  {lead.user_email}
                                </div>
                                {lead.user_phone && (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                    {lead.user_phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
