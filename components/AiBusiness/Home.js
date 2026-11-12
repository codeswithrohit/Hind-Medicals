import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { firebase } from '../../Firebase/config';
import {
  FiUser, FiEdit2, FiX, FiImage, FiCamera,
  FiMapPin, FiPhone, FiCreditCard, FiList, FiGlobe, FiSmartphone,
  FiStar, FiDownload, FiLoader, FiSun, FiMoon, FiPrinter, FiFileText,
  FiCheckCircle, FiAlertCircle, FiCalendar, FiClock, FiPercent,
  FiMap, FiTag, FiShoppingCart, FiAward, FiFilePlus, FiUploadCloud
} from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { SiGooglepay, SiPaytm, SiPhonepe } from 'react-icons/si';
import { FcGoogle } from "react-icons/fc";

const Profile = ({ userData, setUserData, showAlert, setActiveTab, businessData }) => {
  const [storeData, setStoreData] = useState({});
  const [loadingStore, setLoadingStore] = useState(true);
  const [docId, setDocId] = useState(null);

  // ===== CORE STATE =====
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [editForm, setEditForm] = useState({});
  
  // LOGO UPLOAD STATE
  const [editLogoFile, setEditLogoFile] = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState(null);
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  
  // DRUG LICENSE UPLOAD STATE
  const [editDrugLicenseFile, setEditDrugLicenseFile] = useState(null);
  const [editDrugLicensePreview, setEditDrugLicensePreview] = useState(null);
  const [isLicenseDragging, setIsLicenseDragging] = useState(false);

  const [isQrDarkMode, setIsQrDarkMode] = useState(false);
  const [selectedQrDesign, setSelectedQrDesign] = useState({
    id: 'classic', name: 'Classic Dark', bg: 'ffffff', fg: '000000', isPremium: false
  });

  // ===== STANDEE STATE =====
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('Welcome to our store');
  const [reviewStars, setReviewStars] = useState(5);
  const reviewPrintRef = useRef(null);

  const CUSTOMER_ID = "TROBINNQ"; 

  // ========== INITIALIZE STORE DATA FROM PROPS OR FIRESTORE ==========
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
                  setStoreData(docSnap.data());
                }
                setLoadingStore(false);
              },
              (error) => {
                console.error('Real-time sync error: ', error);
                setLoadingStore(false);
              }
            );
        } else {
          console.warn("No business found for the provided customerId.");
          setLoadingStore(false);
        }
      } catch (error) {
        console.error("Error setting up Firestore listener: ", error);
        setLoadingStore(false);
      }
    };

    if (businessData && Object.keys(businessData).length > 0) {
       setupSync();
    } else {
       setupSync();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [businessData]);

  // STYLES
  const inputClass = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900/20 focus:border-gray-900 focus:bg-white transition-all';
  const labelClass = 'block text-[9px] font-bold text-gray-500 mb-1 uppercase tracking-wider';
  const cardClass = 'bg-white border border-gray-200 p-3 sm:p-3.5 rounded-xl shadow-sm';
  const iconWrapperClass = 'bg-gray-50 border border-gray-100 p-2 rounded-lg shrink-0 flex items-center justify-center';

  const generatedUpiLink = storeData?.upiId 
    ? `upi://pay?pa=${storeData.upiId}&pn=${encodeURIComponent(storeData.businessName || 'Business Store')}` 
    : '#';

  const publicStoreUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/aipoweredbusiness?id=${storeData?.uid || userData?.uid || CUSTOMER_ID}`
    : '';

  const getQrUrl = (bg, fg) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicStoreUrl)}&bgcolor=${bg}&color=${fg}&margin=0`;

  const defaultQrCodeUrl = getQrUrl('ffffff', '000000');
  const activeQrCodeUrl = getQrUrl(selectedQrDesign.bg, selectedQrDesign.fg);

  const googleReviewUrl = storeData?.gmbLink || `https://search.google.com/local/writereview?placeid=`;
  const reviewQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(googleReviewUrl)}&bgcolor=ffffff&color=000000&margin=0`;

  const qrDesigns = [
    { id: 'classic', name: 'Classic Dark', bg: 'ffffff', fg: '000000', isPremium: false },
    { id: 'blue', name: 'Ocean Blue', bg: 'ffffff', fg: '2563eb', isPremium: false },
    { id: 'dark', name: 'Night Mode', bg: '0f172a', fg: 'ffffff', isPremium: false },
    { id: 'indigo', name: 'Brand Indigo', bg: 'eef2ff', fg: '4f46e5', isPremium: false },
    { id: 'emerald', name: 'Eco Green', bg: 'f0fdf4', fg: '16a34a', isPremium: false },
    { id: 'rose', name: 'Rose Red', bg: 'fff1f2', fg: 'e11d48', isPremium: false },
  ];

  const getPrintPreferenceLabel = (pref) => {
    switch (pref) {
      case 'Thermal': return 'Thermal Printer (58/80mm)';
      case 'A4': return 'A4 Size Print';
      case 'No Print': return 'No Print';
      default: return 'Thermal Printer (58/80mm)';
    }
  };

  const copyStoreLink = () => {
    navigator.clipboard.writeText(publicStoreUrl);
    showAlert('success', 'Store link copied to clipboard!');
  };

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const getDaysDifference = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const activeItems = useMemo(() => {
    let itemsList = [];
    if (storeData?.subscriptions) {
      storeData.subscriptions.forEach(sub => {
        if (sub.status && sub.status !== 'Active') return;
        (sub.items || []).forEach(item => {
          let expiryText = 'Lifetime';
          let isExpired = false;
          let daysLeft = null;
          const joined = new Date(sub.joinedDate || sub.createdAt || Date.now());
          let expDate = new Date(joined);
          if (item.type === 'Yearly') {
            expDate.setFullYear(joined.getFullYear() + 1);
            daysLeft = getDaysDifference(expDate);
            isExpired = daysLeft < 0;
            expiryText = formatDate(expDate);
          } else if (item.type === 'Monthly') {
            expDate.setMonth(joined.getMonth() + 1);
            daysLeft = getDaysDifference(expDate);
            isExpired = daysLeft < 0;
            expiryText = formatDate(expDate);
          } else if (item.type === 'Trial') {
            if (item.trialTill) {
              expDate = new Date(item.trialTill);
              expDate.setHours(23, 59, 59, 999);
            } else {
              expDate.setDate(joined.getDate() + 1);
            }
            daysLeft = getDaysDifference(expDate);
            isExpired = daysLeft < 0;
            expiryText = formatDate(expDate);
          }
          itemsList.push({
            ...item, joined: formatDate(joined), expiry: expiryText,
            daysLeft, isExpired, subId: sub.id, isFreeTrialFlag: item.type === 'Trial'
          });
        });
      });
    }
    return itemsList.sort((a, b) => (a.isExpired !== b.isExpired) ? (a.isExpired ? 1 : -1) : 0);
  }, [storeData]);

  const hasPosPlan = activeItems.some(item =>
    item.name && 
    (item.name.includes('E-Commerce & POS') || item.name.includes('Medical Store E-Commerce & POS System')) && 
    !item.isExpired
  );
  
  const hasReviewPlan = activeItems.some(item =>
    item.name && (item.name.includes('Auto Review') || item.name.includes('Google Business')) && !item.isExpired
  );

  const isCombo = hasPosPlan; 
  const standeeTitle = isCombo ? '🛒 VIEW MENU & ⭐ RATE US' : '⭐ RATE US ON GOOGLE';
  const standeeQrUrl = isCombo ? activeQrCodeUrl : reviewQrUrl;
  const standeeSubText = isCombo ? 'SCAN TO ORDER & REVIEW' : 'SCAN TO LEAVE A REVIEW';

  const hasActiveQRPlan = hasPosPlan || hasReviewPlan || activeItems.some(item => item.type === 'Trial' && !item.isExpired);
  const isFreeTrialActive = activeItems.some(item => item.isFreeTrialFlag && !item.isExpired);
  const hasPaidQRPlan = activeItems.some(item => item.name && (item.name.includes('Auto Review') || item.name.includes('E-Commerce')) && !item.isExpired && !item.isFreeTrialFlag);

  const handlePrintReview = () => {
    const html = `
      <html>
      <head>
        <title>Desk Standee - ${storeData?.businessName || 'Business'}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          body { margin:0; padding:0; background:#fff; color:#0f172a; display:flex; justify-content:center; align-items:center; min-height:100vh; }
          
          .card {
            border: 10px solid #4f46e5; border-radius: 32px; padding: 40px;
            text-align: center; width: 600px; max-width: 100%; margin: 0 auto;
            background: linear-gradient(135deg, #eef2ff 0%, #fae8ff 100%);
            position: relative;
          }
          .card::after {
            content: ''; position: absolute; top: 12px; left: 12px; right: 12px; bottom: 12px;
            border: 3px dashed #a5b4fc; border-radius: 18px; pointer-events: none;
          }
          .header { display: flex; flex-direction: column; align-items: center; margin-bottom: 25px; position:relative; z-index:2; }
          .logo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 5px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-bottom: 12px;}
          .brand { font-size: 34px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 5px; color: #1e1b4b; }
          .tagline { font-size: 14px; color: #4338ca; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; }
          
          .qr-box { background: #fff; padding: 25px; border-radius: 24px; border: 4px solid #e0e7ff; box-shadow: 0 10px 25px rgba(0,0,0,0.05); position:relative; z-index:2; margin-top: 10px; }
          .qr-title { font-size: 24px; font-weight: 900; color: #3730a3; margin: 0 0 20px; text-transform: uppercase; }
          .qr-img { width: 300px; height: 300px; display: block; margin: 0 auto; }
          .stars { font-size: 38px; color: #f59e0b; letter-spacing: 4px; margin: 15px 0 5px; }
          .qr-desc { font-size: 16px; font-weight: 800; color: #64748b; margin-top: 15px; text-transform: uppercase; letter-spacing: 1px; }
          
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            ${storeData?.logoUrl ? `<img class="logo" src="${storeData.logoUrl}" crossorigin="anonymous" />` : ''}
            <h1 class="brand">${storeData?.businessName || 'YOUR BUSINESS'}</h1>
            <div class="tagline">${reviewMessage || 'Welcome to our store'}</div>
          </div>
          
          <div class="qr-box">
            <h2 class="qr-title">${standeeTitle}</h2>
            <img class="qr-img" src="${standeeQrUrl}" alt="QR Code" />
             <div class="stars">${'★'.repeat(reviewStars)}${'☆'.repeat(5 - reviewStars)}</div>
            <div class="qr-desc">${standeeSubText}</div>
          </div>
        </div>
      </body>
      </html>`;
    const w = window.open('', '_blank');
    if (!w) { showAlert('error', 'Popup blocked. Allow popups to print.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 800);
  };

  const handleDownloadReviewQR = async () => {
    try {
      showAlert('info', 'Rendering standee...');
      
      const sizeW = 1080;
      const sizeH = 1280;
      const canvas = document.createElement('canvas');
      canvas.width = sizeW; canvas.height = sizeH;
      const ctx = canvas.getContext('2d');

      const bgGradient = ctx.createLinearGradient(0, 0, sizeW, sizeH);
      bgGradient.addColorStop(0, '#eef2ff'); 
      bgGradient.addColorStop(1, '#fae8ff'); 
      ctx.fillStyle = bgGradient; 
      ctx.fillRect(0, 0, sizeW, sizeH);

      ctx.strokeStyle = '#4f46e5'; 
      ctx.lineWidth = 24;
      ctx.strokeRect(20, 20, sizeW - 40, sizeH - 40);

      ctx.strokeStyle = '#a5b4fc';
      ctx.lineWidth = 6;
      ctx.setLineDash([20, 15]);
      ctx.strokeRect(50, 50, sizeW - 100, sizeH - 100);
      ctx.setLineDash([]); 

      let currentY = 160;
      
      if (storeData?.logoUrl) {
        try {
          const logo = await loadImage(storeData.logoUrl);
          const lsize = 160;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(sizeW / 2, 180, lsize / 2 + 10, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 6; ctx.strokeStyle = '#4f46e5'; ctx.stroke();
          ctx.save();
          ctx.beginPath(); ctx.arc(sizeW / 2, 180, lsize / 2, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(logo, sizeW / 2 - lsize / 2, 180 - lsize / 2, lsize, lsize);
          ctx.restore();
          currentY = 320;
        } catch (e) { console.warn('logo skipped', e); }
      }

      ctx.fillStyle = '#1e1b4b';
      ctx.font = '900 56px sans-serif'; 
      ctx.textAlign = 'center';
      ctx.fillText((storeData?.businessName || 'YOUR BUSINESS').toUpperCase(), sizeW / 2, currentY + 60);

      ctx.fillStyle = '#4338ca';
      ctx.font = '800 24px sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText((reviewMessage || 'Welcome to our store').toUpperCase(), sizeW / 2, currentY + 110);

      const boxW = 800;
      const boxH = 700;
      const boxY = currentY + 180;
      const boxX = (sizeW - boxW) / 2;

      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ffffff';

      ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 32); ctx.fill();
      ctx.shadowBlur = 0; 

      const qrImg = await loadImage(standeeQrUrl);
      const qrSize = 420;
      const qrOffset = (boxW - qrSize) / 2;
      const qrYPos = boxY + 110;

      ctx.fillStyle = '#3730a3';
      ctx.font = '900 38px sans-serif';
      ctx.fillText(standeeTitle, boxX + boxW/2, boxY + 70);
      ctx.drawImage(qrImg, boxX + qrOffset, qrYPos, qrSize, qrSize);
      
      ctx.fillStyle = '#f59e0b'; 
      ctx.font = 'bold 60px sans-serif';
      ctx.fillText('★'.repeat(reviewStars) + '☆'.repeat(5 - reviewStars), boxX + boxW/2, boxY + boxH - 70);

      ctx.fillStyle = '#64748b';
      ctx.font = '800 22px sans-serif';
      ctx.fillText(standeeSubText, boxX + boxW/2, boxY + boxH - 30);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${storeData?.businessName || 'Business'}_Standee.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      showAlert('success', 'Standee downloaded!');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to generate image. Try printing directly.');
    }
  };

  const handleDownloadQR = async () => {
    setIsDownloadingQr(true);
    try {
      if (!selectedQrDesign.isPremium) {
        const response = await fetch(activeQrCodeUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${storeData.businessName || 'Business'}_QRCode.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showAlert('success', 'QR Code downloaded successfully!');
      } else {
        showAlert('info', 'Rendering Premium QR not implemented in this scope.');
      }
    } catch (err) {
      console.error(err);
      window.open(activeQrCodeUrl, '_blank');
      showAlert('info', 'Opened QR in new tab due to security constraints. Right-click to save.');
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleWhatsAppShare = () => {
    const businessName = storeData.businessName || 'Our Store';
    const message = `Hello! 🌟 Welcome to *${businessName}*!\n\nScan our Digital QR Code or click the link below to view our complete catalog, explore services, and pay securely online:\n\n🌐 View Store Here: ${publicStoreUrl}\n\nThank you for choosing us! 🙏`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openEditModal = () => {
    const cgst = storeData.cgstPercent ?? storeData.SGSTPercent ?? '';
    const sgst = storeData.sgstPercent ?? storeData.SGSTPercent ?? '';
    const igst = storeData.igstPercent ?? '';

    setEditForm({
      ownerName: storeData.ownerName || '',
      businessAddress: storeData.businessAddress || '',
      fullOfficeAddress: storeData.fullOfficeAddress || '',
      state: storeData.state || '',
      keywords: storeData.keywords?.join(', ') || storeData.keywords || '',
      facebook: storeData.facebook || '',
      instagram: storeData.instagram || '',
      youtube: storeData.youtube || '',
      websiteUrl: storeData.websiteUrl || '',
      appLink: storeData.appLink || '',
      gmbLink: storeData.gmbLink || '',
      upiId: storeData.upiId || '',
      verifiedMobile: storeData.verifiedMobile || userData?.verifiedMobile || '', 
      invoicePrintPreference: storeData.invoicePrintPreference || 'Thermal',
      hasGst: storeData.hasGst || 'no',
      gstNumber: storeData.gstNumber || '',
      cgstPercent: cgst,
      sgstPercent: sgst,
      igstPercent: igst,
      drugLicenseNumber: storeData.drugLicenseNumber || '', 
    });
    setEditLogoPreview(storeData.logoUrl);
    setEditLogoFile(null);
    setEditDrugLicensePreview(storeData.drugLicensePhotoUrl || null); 
    setEditDrugLicenseFile(null);
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleLogoDrop = useCallback((e) => {
    e.preventDefault();
    setIsLogoDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setEditLogoFile(file);
        setEditLogoPreview(URL.createObjectURL(file));
      } else {
        showAlert('error', 'Please upload an image file for the logo.');
      }
    }
  }, [showAlert]);

  const handleLicenseDrop = useCallback((e) => {
    e.preventDefault();
    setIsLicenseDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setEditDrugLicenseFile(file);
        setEditDrugLicensePreview(URL.createObjectURL(file));
      } else {
        showAlert('error', 'Please upload an image file for the license.');
      }
    }
  }, [showAlert]);

  const handleEditLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setEditLogoFile(file);
        setEditLogoPreview(URL.createObjectURL(file));
      } else {
        showAlert('error', 'Please select a valid image file.');
      }
    }
  };

  const handleDrugLicensePhotoChange = (e) => {
      const file = e.target.files[0];
      if(file){
         if (file.type.startsWith('image/')) {
            setEditDrugLicenseFile(file);
            setEditDrugLicensePreview(URL.createObjectURL(file));
         } else {
            showAlert('error', 'Please select a valid image file.');
         }
      }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!docId) {
      showAlert('error', 'Document ID not found. Please refresh and try again.');
      return;
    }
    setSaving(true);
    try {
      
      let updatedLogoUrl = storeData.logoUrl || null; 
      if (editLogoFile) {
        const fileRef = firebase.storage().ref().child(`BusinessLogos/${CUSTOMER_ID}_${Date.now()}_${editLogoFile.name}`);
        await fileRef.put(editLogoFile);
        updatedLogoUrl = await fileRef.getDownloadURL();
      }

      let updatedDrugLicensePhotoUrl = storeData.drugLicensePhotoUrl || null;
      if (editDrugLicenseFile) {
          const licenseFileRef = firebase.storage().ref().child(`DrugLicenses/${CUSTOMER_ID}_${Date.now()}_${editDrugLicenseFile.name}`);
          await licenseFileRef.put(editDrugLicenseFile);
          updatedDrugLicensePhotoUrl = await licenseFileRef.getDownloadURL();
      }

      const hasGst = editForm.hasGst === 'yes';
      
      const payload = {
        ownerName: (editForm.ownerName || '').toUpperCase(),
        businessAddress: (editForm.businessAddress || '').toUpperCase(),
        fullOfficeAddress: (editForm.fullOfficeAddress || '').toUpperCase(),
        state: (editForm.state || '').toUpperCase(),
        keywords: editForm.keywords ? editForm.keywords.split(',').map(kw => kw.trim().toLowerCase()) : [],
        facebook: editForm.facebook || "",
        instagram: editForm.instagram || "",
        youtube: editForm.youtube || "",
        websiteUrl: editForm.websiteUrl || "",
        appLink: editForm.appLink || "",
        gmbLink: editForm.gmbLink || "",
        upiId: editForm.upiId || "",
        logoUrl: updatedLogoUrl,
        drugLicensePhotoUrl: updatedDrugLicensePhotoUrl,
        drugLicenseNumber: (editForm.drugLicenseNumber || '').toUpperCase().trim(),
        verifiedMobile: editForm.verifiedMobile || "",
        invoicePrintPreference: editForm.invoicePrintPreference || 'Thermal',
        hasGst: hasGst ? 'yes' : 'no',
        gstNumber: hasGst ? (editForm.gstNumber || '').toUpperCase().trim() : '',
        cgstPercent: hasGst ? Number(editForm.cgstPercent || 0) : 0,
        sgstPercent: hasGst ? Number(editForm.sgstPercent || 0) : 0,
        igstPercent: hasGst ? Number(editForm.igstPercent || 0) : 0,
        SGSTPercent: hasGst ? Number(editForm.sgstPercent || 0) : 0,
        updatedAt: new Date().toISOString()
      };

      await firebase.firestore().collection('BusinessUsers').doc(docId).set(payload, { merge: true });

      setIsEditModalOpen(false);
      showAlert('success', 'Profile updated successfully!');
    } catch (err) {
      showAlert('error', err.message || 'Failed to update profile.');
      console.error("error", err);
    } finally {
      setSaving(false);
    }
  };

  const getCgst = () => storeData.cgstPercent ?? storeData.SGSTPercent ?? 0;
  const getSgst = () => storeData.sgstPercent ?? storeData.SGSTPercent ?? 0;
  const getIgst = () => storeData.igstPercent ?? 0;

  if (loadingStore) return <div className="text-white flex items-center justify-center p-10"><FiLoader className="animate-spin text-gray-500" size={24} /> Loading profile...</div>;

  return (
    <div className="animate-fade-in-up space-y-3 sm:space-y-4 pb-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className={`${cardClass} flex justify-between items-center`}>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <div className="bg-gray-100 p-1.5 rounded-lg text-gray-700">
            <FiUser size={16} />
          </div>
          Business Profile
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={openEditModal} className="flex items-center gap-1.5 text-[11px] font-bold bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-sm hover:bg-black transition-all active:scale-95">
            <FiEdit2 size={13} /> Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* DETAILS COLUMN */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className={`${cardClass} flex items-center gap-3`}>
            <div className={`${iconWrapperClass} text-blue-600 bg-blue-50/50`}><FiList size={18} /></div>
            <div className="min-w-0">
              <p className={labelClass}>Category</p>
              <p className="text-xs font-bold text-gray-900 truncate">{storeData.businessCategory || '—'}</p>
            </div>
          </div>
          <div className={`${cardClass} flex items-center gap-3`}>
            <div className={`${iconWrapperClass} text-emerald-600 bg-emerald-50/50`}><FiPhone size={18} /></div>
            <div className="min-w-0">
              <p className={labelClass}>Mobile</p>
              <p className="text-xs font-bold text-gray-900 truncate">{storeData.verifiedMobile || '—'}</p>
            </div>
          </div>
          <div className={`${cardClass} flex items-start gap-3 sm:col-span-2`}>
            <div className={`${iconWrapperClass} text-cyan-600 bg-cyan-50/50`}><FiMapPin size={18} /></div>
            <div className="min-w-0">
              <p className={labelClass}>Short Address / City</p>
              <p className="text-xs font-bold text-gray-900 leading-snug">{storeData.businessAddress || '—'}</p>
            </div>
          </div>
          <div className={`${cardClass} flex items-start gap-3 sm:col-span-2`}>
            <div className={`${iconWrapperClass} text-purple-600 bg-purple-50/50`}><FiMap size={18} /></div>
            <div className="min-w-0 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <p className={labelClass}>Full Office Address</p>
                <p className="text-xs font-bold text-gray-900 leading-snug break-words">{storeData.fullOfficeAddress || '—'}</p>
              </div>
              <div>
                <p className={labelClass}>State</p>
                <p className="text-xs font-bold text-gray-900 leading-snug truncate">{storeData.state || '—'}</p>
              </div>
            </div>
          </div>
          <div className={`${cardClass} flex items-start gap-3 sm:col-span-2`}>
            <div className={`${iconWrapperClass} text-pink-600 bg-pink-50/50`}><FiTag size={18} /></div>
            <div className="min-w-0 w-full">
              <p className={labelClass}>Business Keywords (For Search & SEO)</p>
              {storeData.keywords && storeData.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(Array.isArray(storeData.keywords) ? storeData.keywords : String(storeData.keywords).split(',')).map((kw, i) => (
                    <span key={i} className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 uppercase">
                      {kw.trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-bold text-gray-900 leading-snug">—</p>
              )}
            </div>
          </div>

          <div className={`${cardClass} flex items-center gap-3 sm:col-span-2`}>
            <div className={`${iconWrapperClass} text-violet-600 bg-violet-50/50`}><FiPrinter size={18} /></div>
            <div>
              <p className={labelClass}>Invoice Print Preference</p>
              <p className="text-xs font-bold text-gray-900">{getPrintPreferenceLabel(storeData.invoicePrintPreference)}</p>
            </div>
          </div>
          
          <div className={`${cardClass} flex items-start gap-3 sm:col-span-2`}>
            <div className={`${iconWrapperClass} text-indigo-600 bg-indigo-50/50`}><FiPercent size={18} /></div>
            <div className="min-w-0 flex-1">
              <p className={labelClass}>GST Details</p>
              {storeData.hasGst === 'yes' ? (
                <div className="space-y-1.5 mt-1">
                  <p className="text-xs font-bold text-gray-900">GSTIN: <span className="font-mono tracking-wide">{storeData.gstNumber || '—'}</span></p>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-bold border border-indigo-100">CGST: {getCgst()}%</span>
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-bold border border-indigo-100">SGST: {getSgst()}%</span>
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-bold border border-indigo-100">IGST: {getIgst()}%</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-medium text-gray-500">GST Not Enabled</p>
              )}
            </div>
          </div>

          {/* DRUG LICENSE DISPLAY SECTION */}
          {(storeData.drugLicenseNumber || storeData.drugLicensePhotoUrl) && (
              <div className={`${cardClass} flex items-start gap-3 sm:col-span-2`}>
                 <div className={`${iconWrapperClass} text-teal-600 bg-teal-50/50`}><FiFilePlus size={18} /></div>
                 <div className="min-w-0 flex-1">
                     <p className={labelClass}>Drug License Details</p>
                     <div className="space-y-2 mt-1">
                         {storeData.drugLicenseNumber && (
                             <p className="text-xs font-bold text-gray-900">License Number: <span className="font-mono tracking-wide">{storeData.drugLicenseNumber}</span></p>
                         )}
                         {storeData.drugLicensePhotoUrl && (
                             <div className="mt-2">
                                <p className="text-[10px] text-gray-500 mb-1">Uploaded License Photo:</p>
                                <a href={storeData.drugLicensePhotoUrl} target="_blank" rel="noopener noreferrer">
                                   <img src={storeData.drugLicensePhotoUrl} alt="Drug License" className="h-24 w-auto rounded-lg border border-gray-200 shadow-sm hover:opacity-80 transition object-contain bg-gray-50" />
                                </a>
                             </div>
                         )}
                     </div>
                 </div>
              </div>
          )}
        </div>

        {/* QR CODE PREVIEW COLUMN */}
        <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[240px]">
          {isFreeTrialActive && !hasPaidQRPlan && (
            <div className="absolute top-0 left-0 w-full bg-amber-50 text-amber-600 text-[9px] font-bold py-1.5 text-center z-20 border-b border-amber-100 uppercase tracking-wider">Free Trial Active</div>
          )}
          {!hasActiveQRPlan && (
            <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/80 flex flex-col items-center justify-center p-4 rounded-xl">
              <div className="bg-amber-50 p-2.5 rounded-full mb-2.5 shadow-sm border border-amber-100"><FiStar className="text-amber-500" size={20} /></div>
              <h3 className="text-xs font-bold text-gray-900">Activate QR Plan</h3>
              <p className="text-[10px] text-gray-500 mt-1 mb-3 max-w-[180px] leading-relaxed">Your trial has expired. Unlock your digital QR link.</p>
              <button onClick={() => setActiveTab && setActiveTab('OUR_PLANS')} className="bg-gray-900 hover:bg-black text-white text-[11px] font-bold px-5 py-2 rounded-lg shadow-sm transition-all active:scale-95">View Plans</button>
            </div>
          )}

          <div className={`flex flex-col items-center justify-center w-full transition-all mt-3 ${!hasActiveQRPlan ? 'opacity-30 blur-[2px] pointer-events-none' : ''}`}>
            <h3 className="text-[10px] font-bold text-gray-500 mb-0.5 uppercase tracking-wider">Your Store QR</h3>
            <p className="text-[9px] text-gray-400 mb-3 font-medium">Scan to view catalog & pay.</p>

            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 mb-3">
              <img src={defaultQrCodeUrl} alt="Store QR" className="w-24 h-24 object-contain" />
            </div>

            <button 
              onClick={() => setIsQrModalOpen(true)}
              className="w-full max-w-[200px] mb-2.5 bg-gray-900 hover:bg-black text-white font-bold py-2.5 px-3 rounded-lg text-[11px] transition-all flex justify-center items-center gap-1.5 shadow-sm active:scale-95"
            >
              <FiImage size={14} /> Explore Designs & Share
            </button>
            
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="w-full max-w-[200px] mb-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-2.5 px-3 rounded-lg text-[11px] transition-all flex justify-center items-center gap-1.5 shadow-sm active:scale-95"
            >
              <FiAward size={14} /> Smart All-In-One Standee
            </button>
            
            <div className="flex gap-1.5 w-full max-w-[200px]">
              <button onClick={() => window.open(publicStoreUrl, '_blank')} className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-bold py-2 px-2 rounded-lg text-[10px] transition-all border border-gray-200 shadow-sm active:scale-95">
                View Store
              </button>
              <button onClick={copyStoreLink} className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-bold py-2 px-2 rounded-lg text-[10px] transition-all border border-gray-200 shadow-sm active:scale-95">
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DIGITAL PRESENCE */}
      <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-sm">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <FiGlobe size={14} /> Digital Presence
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <a href={storeData.websiteUrl || '#'} target="_blank" rel="noreferrer" className={`group border border-gray-200 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${storeData.websiteUrl ? 'hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm' : 'opacity-40 cursor-not-allowed bg-gray-50'}`}>
            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-105 transition-transform"><FiGlobe className="text-slate-600" size={16} /></div>
            <span className="text-[10px] font-bold text-gray-700">Website</span>
          </a>
          <a href={storeData.appLink || '#'} target="_blank" rel="noreferrer" className={`group border border-gray-200 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${storeData.appLink ? 'hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm' : 'opacity-40 cursor-not-allowed bg-gray-50'}`}>
            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-105 transition-transform"><FiSmartphone className="text-gray-800" size={16} /></div>
            <span className="text-[10px] font-bold text-gray-700">App</span>
          </a>
          <a href={storeData.gmbLink || '#'} target="_blank" rel="noreferrer" className={`group border border-gray-200 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${storeData.gmbLink ? 'hover:bg-red-50/50 hover:border-red-200 hover:shadow-sm' : 'opacity-40 cursor-not-allowed bg-gray-50'}`}>
            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-105 transition-transform"><FcGoogle size={16} /></div>
            <span className="text-[10px] font-bold text-gray-700">Reviews</span>
          </a>
          <a href={storeData.youtube || '#'} target="_blank" rel="noreferrer" className={`group border border-gray-200 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${storeData.youtube ? 'hover:bg-red-50/50 hover:border-red-200 hover:shadow-sm' : 'opacity-40 cursor-not-allowed bg-gray-50'}`}>
            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-105 transition-transform"><FaYoutube className="text-[#FF0000]" size={16} /></div>
            <span className="text-[10px] font-bold text-gray-700">YouTube</span>
          </a>
          <a href={storeData.instagram || '#'} target="_blank" rel="noreferrer" className={`group border border-gray-200 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${storeData.instagram ? 'hover:bg-pink-50/50 hover:border-pink-200 hover:shadow-sm' : 'opacity-40 cursor-not-allowed bg-gray-50'}`}>
            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-105 transition-transform"><FaInstagram className="text-[#E1306C]" size={16} /></div>
            <span className="text-[10px] font-bold text-gray-700">Instagram</span>
          </a>
          <a href={storeData.facebook || '#'} target="_blank" rel="noreferrer" className={`group border border-gray-200 p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${storeData.facebook ? 'hover:bg-blue-50/50 hover:border-blue-200 hover:shadow-sm' : 'opacity-40 cursor-not-allowed bg-gray-50'}`}>
            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-105 transition-transform"><FaFacebook className="text-[#1877F2]" size={16} /></div>
            <span className="text-[10px] font-bold text-gray-700">Facebook</span>
          </a>
        </div>
      </div>
      
      {/* ACTIVE SUBSCRIPTIONS */}
      {activeItems.length > 0 && (
        <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-sm">
          <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-3 uppercase tracking-wide">
            <FiCheckCircle className="text-gray-500" size={15} /> Subscriptions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeItems.map((item, i) => {
              let statusBg = 'bg-green-50 text-green-700 border-green-200';
              let statusText = 'Active';
              if (item.isExpired) {
                statusBg = 'bg-gray-50 text-gray-500 border-gray-200';
                statusText = 'Expired';
              } else if (item.isFreeTrialFlag && !item.isExpired) {
                statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
                statusText = 'Trial Active';
              } else if (item.daysLeft !== null && item.daysLeft <= 7) {
                statusBg = 'bg-red-50 text-red-700 border-red-200';
                statusText = `Expiring in ${item.daysLeft} days!`;
              }
              return (
                <div key={i} className={`bg-white border border-gray-200 p-3 rounded-lg flex flex-col justify-between hover:border-gray-300 transition-all ${item.isExpired ? 'opacity-70 grayscale' : ''}`}>
                  <div>
                    <h4 className={`text-[11px] font-bold line-clamp-1 ${item.isExpired ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.name}</h4>
                    <span className={`inline-flex items-center gap-1 mt-1.5 text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${statusBg}`}>
                      {item.isExpired ? <FiX size={9} /> : (item.daysLeft <= 7 && item.daysLeft !== null) ? <FiAlertCircle size={9} /> : <FiCheckCircle size={9} />} {statusText}
                    </span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="flex items-center gap-1 text-gray-500 font-bold uppercase"><FiCalendar size={11} /> Joined</span>
                      <span className="font-bold text-gray-900">{item.joined}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="flex items-center gap-1 text-gray-500 font-bold uppercase"><FiClock size={11} /> Expires</span>
                      <span className={`font-bold ${item.isExpired ? 'text-red-600' : (item.expiry === 'Lifetime' ? 'text-blue-600' : 'text-gray-900')}`}>{item.expiry}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ===== NEW: CONDITIONAL ALL-IN-ONE STANDEE MODAL            ===== */}
      {/* ============================================================ */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-3">
          <div className="w-full max-w-4xl max-h-[94vh] rounded-3xl overflow-hidden animate-fade-in-up flex flex-col shadow-2xl bg-white border border-gray-200">

            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white shrink-0">
              <h2 className="text-sm font-bold flex items-center gap-2 text-gray-900">
                <FiAward className="text-indigo-600" size={18} /> Smart All-In-One Standee (Desk / Table)
              </h2>
              <button onClick={() => setIsReviewModalOpen(false)} className="p-2 rounded-full text-gray-500 hover:text-black hover:bg-gray-100 transition-all">
                <FiX size={18} />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 p-6 overflow-y-auto custom-scrollbar bg-gray-50">
              
              {/* Preview Standee Box */}
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                
                <div ref={reviewPrintRef} className="relative w-full max-w-[400px] bg-gradient-to-br from-indigo-50 to-fuchsia-50 border-4 md:border-8 border-indigo-600 rounded-3xl p-4 md:p-6 shadow-xl">
                  <div className="absolute inset-2 border-2 border-dashed border-indigo-300 rounded-2xl pointer-events-none"></div>

                  <div className="relative z-10 flex flex-col items-center">
                    {/* Header */}
                    {storeData?.logoUrl && (
                      <img src={storeData.logoUrl} alt="logo" className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-4 border-white shadow-sm mx-auto mb-2" />
                    )}
                    <h3 className="text-lg md:text-2xl font-black text-indigo-950 uppercase tracking-wide truncate w-full text-center mb-1">
                      {storeData?.businessName || 'YOUR BUSINESS'}
                    </h3>
                    <p className="text-[9px] md:text-xs text-indigo-700 font-extrabold uppercase tracking-widest mb-4 text-center">
                      {reviewMessage || 'Welcome to our store'}
                    </p>

                    {/* Single Combined QR Card */}
                    <div className="w-full bg-white p-4 rounded-2xl border-2 border-indigo-100 shadow-sm flex flex-col items-center text-center">
                      <span className="text-[12px] md:text-[14px] font-black text-indigo-900 mb-3 uppercase">
                        {standeeTitle}
                      </span>
                      <img src={standeeQrUrl} alt="Combo QR" className="w-32 h-32 md:w-48 md:h-48 object-contain" />
                      
                      <div className="text-[12px] md:text-lg text-amber-500 mt-3 tracking-widest">
                         {'★'.repeat(reviewStars)}{'☆'.repeat(5 - reviewStars)}
                      </div>
                      
                      <span className="text-[9px] md:text-[11px] font-bold text-gray-500 mt-2 uppercase">
                        {standeeSubText}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Actions */}
                <div className="w-full flex gap-3 max-w-[400px]">
                  <button onClick={handleDownloadReviewQR} className="flex-1 bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-lg">
                    <FiDownload size={14} /> Download Image
                  </button>
                  <button onClick={handlePrintReview} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-bold py-3 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                    <FiPrinter size={14} /> Print Directly
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {isQrModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md transition-colors duration-300 p-3 ${isQrDarkMode ? 'bg-black/90' : 'bg-gray-900/70'}`}>
          <div className={`w-full max-w-4xl max-h-[94vh] rounded-2xl overflow-hidden animate-fade-in-up flex flex-col shadow-2xl transition-all duration-300 ${isQrDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
            <div className={`flex justify-between items-center p-3 sm:p-3.5 border-b shrink-0 ${isQrDarkMode ? 'border-gray-800 bg-gray-900/80 text-white' : 'border-gray-200 bg-white text-gray-900'}`}>
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <FiImage className={isQrDarkMode ? 'text-gray-400' : 'text-gray-500'} size={16} /> AI QR Studio
              </h2>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setIsQrDarkMode(prev => !prev)} className={`p-1.5 rounded-lg border transition-all ${isQrDarkMode ? 'bg-gray-800 border-gray-700 text-amber-400' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                  {isQrDarkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
                </button>
                <button type="button" onClick={() => setIsQrModalOpen(false)} className={`p-1.5 rounded-lg transition-all ${isQrDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}>
                  <FiX size={18} />
                </button>
              </div>
            </div>
            <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row gap-4 lg:gap-5">
              <div className="flex flex-col items-center w-full lg:w-1/3 space-y-3.5">
                {selectedQrDesign.isPremium ? (
                  <div className={`p-1 rounded-2xl w-full max-w-[240px] aspect-square shadow-lg bg-gradient-to-br ${selectedQrDesign.border}`}>
                    <div className={`rounded-xl p-4 h-full flex flex-col items-center justify-center relative overflow-hidden ${isQrDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                      <div className={`absolute top-1.5 left-1.5 w-5 h-5 border-t-2 border-l-2 ${selectedQrDesign.accent} rounded-tl-lg`} />
                      <div className={`absolute top-1.5 right-1.5 w-5 h-5 border-t-2 border-r-2 ${selectedQrDesign.accent} rounded-tr-lg`} />
                      <div className={`absolute bottom-1.5 left-1.5 w-5 h-5 border-b-2 border-l-2 ${selectedQrDesign.accent} rounded-bl-lg`} />
                      <div className={`absolute bottom-1.5 right-1.5 w-5 h-5 border-b-2 border-r-2 ${selectedQrDesign.accent} rounded-br-lg`} />

                      <div className="relative w-28 h-28 mb-3.5 bg-white p-1.5 rounded-lg shadow-sm">
                        <img src={activeQrCodeUrl} className="w-full h-full opacity-90 object-contain" alt="QR" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white p-0.5 rounded-full shadow-md">
                            {storeData.logoUrl ? (
                              <img src={storeData.logoUrl} className="w-7 h-7 rounded-full object-cover" alt="Logo" />
                            ) : (
                              <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center"><FiImage size={12} className="text-gray-400" /></div>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className={`text-xs font-bold truncate w-full text-center px-2 tracking-wide uppercase ${isQrDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {storeData.businessName || 'YOUR BRAND'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`p-3 rounded-2xl shadow-sm relative w-full aspect-square max-w-[220px] flex items-center justify-center border-4 ${isQrDarkMode ? 'bg-white border-gray-800' : 'bg-white border-gray-100'}`}>
                    <img src={activeQrCodeUrl} alt="Active QR" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="w-full space-y-2 max-w-[240px]">
                  <button onClick={handleDownloadQR} disabled={isDownloadingQr} className={`w-full font-bold py-2.5 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1.5 active:scale-95 ${isQrDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-black'}`}>
                    {isDownloadingQr ? <FiLoader className="animate-spin" size={15} /> : <FiDownload size={15} />}
                    {isDownloadingQr ? 'Generating...' : `Download ${selectedQrDesign.isPremium ? 'Premium ' : ''}QR`}
                  </button>
                  <button onClick={handleWhatsAppShare} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1.5 active:scale-95">
                    <FaWhatsapp size={15} /> Share on WhatsApp
                  </button>
                </div>
              </div>
              <div className="w-full lg:w-2/3 flex flex-col">
                <div className="mb-4">
                  <h3 className={`text-[9px] font-bold mb-2 uppercase tracking-wider ${isQrDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Standard Themes</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {qrDesigns.map((design) => (
                      <button key={design.id} onClick={() => setSelectedQrDesign(design)} className={`flex flex-col items-center p-2 rounded-lg border transition-all ${selectedQrDesign.id === design.id ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-900 shadow-sm' : (isQrDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-300')}`}>
                        <div className="bg-white p-1 rounded-md mb-1.5 border border-gray-100 shadow-sm">
                          <img src={getQrUrl(design.bg, design.fg)} alt={design.name} className="w-7 h-7 object-contain" />
                        </div>
                        <span className={`text-[8px] font-bold text-center ${selectedQrDesign.id === design.id ? 'text-gray-900' : (isQrDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>{design.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-3">
          <div className="bg-white border border-gray-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[96vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white shrink-0">
              <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                <FiEdit2 className="text-indigo-600" size={16} /> Edit Business Profile
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-red-500 bg-gray-50 p-2 rounded-full hover:bg-red-50 transition-colors">
                <FiX size={18} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-gray-50/30">
              <form id="editForm" onSubmit={handleProfileUpdate} className="space-y-6">
                
                {/* --- IMAGE UPLOADS SECTION (LOGO & DRUG LICENSE) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    
                    {/* Store Logo Upload with Drag & Drop */}
                    <div className="flex flex-col">
                        <label className={`${labelClass} mb-2.5 text-gray-700`}><FiImage className="inline mr-1" /> Store Logo</label>
                        <div 
                          className={`relative group w-full h-[180px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all duration-200 cursor-pointer
                            ${isLogoDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'}
                          `}
                          onDragOver={(e) => { e.preventDefault(); setIsLogoDragging(true); }}
                          onDragLeave={() => setIsLogoDragging(false)}
                          onDrop={handleLogoDrop}
                        >
                          <input type="file" accept="image/*" onChange={handleEditLogoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          
                          {editLogoPreview ? (
                              <div className="relative w-full h-full p-2 group-hover:scale-105 transition-transform duration-300">
                                <img src={editLogoPreview} alt="Logo Preview" className="w-full h-full object-contain rounded-xl drop-shadow-sm" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                  <span className="text-white text-xs font-bold uppercase flex items-center gap-1.5"><FiEdit2/> Change Logo</span>
                                </div>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center text-center p-4">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-3 text-indigo-500 group-hover:scale-110 transition-transform">
                                  <FiUploadCloud size={24} />
                                </div>
                                <p className="text-[11px] font-bold text-gray-700">Drag & Drop Logo Here</p>
                                <p className="text-[10px] text-gray-400 mt-1">or click to browse</p>
                              </div>
                          )}
                        </div>
                    </div>

                    {/* Drug License Upload with Drag & Drop */}
                    <div className="flex flex-col">
                         <label className={`${labelClass} mb-2.5 text-gray-700`}><FiFilePlus className="inline mr-1" /> Drug License Photo</label>
                         <div 
                          className={`relative group w-full h-[180px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all duration-200 cursor-pointer
                            ${isLicenseDragging ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'}
                          `}
                          onDragOver={(e) => { e.preventDefault(); setIsLicenseDragging(true); }}
                          onDragLeave={() => setIsLicenseDragging(false)}
                          onDrop={handleLicenseDrop}
                        >
                          <input type="file" accept="image/*" onChange={handleDrugLicensePhotoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          
                          {editDrugLicensePreview ? (
                              <div className="relative w-full h-full p-2 group-hover:scale-105 transition-transform duration-300">
                                <img src={editDrugLicensePreview} alt="License Preview" className="w-full h-full object-contain rounded-xl drop-shadow-sm" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                  <span className="text-white text-xs font-bold uppercase flex items-center gap-1.5"><FiEdit2/> Change License</span>
                                </div>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center text-center p-4">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-3 text-teal-500 group-hover:scale-110 transition-transform">
                                  <FiUploadCloud size={24} />
                                </div>
                                <p className="text-[11px] font-bold text-gray-700">Drag & Drop License Here</p>
                                <p className="text-[10px] text-gray-400 mt-1">or click to browse</p>
                              </div>
                          )}
                        </div>
                    </div>
                </div>

                {/* BASIC INFO */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2 border-b border-gray-50 pb-3">
                    <FiUser className="text-indigo-500"/> Core Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Business Name <span className="text-gray-400 lowercase font-normal">(Locked)</span></label>
                      <input type="text" value={storeData.businessName || ''} disabled className={`${inputClass} bg-gray-100/70 text-gray-500 cursor-not-allowed border-transparent`} />
                    </div>
                    <div>
                      <label className={labelClass}>Owner Name</label>
                      <input type="text" name="ownerName" value={editForm.ownerName} onChange={handleEditChange} className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>Mobile Number <span className="text-red-500">*</span></label>
                      <input type="tel" name="verifiedMobile" value={editForm.verifiedMobile} onChange={handleEditChange} className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>State</label>
                      <input type="text" name="state" value={editForm.state} onChange={handleEditChange} placeholder="e.g. Maharashtra" className={inputClass} />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Drug License Number</label>
                      <input type="text" name="drugLicenseNumber" value={editForm.drugLicenseNumber} onChange={handleEditChange} placeholder="e.g. MH-MZ-123456" className={`${inputClass} font-mono`} />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>Short Business Address / City <span className="text-red-500">*</span></label>
                      <textarea name="businessAddress" value={editForm.businessAddress} onChange={handleEditChange} rows="1" placeholder="e.g., Near Main Market, Sector 12" className={inputClass} required />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Full Office / Store Address</label>
                      <textarea name="fullOfficeAddress" value={editForm.fullOfficeAddress} onChange={handleEditChange} rows="2" placeholder="e.g., Shop No. 4, Ground Floor, XYZ Building, City, Pincode" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Business Keywords (Comma Separated)</label>
                      <textarea name="keywords" value={editForm.keywords} onChange={handleEditChange} rows="2" placeholder="e.g. CA Services, Tax Filing, Pharmacy, Medical" className={inputClass} />
                      <p className="text-[9.5px] text-gray-400 mt-1.5 flex items-center gap-1"><FiAlertCircle/> Separate keywords with commas (,) to help customers find your business in search.</p>
                    </div>
                  </div>
                </div>

                {/* GST DETAILS */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2 border-b border-gray-50 pb-3">
                    <FiPercent className="text-indigo-500"/> Tax & GST Details
                  </h3>
                  <div className="mb-2">
                    <label className={labelClass}>Is your business GST Registered?</label>
                    <div className="flex gap-4 mt-2">
                      <label className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${editForm.hasGst === 'yes' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                        <input type="radio" name="hasGst" value="yes" checked={editForm.hasGst === 'yes'} onChange={handleEditChange} className="sr-only" />
                        <span className="text-xs font-bold">Yes, GST enabled</span>
                      </label>
                      <label className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${editForm.hasGst === 'no' ? 'border-gray-900 bg-gray-50 text-gray-900 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                        <input type="radio" name="hasGst" value="no" checked={editForm.hasGst === 'no'} onChange={handleEditChange} className="sr-only" />
                        <span className="text-xs font-bold">No, Not Registered</span>
                      </label>
                    </div>
                  </div>

                  {editForm.hasGst === 'yes' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up bg-indigo-50/30 p-4 rounded-xl border border-indigo-100 mt-2">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>GST Number / GSTIN <span className="text-red-500">*</span></label>
                        <input type="text" name="gstNumber" value={editForm.gstNumber} onChange={handleEditChange} placeholder="e.g. 22AAAAA0000A1Z5" className={`${inputClass} font-mono uppercase`} required={editForm.hasGst === 'yes'} />
                      </div>
                      <div>
                        <label className={labelClass}>CGST %</label>
                        <input type="number" name="cgstPercent" value={editForm.cgstPercent} onChange={handleEditChange} placeholder="e.g. 9" min="0" max="100" step="0.01" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>SGST %</label>
                        <input type="number" name="sgstPercent" value={editForm.sgstPercent} onChange={handleEditChange} placeholder="e.g. 9" min="0" max="100" step="0.01" className={inputClass} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>IGST %</label>
                        <input type="number" name="igstPercent" value={editForm.igstPercent} onChange={handleEditChange} placeholder="e.g. 18" min="0" max="100" step="0.01" className={inputClass} />
                      </div>
                    </div>
                  )}
                </div>

                {/* PRINT PREFERENCE */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2 border-b border-gray-50 pb-3">
                    <FiPrinter className="text-indigo-500"/> POS Invoice Print Preference
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className={`cursor-pointer flex flex-col items-center justify-center text-center gap-2 p-4 rounded-xl border-2 transition-all ${editForm.invoicePrintPreference === 'Thermal' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-100 hover:border-gray-300 text-gray-500'}`}>
                      <input type="radio" name="invoicePrintPreference" value="Thermal" checked={editForm.invoicePrintPreference === 'Thermal'} onChange={handleEditChange} className="sr-only" />
                      <FiPrinter size={22} className={editForm.invoicePrintPreference === 'Thermal' ? 'text-indigo-600' : 'text-gray-400'} />
                      <span className="text-[11px] font-bold">Thermal Printer<br/><span className="font-normal text-[9px] opacity-80">(58mm / 80mm)</span></span>
                    </label>

                    <label className={`cursor-pointer flex flex-col items-center justify-center text-center gap-2 p-4 rounded-xl border-2 transition-all ${editForm.invoicePrintPreference === 'A4' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-100 hover:border-gray-300 text-gray-500'}`}>
                      <input type="radio" name="invoicePrintPreference" value="A4" checked={editForm.invoicePrintPreference === 'A4'} onChange={handleEditChange} className="sr-only" />
                      <FiFileText size={22} className={editForm.invoicePrintPreference === 'A4' ? 'text-indigo-600' : 'text-gray-400'} />
                      <span className="text-[11px] font-bold">A4 Size Print<br/><span className="font-normal text-[9px] opacity-80">(Standard Printer)</span></span>
                    </label>

                    <label className={`cursor-pointer flex flex-col items-center justify-center text-center gap-2 p-4 rounded-xl border-2 transition-all ${editForm.invoicePrintPreference === 'No Print' ? 'border-gray-900 bg-gray-50 text-gray-900 shadow-sm' : 'border-gray-100 hover:border-gray-300 text-gray-500'}`}>
                      <input type="radio" name="invoicePrintPreference" value="No Print" checked={editForm.invoicePrintPreference === 'No Print'} onChange={handleEditChange} className="sr-only" />
                      <FiX size={22} className={editForm.invoicePrintPreference === 'No Print' ? 'text-gray-900' : 'text-gray-400'} />
                      <span className="text-[11px] font-bold">No Print<br/><span className="font-normal text-[9px] opacity-80">(Save Paper)</span></span>
                    </label>
                  </div>
                </div>

                {/* DIGITAL PRESENCE */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2 border-b border-gray-50 pb-3">
                    <FiGlobe className="text-indigo-500"/> Digital Presence Links
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex relative shadow-sm rounded-lg">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2"><FiGlobe className="text-gray-500" size={16} /></span>
                      <input type="url" name="websiteUrl" value={editForm.websiteUrl} onChange={handleEditChange} placeholder="Website URL" className={`${inputClass} pl-10`} />
                    </div>
                    <div className="flex relative shadow-sm rounded-lg">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2"><FiSmartphone className="text-gray-700" size={16} /></span>
                      <input type="url" name="appLink" value={editForm.appLink} onChange={handleEditChange} placeholder="App Download Link" className={`${inputClass} pl-10`} />
                    </div>
                    <div className="flex relative shadow-sm rounded-lg">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2"><FcGoogle size={16} /></span>
                      <input type="url" name="gmbLink" value={editForm.gmbLink} onChange={handleEditChange} placeholder="Google Review Link" className={`${inputClass} pl-10`} />
                    </div>
                    <div className="flex relative shadow-sm rounded-lg">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2"><FaYoutube className="text-[#FF0000]" size={16} /></span>
                      <input type="url" name="youtube" value={editForm.youtube} onChange={handleEditChange} placeholder="YouTube Channel Link" className={`${inputClass} pl-10`} />
                    </div>
                    <div className="flex relative shadow-sm rounded-lg">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2"><FaInstagram className="text-[#E1306C]" size={16} /></span>
                      <input type="url" name="instagram" value={editForm.instagram} onChange={handleEditChange} placeholder="Instagram Profile Link" className={`${inputClass} pl-10`} />
                    </div>
                    <div className="flex relative shadow-sm rounded-lg">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2"><FaFacebook className="text-[#1877F2]" size={16} /></span>
                      <input type="url" name="facebook" value={editForm.facebook} onChange={handleEditChange} placeholder="Facebook Page Link" className={`${inputClass} pl-10`} />
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0 rounded-b-2xl">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" form="editForm" disabled={saving} className="bg-indigo-600 w-full sm:w-auto hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-70 disabled:cursor-wait active:scale-95">
                {saving ? <FiLoader className="animate-spin" size={14}/> : <FiCheckCircle size={14}/>}
                {saving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;