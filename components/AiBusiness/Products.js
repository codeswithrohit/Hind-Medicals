import React, { useState, useEffect, useMemo } from 'react';
import { firebase } from '../../Firebase/config';
import {
  FiBox, FiPlus, FiEdit2, FiTrash2, FiX,
  FiImage, FiUploadCloud, FiChevronLeft, FiChevronRight,
  FiShoppingCart, FiSearch, FiFilter, FiTrendingUp, FiList,
  FiUser, FiPhone, FiFileText, FiCheckCircle, FiClock, FiActivity, FiCalendar,
  FiTag, FiMonitor, FiSmartphone, FiRefreshCw, FiDollarSign, FiPercent, FiDownload,
  FiPrinter
} from 'react-icons/fi';

const PRODUCTS_PER_PAGE = 15;
const ORDERS_PER_PAGE = 10;

const PREDEFINED_CATEGORIES = ['Other'];

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
  return `CG-${Math.floor(Math.random() * 9000) + 1000}${Date.now().toString().slice(-4)}`;
};

const Products = ({ userData, setUserData, showAlert, onRefresh, hasVerifiedCheckout: hasVerifiedCheckoutProp }) => {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pos');

  // Date & Filter States
  const [dateFilter, setDateFilter] = useState('Today');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Order States
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSourceFilter, setOrderSourceFilter] = useState('All');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [ordersList, setOrdersList] = useState([]); 

  // Product States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(''); // NEW: Prevents spamming DB on every keystroke
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBySales, setSortBySales] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsList, setProductsList] = useState([]); 

  // Modal & Forms
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Cart & Customer State
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

  // Product Form
  const [productForm, setProductForm] = useState({
    name: '',
    brandName: '',
    description: '',
    category: '',
    customCategory: ''
  });
  const [variants, setVariants] = useState([{ name: '', price: '', offerPrice: '' }]);
  const [productImage, setProductImage] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState(null);
  const [oldImageUrl, setOldImageUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Additional Features
  const [expenseForm, setExpenseForm] = useState({ what: '', reason: '', amount: '' });
  const [couponForm, setCouponForm] = useState({
    code: '',
    minOrder: '',
    discount: '',
    validFrom: '',
    validTo: ''
  });

  const inputClass = 'w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all';
  const labelClass = 'block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide';

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

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
          if ((item.type === 'One Time' || new Date() <= expDate) && (!sub.status || sub.status === 'Active')) {
            isActive = true;
          }
        }
      });
    });
    return isActive;
  }, [userData, hasVerifiedCheckoutProp]);

  // ========== DEBOUNCER FOR SEARCH ==========
  // Waits 500ms after the user stops typing before setting the debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ========== USER & ORDERS LISTENER ==========
  useEffect(() => {
    const user = firebase.auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribeUser = firebase.firestore().collection('HareKrishnaPharmacyAdmin').doc(user.uid)
      .onSnapshot((doc) => {
        if (doc.exists) {
          setUserData((prev) => ({ ...prev, ...doc.data() }));
        }
      }, (error) => console.error('Real-time sync error: ', error));

    const unsubscribeOrders = firebase.firestore().collection('HareKrishnaPharmacyOrders')
    .onSnapshot((snapshot) => {
      const ords = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(order => order.source === 'POS' || order.source === 'Customer');
      setOrdersList(ords);
      setLoading(false);
    }, (error) => {
      console.error("Orders sync error: ", error);
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribeOrders();
    };
  }, [setUserData]);

  // ========== OPTIMIZED PRODUCTS LISTENER ==========
  useEffect(() => {
    let queryRef = firebase.firestore().collection('Products');

    // 1. Filter by Category Server-Side
    if (selectedCategory !== 'All') {
      queryRef = queryRef.where('category', '==', selectedCategory);
    }

    // 2. Filter by Search Query Server-Side (Prefix Search)
    // Note: Firestore search is case-sensitive natively.
    if (debouncedSearchQuery.trim().length > 0) {
      const sq = debouncedSearchQuery.trim();
      queryRef = queryRef.where('name', '>=', sq).where('name', '<=', sq + '\uf8ff');
    }

    // 3. Limit to prevent massive downloads of all products at once
    queryRef = queryRef.limit(100);

    const unsubscribeProducts = queryRef.onSnapshot((snapshot) => {
      const prods = snapshot.docs.map(doc => {
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
      setProductsList(prods);
    }, (error) => console.error("Products sync error: ", error));

    return () => unsubscribeProducts();
  }, [selectedCategory, debouncedSearchQuery]);

  useEffect(() => {
    if (activeTab === 'coupons' && !hasVerifiedCheckout) {
      setActiveTab('pos');
    }
  }, [hasVerifiedCheckout, activeTab]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const user = firebase.auth().currentUser;
      if (user) {
        const doc = await firebase.firestore().collection('HareKrishnaPharmacyAdmin').doc(user.uid).get();
        if (doc.exists) setUserData((prev) => ({ ...prev, ...doc.data() }));
      }
      if (typeof onRefresh === 'function') await onRefresh();
    } catch (err) {
      console.error(err);
    }
    setIsRefreshing(false);
    showAlert('success', 'Data refreshed instantly!');
  };

  const allProducts = productsList || [];
  const allOrders = [...ordersList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
    if (dateFilter === 'Monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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
      orders = orders.filter((o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.customerMobile && o.customerMobile.toLowerCase().includes(q))
      );
    }
    if (orderSourceFilter !== 'All') orders = orders.filter((o) => o.source === orderSourceFilter);
    if (orderStatusFilter !== 'All') orders = orders.filter((o) => (o.orderStatus || 'Pending') === orderStatusFilter);
    return orders;
  }, [allOrders, dateFilter, dateRange, orderSearch, orderSourceFilter, orderStatusFilter]);

  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((e) => filterByDate(e.createdAt));
  }, [allExpenses, dateFilter, dateRange]);

  const totalExpenseAmount = filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

  useEffect(() => {
    setOrderCurrentPage(1);
  }, [orderSearch, orderSourceFilter, orderStatusFilter, dateFilter, dateRange]);

  const totalOrderPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((orderCurrentPage - 1) * ORDERS_PER_PAGE, orderCurrentPage * ORDERS_PER_PAGE);

  const orderStats = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
        const amt = Number(order.totalAmount || 0);
        acc.total += amt;
        if (order.paymentMethod === 'Cash') acc.cash += amt;
        else if (order.paymentMethod === 'Online') acc.online += amt;
        else if (order.paymentMethod === 'Due') acc.due += amt;
        return acc;
      }, { total: 0, cash: 0, online: 0, due: 0 });
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

        const vName = item.variant?.name || 'Standard';
        if (!stats[pid].variants[vName]) stats[pid].variants[vName] = { qty: 0, amount: 0 };
        stats[pid].variants[vName].qty += item.qty;
        stats[pid].variants[vName].amount += item.qty * Number(item.price);
      });
    });
    return stats;
  }, [filteredOrders]);

  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];
    
    // Fallback Client-side filtering just in case to ensure UI is perfectly synced
    if (selectedCategory !== 'All') filtered = filtered.filter((p) => p.category === selectedCategory);
    if (searchQuery) filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

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
  }, [allProducts, selectedCategory, searchQuery, sortBySales, productSalesMap]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

  const analyticsData = useMemo(() => {
    const dailySales = {};
    filteredOrders.forEach((order) => {
      const dateStr = new Date(order.createdAt).toLocaleDateString();
      if (!dailySales[dateStr]) dailySales[dateStr] = 0;
      dailySales[dateStr] += Number(order.totalAmount || 0);
    });
    return { dailySales };
  }, [filteredOrders]);

  const availableCategories = useMemo(() => {
    // If the database has massive categories we could fetch them differently, 
    // but relying on local + predefined is safest for dynamic category creation.
    const fromProducts = allProducts.map((p) => p.category).filter(Boolean);
    return [...new Set([...PREDEFINED_CATEGORIES, ...fromProducts])].sort();
  }, [allProducts]);

  // ========== A4 INVOICE PRINTING ==========
  const downloadInvoiceA4 = (order) => {
    const bName = userData?.businessName || 'Your Business';
    const bPhone = userData?.verifiedMobile || userData?.mobileNumber || '';
    const bAddress = userData?.businessAddress || '';
    const bEmail = userData?.email || '';
    const dateStr = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const itemsHtml = (order.items || []).map((it) => `
      <tr>
        <td>
          <strong>${it.product?.name || 'Item'}</strong><br/>
          <span style="font-size:12px;color:#64748b;">${it.variant?.name || ''}</span>
        </td>
        <td class="text-right">${it.qty}</td>
        <td class="text-right">₹${Number(it.price).toFixed(2)}</td>
        <td class="text-right">₹${(it.qty * Number(it.price)).toFixed(2)}</td>
      </tr>
    `).join('');

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
        <p style="margin-top:8px;"><span class="status-badge">${order.orderStatus || 'Pending'}</span></p>
      </div>
    </div>
    <div class="parties">
      <div class="party">
        <h3>Billed To</h3>
        <p>${order.customerName || '—'}</p>
        <p>+91 ${order.customerMobile || ''}</p>
        ${order.address ? `<p>${order.address}</p>` : ''}
        ${order.remarks ? `<p style="color:#64748b;font-size:12px;">Remarks: ${order.remarks}</p>` : ''}
      </div>
      <div class="party">
        <h3>Payment Details</h3>
        <p>Method: <strong>${order.paymentMethod || 'Cash'}</strong></p>
        <p>Status: <strong>${order.paymentStatus || 'Pending'}</strong></p>
        <p>Source: <strong>${order.source || 'POS'}</strong></p>
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
        ${order.discountAmount ? `
        <tr>
          <td colspan="3" class="text-right" style="font-weight:500;">Discount (${order.couponApplied || ''})</td>
          <td class="text-right">-₹${Number(order.discountAmount).toFixed(2)}</td>
        </tr>` : ''}
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
      a.download = `Invoice_A4_${order.id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ========== THERMAL INVOICE PRINTING (58mm / 80mm) ==========
  const downloadInvoiceThermal = (order) => {
    const bName = userData?.businessName || 'Your Business';
    const bPhone = userData?.verifiedMobile || userData?.mobileNumber || '';
    const bAddress = userData?.businessAddress || '';
    const dateStr = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const itemsRows = (order.items || []).map((it) => {
      const name = (it.product?.name || 'Item') + (it.variant?.name ? ` (${it.variant.name})` : '');
      const lineTotal = (it.qty * Number(it.price)).toFixed(2);
      return `
        <tr><td style="text-align:left;padding:2px 0;font-size:11px;">${name}</td></tr>
        <tr><td style="text-align:left;padding:0 0 4px 0;font-size:10px;color:#444;">${it.qty} x ₹${Number(it.price).toFixed(2)} = ₹${lineTotal}</td></tr>`;
    }).join('');

    const subtotal = (order.totalAmount || 0) + (order.discountAmount || 0);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${order.id}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 4mm 3mm;
      background: #fff;
      color: #000;
      font-size: 12px;
      line-height: 1.25;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .small { font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    .total-row { font-size: 14px; font-weight: bold; }
    @media print {
      body { width: 80mm; margin: 0; padding: 2mm; }
      @page { size: 80mm auto; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:14px;margin-bottom:2px;">${bName}</div>
  ${bAddress ? `<div class="center small">${bAddress}</div>` : ''}
  ${bPhone ? `<div class="center small">+91 ${bPhone}</div>` : ''}
  <div class="divider"></div>
  <div class="center bold" style="font-size:13px;">TAX INVOICE / RECEIPT</div>
  <div class="small" style="margin-top:4px;">
    <div>Inv: ${order.id}</div>
    <div>Date: ${dateStr}</div>
    <div>Status: ${order.orderStatus || 'Pending'}</div>
  </div>
  <div class="divider"></div>
  <div class="small">
    <div><span class="bold">Customer:</span> ${order.customerName || 'Walk-in'}</div>
    <div><span class="bold">Mobile:</span> ${order.customerMobile || '—'}</div>
    ${order.remarks ? `<div><span class="bold">Note:</span> ${order.remarks}</div>` : ''}
  </div>
  <div class="divider"></div>
  <table>
    ${itemsRows}
  </table>
  <div class="divider"></div>
  <table>
    <tr>
      <td style="text-align:left;">Subtotal</td>
      <td style="text-align:right;">₹${subtotal.toFixed(2)}</td>
    </tr>
    ${order.discountAmount ? `
      <tr>
        <td style="text-align:left;">Discount ${order.couponApplied ? `(${order.couponApplied})` : ''}</td>
        <td style="text-align:right;">-₹${Number(order.discountAmount).toFixed(2)}</td>
      </tr>` : ''}
    <tr class="total-row">
      <td style="text-align:left;padding-top:4px;">TOTAL</td>
      <td style="text-align:right;padding-top:4px;">₹${Number(order.totalAmount).toFixed(2)}</td>
    </tr>
  </table>
  <div class="divider"></div>
  <div class="small">
    <div>Payment: <span class="bold">${order.paymentMethod || 'Cash'}</span></div>
    <div>Pay Status: <span class="bold">${order.paymentStatus || 'Pending'}</span></div>
    <div>Source: ${order.source || 'POS'}</div>
  </div>
  <div class="divider"></div>
  <div class="center small" style="margin-top:6px;">
    Thank you for your order!<br/>
    ${bName}
  </div>
  <script>
    window.onload = () => { setTimeout(() => { window.print(); }, 300); }
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
      a.download = `Receipt_Thermal_${order.id}.html`;
      a.click();
      URL.revokeObjectURL(url);
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

  // ========== DIRECT GLOBAL ORDER HANDLERS ==========
  const handleUpdatePayment = async (orderId, newMethod) => {
    try {
      const order = allOrders.find((o) => o.id === orderId);
      if (!order || order.paymentMethod === newMethod) return;

      const changeLog = { from: order.paymentMethod, to: newMethod, changedAt: new Date().toISOString() };
      const newPaymentHistory = [...(order.paymentHistory || []), changeLog];

      let newPaymentStatus = order.paymentStatus;
      if (order.source !== 'Customer') {
        newPaymentStatus = newMethod === 'Due' ? 'Pending' : 'Done';
      }

      await firebase.firestore().collection('HareKrishnaPharmacyOrders').doc(orderId).update({
        paymentMethod: newMethod,
        paymentStatus: newPaymentStatus,
        paymentHistory: newPaymentHistory
      });
      showAlert('success', 'Payment method updated!');
    } catch (err) {
      showAlert('error', 'Failed to update payment method');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      let reason = '';
      if (newStatus === 'Cancel / Reject') {
        reason = prompt('Please enter a reason for cancellation:');
        if (reason === null) return;
      }

      const order = allOrders.find((o) => o.id === orderId);
      if (!order) return;

      const statusLog = { status: newStatus, date: new Date().toISOString(), reason: reason };
      const newStatusHistory = [...(order.statusHistory || []), statusLog];

      await firebase.firestore().collection('HareKrishnaPharmacyOrders').doc(orderId).update({
        orderStatus: newStatus,
        statusHistory: newStatusHistory
      });
      showAlert('success', `Order marked as ${newStatus}`);
    } catch (err) {
      showAlert('error', 'Failed to update order status');
    }
  };

  const handleVerifyPayment = async (orderId) => {
    try {
      const order = allOrders.find((o) => o.id === orderId);
      if (!order) return;

      if (order.paymentStatus === 'Done') {
        showAlert('info', 'Already verified');
        return;
      }

      const changeLog = { from: order.paymentStatus || 'Pending', to: 'Done', changedAt: new Date().toISOString(), action: 'Verified' };
      const newPaymentHistory = [...(order.paymentHistory || []), changeLog];

      await firebase.firestore().collection('HareKrishnaPharmacyOrders').doc(orderId).update({
        paymentStatus: 'Done',
        paymentHistory: newPaymentHistory,
        verifiedAt: new Date().toISOString()
      });
      showAlert('success', 'Payment verified & marked as Done!');
    } catch (err) {
      showAlert('error', 'Failed to verify payment');
    }
  };

  // ========== DIRECT GLOBAL PRODUCT HANDLERS ==========
  const handleProductChange = (e) => setProductForm({ ...productForm, [e.target.name]: e.target.value });
  const handleVariantChange = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };
  const addVariant = () => setVariants([...variants, { name: '', price: '', offerPrice: '' }]);
  const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index));

  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return showAlert('error', 'Please select a valid image file');
    if (file.size > 200 * 1024) return showAlert('error', 'Image size must be under 200KB');

    if (productImagePreview && productImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(productImagePreview);
    }
    setProductImage(file);
    setProductImagePreview(URL.createObjectURL(file));
  };

  const openAddProductModal = () => {
    setProductForm({ name: '', brandName: '', description: '', category: '', customCategory: '' });
    setVariants([{ name: 'Standard', price: '', offerPrice: '' }]);
    setProductImage(null);
    setProductImagePreview(null);
    setOldImageUrl(null);
    setEditingProductId(null);
    setUploadProgress(0);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product) => {
    const isKnown = availableCategories.includes(product.category) && product.category !== 'Other';
    setProductForm({
      name: product.name || '',
      brandName: product.brandName || product.companyName || '',
      description: product.description || product.details || '', 
      category: isKnown ? product.category : 'Other',
      customCategory: isKnown ? '' : (product.category || '')
    });
    setVariants(product.variants?.length ? product.variants : [{ name: 'Standard', price: product.price || '', offerPrice: product.offerPrice || '' }]);
    setProductImagePreview(product.imageUrl || null);
    setProductImage(null);
    setOldImageUrl(product.imageUrl || null);
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

  const uploadImageWithProgress = (file, userId) => {
    return new Promise((resolve, reject) => {
      const fileName = `Products/${userId}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const fileRef = firebase.storage().ref().child(fileName);
      const uploadTask = fileRef.put(file);

      uploadTask.on(
        'state_changed',
        (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        (error) => { console.error('Upload error:', error); reject(error); },
        async () => {
          try {
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
            setUploadProgress(100);
            resolve(downloadURL);
          } catch (err) { reject(err); }
        }
      );
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name) return showAlert('error', 'Name is required.');
    if (variants.some((v) => !v.price || !v.name)) return showAlert('error', 'All variants must have a name and price.');

    let finalCategory = productForm.category === 'Other' ? productForm.customCategory.trim() : productForm.category;
    if (!finalCategory) return showAlert('error', 'Please specify a category.');

    setSaving(true);
    setUploadProgress(0);

    try {
      const user = firebase.auth().currentUser;
      if (!user) throw new Error('Not authenticated');

      let imageUrl = productImagePreview;
      if (productImage) {
        imageUrl = await uploadImageWithProgress(productImage, user.uid);
        if (editingProductId && oldImageUrl && oldImageUrl !== imageUrl) {
          await deleteOldStorageImage(oldImageUrl);
        }
      }

      const formattedVariants = variants.map(v => ({
         name: v.name,
         price: Number(v.price),
         offerPrice: v.offerPrice ? Number(v.offerPrice) : ''
      }));

      const customerPriceDetails = formattedVariants.map(v => ({
         price: String(v.price),
         discountPrice: String(v.offerPrice || ''),
         images: imageUrl ? [imageUrl] : [],
         variantName: v.name
      }));

      const productData = {
        name: productForm.name,
        brandName: productForm.brandName, 
        description: productForm.description,
        details: productForm.description, 
        category: finalCategory,
        categoryName: finalCategory, 
        Active: "True", 
        View: "True",   
        imageUrl: imageUrl || '',
        variants: formattedVariants, 
        priceDetails: customerPriceDetails, 
        price: formattedVariants[0].price, 
        offerPrice: formattedVariants[0].offerPrice || '', 
      };

      if (editingProductId) {
        await firebase.firestore().collection('Products').doc(editingProductId).update({
          ...productData,
          updatedAt: new Date().toISOString()
        });
      } else {
        const newId = Date.now().toString();
        await firebase.firestore().collection('Products').doc(newId).set({
          id: newId,
          ...productData,
          totalSaleQty: 0,
          totalSaleAmount: 0,
          variantSales: {},
          createdAt: new Date().toISOString()
        });
      }

      setIsProductModalOpen(false);
      showAlert('success', editingProductId ? 'Product updated successfully!' : 'Product added successfully!');
    } catch (err) {
      console.error(err);
      showAlert('error', err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
      setUploadProgress(0);
      if (productImagePreview && productImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(productImagePreview);
      }
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      const productToDelete = allProducts.find((p) => p.id === productId);
      await firebase.firestore().collection('Products').doc(productId).delete();

      if (productToDelete?.imageUrl) deleteOldStorageImage(productToDelete.imageUrl);
      showAlert('success', 'Product deleted instantly.');
    } catch (err) {
      showAlert('error', err.message);
    }
  };

  // ========== POS CART HANDLERS ==========
  const addToCart = (product, variant) => {
    setCart((prev) => {
      const vName = variant?.name || 'Standard';
      const existing = prev.find((item) => item.product.id === product.id && item.variant.name === vName);
      if (existing) return prev.map((item) => item === existing ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product, variant: { ...variant, name: vName }, qty: 1, price: variant.offerPrice || variant.price }];
    });
  };

  const updateCartQty = (index, delta) => {
    setCart((prev) => {
      const newCart = [...prev];
      newCart[index].qty += delta;
      if (newCart[index].qty <= 0) newCart.splice(index, 1);
      return newCart;
    });
  };

  const cartTotalBeforeDiscount = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const cartTotal = appliedCoupon ? Math.max(0, cartTotalBeforeDiscount - Number(appliedCoupon.discount)) : cartTotalBeforeDiscount;

  const handleApplyCoupon = () => {
    if (!hasVerifiedCheckout) return showAlert('error', 'Coupon facility requires Verified Checkout plan (₹499/mo).');
    if (!couponInput) return showAlert('error', 'Enter a coupon code');

    const coupon = allCoupons.find((c) => c.code.toUpperCase() === couponInput.toUpperCase());
    if (!coupon) return showAlert('error', 'Invalid coupon code');

    const now = new Date();
    if (new Date(coupon.validFrom) > now || new Date(coupon.validTo) < now) return showAlert('error', 'Coupon expired or not active');
    if (cartTotalBeforeDiscount < Number(coupon.minOrder)) return showAlert('error', `Minimum order amount is ₹${coupon.minOrder}`);
    if (customerInfo.mobile && coupon.usedBy && coupon.usedBy.includes(customerInfo.mobile)) return showAlert('error', 'Coupon already used on this number');

    setAppliedCoupon(coupon);
    showAlert('success', 'Coupon applied successfully!');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return showAlert('error', 'Cart is empty');
    if (appliedCoupon && !customerInfo.mobile) {
      return showAlert('error', 'Mobile number is required to use a coupon.');
    }
  
    setIsSubmittingOrder(true);
  
    try {
      const user = firebase.auth().currentUser;
  
      // ========== CLEAN ITEMS ==========
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
        customerName: customerInfo.name || 'Walk-in Customer',
        customerMobile: customerInfo.mobile || 'N/A',
        remarks: customerInfo.remarks || '',
        paymentMethod: customerInfo.paymentMethod || 'Online',
        orderStatus: 'Delivered',
        statusHistory: [
          {
            status: 'Delivered',
            date: new Date().toISOString(),
            reason: 'POS direct delivery'
          }
        ],
        source: 'POS',
        items: cleanItems,
        totalAmount: Number(cartTotal) || 0,
        couponApplied:
          appliedCoupon && hasVerifiedCheckout && appliedCoupon.code
            ? appliedCoupon.code
            : null,
        discountAmount:
          appliedCoupon && hasVerifiedCheckout
            ? Number(appliedCoupon.discount) || 0
            : 0,
        createdAt: new Date().toISOString(),
        paymentHistory: []
      };
  
      // ========== CASH or DUE ==========
      if (customerInfo.paymentMethod === 'Cash' || customerInfo.paymentMethod === 'Due') {
        const paymentStatus = customerInfo.paymentMethod === 'Due' ? 'Pending' : 'Done';
        const finalOrder = { ...baseOrder, paymentStatus };
  
        await savePosOrder(finalOrder);
        finishPosOrder(finalOrder);
        return;
      }
  
      // ========== ONLINE ==========
      if (customerInfo.paymentMethod === 'Online') {
        if (!window.Razorpay) {
          showAlert('error', 'Payment system not loaded. Please refresh.');
          setIsSubmittingOrder(false);
          return;
        }
  
        const options = {
          key: 'rzp_live_RlYfjfDJZpnQ2q', 
          amount: Math.round(cartTotal * 100), 
          currency: 'INR',
          name: userData?.businessName || 'Pharmacy',
          description: `POS Order #${orderId}`,
          image: userData?.logoUrl || '',
          handler: async function (response) {
            const paidOrder = {
              ...baseOrder,
              paymentStatus: 'Done',
              razorpay_payment_id: response.razorpay_payment_id || null,
              razorpay_order_id: response.razorpay_order_id || null,
              razorpay_signature: response.razorpay_signature || null,
              paidAt: new Date().toISOString()
            };
  
            await savePosOrder(paidOrder);
            finishPosOrder(paidOrder);
          },
          prefill: {
            name: customerInfo.name || '',
            contact: customerInfo.mobile || '',
            email: ''
          },
          notes: {
            order_id: orderId,
            source: 'POS'
          },
          theme: {
            color: '#4F46E5'
          },
          modal: {
            ondismiss: function () {
              showAlert('error', 'Payment cancelled by customer');
              setIsSubmittingOrder(false);
            }
          }
        };
  
        const rzp = new window.Razorpay(options);
        rzp.open(); 
      }
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to submit order');
      setIsSubmittingOrder(false);
    }
  };
  
  const savePosOrder = async (order) => {
    const safeOrder = JSON.parse(JSON.stringify(order));
  
    const batch = firebase.firestore().batch();
  
    const orderRef = firebase.firestore().collection('HareKrishnaPharmacyOrders').doc(safeOrder.id);
    batch.set(orderRef, safeOrder);
  
    cart.forEach((cartItem) => {
      const prod = allProducts.find((p) => p.id === cartItem.product?.id);
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
  
    if (appliedCoupon && hasVerifiedCheckout && customerInfo.mobile) {
      const updatedCoupons = allCoupons.map((c) => {
        if (c.code === appliedCoupon.code) {
          return {
            ...c,
            usedBy: [...(c.usedBy || []), customerInfo.mobile]
          };
        }
        return c;
      });
      const user = firebase.auth().currentUser;
      const userRef = firebase.firestore().collection('HareKrishnaPharmacyAdmin').doc(user.uid);
      batch.update(userRef, { coupons: updatedCoupons });
    }
  
    await batch.commit();
  };
  
  const finishPosOrder = (order) => {
    setCart([]);
    setCustomerInfo({ name: '', mobile: '', remarks: '', paymentMethod: 'Online' });
    setAppliedCoupon(null);
    setCouponInput('');
    setIsSubmittingOrder(false);
  
    showAlert('success', 'Order submitted successfully!');
    printInvoiceByPreference(order);
  };

  // ========== EXPENSES ==========
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.what || !expenseForm.amount) return showAlert('error', 'Required fields missing');

    try {
      const user = firebase.auth().currentUser;
      const newExpense = {
        id: Date.now().toString(),
        what: expenseForm.what,
        reason: expenseForm.reason,
        amount: expenseForm.amount,
        createdAt: new Date().toISOString()
      };

      const updatedExpenses = [...allExpenses, newExpense];
      await firebase.firestore().collection('HareKrishnaPharmacyAdmin').doc(user.uid).update({ expenses: updatedExpenses });

      setExpenseForm({ what: '', reason: '', amount: '' });
      showAlert('success', 'Expense recorded!');
    } catch (err) {
      showAlert('error', 'Failed to save expense');
    }
  };

  // ========== COUPONS ==========
  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!hasVerifiedCheckout) return showAlert('error', 'Coupon facility requires Verified Checkout plan (₹499/mo). Upgrade in Our Plans.');
    if (!couponForm.code || !couponForm.minOrder || !couponForm.discount || !couponForm.validFrom || !couponForm.validTo) {
      return showAlert('error', 'Fill all coupon fields');
    }

    try {
      const user = firebase.auth().currentUser;
      const newCoupon = {
        ...couponForm,
        code: couponForm.code.toUpperCase(),
        usedBy: [],
        createdAt: new Date().toISOString()
      };

      const updatedCoupons = [...allCoupons, newCoupon];
      await firebase.firestore().collection('HareKrishnaPharmacyAdmin').doc(user.uid).update({ coupons: updatedCoupons });

      setCouponForm({ code: '', minOrder: '', discount: '', validFrom: '', validTo: '' });
      showAlert('success', 'Coupon added!');
    } catch (err) {
      showAlert('error', 'Failed to save coupon');
    }
  };

  const renderDateFilter = () => (
    <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 bg-[#0B1221] border border-slate-800 p-2.5 rounded-lg mb-4 w-full min-w-0">
      <div className="w-full lg:w-auto min-w-0">
        <div className="flex items-center bg-slate-900 rounded-md p-1 border border-slate-700/50 w-full lg:w-fit overflow-x-auto custom-scrollbar">
          {['Today', 'Weekly', 'Monthly', 'Yearly', 'Total', 'Custom'].map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`flex-shrink-0 min-h-[34px] px-3 sm:px-3.5 py-1.5 text-[10px] sm:text-[11px] font-bold rounded whitespace-nowrap transition-all duration-200 ${
                dateFilter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {dateFilter === 'Custom' && (
        <div className="w-full lg:w-auto min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="w-full sm:w-auto min-h-[34px] bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-[10px] sm:text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
            <span className="hidden sm:block text-slate-500 text-[10px] font-semibold px-0.5">to</span>
            <span className="sm:hidden text-slate-500 text-[10px] font-semibold text-center">TO</span>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="w-full sm:w-auto min-h-[34px] bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-[10px] sm:text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-slate-800 rounded-lg w-full"></div>
        <div className="flex gap-4">
          <div className="w-3/4 grid grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-800 rounded-lg"></div>
            ))}
          </div>
          <div className="w-1/4 h-[70vh] bg-slate-800 rounded-lg"></div>
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
    <div className="animate-fade-in-up text-white min-h-[80vh] space-y-4">
      {/* Top Navigation */}
      <div className="w-full min-w-0 rounded-xl border border-slate-800 bg-[#0B1221] shadow-lg p-2.5">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full min-w-0 items-stretch gap-2 lg:w-auto lg:flex-1 lg:items-center">
            <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-1">
              <div className="flex w-full items-center gap-1 overflow-x-auto custom-scrollbar">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex min-h-[40px] flex-shrink-0 items-center justify-center gap-1.5 rounded-md px-3 sm:px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                      activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white active:bg-slate-700'
                    }`}
                  >
                    <tab.icon size={15} className="flex-shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center self-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 shadow-sm transition-all duration-200 hover:border-indigo-500 hover:bg-indigo-600/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              title="Refresh Data"
            >
              <FiRefreshCw size={18} className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
            </button>
          </div>
          {activeTab === 'products' && (
            <div className="w-full flex-shrink-0 lg:w-auto">
              <button
                onClick={openAddProductModal}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-emerald-500 active:scale-[0.98] active:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:w-auto"
              >
                <FiPlus size={17} className="flex-shrink-0" />
                <span>Add Product</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* POS VIEW */}
      {activeTab === 'pos' && (
        <div className="w-full min-w-0">
          <div className="flex w-full min-w-0 flex-col gap-4 xl:flex-row xl:items-start">
            
            {/* Catalog */}
            <div className="w-full min-w-0 space-y-4 xl:w-[68%] xl:flex-1">
              <div className="w-full min-w-0 rounded-xl border border-slate-800 bg-[#0B1221] p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">Categories</h3>
                  <span className="shrink-0 text-[10px] text-slate-500">Swipe to explore</span>
                </div>
                <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  <button onClick={() => setSelectedCategory('All')} className={`min-h-[38px] shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${selectedCategory === 'All' ? 'border-indigo-500 bg-indigo-600 text-white shadow-md' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                    All Categories
                  </button>
                  {availableCategories.map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`min-h-[38px] shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${selectedCategory === cat ? 'border-indigo-500 bg-indigo-600 text-white shadow-md' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-800 bg-[#0B1221] p-0">
                <div className="relative min-w-0 flex-1">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="min-h-[42px] w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
                </div>
              </div>

              <div className="grid w-full min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
                {paginatedProducts.map((product) => (
                  <div key={product.id} className="flex min-w-0 flex-col rounded-xl border border-slate-800 bg-[#0B1221] p-2.5 shadow-sm transition-colors hover:border-indigo-500/60 sm:p-3">
                    <div className="mb-2 min-w-0 border-b border-slate-800 pb-2">
                      <h4 className="truncate text-xs font-bold leading-5 text-white sm:text-sm" title={product.name}>{product.name}</h4>
                      <p className="mt-0.5 truncate text-[10px] text-slate-400 sm:text-xs" title={product.category}>{product.category}</p>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {(product.variants && product.variants.length > 0 ? product.variants : [{ name: 'Standard', price: product.price, offerPrice: product.offerPrice }]).map((v, i) => (
                        <button key={i} type="button" onClick={() => addToCart(product, v)} className="group flex min-h-[58px] min-w-0 flex-col justify-center rounded-lg border border-slate-700/70 bg-slate-900 p-2 text-left transition-all hover:border-indigo-500 hover:bg-indigo-500/10 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                          <div className="flex min-w-0 items-center justify-between gap-1.5">
                            <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-300 sm:text-xs" title={v.name}>{v.name}</span>
                            <FiPlus size={14} className="shrink-0 text-slate-500 transition-colors group-hover:text-indigo-400" />
                          </div>
                          <span className="mt-1 break-words text-xs font-black text-emerald-400 sm:text-sm">₹{v.offerPrice || v.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {paginatedProducts.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 bg-[#0B1221] px-4 py-10 text-center">
                  <FiSearch className="mx-auto mb-3 text-slate-500" size={26} />
                  <p className="text-sm font-semibold text-white">No products found</p>
                  <p className="mt-1 text-xs text-slate-400">Try another search or select a different category.</p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-slate-800 bg-[#0B1221] p-3">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-indigo-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><FiChevronLeft size={18} /></button>
                  <span className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-indigo-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><FiChevronRight size={18} /></button>
                </div>
              )}
            </div>

            {/* Current Order Cart */}
            <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0B1221] shadow-xl xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:w-[32%] xl:shrink-0">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/60 p-3 sm:p-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400"><FiShoppingCart size={18} /></div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white sm:text-base">Current Order</h3>
                    <p className="text-[10px] text-slate-400">{cart.length} {cart.length === 1 ? 'item' : 'items'} in cart</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-black text-emerald-400">₹{cartTotal}</span>
              </div>

              <div className="min-h-[100px] space-y-2 p-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="flex min-h-[130px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-slate-500"><FiShoppingCart size={22} /></div>
                    <p className="text-sm font-bold text-slate-300">Cart is empty</p>
                    <p className="mt-1 text-xs text-slate-500">Select a product to add it to your order.</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={index} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white sm:text-sm" title={item.product.name}>{item.product.name}</p>
                        <p className="mt-1 truncate text-[10px] text-slate-400 sm:text-xs" title={`${item.variant.name} - ₹${item.price}`}>{item.variant.name} · ₹{item.price}</p>
                        <p className="mt-1 text-xs font-bold text-emerald-400">₹{item.price * item.qty}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-800 bg-black/30 p-1">
                        <button type="button" onClick={() => updateCartQty(index, -1)} className="flex h-8 w-8 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-slate-800 hover:text-red-300"><FiX size={14} /></button>
                        <span className="min-w-[20px] text-center text-xs font-black text-white">{item.qty}</span>
                        <button type="button" onClick={() => updateCartQty(index, 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-emerald-400 transition-colors hover:bg-slate-800 hover:text-emerald-300"><FiPlus size={14} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="shrink-0 space-y-3 border-t border-slate-800 bg-slate-900/30 p-3 sm:p-4">
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <input type="text" placeholder="Customer Name (Optional)" value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} className={`${inputClass} min-w-0 w-full`} />
                  <input type="tel" inputMode="tel" placeholder="Mobile No. (Optional)" value={customerInfo.mobile} onChange={(e) => setCustomerInfo({ ...customerInfo, mobile: e.target.value })} className={`${inputClass} min-w-0 w-full`} />
                  <input type="text" placeholder="Remarks (Optional)" value={customerInfo.remarks} onChange={(e) => setCustomerInfo({ ...customerInfo, remarks: e.target.value })} className={`${inputClass} min-w-0 w-full sm:col-span-2 xl:col-span-1`} />
                </div>

                {hasVerifiedCheckout && (
                  <div className="space-y-2">
                    <div className="flex min-w-0 gap-2">
                      <input type="text" placeholder="Coupon Code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className={`${inputClass} min-w-0 flex-1`} />
                      <button type="button" onClick={handleApplyCoupon} className="min-h-[40px] shrink-0 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white transition-colors hover:bg-indigo-500">Apply</button>
                    </div>
                    {appliedCoupon && (
                      <p className="break-words text-[11px] font-bold text-emerald-400">Coupon {appliedCoupon.code} applied! (-₹{appliedCoupon.discount})</p>
                    )}
                  </div>
                )}

                <div>
                  <p className="mb-2 text-[11px] font-bold text-slate-400">Payment Method</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['Online', 'Cash', 'Due'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setCustomerInfo({ ...customerInfo, paymentMethod: method })}
                        className={`min-h-[40px] rounded-lg border px-2 py-2 text-xs font-bold transition-all ${customerInfo.paymentMethod === method ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white'}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
                  <div>
                    <p className="text-xs font-bold text-slate-400">Order Total</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
                  </div>
                  <span className="break-all text-xl font-black text-emerald-400">₹{cartTotal}</span>
                </div>

                <button type="button" onClick={handleCheckout} disabled={cart.length === 0 || isSubmittingOrder} className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-md transition-all hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">
                  {isSubmittingOrder ? 'Processing...' : <><FiCheckCircle size={17} /><span>Submit Order (POS)</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS VIEW */}
      {activeTab === 'products' && (
        <div>
          {renderDateFilter()}
          <div className="flex flex-wrap gap-2 bg-[#0B1221] p-2.5 rounded-lg border border-slate-800 items-center mb-4">
            <div className="flex-1 min-w-[150px] relative">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-slate-900 h-8 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 max-w-[140px]">
              <option value="All">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button onClick={() => setSortBySales(!sortBySales)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold transition-all ${sortBySales ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}>
              <FiTrendingUp size={12} /> Sort by Sales
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProducts.map((product) => {
              const pStats = productSalesMap[product.id] || { qty: 0, amount: 0, variants: {} };
              const renderVariants = product.variants && product.variants.length > 0 ? product.variants : [{ name: 'Standard', price: product.price, offerPrice: product.offerPrice }];

              return (
                <div key={product.id} className="bg-[#0B1221] border border-slate-800 rounded-lg overflow-hidden shadow-md flex flex-row h-[160px]">
                  <div className="relative h-full w-[120px] shrink-0 bg-slate-900">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
                      <button onClick={() => openEditProductModal(product)} className="p-1.5 bg-slate-900/90 text-white rounded hover:bg-indigo-500 shadow-sm" title="Edit"><FiEdit2 size={12} /></button>
                      <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 bg-red-500/90 text-white rounded hover:bg-red-600 shadow-sm" title="Delete"><FiTrash2 size={12} /></button>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-sm p-1.5 text-center border-t border-slate-700">
                      <div className="text-[10px] font-bold text-amber-400">Sold: {pStats.qty}</div>
                      <div className="text-[10px] font-black text-emerald-400">₹{pStats.amount.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="p-2 flex-1 flex flex-col overflow-hidden">
                    <div className="mb-1.5 shrink-0">
                      <h4 className="text-[11px] font-bold text-white truncate" title={product.name}>{product.name}</h4>
                      <p className="text-[9px] text-slate-400 truncate">{product.category}</p>
                    </div>
                    <div className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
                      {renderVariants.map((v, i) => {
                        const vStats = pStats.variants[v.name || 'Standard'] || { qty: 0, amount: 0 };
                        return (
                          <div key={i} className="flex flex-col bg-slate-900 rounded p-1.5 border border-slate-700/50">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1">
                              <span className="text-[9px] font-bold text-slate-300 truncate max-w-[60%]" title={v.name}>{v.name}</span>
                              <span className="text-[9px] font-black text-emerald-400">₹{v.offerPrice || v.price}</span>
                            </div>
                            <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold">
                              <span>Qty: <span className="text-amber-400">{vStats.qty}</span></span>
                              <span>Total: <span className="text-emerald-400">₹{vStats.amount}</span></span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ORDERS VIEW */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {renderDateFilter()}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#0B1221] border border-slate-800 p-3 rounded-lg shadow-sm text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Revenue</span>
              <span className="text-xl font-black text-emerald-400">₹{orderStats.total.toLocaleString()}</span>
            </div>
            <div className="bg-[#0B1221] border border-slate-800 p-3 rounded-lg shadow-sm text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Cash</span>
              <span className="text-xl font-black text-orange-400">₹{orderStats.cash.toLocaleString()}</span>
            </div>
            <div className="bg-[#0B1221] border border-slate-800 p-3 rounded-lg shadow-sm text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Online</span>
              <span className="text-xl font-black text-blue-400">₹{orderStats.online.toLocaleString()}</span>
            </div>
            <div className="bg-[#0B1221] border border-slate-800 p-3 rounded-lg shadow-sm text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Due</span>
              <span className="text-xl font-black text-red-400">₹{orderStats.due.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-[#0B1221] border border-slate-800 rounded-xl shadow-lg p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h2 className="text-base font-black flex items-center gap-1.5"><FiList className="text-indigo-400" /> Order History</h2>
              <div className="relative w-full sm:w-64">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input type="text" placeholder="Search by ID, Name, Mobile..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 h-[34px]" />
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-5 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider min-w-max mr-1">Source:</span>
                {[{ value: 'All', label: 'All Sources' }, { value: 'POS', label: 'POS Panel' }, { value: 'Customer', label: 'Customer App' }].map((src) => {
                  const count = src.value === 'All' ? allOrders.length : allOrders.filter((o) => o.source === src.value).length;
                  return (
                    <button
                      key={src.value}
                      onClick={() => setOrderSourceFilter(src.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all border whitespace-nowrap ${orderSourceFilter === src.value ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                    >
                      {src.label}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${orderSourceFilter === src.value ? 'bg-indigo-500/30' : 'bg-slate-800'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider min-w-max mr-1">Status:</span>
                {['All', ...ORDER_STATUS_OPTIONS].map((st) => {
                  const count = st === 'All' ? allOrders.length : allOrders.filter((o) => (o.orderStatus || 'Pending') === st).length;
                  return (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all border whitespace-nowrap ${orderStatusFilter === st ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                    >
                      {st === 'All' ? 'All Status' : st}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${orderStatusFilter === st ? 'bg-emerald-500/30' : 'bg-slate-800'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800 mb-4">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Order Info</th>
                    <th className="px-3 py-2.5 font-bold">Items Breakdown</th>
                    <th className="px-3 py-2.5 font-bold">Status & Payment</th>
                    <th className="px-3 py-2.5 font-bold text-right">Grand Total</th>
                    <th className="px-3 py-2.5 font-bold text-center">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 bg-[#0B1221]">
                  {paginatedOrders.map((order, i) => (
                    <tr key={order.id || i} className="hover:bg-slate-900/50 transition">
                      <td className="px-3 py-2 align-top">
                        <div className="font-bold text-white text-[11px]">{(orderCurrentPage - 1) * ORDERS_PER_PAGE + i + 1}. {order.id}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{new Date(order.createdAt).toLocaleString()}</div>
                        
                        <div className={`inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${order.source === 'Customer' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'}`}>
                          {order.source === 'Customer' ? <FiSmartphone size={10} /> : <FiMonitor size={10} />}
                          {order.source === 'Customer' ? 'Customer App' : order.source === 'POS' ? 'POS Panel' : order.source || 'Unknown'}
                        </div>

                        <div className="font-semibold mt-1 text-white flex items-center gap-1 text-[11px]"><FiUser size={10} /> {order.customerName}-{order.customerMobile}</div>
                        {order.remarks && <div className="text-[9px] text-amber-400 mt-0.5 flex items-center gap-1"><FiFileText size={8} /> {order.remarks}</div>}
                        {order.address && <div className="text-[9px] text-slate-400 mt-0.5 max-w-[150px] truncate">Addr: {order.address}</div>}
                        {order.couponApplied && <div className="text-[9px] text-emerald-400 mt-0.5 font-bold">Coupon: {order.couponApplied} (-₹{order.discountAmount})</div>}
                      </td>

                      <td className="px-3 py-2 max-w-[250px] whitespace-normal leading-tight">
                        <div className="space-y-1">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-900/50 border border-slate-800 p-1.5 rounded text-[10px]">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-200">{item.product?.name} <span className="text-slate-400 font-normal">({item.variant?.name})</span></span>
                                <span className="text-[9px] text-slate-500">{item.qty} × ₹{item.price}</span>
                              </div>
                              <span className="font-black text-emerald-400">₹{item.qty * Number(item.price)}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top space-y-2 flex flex-col items-start min-w-[150px]">
                        <div className="flex flex-col gap-1.5 w-full">
                          <select value={order.orderStatus || 'Pending'} onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)} className="text-[10px] font-black px-1.5 py-1 rounded w-full border bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 border-slate-700">
                            {ORDER_STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>

                          <select value={order.paymentMethod} onChange={(e) => handleUpdatePayment(order.id, e.target.value)} className={`text-[10px] font-black px-1.5 py-1 rounded uppercase w-full border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 ${order.paymentMethod === 'Online' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : order.paymentMethod === 'Cash' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                            <option value="Online" className="bg-slate-900 text-blue-400">Online</option>
                            <option value="Cash" className="bg-slate-900 text-orange-400">Cash</option>
                            <option value="Due" className="bg-slate-900 text-red-400">Due</option>
                          </select>

                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border w-fit ${order.paymentStatus === 'Done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                            {order.paymentStatus === 'Done' ? 'Done' : 'Pending Payment'}
                          </span>

                          {order.source === 'Customer' && order.paymentStatus !== 'Done' && (
                            <button onClick={() => handleVerifyPayment(order.id)} className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1.5 rounded transition-all">
                              <FiCheckCircle size={12} /> Verify & Done
                            </button>
                          )}
                        </div>

                        {order.statusHistory && order.statusHistory.length > 0 && (
                          <div className="text-[8px] text-slate-400 leading-tight border-l-2 border-indigo-500/50 pl-1.5 mt-1">
                            <span className="font-bold text-indigo-400 block mb-0.5">Status History:</span>
                            {order.statusHistory.slice(-3).map((hist, hIdx) => (
                              <div key={hIdx} className="mb-0.5">
                                <span className="text-slate-300 font-bold">{hist.status}</span><br />
                                <span className="text-[7px]">{new Date(hist.date).toLocaleString()}</span>
                                {hist.reason && <><br /><span className="text-red-400">Reason: {hist.reason}</span></>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2 text-right font-black text-emerald-400 text-sm align-top">₹{order.totalAmount}</td>
                      <td className="px-3 py-2 text-center align-top">
                        <div className="flex flex-col gap-1.5 items-center">
                          <button onClick={() => downloadInvoiceThermal(order)} className="inline-flex items-center gap-1 text-[10px] font-bold bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600 hover:text-white px-2.5 py-1.5 rounded transition-all w-full justify-center" title="Thermal Receipt (58/80mm)">
                            <FiPrinter size={11} /> Thermal
                          </button>
                          <button onClick={() => downloadInvoiceA4(order)} className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white px-2.5 py-1.5 rounded transition-all w-full justify-center" title="A4 Invoice">
                            <FiDownload size={11} /> A4
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedOrders.length === 0 && (
                    <tr><td colSpan="5" className="p-6 text-center text-slate-500 font-bold text-xs">No orders found for this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalOrderPages > 1 && (
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setOrderCurrentPage((p) => Math.max(1, p - 1))} disabled={orderCurrentPage === 1} className="p-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-400 hover:text-white disabled:opacity-50 flex items-center justify-center"><FiChevronLeft size={16} /></button>
                <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-xs font-bold text-slate-300 flex items-center justify-center">Page {orderCurrentPage} of {totalOrderPages}</div>
                <button onClick={() => setOrderCurrentPage((p) => Math.min(totalOrderPages, p + 1))} disabled={orderCurrentPage === totalOrderPages} className="p-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-400 hover:text-white disabled:opacity-50 flex items-center justify-center"><FiChevronRight size={16} /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPENSES VIEW */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {renderDateFilter()}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 bg-[#0B1221] border border-slate-800 p-4 rounded-xl shadow-lg h-fit">
              <h3 className="font-black text-sm mb-4 text-white">Add Expense</h3>
              <form onSubmit={handleSaveExpense} className="space-y-3">
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
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition-all shadow-md mt-2">Save Expense</button>
              </form>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="bg-[#0B1221] border border-slate-800 p-4 rounded-xl shadow-lg flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400">Total Filtered Expenses</span>
                <span className="text-2xl font-black text-red-400">₹{totalExpenseAmount}</span>
              </div>
              <div className="bg-[#0B1221] border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5 font-bold">Date/Time</th>
                      <th className="px-3 py-2.5 font-bold">What</th>
                      <th className="px-3 py-2.5 font-bold">Reason</th>
                      <th className="px-3 py-2.5 font-bold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-900/50">
                        <td className="px-3 py-2 text-[10px] text-slate-400">{new Date(exp.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2 font-bold text-white">{exp.what}</td>
                        <td className="px-3 py-2 text-slate-400">{exp.reason || '-'}</td>
                        <td className="px-3 py-2 text-right font-black text-red-400">₹{exp.amount}</td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr><td colSpan="4" className="text-center p-4 text-slate-500 font-bold">No expenses found for this date range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COUPONS VIEW */}
      {activeTab === 'coupons' && hasVerifiedCheckout && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 bg-[#0B1221] border border-slate-800 p-4 rounded-xl shadow-lg h-fit">
              <h3 className="font-black text-sm mb-4 text-white">Add Coupon</h3>
              <form onSubmit={handleSaveCoupon} className="space-y-3">
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
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={labelClass}>Valid From *</label>
                    <input type="date" value={couponForm.validFrom} onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })} className={inputClass} required />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>Valid To *</label>
                    <input type="date" value={couponForm.validTo} onChange={(e) => setCouponForm({ ...couponForm, validTo: e.target.value })} className={inputClass} required />
                  </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs transition-all shadow-md mt-2">Create Coupon</button>
              </form>
            </div>
            <div className="md:col-span-2">
              <div className="bg-[#0B1221] border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5 font-bold">Code</th>
                      <th className="px-3 py-2.5 font-bold">Discount</th>
                      <th className="px-3 py-2.5 font-bold">Min Order</th>
                      <th className="px-3 py-2.5 font-bold">Valid From - To</th>
                      <th className="px-3 py-2.5 font-bold">Used By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {allCoupons.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="px-3 py-2 font-bold text-indigo-400">{c.code}</td>
                        <td className="px-3 py-2 font-black text-emerald-400">₹{c.discount}</td>
                        <td className="px-3 py-2 font-bold text-slate-300">₹{c.minOrder}</td>
                        <td className="px-3 py-2 text-[10px] text-slate-400">{c.validFrom} <br /> to <br /> {c.validTo}</td>
                        <td className="px-3 py-2 text-[10px] text-slate-400">{c.usedBy ? c.usedBy.length : 0} times</td>
                      </tr>
                    ))}
                    {allCoupons.length === 0 && (
                      <tr><td colSpan="5" className="text-center p-4 text-slate-500 font-bold">No coupons found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS VIEW */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {renderDateFilter()}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
            <div className="bg-[#0B1221] p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center shadow-md">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Revenue</span>
              <span className="text-2xl font-black text-emerald-400">₹{orderStats.total.toLocaleString()}</span>
            </div>
            <div className="bg-[#0B1221] p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center shadow-md">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Orders</span>
              <span className="text-2xl font-black text-indigo-400">{filteredOrders.length}</span>
            </div>
            <div className="bg-[#0B1221] p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center shadow-md">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Items Sold</span>
              <span className="text-2xl font-black text-amber-400">
                {filteredOrders.reduce((sum, order) => sum + (order.items || []).reduce((s, item) => s + item.qty, 0), 0)}
              </span>
            </div>
          </div>
          <div className="bg-[#0B1221] p-4 rounded-xl border border-slate-800 shadow-md">
            <h3 className="font-black text-sm mb-4 flex items-center gap-1.5"><FiTrendingUp className="text-indigo-400" /> Sales Chart (Filtered)</h3>
            <div className="flex items-end h-48 gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {Object.entries(analyticsData.dailySales).length > 0 ? (
                Object.entries(analyticsData.dailySales).map(([date, amount], i) => {
                  const maxAmt = Math.max(...Object.values(analyticsData.dailySales));
                  const heightPct = Math.max((amount / maxAmt) * 100, 5);
                  return (
                    <div key={i} className="flex flex-col items-center flex-shrink-0 w-14 group">
                      <div className="text-[9px] text-emerald-400 font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">₹{amount}</div>
                      <div className="w-8 bg-indigo-500/20 hover:bg-indigo-500 border border-indigo-500/50 rounded-t-sm transition-all" style={{ height: `${heightPct}%` }}></div>
                      <div className="text-[8px] text-slate-500 mt-1 truncate w-full text-center">{date.substring(0, 5)}</div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full flex items-center justify-center text-slate-500 text-xs font-bold h-full">No sales data for selected filter.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
          <div className="bg-[#0B1221] border border-slate-700 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                {editingProductId ? <FiEdit2 className="text-indigo-400" size={16} /> : <FiPlus className="text-emerald-400" size={16} />}
                {editingProductId ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"><FiX size={20} /></button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              <form id="productForm" onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) processImageFile(e.dataTransfer.files[0]); }}
                    className={`flex flex-col items-center justify-center w-full aspect-square border border-dashed rounded-xl cursor-pointer bg-slate-900/50 transition-all overflow-hidden relative ${isDragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 hover:border-indigo-500/50'}`}
                  >
                    {productImagePreview ? (
                      <>
                        <img src={productImagePreview} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                          <FiUploadCloud className="text-white mb-1" size={24} />
                          <span className="text-[10px] text-white font-bold">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3">
                        <FiImage className={`mx-auto mb-1.5 ${isDragging ? 'text-indigo-400' : 'text-slate-500'}`} size={28} />
                        <p className="text-[11px] font-bold text-indigo-400">Upload Image</p>
                        <p className="text-[9px] text-slate-500 mt-1">Max 200KB</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => processImageFile(e.target.files[0])} className="hidden" />
                  </label>
                  {saving && uploadProgress > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Uploading image...</span><span className="font-bold text-indigo-400">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300 ease-out rounded-full" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Product Name <span className="text-red-400">*</span></label>
                      <input type="text" name="name" value={productForm.name} onChange={handleProductChange} placeholder="e.g. Milk 1L" className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>Brand / Company</label>
                      <input type="text" name="brandName" value={productForm.brandName} onChange={handleProductChange} placeholder="e.g. Amul / Cipla" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Category <span className="text-red-400">*</span></label>
                      <select
                        name="category"
                        value={productForm.category === 'Other' || !availableCategories.includes(productForm.category) ? 'Other' : productForm.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Other') setProductForm((prev) => ({ ...prev, category: 'Other', customCategory: '' }));
                          else setProductForm((prev) => ({ ...prev, category: val, customCategory: '' }));
                        }}
                        className={`${inputClass} h-10`}
                      >
                        <option value="" disabled>Select Category</option>
                        {availableCategories.filter((c) => c !== 'Other').map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="Other">+ Add New Category</option>
                      </select>
                      {(productForm.category === 'Other' || !availableCategories.includes(productForm.category)) && (
                        <div className="mt-2 animate-fade-in-up">
                          <label className={labelClass}>Enter Category Name <span className="text-red-400">*</span></label>
                          <input type="text" name="customCategory" value={productForm.customCategory} onChange={handleProductChange} placeholder="Type new category name..." className={inputClass} required autoFocus />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <label className={`${labelClass} mb-0`}>Variants / Pricing</label>
                      <button type="button" onClick={addVariant} className="text-[9px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded flex items-center gap-1 shadow-sm"><FiPlus size={10} /> Add Variant</button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      {variants.map((v, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <input type="text" placeholder="Name (e.g. 10 Tabs)" value={v.name} onChange={(e) => handleVariantChange(index, 'name', e.target.value)} className={`${inputClass} w-20`} required />
                          <input type="number" placeholder="MRP (₹)" value={v.price} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} className={`${inputClass} w-20`} required />
                          <input type="number" placeholder="Offer (₹)" value={v.offerPrice} onChange={(e) => handleVariantChange(index, 'offerPrice', e.target.value)} className={`${inputClass} w-20`} />
                          {variants.length > 1 && (
                            <button type="button" onClick={() => removeVariant(index)} className="p-2 text-red-400 bg-red-400/10 rounded-md hover:bg-red-400/20 shrink-0"><FiTrash2 size={14} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Description / Details</label>
                    <textarea name="description" value={productForm.description} onChange={handleProductChange} rows="2" placeholder="Brief details... (This shows as 'details' in customer app)" className={inputClass} />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition" disabled={saving}>Cancel</button>
              <button type="submit" form="productForm" disabled={saving} className={`text-xs font-bold py-2 px-5 rounded-md flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 text-white ${editingProductId ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                {saving ? (
                  <><span className="animate-pulse">Saving...</span>{uploadProgress > 0 && (<span className="ml-1">({uploadProgress}%)</span>)}</>
                ) : editingProductId ? ('Save Changes') : ('Publish Product')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;