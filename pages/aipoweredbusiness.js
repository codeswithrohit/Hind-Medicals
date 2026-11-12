import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { firebase } from '../Firebase/config';
import { faker } from '@faker-js/faker';
import {
  FiMapPin, FiPhone, FiGlobe, FiSmartphone,
  FiMessageSquare, FiBox, FiCheckCircle, FiSend, FiCopy, FiX,
  FiShoppingCart, FiPlus, FiMinus, FiShoppingBag, FiSearch,
  FiLock, FiStar, FiExternalLink, FiBriefcase, FiList, FiTrash2, FiDownload, FiNavigation,
  FiChevronLeft, FiChevronRight, FiTag, FiMap, FiCamera, FiVideo, FiRepeat, FiLoader, FiUploadCloud,FiImage,FiFileText
} from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaGoogle, FaYoutube, FaWhatsapp, FaPhoneAlt } from 'react-icons/fa';
import { SiGooglepay, SiPaytm, SiPhonepe } from 'react-icons/si';

// AI Virtual Try-On Package (Gradio Client)
import { client, handle_file } from "@gradio/client";

const generateOrderId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${y}${m}${d}${h}${min}${s}-${rand}`;
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyBXUA8zAYs8WHNYe0-M-h1WvRHbncj1r0g';

const INDIAN_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  'andaman and nicobar', 'chandigarh', 'dadra and nagar haveli', 'daman and diu',
  'delhi', 'jammu and kashmir', 'ladakh', 'lakshadweep', 'puducherry'
];

const extractState = (address = '', explicitState = '') => {
  if (explicitState) {
    const lowerExp = explicitState.toLowerCase();
    for (const state of INDIAN_STATES) {
      if (lowerExp.includes(state)) return state;
    }
  }
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const state of INDIAN_STATES) {
    if (lower.includes(state)) return state;
  }
  if (lower.includes('up') || lower.includes('u.p.')) return 'uttar pradesh';
  if (lower.includes('mp') || lower.includes('m.p.')) return 'madhya pradesh';
  if (lower.includes('tn')) return 'tamil nadu';
  if (lower.includes('ap')) return 'andhra pradesh';
  if (lower.includes('wb')) return 'west bengal';
  if (lower.includes('hr')) return 'haryana';
  if (lower.includes('pb')) return 'punjab';
  if (lower.includes('rj')) return 'rajasthan';
  if (lower.includes('gj')) return 'gujarat';
  if (lower.includes('mh')) return 'maharashtra';
  if (lower.includes('ka')) return 'karnataka';
  if (lower.includes('kl')) return 'kerala';
  if (lower.includes('dl') || lower.includes('ncr')) return 'delhi';
  return null;
};
// Add this helper right above VirtualTryOnModal
const resizeAndPadImage = (dataUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // IDM-VTON strictly expects 768x1024 resolution to prevent crashing when auto-crop is disabled
      const targetWidth = 768;
      const targetHeight = 1024;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      
      // Fill background with white
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // 'contain' logic to maintain EXACT original face and body proportions
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
      const x = (targetWidth - (img.width * scale)) / 2;
      const y = (targetHeight - (img.height * scale)) / 2;
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
};

// ============================================================================
// MAIN PAGE EXPORT
// ============================================================================
const AiPoweredBusiness = () => {
  const router = useRouter();
  const { id } = router.query;

  const [businessData, setBusinessData] = useState(null);
  const [businessDocId, setBusinessDocId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeCatalogTab, setActiveCatalogTab] = useState('PRODUCTS');
  const [priceFilter, setPriceFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [upiQrData, setUpiQrData] = useState(null); 
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('All');

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const chatContainerRef = useRef(null);
  const chatInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [chatStep, setChatStep] = useState('idle');
  const [customPriceLimit, setCustomPriceLimit] = useState(null);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [generatedReviews, setGeneratedReviews] = useState([]);
  const [copyingIndex, setCopyingIndex] = useState(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  // Try-On State
  const [isTryOnModalOpen, setIsTryOnModalOpen] = useState(false);

  const [cart, setCart] = useState([]);
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerMobile: '',
    address: '',
    paymentMethod: 'Cash',
    remarks: '',
    deliveryType: null 
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [otpSent, setOtpSent] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

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

  // ========== FETCH BUSINESS ==========
  useEffect(() => {
  

    let cancelled = false;

    const fetchBusinessData = async () => {
      try {
        const businessRef = firebase.firestore().collection('BusinessUsers');
        const snapshot = await businessRef.where('customerId', '==', 'TROBINNQ').get();
    
        if (!cancelled) {
          if (!snapshot.empty) {
            const directSnap = snapshot.docs[0];
            const data = directSnap.data();
            
            setBusinessData(data);
            setBusinessDocId(directSnap.id);
    
            // Directly check for data, bypassing the strict subscription status check
            const hasGarmentData = data.garmentproducts && data.garmentproducts.length > 0;
            const productCheck = hasGarmentData ? data.garmentproducts : data.products;
    
            if (
              (!productCheck || productCheck.length === 0) &&
              data.services &&
              data.services.length > 0
            ) {
              setActiveCatalogTab('SERVICES');
            }
          }
          
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching business data:', err);
        if (!cancelled) setLoading(false);
      }
    };

    fetchBusinessData();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, id]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    if (window.google && window.google.maps && window.google.maps.places) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // ========== PLAN HELPERS ==========
  const getDaysDifference = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  };

  const getActivePlanItems = useMemo(() => {
    if (!businessData?.subscriptions) return [];
    const itemsList = [];

    businessData.subscriptions.forEach((sub) => {
      if (sub.status && sub.status !== 'Active') return;

      (sub.items || []).forEach((item) => {
        let isExpired = false;
        let daysLeft = null;
        const joined = new Date(sub.joinedDate || sub.createdAt || Date.now());
        let expDate = new Date(joined);

        if (item.type === 'Yearly') {
          expDate.setFullYear(joined.getFullYear() + 1);
          daysLeft = getDaysDifference(expDate);
          isExpired = daysLeft < 0;
        } else if (item.type === 'Monthly') {
          expDate.setMonth(joined.getMonth() + 1);
          daysLeft = getDaysDifference(expDate);
          isExpired = daysLeft < 0;
        } else if (item.type === 'Trial') {
          if (item.trialTill) {
            expDate = new Date(item.trialTill);
            expDate.setHours(23, 59, 59, 999);
          } else {
            expDate.setDate(joined.getDate() + 1);
          }
          daysLeft = getDaysDifference(expDate);
          isExpired = daysLeft < 0;
        } else if (item.type === 'One Time') {
          isExpired = false;
        }

        itemsList.push({
          ...item,
          isExpired,
          daysLeft,
          isFreeTrialFlag: item.type === 'Trial'
        });
      });
    });

    return itemsList;
  }, [businessData]);

  const hasActivePlan = (planName) => {
    return getActivePlanItems.some(
      (item) => !item.isExpired && item.name && item.name.includes(planName)
    );
  };

  const isOneDayTrialActive = useMemo(() => {
    if (!businessData) return false;
    if (getActivePlanItems.some((i) => i.isFreeTrialFlag && !i.isExpired)) return true;

    const joinDateVal = businessData.createdAt || businessData.joinedDate;
    if (!joinDateVal) return false;

    let accountCreationDate = typeof joinDateVal.toDate === 'function'
      ? joinDateVal.toDate()
      : new Date(joinDateVal);

    return new Date() - accountCreationDate <= 24 * 60 * 60 * 1000;
  }, [businessData, getActivePlanItems]);

  // --- MODIFIED: Show Directly Regardless of Plan ---
  const hasPaidQRPlan = true;
  const hasPosSystem = true;
  const isGarmentBusiness = useMemo(() => businessData?.garmentproducts?.length > 0, [businessData]);
  const hasQRPlan = true;
  const hasServicesPlan = true;
  const hasVerifiedCheckout = true;

  // ========== GST HELPERS ==========
  const getCgst = () => Number(businessData?.cgstPercent ?? businessData?.SGSTPercent ?? 0);
  const getSgst = () => Number(businessData?.sgstPercent ?? businessData?.SGSTPercent ?? 0);
  const getIgst = () => Number(businessData?.igstPercent ?? 0);
  const hasGst = businessData?.hasGst === 'yes';

  // Decide tax type based on deliveryType + address
  const getTaxBreakdown = (deliveryType, customerAddress, subtotalAfterDiscount) => {
    if (!hasGst || subtotalAfterDiscount <= 0) {
      return { cgstAmt: 0, sgstAmt: 0, igstAmt: 0, taxType: null };
    }

    const businessAddrString = businessData?.fullOfficeAddress || businessData?.businessAddress || '';
    const storeState = extractState(businessAddrString, businessData?.state);
    const customerState = extractState(customerAddress || '');

    if (deliveryType === 'pickup') {
      const cgstAmt = (subtotalAfterDiscount * getCgst()) / 100;
      const sgstAmt = (subtotalAfterDiscount * getSgst()) / 100;
      return { cgstAmt, sgstAmt, igstAmt: 0, taxType: 'CGST_SGST' };
    }

    if (deliveryType === 'delivery') {
      if (storeState && customerState && storeState !== customerState) {
        const igstAmt = (subtotalAfterDiscount * getIgst()) / 100;
        return { cgstAmt: 0, sgstAmt: 0, igstAmt, taxType: 'IGST' };
      }
      const cgstAmt = (subtotalAfterDiscount * getCgst()) / 100;
      const sgstAmt = (subtotalAfterDiscount * getSgst()) / 100;
      return { cgstAmt, sgstAmt, igstAmt: 0, taxType: 'CGST_SGST' };
    }

    const cgstAmt = (subtotalAfterDiscount * getCgst()) / 100;
    const sgstAmt = (subtotalAfterDiscount * getSgst()) / 100;
    return { cgstAmt, sgstAmt, igstAmt: 0, taxType: 'CGST_SGST' };
  };

  // ========== INITIAL CHAT ==========
  useEffect(() => {
    if (!loading && businessData && chatMessages.length === 0) {
      let welcomeText = '';
      let botActions = [];

      if (hasPosSystem && hasServicesPlan) {
        welcomeText = '👋 Hello! Welcome to our store.\n';
        botActions = [
          { label: '🛒 View Cart', value: 'cart' },
          { label: '✅ Checkout', value: 'checkout' },
          { label: '📦 Track Order', value: 'track' },
          { label: '🏠 Home', value: 'home' }
        ];
      } else if (hasPosSystem) {
        welcomeText =
          '👋 Hello! I am your shopping assistant.';
        botActions = [
          { label: '🛒 View Cart', value: 'cart' },
          { label: '✅ Checkout', value: 'checkout' },
          { label: '📦 Track Order', value: 'track' },
          { label: '🏠 Home', value: 'home' }
        ];
      } else if (hasServicesPlan) {
        welcomeText =
          '👋 Hello! Welcome to our service desk.\n\nPlease explore our services catalog above. Click on "Enquire" on any service you need help with, or type your query below!\n.';
      } else if (hasQRPlan) {
        welcomeText =
          '👋 Hello! Welcome.\n\nWe would love to hear about your experience! Please click the "Review" button above to easily share a 5★ Google Review.\n\nWe’re always here to help! 😊';
      } else {
        welcomeText =
          '👋 Hello! Welcome to our store.\n\nPlease explore our links below.\n\n━━━━━━━━━━━━━━\n🚀 Quick Links:\n\n📱 Follow us → Instagram | Facebook | Twitter\n💳 Instant Payment → Pay Now\n📩 Any Query? → Just type here or contact support\n⭐ Enjoyed visiting? → Give us a 5★ Google Review\n\nWe’re always here to help! 😊';
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

  // Google Places Autocomplete
  useEffect(() => {
    if (
      chatStep !== 'address' ||
      !hasVerifiedCheckout ||
      !GOOGLE_MAPS_API_KEY ||
      !chatInputRef.current
    )
      return;
    if (!window.google || !window.google.maps || !window.google.maps.places) return;

    if (autocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(chatInputRef.current, {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'in' },
      fields: ['formatted_address', 'geometry', 'name', 'place_id']
    });

    const stylePacContainer = () => {
      const pac = document.querySelector('.pac-container');
      if (pac) {
        pac.style.bottom = '100%';
        pac.style.top = 'auto';
        pac.style.marginBottom = '6px';
        pac.style.borderRadius = '12px';
        pac.style.boxShadow = '0 -4px 20px rgba(0,0,0,0.12)';
        pac.style.border = '1px solid #e2e8f0';
        pac.style.zIndex = '9999';
      }
    };

    const observer = new MutationObserver(() => stylePacContainer());
    observer.observe(document.body, { childList: true, subtree: true });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        const addr = place.formatted_address;
        setChatInput('');
        setChatMessages((prev) => [...prev, { role: 'user', text: addr }]);
        processUserInput(addr);
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      observer.disconnect();
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [chatStep, hasVerifiedCheckout]);

  const domain = typeof window !== 'undefined' ? window.location.origin : '';
  const referralId = businessData?.uid || businessDocId || id || '';
  const joinLink = `${domain}/AiBusiness/login?ref=${referralId}`;

  const cartTotalBeforeDiscount = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.qty,
    0
  );
  const cartTotal = appliedCoupon
    ? Math.max(0, cartTotalBeforeDiscount - Number(appliedCoupon.discount))
    : cartTotalBeforeDiscount;
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // Use correct array based on plan
  const allProducts = useMemo(
    () => {
      const arr = isGarmentBusiness ? (businessData?.garmentproducts || []) : (businessData?.products || []);
      return [...arr].reverse();
    },
    [businessData, isGarmentBusiness]
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
      const currentPrice = Number(p.offerPrice || p.price);
      if (priceFilter === '99') return currentPrice <= 99;
      if (priceFilter === '499') return currentPrice <= 499;
      if (priceFilter === '999') return currentPrice <= 999;
      if (priceFilter === 'CUSTOM' && customPriceLimit !== null)
        return currentPrice <= customPriceLimit;
      return true;
    });
  }, [allProducts, searchQuery, categoryFilter, priceFilter, customPriceLimit]);

  const botSay = (text, delay = 400, actions = null) => {
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: 'bot', text, actions: actions || undefined }]);
    }, delay);
  };

  // ========== PROCESS USER INPUT ==========
  const processUserInput = async (rawInput) => {
    const input = (rawInput || '').trim();
    if (!input || isSubmittingOrder) return;

    const lower = input.toLowerCase().trim();

    if (['cancel', 'exit', 'stop', 'home', 'menu', 'back'].includes(lower)) {
      resetChatFlow();
      return;
    }

    if (chatStep === 'track') {
      const orders = isGarmentBusiness ? (businessData?.garmentorders || []) : (businessData?.orders || []);
      let order = orders.find((o) => o.id.toLowerCase() === input.trim().toLowerCase());
      if (!order) {
        order = orders.find(
          (o) =>
            o.id.toLowerCase().includes(input.trim().toLowerCase()) ||
            input.trim().toLowerCase().includes(o.id.toLowerCase())
        );
      }

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
      return;
    }

    if (chatStep === 'order_status') {
      if (lower === 'download' || lower.includes('invoice')) {
        if (trackedOrder) {
          downloadInvoice(trackedOrder);
          botSay(
            '📄 Invoice opened for download / print!',
            300,
            hasPosSystem
              ? [
                  { label: '🏠 Home', value: 'home' },
                  { label: '📦 Track Another', value: 'track' }
                ]
              : undefined
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

    if (chatStep === 'mobile') {
      const mobile = input.replace(/\D/g, '');
      if (mobile.length !== 10) {
        botSay('❌ Please enter a valid 10-digit mobile number.');
        return;
      }

      setOrderForm((prev) => ({ ...prev, customerMobile: mobile }));

      if (hasVerifiedCheckout) {
        setIsSubmittingOrder(true);
        try {
          if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
              size: 'invisible'
            });
          }
          const result = await firebase
            .auth()
            .signInWithPhoneNumber('+91' + mobile, window.recaptchaVerifier);
          setVerificationResult(result);
          setOtpSent(true);
          setChatStep('otp');
          botSay(`✅ OTP sent to +91 ${mobile}.\n\nPlease enter the *6-digit OTP*`);
        } catch (err) {
          console.error(err);
          botSay(
            '❌ Failed to send OTP. Please try again or type *home*.',
            300,
            hasPosSystem ? [{ label: '🏠 Home', value: 'home' }] : undefined
          );
          if (window.recaptchaVerifier) {
            try {
              window.recaptchaVerifier.render().then((wId) => window.grecaptcha.reset(wId));
            } catch (_) {}
          }
        } finally {
          setIsSubmittingOrder(false);
        }
        return;
      }

      setIsMobileVerified(true);
      const oldOrders = isGarmentBusiness ? (businessData?.garmentorders || []) : (businessData?.orders || []);
      const pastOrder = [...oldOrders].reverse().find((o) => o.customerMobile === mobile);

      if (pastOrder && pastOrder.customerName && pastOrder.customerName !== 'Walk-in Customer') {
        setOrderForm((prev) => ({ ...prev, customerName: pastOrder.customerName }));
        setChatStep('name');
        botSay(
          `✅ Mobile saved!\n\nI found your previous name: *${pastOrder.customerName}*\n\nSelect it or enter a new name.`,
          300,
          [
            { label: `👤 ${pastOrder.customerName}`, value: pastOrder.customerName },
            { label: '✏️ Enter New Name', value: 'new_name' }
          ]
        );
      } else {
        setChatStep('name');
        botSay('✅ Mobile saved!\n\nPlease enter your *full name*');
      }
      return;
    }

    if (chatStep === 'otp') {
      if (input.length < 6) {
        botSay('❌ Please enter the complete 6-digit OTP.');
        return;
      }

      setIsSubmittingOrder(true);
      try {
        await verificationResult.confirm(input);
        setIsMobileVerified(true);

        const oldOrders = isGarmentBusiness ? (businessData?.garmentorders || []) : (businessData?.orders || []);
        const pastOrder = [...oldOrders]
          .reverse()
          .find((o) => o.customerMobile === orderForm.customerMobile);

        if (pastOrder && pastOrder.customerName && pastOrder.customerName !== 'Walk-in Customer') {
          setOrderForm((prev) => ({ ...prev, customerName: pastOrder.customerName }));
          setChatStep('name');
          botSay(
            `✅ Mobile verified!\n\nI found your previous name: *${pastOrder.customerName}*\n\nSelect it or enter a new name.`,
            300,
            [
              { label: `👤 ${pastOrder.customerName}`, value: pastOrder.customerName },
              { label: '✏️ Enter New Name', value: 'new_name' }
            ]
          );
        } else {
          setChatStep('name');
          botSay('✅ Mobile verified!\n\nPlease enter your *full name*');
        }
      } catch (err) {
        botSay('❌ Invalid OTP. Please try again.');
      } finally {
        setIsSubmittingOrder(false);
      }
      return;
    }

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

    if (chatStep === 'delivery_type') {
      if (['pickup', 'store', 'pickup at store', 'pickup at our store'].includes(lower)) {
        const storeAddr = businessData?.fullOfficeAddress || businessData?.businessAddress || 'Our Store';
        const fullAddr = `Pickup at Store: ${storeAddr}`;
        setOrderForm((prev) => ({
          ...prev,
          address: fullAddr,
          deliveryType: 'pickup'
        }));
        proceedAfterAddress(fullAddr, {
          ...orderForm,
          address: fullAddr,
          customerName: orderForm.customerName,
          deliveryType: 'pickup'
        });
      } else if (
        ['delivery', 'deliver', 'delivery to location', 'delivery to your location'].includes(lower)
      ) {
        setChatStep('address');
        setOrderForm((prev) => ({ ...prev, deliveryType: 'delivery' }));

        const oldOrders = isGarmentBusiness ? (businessData?.garmentorders || []) : (businessData?.orders || []);
        const pastOrder = [...oldOrders]
          .reverse()
          .find(
            (o) =>
              o.customerMobile === orderForm.customerMobile &&
              o.address &&
              !o.address.toLowerCase().includes('pickup at store')
          );

        if (pastOrder && pastOrder.address) {
          let actions = [
            { label: `📍 ${pastOrder.address.substring(0, 20)}...`, value: pastOrder.address },
            { label: '✏️ Enter New Address', value: 'new_address' }
          ];
          if (hasVerifiedCheckout) {
            actions.push({ label: '📍 Use Current Location (GPS)', value: 'location' });
          }
          botSay(
            `📍 I found your previous delivery address:\n*${pastOrder.address}*\n\nSelect it, enter a new one, or use GPS.`,
            300,
            actions
          );
        } else {
          if (hasVerifiedCheckout) {
            botSay(
              `📍 Please enter your *delivery address*.\n\n• Type an address (Google suggestions appear above)\n• Or use the button below for GPS`,
              300,
              [{ label: '📍 Use Current Location (GPS)', value: 'location' }]
            );
          } else {
            botSay(
              `📍 Please type your *full delivery address* (house no, street, area, city, pincode, state).`,
              300
            );
          }
        }
      } else {
        botSay('Please choose delivery method:', 200, [
          { label: '🏪 Pickup at Our Store', value: 'pickup' },
          { label: '📍 Delivery to Your Location', value: 'delivery' }
        ]);
      }
      return;
    }

    if (chatStep === 'address') {
      if (lower === 'new_address') {
        botSay(
          '📍 Please type your *full delivery address* (house no, street, area, city, pincode, state).',
          200,
          hasVerifiedCheckout
            ? [{ label: '📍 Use Current Location (GPS)', value: 'location' }]
            : undefined
        );
        return;
      }

      if (
        ['location', 'current location', 'gps', 'my location', 'use current location (gps)'].includes(
          lower
        )
      ) {
        handleGetCurrentLocation();
        return;
      }
      if (!input || input.length < 5) {
        botSay(
          '❌ Please provide a complete address (min 5 characters).',
          200,
          hasVerifiedCheckout
            ? [{ label: '📍 Use Current Location (GPS)', value: 'location' }]
            : undefined
        );
        return;
      }
      setOrderForm((prev) => ({ ...prev, address: input, deliveryType: 'delivery' }));
      proceedAfterAddress(input, { ...orderForm, address: input, deliveryType: 'delivery' });
      return;
    }

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

    if (chatStep === 'idle' || chatStep === 'success') {
      if (lower.includes('track') || lower === 'track order') {
        if (lastPlacedOrderId && chatStep === 'success') {
          const order = (isGarmentBusiness ? businessData?.garmentorders : businessData?.orders || []).find((o) => o.id === lastPlacedOrderId);
          if (order) {
            setTrackedOrder(order);
            showOrderStatus(order);
            return;
          }
        }
        setTrackedOrder(null);
        setChatStep('track');
        botSay(
          '📦 Please enter your *Order ID*\n(Example: ORD-20261008...)',
          300,
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
          botSay(
            '🛒 Your cart is empty. Please add products first.',
            300,
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

      botSay(
        `🔍 Showing results for ${extractedProduct ? `"${extractedProduct}"` : 'products'}${
          extractedPrice ? ` under ₹${extractedPrice}` : ''
        }.\n\nScroll up to see products.`,
        300,
        hasPosSystem
          ? [
              { label: '🛒 View Cart', value: 'cart' },
              { label: '✅ Checkout', value: 'checkout' },
              { label: '🏠 Home', value: 'home' }
            ]
          : undefined
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
    setOtpSent(false);
    setIsMobileVerified(false);
    setVerificationResult(null);
    setTrackedOrder(null);
    setOrderForm({
      customerName: '',
      customerMobile: '',
      address: '',
      paymentMethod: 'Cash',
      remarks: '',
      deliveryType: null
    });

    if (message) {
      botSay(
        message,
        300,
        hasPosSystem
          ? [
              { label: '🛒 View Cart', value: 'cart' },
              { label: '✅ Checkout', value: 'checkout' },
              { label: '📦 Track Order', value: 'track' },
              { label: '🏠 Home', value: 'home' }
            ]
          : undefined
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

  // ========== CART ==========
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
      botSay(
        '🛒 Your cart is empty.\nAdd products from the catalog above.',
        200,
        hasPosSystem ? [{ label: '🏠 Home', value: 'home' }] : undefined
      );
      setChatStep('idle');
      return;
    }

    let text = `🛒 *Your Cart* (${currentTotalItems} items)\n\n`;
    currentCart.forEach((item, i) => {
      text += `${i + 1}. ${item.product.name} (${item.variant.name})\n`;
      text += `   Qty: ${item.qty} × ₹${item.price} = ₹${item.qty * item.price}\n\n`;
    });
    text += `*Subtotal: ₹${currentSubtotal}*\n\nSelect an option below:`;

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

  // ========== ORDER SUMMARY WITH GST ==========
  const showOrderSummary = (couponOverride = null, formOverride = null) => {
    const form = formOverride || orderForm;
    const coupon = couponOverride !== undefined ? couponOverride : appliedCoupon;
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
    const discount = coupon ? Number(coupon.discount) : 0;
    const afterDiscount = Math.max(0, subtotal - discount);

    const { cgstAmt, sgstAmt, igstAmt, taxType } = getTaxBreakdown(
      form.deliveryType,
      form.address,
      afterDiscount
    );

    const grand = afterDiscount + cgstAmt + sgstAmt + igstAmt;

    let text = `📋 *Order Summary*\n\n`;
    text += `Name: ${form.customerName}\n`;
    text += `Mobile: +91 ${form.customerMobile}\n`;
    text += `Address: ${form.address || '—'}\n`;
    text += `Type: ${form.deliveryType === 'pickup' ? '🏪 Pickup' : '📍 Delivery'}\n\n`;
    text += `Subtotal: ₹${subtotal.toFixed(2)}\n`;
    if (coupon) {
      text += `Discount (${coupon.code}): -₹${discount.toFixed(2)}\n`;
    }
    if (hasGst && (cgstAmt > 0 || sgstAmt > 0 || igstAmt > 0)) {
      if (taxType === 'IGST') {
        text += `IGST (${getIgst()}%): ₹${igstAmt.toFixed(2)}\n`;
      } else {
        text += `CGST (${getCgst()}%): ₹${cgstAmt.toFixed(2)}\n`;
        text += `SGST (${getSgst()}%): ₹${sgstAmt.toFixed(2)}\n`;
      }
    }
    text += `*Grand Total: ₹${grand.toFixed(2)}*\n\nChoose payment method:`;

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
    text += `Address: ${order.address}\n\n`;
    text += `Items:\n`;
    (order.items || []).forEach((it) => {
      text += `• ${it.qty}× ${it.product.name} (${it.variant?.name || ''}) – ₹${
        it.qty * it.price
      }\n`;
    });
    text += `\nTotal: ₹${order.totalAmount}`;
    if (order.discountAmount) text += ` (Discount: -₹${order.discountAmount})`;
    if (order.cgstAmount || order.sgstAmount || order.igstAmount) {
      text += `\n`;
      if (order.igstAmount > 0) text += `IGST: ₹${order.igstAmount.toFixed(2)}`;
      else {
        if (order.cgstAmount) text += `CGST: ₹${order.cgstAmount.toFixed(2)}  `;
        if (order.sgstAmount) text += `SGST: ₹${order.sgstAmount.toFixed(2)}`;
      }
    }
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

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      botSay(
        '❌ Geolocation not supported. Please type your address.',
        300,
        hasPosSystem ? [{ label: '🏠 Home', value: 'home' }] : undefined
      );
      return;
    }

    botSay('📍 Fetching your current location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const data = await res.json();
          if (data && data.display_name) {
            setOrderForm((prev) => ({
              ...prev,
              address: data.display_name,
              deliveryType: 'delivery'
            }));
            proceedAfterAddress(data.display_name, {
              ...orderForm,
              address: data.display_name,
              deliveryType: 'delivery'
            });
          } else {
            botSay('❌ Could not decode address. Please type it manually.', 300, [
              { label: '📍 Use Current Location (GPS)', value: 'location' }
            ]);
          }
        } catch (err) {
          botSay('❌ Address decode failed. Please type your address.', 300, [
            { label: '📍 Use Current Location (GPS)', value: 'location' }
          ]);
        }
      },
      () => {
        botSay('❌ Location access denied. Please type your address.', 300, [
          { label: '📍 Use Current Location (GPS)', value: 'location' }
        ]);
      }
    );
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


  // ========== WHATSAPP NOTIFICATION ==========
  const sendWhatsAppOrderNotification = (order) => {
    if (!order.customerMobile || order.customerMobile === 'N/A') return;

    // 1. Calculate Safe Totals
    const subtotal = Number(order.taxableAmount ?? ((order.totalAmount || 0) + (order.discountAmount || 0) - (order.taxAmount || 0)));
    const discount = Number(order.discountAmount || 0);
    const cgst = Number(order.cgstAmount || 0);
    const sgst = Number(order.sgstAmount || 0);
    const igst = Number(order.igstAmount || 0);
    const grandTotal = Number(order.totalAmount || 0);

    // 2. Build the WhatsApp Message
    let text = `*🎉 NEW ORDER CONFIRMED! 🎉*\n`;
    text += `*${businessData?.businessName || 'Our Store'}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `*📋 ORDER DETAILS*\n`;
    text += `▪️ *Order ID:* ${order.id}\n`;
    text += `▪️ *Type:* ${order.deliveryType === 'pickup' ? '🏪 Pickup' : '📍 Delivery'}\n`;
    text += `▪️ *Payment:* ${order.paymentMethod} (${order.paymentStatus === 'Done' ? '✅ Paid' : '⏳ Pending'})\n\n`;

    text += `*👤 CUSTOMER DETAILS*\n`;
    text += `▪️ *Name:* ${order.customerName}\n`;
    text += `▪️ *Mobile:* +91 ${order.customerMobile}\n`;

    if (order.deliveryType === 'delivery' && order.address) {
      text += `▪️ *Address:* ${order.address}\n`;
    }
    if (order.remarks) {
      text += `▪️ *Note:* _${order.remarks}_\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `*🛍️ ITEMS ORDERED*\n`;
    (order.items || []).forEach((item, index) => {
      const name = (item.product?.name || 'Item') + (item.variant?.name ? ` (${item.variant.name})` : '');
      const itemTotal = (item.qty * Number(item.price)).toFixed(2); 

      text += `*${index + 1}. ${name}*\n`;
      text += `   ↳ ${item.qty} x ₹${Number(item.price).toFixed(2)} = *₹${itemTotal}*\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `*🧾 BILLING SUMMARY*\n`;
    text += `▪️ *Subtotal:* ₹${subtotal.toFixed(2)}\n`;

    if (discount > 0) text += `▪️ *Discount:* -₹${discount.toFixed(2)}\n`;
    if (cgst > 0) text += `▪️ *CGST:* ₹${cgst.toFixed(2)}\n`;
    if (sgst > 0) text += `▪️ *SGST:* ₹${sgst.toFixed(2)}\n`;
    if (igst > 0) text += `▪️ *IGST:* ₹${igst.toFixed(2)}\n`;

    text += `\n*💰 GRAND TOTAL: ₹${grandTotal.toFixed(2)}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Thank you for shopping with us! We will process your order soon._`;

    // 3. Generate Link and Open WhatsApp
    const encodedText = encodeURIComponent(text);
    const cleanPhone = order.customerMobile.replace(/[^\d+]/g, '');
    const finalPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    const waUrl = `https://wa.me/${finalPhone}?text=${encodedText}`;

    const waLink = document.createElement('a');
    waLink.href = waUrl;
    waLink.target = '_blank';
    document.body.appendChild(waLink);
    waLink.click();
    document.body.removeChild(waLink);
  };


  // ========== INVOICE ==========
  const downloadInvoice = (order) => {
    const bName = businessData?.businessName || 'Your Business';
    const bPhone = businessData?.verifiedMobile || businessData?.mobileNumber || '';
    const bAddress = businessData?.fullOfficeAddress || '';
    const bEmail = businessData?.email || '';
    const gstNumber = businessData?.gstNumber || '';
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

    const subtotal =
      (order.totalAmount || 0) +
      (order.discountAmount || 0) -
      (order.cgstAmount || 0) -
      (order.sgstAmount || 0) -
      (order.igstAmount || 0);
    const discount = order.discountAmount || 0;
    const cgstAmt = order.cgstAmount || 0;
    const sgstAmt = order.sgstAmount || 0;
    const igstAmt = order.igstAmount || 0;

    let taxHtml = '';
    if (igstAmt > 0) {
      taxHtml = `
        <tr>
          <td colspan="3" class="text-right" style="font-weight:500;">IGST (${order.igstPercent || getIgst()}%)</td>
          <td class="text-right">₹${igstAmt.toFixed(2)}</td>
        </tr>`;
    } else if (cgstAmt > 0 || sgstAmt > 0) {
      taxHtml = `
        <tr>
          <td colspan="3" class="text-right" style="font-weight:500;">CGST (${order.cgstPercent || getCgst()}%)</td>
          <td class="text-right">₹${cgstAmt.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" class="text-right" style="font-weight:500;">SGST (${order.sgstPercent || getSgst()}%)</td>
          <td class="text-right">₹${sgstAmt.toFixed(2)}</td>
        </tr>`;
    }

    const grandTotal = subtotal - discount + cgstAmt + sgstAmt + igstAmt;

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
        ${hasGst && gstNumber ? `<p style="margin-top:4px;font-weight:600;">GSTIN: ${gstNumber}</p>` : ''}
      </div>
      <div class="inv-details">
        <h2>TAX INVOICE</h2>
        <p>Invoice #: <strong>${order.id}</strong></p>
        <p>Date: ${dateStr}</p>
        <p style="margin-top:8px;"><span class="status-badge">${order.orderStatus || 'Pending'}</span></p>
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
        <p>Type: <strong>${order.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}</strong></p>
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
          discount
            ? `<tr>
          <td colspan="3" class="text-right" style="font-weight:500;">Discount (${order.couponApplied || ''})</td>
          <td class="text-right">-₹${Number(discount).toFixed(2)}</td>
        </tr>`
            : ''
        }
        ${taxHtml}
        <tr class="total-row">
          <td colspan="3" class="text-right">Grand Total</td>
          <td class="text-right">₹${grandTotal.toFixed(2)}</td>
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
  <script>
    window.onload = () => { setTimeout(() => { window.print(); }, 400); }
  </script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${order.id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ========== PLACE ORDER ==========
  const placeOrder = async (method) => {
    setIsSubmittingOrder(true);
    botSay('⏳ Placing your order...');

    try {
      const subtotal = cartTotalBeforeDiscount;
      const discount = appliedCoupon ? Number(appliedCoupon.discount) : 0;
      const afterDiscount = Math.max(0, subtotal - discount);

      const { cgstAmt, sgstAmt, igstAmt, taxType } = getTaxBreakdown(
        orderForm.deliveryType,
        orderForm.address,
        afterDiscount
      );

      const totalWithTax = afterDiscount + cgstAmt + sgstAmt + igstAmt;

      const newOrder = {
        id: generateOrderId(),
        customerName: orderForm.customerName,
        customerMobile: orderForm.customerMobile,
        address: orderForm.address,
        deliveryType: orderForm.deliveryType || 'delivery',
        remarks: orderForm.remarks || '',
        paymentMethod: method,
        paymentStatus: method === 'Online' ? 'Pending' : 'Pending',
        orderStatus: 'Pending',
        statusHistory: [
          {
            status: 'Pending',
            date: new Date().toISOString(),
            reason: 'Order placed by customer'
          }
        ],
        source: 'Customer',
        items: cart.map((c) => ({
          product: c.product,
          variant: c.variant,
          qty: c.qty,
          price: c.price
        })),
        totalAmount: totalWithTax,
        couponApplied: appliedCoupon ? appliedCoupon.code : null,
        discountAmount: discount,
        hasGst: hasGst,
        cgstPercent: getCgst(),
        sgstPercent: getSgst(),
        igstPercent: getIgst(),
        cgstAmount: cgstAmt,
        sgstAmount: sgstAmt,
        igstAmount: igstAmt,
        taxType: taxType,
        createdAt: new Date().toISOString()
      };

      const docRef = firebase.firestore().collection('BusinessUsers').doc(businessDocId);
      const docSnap = await docRef.get();

      const ordersKey = isGarmentBusiness ? 'garmentorders' : 'orders';
      const currentOrders = docSnap.data()?.[ordersKey] || [];
      const currentCoupons = docSnap.data()?.coupons || [];

      let updatedCoupons = currentCoupons;
      if (appliedCoupon) {
        updatedCoupons = currentCoupons.map((c) =>
          c.code === appliedCoupon.code
            ? { ...c, usedBy: [...(c.usedBy || []), orderForm.customerMobile] }
            : c
        );
      }

      await docRef.update({
        [ordersKey]: [...currentOrders, newOrder],
        coupons: updatedCoupons
      });

      setBusinessData((prev) => ({
        ...prev,
        [ordersKey]: [...(prev?.[ordersKey] || []), newOrder],
        coupons: updatedCoupons
      }));

      if (method === 'Online' && cartUpiLink) {
        window.location.href = cartUpiLink;
      }

      // Download / trigger WhatsApp
      downloadInvoice(newOrder);
      setTimeout(() => {
        sendWhatsAppOrderNotification(newOrder);
      }, 1000);

      setLastPlacedOrderId(newOrder.id);
      setCart([]);
      setAppliedCoupon(null);
      setOtpSent(false);
      setIsMobileVerified(false);
      setVerificationResult(null);
      setChatStep('success');

      botSay(
        `🎉 *Order Placed Successfully!*\n\nYour Order ID:\n*${newOrder.id}*\n\nInvoice opened for print/download.`,
        300,
        [
          { label: '📦 Track This Order', value: 'track' },
          { label: '🏠 Home', value: 'home' }
        ]
      );
    } catch (err) {
      console.error(err);
      botSay('❌ Failed to place order. Please try again or type *home*.', 300, [
        { label: '🏠 Home', value: 'home' }
      ]);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // ========== SERVICE ENQUIRY ==========
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

      const docRef = firebase.firestore().collection('BusinessUsers').doc(businessDocId);
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

  // ========== AI REVIEW ==========
  const openAiReviewGenerator = () => {
    if (!hasQRPlan || !businessData?.gmbLink) return;

    const name = businessData.businessName || 'this place';
    const category = businessData.businessCategory
      ? businessData.businessCategory.toLowerCase()
      : 'service';

    const addressSource = businessData.fullOfficeAddress || businessData.businessAddress || '';
    const stateVal = businessData.state || '';

    // We try to use keywords if present, fallback to category.
    let parsedKeywords = [];
    if (businessData.keywords && typeof businessData.keywords === 'string') {
      parsedKeywords = businessData.keywords.split(',').map(k => k.trim()).filter(k => k.length > 2);
    }

    const generateSeoFriendlyReview = () => {
      const quality = faker.helpers.arrayElement([
        'excellent', 'outstanding', 'wonderful', 'superb', 'great', 'impressive',
        'fantastic', 'top quality', 'high quality', 'premium', 'reliable', 'professional'
      ]);
      const staff = faker.helpers.arrayElement([
        'friendly', 'helpful', 'professional', 'courteous', 'attentive', 'polite',
        'welcoming', 'patient', 'knowledgeable', 'warm'
      ]);
      const experience = faker.helpers.arrayElement([
        'experience', 'service', 'visit', 'interaction', 'overall service'
      ]);
      const result = faker.helpers.arrayElement([
        'satisfied', 'happy', 'impressed', 'pleased', 'comfortable', 'glad'
      ]);
      const time = faker.helpers.arrayElement([
        'recently', 'last week', 'a few days ago', 'this past weekend', 'yesterday'
      ]);
      const recommend = faker.helpers.arrayElement([
        'I highly recommend them', 'Definitely worth visiting', 'I would recommend this place',
        'Happy to recommend them', 'Would recommend without hesitation'
      ]);

      const primaryKeyword = parsedKeywords.length > 0 
        ? faker.helpers.arrayElement(parsedKeywords) 
        : category;

      const locationInsert = addressSource
        ? ` in ${addressSource}` 
        : (addressSource ? ` locally` : '');

      const templates = [
        () => `I had a ${quality} ${experience} at ${name}${locationInsert} for ${primaryKeyword}. The staff was ${staff} and I felt ${result}. ${recommend}!`,
        () => `${time.charAt(0).toUpperCase() + time.slice(1)} I visited ${name} and was ${result} with the ${quality} ${primaryKeyword}. ${staff.charAt(0).toUpperCase() + staff.slice(1)} team. ${recommend}.`,
        () => `Looking for ${primaryKeyword}? ${name} delivered a ${quality} ${experience}. Staff is ${staff}. ${recommend}!`,
        () => `Great ${experience} at ${name}. ${quality.charAt(0).toUpperCase() + quality.slice(1)} service and ${staff} people. ${recommend}.`
      ];

      return faker.helpers.arrayElement(templates)().replace(/\s{2,}/g, ' ').trim();
    };

    const reviews = Array.from({ length: 6 }, () => generateSeoFriendlyReview());
    setGeneratedReviews(reviews);
    setIsReviewModalOpen(true);
  };

  const safeUpiId = businessData?.upiId?.trim();

  const cartUpiLink = safeUpiId
    ? `upi://pay?pa=${safeUpiId}&cu=INR${cartTotal > 0 ? `&am=${cartTotal}` : ''}`
    : null;

  const generatedUpiLink = safeUpiId
    ? `upi://pay?pa=${safeUpiId}&cu=INR`
    : null;

  const handleDirectUPIPayment = (e) => {
    e.preventDefault();

    if (!businessData?.upiId) {
      alert('UPI ID is not configured.');
      return;
    }

    const upiId = businessData.upiId.trim();
    const businessName = encodeURIComponent(businessData.businessName || 'Store');
    const transactionRef = `TR${Date.now()}`; 

    let upiUrl = `upi://pay?pa=${upiId}&pn=${businessName}&tr=${transactionRef}&cu=INR`;

    if (cartTotal > 0) {
      upiUrl += `&am=${cartTotal}`;
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.assign(upiUrl);
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
           setUpiQrData({ link: upiUrl });
        }
      }, 2000);
    } else {
      setUpiQrData({ link: upiUrl });
    }
  };

  const handlePayUsClick = (e) => {
    e.preventDefault();

    if (!generatedUpiLink) {
      alert('UPI payment is not configured for this business.');
      return;
    }

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (!isAndroid && !isIOS) {
      setUpiQrData({ link: generatedUpiLink });
      return;
    }

    if (isIOS) {
      setUpiQrData({ link: generatedUpiLink });
      return;
    }

    const start = Date.now();
    let opened = false;

    const intentUrl = `intent://pay?pa=${safeUpiId}&cu=INR#Intent;scheme=upi;end`;
    try {
      const a = document.createElement('a');
      a.href = intentUrl;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      opened = true;
    } catch (err) {}

    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        try {
          window.location.href = generatedUpiLink;
        } catch (e) {}
      }
    }, 800);

    setTimeout(() => {
      if (document.visibilityState === 'visible' && Date.now() - start < 2500) {
        setUpiQrData({ link: generatedUpiLink });
      }
    }, 2200);
  };

  const handleReviewSelect = async (review, index) => {
    setCopyingIndex(index);
    try {
      await navigator.clipboard.writeText(review);
      if (businessData?.gmbLink) {
        window.open(businessData.gmbLink, '_blank');
      }
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => setCopyingIndex(null), 2000);
  };

  // ========== SKELETON LOADER ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-3 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 bg-slate-200 rounded animate-pulse" />
              <div className="h-2 w-24 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-16 bg-white rounded-xl border border-slate-100 animate-pulse" />
            ))}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
            <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="flex gap-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-32 shrink-0 space-y-2">
                  <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-2 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-2 w-12 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex justify-start">
              <div className="h-16 w-64 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            </div>
            <div className="flex justify-end">
              <div className="h-10 w-40 bg-indigo-100 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!businessData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Store not found</h2>
          <p className="text-sm text-slate-600">This business link is invalid or has been removed.</p>
        </div>
      </div>
    );
  }
  const handleUPIPayment = (upi, app) => {
    const upiId = upi || "7667411501@upi";
  
    const url = `upi://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent("Tech Rakshak")}&cu=INR`;
  
    Linking.openURL(url).catch(() => {
      alert(`Unable to open UPI. Please install ${app || "a UPI app"}.`);
    });
  };
  console.log("businessdata",businessData)
  const upiId = businessData?.upiId || "7667411501@upi";
  return (
    <>
      <Head>
        <title>{businessData.businessName || 'AI Powered Business'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
        {/* Header */}
 
      {/* Header */}
      <div className="shrink-0 bg-white backdrop-blur-md border-b border-slate-200 z-20 px-3 py-2.5 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative shrink-0">
        {businessData?.logoUrl ? (
          <img
            src={businessData.logoUrl}
            alt="Logo"
            className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200/80 shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold text-[15px] shadow-sm">
            {(businessData?.businessName || 'B')[0]}
          </div>
        )}
      </div>
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
                {businessData.fullOfficeAddress && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    businessData.fullOfficeAddress
                  )}`} className="flex items-center gap-1 truncate">
                    <FiMapPin size={10} className="text-indigo-600 shrink-0" />
                    <span className="truncate">{businessData.fullOfficeAddress}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/30">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 pb-0">
            <div className="max-w-3xl mx-auto space-y-4">

              {/* Quick Links */}
              {hasQRPlan && (
                <div>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 pl-1">
                    Quick Links
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                  {/* {businessData?.upiId && (
  <
   button
   onClick={() => handleUPIPayment("7667411501@upi")}
    className="flex min-w-0 items-center gap-3 rounded-xl border-2 border-transparent bg-gradient-to-r from-red-500 via-yellow-400 to-red-500 bg-origin-border p-[1.5px] col-span-2 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
  >
    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] bg-white px-3 py-3">

      <span className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-100 bg-white px-2 shadow-sm">
        <SiGooglepay size={18} className="text-[#4285F4]" />
        <SiPhonepe size={16} className="text-[#5f259f]" />  
        <SiPaytm size={20} className="text-[#00BAF2]" />    
      </span>

      <span className="min-w-0 flex-1 ml-1">
        <span className="block truncate text-sm font-bold text-slate-800">
          Pay Us via UPI
        </span>
      </span>

      <FiExternalLink size={14} className="shrink-0 text-slate-400 sm:block" />
    </div>
  </button>
)} */}
                    {/* VIRTUAL TRY ON LINK (GARMENTS ONLY) */}
                    {isGarmentBusiness && (
                      <button
                        onClick={() => setIsTryOnModalOpen(true)}
                        className="flex-1 min-w-[90px] bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <FiCamera size={14} />
                        <span className="text-[9px] uppercase tracking-wide">Try On</span>
                      </button>
                    )}

                    {businessData.gmbLink && (
                      <button
                        onClick={openAiReviewGenerator}
                        className="flex-1 min-w-[90px] bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-600 font-bold py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <FaGoogle size={14} />
                        <span className="text-[9px] uppercase tracking-wide">Review</span>
                      </button>
                    )}
                    {(businessData.drugLicenseNumber || businessData.drugLicensePhotoUrl) && (
                      <button
                        onClick={() => setIsLicenseModalOpen(true)}
                        className="flex-1 min-w-[90px] bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-700 font-bold py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <FiFileText size={14} />
                        <span className="text-[9px] uppercase tracking-wide text-center leading-tight">
                          License<br />
                          <span className="text-[7px] font-mono opacity-80">{businessData.drugLicenseNumber || 'View'}</span>
                        </span>
                      </button>
                    )}
                    {businessData.websiteUrl && (
                      <a
                        href={businessData.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 min-w-[90px] bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 font-bold py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <FiGlobe size={14} />
                        <span className="text-[9px] uppercase tracking-wide">Website</span>
                      </a>
                    )}
                    <div className="flex gap-2 flex-1 min-w-[120px]">
                      {businessData.instagram && (
                        <a
                          href={businessData.instagram}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 bg-pink-50 border border-pink-200 hover:bg-pink-100 text-pink-600 py-2 flex items-center justify-center rounded-lg transition-all shadow-sm"
                        >
                          <FaInstagram size={16} />
                        </a>
                      )}
                      {businessData.facebook && (
                        <a
                          href={businessData.facebook}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 py-2 flex items-center justify-center rounded-lg transition-all shadow-sm"
                        >
                          <FaFacebook size={16} />
                        </a>
                      )}
                      {businessData.youtube && (
                        <a
                          href={businessData.youtube}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 py-2 flex items-center justify-center rounded-lg transition-all shadow-sm"
                        >
                          <FaYoutube size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Referral Banner */}
              <a
                href={joinLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative overflow-hidden bg-gradient-to-r from-indigo-50 via-white to-emerald-50 border border-indigo-100 rounded-xl px-3.5 py-3.5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-200/40 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-300/50 transition-all" />
                <div className="relative flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <FiExternalLink size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-snug">
                      Grow your own business with AI-powered Google Review & Catalogue
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                        Earn Flat ₹49
                      </span>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wide group-hover:underline">
                        Join Today →
                      </span>
                    </div>
                  </div>
                </div>
              </a>

           

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

          {/* Floating Call & WhatsApp */}
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
                href={`https://wa.me/91${businessData.verifiedMobile}`}
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

        {/* Chat Input (only if POS plan active) */}
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
                      : chatStep === 'otp'
                      ? 'Enter 6-digit OTP...'
                      : chatStep === 'name'
                      ? 'Enter your full name...'
                      : chatStep === 'address'
                      ? hasVerifiedCheckout && GOOGLE_MAPS_API_KEY
                        ? 'Type address (suggestions appear above)...'
                        : 'Enter full delivery address (with state)...'
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

        {/* Item Details Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up relative">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 text-sm truncate pr-2 flex items-center gap-1.5">
                  {itemType === 'product' ? (
                    <FiBox className="text-indigo-500" />
                  ) : (
                    <FiBriefcase className="text-emerald-500" />
                  )}
                  {selectedItem.name}
                </h3>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setCurrentImageIndex(0);
                  }}
                  className="p-1.5 rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1 pb-4">
                {(() => {
                  const images =
                    selectedItem.imageUrls?.length > 0
                      ? selectedItem.imageUrls
                      : selectedItem.imageUrl
                      ? [selectedItem.imageUrl]
                      : [];

                  if (images.length > 0) {
                    return (
                      <div className="relative w-full aspect-square bg-slate-50 flex items-center justify-center group border-b border-slate-100 shrink-0">
                        <img
                          src={images[currentImageIndex]}
                          alt={selectedItem.name}
                          className="w-full h-full object-contain p-2"
                        />
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex((prev) =>
                                  prev === 0 ? images.length - 1 : prev - 1
                                );
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white text-slate-800 rounded-full shadow-md backdrop-blur-sm transition-all"
                            >
                              <FiChevronLeft size={20} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex((prev) => (prev + 1) % images.length);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white text-slate-800 rounded-full shadow-md backdrop-blur-sm transition-all"
                            >
                              <FiChevronRight size={20} />
                            </button>
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 px-2 py-1 rounded-full backdrop-blur-md">
                              {images.map((_, idx) => (
                                <div
                                  key={idx}
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                                    idx === currentImageIndex
                                      ? 'bg-white scale-125'
                                      : 'bg-white/50'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div className="w-full aspect-video bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border-b border-slate-100">
                        {itemType === 'product' ? (
                          <FiBox size={40} />
                        ) : (
                          <FiBriefcase size={40} />
                        )}
                      </div>
                    );
                  }
                })()}

                <div className="p-4 space-y-4">
                  <div>
                    {selectedItem.category && (
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mb-2 ${
                          itemType === 'product'
                            ? 'text-indigo-600 bg-indigo-50 border-indigo-100'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                        }`}
                      >
                        {selectedItem.category}
                      </span>
                    )}
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {selectedItem.description || 'No detailed description provided.'}
                    </p>
                  </div>

                  {itemType === 'product' && (
                    <div className="space-y-2.5">
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1">
                        Variants & Options
                      </h4>
                      {(selectedItem.variants?.length > 0
                        ? selectedItem.variants
                        : [
                            {
                              name: 'Default',
                              price: selectedItem.price,
                              offerPrice: selectedItem.offerPrice
                            }
                          ]
                      ).map((v, i) => {
                        const inCartIndex = cart.findIndex(
                          (c) =>
                            c.product.id === selectedItem.id && c.variant.name === v.name
                        );
                        const inCartItem = inCartIndex !== -1 ? cart[inCartIndex] : null;

                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {v.name}
                              </span>
                              <span className="text-[11px] font-black text-emerald-600 mt-0.5">
                                ₹{v.offerPrice || v.price}
                                {v.offerPrice && v.price > v.offerPrice && (
                                  <span className="ml-1.5 text-[9px] text-slate-400 line-through font-normal">
                                    ₹{v.price}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="shrink-0">
                              {inCartItem ? (
                                <div className="flex items-center bg-indigo-50 rounded-md border border-indigo-200 h-8 shadow-sm">
                                  <button
                                    onClick={() => updateCartQty(inCartIndex, -1)}
                                    className="px-2 h-full text-indigo-600 hover:bg-indigo-100 rounded-l-md"
                                  >
                                    <FiMinus size={12} />
                                  </button>
                                  <span className="text-xs font-bold w-6 text-center text-indigo-900">
                                    {inCartItem.qty}
                                  </span>
                                  <button
                                    onClick={() => updateCartQty(inCartIndex, 1)}
                                    className="px-2 h-full text-indigo-600 hover:bg-indigo-100 rounded-r-md"
                                  >
                                    <FiPlus size={12} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(selectedItem, v)}
                                  className="bg-slate-900 hover:bg-indigo-600 text-white h-8 px-3 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors shadow-sm"
                                >
                                  <FiPlus size={12} /> Add
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {itemType === 'service' && (
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                        <span className="text-xs font-bold text-emerald-900">Base Amount</span>
                        <span className="text-sm font-black text-emerald-600">
                          ₹{selectedItem.amount}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedItem(null);
                          handleEnquireFromService(selectedItem);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-md transition flex justify-center items-center gap-2 text-sm"
                      >
                        <FiMessageSquare size={16} />
                        Enquire Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
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

        {/* UPI QR Fallback Modal (Pay Us) */}
        {upiQrData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-bold text-slate-800">Pay via UPI</h3>
                <button
                  onClick={() => setUpiQrData(null)}
                  className="p-1.5 rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <FiX size={16} />
                </button>
              </div>

              <div className="p-5 flex flex-col items-center gap-4">
                <div className="w-full">
                  <p className="text-xs text-slate-600 text-center mb-3 font-medium">
                    Tap to open your payment app directly:
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={`gpay://upi/pay?pa=${businessData?.upiId}&cu=INR`}
                      className="flex flex-col items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 p-2 rounded-xl transition-all"
                    >
                      <SiGooglepay size={24} className="text-slate-700" />
                      <span className="text-[10px] font-bold text-slate-700">GPay</span>
                    </a>

                    <a
                      href={`phonepe://pay?pa=${businessData?.upiId}&cu=INR`}
                      className="flex flex-col items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-purple-400 hover:bg-purple-50 p-2 rounded-xl transition-all"
                    >
                      <SiPhonepe size={24} className="text-purple-600" />
                      <span className="text-[10px] font-bold text-slate-700">PhonePe</span>
                    </a>

                    <a
                      href={`paytmmp://pay?pa=${businessData?.upiId}&cu=INR`}
                      className="flex flex-col items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-sky-400 hover:bg-sky-50 p-2 rounded-xl transition-all"
                    >
                      <SiPaytm size={24} className="text-sky-500" />
                      <span className="text-[10px] font-bold text-slate-700">Paytm</span>
                    </a>
                  </div>

                  <a
                    href={`upi://pay?pa=${businessData?.upiId}&cu=INR`}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 p-2.5 rounded-xl transition-all text-xs font-bold text-slate-700"
                  >
                    <FiSmartphone size={14} /> Other UPI Apps
                  </a>
                </div>

                <div className="w-full flex items-center gap-3 my-1 opacity-50">
                  <div className="h-px bg-slate-400 flex-1"></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">OR SCAN QR</span>
                  <div className="h-px bg-slate-400 flex-1"></div>
                </div>

                <div className="bg-white p-3 rounded-xl border-2 border-slate-200 shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${businessData?.upiId}&cu=INR`)}`}
                    alt="UPI QR Code"
                    width={180}
                    height={180}
                  />
                </div>

                <div className="w-full mt-1">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-800 truncate">
                      {businessData?.upiId}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(businessData?.upiId || '');
                        alert('UPI ID copied!');
                      }}
                      className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 shadow-sm"
                    >
                      <FiCopy size={14} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setUpiQrData(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
{isLicenseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-fade-in-up">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FiFileText className="text-teal-600" /> Drug License
              </h3>
              <button 
                onClick={() => setIsLicenseModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col items-center text-center">
              {businessData.drugLicenseNumber && (
                <div className="mb-5 bg-teal-50 border border-teal-100 w-full p-3 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-teal-600 tracking-wider mb-1">License Number</p>
                  <p className="font-mono text-gray-900 font-bold text-lg">{businessData.drugLicenseNumber}</p>
                </div>
              )}
              
              {businessData.drugLicensePhotoUrl ? (
                <div className="w-full relative group">
                  <img 
                    src={businessData.drugLicensePhotoUrl} 
                    alt="Drug License" 
                    className="w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                  />
                
                </div>
              ) : (
                <div className="py-8 text-gray-400 flex flex-col items-center">
                  <FiImage size={32} className="mb-2 opacity-50" />
                  <p className="text-xs">No license photo available.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 shrink-0 flex justify-end bg-gray-50">
              <button 
                onClick={() => setIsLicenseModalOpen(false)}
                className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        <div id="recaptcha-container"></div>
      </div>
    </>
  );
};

export default AiPoweredBusiness;