import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Property, Lead } from '../types';
import { Plus, Download, Eye, Heart, Loader2, MapPin, Edit, Trash2, X, PhoneCall, MessageCircle, Send, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export function AgentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'listings' | 'leads'>('listings');
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [propsRes, leadsRes] = await Promise.all([
          fetch(`/api/properties/agent/${user.id}`),
          fetch(`/api/agent/leads/${user.id}`)
        ]);
        
        const propsData = await propsRes.json();
        const leadsData = await leadsRes.json();
        
        setProperties(Array.isArray(propsData) ? propsData : []);
        setLeads(Array.isArray(leadsData) ? leadsData : []);
      } catch (err) {
        console.error('Failed to fetch agent data:', err);
        setProperties([]);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const downloadCSV = () => {
    const headers = ['Type', 'Date', 'Property', 'User Name', 'User Email', 'User Phone', 'User Role'];
    
    const escapeCsv = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    const rows = leads.map(lead => [
      lead.type === 'view_number' ? 'Contacted' : 'Interested',
      new Date(lead.created_at).toLocaleString(),
      lead.property_title,
      lead.user_name,
      lead.user_email,
      lead.user_phone || 'N/A',
      lead.user_role === 'agent' ? 'Agent' : 'Customer'
    ].map(escapeCsv));

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-report.csv';
    a.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG with 0.7 quality
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            setImagePreviews(prev => [...prev, compressedBase64].slice(0, 5));
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    const payload = {
      ...data,
      agent_id: user.id,
      price: Number(data.price),
      bathrooms: Number(data.bathrooms),
      images: imagePreviews
    };

    const url = editingProperty ? `/api/properties/${editingProperty.id}` : '/api/properties';
    const method = editingProperty ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload property');
    }

    // Refresh properties
    const res = await fetch(`/api/properties/agent/${user.id}`);
    const newProps = await res.json();
    setProperties(newProps);
    closeModal();
    } catch (error: any) {
      console.error('Error uploading property:', error);
      alert(error.message || 'Failed to upload property. The image might be too large.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingProperty(null);
    setImagePreviews([]);
    setShowModal(true);
  };

  const openEditModal = (property: Property) => {
    setEditingProperty(property);
    setImagePreviews(property.images);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProperty(null);
    setImagePreviews([]);
  };

  const [revealedLeads, setRevealedLeads] = useState<Set<number>>(new Set());

  // Group leads by property
  const leadsByProperty = leads.reduce((acc, lead) => {
    if (!acc[lead.property_title]) {
      acc[lead.property_title] = [];
    }
    acc[lead.property_title].push(lead);
    return acc;
  }, {} as Record<string, Lead[]>);

  const toggleLeadNumber = (index: number) => {
    setRevealedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Chart Data Preparation
  const leadsPerPropertyData = properties.map(p => ({
    name: p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title,
    Views: p.views || 0,
    Leads: leads.filter(l => l.property_title === p.title).length
  })).sort((a, b) => (b.Views + b.Leads) - (a.Views + a.Leads)).slice(0, 5); // Top 5 properties

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your listings and view interested tenants.</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Post New Ad
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('listings')}
              className={cn(
                "whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium",
                activeTab === 'listings'
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              My Listings ({properties.length})
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={cn(
                "whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium",
                activeTab === 'leads'
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              Leads & Interest ({leads.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'listings' ? (
          <div className="space-y-8">
            {/* Agent Chart Section */}
            {properties.length > 0 && (
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                  Property Analytics (Views vs Leads)
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadsPerPropertyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        cursor={{ fill: '#f9fafb' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="Views" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Total Views" maxBarSize={60} />
                      <Bar dataKey="Leads" fill="#f97316" radius={[4, 4, 0, 0]} name="Total Leads" maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map(property => (
              <div key={property.id} className="group relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="aspect-video w-full bg-gray-100 relative">
                  <img src={property.images[0]} alt={property.title} className="h-full w-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEditModal(property)}
                      className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 text-gray-700"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <MapPin className="mr-1 h-3 w-3" />
                    {property.location}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-bold text-orange-600">₹{property.price.toLocaleString('en-IN')}/mo</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        property.status === 'rented' ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      )}>
                        {property.status === 'rented' ? 'Rented' : 'Available'}
                      </span>
                      <span className="text-xs text-gray-400">ID: #{property.id}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 flex items-center justify-between">
                    <span>{property.bhk_type} • {property.bathrooms} Bath</span>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                        <Eye className="h-3 w-3" /> {property.views || 0}
                      </span>
                      <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                        <Heart className="h-3 w-3" /> {leads.filter(l => l.property_title === property.title).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-end">
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm"
              >
                <Download className="h-4 w-4" />
                Download CSV Report
              </button>
            </div>
            
            {Object.entries(leadsByProperty).map(([propertyTitle, propertyLeads]) => (
              <div key={propertyTitle} className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex items-center gap-4">
                  {propertyLeads[0]?.property_image && (
                    <img 
                      src={propertyLeads[0].property_image} 
                      alt={propertyTitle} 
                      className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    {propertyTitle}
                    <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {propertyLeads.length} Leads
                    </span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {propertyLeads.map((lead, i) => {
                        // Use a composite key or just index if leads don't have unique IDs in this view
                        // Assuming leads are unique objects
                        const globalIndex = leads.indexOf(lead); 
                        const isRevealed = revealedLeads.has(globalIndex);
                        
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {lead.type === 'view_number' ? (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                                  <Eye className="mr-1 h-3 w-3" /> Contacted
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 border border-green-100">
                                  <Heart className="mr-1 h-3 w-3" /> Interested
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {lead.user_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                lead.user_role === 'agent' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {lead.user_role === 'agent' ? 'Agent' : 'Customer'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {isRevealed ? (
                                <span className="font-mono text-gray-900">{lead.user_phone}</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-gray-400">
                                    {lead.user_phone?.slice(0, 3)} **** {lead.user_phone?.slice(-2)}
                                  </span>
                                  <button
                                    onClick={() => toggleLeadNumber(globalIndex)}
                                    className="text-xs text-orange-600 hover:text-orange-700 font-medium underline"
                                  >
                                    Show
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {lead.user_email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2">
                                {lead.user_phone && (
                                  <>
                                    <a 
                                      href={`tel:${lead.user_phone}`} 
                                      className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors" 
                                      title="Call Now"
                                    >
                                      <PhoneCall className="h-4 w-4" />
                                    </a>
                                    <a 
                                      href={`https://wa.me/${lead.user_phone.replace(/\D/g,'')}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors" 
                                      title="WhatsApp Now"
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </a>
                                    <a 
                                      href={`https://wa.me/${lead.user_phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi ${lead.user_name}, thanks for your interest in ${lead.property_title}. How can I help you?`)}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors" 
                                      title="Send Template Message"
                                    >
                                      <Send className="h-4 w-4" />
                                    </a>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            
            {leads.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">No leads yet. Post more ads to get started!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Property Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{editingProperty ? 'Edit Property' : 'Post New Ad'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Property Title</label>
                  <input 
                    name="title" 
                    defaultValue={editingProperty?.title}
                    required 
                    placeholder="e.g. Spacious 2 BHK in Indiranagar" 
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none" 
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rent (₹/month)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-500">₹</span>
                      <input 
                        name="price" 
                        type="number" 
                        defaultValue={editingProperty?.price}
                        required 
                        className="w-full rounded-xl border border-gray-300 pl-8 pr-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Detailed Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
                      <input 
                        name="location" 
                        defaultValue={editingProperty?.location}
                        required 
                        placeholder="e.g. Flat 402, Al-Noor Apts, Shaheen Bagh" 
                        className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                    <input 
                      name="pincode" 
                      defaultValue={editingProperty?.pincode}
                      required 
                      placeholder="e.g. 110025" 
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Property Type</label>
                    <select 
                      name="bhk_type" 
                      defaultValue={editingProperty?.bhk_type || "1 BHK"}
                      required 
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white"
                    >
                      <option value="1 RK">1 RK</option>
                      <option value="1 BHK">1 BHK</option>
                      <option value="2 BHK">2 BHK</option>
                      <option value="3 BHK">3 BHK</option>
                      <option value="4+ BHK">4+ BHK</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select 
                      name="status" 
                      defaultValue={editingProperty?.status || "available"}
                      required 
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white"
                    >
                      <option value="available">Available</option>
                      <option value="rented">Rented</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Bathrooms</label>
                    <input 
                      name="bathrooms" 
                      type="number" 
                      defaultValue={editingProperty?.bathrooms}
                      required 
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea 
                    name="description" 
                    defaultValue={editingProperty?.description}
                    required 
                    rows={4}
                    placeholder="Describe the property features, amenities, and nearby landmarks..." 
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none resize-none" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Property Images (Max 5)</label>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                        <img src={preview} alt={`Preview ${index}`} className="h-full w-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.length < 5 && (
                      <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all group">
                        <div className="bg-orange-100 p-3 rounded-full group-hover:bg-orange-200 transition-colors">
                          <Plus className="h-6 w-6 text-orange-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-600 mt-2">Add Photo</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          accept="image/*" 
                          multiple 
                          onChange={handleImageChange} 
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-orange-600 px-8 py-3 text-sm font-semibold text-white hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all hover:shadow-orange-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingProperty ? 'Update Ad' : 'Post Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
