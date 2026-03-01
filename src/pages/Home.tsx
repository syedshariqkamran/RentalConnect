import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Property } from '../types';
import { MapPin, Bed, Bath, Phone, Heart, Loader2, Search, Filter, X, Building2, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function Home() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedNumbers, setRevealedNumbers] = useState<Set<number>>(new Set());
  const [interestedProps, setInterestedProps] = useState<Set<number>>(new Set());
  
  // Search Filters
  const [locationFilter, setLocationFilter] = useState('');
  const [bhkFilter, setBhkFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const propertiesPerPage = 9;

  useEffect(() => {
    fetch('/api/properties')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          // Auto-hide rented properties
          const availableProperties = data.filter(p => p.status !== 'rented');
          setProperties(availableProperties);
          setFilteredProperties(availableProperties);
        } else {
          console.error('Expected array of properties, got:', data);
          setProperties([]);
          setFilteredProperties([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching properties:', err);
        setProperties([]);
        setFilteredProperties([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      setActiveImageIndex(0);
    }
  }, [selectedProperty]);

  useEffect(() => {
    let result = properties;
    if (locationFilter) {
      result = result.filter(p => p.location.toLowerCase().includes(locationFilter.toLowerCase()));
    }
    if (bhkFilter !== 'all') {
      result = result.filter(p => p.bhk_type === bhkFilter);
    }
    setFilteredProperties(result);
    setCurrentPage(1); // Reset to first page on filter change
  }, [locationFilter, bhkFilter, properties]);

  useEffect(() => {
    if (user) {
      fetch(`/api/user/interests/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const interested = new Set<number>();
            const revealed = new Set<number>();
            data.forEach((item: any) => {
              if (item.type === 'interested') interested.add(item.property_id);
              if (item.type === 'view_number') revealed.add(item.property_id);
            });
            setInterestedProps(interested);
            setRevealedNumbers(revealed);
          }
        })
        .catch(console.error);
    } else {
      setInterestedProps(new Set());
      setRevealedNumbers(new Set());
    }
  }, [user]);

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    fetch(`/api/properties/${property.id}/view`, { method: 'POST' }).catch(console.error);
  };

  const handleViewNumber = async (propertyId: number) => {
    if (!user) return;
    
    setRevealedNumbers(prev => new Set(prev).add(propertyId));
    
    await fetch('/api/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: propertyId,
        user_id: user.id,
        type: 'view_number'
      })
    });
  };

  const handleInterested = async (propertyId: number, agentPhone?: string) => {
    if (!user) return;

    setInterestedProps(prev => new Set(prev).add(propertyId));

    await fetch('/api/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: propertyId,
        user_id: user.id,
        type: 'interested'
      })
    });

    if (agentPhone) {
      const message = `Hi, I am interested in your property listing #${propertyId}.`;
      window.open(`https://wa.me/${agentPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans">
      {/* Hero Section */}
      <div className="relative bg-gray-900 py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <motion.img
            initial={{ scale: 1 }}
            animate={{ scale: 1.05 }}
            transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80"
            alt="Indian Home"
            className="h-full w-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-gray-900/20" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight text-white sm:text-6xl"
          >
            Find Your Dream Rental Home <br/>
            <span className="text-orange-500">in Delhi NCR</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-lg leading-8 text-gray-300 max-w-2xl mx-auto"
          >
            Delhi's most trusted rental portal. Find the best flats and rooms for rent in Shaheen Bagh, Okhla, Jamia Nagar, and across the city.
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 max-w-3xl mx-auto bg-white rounded-2xl p-2 shadow-xl flex flex-col sm:flex-row gap-2"
          >
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search City, Locality..." 
                className="w-full pl-10 pr-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48 relative">
              <Filter className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <select 
                className="w-full pl-10 pr-8 py-3 rounded-xl border-none focus:ring-2 focus:ring-orange-500 bg-gray-50 appearance-none"
                value={bhkFilter}
                onChange={(e) => setBhkFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="1 RK">1 RK</option>
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="4+ BHK">4+ BHK</option>
              </select>
            </div>
            <button className="bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
              <Search className="h-5 w-5" />
              Search
            </button>
          </motion.div>
        </div>
      </div>

      {/* Popular Localities */}
      <div className="bg-white py-16 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Popular Localities in <span className="text-orange-600">Delhi NCR</span></h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Explore the most sought-after neighborhoods for renting homes, flats, and rooms.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Shaheen Bagh', image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', count: '120+ Properties' },
              { name: 'Okhla', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', count: '85+ Properties' },
              { name: 'Jamia Nagar', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', count: '200+ Properties' },
              { name: 'South Delhi', image: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', count: '150+ Properties' },
            ].map((locality, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative h-64 rounded-2xl overflow-hidden group cursor-pointer"
                onClick={() => setLocationFilter(locality.name)}
              >
                <img src={locality.image} alt={locality.name} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                  <h3 className="text-xl font-bold text-white mb-1">{locality.name}</h3>
                  <p className="text-sm text-gray-300">{locality.count}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Latest Properties in <span className="text-orange-600">Delhi</span>
          </h2>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{filteredProperties.length} properties found</span>
        </div>

        {filteredProperties.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No properties found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.slice((currentPage - 1) * propertiesPerPage, currentPage * propertiesPerPage).map((property, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={property.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:shadow-xl border border-gray-100"
                >
                  <div 
                    className="aspect-[4/3] w-full overflow-hidden bg-gray-200 relative cursor-pointer"
                    onClick={() => handlePropertyClick(property)}
                  >
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-900 uppercase tracking-wider shadow-sm">
                      Verified
                    </div>
                    {property.status === 'rented' && (
                      <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md uppercase tracking-wider z-10">
                        Rented
                      </div>
                    )}
                    {property.images.length > 1 && (
                      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white">
                        +{property.images.length - 1} Photos
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-white font-bold text-xl">₹ {property.price.toLocaleString('en-IN')}<span className="text-sm font-normal opacity-80">/mo</span></p>
                    </div>
                  </div>
                  
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex-1">
                      <h3 
                        className="text-lg font-bold text-gray-900 line-clamp-1 cursor-pointer hover:text-orange-600"
                        onClick={() => handlePropertyClick(property)}
                      >
                      {property.title}
                    </h3>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <MapPin className="mr-1.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                      <span className="truncate">{property.location}{property.pincode ? `, ${property.pincode}` : ''}</span>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Bed className="h-4 w-4 text-gray-400" />
                        <span>{property.bhk_type}</span>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Bath className="h-4 w-4 text-gray-400" />
                        <span>{property.bathrooms} Bath</span>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {property.description}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    {property.status === 'rented' ? (
                      <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl font-bold text-center border-2 border-dashed border-gray-300 cursor-not-allowed uppercase tracking-wider text-sm">
                        Property Rented
                      </div>
                    ) : user ? (
                      user.role === 'customer' ? (
                        <>
                          {revealedNumbers.has(property.id) ? (
                            <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 text-green-700 border border-green-100">
                              <span className="font-bold flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {property.agent_phone}
                              </span>
                              <span className="text-[10px] uppercase tracking-wider font-bold bg-green-200 px-2 py-0.5 rounded text-green-800">Agent</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleViewNumber(property.id)}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
                            >
                              <Phone className="h-4 w-4" />
                              View Agent Number
                            </button>
                          )}

                          <button
                            onClick={() => handleInterested(property.id, property.agent_phone)}
                            disabled={interestedProps.has(property.id)}
                            className={cn(
                              "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all shadow-md hover:shadow-lg transform active:scale-95",
                              interestedProps.has(property.id)
                                ? "bg-green-600 cursor-default"
                                : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                            )}
                          >
                            {interestedProps.has(property.id) ? (
                              <>
                                <Heart className="h-4 w-4 fill-current" />
                                Interested (Sent)
                              </>
                            ) : (
                              <>
                                <Heart className="h-4 w-4" />
                                I'm Interested
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="rounded-xl bg-gray-100 px-4 py-3 text-center text-sm font-medium text-gray-500">
                          Logged in as Agent
                        </div>
                      )
                    ) : (
                      <Link
                        to="/login"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-gray-800 shadow-lg hover:shadow-xl"
                      >
                        Login to View Details
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            </div>
            
            {/* Pagination Controls */}
            {filteredProperties.length > propertiesPerPage && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {Array.from({ length: Math.ceil(filteredProperties.length / propertiesPerPage) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-10 h-10 rounded-lg font-medium transition-colors",
                      currentPage === i + 1 
                        ? "bg-orange-600 text-white" 
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredProperties.length / propertiesPerPage)))}
                  disabled={currentPage === Math.ceil(filteredProperties.length / propertiesPerPage)}
                  className="p-2 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Property Details Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setSelectedProperty(null)}>
          <div 
            className="w-full max-w-6xl rounded-2xl bg-white overflow-hidden shadow-2xl max-h-[90vh] flex flex-col lg:flex-row" 
            onClick={e => e.stopPropagation()}
          >
            {/* Left Side - Image Gallery */}
            <div className="relative w-full lg:w-3/5 bg-gray-900 flex flex-col h-[40vh] lg:h-auto">
              <div className="relative flex-1 overflow-hidden group">
                <img 
                  src={selectedProperty.images[activeImageIndex]} 
                  alt={selectedProperty.title} 
                  className="w-full h-full object-contain bg-black"
                />
                
                {/* Navigation Arrows */}
                {selectedProperty.images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(prev => (prev === 0 ? selectedProperty.images.length - 1 : prev - 1));
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(prev => (prev === selectedProperty.images.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {selectedProperty.images.length > 1 && (
                <div className="p-4 bg-gray-900 overflow-x-auto flex gap-2 scrollbar-hide">
                  {selectedProperty.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={cn(
                        "relative flex-none w-20 h-16 rounded-lg overflow-hidden border-2 transition-all",
                        activeImageIndex === i ? "border-orange-500 opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={img} alt={`Thumbnail ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Right Side - Details */}
            <div className="w-full lg:w-2/5 flex flex-col bg-white h-[50vh] lg:h-auto">
              <div className="p-6 lg:p-8 overflow-y-auto flex-1">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 mb-2">
                      {selectedProperty.bhk_type}
                    </div>
                    {selectedProperty.status === 'rented' && (
                      <div className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 mb-2 ml-2 uppercase tracking-wider">
                        Rented
                      </div>
                    )}
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">{selectedProperty.title}</h2>
                    <div className="mt-2 flex items-center text-gray-500">
                      <MapPin className="mr-1.5 h-4 w-4 text-orange-500" />
                      {selectedProperty.location}{selectedProperty.pincode ? `, ${selectedProperty.pincode}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const text = `Check out this ${selectedProperty.bhk_type} for rent in ${selectedProperty.location} for ₹${selectedProperty.price}/month on RentalConnect!`;
                        const url = window.location.origin;
                        if (navigator.share) {
                          navigator.share({
                            title: selectedProperty.title,
                            text: text,
                            url: url
                          }).catch(console.error);
                        } else {
                          window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-orange-600 transition-colors rounded-full hover:bg-orange-50"
                      title="Share on WhatsApp"
                    >
                      <Share2 className="h-6 w-6" />
                    </button>
                    <button 
                      onClick={() => setSelectedProperty(null)}
                      className="text-gray-400 hover:text-gray-500 lg:hidden"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-orange-600">₹{selectedProperty.price.toLocaleString('en-IN')}</span>
                  <span className="text-gray-500">/ month</span>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Bed className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bedrooms</p>
                      <p className="font-semibold text-gray-900">{selectedProperty.bhk_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Bath className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bathrooms</p>
                      <p className="font-semibold text-gray-900">{selectedProperty.bathrooms} Bath</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Description</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{selectedProperty.description}</p>
                </div>

                {/* Agent Card */}
                <div className="mt-8 p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      A
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Verified Agent</p>
                      <p className="text-xs text-blue-600">Premium Partner</p>
                    </div>
                  </div>
                  
                  {selectedProperty.status === 'rented' ? (
                    <div className="w-full bg-gray-200 text-gray-500 py-3 rounded-xl font-bold text-center border-2 border-dashed border-gray-300 cursor-not-allowed uppercase tracking-wider text-sm">
                      Property Rented
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {user ? (
                        user.role === 'customer' ? (
                          <>
                            {revealedNumbers.has(selectedProperty.id) ? (
                              <div className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-green-700 border border-green-200 shadow-sm">
                                <Phone className="h-4 w-4" />
                                {selectedProperty.agent_phone}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleViewNumber(selectedProperty.id)}
                                className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
                              >
                                <Phone className="h-4 w-4" />
                                View Phone Number
                              </button>
                            )}

                            <button
                              onClick={() => handleInterested(selectedProperty.id, selectedProperty.agent_phone)}
                              disabled={interestedProps.has(selectedProperty.id)}
                              className={cn(
                                "col-span-2 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all",
                                interestedProps.has(selectedProperty.id)
                                  ? "bg-green-600 cursor-default"
                                  : "bg-orange-600 hover:bg-orange-700"
                              )}
                            >
                              {interestedProps.has(selectedProperty.id) ? (
                                <>
                                  <Heart className="h-4 w-4 fill-current" />
                                  Interest Sent
                                </>
                              ) : (
                                <>
                                  <Heart className="h-4 w-4" />
                                  I'm Interested
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <div className="col-span-2 text-center text-sm text-gray-500 py-2">
                            Logged in as Agent
                          </div>
                        )
                      ) : (
                        <Link
                          to="/login"
                          className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition-colors"
                        >
                          Login to Contact
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Desktop Close Button */}
              <button 
                onClick={() => setSelectedProperty(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hidden lg:block bg-white rounded-full p-1 shadow-sm"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SEO Content Section */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Why Choose RentalConnect for Renting Homes in Delhi NCR?
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Finding the perfect <strong className="text-gray-900">rental home</strong> can be challenging, but RentalConnect makes it easy. Whether you are looking for <strong className="text-gray-900">flats for rent in Shaheen Bagh</strong>, spacious <strong className="text-gray-900">rooms for rent in Okhla</strong>, or premium apartments in <strong className="text-gray-900">Jamia Nagar</strong>, we have the most comprehensive listings in Delhi NCR. 
            </p>
            <p className="text-gray-600 leading-relaxed">
              Our platform connects you directly with verified property owners and top real estate agents. From 1 RK studios to luxury 4 BHK apartments, your search for a <strong className="text-gray-900">rent home</strong> ends here. We specialize in the South Delhi region, ensuring you get the best deals in Shaheen Bagh, Okhla, Jamia Nagar, and surrounding areas without hidden brokerage fees.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section with Map */}
      <section className="mt-24 bg-gray-900 text-white relative overflow-hidden pb-16">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-orange-500 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  Find your next home in <span className="text-orange-500">Delhi NCR</span>
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                  We are the leading platform connecting verified owners and tenants across Delhi, Noida, and Gurugram.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 backdrop-blur-sm hover:border-orange-500/50 transition-colors">
                  <div className="text-4xl font-black text-white mb-2">10k+</div>
                  <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">Active Properties</div>
                </div>
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 backdrop-blur-sm hover:border-orange-500/50 transition-colors">
                  <div className="text-4xl font-black text-white mb-2">50k+</div>
                  <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">Happy Tenants</div>
                </div>
              </div>
            </motion.div>

            {/* Right Map */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-gray-700/50 group"
            >
              <div className="absolute inset-0 bg-gray-900/20 group-hover:bg-transparent transition-colors duration-500 z-10 pointer-events-none"></div>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d224345.83923192776!2d77.06889754720611!3d28.52758200617607!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfd5b347eb62d%3A0x52c2b7494e204dce!2sNew%20Delhi%2C%20Delhi!5e0!3m2!1sen!2sin!4v1709000000000!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale contrast-125 opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
              ></iframe>
              
              {/* Floating Badge */}
              <div className="absolute bottom-6 left-6 z-20 bg-gray-900/80 backdrop-blur-md border border-gray-700 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </div>
                <span className="text-sm font-semibold text-white tracking-wide">Serving Delhi NCR</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
