import React, { useState, useEffect, useMemo, useRef } from 'react';
import { firebase } from '../../Firebase/config';
import * as XLSX from 'xlsx';
import {
  FiBox, FiPlus, FiEdit2, FiTrash2, FiX, FiMinus,
  FiImage, FiChevronLeft, FiChevronRight,
  FiShoppingCart, FiSearch, FiTrendingUp, FiList,
  FiUser, FiPhone, FiFileText, FiCheckCircle, FiClock, FiActivity, FiCalendar,
  FiTag, FiMonitor, FiSmartphone, FiRefreshCw, FiDollarSign, FiPercent, FiDownload,
  FiPrinter, FiLoader, FiArrowRight, FiUploadCloud, FiFile, FiAlertCircle
} from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { SiGooglepay, SiPaytm, SiPhonepe } from 'react-icons/si';
import { FcGoogle } from "react-icons/fc";

const PRODUCTS_PER_PAGE = 15;
const ORDERS_PER_PAGE = 10;
const MAX_PRODUCT_IMAGES = 5;
const CUSTOMER_ID = "TROBINNQ";

const ORDER_STATUS_OPTIONS = [
  'Pending',
  'Confirmed',
  'In process',
  'Ready for delivery',
  'Out for delivery',
  'Delivered',
  'Cancel / Reject'
];

const generateOrderId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(10000000 + Math.random() * 90000000);
  return `${y}${m}${d}${h}${min}${s}-${rand}`;
};

const DUMMY_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3Cpath d='M30 35h40v30H30z' fill='%23d1d5db'/%3E%3Ccircle cx='40' cy='45' r='5' fill='%239ca3af'/%3E%3Cpath d='M30 65l15-15 10 10 15-20 10 25H30z' fill='%239ca3af'/%3E%3C/svg%3E";

