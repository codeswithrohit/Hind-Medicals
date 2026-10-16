import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { firebase } from '../Firebase/config';
// REMOVED: import { faker } from '@faker-js/faker'; (This is now dynamically loaded to save massive load times)
import {
  FiMapPin, FiPhone, FiGlobe, FiSmartphone,
  FiMessageSquare, FiBox, FiCheckCircle, FiSend, FiCopy, FiX,
  FiShoppingCart, FiPlus, FiMinus, FiShoppingBag, FiSearch,
  FiLock, FiStar, FiExternalLink, FiBriefcase, FiList, FiTrash2, FiDownload, FiNavigation, FiLink
} from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaGoogle, FaYoutube, FaWhatsapp, FaPhoneAlt } from 'react-icons/fa';
import { SiGooglepay, SiPaytm, SiPhonepe } from 'react-icons/si';

const generateOrderId = () => {
  return `CG-${Math.floor(Math.random() * 9000) + 1000}${Date.now().toString().slice(-4)}`;
};

const AiPoweredBusiness = () => {
  const router = useRouter();

  const [businessData, setBusinessData] = useState(null);
  const [businessDocId, setBusinessDocId] = useState('HareKrishnaPharmacy');
  const [loading, setLoading] = useState(true);

  // ========== GLOBAL PRODUCTS ==========
  const [productsList, setProductsList] = useState([]);
  
  // ========== NEW: GLOBAL SEARCH NAMES STATE ==========
  const [allProductNames, setAllProductNames] = useState([]);
  
  // ========== SEARCH & FILTER STATES ==========
  const [activeCatalogTab, setActiveCatalogTab] = useState('PRODUCTS');
  const [priceFilter, setPriceFilter] = useState('ALL');
  const [customPriceLimit, setCustomPriceLimit] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [visibleCount, setVisibleCount] = useState(15);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('All');

  // Added isSearching state mimicking reference code
  const [isSearching, setIsSearching] = useState(false);

  // ========== CHAT STATE ==========
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const chatContainerRef = useRef(null);
  const chatInputRef = useRef(null);

  const [chatStep, setChatStep] = useState('idle');

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [generatedReviews, setGeneratedReviews] = useState([]);
  const [copyingIndex, setCopyingIndex] = useState(null);

  const [cart, setCart] = useState([]);
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerMobile: '',
    address: '',
    paymentMethod: 'Cash',
    remarks: ''
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState(null);

  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [enquiryForm, setEnquiryForm] = useState({
    selectedServices: [],
    name: '',
    mobile: '',
    email: '',
    address: '',
    remarks: ''
  });
  const [isSubmittingEnquiry, setIsSubmittingEnquiry] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(null);

  // ========== FETCH BUSINESS PROFILED DATA DIRECTLY ==========
  useEffect(() => {
    let cancelled = false;

    const fetchBusinessData = async () => {
      try {
        const docRef = firebase.firestore().collection('BusinessProfile').doc('HareKrishnaPharmacy');
        const docSnap = await docRef.get();

        if (!cancelled && docSnap.exists) {
          const data = docSnap.data();
          setBusinessData(data);
          
          if ((!data.products || data.products.length === 0) && data.services && data.services.length > 0) {
            setActiveCatalogTab('SERVICES');
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching global business profile:', err);
        if (!cancelled) setLoading(false);
      }
    };

    fetchBusinessData();
    return () => { cancelled = true; };
  }, []);

  // ========== NEW: FETCH ALL PRODUCT NAMES FOR SEARCH ==========
  useEffect(() => {
    const fetchProductNames = async () => {
      try {
        const doc = await firebase.firestore()
          .collection('searchproduct')
          .doc('allProductNames')
          .get();
        
        if (doc.exists) {
          setAllProductNames(doc.data().names || []);
        }
      } catch (error) {
        console.error('Error fetching product names:', error);
      }
    };

    fetchProductNames();
  }, []);

  // ========== REAL-TIME PRODUCTS (OPTIMIZED QUERY) ==========
  useEffect(() => {
    // OPTIMIZATION 1: Filter active products directly in the database to prevent downloading unused data
    const queryRef = firebase.firestore()
      .collection('Products')
      .where('Active', '==', 'True')
      .where('View', '==', 'True')
      .limit(200); // Initial cap to prevent crashes. Hidden items fetched on-demand below.

    const unsubscribeProducts = queryRef.onSnapshot(
        (snapshot) => {
          const prods = snapshot.docs.map((doc) => {
            const data = doc.data();
            
            let mappedVariants = data.variants || [];
            if (mappedVariants.length === 0 && data.priceDetails && data.priceDetails.length > 0) {
              mappedVariants = data.priceDetails.map((pd, idx) => ({
                name: pd.variantName || `Option ${idx + 1}`,
                price: pd.price || 0,
                offerPrice: pd.discountPrice || ''
              }));
            }

            const category = data.categoryName || data.category || 'Other';
            let imageUrl = data.imageUrl;
            if (!imageUrl && data.priceDetails && data.priceDetails[0]?.images?.length > 0) {
               imageUrl = data.priceDetails[0].images[0];
            }

            return { 
              id: doc.id, 
              ...data, 
              variants: mappedVariants, 
              category,
              imageUrl 
            };
          }); 
          
          setProductsList(prevList => {
             // Merge with any products that were fetched dynamically via search
             const newIds = new Set(prods.map(p => p.id));
             const existingDynamic = prevList.filter(p => !newIds.has(p.id));
             return [...prods, ...existingDynamic];
          });
        },
        (error) => console.error('Products sync error: ', error)
      );

    return () => unsubscribeProducts();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const hasPaidQRPlan = true;
  const hasQRPlan = true;
  const hasPosSystem = true;
  const hasServicesPlan = true;
  const hasVerifiedCheckout = false; 

  // Set the Initial Chat Message dynamically
  useEffect(() => {
    if (!loading && businessData && chatMessages.length === 0) {
      let welcomeText = '';
      let botActions = [];

      if (hasPosSystem && hasServicesPlan) {
        welcomeText = '👋 Hello! Welcome to our Hare Krishna Pharmacy.\n\n• Type a product name to search\n• Type *cart* to view cart\n• Type *track* to track an order';
        botActions = [
          { label: '🛒 View Cart', value: 'cart' },
          { label: '✅ Checkout', value: 'checkout' },
          { label: '📦 Track Order', value: 'track' },
          { label: '🏠 Home', value: 'home' }
        ];
      } 
      else if (hasPosSystem) {
        welcomeText = '👋 Hello! I am your shopping assistant.\n\n• Type a product name to search\n• Type *cart* to view cart\n• Type *checkout* to place order\n• Type *track* to track an order\n• Type *home* anytime to go home';
        botActions = [
          { label: '🛒 View Cart', value: 'cart' },
          { label: '✅ Checkout', value: 'checkout' },
          { label: '📦 Track Order', value: 'track' },
          { label: '🏠 Home', value: 'home' }
        ];
      } 
      else if (hasServicesPlan) {
        welcomeText = '👋 Hello! Welcome to our service desk.\n\nPlease explore our services catalog above. Click on "Enquire" on any service you need help with, or type your query below!\n.';
      } 
      else if (hasQRPlan) {
        welcomeText = '👋 Hello! Welcome.\n\nWe would love to hear about your experience! Please click the "Review" button above to easily share a 5★ Google Review.\n\nWe’re always here to help! 😊';
      } 
      else {
        welcomeText = '👋 Hello! Welcome to our store.\n\nPlease explore our links below.\n\n━━━━━━━━━━━━━━\n🚀 Quick Links:\n\n📱 Follow us → Instagram | Facebook | Twitter\n💳 Instant Payment → Pay Now\n📩 Any Query? → Just type here or contact support\n⭐ Enjoyed visiting? → Give us a 5★ Google Review\n\nWe’re always here to help! 😊';
      }

      setChatMessages([
        {
          role: 'bot',
          text: welcomeText,
          ...(botActions.length > 0 && { actions: botActions })
        }
      ]);
    }
  }, [loading, businessData, hasPosSystem, hasServicesPlan, hasQRPlan]);

  const domain = 'https://www.techrakshak.in/';
  const joinLink = `${domain}/AiBusiness/login?ref=TRDNLVMY`;

  const cartTotalBeforeDiscount = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.qty,
    0
  );
  const cartTotal = appliedCoupon
    ? Math.max(0, cartTotalBeforeDiscount - Number(appliedCoupon.discount))
    : cartTotalBeforeDiscount;
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // ========== ALL DATA HOOKS ==========
  const allProducts = useMemo(
    () => [...(productsList || [])].reverse(),
    [productsList]
  );

  const productCategories = useMemo(() => {
    const cats = [...new Set(allProducts.map((p) => p.category).filter(Boolean))];
    return ['All', ...cats];
  }, [allProducts]);

  const allServices = useMemo(
    () => [...(businessData?.services || [])].reverse(),
    [businessData?.services]
  );

  const serviceCategories = useMemo(() => {
    return ['All', ...new Set(allServices.map((s) => s.category).filter(Boolean))];
  }, [allServices]);

  const filteredServices = useMemo(() => {
    return allServices.filter((s) => {
      if (serviceSearchQuery && !s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
        return false;
      if (selectedServiceCategory !== 'All' && s.category !== selectedServiceCategory) return false;
      return true;
    });
  }, [allServices, serviceSearchQuery, selectedServiceCategory]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
 
      if (priceFilter === 'ALL') return true;
 
      const currentPrice = Number(p.offerPrice || p.price || 0);
 
      if (priceFilter === 'CUSTOM' && customPriceLimit !== null) {
        return currentPrice <= customPriceLimit;
      }
 
      const limit = Number(priceFilter);
      if (!isNaN(limit)) return currentPrice <= limit;
 
      return true;
    });
  }, [allProducts, searchQuery, categoryFilter, priceFilter, customPriceLimit]);

  const displayProducts = useMemo(() => {
  const list = [];
  filteredProducts.forEach((product) => {
    const variants =
      product.variants?.length > 0
        ? product.variants
        : [{ name: 'Default', price: product.price, offerPrice: product.offerPrice }];

    variants.forEach((variant, idx) => {
      list.push({
        ...product,
        uniqueKey: `${product.id}-${idx}`,
        variants: [variant],
        displayName:
          variants.length > 1
            ? `${product.name} (${variant.name})`
            : product.name,
      });
    });
  });

  return list;
}, [filteredProducts]);

  // ========== SEARCH LOGIC AND DYNAMIC DATABASE FETCH ==========
  const executeSearchFromDB = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return;
    setIsSearching(true);

    try {
      // FIX: Removed .where('Active', '==', 'True') to prevent Firebase Index Error!
      // We will filter for 'Active' and 'View' locally right after fetching instead.
      const productSnap = await firebase.firestore()
        .collection('Products')
        .where('name', '>=', searchTerm)
        .where('name', '<=', searchTerm + '\uf8ff')
        .limit(50) 
        .get();

      if (!productSnap.empty) {
        const fetchedProducts = productSnap.docs.map(doc => {
          const data = doc.data();
          let mappedVariants = data.variants || [];
          if (mappedVariants.length === 0 && data.priceDetails && data.priceDetails.length > 0) {
            mappedVariants = data.priceDetails.map((pd, idx) => ({
              name: pd.variantName || `Option ${idx + 1}`,
              price: pd.price || 0,
              offerPrice: pd.discountPrice || ''
            }));
          }
          const category = data.categoryName || data.category || 'Other';
          let imageUrl = data.imageUrl;
          if (!imageUrl && data.priceDetails && data.priceDetails[0]?.images?.length > 0) {
             imageUrl = data.priceDetails[0].images[0];
          }
          return { id: doc.id, ...data, variants: mappedVariants, category, imageUrl };
        })
        // Local Filter to replace the missing database query parameters
        .filter(p => p.Active === 'True' && p.View === 'True');

        // Add missing products to the global local list to make them available to filters
        setProductsList(prev => {
           const existingIds = new Set(prev.map(p => p.id));
           const newProds = fetchedProducts.filter(p => !existingIds.has(p.id));
           return [...prev, ...newProds];
        });
      }
    } catch (error) {
      console.error('Search error from DB:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (localSearchTerm.trim() === '') return;
    
    setSearchQuery(localSearchTerm);
    setSearchSuggestions([]);
    // Run real DB search logic
    await executeSearchFromDB(localSearchTerm);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearchTerm(val);
    if (val.trim().length > 0) {
      // Filter from ALL product names fetched directly from DB reference
      const matches = allProductNames
        .filter(name => typeof name === 'string' && name.toLowerCase().includes(val.toLowerCase()))
        .slice(0, 15); // Show up to 15 suggestions
      setSearchSuggestions(matches);
    } else {
      setSearchSuggestions([]);
      setSearchQuery(''); 
    }
  };

  const selectSuggestion = async (suggestionName) => {
    setLocalSearchTerm(suggestionName);
    setSearchQuery(suggestionName);
    setSearchSuggestions([]);
    // Run real DB logic based on string name
    await executeSearchFromDB(suggestionName);
  };

  const clearLocalSearch = () => {
    setLocalSearchTerm('');
    setSearchQuery('');
    setSearchSuggestions([]);
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setLocalSearchTerm('');
    setSearchSuggestions([]);
    setCategoryFilter('All');
    setVisibleCount(24);
  };

  const botSay = (text, delay = 400, actions = null) => {
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: 'bot', text, actions: actions || undefined }]);
    }, delay);
  };

  const processUserInput = async (rawInput) => {
    const input = (rawInput || '').trim();
    if (!input || isSubmittingOrder) return;
 
    const lower = input.toLowerCase().trim();
 
    if (['cancel', 'exit', 'stop', 'home', 'menu', 'back'].includes(lower)) {
      resetChatFlow();
      return;
    }
 
    // ========== TRACK FLOW ==========
    if (chatStep === 'track') {
      try {
        const orderId = input.trim();
        const orderSnap = await firebase.firestore().collection('HareKrishnaPharmacyOrders').doc(orderId).get();
 
        if (orderSnap.exists) {
          const order = { id: orderSnap.id, ...orderSnap.data() };
          if (order.source === 'Customer' || order.source === 'POS') {
            setTrackedOrder(order);
            showOrderStatus(order);
            return;
          }
        }
 
        const snapshot = await firebase
          .firestore()
          .collection('HareKrishnaPharmacyOrders')
          .where('source', 'in', ['Customer', 'POS'])
          .get();
 
        let order = null;
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (
            (data.id && data.id.toLowerCase().includes(orderId.toLowerCase())) ||
            orderId.toLowerCase().includes((data.id || '').toLowerCase())
          ) {
            order = { id: doc.id, ...data };
          }
        });
 
        if (order) {
          setTrackedOrder(order);
          showOrderStatus(order);
        } else {
          botSay(
            '❌ Order not found. Please check the Order ID.\n\nType *home* to go back or try again.',
            300,
            hasPosSystem ? [{ label: '🏠 Home', value: 'home' }] : undefined
          );
        }
      } catch (err) {
        console.error(err);
        botSay('❌ Error looking up order. Please try again.', 300);
      }
      return;
    }
 
    if (chatStep === 'order_status') {
      if (lower === 'download' || lower.includes('invoice')) {
        if (trackedOrder) {
          downloadInvoice(trackedOrder, true); 
          botSay('📄 Invoice downloaded!', 300, 
            hasPosSystem ? [
              { label: '🏠 Home', value: 'home' },
              { label: '📦 Track Another', value: 'track' }
            ] : undefined
          );
        }
      } else {
        botSay('Choose an option:', 200, [
          { label: '📄 Download Invoice', value: 'download' },
          { label: '🏠 Home', value: 'home' }
        ]);
      }
      return;
    }
 
    // ========== CHECKOUT FLOW ==========
    if (chatStep === 'cart') {
      if (['checkout', 'proceed', 'yes', 'continue', 'order'].includes(lower)) {
        setChatStep('mobile');
        botSay('📱 Please enter your *10-digit mobile number*', 300);
      } else if (['clear', 'empty', 'empty cart', 'clear cart'].includes(lower)) {
        setCart([]);
        resetChatFlow('🗑️ Cart cleared.');
      } else {
        botSay('Please choose:', 200, [
          { label: '✅ Checkout', value: 'checkout' },
          { label: '🗑️ Clear Cart', value: 'clear' },
          { label: '🏠 Home', value: 'home' }
        ]);
      }
      return;
    }
 
    // ========== MOBILE ==========
    if (chatStep === 'mobile') {
      const mobile = input.replace(/\D/g, '');
      if (mobile.length !== 10) {
        botSay('❌ Please enter a valid 10-digit mobile number.');
        return;
      }

      setOrderForm((prev) => ({ ...prev, customerMobile: mobile }));
      setIsMobileVerified(true);

      try {
        const prevSnap = await firebase
          .firestore()
          .collection('HareKrishnaPharmacyOrders')
          .where('customerMobile', '==', mobile)
          .get();

        const recentOrders = prevSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((o) => o.source === 'Customer' || o.source === 'POS')
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 2);

        const uniqueNames = [];

        recentOrders.forEach((o) => {
          if (
            o.customerName &&
            o.customerName !== 'Walk-in Customer' &&
            !uniqueNames.includes(o.customerName)
          ) {
            uniqueNames.push(o.customerName);
          }
        });

        if (uniqueNames.length > 0) {
          setChatStep('name');
          const actions = uniqueNames.map(name => ({ label: `👤 ${name}`, value: name }));
          actions.push({ label: '✏️ Enter New Name', value: 'new_name' });
          
          botSay(
            `✅ Mobile saved!\n\nI found previous names from your last orders. Select one or enter a new name:`,
            300,
            actions
          );
          return;
        }

        setChatStep('name');
        botSay('✅ Mobile saved!\n\nPlease enter your *full name*');
      } catch (err) {
        console.error('Previous orders fetch error:', err);
        setChatStep('name');
        botSay('✅ Mobile saved!\n\nPlease enter your *full name*');
      }
      return;
    }
 
    // NAME
    if (chatStep === 'name') {
      if (lower === 'new_name') {
        botSay('Please enter your *full name*');
        return;
      }
      if (!input || input.length < 2) {
        botSay('❌ Please enter a valid name (at least 2 characters).');
        return;
      }
      setOrderForm((prev) => ({ ...prev, customerName: input }));
      setChatStep('delivery_type');
      botSay(`✅ Name saved: *${input}*\n\nHow would you like to receive your order?`, 300, [
        { label: '🏪 Pickup at Our Store', value: 'pickup' },
        { label: '📍 Delivery to Your Location', value: 'delivery' }
      ]);
      return;
    }
 
    // DELIVERY TYPE
    if (chatStep === 'delivery_type') {
      if (['pickup', 'store', 'pickup at store', 'pickup at our store'].includes(lower)) {
        const storeAddr = businessData?.shopAddress || 'Our Store';
        const fullAddr = `Pickup at Store: ${storeAddr}`;
        setOrderForm((prev) => ({ ...prev, address: fullAddr }));
        proceedAfterAddress(fullAddr, {
          ...orderForm,
          address: fullAddr,
          customerName: orderForm.customerName
        });
      } else if (
        ['delivery', 'deliver', 'delivery to location', 'delivery to your location'].includes(lower)
      ) {
        setChatStep('address');
        try {
          const prevSnap = await firebase
            .firestore()
            .collection('HareKrishnaPharmacyOrders')
            .where('customerMobile', '==', orderForm.customerMobile)
            .get();

          const recentOrders = prevSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((o) => o.source === 'Customer' || o.source === 'POS')
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 2);

          const uniqueAddresses = [];
          recentOrders.forEach((o) => {
            if (
              o.address &&
              !o.address.toLowerCase().includes('pickup at store') &&
              !uniqueAddresses.includes(o.address)
            ) {
              uniqueAddresses.push(o.address);
            }
          });

          if (uniqueAddresses.length > 0) {
            const actions = uniqueAddresses.map(addr => ({
              label: `📍 ${addr.substring(0, 28)}${addr.length > 28 ? '...' : ''}`,
              value: addr
            }));
            actions.push({ label: '✏️ Enter New Address', value: 'new_address' });

            if (uniqueAddresses.length === 1) {
              botSay(
                `📍 I found your previous delivery address:\n*${uniqueAddresses[0]}*\n\nSelect it or enter a new one.`,
                300,
                actions
              );
            } else {
              botSay(
                `📍 I found previous delivery addresses from your last orders. Select one or enter a new one:`,
                300,
                actions
              );
            }
          } else {
            botSay(
              `📍 Please type your *full delivery address* (house no, street, area, city, pincode).`,
              300
            );
          }
        } catch (err) {
          console.error(err);
          botSay(
            `📍 Please type your *full delivery address* (house no, street, area, city, pincode).`,
            300
          );
        }
      } else {
        botSay('Please choose delivery method:', 200, [
          { label: '🏪 Pickup at Our Store', value: 'pickup' },
          { label: '📍 Delivery to Your Location', value: 'delivery' }
        ]);
      }
      return;
    }
 
    // ADDRESS
    if (chatStep === 'address') {
      if (lower === 'new_address') {
        botSay('📍 Please type your *full delivery address* (house no, street, area, city, pincode).', 200);
        return;
      }
 
      if (!input || input.length < 5) {
        botSay('❌ Please provide a complete address (min 5 characters).', 200);
        return;
      }
      setOrderForm((prev) => ({ ...prev, address: input }));
      proceedAfterAddress(input, { ...orderForm, address: input });
      return;
    }
 
    // COUPONS
    if (chatStep === 'coupons') {
      if (['skip', 'no', 'none', 'no coupon'].includes(lower)) {
        setAppliedCoupon(null);
        showOrderSummary(null);
        return;
      }
 
      const found = (businessData?.coupons || []).find((c) => c.code.toLowerCase() === lower);
 
      if (found) {
        const now = new Date();
        if (new Date(found.validFrom) > now || new Date(found.validTo) < now) {
          botSay('❌ This coupon has expired. Choose another or skip.', 300, buildCouponActions());
          return;
        }
        if (cartTotalBeforeDiscount < Number(found.minOrder)) {
          botSay(`❌ Minimum order of ₹${found.minOrder} required.`, 300, buildCouponActions());
          return;
        }
        if (found.usedBy && found.usedBy.includes(orderForm.customerMobile)) {
          botSay('❌ You have already used this coupon.', 300, buildCouponActions());
          return;
        }
 
        setAppliedCoupon(found);
        botSay(`✅ Coupon *${found.code}* applied! You save ₹${found.discount}`);
        setTimeout(() => showOrderSummary(found), 700);
      } else {
        botSay('❌ Invalid coupon. Select a valid code or skip.', 300, buildCouponActions());
      }
      return;
    }
 
    // SUMMARY
    if (chatStep === 'summary') {
      if (['cash', 'cod', 'cash on delivery'].includes(lower)) {
        await placeOrder('Cash');
      } else if (['online', 'upi', 'pay online', 'pay'].includes(lower)) {
        await placeOrder('Online');
      } else {
        botSay('Please choose payment method:', 200, [
          { label: '💵 Cash on Delivery', value: 'cash' },
          { label: '📱 Online / UPI', value: 'online' }
        ]);
      }
      return;
    }
 
    // ========== IDLE / SUCCESS ==========
    if (chatStep === 'idle' || chatStep === 'success') {
      if (lower.includes('track') || lower === 'track order') {
        if (lastPlacedOrderId && chatStep === 'success') {
          try {
            const snap = await firebase
              .firestore()
              .collection('HareKrishnaPharmacyOrders')
              .doc(lastPlacedOrderId)
              .get();
            if (snap.exists) {
              const order = { id: snap.id, ...snap.data() };
              setTrackedOrder(order);
              showOrderStatus(order);
              return;
            }
          } catch (e) {}
        }
        setTrackedOrder(null);
        setChatStep('track');
        botSay('📦 Please enter your *Order ID*', 300, 
          hasPosSystem ? [{ label: '🏠 Home', value: 'home' }] : undefined
        );
        return;
      }
 
      if (['cart', 'view cart', 'my cart', 'basket'].includes(lower)) {
        showCartInChat();
        return;
      }
 
      if (['checkout', 'place order', 'buy', 'order now'].includes(lower)) {
        if (cart.length === 0) {
          botSay('🛒 Your cart is empty. Please add products first.', 300, 
            hasPosSystem ? [{ label: '🏠 Home', value: 'home' }] : undefined
          );
          return;
        }
        showCartInChat();
        return;
      }
 
      setActiveCatalogTab('PRODUCTS');
      const priceRegex = /(?:under|below|less than|max|₹|rs\.?|budget of|budget)\s*(\d+)/i;
      let extractedPrice = null;
      let match = lower.match(priceRegex) || lower.match(/(\d+)\s*(?:rs|bucks|inr)/i);
      if (match) extractedPrice = parseInt(match[1], 10);
 
      let cleanInput = lower;
      if (extractedPrice) {
        cleanInput = cleanInput
          .replace(priceRegex, '')
          .replace(/(\d+)\s*(?:rs|bucks|inr)/i, '');
      }
      let extractedProduct = cleanInput
        .replace(
          /\b(show|find|search|looking for|want|need|get|me|some|any|products|items|please|can|you|a|an|the)\b/gi,
          ''
        )
        .replace(/\s{2,}/g, ' ')
        .trim();
 
      if (extractedPrice) {
        setCustomPriceLimit(extractedPrice);
        setPriceFilter('CUSTOM');
      } else {
        setPriceFilter('ALL');
      }
      setCategoryFilter('All');
      setSearchQuery(extractedProduct);
      setLocalSearchTerm(extractedProduct);

      // Trigger DB search from bot to fetch products not loaded
      await executeSearchFromDB(extractedProduct);
 
      botSay(
        `🔍 Showing results for ${extractedProduct ? `"${extractedProduct}"` : 'products'}${
          extractedPrice ? ` under ₹${extractedPrice}` : ''
        }.\n\nScroll up to see products.`,
        300,
        hasPosSystem ? [
          { label: '🛒 View Cart', value: 'cart' },
          { label: '✅ Checkout', value: 'checkout' },
          { label: '🏠 Home', value: 'home' }
        ] : undefined
      );
      return;
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    const input = chatInput.trim();
    if (!input || isSubmittingOrder) return;

    setChatMessages((prev) => [...prev, { role: 'user', text: input }]);
    setChatInput('');
    await processUserInput(input);
  };

  const handleActionClick = async (value) => {
    if (isSubmittingOrder) return;
    setChatMessages((prev) => [...prev, { role: 'user', text: value }]);
    setChatInput('');
    await processUserInput(value);
  };

  const resetChatFlow = (message = null) => {
    setChatStep('idle');
    setAppliedCoupon(null);
    setIsMobileVerified(false);
    setTrackedOrder(null);
    setOrderForm({
      customerName: '',
      customerMobile: '',
      address: '',
      paymentMethod: 'Cash',
      remarks: ''
    });
    
    if (message) {
      botSay(
        message,
        300,
        hasPosSystem ? [
          { label: '🛒 View Cart', value: 'cart' },
          { label: '✅ Checkout', value: 'checkout' },
          { label: '📦 Track Order', value: 'track' },
          { label: '🏠 Home', value: 'home' }
        ] : undefined
      );
    } else {
      if (hasPosSystem) {
        botSay(
          '✅ Back to main menu.\n\n• Type a product name to search\n• Or use the buttons below',
          300,
          [
            { label: '🛒 View Cart', value: 'cart' },
            { label: '✅ Checkout', value: 'checkout' },
            { label: '📦 Track Order', value: 'track' },
            { label: '🏠 Home', value: 'home' }
          ]
        );
      } else {
        botSay('✅ Back to main menu.', 300);
      }
    }
  };

  const addToCart = (product, variant) => {
    if (!hasPosSystem) return;

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.variant.name === variant.name
      );
      let newCart;
      if (existing) {
        newCart = prev.map((item) =>
          item === existing ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        newCart = [
          ...prev,
          {
            product,
            variant,
            qty: 1,
            price: variant.offerPrice || variant.price
          }
        ];
      }
      setTimeout(() => showCartInChat(newCart), 50);
      return newCart;
    });
  };

  const updateCartQty = (index, delta) => {
    setCart((prev) => {
      const newCart = [...prev];
      newCart[index].qty += delta;
      if (newCart[index].qty <= 0) newCart.splice(index, 1);
      if (chatStep === 'cart') {
        setTimeout(() => showCartInChat(newCart), 50);
      }
      return newCart;
    });
  };

  const showCartInChat = (cartOverride = null) => {
    const currentCart = cartOverride || cart;
    const currentTotalItems = currentCart.reduce((sum, item) => sum + item.qty, 0);
    const currentSubtotal = currentCart.reduce(
      (sum, item) => sum + Number(item.price) * item.qty,
      0
    );
 
    if (currentCart.length === 0) {
      botSay('🛒 Your cart is empty.\nAdd products from the catalog above.', 200, 
        hasPosSystem ? [{ label: '🏠 Home', value: 'home' }] : undefined
      );
      setChatStep('idle');
      return;
    }
 
    let text = `🛒 *Your Cart* (${currentTotalItems} items)\n\n`;
    currentCart.forEach((item, i) => {
      text += `${i + 1}. ${item.product.name} (${item.variant.name})\n`;
      text += `   Qty: ${item.qty} × ₹${Number(item.price).toFixed(2)} = ₹${(item.qty * Number(item.price)).toFixed(2)}\n\n`;
    });
    
    text += `*Subtotal: ₹${currentSubtotal.toFixed(2)}*\n\nSelect an option below:`;
 
    setChatStep('cart');
    botSay(text, 200, [
      { label: '✅ Checkout', value: 'checkout' },
      { label: '🗑️ Clear Cart', value: 'clear' },
      { label: '🏠 Home', value: 'home' }
    ]);
  };

  const buildCouponActions = () => {
    const validCoupons = (businessData?.coupons || []).filter((c) => {
      const now = new Date();
      if (new Date(c.validFrom) > now || new Date(c.validTo) < now) return false;
      if (cartTotalBeforeDiscount < Number(c.minOrder)) return false;
      if (c.usedBy && c.usedBy.includes(orderForm.customerMobile)) return false;
      return true;
    });
    const actions = validCoupons.map((c) => ({
      label: `🎟️ ${c.code} (Save ₹${c.discount})`,
      value: c.code
    }));
    actions.push({ label: '⏭️ Skip Coupon', value: 'skip' });
    return actions;
  };

  const showOrderSummary = (couponOverride = null, formOverride = null) => {
    const form = formOverride || orderForm;
    const coupon = couponOverride !== undefined ? couponOverride : appliedCoupon;
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
    const discount = coupon ? Number(coupon.discount) : 0;
    const grand = Math.max(0, subtotal - discount);

    let text = `📋 *Order Summary*\n\n`;
    text += `Name: ${form.customerName}\n`;
    text += `Mobile: +91 ${form.customerMobile}\n`;
    text += `Address: ${form.address || '—'}\n\n`;
    text += `Subtotal: ₹${subtotal}\n`;
    if (coupon) {
      text += `Discount (${coupon.code}): -₹${discount}\n`;
    }
    text += `*Grand Total: ₹${grand}*\n\nChoose payment method:`;
    setChatStep('summary');
    botSay(text, 300, [
      { label: '💵 Cash on Delivery', value: 'cash' },
      { label: '📱 Online / UPI', value: 'online' }
    ]);
  };

  const showOrderStatus = (order) => {
    let text = `📦 *Order Status*\n\n`;
    text += `Order ID: *${order.id}*\n`;
    text += `Status: *${order.orderStatus || 'Pending'}*\n`;
    text += `Payment: ${order.paymentMethod} (${order.paymentStatus || 'Pending'})\n\n`;
    text += `Customer: ${order.customerName}\n`;
    text += `Mobile: +91 ${order.customerMobile}\n`;
    text += `Address: ${order.address || '—'}\n\n`;
    text += `Items:\n`;
    (order.items || []).forEach((it) => {
      text += `• ${it.qty}× ${it.product?.name || 'Item'} (${it.variant?.name || ''}) – ₹${
        it.qty * it.price
      }\n`;
    });
    text += `\nTotal: ₹${order.totalAmount}`;
    if (order.discountAmount) text += ` (Discount: -₹${order.discountAmount})`;
    text += `\n\n`;

    if (order.statusHistory && order.statusHistory.length > 0) {
      text += `*Status Timeline:*\n`;
      order.statusHistory.forEach((h, i) => {
        const d = new Date(h.date).toLocaleString('en-IN');
        text += `${i + 1}. ${h.status} – ${d}${h.reason ? ` (${h.reason})` : ''}\n`;
      });
      text += `\n`;
    }

    setChatStep('order_status');
    botSay(text, 300, [
      { label: '📄 Download Invoice', value: 'download' },
      { label: '🏠 Home', value: 'home' }
    ]);
  };

  const proceedAfterAddress = (addressText, formSnapshot = null) => {
    const form = formSnapshot || { ...orderForm, address: addressText };

    const validCoupons = (businessData?.coupons || []).filter((c) => {
      const now = new Date();
      if (new Date(c.validFrom) > now || new Date(c.validTo) < now) return false;
      if (cartTotalBeforeDiscount < Number(c.minOrder)) return false;
      if (c.usedBy && c.usedBy.includes(form.customerMobile)) return false;
      return true;
    });

    if (validCoupons.length > 0) {
      setChatStep('coupons');
      let couponText = `✅ Address saved!\n\n🎟️ Available coupons:\n\n`;
      validCoupons.forEach((c, i) => {
        couponText += `${i + 1}. *${c.code}* → Save ₹${c.discount}\n`;
      });
      couponText += `\nSelect a coupon or skip:`;
      botSay(couponText, 300, buildCouponActions());
    } else {
      showOrderSummary(null, form);
    }
  };

  const downloadInvoice = (order, forceDownload = true) => {
    const bName = businessData?.businessName || 'Your Business';
    const bPhone = businessData?.verifiedMobile || businessData?.mobileNumber || '';
    const bAddress = businessData?.shopAddress || '';
    const bEmail = businessData?.email || '';
    const dateStr = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsHtml = (order.items || [])
      .map(
        (it) => `
      <tr>
        <td>
          <strong>${it.product?.name || 'Item'}</strong><br/>
          <span style="font-size:12px;color:#64748b;">${it.variant?.name || ''}</span>
        </td>
        <td class="text-right">${it.qty}</td>
        <td class="text-right">₹${Number(it.price).toFixed(2)}</td>
        <td class="text-right">₹${(it.qty * it.price).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const subtotal = (order.totalAmount || 0) + (order.discountAmount || 0);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${order.id}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #fff; color: #0f172a; padding: 40px; }
    .invoice { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
    .brand h1 { font-size: 24px; color: #1e3a8a; margin: 0 0 5px 0; }
    .brand p { font-size: 13px; color: #64748b; margin: 0; }
    .inv-details { text-align: right; }
    .inv-details h2 { font-size: 20px; color: #0f172a; margin: 0 0 5px 0; }
    .inv-details p { font-size: 13px; color: #64748b; margin: 0; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 20px; }
    .party { width: 48%; }
    .party h3 { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;}
    .party p { font-size: 14px; margin: 3px 0; font-weight: 500;}
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background: #f8fafc; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
    .table td { padding: 15px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .text-right { text-align: right !important; }
    .total-row td { background: #f8fafc; font-size: 16px; font-weight: bold; color: #1e3a8a; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px;}
    .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .status-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    @media print { body { padding: 0; } .invoice { border: none; padding: 20px; } }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="brand">
        <h1>${bName}</h1>
        <p>${bPhone ? '+91 ' + bPhone : ''}${bPhone && bEmail ? ' | ' : ''}${bEmail}</p>
        ${bAddress ? `<p style="margin-top:4px;">${bAddress}</p>` : ''}
      </div>
      <div class="inv-details">
        <h2>TAX INVOICE</h2>
        <p>Invoice #: <strong>${order.id}</strong></p>
        <p>Date: ${dateStr}</p>
        <p style="margin-top:8px;"><span class="status-badge">${
          order.orderStatus || 'Pending'
        }</span></p>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>Billed To</h3>
        <p>${order.customerName || '—'}</p>
        <p>+91 ${order.customerMobile || ''}</p>
        ${order.address ? `<p>${order.address}</p>` : ''}
      </div>
      <div class="party">
        <h3>Payment Details</h3>
        <p>Method: <strong>${order.paymentMethod || 'Cash'}</strong></p>
        <p>Status: <strong>${order.paymentStatus || 'Pending'}</strong></p>
        ${order.couponApplied ? `<p>Coupon: ${order.couponApplied}</p>` : ''}
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th style="width: 50%">Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr>
          <td colspan="3" class="text-right" style="font-weight:500;">Subtotal</td>
          <td class="text-right">₹${subtotal.toFixed(2)}</td>
        </tr>
        ${
          order.discountAmount
            ? `
        <tr>
          <td colspan="3" class="text-right" style="font-weight:500;">Discount (${
            order.couponApplied || ''
          })</td>
          <td class="text-right">-₹${Number(order.discountAmount).toFixed(2)}</td>
        </tr>`
            : ''
        }
        <tr class="total-row">
          <td colspan="3" class="text-right">Grand Total</td>
          <td class="text-right">₹${Number(order.totalAmount).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div style="text-align: right; margin-bottom: 20px;">
      <span class="badge">✓ Order Confirmed</span>
    </div>

    <div class="footer">
      Thank you for your order!<br/>
      This is a computer-generated invoice and does not require a signature.<br/>
      ${bName} • ${bPhone ? '+91 ' + bPhone : ''}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${order.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const placeOrder = async (method) => {
    setIsSubmittingOrder(true);
    botSay('⏳ Placing your order...');

    try {
      const cleanItems = cart.map((c) => ({
        product: {
          id: c.product?.id || '',
          name: c.product?.name || 'Item',
          category: c.product?.category || '',
          imageUrl: c.product?.imageUrl || ''
        },
        variant: {
          name: c.variant?.name || 'Standard',
          price: Number(c.variant?.price ?? c.price) || 0,
          offerPrice: c.variant?.offerPrice != null ? Number(c.variant.offerPrice) : null
        },
        qty: Number(c.qty) || 1,
        price: Number(c.price) || 0
      }));

      const orderId = generateOrderId();

      const baseOrder = {
        id: orderId,
        customerName: orderForm.customerName || 'Walk-in Customer',
        customerMobile: orderForm.customerMobile || 'N/A',
        address: orderForm.address || '',
        remarks: orderForm.remarks || '',
        paymentMethod: method,
        orderStatus: 'Pending',
        statusHistory: [
          {
            status: 'Pending',
            date: new Date().toISOString(),
            reason: 'Order placed by customer'
          }
        ],
        source: 'Customer',
        items: cleanItems,
        totalAmount: Number(cartTotal) || 0,
        couponApplied: appliedCoupon?.code || null,
        discountAmount: appliedCoupon ? Number(appliedCoupon.discount) || 0 : 0,
        createdAt: new Date().toISOString(),
        paymentHistory: []
      };

      if (method === 'Cash') {
        const safeOrder = {
          ...baseOrder,
          paymentStatus: 'Pending'
        };

        await saveOrderToFirestore(safeOrder);
        finishOrderSuccess(safeOrder);
        return;
      }

      if (method === 'Online') {
        if (!businessData?.upiId) {
          botSay('❌ Store UPI ID is not configured. Please choose Cash on Delivery instead.', 300, [
            { label: '💵 Cash on Delivery', value: 'cash' },
            { label: '🏠 Home', value: 'home' }
          ]);
          setIsSubmittingOrder(false);
          return;
        }

        const paidOrder = {
          ...baseOrder,
          paymentStatus: 'Pending', 
          paidAt: new Date().toISOString()
        };

        const upiLink = `upi://pay?pa=${businessData.upiId}&pn=${encodeURIComponent(businessData.businessName || 'Store')}&am=${cartTotal}&cu=INR`;

        await saveOrderToFirestore(paidOrder);
        finishOrderSuccess(paidOrder, upiLink);
      }
    } catch (err) {
      console.error(err);
      botSay('❌ Failed to place order. Please try again or type *home*.', 300, [
        { label: '🏠 Home', value: 'home' }
      ]);
      setIsSubmittingOrder(false);
    }
  };

  const saveOrderToFirestore = async (order) => {
    const safeOrder = JSON.parse(JSON.stringify(order)); 

    const batch = firebase.firestore().batch();

    const orderRef = firebase.firestore().collection('HareKrishnaPharmacyOrders').doc(safeOrder.id);
    batch.set(orderRef, safeOrder);

    cart.forEach((cartItem) => {
      const prod = productsList.find((p) => p.id === cartItem.product?.id);
      if (prod) {
        const prodRef = firebase.firestore().collection('Products').doc(prod.id);
        const updatedQty = (prod.totalSaleQty || 0) + (cartItem.qty || 1);
        const updatedAmount =
          (prod.totalSaleAmount || 0) + Number(cartItem.price || 0) * (cartItem.qty || 1);
        const variantSales = { ...(prod.variantSales || {}) };
        const vName = cartItem.variant?.name || 'Standard';
        variantSales[vName] = (variantSales[vName] || 0) + (cartItem.qty || 1);

        batch.update(prodRef, {
          totalSaleQty: updatedQty,
          totalSaleAmount: updatedAmount,
          variantSales
        });
      }
    });

    if (appliedCoupon?.code) {
      const currentCoupons = businessData?.coupons || [];
      const updatedCoupons = currentCoupons.map((c) =>
        c.code === appliedCoupon.code
          ? { ...c, usedBy: [...(c.usedBy || []), orderForm.customerMobile] }
          : c
      );
      const docRef = firebase.firestore().collection('BusinessProfile').doc('HareKrishnaPharmacy');
      batch.update(docRef, { coupons: updatedCoupons });

      setBusinessData((prev) => ({ ...prev, coupons: updatedCoupons }));
    }

    await batch.commit();
  };

  const finishOrderSuccess = (order, upiLink = null) => {
    downloadInvoice(order, true);

    setLastPlacedOrderId(order.id);
    setCart([]);
    setAppliedCoupon(null);
    setIsMobileVerified(false);
    setTrackedOrder(null);
    setChatStep('success');
    setIsSubmittingOrder(false);

    if (upiLink) {
      window.location.href = upiLink;
      botSay(
        `🎉 *Order Placed Successfully!*\n\nYour Order ID:\n*${order.id}*\n\nPlease complete your payment securely using your UPI app.`,
        300,
        [
          { label: '📦 Track This Order', value: 'track' },
          { label: '🏠 Home', value: 'home' }
        ]
      );
    } else {
      botSay(
        `🎉 *Order Placed Successfully!*\n\nYour Order ID:\n*${order.id}*\n\nInvoice has been downloaded to your device.`,
        300,
        [
          { label: '📦 Track This Order', value: 'track' },
          { label: '🏠 Home', value: 'home' }
        ]
      );
    }
  };

  const handleEnquireFromService = (service) => {
    if (!hasServicesPlan) return;
    setEnquiryForm((prev) => {
      const exists = prev.selectedServices.find((s) => s.id === service.id);
      if (exists) return prev;
      return { ...prev, selectedServices: [...prev.selectedServices, service] };
    });
    setIsEnquiryModalOpen(true);
  };

  const handleSaveEnquiry = async (e) => {
    e.preventDefault();
    if (!enquiryForm.name || !enquiryForm.mobile || enquiryForm.selectedServices.length === 0) {
      alert('Name, Mobile, and at least 1 Service required');
      return;
    }
    setIsSubmittingEnquiry(true);
    try {
      const serviceNames = enquiryForm.selectedServices.map((s) => s.name).join(', ');
      const totalBase = enquiryForm.selectedServices.reduce(
        (sum, s) => sum + Number(s.amount),
        0
      );
      const newEnquiry = {
        id: `ENQ-${Date.now()}`,
        serviceName: serviceNames,
        baseAmount: totalBase,
        servicesList: enquiryForm.selectedServices.map((s) => ({
          id: s.id,
          name: s.name,
          amount: s.amount
        })),
        name: enquiryForm.name,
        mobile: enquiryForm.mobile,
        email: enquiryForm.email || '',
        address: enquiryForm.address || '',
        remarks: enquiryForm.remarks || '',
        status: 'Opened',
        nextFollowUpDate: '',
        followUps: [],
        installments: [],
        totalPaid: 0,
        finalAmount: 0,
        createdAt: new Date().toISOString()
      };

      const docRef = firebase.firestore().collection('BusinessProfile').doc('HareKrishnaPharmacy');
      const docSnap = await docRef.get();
      const currentEnquiries = docSnap.data()?.serviceEnquiries || [];
      await docRef.update({ serviceEnquiries: [...currentEnquiries, newEnquiry] });

      setEnquirySuccess(newEnquiry.id);
      setEnquiryForm({
        selectedServices: [],
        name: '',
        mobile: '',
        email: '',
        address: '',
        remarks: ''
      });
      setServiceSearchTerm('');
    } catch (err) {
      alert('Failed to submit enquiry. Please try again.');
    } finally {
      setIsSubmittingEnquiry(false);
    }
  };

  // OPTIMIZATION 3: Dynamically load Faker inside the button click ONLY when the user asks for it.
  const openAiReviewGenerator = async () => {
    if (!hasQRPlan || !businessData?.gmbLink) return;

    // Await the heavy import dynamically so it doesn't block the initial page load!
    const { faker } = await import('@faker-js/faker');

    const name = businessData.businessName || 'this place';
    const category = businessData.businessCategory
      ? businessData.businessCategory.toLowerCase()
      : faker.commerce.department().toLowerCase();
    const locArr = businessData.businessAddress ? businessData.businessAddress.split(',') : [];
    const locationStr = locArr.length > 0 ? ` in ${locArr[0].trim()}` : '';

    const generateStructurallyUniqueReview = () => {
      const qAdj = faker.helpers.arrayElement([
        'fantastic', 'excellent', 'superb', 'brilliant', 'outstanding', 'wonderful', 'amazing'
      ]);
      const fAdj = faker.helpers.arrayElement([
        'welcoming', 'kind', 'helpful', 'warm', 'accommodating', 'polite', 'professional'
      ]);
      const prodAdj = faker.commerce.productAdjective().toLowerCase();
      const openers = [
        `I had such a ${qAdj} experience with ${name}.`,
        `If you ever need ${category}${locationStr}, ${name} is the absolute best choice.`,
        `I recently discovered ${name} and I am so glad I did!`
      ];
      const middles = [
        `The staff was incredibly ${fAdj} and made the whole process completely effortless.`,
        `Their dedication to providing ${prodAdj} ${category} really shows in their work.`,
        `I was genuinely impressed by their ${fAdj} customer service and ${qAdj} attention to detail.`
      ];
      const closers = [
        `I highly recommend them to anyone and everyone!`,
        `I will definitely be a returning customer in the future.`,
        `5/5 stars, without a shadow of a doubt.`
      ];
      return `${faker.helpers.arrayElement(openers)} ${faker.helpers.arrayElement(middles)} ${faker.helpers.arrayElement(closers)}`
        .replace(/\s+/g, ' ')
        .trim();
    };

    const newReviews = new Set();
    while (newReviews.size < 5) newReviews.add(generateStructurallyUniqueReview());
    setGeneratedReviews(Array.from(newReviews));
    setIsReviewModalOpen(true);
  };

  const handleReviewSelect = async (reviewText, index) => {
    setCopyingIndex(index);
    try {
      await navigator.clipboard.writeText(reviewText);
      setTimeout(() => {
        window.open(businessData.gmbLink, '_blank');
        setIsReviewModalOpen(false);
        setCopyingIndex(null);
      }, 600);
    } catch (err) {
      window.open(businessData.gmbLink, '_blank');
      setIsReviewModalOpen(false);
      setCopyingIndex(null);
    }
  };

  const renderProductCard = (item, isHorizontal = false) => {
    const variant = item.variants[0]; 
    const inCartIndex = cart.findIndex(
      (c) => c.product.id === item.id && c.variant.name === variant.name
    );
    const inCartItem = inCartIndex !== -1 ? cart[inCartIndex] : null;
 
    return (
      <div
        key={item.uniqueKey}
        className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col ${
          isHorizontal ? 'snap-start h-full' : ''
        }`}
      >
        <div className="relative aspect-square bg-white overflow-hidden">
  {item.imageUrl ? (
    <img
      src={item.imageUrl}
      alt={item.displayName}
      className="w-full h-full object-contain p-1.5"
      loading="lazy"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center p-2">
 
      <img
        src="/logo.png"
        alt="Default Logo"
        className="w-full h-full object-contain "
      />
    </div>
  )}
</div>
 
        <div className="p-2 flex flex-col flex-1 min-h-0">
          <h4 className="text-[12px] sm:text-[13px] font-bold text-slate-900 line-clamp-2 leading-tight mb-1.5">
            {item.displayName}
          </h4>
 
          <div className="mt-auto flex items-center justify-between gap-1.5">
          <div className="flex flex-col">
  <span className="text-[13px] font-bold text-emerald-600 leading-none">
  ₹{Number(variant.price).toFixed(2)}
  </span>
</div>
<div className="shrink-0">
  {inCartItem ? (
    <div className="flex items-center bg-indigo-50 rounded border border-indigo-200 h-6">
      <button
        onClick={() => updateCartQty(inCartIndex, -1)}
        className="w-5 h-full flex items-center justify-center text-indigo-600 hover:bg-indigo-100 rounded-l transition-colors"
      >
        <FiMinus size={10} />
      </button>
      <span className="text-[11px] font-bold w-4 text-center text-indigo-900 leading-none">
        {inCartItem.qty}
      </span>
      <button
        onClick={() => updateCartQty(inCartIndex, 1)}
        className="w-5 h-full flex items-center justify-center text-indigo-600 hover:bg-indigo-100 rounded-r transition-colors"
      >
        <FiPlus size={10} />
      </button>
    </div>
  ) : (
    <button
      onClick={() => addToCart(item, variant)}
      className="bg-slate-900 hover:bg-indigo-600 text-white w-6 h-6 rounded flex items-center justify-center shadow-sm transition-colors"
    >
      <FiShoppingCart size={12} />
    </button>
  )}
</div>
          </div>
        </div>
      </div>
    );
  };

  const isEverythingEmpty = !hasQRPlan && !hasPosSystem && !hasServicesPlan;

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-32 animate-pulse">
        <div className="bg-white border-b border-slate-200 px-3 py-2.5 shadow-sm">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full">
              <div className="w-11 h-11 bg-slate-200 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-5">
          <div className="bg-white border border-slate-100 rounded-xl p-3 flex gap-3 items-center">
            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!businessData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 p-4 text-center">
        <FiBox size={40} className="mb-3 text-slate-400" />
        <h1 className="text-lg font-bold text-slate-900 mb-1">Store Not Found</h1>
        <p className="text-xs">The business does not exist or link is invalid.</p>
      </div>
    );
  }

  if (isEverythingEmpty) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-full mb-4">
          <FiLock className="text-amber-500" size={32} />
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Currently Unavailable</h1>
        <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
          This business has not activated any product or service catalog.
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full bg-white text-slate-800 font-sans flex flex-col relative overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <div id="recaptcha-container"></div>

      <style jsx global>{`
        .pac-container {
          bottom: 100% !important;
          top: auto !important;
          margin-bottom: 8px !important;
          border-radius: 12px !important;
          box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.12) !important;
          border: 1px solid #e2e8f0 !important;
          z-index: 99999 !important;
        }
        .pac-item {
          padding: 10px 14px !important;
          font-size: 13px !important;
          cursor: pointer !important;
        }
        .pac-item:hover {
          background: #f1f5f9 !important;
        }
      `}</style>

      <Head>
        <title>
          {businessData.businessName} | {businessData.businessCategory || 'Store'}
        </title>
      </Head>

      {/* Header */}
      <div className="shrink-0 bg-white backdrop-blur-md border-b border-slate-200 z-20 px-3 py-2.5 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src='/logo.png'
              alt="Logo"
              className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0 shadow-sm"
            />
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate leading-tight">
                  {businessData.businessName}
                </h1>
                {businessData.businessCategory && (
                  <span className="text-[9px] sm:text-[10px] text-indigo-700 font-bold uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded shrink-0 border border-indigo-200">
                    {businessData.businessCategory}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold sm:text-xs text-slate-500 mt-1">
                {businessData.verifiedMobile && (
                  <a
                    href={`tel:${businessData.verifiedMobile}`}
                    className="flex items-center gap-1 hover:text-indigo-600 transition-colors shrink-0"
                  >
                    <FiPhone size={10} className="text-indigo-600 font-bold" /> +91{' '}
                    {businessData.verifiedMobile}
                  </a>
                )}
                {businessData.shopAddress && (
                  <div className="flex items-center gap-1 truncate">
                    <FiMapPin size={10} className="text-indigo-600 shrink-0" />
                    <span className="truncate">{businessData.shopAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-white">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 pb-0">
          <div className="max-w-3xl mx-auto space-y-4">
            
            {/* ========== COMPACT QUICK LINKS ========== */}
            {(
              businessData?.websiteUrl ||
              businessData?.appLink ||
              businessData?.gmbLink ||
              businessData?.instagram ||
              businessData?.upiId
            ) && (
              <div className="w-full bg-white min-w-0 mt-3 mb-3">
                <div className="flex bg-white items-center justify-between gap-2 mb-2 px-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FiLink className="shrink-0 text-indigo-600" size={15} />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                      Quick Links
                    </h3>
                  </div>
                  <span className="text-[10px] text-black font-bold">
                    Connect with us
                  </span>
                </div>

                <div className="grid bg-white grid-cols-2 gap-2">
                  
                  {/* DIRECT UPI PAY BUTTON - SPANS FULL WIDTH */}
                  {businessData?.upiId && (
  <a
    href={`upi://pay?pa=${businessData.upiId}&pn=${encodeURIComponent(businessData.businessName || 'Business')}`}
    className="flex min-w-0 items-center gap-3 rounded-xl border-2 border-transparent bg-gradient-to-r from-red-500 via-yellow-400 to-red-500 bg-origin-border p-[1.5px] col-span-2 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
  >
    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] bg-white px-3 py-3">
      {/* Icons with individual brand colors */}
      <span className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-100 bg-white px-2 shadow-sm">
        <SiGooglepay size={18} className="text-[#4285F4]" /> {/* Google blue */}
        <SiPhonepe size={16} className="text-[#5f259f]" />   {/* PhonePe purple */}
        <SiPaytm size={20} className="text-[#00BAF2]" />     {/* Paytm cyan/blue */}
      </span>

      <span className="min-w-0 flex-1 ml-1">
        <span className="block truncate text-sm font-bold text-slate-800">
          Pay Us via UPI
        </span>
      
      </span>

      <FiExternalLink size={14} className="shrink-0 text-slate-400 sm:block" />
    </div>
  </a>
)}

                  {/* Website */}
                  {businessData?.websiteUrl && (
                    <a
                      href={businessData.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 active:scale-[0.98] sm:px-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <FiGlobe size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-800">Website</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">Visit our site</span>
                      </span>
                      <FiExternalLink size={12} className="hidden shrink-0 text-slate-400 sm:block" />
                    </a>
                  )}

                  {/* App */}
                  {businessData?.appLink && (
                    <a
                      href={businessData.appLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 transition-colors hover:border-emerald-300 hover:bg-emerald-50/60 active:scale-[0.98] sm:px-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <FiSmartphone size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-800">Download App</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">Get our app</span>
                      </span>
                      <FiExternalLink size={12} className="hidden shrink-0 text-slate-400 sm:block" />
                    </a>
                  )}

                  {/* Google Review */}
                  {businessData?.gmbLink && (
                    <button
                    onClick={openAiReviewGenerator}
                      className="flex min-w-0 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 px-2.5 py-2.5 transition-colors hover:bg-amber-50 active:scale-[0.98] sm:px-3 text-left"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                        <FiStar size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-800">Google Review</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">Share your feedback</span>
                      </span>
                      <FiExternalLink size={12} className="hidden shrink-0 text-slate-400 sm:block" />
                    </button>
                  )}

                  {/* Instagram */}
                  {businessData?.instagram && (
                    <a
                      href={businessData.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-2 rounded-xl border border-pink-200 bg-pink-50/40 px-2.5 py-2.5 transition-colors hover:bg-pink-50 active:scale-[0.98] sm:px-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
                        <FaInstagram size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-800">Instagram</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">Follow our page</span>
                      </span>
                      <FiExternalLink size={12} className="hidden shrink-0 text-slate-400 sm:block" />
                    </a>
                  )}
                </div>
              </div>
            )}
            
            {/* Referral Banner */}
            <div className="block relative overflow-hidden bg-gradient-to-r from-indigo-50 via-white to-emerald-50 border border-indigo-100 rounded-xl px-3.5 py-3.5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-200/40 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-300/50 transition-all" />
              
              <div className="relative flex items-center gap-3">
                <a 
                  href={joinLink}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform"
                >
                  <FiExternalLink size={16} className="text-white" />
                </a>

                <div className="flex-1 min-w-0">
                  <a 
                    href={joinLink}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="block hover:opacity-80 transition-opacity"
                  >
                    <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-snug">
                      Grow your own business with AI-powered Google Review & Catalog
                    </p>
                  </a>
                  
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                      Earn Flat ₹99
                    </span>
                    
                    <a 
                      href={joinLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black text-indigo-600 uppercase tracking-wide hover:underline"
                    >
                      Join Today →
                    </a>

                    <span className="text-slate-300 font-bold mx-0.5">|</span>

                    
                  </div>
                </div>
              </div>
            </div>

            {/* Catalog */}
            {((hasPosSystem && allProducts.length > 0) ||
              (hasServicesPlan && allServices.length > 0)) && (
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 relative">
                
                {/* Searching Overlay integrated */}
                {isSearching && (
                  <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-3 text-[13px] font-bold text-indigo-800 tracking-wide">Finding Product...</p>
                  </div>
                )}

                {hasPosSystem &&
                  allProducts.length > 0 &&
                  hasServicesPlan &&
                  allServices.length > 0 && (
                    <div className="flex bg-slate-100 p-1 rounded-lg mb-4 w-full sm:w-fit mx-auto border border-slate-200 shadow-inner">
                      <button
                        onClick={() => setActiveCatalogTab('PRODUCTS')}
                        className={`flex-1 sm:flex-none px-6 py-2 text-xs font-black rounded-md transition-all ${
                          activeCatalogTab === 'PRODUCTS'
                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Products
                      </button>
                      <button
                        onClick={() => setActiveCatalogTab('SERVICES')}
                        className={`flex-1 sm:flex-none px-6 py-2 text-xs font-black rounded-md transition-all ${
                          activeCatalogTab === 'SERVICES'
                            ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Services
                      </button>
                    </div>
                  )}

                {/* PRODUCTS – only if POS plan */}
                {activeCatalogTab === 'PRODUCTS' && hasPosSystem && (
  <>
    {/* Search Bar - Changed to Form to trigger DB fetch */}
    <div className="relative mb-3 z-20">
      <form 
        onSubmit={handleSearchSubmit}
        className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all w-full"
      >
        <FiSearch className="text-slate-400 mr-2.5 shrink-0" size={16} />
        <input
          type="text"
          placeholder="Search products..."
          className="w-full text-sm outline-none text-slate-800 placeholder-slate-400 bg-transparent"
          value={localSearchTerm}
          onChange={handleSearchChange}
          disabled={isSearching}
        />
        {localSearchTerm && (
          <button
            type="button"
            onClick={clearLocalSearch}
            className="shrink-0 p-1 bg-slate-100 rounded-full hover:bg-slate-200 ml-1.5"
            disabled={isSearching}
          >
            <FiX className="text-slate-500" size={14} />
          </button>
        )}
      </form>

      {/* MODIFIED: Renders string name suggestions with an icon */}
      {searchSuggestions.length > 0 && !isSearching && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
          {searchSuggestions.map((suggestionName, index) => (
            <div
              key={index}
              onClick={() => selectSuggestion(suggestionName)}
              className="px-3.5 py-3 border-b border-slate-100 last:border-0 hover:bg-indigo-50 cursor-pointer flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                <FiSearch className="text-slate-400" size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{suggestionName}</p>
              </div>
              <FiNavigation className="text-slate-300 transform rotate-45" size={14} />
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Active Filters Banner */}
    {(searchQuery || categoryFilter !== 'All' || priceFilter !== 'ALL') && (
      <div className="mb-3 flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
        <span className="text-xs font-semibold text-indigo-700">Filtered results</span>
        <button
          onClick={resetAllFilters}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 rounded-lg"
        >
          <FiX size={12} /> Reset
        </button>
      </div>
    )}

    {/* Categories + Price Filters */}
    {!searchQuery && (
      <div className="mb-3 space-y-2">
        {productCategories.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2.5 scrollbar-hide">
            {productCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat);
                  setVisibleCount(cat === 'All' ? 24 : 15); 
                }}
                className={`shrink-0 px-3 py-2.5 rounded-full text-xs font-semibold border transition-all ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>
    )}


{/* ========== PRODUCT DISPLAY ========== */}
{!searchQuery ? (
  <div>
    <h4 className="text-sm font-bold text-slate-800 mb-2.5 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
      {categoryFilter === 'All' ? 'All Products' : categoryFilter}
    </h4>

    <div
      className="grid grid-rows-3 grid-flow-col gap-2.5 overflow-x-auto custom-scrollbar pb-2 snap-x snap-mandatory"
      style={{ gridAutoColumns: 'minmax(135px, 148px)' }}
      onScroll={(e) => {
        const el = e.target;
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 80) {
          setVisibleCount((prev) => prev + 12);
        }
      }}
    >
      {displayProducts.slice(0, visibleCount).map((p) => renderProductCard(p, true))}
    </div>

    {displayProducts.length === 0 && (
      <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <p className="text-sm font-medium">No products found</p>
      </div>
    )}
  </div>
) : (
  /* SEARCH VIEW */
  <div className="space-y-5">
    <div>
      <h4 className="text-sm font-bold text-slate-800 mb-2.5">Exact Matches</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {displayProducts.map((p) => renderProductCard(p, false))}
      </div>

      {displayProducts.length === 0 && !isSearching && (
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm font-medium mb-2">No products match your search</p>
          <button
            onClick={resetAllFilters}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>

    {searchQuery && displayProducts.length > 0 && (
      <div className="pt-4 border-t border-slate-100">
        <h4 className="text-sm font-bold text-slate-800 mb-2.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Related in {displayProducts[0].category}
        </h4>
        <div
          className="grid grid-rows-1 grid-flow-col gap-2.5 overflow-x-auto custom-scrollbar pb-1.5 snap-x"
          style={{ gridAutoColumns: 'minmax(135px, 148px)' }}
        >
          {allProducts
            .filter(
              (p) =>
                p.category === displayProducts[0].category &&
                p.id !== displayProducts[0].id
            )
            .slice(0, 10)
            .flatMap((p) => {
              const variants =
                p.variants?.length > 0
                  ? p.variants
                  : [{ name: 'Default', price: p.price, offerPrice: p.offerPrice }];
              return variants.map((v, idx) => ({
                ...p,
                uniqueKey: `${p.id}-${idx}`,
                variants: [v],
                displayName:
                  variants.length > 1 ? `${p.name} (${v.name})` : p.name,
              }));
            })
            .map((p) => renderProductCard(p, true))}
        </div>
      </div>
    )}
  </div>
)}
  </>
)}

              </div>
            )}

            {/* Chat Messages */}
            <div
              ref={chatContainerRef}
              className="w-full max-w-3xl mx-auto flex flex-col gap-3 max-h-[35vh] sm:max-h-[40vh] overflow-y-auto custom-scrollbar p-3"
            >
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex w-full ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`px-4 py-2.5 text-xs sm:text-sm shadow-sm max-w-[85%] whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                        {msg.actions.map((action, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={() => handleActionClick(action.value)}
                            disabled={isSubmittingOrder}
                            className="px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSubmittingOrder && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl rounded-bl-sm text-slate-500">
                    Processing...
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pb-4">
              <div className="text-center">
                <a
                  href="https://www.techrakshak.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors tracking-wide"
                >
                  <span className="opacity-70">Powered by</span>
                  <span className="text-indigo-600 font-black uppercase tracking-wider">
                    TECH RAKSHAK
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Call & WhatsApp Action Menu */}
        {businessData?.verifiedMobile && (
          <div className="absolute right-4 bottom-24 flex flex-col gap-3 z-30 pointer-events-auto">
            <a
              href={`tel:${businessData.verifiedMobile}`}
              className="bg-indigo-600 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-500 transition-transform transform hover:scale-105"
              aria-label="Call Business"
            >
              <FaPhoneAlt size={18} />
            </a>
            <a
              href={`https://api.whatsapp.com/send?phone=91${businessData.verifiedMobile.replace(/\D/g, '').slice(-10)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-500 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-400 transition-transform transform hover:scale-105"
              aria-label="WhatsApp Business"
            >
              <FaWhatsapp size={22} />
            </a>
          </div>
        )}

        {/* Floating Cart */}
        {hasPosSystem && totalItems > 0 && chatStep === 'idle' && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <button
              onClick={() => {
                setChatMessages((prev) => [...prev, { role: 'user', text: 'cart' }]);
                showCartInChat();
              }}
              className="pointer-events-auto bg-indigo-600 text-white rounded-full px-5 py-3 shadow-lg flex items-center gap-2 text-xs font-bold hover:bg-indigo-500 transition-all hover:scale-105"
            >
              <FiShoppingCart size={16} />
              {totalItems} items · ₹{cartTotalBeforeDiscount}
            </button>
          </div>
        )}
      </div>

      {/* Chat Input Area */}
      {hasPosSystem && (
        <div className="bg-slate-100 p-2 sm:p-3 border-t border-slate-200 relative z-30 shrink-0">
          <div className="max-w-3xl mx-auto flex items-center gap-2 relative">
            <form
              onSubmit={handleChatSubmit}
              className="flex-1 flex items-center bg-white border border-slate-300 rounded-full pl-4 pr-1.5 py-1.5 focus-within:border-indigo-500 focus-within:shadow-[0_0_10px_rgba(99,102,241,0.2)] transition-all relative"
            >
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  chatStep === 'mobile'
                    ? 'Enter 10-digit mobile...'
                    : chatStep === 'name'
                    ? 'Enter your full name...'
                    : chatStep === 'address'
                    ? 'Enter full delivery address...'
                    : chatStep === 'coupons'
                    ? 'Enter coupon code or skip...'
                    : chatStep === 'summary'
                    ? 'Type cash or online...'
                    : chatStep === 'track'
                    ? 'Enter Order ID...'
                    : chatStep === 'delivery_type'
                    ? 'Choose Pickup or Delivery...'
                    : 'Type a message...'
                }
                className="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none placeholder-slate-400"
                disabled={isSubmittingOrder}
                autoComplete={chatStep === 'address' ? 'off' : 'on'}
              />
              <button
                type="submit"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  chatInput.trim() && !isSubmittingOrder
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                disabled={!chatInput.trim() || isSubmittingOrder}
              >
                <FiSend
                  size={15}
                  className={chatInput.trim() ? 'translate-x-[-1px] translate-y-[1px]' : ''}
                />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Service Enquiry Modal */}
      {isEnquiryModalOpen && hasServicesPlan && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-fade-in-up sm:rounded-l-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <FiBriefcase className="text-emerald-600" /> Service Enquiry
              </h2>
              <button
                onClick={() => setIsEnquiryModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-1.5 rounded-full bg-slate-200/50 hover:bg-slate-200 transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            {enquirySuccess ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                  <FiCheckCircle size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-800">Enquiry Submitted!</h3>
                <p className="text-sm text-slate-600">
                  Our team will review your requirements and get back to you shortly.
                </p>
                <p className="text-xs text-slate-500">
                  Ref ID: <br />
                  <span className="font-bold text-indigo-600">{enquirySuccess}</span>
                </p>
                <button
                  onClick={() => {
                    setIsEnquiryModalOpen(false);
                    setEnquirySuccess(null);
                  }}
                  className="mt-4 px-6 py-2 bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-500 transition shadow-md"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Selected Services
                      </h3>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Total Base: ₹
                        {enquiryForm.selectedServices.reduce(
                          (s, x) => s + Number(x.amount),
                          0
                        )}
                      </span>
                    </div>

                    {enquiryForm.selectedServices.length > 0 ? (
                      <div className="space-y-2">
                        {enquiryForm.selectedServices.map((srv) => (
                          <div
                            key={srv.id}
                            className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm"
                          >
                            <span className="text-xs font-bold text-slate-800 truncate pr-2">
                              {srv.name} <br />
                              <span className="text-[10px] text-slate-500">
                                ₹{srv.amount} Base
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setEnquiryForm((prev) => ({
                                  ...prev,
                                  selectedServices: prev.selectedServices.filter(
                                    (s) => s.id !== srv.id
                                  )
                                }))
                              }
                              className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-md"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic p-2 border border-dashed border-slate-300 rounded text-center">
                        No services selected yet. Search below to add.
                      </div>
                    )}

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                        Add more services
                      </label>
                      <div className="relative mb-2">
                        <FiSearch
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                          size={14}
                        />
                        <input
                          type="text"
                          placeholder="Search services..."
                          value={serviceSearchTerm}
                          onChange={(e) => setServiceSearchTerm(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm"
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 bg-white border border-slate-200 rounded p-1">
                        {allServices
                          .filter((s) =>
                            s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase())
                          )
                          .map((s) => (
                            <div
                              key={s.id}
                              onClick={() =>
                                setEnquiryForm((prev) =>
                                  prev.selectedServices.find((x) => x.id === s.id)
                                    ? prev
                                    : {
                                        ...prev,
                                        selectedServices: [...prev.selectedServices, s]
                                      }
                                )
                              }
                              className="px-2 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer rounded flex justify-between items-center transition-colors"
                            >
                              <span className="truncate pr-2">{s.name}</span>
                              <span className="font-bold text-emerald-600 shrink-0">
                                ₹{s.amount} <FiPlus className="inline ml-1 opacity-50" />
                              </span>
                            </div>
                          ))}
                        {allServices.filter((s) =>
                          s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="text-[10px] text-slate-400 text-center py-2">
                            No matching services found.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Your Details
                    </h3>
                    <form
                      id="serviceEnquiryForm"
                      onSubmit={handleSaveEnquiry}
                      className="space-y-2.5"
                    >
                      <input
                        type="text"
                        placeholder="Full Name *"
                        value={enquiryForm.name}
                        onChange={(e) =>
                          setEnquiryForm({ ...enquiryForm, name: e.target.value })
                        }
                        className="w-full text-xs p-2.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-emerald-500 shadow-sm"
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Mobile Number *"
                        value={enquiryForm.mobile}
                        onChange={(e) =>
                          setEnquiryForm({ ...enquiryForm, mobile: e.target.value })
                        }
                        className="w-full text-xs p-2.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-emerald-500 shadow-sm"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email Address (Optional)"
                        value={enquiryForm.email}
                        onChange={(e) =>
                          setEnquiryForm({ ...enquiryForm, email: e.target.value })
                        }
                        className="w-full text-xs p-2.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-emerald-500 shadow-sm"
                      />
                      <textarea
                        placeholder="Your Address (Optional)"
                        value={enquiryForm.address}
                        onChange={(e) =>
                          setEnquiryForm({ ...enquiryForm, address: e.target.value })
                        }
                        rows="2"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-emerald-500 shadow-sm"
                      ></textarea>
                      <textarea
                        placeholder="Specific Requirements / Remarks (Optional)"
                        value={enquiryForm.remarks}
                        onChange={(e) =>
                          setEnquiryForm({ ...enquiryForm, remarks: e.target.value })
                        }
                        rows="2"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-emerald-500 shadow-sm"
                      ></textarea>
                    </form>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-200 bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                  <button
                    type="submit"
                    form="serviceEnquiryForm"
                    disabled={
                      isSubmittingEnquiry || enquiryForm.selectedServices.length === 0
                    }
                    className="w-full py-3.5 rounded-xl text-sm font-black text-white shadow-lg flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                  >
                    {isSubmittingEnquiry ? 'Submitting...' : 'Submit Enquiry Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI Review Modal */}
      {hasQRPlan && isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white border border-indigo-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FaGoogle className="text-orange-500" size={16} />
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                  AI Review Suggestions
                </h3>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-full bg-slate-200/50 hover:bg-slate-200 transition-colors"
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              <p className="text-[11px] text-indigo-600 font-medium text-center mb-1">
                Click any review below to auto-copy & open Google Reviews.
              </p>
              {generatedReviews.map((review, index) => (
                <button
                  key={index}
                  onClick={() => handleReviewSelect(review, index)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex gap-3 group items-start ${
                    copyingIndex === index
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-900'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {copyingIndex === index ? (
                      <FiCheckCircle className="text-emerald-500" size={14} />
                    ) : (
                      <FiCopy className="text-slate-400 group-hover:text-indigo-500 transition-colors" size={14} />
                    )}
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold leading-relaxed">
                    "{review}"
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiPoweredBusiness;