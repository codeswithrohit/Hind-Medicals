import React, { useState, useEffect, useMemo } from 'react';
import { firebase } from '../Firebase/config';

// Utility to strip HTML tags from the description string
const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const App = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [activePolicy, setActivePolicy] = useState(null);

  const ITEMS_PER_PAGE = 15;
  const phoneNumber = "917607140025";

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOrderNow = () => {
    const message = encodeURIComponent("Hello Hare Krishna Pharmacy! I would like to place an order for medicines.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleOrderSpecificItem = (item, price) => {
    const itemName = item.name || 'a medicine';
    const itemPrice = price !== 'N/A' ? ` (₹${price})` : '';
    const message = encodeURIComponent(`Hello Hare Krishna Pharmacy! I would like to order: ${itemName}${itemPrice}`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const name = e.target.userName.value;
    const email = e.target.userEmail.value;
    const msg = e.target.userMessage.value;
    const text = encodeURIComponent(`Hello Hare Krishna Pharmacy,\n\nName: ${name}\nEmail: ${email}\nMessage: ${msg}`);
    window.open(`https://wa.me/${phoneNumber}?text=${text}`, '_blank');
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const snapshot = await firebase.firestore().collection('Products').get();
        const products = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter only Active and Viewable products if your database uses these flags
        const availableProducts = products.filter(
          item => item.Active === "True" && item.View === "True"
        );

        setMenuItems(availableProducts.length > 0 ? availableProducts : products);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load inventory. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(menuItems.map((item) => item.categoryName || item.category).filter(Boolean))];
    return ['All', ...cats.sort()];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') return menuItems;
    return menuItems.filter((item) => (item.categoryName === activeCategory || item.category === activeCategory));
  }, [menuItems, activeCategory]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const SkeletonCard = () => (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 animate-pulse shadow-sm flex flex-col h-full">
      <div className="aspect-square bg-gray-100" />
      <div className="p-4 space-y-3 flex-grow">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-full mt-4" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
      <div className="p-4 border-t border-gray-50 flex justify-between">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-8 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );

  const renderPolicyContent = () => {
    switch (activePolicy) {
      case 'privacy':
        return (
          <>
            <h3 className="text-xl font-bold text-red-600 mb-4 border-b pb-2">Privacy Policy</h3>
            <div className="space-y-4 text-gray-600 text-sm">
              <p>At Hare Krishna Pharmacy, we value your trust and take your privacy seriously. This policy outlines how we handle your data when you order medicines or use our services.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>We collect personal details (name, phone number, address) strictly for processing and delivering your orders.</li>
                <li>Your prescription and health data are handled with the utmost confidentiality.</li>
                <li>We do not sell or rent your personal information to third parties.</li>
              </ul>
            </div>
          </>
        );
      case 'refund':
        return (
          <>
            <h3 className="text-xl font-bold text-red-600 mb-4 border-b pb-2">Refund & Return Policy</h3>
            <div className="space-y-4 text-gray-600 text-sm">
              <p>For the safety and hygiene of our customers, the return of medical products is heavily restricted.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Medicines can only be returned if they are delivered expired, damaged, or if the wrong product was dispatched.</li>
                <li>Please verify your order at the time of delivery. Any discrepancies must be reported within 24 hours.</li>
                <li>Approved refunds will be processed back to your original payment method or adjusted in your next order.</li>
              </ul>
            </div>
          </>
        );
      case 'terms':
        return (
          <>
            <h3 className="text-xl font-bold text-red-600 mb-4 border-b pb-2">Terms & Conditions</h3>
            <div className="space-y-4 text-gray-600 text-sm">
              <p>Welcome to Hare Krishna Pharmacy. By utilizing our services, you agree to the following terms:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Prescription Medications:</strong> We legally require a valid prescription from a registered medical practitioner before dispensing Schedule H/H1 drugs.</li>
                <li>Prices are subject to change based on the latest batches provided by manufacturers. The final bill provided during delivery will reflect the exact amount.</li>
              </ul>
            </div>
          </>
        );
      case 'shipping':
        return (
          <>
            <h3 className="text-xl font-bold text-red-600 mb-4 border-b pb-2">Delivery Policy</h3>
            <div className="space-y-4 text-gray-600 text-sm">
              <p>We are committed to delivering your healthcare essentials promptly.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Delivery is available within Gilat Bazar and surrounding areas in Varanasi.</li>
                <li>Standard orders are processed and dispatched within a few hours.</li>
                <li>A nominal delivery fee may apply depending on the distance and order value.</li>
              </ul>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      
      {/* Top Notification Bar */}
      <div className="bg-red-700 text-white text-xs font-semibold py-2 text-center tracking-wide">
        Call / WhatsApp for quick home delivery: +91 7607140025
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between py-4 gap-4">
            
            <div onClick={() => scrollTo('home')} className="flex items-center gap-3 cursor-pointer group">
              <div className="p-1.5 bg-red-50 rounded-lg border border-red-100 group-hover:bg-red-100 transition-colors">
                <img src="logo.png" alt="Hare Krishna Pharmacy" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-700 leading-tight">
                  HARE KRISHNA
                </h1>
                <p className="text-[10px] sm:text-xs font-bold tracking-[0.15em] text-yellow-600 uppercase">
                  Pharmacy
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-4 sm:gap-8 overflow-x-auto scrollbar-hide pb-1 sm:pb-0 w-full md:w-auto justify-start md:justify-end">
              {['Home', 'Store', 'About', 'Contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollTo(item.toLowerCase() === 'store' ? 'products' : item.toLowerCase())}
                  className="text-sm font-bold text-gray-600 hover:text-red-700 transition-colors whitespace-nowrap"
                >
                  {item}
                </button>
              ))}
              <button 
                onClick={handleOrderNow}
                className="hidden md:flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm transition-colors"
              >
                Upload Prescription
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative bg-white pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden border-b border-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-50 via-white to-white opacity-70"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-12">
          
          <div className="flex-1 text-center md:text-left space-y-6">
            <span className="inline-block py-1 px-3 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">
              Gilat Bazar, Varanasi
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              Genuine Medicines.<br/>
              <span className="text-red-600">Trusted Care.</span>
            </h2>
            <p className="text-gray-600 text-base md:text-lg max-w-xl mx-auto md:mx-0">
              Your neighborhood pharmacy providing authentic medical supplies, surgical devices, baby care, and everyday healthcare essentials directly to your doorstep.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-4">
              <button onClick={() => scrollTo('products')} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-lg font-bold text-sm shadow-lg shadow-red-600/20 transition-all">
                Shop Medicines
              </button>
              <button onClick={handleOrderNow} className="w-full sm:w-auto bg-white border-2 border-gray-200 hover:border-green-500 hover:text-green-600 text-gray-700 px-8 py-3.5 rounded-lg font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2">
                Order via WhatsApp
              </button>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md md:max-w-none flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
              <img src="logo.png" alt="Pharmacy" className="relative z-10 w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Store Section */}
      <section id="products" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Products</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Browse our extensive inventory of allopathic medicines, ayurvedic products, surgical equipment, and personal care items.</p>
          </div>

          {/* Categories Sidebar/Top Bar */}
          {!loading && !error && categories.length > 1 && (
            <div className="mb-10 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
              <div className="flex overflow-x-auto scrollbar-hide gap-2 p-1 items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 shrink-0">Categories:</span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                      activeCategory === cat
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-16 bg-white rounded-2xl border border-red-100 shadow-sm">
              <p className="text-red-500 font-medium mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="bg-red-50 text-red-600 border border-red-200 px-6 py-2 rounded-md font-bold text-sm hover:bg-red-100 transition-colors">
                Reload Inventory
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {Array.from({ length: 15 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : !error && (
            <>
              {filteredItems.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                    {paginatedItems.map((item) => {
                      // Extracting nested JSON data structure securely
                      const priceInfo = item.priceDetails && item.priceDetails.length > 0 ? item.priceDetails[0] : {};
                      const currentPrice = priceInfo.discountPrice && priceInfo.discountPrice !== "" ? priceInfo.discountPrice : priceInfo.price;
                      const hasDiscount = priceInfo.discountPrice && parseFloat(priceInfo.discountPrice) < parseFloat(priceInfo.price);
                      const originalPrice = priceInfo.price;
                      const imageUrl = (priceInfo.images && priceInfo.images.length > 0) ? priceInfo.images[0] : 'logo.png';
                      const brandName = item.brandName || item.brand || item.companyName;
                      const cleanDescription = stripHtml(item.description);

                      return (
                        <div key={item.id} className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                          
                          {/* Product Image Area */}
                          <div className="relative aspect-square bg-white p-4 flex items-center justify-center overflow-hidden border-b border-gray-50">
                            {hasDiscount && (
                              <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10">
                                SALE
                              </div>
                            )}
                            <img
                              src={imageUrl}
                              alt={item.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => { e.target.onerror = null; e.target.src = 'logo.png'; }}
                            />
                          </div>

                          {/* Product Details */}
                          <div className="p-4 flex flex-col flex-grow">
                            <div className="mb-1 flex items-start justify-between gap-2">
                              {brandName && brandName !== "-BLANK-" && brandName !== "NA" && (
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                                  {brandName}
                                </span>
                              )}
                            </div>
                            
                            <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug mb-2">
                              {item.name || 'Unknown Product'}
                            </h3>
                            
                         

                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                              <div className="flex flex-col">
                                {currentPrice ? (
                                  <>
                                    <span className="text-red-600 font-extrabold text-base leading-none">
                                      ₹{currentPrice}
                                    </span>
                                    {hasDiscount && (
                                      <span className="text-gray-400 text-[10px] line-through mt-0.5">
                                        ₹{originalPrice}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-500 font-bold text-sm">Price on req</span>
                                )}
                              </div>
                              
                              <button
                                onClick={() => handleOrderSpecificItem(item, currentPrice || 'N/A')}
                                className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg p-2 transition-colors border border-red-100 hover:border-red-600"
                                aria-label="Order Product"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Enhanced Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <p className="text-xs font-semibold text-gray-500">
                        Showing <span className="text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}</span> of <span className="text-gray-900">{filteredItems.length}</span> products
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 rounded-md text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 transition-all"
                        >
                          Previous
                        </button>
                        
                        <div className="px-4 py-2 bg-red-50 text-red-700 rounded-md text-sm font-bold border border-red-100">
                           {currentPage} / {totalPages}
                        </div>

                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 rounded-md text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 transition-all"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <div className="text-4xl mb-4 opacity-50">💊</div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">No products found</h3>
                  <p className="text-gray-500 text-sm">We couldn't find any items in the "{activeCategory}" category.</p>
                  <button 
                    onClick={() => handleCategoryChange('All')}
                    className="mt-6 text-red-600 font-bold hover:underline"
                  >
                    View All Products
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
              <span className="text-yellow-600 text-sm font-black tracking-widest uppercase">About Us</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Your Health Partner in Gilat Bazar</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                Hare Krishna Pharmacy has established itself as a beacon of trust and reliability in Varanasi. We are dedicated to dispensing genuine medicines, life-saving drugs, and wellness products with uncompromised quality.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Whether you need specialized devices like knee immobilizers, chronic care medications for diabetes and blood pressure, or daily personal care items, our extensive inventory ensures you find exactly what your doctor prescribed. Our pharmacists verify every batch for authenticity and expiry to guarantee your safety.
              </p>
              <div className="pt-4 grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-red-600 text-2xl mb-1">100%</h4>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Genuine Medicines</p>
                </div>
                <div>
                  <h4 className="font-bold text-red-600 text-2xl mb-1">24/7</h4>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">WhatsApp Support</p>
                </div>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="bg-red-50 p-6 rounded-2xl flex flex-col justify-center items-center text-center gap-3">
                <span className="text-4xl">🚑</span>
                <h4 className="font-bold text-gray-900">Fast Delivery</h4>
                <p className="text-xs text-gray-600">Quick dispatch for urgent medical needs</p>
              </div>
              <div className="bg-yellow-50 p-6 rounded-2xl flex flex-col justify-center items-center text-center gap-3 mt-8">
                <span className="text-4xl">🛡️</span>
                <h4 className="font-bold text-gray-900">Verified Quality</h4>
                <p className="text-xs text-gray-600">Sourced directly from authorized distributors</p>
              </div>
              <div className="bg-blue-50 p-6 rounded-2xl flex flex-col justify-center items-center text-center gap-3 -mt-8">
                <span className="text-4xl">👨‍⚕️</span>
                <h4 className="font-bold text-gray-900">Expert Advice</h4>
                <p className="text-xs text-gray-600">Guidance on dosages and usage</p>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl flex flex-col justify-center items-center text-center gap-3">
                <span className="text-4xl">📱</span>
                <h4 className="font-bold text-gray-900">Easy Ordering</h4>
                <p className="text-xs text-gray-600">Upload prescription via WhatsApp</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row">
            
            {/* Contact Info Panel */}
            <div className="bg-red-700 text-white p-10 lg:w-2/5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
              
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-2">Get in Touch</h3>
                <p className="text-red-100 mb-10 text-sm">Have a question about a medicine or need help finding a product? We are here to assist.</p>
                
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-600 p-3 rounded-full shrink-0">📍</div>
                    <div>
                      <h4 className="font-bold text-sm text-red-200 uppercase tracking-widest mb-1">Visit Store</h4>
                      <p className="font-medium text-lg leading-snug">Hare Krishna Pharmacy,<br/>Near Police Station,<br/>Gilat Bazar, Varanasi</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-red-600 p-3 rounded-full shrink-0">📞</div>
                    <div>
                      <h4 className="font-bold text-sm text-red-200 uppercase tracking-widest mb-1">Call / WhatsApp</h4>
                      <p className="font-medium text-xl">+91 7607140025</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Panel */}
            <div className="p-10 lg:w-3/5 bg-white">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Send an Inquiry</h3>
              <form onSubmit={handleSendMessage} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                    <input
                      type="text"
                      name="userName"
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email (Optional)</label>
                    <input
                      type="email"
                      name="userEmail"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all outline-none"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Prescription Details / Message</label>
                  <textarea
                    name="userMessage"
                    required
                    rows="4"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all outline-none resize-none"
                    placeholder="List the medicines you need or type your query here..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg shadow-md transition-colors flex justify-center items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                  </svg>
                  Connect on WhatsApp
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10 border-b border-gray-800 pb-10">
            
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white p-1 rounded">
                  <img src="logo.png" alt="Logo" className="h-10 w-10 object-contain" />
                </div>
                <h2 className="text-xl font-black text-white tracking-wide">
                  HARE KRISHNA <span className="text-yellow-500">PHARMACY</span>
                </h2>
              </div>
              <p className="text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">
                Dedicated to improving the health and well-being of the Varanasi community by providing authentic medicines and superior pharmaceutical care.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                {['Home', 'Products', 'About', 'Contact'].map((link) => (
                  <li key={link}>
                    <button onClick={() => scrollTo(link.toLowerCase())} className="hover:text-yellow-500 transition-colors">
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Policies</h4>
              <ul className="space-y-3 text-sm">
                <li><button onClick={() => setActivePolicy('privacy')} className="hover:text-yellow-500 transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setActivePolicy('terms')} className="hover:text-yellow-500 transition-colors">Terms of Service</button></li>
                <li><button onClick={() => setActivePolicy('refund')} className="hover:text-yellow-500 transition-colors">Return Policy</button></li>
                <li><button onClick={() => setActivePolicy('shipping')} className="hover:text-yellow-500 transition-colors">Delivery Info</button></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 font-medium">
            <p>© {new Date().getFullYear()} Hare Krishna Pharmacy. All rights reserved.</p>
            <p className="tracking-widest uppercase">Genuine • Trusted • Caring</p>
          </div>
        </div>
      </footer>

      {/* Policy Modal Overlay */}
      {activePolicy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <img src="logo.png" alt="Logo" className="h-6 w-6 object-contain" />
                <span className="font-bold text-sm tracking-wider text-gray-900 uppercase">Legal Information</span>
              </div>
              <button 
                onClick={() => setActivePolicy(null)}
                className="text-gray-400 hover:text-red-600 bg-white border border-gray-200 rounded-full p-2 transition-colors hover:bg-red-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
              {renderPolicyContent()}
            </div>
            
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setActivePolicy(null)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm shadow-md transition-colors"
              >
                Accept & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Action Button */}
      <button 
        onClick={handleOrderNow}
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
        </svg>
      </button>
      
    </div>
  );
};

export default App;