const Products = ({ userData, setUserData, showAlert, onRefresh, hasVerifiedCheckout: hasVerifiedCheckoutProp }) => {
  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState(null); // Stores the actual Firestore Document ID
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pos');

  const [dateFilter, setDateFilter] = useState('Today');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [orderSearch, setOrderSearch] = useState('');
  const [orderSourceFilter, setOrderSourceFilter] = useState('All');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [posSearchQuery, setPosSearchQuery] = useState('');
  const [isPosSearchFocused, setIsPosSearchFocused] = useState(false);
  const posSearchRef = useRef(null);
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [alertFilter, setAlertFilter] = useState('All'); // 'All', 'LowStock', 'ExpiringSoon'
  const [sortBySales, setSortBySales] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ===== EXCEL IMPORT STATE =====
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [excelUploadProgress, setExcelUploadProgress] = useState(0);
  const [excelProcessedCount, setExcelProcessedCount] = useState(0); 
  const [isExcelDragging, setIsExcelDragging] = useState(false);

  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    mobile: '',
    remarks: '',
    paymentMethod: 'Online'
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState('');

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: '',
    customCategory: '',
    companyName: '',
    batch: '',
    code: ''
  });
  
  // Expanded variant fields for stock, expiry, and purchase prices
  const [variants, setVariants] = useState([{ name: '', price: '', offerPrice: '', stock: '', expiry: '', purchasePrice: '' }]);
  const [taxType, setTaxType] = useState('same'); 
  const [productImages, setProductImages] = useState([]);          
  const [productImagePreviews, setProductImagePreviews] = useState([]); 
  const [oldImageUrls, setOldImageUrls] = useState([]);            
  const [originalOldImageUrls, setOriginalOldImageUrls] = useState([]); 
  const [isDragging, setIsDragging] = useState(false);

  const [expenseForm, setExpenseForm] = useState({ what: '', reason: '', amount: '' });
  const [couponForm, setCouponForm] = useState({
    code: '',
    minOrder: '',
    discount: '',
    validFrom: '',
    validTo: ''
  });

  const inputClass = 'w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900/20 focus:border-gray-900 focus:bg-white transition-all';
  const labelClass = 'block text-[9px] font-bold text-gray-500 mb-0.5 uppercase tracking-wider';

  // ========== GST HELPERS ==========
  const hasGst = userData?.hasGst === 'yes';
  const gstNumber = userData?.gstNumber || '';
  const cgstRate = Number(userData?.cgstPercent || userData?.SGSTPercent || 0);
  const sgstRate = Number(userData?.sgstPercent || userData?.SGSTPercent || 0);
  const igstRate = Number(userData?.igstPercent || 0);

  const calculateGst = (taxableAmount) => {
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (hasGst && taxableAmount > 0) {
      if (taxType === 'same') {
        cgstAmount = +(taxableAmount * cgstRate / 100).toFixed(2);
        sgstAmount = +(taxableAmount * sgstRate / 100).toFixed(2);
      } else {
        igstAmount = +(taxableAmount * igstRate / 100).toFixed(2);
      }
    }

    const taxAmount = +(cgstAmount + sgstAmount + igstAmount).toFixed(2);
    return { cgstAmount, sgstAmount, igstAmount, taxAmount };
  };

  const hasVerifiedCheckout = useMemo(() => {
    if (typeof hasVerifiedCheckoutProp === 'boolean') return hasVerifiedCheckoutProp;
    if (!userData?.subscriptions || userData.subscriptions.length === 0) return false;
    let isActive = false;
    userData.subscriptions.forEach((sub) => {
      (sub.items || []).forEach((item) => {
        if (item.name && item.name.includes('Verified Checkout')) {
          const joined = new Date(sub.joinedDate || sub.createdAt || Date.now());
          let expDate = new Date(joined);
          if (item.type === 'Yearly') expDate.setFullYear(joined.getFullYear() + 1);
          else if (item.type === 'Monthly') expDate.setMonth(joined.getMonth() + 1);
          if (
            (item.type === 'One Time' || new Date() <= expDate) &&
            (!sub.status || sub.status === 'Active')
          ) {
            isActive = true;
          }
        }
      });
    });
    return isActive;
  }, [userData, hasVerifiedCheckoutProp]);

  useEffect(() => {
    let unsubscribe = null;

    const setupSync = async () => {
      try {
        const snapshot = await firebase.firestore().collection('BusinessUsers')
          .where('customerId', '==', CUSTOMER_ID)
          .get();

        if (!snapshot.empty) {
          const fetchedDocId = snapshot.docs[0].id;
          setDocId(fetchedDocId);

          unsubscribe = firebase.firestore().collection('BusinessUsers').doc(fetchedDocId)
            .onSnapshot(
              (docSnap) => {
                if (docSnap.exists) {
                  setUserData((prev) => ({ ...prev, ...docSnap.data() }));
                }
                setLoading(false);
              },
              (error) => {
                console.error('Real-time sync error: ', error);
                setLoading(false);
              }
            );
        } else {
          console.warn("No business found for the provided customerId.");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error setting up Firestore listener: ", error);
        setLoading(false);
      }
    };

    setupSync();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [setUserData]);

  useEffect(() => {
    if (activeTab === 'coupons' && !hasVerifiedCheckout) {
      setActiveTab('pos');
    }
  }, [hasVerifiedCheckout, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (posSearchRef.current && !posSearchRef.current.contains(event.target)) {
        setIsPosSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (docId) {
        const doc = await firebase.firestore().collection('BusinessUsers').doc(docId).get();
        if (doc.exists) {
          setUserData((prev) => ({ ...prev, ...doc.data() }));
        }
      }
      if (typeof onRefresh === 'function') {
        await onRefresh();
      }
      showAlert('success', 'Data refreshed instantly!');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to refresh data');
    }
    setIsRefreshing(false);
  };

  const allProducts = userData?.products || [];
  const allOrders = [...(userData?.orders || [])].reverse();
  const allExpenses = [...(userData?.expenses || [])].reverse();
  const allCoupons = [...(userData?.coupons || [])].reverse();

  const filterByDate = (dateString) => {
    const d = new Date(dateString);
    const now = new Date();
    if (dateFilter === 'Today') return d.toDateString() === now.toDateString();
    if (dateFilter === 'Weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (dateFilter === 'Monthly')
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateFilter === 'Yearly') return d.getFullYear() === now.getFullYear();
    if (dateFilter === 'Custom' && dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    }
    return true;
  };

  const filteredOrders = useMemo(() => {
    let orders = allOrders.filter((o) => filterByDate(o.createdAt));

    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.customerMobile && o.customerMobile.toLowerCase().includes(q))
      );
    }
    if (orderSourceFilter !== 'All') {
      orders = orders.filter((o) => o.source === orderSourceFilter);
    }
    if (orderStatusFilter !== 'All') {
      orders = orders.filter((o) => (o.orderStatus || 'Pending') === orderStatusFilter);
    }
    return orders;
  }, [allOrders, dateFilter, dateRange, orderSearch, orderSourceFilter, orderStatusFilter]);

  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((e) => filterByDate(e.createdAt));
  }, [allExpenses, dateFilter, dateRange]);

  const totalExpenseAmount = filteredExpenses.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0
  );

  useEffect(() => {
    setOrderCurrentPage(1);
    setCurrentPage(1);
  }, [orderSearch, orderSourceFilter, orderStatusFilter, dateFilter, dateRange, searchQuery, selectedCategory, alertFilter]);

  const totalOrderPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (orderCurrentPage - 1) * ORDERS_PER_PAGE,
    orderCurrentPage * ORDERS_PER_PAGE
  );

  const orderStats = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        const amt = Number(order.totalAmount || 0);
        acc.total += amt;
        if (order.paymentMethod === 'Cash') acc.cash += amt;
        else if (order.paymentMethod === 'Online') acc.online += amt;
        else if (order.paymentMethod === 'Due') acc.due += amt;
        return acc;
      },
      { total: 0, cash: 0, online: 0, due: 0 }
    );
  }, [filteredOrders]);

  const productSalesMap = useMemo(() => {
    const stats = {};
    filteredOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const pid = item.product?.id;
        if (!pid) return;
        if (!stats[pid]) stats[pid] = { qty: 0, amount: 0, variants: {} };
        stats[pid].qty += item.qty;
        stats[pid].amount += item.qty * Number(item.price);

        const vName = item.variant?.name || 'Default';
        if (!stats[pid].variants[vName]) stats[pid].variants[vName] = { qty: 0, amount: 0 };
        stats[pid].variants[vName].qty += item.qty;
        stats[pid].variants[vName].amount += item.qty * Number(item.price);
      });
    });
    return stats;
  }, [filteredOrders]);

  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];
    if (selectedCategory !== 'All')
      filtered = filtered.filter((p) => p.category === selectedCategory);
    if (searchQuery)
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Apply the low stock / expiry filters
    if (alertFilter === 'LowStock') {
      filtered = filtered.filter((p) => 
        (p.variants || []).some(v => v.stock !== undefined && v.stock !== '' && Number(v.stock) > 0 && Number(v.stock) < 5)
      );
    } else if (alertFilter === 'ExpiringSoon') {
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(now.getMonth() + 1);
      
      filtered = filtered.filter((p) => 
        (p.variants || []).some(v => {
          if (!v.expiry) return false;
          const exp = new Date(v.expiry);
          return exp > now && exp <= nextMonth;
        })
      );
    }

    if (sortBySales) {
      filtered.sort((a, b) => {
        const qtyA = productSalesMap[a.id]?.qty || 0;
        const qtyB = productSalesMap[b.id]?.qty || 0;
        return qtyB - qtyA;
      });
    } else {
      filtered.reverse();
    }
    return filtered;
  }, [allProducts, selectedCategory, searchQuery, alertFilter, sortBySales, productSalesMap]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const posFlattenedProducts = useMemo(() => {
    let list = [];
    allProducts.forEach((p) => {
      if (!p.variants || p.variants.length === 0) {
        list.push({ product: p, variant: { name: 'Default', price: p.price, offerPrice: p.offerPrice, stock: p.stock, expiry: p.expiry, purchasePrice: p.purchasePrice } });
      } else {
        p.variants.forEach((v) => {
          list.push({ product: p, variant: v });
        });
      }
    });

    if (posSearchQuery) {
       const q = posSearchQuery.toLowerCase();
       list = list.filter(item => 
          item.product.name.toLowerCase().includes(q) ||
          item.variant.name.toLowerCase().includes(q) ||
          item.product.category.toLowerCase().includes(q)
       );
    }
    return list;
  }, [allProducts, posSearchQuery]);

  const analyticsData = useMemo(() => {
    const dailySales = {};
    filteredOrders.forEach((order) => {
      const dateStr = new Date(order.createdAt).toLocaleDateString();
      if (!dailySales[dateStr]) dailySales[dateStr] = 0;
      dailySales[dateStr] += Number(order.totalAmount || 0);
    });
    return { dailySales };
  }, [filteredOrders]);

  // Alert metrics based on variants
  const lowStockCount = useMemo(() => {
    return allProducts.reduce((count, p) => count + (p.variants || []).filter(v => v.stock !== undefined && v.stock !== '' && Number(v.stock) > 0 && Number(v.stock) < 5).length, 0);
  }, [allProducts]);

  const nearExpiryCount = useMemo(() => {
    return allProducts.reduce((count, p) => count + (p.variants || []).filter(v => {
      if(!v.expiry) return false;
      const exp = new Date(v.expiry);
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(now.getMonth() + 1);
      return exp > now && exp <= nextMonth;
    }).length, 0);
  }, [allProducts]);

  // ========== CART TOTALS WITH GST ==========
  const cartTotalBeforeDiscount = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const discountAmount = appliedCoupon ? Number(appliedCoupon.discount) : 0;
  const taxableAmount = Math.max(0, cartTotalBeforeDiscount - discountAmount);
  const { cgstAmount, sgstAmount, igstAmount, taxAmount } = calculateGst(taxableAmount);
  const grandTotal = +(taxableAmount + taxAmount).toFixed(2);

  // ========== WHATSAPP INVOICE GENERATOR ==========
  const sendWhatsAppInvoice = (order) => {
    const bName = userData?.businessName || 'Your Business';
    const phone = order.customerMobile;
    
    if (!phone || phone === 'N/A') {
      showAlert('error', 'Customer mobile number is missing.');
      return;
    }

    let text = `*🧾 TAX INVOICE*\n`;
    text += `*${bName}*\n`;
    text += `--------------------------------\n`;
    text += `*Invoice No:* ${order.id}\n`;
    text += `*Date:* ${new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
    text += `*Customer:* ${order.customerName}\n`;
    text += `--------------------------------\n`;
    
    (order.items || []).forEach((item, index) => {
      const name = (item.product?.name || 'Item') + (item.variant?.name ? ` (${item.variant.name})` : '');
      text += `*${index + 1}. ${name}*\n`;
      text += `    ${item.qty} x ₹${Number(item.price).toFixed(2)} = ₹${(item.qty * Number(item.price)).toFixed(2)}\n`;
    });
    
    text += `--------------------------------\n`;
    const sub = Number(order.taxableAmount ?? ((order.totalAmount || 0) + (order.discountAmount || 0) - (order.taxAmount || 0)));
    text += `*Subtotal:* ₹${sub.toFixed(2)}\n`;
    
    if (order.discountAmount > 0) {
      text += `*Discount:* -₹${Number(order.discountAmount).toFixed(2)}\n`;
    }
    
    const cgst = Number(order.cgstAmount || 0);
    const sgst = Number(order.sgstAmount || 0);
    const igst = Number(order.igstAmount || 0);
    
    if (cgst > 0) text += `*CGST:* ₹${cgst.toFixed(2)}\n`;
    if (sgst > 0) text += `*SGST:* ₹${sgst.toFixed(2)}\n`;
    if (igst > 0) text += `*IGST:* ₹${igst.toFixed(2)}\n`;

    text += `*GRAND TOTAL:* ₹${Number(order.totalAmount).toFixed(2)}\n`;
    text += `--------------------------------\n`;
    text += `*Payment:* ${order.paymentMethod} (${order.paymentStatus === 'Done' ? 'Paid' : 'Pending'})\n\n`;
    text += `Thank you for your business! Visit again.`;

    const encodedText = encodeURIComponent(text);
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const finalPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    
    const waUrl = `https://wa.me/${finalPhone}?text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  // ========== INVOICE GENERATORS ==========
  const downloadInvoiceA4 = (order) => {
    const bName = userData?.businessName || 'Your Business';
    const bPhone = userData?.verifiedMobile || userData?.mobileNumber || '';
    const bAddress = userData?.businessAddress || '';
    const bEmail = userData?.email || '';
    const dateStr = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const itemsHtml = (order.items || [])
      .map(
        (it) => `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;">
          <strong>${it.product?.name || 'Item'}</strong><br/>
          <span style="font-size:11px;color:#64748b;">${it.variant?.name || ''}</span>
        </td>
        <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:right;">${it.qty}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${Number(it.price).toFixed(2)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${(it.qty * Number(it.price)).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const sub = Number(order.taxableAmount ?? ((order.totalAmount || 0) + (order.discountAmount || 0) - (order.taxAmount || 0)));
    const disc = Number(order.discountAmount || 0);
    const tax = Number(order.taxAmount || 0);
    const cgst = Number(order.cgstAmount || 0);
    const sgst = Number(order.sgstAmount || 0);
    const igst = Number(order.igstAmount || 0);
    const total = Number(order.totalAmount || 0);

    const usedSgstRate = sgst > 0 ? (sgstRate || 9) : 0;
    const usedIgstRate = igst > 0 ? (igstRate || 9) : 0;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${order.id}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #111; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
    .biz { font-size: 20px; font-weight: 700; }
    .meta { font-size: 12px; color: #555; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f8fafc; padding: 8px 6px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb; }
    .footer { margin-top: 28px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="biz">${bName}</div>
      <div class="meta">${bAddress}</div>
      <div class="meta">Phone: ${bPhone}${bEmail ? ' | ' + bEmail : ''}</div>
      ${order.gstNumber || gstNumber ? `<div class="meta"><strong>GSTIN:</strong> ${order.gstNumber || gstNumber}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:700;">TAX INVOICE</div>
      <div class="meta">Invoice #: ${order.id}</div>
      <div class="meta">${dateStr}</div>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px;">
    <div>
      <strong>Bill To</strong><br/>
      ${order.customerName || 'Walk-in Customer'}<br/>
      ${order.customerMobile || ''}
      ${order.remarks ? `<br/><span style="color:#92400e;">Note: ${order.remarks}</span>` : ''}
    </div>
    <div style="text-align:right;">
      <div>Payment: <strong>${order.paymentMethod}</strong></div>
      <div>Status: ${order.paymentStatus || 'Done'}</div>
      ${order.couponApplied ? `<div>Coupon: ${order.couponApplied}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:right;">Qty</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="margin-top:16px;display:flex;justify-content:flex-end;">
    <div style="width:280px;font-size:13px;">
      <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>Subtotal</span><span>₹${(sub + disc).toFixed(2)}</span></div>
      ${disc > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;color:#059669;"><span>Discount</span><span>-₹${disc.toFixed(2)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>Taxable Value</span><span>₹${sub.toFixed(2)}</span></div>
      ${cgst > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;"><span>CGST @ ${usedSgstRate}%</span><span>₹${cgst.toFixed(2)}</span></div>` : ''}
      ${sgst > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;"><span>SGST @ ${usedSgstRate}%</span><span>₹${sgst.toFixed(2)}</span></div>` : ''}
      ${igst > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;"><span>IGST @ ${usedIgstRate}%</span><span>₹${igst.toFixed(2)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:8px 0 0;margin-top:6px;border-top:2px solid #111;font-size:16px;font-weight:700;">
        <span>Grand Total</span><span>₹${total.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    Thank you for your business!<br/>
    This is a computer generated invoice.
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 400);
    }
  };

  const downloadInvoiceThermal = (order) => {
    const bName = userData?.businessName || 'Your Business';
    const bPhone = userData?.verifiedMobile || userData?.mobileNumber || '';
    const bAddress = userData?.businessAddress || '';
    const dateStr = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const itemsRows = (order.items || [])
      .map((it) => {
        const name = (it.product?.name || 'Item') + (it.variant?.name ? ` (${it.variant.name})` : '');
        const lineTotal = (it.qty * Number(it.price)).toFixed(2);
        return `<tr><td style="text-align:left;padding:2px 0;font-size:11px;">${name}</td></tr>
                <tr><td style="text-align:left;padding:0 0 6px 0;font-size:10px;color:#444;">${it.qty} x ₹${Number(it.price).toFixed(2)} = ₹${lineTotal}</td></tr>`;
      }).join('');

    const sub = Number(order.taxableAmount ?? ((order.totalAmount || 0) + (order.discountAmount || 0) - (order.taxAmount || 0)));
    const disc = Number(order.discountAmount || 0);
    const cgst = Number(order.cgstAmount || 0);
    const sgst = Number(order.sgstAmount || 0);
    const igst = Number(order.igstAmount || 0);
    const total = Number(order.totalAmount || 0);

    const usedSgstRate = sgst > 0 ? (sgstRate || 9) : 0;
    const usedIgstRate = igst > 0 ? (igstRate || 9) : 0;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Receipt ${order.id}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; padding: 8px; font-size: 12px; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; }
    .right { text-align: right; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:14px;">${bName}</div>
  <div class="center" style="font-size:10px;">${bAddress}</div>
  <div class="center" style="font-size:10px;">Ph: ${bPhone}</div>
  ${(order.gstNumber || gstNumber) ? `<div class="center" style="font-size:10px;"><strong>GSTIN: ${order.gstNumber || gstNumber}</strong></div>` : ''}
  
  <div class="line"></div>
  <div style="font-size:10px;">Invoice: ${order.id}</div>
  <div style="font-size:10px;">${dateStr}</div>
  <div style="font-size:10px;">Customer: ${order.customerName || 'Walk-in'}</div>
  <div style="font-size:10px;">Mobile: ${order.customerMobile || '-'}</div>
  ${order.remarks ? `<div style="font-size:10px;">Note: ${order.remarks}</div>` : ''}
  <div class="line"></div>

  <table>${itemsRows}</table>

  <div class="line"></div>
  <table style="font-size:11px;">
    <tr><td>Subtotal</td><td class="right">₹${(sub + disc).toFixed(2)}</td></tr>
    ${disc > 0 ? `<tr><td>Discount</td><td class="right">-₹${disc.toFixed(2)}</td></tr>` : ''}
    <tr><td>Taxable</td><td class="right">₹${sub.toFixed(2)}</td></tr>
    ${cgst > 0 ? `<tr><td>CGST ${usedSgstRate}%</td><td class="right">₹${cgst.toFixed(2)}</td></tr>` : ''}
    ${sgst > 0 ? `<tr><td>SGST ${usedSgstRate}%</td><td class="right">₹${sgst.toFixed(2)}</td></tr>` : ''}
    ${igst > 0 ? `<tr><td>IGST ${usedIgstRate}%</td><td class="right">₹${igst.toFixed(2)}</td></tr>` : ''}
  </table>
  <div class="line"></div>
  <div class="bold" style="display:flex;justify-content:space-between;font-size:14px;">
    <span>TOTAL</span>
    <span>₹${total.toFixed(2)}</span>
  </div>
  <div style="font-size:10px;margin-top:4px;">Paid via: ${order.paymentMethod}</div>
  ${order.couponApplied ? `<div style="font-size:10px;">Coupon: ${order.couponApplied}</div>` : ''}
  
  <div class="line"></div>
  <div class="center" style="font-size:10px;margin-top:8px;">Thank you! Visit again.</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 400);
    }
  };

  const printInvoiceByPreference = (order) => {
    const pref = userData?.invoicePrintPreference || 'Thermal';
    if (pref === 'No Print') return;
    if (pref === 'A4') {
      downloadInvoiceA4(order);
    } else {
      downloadInvoiceThermal(order);
    }
  };

  const handleUpdatePayment = (orderId, newMethod) => {
    if (!docId) return showAlert('error', 'Document identity not available.');
    try {
      const rawOrders = [...(userData.orders || [])];
      const orderIndex = rawOrders.findIndex((o) => o.id === orderId);

      if (orderIndex === -1) return;
      const order = rawOrders[orderIndex];

      if (order.paymentMethod === newMethod) return;

      const changeLog = {
        from: order.paymentMethod,
        to: newMethod,
        changedAt: new Date().toISOString()
      };

      const newPaymentHistory = [...(order.paymentHistory || []), changeLog];
      let newPaymentStatus = order.paymentStatus;
      if (order.source !== 'Customer') {
        newPaymentStatus = newMethod === 'Due' ? 'Pending' : 'Done';
      }

      rawOrders[orderIndex] = {
        ...order,
        paymentMethod: newMethod,
        paymentStatus: newPaymentStatus,
        paymentHistory: newPaymentHistory
      };

      setUserData((prev) => ({ ...prev, orders: rawOrders }));
      showAlert('success', 'Payment method updated!');
      firebase.firestore().collection('BusinessUsers').doc(docId).update({ orders: rawOrders });
    } catch (err) {
      showAlert('error', 'Failed to update payment method');
    }
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    if (!docId) return showAlert('error', 'Document identity not available.');
    try {
      let reason = '';
      if (newStatus === 'Cancel / Reject') {
        reason = prompt('Please enter a reason for cancellation:');
        if (reason === null) return;
      }
      const rawOrders = [...(userData.orders || [])];
      const orderIndex = rawOrders.findIndex((o) => o.id === orderId);
      if (orderIndex === -1) return;
      
      const order = rawOrders[orderIndex];
      const statusLog = { status: newStatus, date: new Date().toISOString(), reason: reason };
      const newStatusHistory = [...(order.statusHistory || []), statusLog];

      rawOrders[orderIndex] = {
        ...order,
        orderStatus: newStatus,
        statusHistory: newStatusHistory
      };

      setUserData((prev) => ({ ...prev, orders: rawOrders }));
      showAlert('success', `Order marked as ${newStatus}`);
      firebase.firestore().collection('BusinessUsers').doc(docId).update({ orders: rawOrders });
    } catch (err) {
      showAlert('error', 'Failed to update order status');
    }
  };

  const handleVerifyPayment = (orderId) => {
    if (!docId) return showAlert('error', 'Document identity not available.');
    try {
      const rawOrders = [...(userData.orders || [])];
      const orderIndex = rawOrders.findIndex((o) => o.id === orderId);
      if (orderIndex === -1) return;
      const order = rawOrders[orderIndex];

      if (order.paymentStatus === 'Done') {
        showAlert('info', 'Already verified');
        return;
      }

      const changeLog = {
        from: order.paymentStatus || 'Pending',
        to: 'Done',
        changedAt: new Date().toISOString(),
        action: 'Verified'
      };

      rawOrders[orderIndex] = {
        ...order,
        paymentStatus: 'Done',
        paymentHistory: [...(order.paymentHistory || []), changeLog],
        verifiedAt: new Date().toISOString()
      };

      setUserData((prev) => ({ ...prev, orders: rawOrders }));
      showAlert('success', 'Payment verified & marked as Done!');
      firebase.firestore().collection('BusinessUsers').doc(docId).update({ orders: rawOrders });
    } catch (err) {
      showAlert('error', 'Failed to verify payment');
    }
  };

  const handleProductChange = (e) =>
    setProductForm({ ...productForm, [e.target.name]: e.target.value });

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const addVariant = () => setVariants([...variants, { name: '', price: '', offerPrice: '', stock: '', expiry: '', purchasePrice: '' }]);
  const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index));

  const processImageFiles = (files) => {
    if (!files || files.length === 0) return;
    const remainingSlots = MAX_PRODUCT_IMAGES - productImagePreviews.length;
    if (remainingSlots <= 0) {
      return showAlert('error', `Maximum ${MAX_PRODUCT_IMAGES} images allowed per product`);
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const validFiles = [];
    const newPreviews = [];

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        showAlert('error', `${file.name} is not a valid image`);
        continue;
      }
      if (file.size > 200 * 1024) {
        showAlert('error', `${file.name} must be under 200KB`);
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setProductImages((prev) => [...prev, ...validFiles]);
      setProductImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImageAt = (index) => {
    const preview = productImagePreviews[index];
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);

    setProductImagePreviews((prev) => prev.filter((_, i) => i !== index));

    if (index < oldImageUrls.length) {
      setOldImageUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      const newFileIndex = index - oldImageUrls.length;
      setProductImages((prev) => prev.filter((_, i) => i !== newFileIndex));
    }
  };

  const openAddProductModal = () => {
    setProductForm({ name: '', description: '', category: '', customCategory: '', companyName: '', batch: '', code: '' });
    setVariants([{ name: '', price: '', offerPrice: '', stock: '', expiry: '', purchasePrice: '' }]);
    setProductImages([]);
    setProductImagePreviews([]);
    setOldImageUrls([]);
    setOriginalOldImageUrls([]);
    setEditingProductId(null);
    setUploadProgress(0);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product) => {
    const isKnown = availableCategories.includes(product.category) && product.category !== 'Other';
    setProductForm({
      name: product.name || '',
      code: product.code || '',
      description: product.description || '',
      category: isKnown ? product.category : 'Other',
      customCategory: isKnown ? '' : product.category || '',
      companyName: product.companyName || '',
      batch: product.batch || ''
    });
    setVariants(
      product.variants?.length ? product.variants : [{ name: '', price: product.price, offerPrice: product.offerPrice, stock: product.stock || '', expiry: product.expiry || '', purchasePrice: product.purchasePrice || '' }]
    );

    const existingImages = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
        ? product.imageUrls
        : product.imageUrl ? [product.imageUrl] : [];

    setProductImagePreviews(existingImages);
    setOldImageUrls(existingImages);
    setOriginalOldImageUrls(existingImages);
    setProductImages([]);
    setEditingProductId(product.id);
    setUploadProgress(0);
    setIsProductModalOpen(true);
  };

  const deleteOldStorageImage = async (imageUrl) => {
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) return;
    try {
      const storageRef = firebase.storage().refFromURL(imageUrl);
      await storageRef.delete();
    } catch (err) {
      console.warn('Could not delete old image:', err.message);
    }
  };

  const uploadImage = (file, identifier) => {
    return new Promise((resolve, reject) => {
      const fileName = `Products/${identifier}_${Date.now()}_${file.name.replace(/\s+/g, '_')}_${Math.random().toString(36).slice(2, 8)}`;
      const fileRef = firebase.storage().ref().child(fileName);
      const uploadTask = fileRef.put(file);

      uploadTask.on(
        'state_changed', null,
        (error) => { reject(error); },
        async () => {
          try {
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
            resolve(downloadURL);
          } catch (err) { reject(err); }
        }
      );
    });
  };

  const availableCategories = useMemo(() => {
    const fromProducts = (userData?.products || []).map((p) => p.category).filter(Boolean);
    return [...new Set([...fromProducts])].sort();
  }, [userData?.products]);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name) return showAlert('error', 'Name is required.');
    if (variants.some((v) => !v.price || !v.name))
      return showAlert('error', 'All variants must have a name and price.');

    let finalCategory = productForm.category === 'Other' ? productForm.customCategory.trim() : productForm.category;
    if (!finalCategory) return showAlert('error', 'Please specify a category.');
    if (!docId) return showAlert('error', 'Document ID missing. Please refresh.');

    setSaving(true);
    setUploadProgress(0);

    try {
      let newImageUrls = [];
      if (productImages.length > 0) {
        for (let i = 0; i < productImages.length; i++) {
          const url = await uploadImage(productImages[i], CUSTOMER_ID);
          newImageUrls.push(url);
          setUploadProgress(Math.round(((i + 1) / productImages.length) * 100));
        }
      }

      const finalImageUrls = [...oldImageUrls, ...newImageUrls];
      const imagesToDelete = originalOldImageUrls.filter((url) => !oldImageUrls.includes(url));
      for (const url of imagesToDelete) {
        await deleteOldStorageImage(url);
      }

      const currentProducts = userData.products || [];
      let updatedProducts = [...currentProducts];

      const productData = {
        name: productForm.name,
        code: productForm.code,
        description: productForm.description,
        category: finalCategory,
        companyName: productForm.companyName,
        batch: productForm.batch,
        imageUrls: finalImageUrls,
        imageUrl: finalImageUrls[0] || '', 
        variants: variants,
        price: variants[0].price,
        offerPrice: variants[0].offerPrice || '',
        stock: variants[0].stock || '',
        expiry: variants[0].expiry || '',
        purchasePrice: variants[0].purchasePrice || ''
      };

      if (editingProductId) {
        const index = updatedProducts.findIndex((p) => p.id === editingProductId);
        if (index !== -1) {
          updatedProducts[index] = { ...updatedProducts[index], ...productData, updatedAt: new Date().toISOString() };
        }
      } else {
        updatedProducts.push({
          id: Date.now().toString(), ...productData, totalSaleQty: 0, totalSaleAmount: 0, variantSales: {}, createdAt: new Date().toISOString()
        });
      }

      setUserData((prev) => ({ ...prev, products: updatedProducts }));
      setIsProductModalOpen(false);
      showAlert('success', editingProductId ? 'Product updated successfully!' : 'Product added successfully!');
      await firebase.firestore().collection('BusinessUsers').doc(docId).update({ products: updatedProducts });
    } catch (err) {
      console.error(err);
      showAlert('error', err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
      setUploadProgress(0);
      productImagePreviews.forEach((p) => { if (p.startsWith('blob:')) URL.revokeObjectURL(p); });
    }
  };

  const handleDeleteProduct = (productId) => {
    if (!window.confirm('Delete this product permanently?')) return;
    if (!docId) return showAlert('error', 'Document ID missing. Please refresh.');

    try {
      const productToDelete = (userData.products || []).find((p) => p.id === productId);
      const updatedProducts = (userData.products || []).filter((p) => p.id !== productId);

      setUserData((prev) => ({ ...prev, products: updatedProducts }));
      showAlert('success', 'Product deleted instantly.');

      firebase.firestore().collection('BusinessUsers').doc(docId).update({ products: updatedProducts })
        .then(() => {
          if (productToDelete?.imageUrls?.length) {
            productToDelete.imageUrls.forEach((url) => deleteOldStorageImage(url));
          } else if (productToDelete?.imageUrl) {
            deleteOldStorageImage(productToDelete.imageUrl);
          }
        }).catch((err) => console.error(err));
    } catch (err) {
      showAlert('error', err.message);
    }
  };

  // ===================== EXCEL UPLOAD LOGIC =====================
  const handleExcelFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const binaryString = event.target.result;
        const workbook = XLSX.read(binaryString, { type: 'binary' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Exact mapping: header starts at row 2 (index 1)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 });
        
        if (jsonData.length > 0) {
          const processedHeaders = jsonData[0]
            .map(header => (typeof header === 'string' ? header.trim() : header))
            .filter(header => header !== '');
          setExcelHeaders(processedHeaders);
          setExcelData(jsonData.slice(1));
        }
      } catch (error) {
        showAlert('error', 'Error processing Excel file: ' + error.message);
      }
    };
    reader.onerror = () => showAlert('error', 'Error reading file');
    reader.readAsBinaryString(file);
  };

  const handleUploadExcelToFirebase = async () => {
    if (!excelData.length) return;
    if (!docId) return showAlert('error', 'Document ID missing. Please refresh.');

    setIsUploadingExcel(true);
    setExcelUploadProgress(0);
    setExcelProcessedCount(0);
  
    try {
      let currentProducts = [...(userData.products || [])];
      let successCount = 0;
      let updatedCount = 0;
      const totalRows = excelData.length;
      const BATCH_SIZE = 50; // write to Firestore every 50 rows
  
      for (let i = 0; i < totalRows; i++) {
        const row = excelData[i];
        if (!row || row.length === 0) {
          if (i % BATCH_SIZE === 0 || i === totalRows - 1) {
            setExcelProcessedCount(i + 1);
            setExcelUploadProgress(Math.floor(((i + 1) / totalRows) * 100));
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          continue;
        }
  
        // Exact mapping from stock_91.xls style:
        const code = row[0] ? row[0].toString().trim() : '';
        const productName = row[1] ? row[1].toString().trim() : '';
        const currentStock = parseFloat(row[3]) || 0;
        const mrp = parseFloat(row[10]) || 0;
        const purchasePrice = parseFloat(row[11]) || 0;
        const salesPrice = parseFloat(row[12]) || 0;
        const companyName = row[13] ? row[13].toString().trim() : '';
        const batchName = row[16] ? row[16].toString().trim() : '';
        const expiryDate = row[18] ? row[18].toString().trim() : '';
  
        if (!productName) {
          if (i % BATCH_SIZE === 0 || i === totalRows - 1) {
            setExcelProcessedCount(i + 1);
            setExcelUploadProgress(Math.floor(((i + 1) / totalRows) * 100));
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          continue;
        }
  
        const existingIndex = currentProducts.findIndex(
          p => p.name && p.name.toLowerCase() === productName.toLowerCase()
        );
  
        const newVariant = {
          name: 'Default',
          price: mrp,
          offerPrice: salesPrice,
          purchasePrice: purchasePrice,
          stock: currentStock,
          expiry: expiryDate,
          batch: batchName,
          companyName: companyName
        };
  
        const productData = {
          code: code,
          name: productName,
          description: companyName
            ? `Company: ${companyName} | Batch: ${batchName}`
            : '',
          category: 'Medicine',
          price: mrp,
          offerPrice: salesPrice,
          companyName: companyName,
          batch: batchName,
          purchasePrice: purchasePrice,
          stock: currentStock,
          expiry: expiryDate,
          updatedAt: new Date().toISOString()
        };
  
        if (existingIndex >= 0) {
          // UPDATE existing product
          currentProducts[existingIndex] = {
            ...currentProducts[existingIndex],
            ...productData,
            variants: [newVariant]
          };
          updatedCount++;
        } else {
          // ADD new product
          currentProducts.push({
            id: `PROD-${Date.now()}-${i}`,
            ...productData,
            variants: [newVariant],
            imageUrls: [],
            imageUrl: '',
            totalSaleQty: 0,
            totalSaleAmount: 0,
            variantSales: {},
            createdAt: new Date().toISOString()
          });
          successCount++;
        }
  
        const shouldWrite = (i + 1) % BATCH_SIZE === 0 || i === totalRows - 1;
  
        if (shouldWrite) {
          setUserData(prev => ({ ...prev, products: [...currentProducts] }));
          try {
            await firebase.firestore().collection('BusinessUsers').doc(docId).update({ products: currentProducts });
          } catch (writeErr) {
            console.error('Batch write error at row', i, writeErr);
          }
  
          setExcelProcessedCount(i + 1);
          setExcelUploadProgress(Math.floor(((i + 1) / totalRows) * 100));
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
  
      setUserData(prev => ({ ...prev, products: currentProducts }));
      await firebase.firestore().collection('BusinessUsers').doc(docId).update({ products: currentProducts });
  
      showAlert(
        'success',
        `Excel processed successfully! ${successCount} Added, ${updatedCount} Updated.`
      );
      setIsExcelModalOpen(false);
      setExcelData([]);
      setExcelHeaders([]);
    } catch (err) {
      console.error(err);
      showAlert('error', 'Error uploading Excel: ' + (err.message || err));
    } finally {
      setIsUploadingExcel(false);
      setExcelProcessedCount(0);
      setExcelUploadProgress(0);
    }
  };

  const addToCart = (product, variant) => {
    // Expiry Check
    if (variant.expiry) {
      const expDate = new Date(variant.expiry);
      if (!isNaN(expDate) && expDate < new Date()) {
        showAlert('error', `Cannot add expired product: ${product.name}`);
        return;
      }
    }

    // Stock Check
    if (variant.stock !== undefined && variant.stock !== '' && Number(variant.stock) <= 0) {
      showAlert('error', `Out of stock: ${product.name}`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.variant.name === variant.name);
      
      // Stock limit validation for existing cart items
      if (existing) {
        if (variant.stock !== undefined && variant.stock !== '' && (existing.qty + 1) > Number(variant.stock)) {
          showAlert('error', `Not enough stock available for ${product.name}`);
          return prev;
        }
        return prev.map((item) => item === existing ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, variant, qty: 1, price: variant.offerPrice || variant.price }];
    });
    setPosSearchQuery('');
    setIsPosSearchFocused(false);
  };

  const updateCartQty = (index, delta) => {
    setCart((prev) => {
      const newCart = [...prev];
      const item = newCart[index];
      const variantStock = item.variant.stock;
      
      if (delta > 0 && variantStock !== undefined && variantStock !== '' && (item.qty + delta) > Number(variantStock)) {
        showAlert('error', `Not enough stock available for ${item.product.name}`);
        return prev;
      }

      newCart[index].qty += delta;
      if (newCart[index].qty <= 0) newCart.splice(index, 1);
      return newCart;
    });
  };

  const handleApplyCoupon = () => {
    if (!hasVerifiedCheckout) return showAlert('error', 'Coupon facility requires Verified Checkout plan.');
    if (!couponInput) return showAlert('error', 'Enter a coupon code');

    const coupon = allCoupons.find((c) => c.code.toUpperCase() === couponInput.toUpperCase());
    if (!coupon) return showAlert('error', 'Invalid coupon code');

    const now = new Date();
    if (new Date(coupon.validFrom) > now || new Date(coupon.validTo) < now) {
      return showAlert('error', 'Coupon expired or not active');
    }

    if (cartTotalBeforeDiscount < Number(coupon.minOrder)) {
      return showAlert('error', `Minimum order amount is ₹${coupon.minOrder}`);
    }

    if (customerInfo.mobile && coupon.usedBy && coupon.usedBy.includes(customerInfo.mobile)) {
      return showAlert('error', 'Coupon already used on this number');
    }

    setAppliedCoupon(coupon);
    showAlert('success', 'Coupon applied successfully!');
  };

  const handleCheckout = () => {
    if (cart.length === 0) return showAlert('error', 'Cart is empty');
    if (appliedCoupon && !customerInfo.mobile) {
      return showAlert('error', 'Mobile number is required to use a coupon.');
    }
    if (!docId) return showAlert('error', 'Document ID missing. Please refresh.');

    setIsSubmittingOrder(true);

    try {
      const paymentStatus = customerInfo.paymentMethod === 'Due' ? 'Pending' : 'Done';
      const savedMobileForWhatsapp = customerInfo.mobile;

      const newOrder = {
        id: generateOrderId(),
        customerName: customerInfo.name || 'Walk-in Customer',
        customerMobile: customerInfo.mobile || 'N/A',
        remarks: customerInfo.remarks || '',
        paymentMethod: customerInfo.paymentMethod,
        paymentStatus: paymentStatus,
        orderStatus: 'Delivered',
        statusHistory: [{ status: 'Delivered', date: new Date().toISOString(), reason: 'POS direct delivery' }],
        source: 'POS',
        items: cart,
        hasGst: hasGst,
        gstNumber: hasGst ? gstNumber : '',
        taxableAmount: taxableAmount,
        taxType: taxType,               
        cgstAmount,
        sgstAmount,
        igstAmount,
        taxAmount,
        discountAmount: discountAmount,
        totalAmount: grandTotal,
        couponApplied: appliedCoupon && hasVerifiedCheckout ? appliedCoupon.code : null,
        createdAt: new Date().toISOString(),
        paymentHistory: []
      };

      let updatedProducts = [...allProducts];
      cart.forEach((cartItem) => {
        const pIndex = updatedProducts.findIndex((p) => p.id === cartItem.product.id);
        if (pIndex !== -1) {
          const prod = updatedProducts[pIndex];
          prod.totalSaleQty = (prod.totalSaleQty || 0) + cartItem.qty;
          prod.totalSaleAmount = (prod.totalSaleAmount || 0) + Number(cartItem.price) * cartItem.qty;
          if (!prod.variantSales) prod.variantSales = {};
          prod.variantSales[cartItem.variant.name] = (prod.variantSales[cartItem.variant.name] || 0) + cartItem.qty;
          
          // Deduct stock safely
          const variantIndex = prod.variants?.findIndex(v => v.name === cartItem.variant.name);
          if (variantIndex !== undefined && variantIndex >= 0) {
             let curStock = prod.variants[variantIndex].stock;
             if (curStock !== undefined && curStock !== '') {
                 prod.variants[variantIndex].stock = Math.max(0, Number(curStock) - cartItem.qty);
             }
          }

          updatedProducts[pIndex] = prod;
        }
      });

      const updatedOrders = [...(userData.orders || []), newOrder];
      let updatedCoupons = [...allCoupons];

      if (appliedCoupon && hasVerifiedCheckout && customerInfo.mobile) {
        updatedCoupons = updatedCoupons.map((c) => {
          if (c.code === appliedCoupon.code) return { ...c, usedBy: [...(c.usedBy || []), customerInfo.mobile] };
          return c;
        });
      }

      setUserData((prev) => ({
        ...prev, orders: updatedOrders, products: updatedProducts, coupons: updatedCoupons
      }));
      
      setCart([]);
      setCustomerInfo({ name: '', mobile: '', remarks: '', paymentMethod: 'Online' });
      setAppliedCoupon(null);
      setCouponInput('');
      showAlert('success', 'Order submitted instantly via POS!');
      setIsSubmittingOrder(false);

      printInvoiceByPreference(newOrder);

      firebase.firestore().collection('BusinessUsers').doc(docId)
        .update({ orders: updatedOrders, products: updatedProducts, coupons: updatedCoupons })
        .then(() => {
          if (savedMobileForWhatsapp && savedMobileForWhatsapp.length >= 10) {
            setTimeout(() => {
              const askWa = window.confirm('Order submitted successfully! Do you want to send the invoice on WhatsApp?');
              if (askWa) {
                sendWhatsAppInvoice(newOrder);
              }
            }, 500); 
          }
        })
        .catch((err) => console.error('Sync error:', err));
    } catch (err) {
      showAlert('error', 'Failed to submit order');
      setIsSubmittingOrder(false);
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.what || !expenseForm.amount) return showAlert('error', 'Required fields missing');
    if (!docId) return showAlert('error', 'Document ID missing. Please refresh.');

    try {
      const newExpense = {
        id: Date.now().toString(), what: expenseForm.what, reason: expenseForm.reason, amount: expenseForm.amount, createdAt: new Date().toISOString()
      };
      const updatedExpenses = [...(userData.expenses || []), newExpense];
      setUserData((prev) => ({ ...prev, expenses: updatedExpenses }));
      setExpenseForm({ what: '', reason: '', amount: '' });
      showAlert('success', 'Expense recorded!');
      await firebase.firestore().collection('BusinessUsers').doc(docId).update({ expenses: updatedExpenses });
    } catch (err) {
      showAlert('error', 'Failed to save expense');
    }
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!hasVerifiedCheckout) return showAlert('error', 'Coupon facility requires Verified Checkout plan (₹499/mo). Upgrade in Our Plans.');
    if (!couponForm.code || !couponForm.minOrder || !couponForm.discount || !couponForm.validFrom || !couponForm.validTo) {
      return showAlert('error', 'Fill all coupon fields');
    }
    if (!docId) return showAlert('error', 'Document ID missing. Please refresh.');

    try {
      const newCoupon = {
        ...couponForm, code: couponForm.code.toUpperCase(), usedBy: [], createdAt: new Date().toISOString()
      };
      const updatedCoupons = [...(userData.coupons || []), newCoupon];
      setUserData((prev) => ({ ...prev, coupons: updatedCoupons }));
      setCouponForm({ code: '', minOrder: '', discount: '', validFrom: '', validTo: '' });
      showAlert('success', 'Coupon added!');
      await firebase.firestore().collection('BusinessUsers').doc(docId).update({ coupons: updatedCoupons });
    } catch (err) {
      showAlert('error', 'Failed to save coupon');
    }
  };

  const renderDateFilter = () => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 bg-white border border-gray-200 p-1.5 rounded-lg shadow-sm mb-2 w-full">
      <div className="flex items-center bg-gray-50 rounded-md p-0.5 border border-gray-100 overflow-x-auto">
        {['Today', 'Weekly', 'Monthly', 'Yearly', 'Total', 'Custom'].map((f) => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={`flex-shrink-0 min-h-[28px] px-2 py-1 text-[10px] font-bold rounded whitespace-nowrap transition-all ${
              dateFilter === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {dateFilter === 'Custom' && (
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="flex-1 min-h-[28px] bg-white border border-gray-200 rounded px-1.5 py-1 text-[10px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900/20"
          />
          <span className="text-[8px] text-gray-400 font-bold">TO</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="flex-1 min-h-[28px] bg-white border border-gray-200 rounded px-1.5 py-1 text-[10px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900/20"
          />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-10 bg-white border border-gray-200 rounded-lg w-full"></div>
        <div className="flex flex-col xl:flex-row gap-2">
          <div className="w-full xl:w-2/3 grid grid-cols-2 md:grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-white border border-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="w-full xl:w-1/3 h-[50vh] bg-white border border-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'pos', icon: FiShoppingCart, label: 'POS' },
    { id: 'products', icon: FiTag, label: 'Products' },
    { id: 'orders', icon: FiList, label: 'Orders' },
    { id: 'analytics', icon: FiActivity, label: 'Analytics' },
    { id: 'expenses', icon: FiDollarSign, label: 'Expenses' },
    ...(hasVerifiedCheckout ? [{ id: 'coupons', icon: FiPercent, label: 'Coupons' }] : [])
  ];

  return (
    <div className="animate-fade-in-up text-gray-900 min-h-[80vh] w-full pb-3 px-0.5">
      
      {/* Top Navigation */}
      <div className="w-full rounded-lg border border-gray-200 bg-white shadow-sm mb-2">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between p-1">
          <div className="flex w-full items-center gap-1">
            <div className="flex-1 overflow-x-auto rounded-md border border-gray-100 bg-gray-50/50 p-0.5">
              <div className="flex items-center gap-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex min-h-[32px] flex-shrink-0 items-center justify-center gap-1 rounded px-2.5 py-1 text-[10px] font-bold whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                    }`}
                  >
                    <tab.icon size={13} className="flex-shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              title="Refresh Data"
            >
              <FiRefreshCw size={14} className={isRefreshing ? 'animate-spin text-gray-900' : ''} />
            </button>
          </div>

          {activeTab === 'products' && (
            <div className="flex gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="flex flex-1 min-h-[32px] sm:w-auto items-center justify-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all"
              >
                <FiUploadCloud size={13} />
                <span>Import Excel</span>
              </button>
              <button
                onClick={openAddProductModal}
                className="flex flex-1 min-h-[32px] sm:w-auto items-center justify-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-black active:scale-[0.98] transition-all"
              >
                <FiPlus size={13} />
                <span>Add Product</span>
              </button>
            </div>
          )}
        </div>
      </div>


      {/* ================= POS SYSTEM VIEW ================= */}
      {activeTab === 'pos' && (
        <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full px-1 sm:px-0">
          <div className="w-full relative" ref={posSearchRef}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center gap-2 px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
              <div className="bg-gray-100 p-2 rounded-lg shrink-0">
                <FiSearch className="text-gray-500" size={16} />
              </div>
              <input
                type="text"
                placeholder="Search items, category or barcode..."
                value={posSearchQuery}
                onChange={(e) => {
                  setPosSearchQuery(e.target.value);
                  setIsPosSearchFocused(true);
                }}
                onFocus={() => setIsPosSearchFocused(true)}
                className="flex-1 bg-transparent border-none py-1 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
              {posSearchQuery && (
                <button
                  onClick={() => setPosSearchQuery('')}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>

            {isPosSearchFocused && posSearchQuery.trim() !== '' && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50">
                {posFlattenedProducts.length > 0 ? (
                  posFlattenedProducts.map((item, idx) => {
                    const mainImage = item.product.imageUrls?.[0] || item.product.imageUrl || DUMMY_IMAGE;
                    let warningText = '';
                    const isOutOfStock = item.variant.stock !== undefined && item.variant.stock !== '' && Number(item.variant.stock) <= 0;
                    
                    let isExpired = false;
                    let isNearExpiry = false;
                    if (item.variant.expiry) {
                       const expDate = new Date(item.variant.expiry);
                       const now = new Date();
                       const nextMonth = new Date();
                       nextMonth.setMonth(now.getMonth() + 1);
                       
                       if (!isNaN(expDate) && expDate < now) {
                          isExpired = true;
                       } else if (!isNaN(expDate) && expDate <= nextMonth) {
                          isNearExpiry = true;
                       }
                    }

                    const isLowStock = !isOutOfStock && item.variant.stock !== undefined && item.variant.stock !== '' && Number(item.variant.stock) > 0 && Number(item.variant.stock) < 5;

                    if (isOutOfStock) warningText = 'Out of Stock';
                    else if (isExpired) warningText = 'Expired';

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-3 py-2.5 border-b border-gray-100 last:border-0 transition-colors ${warningText ? 'bg-red-50/50 opacity-70 cursor-not-allowed' : 'hover:bg-blue-50/60 cursor-pointer'}`}
                        onClick={() => {
                          if (!warningText) addToCart(item.product, item.variant);
                          else showAlert('error', `Cannot add: ${warningText}`);
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={mainImage}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0"
                            alt=""
                            onError={(e) => { e.target.src = DUMMY_IMAGE; }}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {item.product.name}
                            </span>
                            <span className="text-xs text-gray-500 font-medium truncate flex items-center gap-1.5 flex-wrap">
                              {item.variant.name} • {item.product.category}
                              {warningText && (
                                <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold border border-red-200 flex items-center gap-0.5">
                                  <FiAlertCircle size={9}/> {warningText}
                                </span>
                              )}
                              {!warningText && isLowStock && (
                                <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold border border-orange-200 flex items-center gap-0.5">
                                  <FiAlertCircle size={9}/> Low Stock
                                </span>
                              )}
                              {!warningText && isNearExpiry && (
                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200 flex items-center gap-0.5">
                                  <FiClock size={9}/> Expiring Soon
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 ml-3">
                          <span className="text-sm font-bold text-gray-900">
                            ₹{item.variant.offerPrice || item.variant.price}
                          </span>
                          {!warningText && (
                            <div className="bg-gray-900 text-white p-1.5 rounded-lg">
                              <FiPlus size={14} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-gray-400 font-medium text-sm">
                    No products found for “{posSearchQuery}”
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <FiUser size={14} className="text-gray-400" />
              Customer & Billing
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Customer Name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
              <input
                type="tel"
                placeholder="Mobile Number"
                value={customerInfo.mobile}
                onChange={(e) => setCustomerInfo({ ...customerInfo, mobile: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
              <input
                type="text"
                placeholder="Remarks (Optional)"
                value={customerInfo.remarks}
                onChange={(e) => setCustomerInfo({ ...customerInfo, remarks: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all col-span-2"
              />

              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Online', 'Cash', 'Due'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setCustomerInfo({ ...customerInfo, paymentMethod: method })}
                      className={`h-10 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all ${
                        customerInfo.paymentMethod === method
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[280px]">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <FiList size={15} className="text-gray-500" />
                Current Invoice
              </h3>
              {appliedCoupon && (
                <span className="text-xs text-emerald-700 font-semibold uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  {appliedCoupon.code} (−₹{appliedCoupon.discount})
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50/40">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                  <FiShoppingCart size={32} className="mb-3 opacity-40" />
                  <p className="text-sm font-semibold uppercase tracking-wide">Cart is empty</p>
                  <p className="text-xs mt-1 text-gray-400">Search above to add items</p>
                </div>
              ) : (
                cart.map((cItem, i) => {
                  const imgUrl = cItem.product.imageUrls?.[0] || cItem.product.imageUrl || DUMMY_IMAGE;
                  return (
                    <div
                      key={i}
                      className="flex gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm items-center"
                    >
                      <img
                        src={imgUrl}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-50 border border-gray-200"
                        alt=""
                        onError={(e) => { e.target.src = DUMMY_IMAGE; }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {cItem.product.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 font-medium">
                          <span className="truncate">{cItem.variant.name}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                          <span>₹{cItem.price}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                          <button
                            onClick={() => updateCartQty(i, -1)}
                            className="p-1.5 text-gray-600 hover:text-black hover:bg-white rounded-md transition-colors"
                          >
                            <FiMinus size={12} />
                          </button>
                          <span className="text-sm font-bold text-gray-900 w-6 text-center">
                            {cItem.qty}
                          </span>
                          <button
                            onClick={() => updateCartQty(i, 1)}
                            className="p-1.5 text-gray-600 hover:text-black hover:bg-white rounded-md transition-colors"
                          >
                            <FiPlus size={12} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            ₹{(cItem.price * cItem.qty).toFixed(2)}
                          </span>
                          <button
                            onClick={() => updateCartQty(i, -cItem.qty)}
                            className="p-1.5 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg border border-red-100 transition-colors"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-4 border-t border-gray-200 bg-white space-y-1.5">
              <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase">
                <span>Sub total</span>
                <span>₹{cartTotalBeforeDiscount.toFixed(2)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between items-center text-emerald-600 text-xs font-medium uppercase">
                  <span>Discount</span>
                  <span>−₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-gray-600 text-xs font-medium uppercase">
                <span>Taxable</span>
                <span>₹{taxableAmount.toFixed(2)}</span>
              </div>

              {cgstAmount > 0 && (
                <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase">
                  <span>CGST @ {cgstRate}%</span>
                  <span>₹{cgstAmount.toFixed(2)}</span>
                </div>
              )}
              {sgstAmount > 0 && (
                <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase">
                  <span>SGST @ {sgstRate}%</span>
                  <span>₹{sgstAmount.toFixed(2)}</span>
                </div>
              )}
              {igstAmount > 0 && (
                <div className="flex justify-between items-center text-gray-500 text-xs font-medium uppercase">
                  <span>IGST @ {igstRate}%</span>
                  <span>₹{igstAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-gray-900 pt-2 mt-1 border-t border-gray-100">
                <span className="text-sm font-bold uppercase">
                  Qty: {cart.reduce((sum, item) => sum + item.qty, 0)}
                </span>
                <span className="text-xl font-bold tracking-tight">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {hasGst && (
                <div className="pt-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Tax Type (GST)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTaxType('same')}
                      className={`h-10 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all ${
                        taxType === 'same'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Same State
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxType('different')}
                      className={`h-10 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all ${
                        taxType === 'different'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Different State
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmittingOrder}
                className="w-full mt-3 flex justify-between items-center bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase py-3 px-4 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSubmittingOrder ? (
                  <span className="flex items-center gap-2 mx-auto">
                    <FiLoader className="animate-spin" size={16} />
                    Processing...
                  </span>
                ) : (
                  <>
                    <span>Confirm Payment</span>
                    <FiArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ================= PRODUCTS VIEW ================= */}
      {activeTab === 'products' && (
        <div>
          {renderDateFilter()}
          
          {/* Alerts Panel For Global Viewing of Low Stock & Expiring Products */}
          {(lowStockCount > 0 || nearExpiryCount > 0) && (
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
               {lowStockCount > 0 && (
                   <div 
                     className="flex-1 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm cursor-pointer hover:bg-orange-100 transition-colors"
                     onClick={() => setAlertFilter(alertFilter === 'LowStock' ? 'All' : 'LowStock')}
                   >
                       <FiAlertCircle size={14} /> {lowStockCount} product variant(s) have Low Stock (less than 5).
                   </div>
               )}
               {nearExpiryCount > 0 && (
                   <div 
                     className="flex-1 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm cursor-pointer hover:bg-amber-100 transition-colors"
                     onClick={() => setAlertFilter(alertFilter === 'ExpiringSoon' ? 'All' : 'ExpiringSoon')}
                   >
                       <FiClock size={14} /> {nearExpiryCount} product variant(s) expiring within 1 month.
                   </div>
               )}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-lg border border-gray-200 items-center mb-2 shadow-sm">
            <div className="flex-1 min-w-[130px] relative">
              <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-7 pr-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900/20"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-50 h-[30px] border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-900 font-bold focus:outline-none focus:border-gray-900 max-w-[130px] uppercase"
            >
              <option value="All">All Categories</option>
              {[...new Set(allProducts.map((p) => p.category))].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            {/* NEW ALERT FILTER SELECT */}
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="bg-gray-50 h-[30px] border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-900 font-bold focus:outline-none focus:border-gray-900 max-w-[130px] uppercase"
            >
              <option value="All">All Status</option>
              <option value="LowStock">Low Stock</option>
              <option value="ExpiringSoon">Expiring Soon</option>
            </select>

            <button
              onClick={() => setSortBySales(!sortBySales)}
              className={`flex items-center gap-1 h-[30px] px-2.5 rounded-md border text-[10px] font-bold transition-all ${
                sortBySales ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FiTrendingUp size={12} /> Sort by Sales
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2 font-bold uppercase tracking-wider text-[9px] w-12">Img</th>
                    <th className="px-2 py-2 font-bold uppercase tracking-wider text-[9px]">Product / Company</th>
                    <th className="px-2 py-2 font-bold uppercase tracking-wider text-[9px] hidden sm:table-cell">Category</th>
                    <th className="px-2 py-2 font-bold uppercase tracking-wider text-[9px]">Variants / Details</th>
                    <th className="px-2 py-2 font-bold uppercase tracking-wider text-[9px] text-center">Sold</th>
                    <th className="px-2 py-2 font-bold uppercase tracking-wider text-[9px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedProducts.map((product,i) => {
                    const pStats = productSalesMap[product.id] || { qty: 0, amount: 0, variants: {} };
                    const mainImage = (product.imageUrls && product.imageUrls[0]) || product.imageUrl || DUMMY_IMAGE;

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5">
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="w-9 h-9 rounded object-cover border border-gray-200 bg-gray-50"
                            onError={(e) => { e.target.src = DUMMY_IMAGE; }}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="font-bold text-gray-900 text-[11px] leading-tight">{(currentPage-1)*PRODUCTS_PER_PAGE + i + 1}. {product.name}</div>
                          {product.code && (
                            <div className="text-[9px] text-gray-500 mt-0.5 font-mono">Code: {product.code}</div>
                          )}
                          {product.companyName && (
                            <div className="text-[9px] text-gray-500 mt-0.5">Co: {product.companyName}</div>
                          )}
                          {product.batch && (
                            <div className="text-[9px] font-mono text-gray-400 mt-0.5">Batch: {product.batch}</div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 hidden sm:table-cell">
                          <span className="text-[9px] font-semibold text-gray-600 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="space-y-1 max-w-[240px]">
                            {(product.variants || []).map((v, i) => {
                                const isLowStock = v.stock !== undefined && v.stock !== '' && Number(v.stock) > 0 && Number(v.stock) < 5;
                                const isOutOfStock = v.stock !== undefined && v.stock !== '' && Number(v.stock) <= 0;
                                
                                let isExp = false;
                                let isNearExp = false;
                                if (v.expiry) {
                                    const expDate = new Date(v.expiry);
                                    const now = new Date();
                                    const nextMonth = new Date();
                                    nextMonth.setMonth(now.getMonth() + 1);
                                    
                                    if (expDate < now) {
                                        isExp = true;
                                    } else if (expDate <= nextMonth) {
                                        isNearExp = true;
                                    }
                                }

                                return (
                                  <div key={i} className="flex flex-col bg-gray-50 border border-gray-100 rounded px-1.5 py-1">
                                    <div className="flex justify-between items-center gap-1 text-[10px]">
                                      <span className="font-medium text-gray-700 truncate">{v.name}</span>
                                      <span className="font-bold text-gray-900 whitespace-nowrap">
                                        ₹{Number(v.offerPrice || v.price).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex gap-2 mt-0.5">
                                      {v.stock !== undefined && v.stock !== '' && (
                                        <span className={`text-[8px] font-bold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-blue-500'}`}>
                                          Stock: {v.stock} {isLowStock ? '(Low)' : ''}
                                        </span>
                                      )}
                                      {v.purchasePrice && (
                                        <span className="text-[8px] text-gray-500">
                                          Pur: ₹{Number(v.purchasePrice).toFixed(2)}
                                        </span>
                                      )}
                                      {v.expiry && (
                                        <span className={`text-[8px] font-bold ${isExp ? 'text-red-500' : isNearExp ? 'text-orange-500' : 'text-emerald-600'}`}>
                                          Exp: {new Date(v.expiry).toLocaleDateString()} {isNearExp ? '(Soon)' : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                            })}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <div className="text-[11px] font-bold text-gray-900">{pStats.qty}</div>
                          <div className="text-[8px] text-gray-500">₹{pStats.amount.toLocaleString()}</div>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditProductModal(product)}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200"
                              title="Edit"
                            >
                              <FiEdit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-100"
                              title="Delete"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedProducts.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-gray-400 font-bold text-xs uppercase">
                        <FiBox className="mx-auto mb-1.5 text-gray-300" size={22} />
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-end gap-1.5 p-2 border-t border-gray-100">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <FiChevronLeft size={14} />
                </button>
                <div className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-[10px] font-bold text-gray-700 uppercase flex items-center">
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ================= ORDERS VIEW ================= */}
      {activeTab === 'orders' && (
        <div className="space-y-2">
          {renderDateFilter()}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {[
              { label: 'Total Revenue', value: orderStats.total, color: 'text-gray-900' },
              { label: 'Total Cash', value: orderStats.cash, color: 'text-gray-900' },
              { label: 'Total Online', value: orderStats.online, color: 'text-gray-900' },
              { label: 'Total Due', value: orderStats.due, color: 'text-red-600' }
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm text-center">
                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">{stat.label}</span>
                <span className={`text-base font-bold ${stat.color}`}>₹{stat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1.5">
              <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1 uppercase">
                <FiList className="text-gray-500" size={13} /> Order History
              </h2>
              <div className="relative w-full sm:w-56">
                <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input
                  type="text"
                  placeholder="Search ID, Name, Mobile..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md pl-7 pr-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900/20 h-[30px]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-2 border-b border-gray-100 pb-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <span className="text-[8px] text-gray-400 font-bold uppercase min-w-max mr-0.5">Source:</span>
                {[
                  { value: 'All', label: 'All' },
                  { value: 'POS', label: 'POS' },
                  { value: 'Customer', label: 'Customer' }
                ].map((src) => {
                  const count = src.value === 'All' ? allOrders.length : allOrders.filter((o) => o.source === src.value).length;
                  return (
                    <button
                      key={src.value}
                      onClick={() => setOrderSourceFilter(src.value)}
                      className={`flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap ${
                        orderSourceFilter === src.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {src.label}
                      <span className={`px-1 py-0.5 rounded text-[7px] ${orderSourceFilter === src.value ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <span className="text-[8px] text-gray-400 font-bold uppercase min-w-max mr-0.5">Status:</span>
                {['All', ...ORDER_STATUS_OPTIONS].map((st) => {
                  const count = st === 'All' ? allOrders.length : allOrders.filter((o) => (o.orderStatus || 'Pending') === st).length;
                  return (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap ${
                        orderStatusFilter === st ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {st === 'All' ? 'All' : st}
                      <span className={`px-1 py-0.5 rounded text-[7px] ${orderStatusFilter === st ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-[10px] whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-1.5 font-bold uppercase tracking-wider text-[8px]">Order Info</th>
                    <th className="px-2 py-1.5 font-bold uppercase tracking-wider text-[8px]">Items</th>
                    <th className="px-2 py-1.5 font-bold uppercase tracking-wider text-[8px]">Status & Payment</th>
                    <th className="px-2 py-1.5 font-bold uppercase tracking-wider text-[8px] text-right">Total</th>
                    <th className="px-2 py-1.5 font-bold uppercase tracking-wider text-[8px] text-center">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedOrders.map((order, i) => (
                    <tr key={order.id || i} className="hover:bg-gray-50">
                      <td className="px-2 py-2 align-top">
                        <div className="font-bold text-gray-900 text-[10px]">
                          {(orderCurrentPage - 1) * ORDERS_PER_PAGE + i + 1}. {order.id}
                        </div>
                        <div className="text-[8px] font-medium text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleString()}
                        </div>
                        <div className={`inline-flex mt-0.5 items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-bold uppercase border ${
                          order.source === 'Customer' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {order.source === 'Customer' ? <FiSmartphone size={9} /> : <FiMonitor size={9} />}
                          {order.source === 'Customer' ? 'Customer' : 'POS'}
                        </div>
                        <div className="font-medium mt-0.5 text-gray-700 flex items-center gap-0.5 text-[10px]">
                          <FiUser size={10} className="text-gray-400" /> {order.customerName} - {order.customerMobile}
                        </div>
                        {order.remarks && (
                          <div className="text-[8px] font-medium text-amber-700 mt-0.5 flex items-center gap-0.5 bg-amber-50 px-1 py-0.5 rounded w-fit border border-amber-200">
                            <FiFileText size={9} /> {order.remarks}
                          </div>
                        )}
                        {order.couponApplied && (
                          <div className="text-[8px] text-emerald-700 mt-0.5 font-bold bg-emerald-50 px-1 py-0.5 rounded w-fit border border-emerald-200 uppercase">
                            Coupon: {order.couponApplied} (-₹{order.discountAmount})
                          </div>
                        )}
                        {(order.hasGst || order.taxAmount > 0) && (
                          <div className="text-[8px] text-indigo-700 mt-0.5 font-bold bg-indigo-50 px-1 py-0.5 rounded w-fit border border-indigo-200">
                            GST ₹{Number(order.taxAmount || 0).toFixed(2)}
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-2 max-w-[200px] whitespace-normal">
                        <div className="space-y-0.5">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-1 rounded text-[10px]">
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-gray-900 truncate">
                                  {item.product?.name} <span className="text-gray-500 font-medium">({item.variant?.name})</span>
                                </span>
                                <span className="text-[8px] font-medium text-gray-400">{item.qty} × ₹{item.price}</span>
                              </div>
                              <span className="font-bold text-gray-900 bg-white px-1 py-0.5 rounded border border-gray-200 shrink-0">
                                ₹{item.qty * Number(item.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-2 py-2 align-top space-y-1 flex flex-col items-start min-w-[140px]">
                        <select
                          value={order.orderStatus || 'Pending'}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="text-[8px] uppercase font-bold px-1.5 py-1 rounded w-full border bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900/20 border-gray-200"
                        >
                          {ORDER_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>

                        <select
                          value={order.paymentMethod}
                          onChange={(e) => handleUpdatePayment(order.id, e.target.value)}
                          className={`text-[8px] uppercase font-bold px-1.5 py-1 rounded w-full border appearance-none focus:outline-none focus:ring-1 focus:ring-gray-900/20
                            ${order.paymentMethod === 'Online' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              order.paymentMethod === 'Cash' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-red-50 text-red-700 border-red-200'}`}
                        >
                          <option value="Online">Online</option>
                          <option value="Cash">Cash</option>
                          <option value="Due">Due</option>
                        </select>

                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border w-fit ${
                          order.paymentStatus === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {order.paymentStatus === 'Done' ? 'Paid' : 'Pending'}
                        </span>

                        {order.source === 'Customer' && order.paymentStatus !== 'Done' && (
                          <button
                            onClick={() => handleVerifyPayment(order.id)}
                            className="mt-0.5 w-full flex items-center justify-center gap-0.5 text-[8px] font-bold uppercase bg-black hover:bg-gray-800 text-white px-1.5 py-1 rounded"
                          >
                            <FiCheckCircle size={11} /> Verify
                          </button>
                        )}
                      </td>

                      <td className="px-2 py-2 text-right font-bold text-gray-900 text-xs align-top">
                        ₹{Number(order.totalAmount).toFixed(2)}
                        {order.taxAmount > 0 && (
                          <div className="text-[8px] text-gray-400 font-medium mt-0.5">
                            (Tax ₹{Number(order.taxAmount).toFixed(2)})
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center align-top">
                        <div className="flex flex-col gap-1 items-center w-[80px]">
                          <button
                            onClick={() => downloadInvoiceThermal(order)}
                            className="flex items-center gap-0.5 text-[8px] font-bold uppercase bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 px-1.5 py-1 rounded w-full justify-center"
                          >
                            <FiPrinter size={11} /> Thermal
                          </button>
                          <button
                            onClick={() => downloadInvoiceA4(order)}
                            className="flex items-center gap-0.5 text-[8px] font-bold uppercase bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 px-1.5 py-1 rounded w-full justify-center"
                          >
                            <FiDownload size={11} /> A4
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-gray-500 font-bold text-xs bg-gray-50/50 uppercase">
                        <FiList className="mx-auto mb-1.5 text-gray-300" size={22} />
                        No orders found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalOrderPages > 1 && (
              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  onClick={() => setOrderCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={orderCurrentPage === 1}
                  className="p-1.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <FiChevronLeft size={14} />
                </button>
                <div className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-[10px] font-bold text-gray-700 uppercase flex items-center">
                  Page {orderCurrentPage} of {totalOrderPages}
                </div>
                <button
                  onClick={() => setOrderCurrentPage((p) => Math.min(totalOrderPages, p + 1))}
                  disabled={orderCurrentPage === totalOrderPages}
                  className="p-1.5 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ================= EXPENSES VIEW ================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-2">
          {renderDateFilter()}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-1 bg-white border border-gray-200 p-3 rounded-lg shadow-sm h-fit">
              <h3 className="font-bold text-xs mb-2 text-gray-900 flex items-center gap-1 uppercase">
                <FiDollarSign className="text-gray-500" size={13} /> Add Expense
              </h3>
              <form onSubmit={handleSaveExpense} className="space-y-2">
                <div>
                  <label className={labelClass}>What (Item/Name) *</label>
                  <input type="text" value={expenseForm.what} onChange={(e) => setExpenseForm({ ...expenseForm, what: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Reason (Optional)</label>
                  <input type="text" value={expenseForm.reason} onChange={(e) => setExpenseForm({ ...expenseForm, reason: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Amount (₹) *</label>
                  <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className={inputClass} required />
                </div>
                <button type="submit" className="w-full bg-black hover:bg-gray-800 text-white font-bold uppercase py-2 rounded-md text-[10px] transition-all active:scale-95">
                  Save Expense
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Total Filtered Expenses</span>
                <span className="text-lg font-bold text-gray-900 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
                  ₹{totalExpenseAmount.toLocaleString()}
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="px-2.5 py-2 font-bold uppercase text-[8px]">Date/Time</th>
                        <th className="px-2.5 py-2 font-bold uppercase text-[8px]">What</th>
                        <th className="px-2.5 py-2 font-bold uppercase text-[8px]">Reason</th>
                        <th className="px-2.5 py-2 font-bold uppercase text-[8px] text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-gray-50">
                          <td className="px-2.5 py-2 text-[9px] font-medium text-gray-400">{new Date(exp.createdAt).toLocaleString()}</td>
                          <td className="px-2.5 py-2 font-bold text-gray-900">{exp.what}</td>
                          <td className="px-2.5 py-2 font-medium text-gray-600">{exp.reason || '-'}</td>
                          <td className="px-2.5 py-2 text-right font-bold text-red-600 text-[11px]">₹{exp.amount}</td>
                        </tr>
                      ))}
                      {filteredExpenses.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center p-6 text-gray-400 font-bold bg-gray-50/50 uppercase text-[10px]">
                            <FiDollarSign className="mx-auto mb-1.5 text-gray-300" size={20} />
                            No expenses found for this date range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ================= COUPONS VIEW ================= */}
      {activeTab === 'coupons' && hasVerifiedCheckout && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-1 bg-white border border-gray-200 p-3 rounded-lg shadow-sm h-fit">
              <h3 className="font-bold text-xs mb-2 text-gray-900 flex items-center gap-1 uppercase">
                <FiPercent className="text-gray-500" size={13} /> Add Coupon
              </h3>
              <form onSubmit={handleSaveCoupon} className="space-y-2">
                <div>
                  <label className={labelClass}>Coupon Code *</label>
                  <input type="text" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} className={inputClass} placeholder="e.g. FESTIVAL50" required />
                </div>
                <div>
                  <label className={labelClass}>Min Order Amount (₹) *</label>
                  <input type="number" value={couponForm.minOrder} onChange={(e) => setCouponForm({ ...couponForm, minOrder: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Flat Discount (₹) *</label>
                  <input type="number" value={couponForm.discount} onChange={(e) => setCouponForm({ ...couponForm, discount: e.target.value })} className={inputClass} required />
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <label className={labelClass}>Valid From *</label>
                    <input type="date" value={couponForm.validFrom} onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })} className={inputClass} required />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>Valid To *</label>
                    <input type="date" value={couponForm.validTo} onChange={(e) => setCouponForm({ ...couponForm, validTo: e.target.value })} className={inputClass} required />
                  </div>
                </div>
                <button type="submit" className="w-full bg-black hover:bg-gray-800 text-white font-bold uppercase py-2 rounded-md text-[10px] transition-all active:scale-95">
                  Create Coupon
                </button>
              </form>
            </div>

            <div className="md:col-span-2">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="px-2.5 py-2 font-bold uppercase text-[8px]">Code</th>
                        <th className="px-2.5 py-2 font-bold uppercase text-[8px]">Discount</th>
                        <th className="px-2.5 py-2 font-bold uppercase text-[8px]">Min Order</th>
                        <th className="px-2.5 py-2 font-bold uppercase text-[8px]">Valid From - To</th>
                        <th className="px-2.5 py-2 font-bold uppercase text-[8px]">Used By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allCoupons.map((c, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-2.5 py-2 font-bold text-gray-900 text-[11px]">{c.code}</td>
                          <td className="px-2.5 py-2 font-bold text-emerald-600 text-[11px]">₹{c.discount}</td>
                          <td className="px-2.5 py-2 font-medium text-gray-700">₹{c.minOrder}</td>
                          <td className="px-2.5 py-2 text-[9px] font-medium text-gray-500">
                            <span className="bg-white px-1 py-0.5 rounded border border-gray-200">{c.validFrom}</span>
                            <span className="mx-0.5 text-gray-400 text-[7px]">to</span>
                            <span className="bg-white px-1 py-0.5 rounded border border-gray-200">{c.validTo}</span>
                          </td>
                          <td className="px-2.5 py-2 text-[9px] font-bold text-gray-500">
                            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200 uppercase">
                              {c.usedBy ? c.usedBy.length : 0} uses
                            </span>
                          </td>
                        </tr>
                      ))}
                      {allCoupons.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center p-6 text-gray-400 font-bold bg-gray-50/50 uppercase text-[10px]">
                            <FiPercent className="mx-auto mb-1.5 text-gray-300" size={20} />
                            No coupons found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ================= ANALYTICS VIEW ================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-2">
          {renderDateFilter()}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {[
              { label: 'Total Revenue', value: `₹${orderStats.total.toLocaleString()}`, icon: FiDollarSign },
              { label: 'Total Orders', value: filteredOrders.length, icon: FiShoppingCart },
              { label: 'Items Sold', value: filteredOrders.reduce((sum, order) => sum + (order.items || []).reduce((s, item) => s + item.qty, 0), 0), icon: FiBox }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col justify-center items-center text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5 text-gray-900">
                  <stat.icon size={32} />
                </div>
                <span className="text-gray-400 text-[9px] font-bold uppercase tracking-wider mb-0.5 z-10">{stat.label}</span>
                <span className="text-xl font-bold text-gray-900 z-10">{stat.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-bold text-[11px] mb-3 flex items-center gap-1 text-gray-900 uppercase tracking-wider">
              <FiTrendingUp className="text-gray-500" size={13} /> Sales Chart (Filtered)
            </h3>
            <div className="flex items-end h-44 gap-1.5 overflow-x-auto pb-1">
              {Object.entries(analyticsData.dailySales).length > 0 ? (
                Object.entries(analyticsData.dailySales).map(([date, amount], i) => {
                  const maxAmt = Math.max(...Object.values(analyticsData.dailySales));
                  const heightPct = Math.max((amount / maxAmt) * 100, 5);
                  return (
                    <div key={i} className="flex flex-col items-center flex-shrink-0 w-12 group">
                      <div className="text-[8px] text-gray-900 font-bold mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 py-0.5 rounded border border-gray-200">
                        ₹{amount}
                      </div>
                      <div
                        className="w-8 bg-gray-100 hover:bg-gray-800 border border-gray-200 hover:border-gray-900 rounded-t transition-all duration-300 relative overflow-hidden"
                        style={{ height: `${heightPct}%` }}
                      >
                        <div className="absolute inset-x-0 bottom-0 bg-black opacity-10 h-full"></div>
                      </div>
                      <div className="text-[8px] text-gray-400 font-bold mt-1.5 truncate w-full text-center uppercase">
                        {date.substring(0, 5)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full flex items-center justify-center text-gray-400 text-[10px] font-bold uppercase h-full bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <FiActivity className="mr-1" size={14}/> No sales data for selected filter.
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ================= PRODUCT MODAL ================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-2">
          <div className="bg-white border border-gray-200 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="flex justify-between items-center p-2.5 border-b border-gray-100 bg-white shrink-0">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                {editingProductId ? <FiEdit2 className="text-gray-400" size={14} /> : <FiPlus className="text-gray-400" size={14} />}
                {editingProductId ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-black p-1 rounded-full hover:bg-gray-100">
                <FiX size={16} />
              </button>
            </div>

            <div className="p-2.5 overflow-y-auto flex-1">
              <form id="productForm" onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className={labelClass}>
                    Product Images <span className="text-gray-400 font-normal">(Max {MAX_PRODUCT_IMAGES})</span>
                  </label>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files?.length) processImageFiles(e.dataTransfer.files);
                    }}
                    className={`grid grid-cols-2 gap-1.5 p-1.5 rounded-lg border-2 border-dashed transition-all ${
                      isDragging ? 'border-gray-900 bg-gray-100' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {productImagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-gray-200 bg-white group">
                        <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        <button
                          type="button"
                          onClick={() => removeImageAt(idx)}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove image"
                        >
                          <FiX size={11} />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[7px] font-bold text-center py-0.5 uppercase">
                          {idx + 1}
                        </div>
                      </div>
                    ))}

                    {productImagePreviews.length < MAX_PRODUCT_IMAGES && (
                      <label className={`flex flex-col items-center justify-center aspect-square rounded-md border-2 border-dashed cursor-pointer transition-all ${
                        isDragging ? 'border-gray-900 bg-gray-100' : 'border-gray-300 bg-white hover:border-gray-900 hover:bg-gray-50'
                      }`}>
                        <FiPlus size={18} className="text-gray-400 mb-0.5" />
                        <span className="text-[8px] font-bold text-gray-500 uppercase">Add</span>
                        <span className="text-[7px] font-medium text-gray-400 mt-0.5">Max 200KB</span>
                        <input type="file" accept="image/*" multiple onChange={(e) => processImageFiles(e.target.files)} className="hidden" />
                      </label>
                    )}
                  </div>

                  {productImagePreviews.length === 0 && (
                    <p className="mt-1.5 text-[8px] font-medium text-gray-400 text-center uppercase">Drag & drop or click</p>
                  )}

                  {saving && uploadProgress > 0 && (
                    <div className="mt-2 bg-gray-50 p-1.5 rounded border border-gray-200">
                      <div className="flex justify-between text-[8px] font-bold text-gray-500 uppercase mb-0.5">
                        <span>Uploading...</span>
                        <span className="text-gray-900">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-black transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Product Code</label>
                      <input type="text" name="code" value={productForm.code} onChange={handleProductChange} placeholder="e.g. ITEM-123" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Product Name <span className="text-red-500">*</span></label>
                      <input type="text" name="name" value={productForm.name} onChange={handleProductChange} placeholder="e.g. Premium Arabica Coffee" className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>Company Name</label>
                      <input type="text" name="companyName" value={productForm.companyName} onChange={handleProductChange} placeholder="e.g. Acme Corp" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Batch Number</label>
                      <input type="text" name="batch" value={productForm.batch} onChange={handleProductChange} placeholder="e.g. B-2023" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Category <span className="text-red-500">*</span></label>
                      <select
                        name="category"
                        value={productForm.category === 'Other' || !availableCategories.includes(productForm.category) ? 'Other' : productForm.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Other') {
                            setProductForm((prev) => ({ ...prev, category: 'Other', customCategory: '' }));
                          } else {
                            setProductForm((prev) => ({ ...prev, category: val, customCategory: '' }));
                          }
                        }}
                        className={`${inputClass} appearance-none cursor-pointer uppercase font-bold bg-gray-50`}
                      >
                        <option value="" disabled>Select Category</option>
                        {availableCategories.filter((c) => c !== 'Other').map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="Other" className="font-bold text-gray-900">+ Add New Category</option>
                      </select>

                      {(productForm.category === 'Other' || !availableCategories.includes(productForm.category)) && (
                        <div className="mt-1.5 bg-gray-50 p-1.5 rounded border border-gray-200">
                          <label className="block text-[8px] font-bold text-gray-700 mb-0.5 uppercase">Enter New Category *</label>
                          <input
                            type="text"
                            name="customCategory"
                            value={productForm.customCategory}
                            onChange={handleProductChange}
                            placeholder="Type new category..."
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900/20"
                            required
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-1.5 border-b border-gray-200 pb-1.5">
                      <label className="block text-[9px] font-bold text-gray-700 uppercase m-0">
                        Variants, Pricing & Stock <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="text-[8px] font-bold bg-white hover:bg-gray-100 text-gray-900 px-2 py-1 rounded flex items-center gap-0.5 border border-gray-200 uppercase"
                      >
                        <FiPlus size={11} /> Add Variant
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                      {variants.map((v, index) => (
                        <div key={index} className="flex flex-col gap-1.5 bg-white p-2 rounded border border-gray-200 group">
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                            <div className="flex-1 min-w-[90px]">
                              <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0.5 ml-0.5">Size / Type *</label>
                              <input
                                type="text"
                                placeholder="e.g. 500g, XL"
                                value={v.name}
                                onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-[10px] font-bold text-gray-900 focus:outline-none focus:border-gray-900"
                                required
                              />
                            </div>
                            <div className="w-[60px]">
                              <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0.5 ml-0.5">Pur.Price</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={v.purchasePrice}
                                onChange={(e) => handleVariantChange(index, 'purchasePrice', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-[10px] font-bold text-gray-900 focus:outline-none focus:border-gray-900"
                              />
                            </div>
                            <div className="w-[60px]">
                              <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0.5 ml-0.5">MRP (₹) *</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={v.price}
                                onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-[10px] font-bold text-gray-900 focus:outline-none focus:border-gray-900"
                                required
                              />
                            </div>
                            <div className="w-[60px]">
                              <label className="block text-[7px] font-bold text-emerald-600 uppercase mb-0.5 ml-0.5">Offer (₹)</label>
                              <input
                                type="number"
                                placeholder="Opt."
                                value={v.offerPrice}
                                onChange={(e) => handleVariantChange(index, 'offerPrice', e.target.value)}
                                className="w-full bg-emerald-50 border border-emerald-200 rounded px-1.5 py-1 text-[10px] font-bold text-emerald-900 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                            <div className="w-[80px]">
                              <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0.5 ml-0.5">Stock Qty</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={v.stock}
                                onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-[10px] font-bold text-gray-900 focus:outline-none focus:border-gray-900"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0.5 ml-0.5">Expiry Date</label>
                              <input
                                type="date"
                                value={v.expiry}
                                onChange={(e) => handleVariantChange(index, 'expiry', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-[10px] font-bold text-gray-900 focus:outline-none focus:border-gray-900"
                              />
                            </div>
                            
                            {variants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVariant(index)}
                                title="Remove Variant"
                                className="w-7 h-7 mt-[14px] flex items-center justify-center text-red-500 bg-red-50 rounded hover:bg-red-500 hover:text-white shrink-0 self-end border border-red-100"
                              >
                                <FiTrash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Product Description</label>
                    <textarea
                      name="description"
                      value={productForm.description}
                      onChange={handleProductChange}
                      rows="2"
                      placeholder="Brief details about the product..."
                      className={`${inputClass} resize-none bg-white`}
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-2.5 border-t border-gray-100 bg-white flex justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:text-black bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 uppercase"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="productForm"
                disabled={saving}
                className="text-[10px] font-bold py-1.5 px-4 rounded flex items-center gap-1 transition-all disabled:opacity-50 text-white uppercase bg-black hover:bg-gray-800"
              >
                {saving ? (
                  <>
                    <FiLoader className="animate-spin" size={13}/>
                    <span>Saving...</span>
                    {uploadProgress > 0 && <span className="ml-0.5 text-white/70">({uploadProgress}%)</span>}
                  </>
                ) : editingProductId ? (
                  <><FiCheckCircle size={13}/><span>Save Changes</span></>
                ) : (
                  <><FiPlus size={13}/><span>Publish Product</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EXCEL UPLOAD MODAL ================= */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-2">
          <div className="bg-white border border-gray-200 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-white shrink-0">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <FiFile className="text-emerald-500" size={16} /> Bulk Excel Upload
              </h2>
              <button onClick={() => { setIsExcelModalOpen(false); setExcelData([]); }} className="text-gray-400 hover:text-black p-1 rounded-full hover:bg-gray-100">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
              <div 
                className={`w-full flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                  isExcelDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsExcelDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsExcelDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsExcelDragging(false);
                  if (e.dataTransfer.files?.length) {
                    handleExcelFileUpload({ target: { files: [e.dataTransfer.files[0]] } });
                  }
                }}
              >
                <FiUploadCloud size={40} className="text-emerald-500 mb-2" />
                <p className="text-xs font-bold text-gray-700">Drag & Drop your Excel file here</p>
                <p className="text-[10px] text-gray-500 mt-1">Supports .xlsx, .xls, .csv</p>
                <label className="mt-3 bg-emerald-600 text-white text-[10px] font-bold uppercase px-4 py-2 rounded shadow-sm hover:bg-emerald-700 cursor-pointer transition-all">
                  Browse Files
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelFileUpload} className="hidden" />
                </label>
              </div>

              {excelData.length > 0 && (
                <div className="flex flex-col flex-1 min-h-[250px] border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-2 border-b border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700 uppercase">Data Preview ({excelData.length} rows)</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Matches will be updated, new will be added</span>
                  </div>
                  <div className="overflow-auto bg-white">
                    <table className="w-full text-left text-[10px] whitespace-nowrap">
                      <thead className="bg-gray-100 text-gray-500 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                          {excelHeaders.map((h, i) => <th key={i} className="px-3 py-2 font-bold uppercase">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {excelData.slice(0, 50).map((row, rIndex) => (
                          <tr key={rIndex} className="hover:bg-gray-50">
                            {row.map((cell, cIndex) => (
                              <td key={cIndex} className="px-3 py-2 text-gray-700 truncate max-w-[150px]">
                                {cell !== null && cell !== undefined ? cell.toString() : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {excelData.length > 50 && (
                    <div className="p-2 bg-gray-50 text-center text-[10px] text-gray-500 font-bold border-t border-gray-200">
                      Showing first 50 rows
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <div className="flex-1">
                {isUploadingExcel && (
                  <div className="flex flex-col justify-center w-full max-w-[250px]">
                    <div className="flex justify-between text-[10px] font-bold text-emerald-700 mb-1">
                      <span>Importing ({excelProcessedCount}/{excelData.length})...</span>
                      <span>{excelUploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-300 rounded-full" style={{ width: `${excelUploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsExcelModalOpen(false); setExcelData([]); }}
                  className="px-4 py-2 text-[10px] font-bold text-gray-600 hover:text-black bg-white border border-gray-300 rounded hover:bg-gray-100 uppercase"
                  disabled={isUploadingExcel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadExcelToFirebase}
                  disabled={excelData.length === 0 || isUploadingExcel}
                  className="px-6 py-2 text-[10px] font-bold rounded flex items-center gap-1 transition-all disabled:opacity-50 text-white uppercase bg-emerald-600 hover:bg-emerald-700 shadow-md"
                >
                  {isUploadingExcel ? (
                    <><FiLoader className="animate-spin" size={13}/> Processing...</>
                  ) : (
                    <><FiUploadCloud size={13}/> Confirm Import</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;