import React, { useState, useEffect, useMemo } from 'react';
import { firebase } from '../Firebase/config';

// Utility to strip HTML tags from the description string
const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const App = ({ businessData }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activePolicy, setActivePolicy] = useState(null);

  const ITEMS_PER_PAGE = 15;

  // --- Dynamic Business Data Extraction ---
  const bName = businessData?.businessName || "Our Store";
  const bCategory = businessData?.businessCategory || "Pharmacy";
  const bAddress = businessData?.fullOfficeAddress || "Our Store Address";
  const bCity = businessData?.businessAddress || "Your City";
  const bLogo = businessData?.logoUrl || "logo.png";
  const displayPhone = businessData?.verifiedMobile || "";
  // Strip non-numeric characters for WhatsApp link (e.g. "+917667411503" -> "917667411503")
  const waPhone = displayPhone.replace(/\D/g, ''); 

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOrderNow = () => {
    const message = encodeURIComponent(`Hello ${bName}! I would like to place an order for medicines.`);
    window.open(`https://wa.me/${waPhone}?text=${message}`, '_blank');
  };

  const handleOrderSpecificItem = (item, price) => {
    const itemName = item.name || 'a medicine';
    const itemPrice = price !== 'N/A' ? ` (₹${price})` : '';
    const message = encodeURIComponent(`Hello ${bName}! I would like to order: ${itemName}${itemPrice}`);
    window.open(`https://wa.me/${waPhone}?text=${message}`, '_blank');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const name = e.target.userName.value;
    const email = e.target.userEmail.value;
    const msg = e.target.userMessage.value;
    const text = encodeURIComponent(`Hello ${bName},\n\nName: ${name}\nEmail: ${email}\nMessage: ${msg}`);
    window.open(`https://wa.me/${waPhone}?text=${text}`, '_blank');
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Prioritize pre-loaded products from businessData if available
        if (businessData?.products && businessData.products.length > 0) {
          const availableProducts = businessData.products.filter(
            item => item.Active === "True" || item.View === "True" || true
          );
          setMenuItems(availableProducts);
          setLoading(false);
          return;
        }

        // 2. Fallback to Firebase fetch using dynamic customerId
        if (businessData?.customerId) {
          const snapshot = await firebase.firestore()
            .collection('BusinessUsers')
            .where('customerId', '==', businessData.customerId)
            .get();
            
          if (!snapshot.empty) {
            const docData = snapshot.docs[0].data();
            const products = docData.products || [];
            const availableProducts = products.filter(
              item => item.Active === "True" || item.View === "True" || true
            );
            setMenuItems(availableProducts.length > 0 ? availableProducts : products);
          } else {
            console.warn("No business found for the provided customerId.");
            setMenuItems([]);
          }
        } else {
            setMenuItems([]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load inventory. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [businessData]);

  const categories = useMemo(() => {
    const cats = [...new Set(menuItems.map((item) => item.categoryName || item.category).filter(Boolean))];
    return ['All', ...cats.sort()];
  }, [menuItems]);

  // Combined filter: category + search
  const filteredItems = useMemo(() => {
    let items = menuItems;

    if (activeCategory !== 'All') {
      items = items.filter(
        (item) => item.categoryName === activeCategory || item.category === activeCategory
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((item) => {
        const name = (item.name || '').toLowerCase();
        const brand = (item.companyName || item.brandName || item.brand || '').toLowerCase();
        const category = (item.categoryName || item.category || '').toLowerCase();
        return name.includes(q) || brand.includes(q) || category.includes(q);
      });
    }

    return items;
  }, [menuItems, activeCategory, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden animate-pulse flex flex-col h-full shadow-sm">
      <div className="aspect-square bg-slate-100" />
      <div className="p-4 space-y-3 flex-grow">
        <div className="h-2.5 bg-slate-200 rounded w-1/3" />
        <div className="h-4 bg-slate-200 rounded w-full" />
        <div className="h-4 bg-slate-200 rounded w-4/5" />
      </div>
      <div className="px-4 pb-4 flex justify-between items-center">
        <div className="h-5 bg-slate-200 rounded w-1/3" />
        <div className="h-9 w-9 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );

  const renderPolicyContent = () => {
    switch (activePolicy) {
      case 'privacy':
        return (
          <>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Privacy Policy</h3>
            <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
              <p>At {bName}, we value your trust and take your privacy seriously. This policy outlines how we handle your data when you order medicines or use our services.</p>
              <ul className="space-y-2 list-disc pl-4 marker:text-blue-700">
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
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Refund & Return Policy</h3>
            <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
              <p>For the safety and hygiene of our customers, the return of medical products is heavily restricted.</p>
              <ul className="space-y-2 list-disc pl-4 marker:text-blue-700">
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
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Terms & Conditions</h3>
            <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
              <p>Welcome to {bName}. By utilizing our services, you agree to the following terms:</p>
              <ul className="space-y-2 list-disc pl-4 marker:text-blue-700">
                <li><strong>Prescription Medications:</strong> We legally require a valid prescription from a registered medical practitioner before dispensing Schedule H/H1 drugs.</li>
                <li>Prices are subject to change based on the latest batches provided by manufacturers. The final bill provided during delivery will reflect the exact amount.</li>
              </ul>
            </div>
          </>
        );
      case 'shipping':
        return (
          <>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Delivery Policy</h3>
            <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
              <p>We are committed to delivering your healthcare essentials promptly.</p>
              <ul className="space-y-2 list-disc pl-4 marker:text-blue-700">
                <li>Delivery is available within {bAddress} and surrounding areas.</li>
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white text-[11px] font-medium py-2.5 text-center tracking-wide">
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Call / WhatsApp for quick home delivery — {displayPhone}
        </span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-[72px] gap-4">
            <div onClick={() => scrollTo('home')} className="flex items-center gap-3 cursor-pointer group shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-100 rounded-xl scale-110 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <img src={bLogo} alt={bName} className="relative h-10 w-10 object-contain rounded-full bg-white" />
              </div>
              <div>
                <h1 className="text-[15px] sm:text-[17px] font-bold text-slate-900 leading-none tracking-tight uppercase">{bName}</h1>
                <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-700 uppercase mt-0.5">{bCategory}</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {['Home', 'Store', 'About', 'Contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollTo(item.toLowerCase() === 'store' ? 'products' : item.toLowerCase())}
                  className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition-all"
                >
                  {item}
                </button>
              ))}
              <button
                onClick={handleOrderNow}
                className="ml-3 bg-blue-800 hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-blue-900/20 transition-all hover:shadow-md"
              >
                Upload Prescription
              </button>
            </nav>

            <button
              onClick={handleOrderNow}
              className="md:hidden bg-blue-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm"
            >
              Order Now
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="home" className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-700"></span>
                <span className="text-xs font-semibold text-blue-800 tracking-wide uppercase">{bCity}</span>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-slate-900 leading-[1.12] tracking-tight">
                Genuine Medicines.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-blue-600">Trusted Care.</span>
              </h2>
              <p className="text-slate-600 text-[15px] sm:text-base max-w-md mx-auto lg:mx-0 leading-relaxed">
                Authentic medicines, surgical supplies & healthcare essentials — delivered with care to your doorstep in {bCity}.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
                <button
                  onClick={() => scrollTo('products')}
                  className="w-full sm:w-auto bg-blue-800 hover:bg-blue-900 text-white px-7 py-3.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-900/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                  Shop Medicines
                </button>
                <button
                  onClick={handleOrderNow}
                  className="w-full sm:w-auto bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 text-slate-700 hover:text-blue-800 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all"
                >
                  Order via WhatsApp
                </button>
              </div>
            </div>

            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute -inset-6 bg-gradient-to-br from-blue-100/70 to-slate-100/40 rounded-full blur-3xl"></div>
                <img
                  src={bLogo}
                  alt={bName}
                  className="relative w-52 h-52 sm:w-60 sm:h-60 lg:w-72 lg:h-72 object-contain drop-shadow-sm rounded-full bg-white p-2 border border-slate-100"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Our Products</h2>
              <p className="text-slate-500 text-sm mt-1.5">Allopathic · Ayurvedic · Surgical · Personal Care</p>
            </div>

            {/* Search Bar */}
            <div className="w-full lg:w-96 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4.5 w-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search medicines, brands..."
                className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          {!loading && !error && categories.length > 1 && (
            <div className="mb-8 -mx-1">
              <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-thin">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat
                        ? 'bg-blue-800 text-white shadow-md shadow-blue-900/20'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active filters indicator */}
          {(searchQuery || activeCategory !== 'All') && !loading && (
            <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Showing results for:</span>
              {activeCategory !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100">
                  {activeCategory}
                  <button onClick={() => handleCategoryChange('All')} className="hover:text-blue-950">×</button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium border border-slate-200">
                  “{searchQuery}”
                  <button onClick={clearSearch} className="hover:text-slate-900">×</button>
                </span>
              )}
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-14 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-red-600 text-sm font-medium mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl transition-colors"
              >
                Reload Inventory
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
              {Array.from({ length: 15 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : !error && (
            <>
              {filteredItems.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                    {paginatedItems.map((item) => {
                      const variantInfo = item.variants && item.variants.length > 0 ? item.variants[0] : {};
                      const currentPrice = item.offerPrice || variantInfo.offerPrice || item.price || variantInfo.price;
                      const originalPrice = item.price || variantInfo.price;
                      const hasDiscount = currentPrice && originalPrice && parseFloat(currentPrice) < parseFloat(originalPrice);
                      const imageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : (item.imageUrl || 'logo.png');
                      const brandName = item.companyName || item.brandName || item.brand;

                      return (
                        <div
                          key={item.id}
                          className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-lg hover:border-blue-200/60 hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
                        >
                          <div className="relative aspect-square bg-gradient-to-b from-slate-50 to-white p-4 flex items-center justify-center">
                            {hasDiscount && (
                              <span className="absolute top-3 left-3 z-10 bg-blue-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                                SALE
                              </span>
                            )}
                            <img
                              src={bLogo}
                              alt={item.name}
                              className="w-full h-full object-contain group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                              onError={(e) => { e.target.onerror = null; e.target.src = 'logo.png'; }}
                            />
                          </div>

                          <div className="p-4 flex flex-col flex-grow">
                            {brandName && brandName !== "-BLANK-" && brandName !== "NA" && (
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 truncate">
                                {brandName}
                              </span>
                            )}
                            <h3 className="text-[13px] font-semibold text-slate-800 line-clamp-2 leading-snug mb-3 min-h-[2.5rem]">
                              {item.name || 'Unknown Product'}
                            </h3>

                            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                              <div className="min-w-0">
                                {currentPrice ? (
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-blue-800 font-bold text-[15px] tracking-tight">
                                      ₹{Number(currentPrice).toFixed(0)}
                                    </span>
                                    {hasDiscount && (
                                      <span className="text-slate-400 text-xs line-through">
                                        ₹{Number(originalPrice).toFixed(0)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-xs font-medium">Price on request</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleOrderSpecificItem(item, currentPrice || 'N/A')}
                                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-800 hover:text-white border border-blue-100 hover:border-blue-800 shadow-sm transition-all duration-200"
                                aria-label="Order Product"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
                      <p className="text-xs text-slate-500 font-medium">
                        Showing <span className="text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–<span className="text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}</span> of <span className="text-slate-800">{filteredItems.length}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                          Previous
                        </button>
                        <span className="px-3.5 py-2 text-sm font-semibold text-blue-800 bg-blue-50 rounded-xl border border-blue-100">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center">
                    <span className="text-2xl opacity-60">💊</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 mb-1">No products found</h3>
                  <p className="text-sm text-slate-500 mb-5">
                    {searchQuery
                      ? `No results for “${searchQuery}”${activeCategory !== 'All' ? ` in ${activeCategory}` : ''}.`
                      : `No items available in “${activeCategory}”.`}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {searchQuery && (
                      <button
                        onClick={clearSearch}
                        className="text-sm font-semibold text-blue-800 hover:text-blue-900 hover:underline"
                      >
                        Clear Search
                      </button>
                    )}
                    {activeCategory !== 'All' && (
                      <button
                        onClick={() => handleCategoryChange('All')}
                        className="text-sm font-semibold text-blue-800 hover:text-blue-900 hover:underline"
                      >
                        View All Products
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-16 lg:py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-5">
              <span className="inline-block text-xs font-bold tracking-[0.15em] uppercase text-blue-700">About Us</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
                Your Health Partner<br className="hidden sm:block" /> in {bCity}
              </h2>
              <p className="text-slate-600 text-[15px] leading-relaxed">
                {bName} is a trusted name in {bCity} for genuine medicines, life-saving drugs and wellness products. Every batch is carefully verified for authenticity and expiry.
              </p>
              <p className="text-slate-600 text-[15px] leading-relaxed">
                From chronic care medications to surgical devices and daily personal care, we stock what your doctor prescribes — with experienced pharmacists ready to guide you.
              </p>
              <div className="flex gap-10 pt-3">
                <div>
                  <p className="text-2xl font-bold text-blue-800 tracking-tight">100%</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Genuine</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-800 tracking-tight">24/7</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">WhatsApp Support</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'Fast Delivery', desc: 'Quick dispatch for urgent medical needs', color: 'bg-blue-50 border-blue-100' },
                { title: 'Verified Quality', desc: 'Sourced from authorized distributors', color: 'bg-slate-50 border-slate-200' },
                { title: 'Expert Advice', desc: 'Guidance on dosages & usage', color: 'bg-indigo-50 border-indigo-100' },
                { title: 'Easy Ordering', desc: 'Upload prescription via WhatsApp', color: 'bg-emerald-50 border-emerald-100' },
              ].map((card) => (
                <div key={card.title} className={`${card.color} border rounded-2xl p-5 transition-transform hover:-translate-y-0.5`}>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1.5">{card.title}</h4>
                  <p className="text-xs text-slate-600 leading-snug">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 lg:py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]">
            <div className="grid lg:grid-cols-5">
              {/* Info Panel */}
              <div className="lg:col-span-2 relative bg-gradient-to-br from-slate-900 to-blue-950 text-white p-8 sm:p-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/20 rounded-full translate-y-1/2 -translate-x-1/3"></div>
                <div className="relative">
                  <h3 className="text-2xl font-bold mb-2 tracking-tight">Get in Touch</h3>
                  <p className="text-blue-100/80 text-sm mb-8 leading-relaxed">
                    Questions about a medicine or need help finding a product? We’re here to assist you.
                  </p>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider mb-1.5">Visit Store</p>
                      <p className="text-[15px] font-medium leading-snug whitespace-pre-line">
                        {bName}{'\n'}
                        {bAddress}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider mb-1.5">Call / WhatsApp</p>
                      <p className="text-xl font-semibold tracking-tight">{displayPhone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-3 p-8 sm:p-10">
                <h3 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">Send an Inquiry</h3>
                <form onSubmit={handleSendMessage} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                      <input
                        type="text"
                        name="userName"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Email (Optional)</label>
                      <input
                        type="email"
                        name="userEmail"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Message / Prescription Details</label>
                    <textarea
                      name="userMessage"
                      required
                      rows="3"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                      placeholder="List the medicines you need or type your query..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-3.5 rounded-xl text-sm shadow-md shadow-blue-900/20 transition-all hover:shadow-lg flex items-center justify-center gap-2.5"
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
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src={bLogo} alt="Logo" className="h-9 w-9 object-contain bg-white rounded-lg p-1" />
                <span className="text-white font-bold text-sm tracking-wide uppercase">
                  {bName}
                </span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs text-slate-400">
                Authentic medicines and superior pharmaceutical care for the {bCity} community.
              </p>
            </div>

            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-sm">
                {['Home', 'Products', 'About', 'Contact'].map((link) => (
                  <li key={link}>
                    <button onClick={() => scrollTo(link.toLowerCase())} className="hover:text-white transition-colors">
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Policies</h4>
              <ul className="space-y-2.5 text-sm">
                <li><button onClick={() => setActivePolicy('privacy')} className="hover:text-white transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setActivePolicy('terms')} className="hover:text-white transition-colors">Terms of Service</button></li>
                <li><button onClick={() => setActivePolicy('refund')} className="hover:text-white transition-colors">Return Policy</button></li>
                <li><button onClick={() => setActivePolicy('shipping')} className="hover:text-white transition-colors">Delivery Info</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <p>© {new Date().getFullYear()} {bName}. All rights reserved.</p>
            <p className="text-slate-500 tracking-wide">Genuine · Trusted · Caring</p>
          </div>
        </div>
      </footer>

      {/* Policy Modal */}
      {activePolicy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[82vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <span className="text-sm font-semibold text-slate-900 tracking-wide">Legal Information</span>
              <button
                onClick={() => setActivePolicy(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow">
              {renderPolicyContent()}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex justify-end">
              <button
                onClick={() => setActivePolicy(null)}
                className="bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp */}
      <button
        onClick={handleOrderNow}
        className="fixed bottom-6 right-6 bg-emerald-500 hover:bg-emerald-600 text-white w-14 h-14 rounded-full shadow-xl shadow-emerald-500/30 flex items-center justify-center z-50 transition-all hover:scale-110 hover:shadow-2xl hover:shadow-emerald-500/40"
        aria-label="WhatsApp Order"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
        </svg>
      </button>
    </div>
  );
};

export default App;