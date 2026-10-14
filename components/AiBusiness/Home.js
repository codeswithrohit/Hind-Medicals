import React, { useState, useEffect } from 'react';
import { firebase } from '../../Firebase/config';
import { 
  FiUser, FiEdit2, FiX, FiImage, FiCamera, 
  FiMapPin, FiPhone, FiCreditCard, FiList, FiGlobe, FiSmartphone,
  FiStar, FiDownload, FiLock, FiLoader, FiSun, FiMoon, FiPrinter, FiFileText
} from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaGoogle, FaYoutube, FaWhatsapp, FaGooglePay } from 'react-icons/fa';
import { SiGooglepay, SiPaytm, SiPhonepe } from 'react-icons/si';
import { FcGoogle } from "react-icons/fc"; 

const Profile = ({ userData, setUserData, showAlert, setActiveTab }) => {
  const [storeData, setStoreData] = useState({});
  const [loadingStore, setLoadingStore] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLogoFile, setEditLogoFile] = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState(null);
  const [isQrDarkMode, setIsQrDarkMode] = useState(true);
  const [selectedQrDesign, setSelectedQrDesign] = useState({ id: 'classic', name: 'Classic Dark', bg: 'ffffff', fg: '000000', isPremium: false });

  // ========== FETCH GLOBAL BUSINESS PROFILE ==========
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const docSnap = await firebase.firestore().collection('BusinessProfile').doc('HareKrishnaPharmacy').get();
        if (docSnap.exists) {
          setStoreData(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching business profile:", err);
      } finally {
        setLoadingStore(false);
      }
    };
    fetchStore();
  }, []);

  const inputClass = 'w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all';
  const labelClass = 'block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wide';

  const generatedUpiLink = storeData?.upiId 
    ? `upi://pay?pa=${storeData.upiId}&pn=${encodeURIComponent(storeData.businessName || 'Hare Krishna Pharmacy')}` 
    : '#';

  // CLEAN URL - No ID attached
  const publicStoreUrl = typeof window !== 'undefined' ? `${window.location.origin}/aipoweredbusiness` : '';
  const getQrUrl = (bg, fg) => `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicStoreUrl)}&bgcolor=${bg}&color=${fg}&margin=4&ecc=H`;
  const defaultQrCodeUrl = getQrUrl('ffffff', '000000');
  const activeQrCodeUrl = getQrUrl(selectedQrDesign.bg, selectedQrDesign.fg);

  const qrDesigns = [
    { id: 'classic', name: 'Classic Dark', bg: 'ffffff', fg: '000000', isPremium: false },
    { id: 'blue', name: 'Ocean Blue', bg: 'ffffff', fg: '2563eb', isPremium: false },
    { id: 'dark', name: 'Night Mode', bg: '0f172a', fg: 'ffffff', isPremium: false },
    { id: 'indigo', name: 'Brand Indigo', bg: 'eef2ff', fg: '4f46e5', isPremium: false },
    { id: 'emerald', name: 'Eco Green', bg: 'f0fdf4', fg: '16a34a', isPremium: false },
    { id: 'rose', name: 'Rose Red', bg: 'fff1f2', fg: 'e11d48', isPremium: false },
  ];

  const premiumDesigns = [
    { id: 'p1', name: 'Cyber Neon', border: 'from-pink-500 via-purple-500 to-indigo-500', canvasGrad: ['#ec4899', '#a855f7', '#6366f1'], accent: 'border-pink-500', accentHex: '#ec4899', text: 'text-pink-400', bg: '0f172a', fg: 'ec4899', isPremium: true },
    { id: 'p2', name: 'Luxury Gold', border: 'from-amber-300 via-yellow-500 to-amber-700', canvasGrad: ['#fcd34d', '#eab308', '#b45309'], accent: 'border-yellow-400', accentHex: '#facc15', text: 'text-yellow-400', bg: '0f172a', fg: 'f59e0b', isPremium: true },
    { id: 'p3', name: 'Tech Blueprint', border: 'from-cyan-400 via-blue-500 to-blue-700', canvasGrad: ['#22d3ee', '#3b82f6', '#1d4ed8'], accent: 'border-cyan-400', accentHex: '#22d3ee', text: 'text-cyan-400', bg: '0f172a', fg: '0ea5e9', isPremium: true },
    { id: 'p4', name: 'Eco Organic', border: 'from-emerald-400 via-green-500 to-teal-600', canvasGrad: ['#34d399', '#22c55e', '#0d9488'], accent: 'border-emerald-400', accentHex: '#34d399', text: 'text-emerald-400', bg: '0f172a', fg: '10b981', isPremium: true },
    { id: 'p5', name: 'Minimal Frost', border: 'from-slate-200 via-gray-400 to-slate-600', canvasGrad: ['#e2e8f0', '#9ca3af', '#475569'], accent: 'border-slate-300', accentHex: '#cbd5e1', text: 'text-slate-300', bg: 'ffffff', fg: '000000', isPremium: true }, 
    { id: 'p6', name: 'Midnight Onyx', border: 'from-gray-700 via-gray-900 to-black', canvasGrad: ['#374151', '#111827', '#000000'], accent: 'border-gray-500', accentHex: '#6b7280', text: 'text-gray-400', bg: 'ffffff', fg: '000000', isPremium: true }, 
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
        showAlert('info', 'Rendering your Premium High-Res QR Design...');
        const size = 1080;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, selectedQrDesign.canvasGrad[0]);
        gradient.addColorStop(0.5, selectedQrDesign.canvasGrad[1]);
        gradient.addColorStop(1, selectedQrDesign.canvasGrad[2]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        const cardMargin = 40;
        const cardSize = size - (cardMargin * 2);
        ctx.fillStyle = '#0f172a'; 
        ctx.beginPath();
        ctx.roundRect(cardMargin, cardMargin, cardSize, cardSize, 40);
        ctx.fill();

        ctx.strokeStyle = selectedQrDesign.accentHex;
        ctx.lineWidth = 12;
        const cornerLen = 80;
        const p = cardMargin + 40; 
        ctx.beginPath(); ctx.moveTo(p + cornerLen, p); ctx.lineTo(p, p); ctx.lineTo(p, p + cornerLen); ctx.stroke(); 
        ctx.beginPath(); ctx.moveTo(size - p - cornerLen, p); ctx.lineTo(size - p, p); ctx.lineTo(size - p, p + cornerLen); ctx.stroke(); 
        ctx.beginPath(); ctx.moveTo(p + cornerLen, size - p); ctx.lineTo(p, size - p); ctx.lineTo(p, size - p - cornerLen); ctx.stroke(); 
        ctx.beginPath(); ctx.moveTo(size - p - cornerLen, size - p); ctx.lineTo(size - p, size - p); ctx.lineTo(size - p, size - p - cornerLen); ctx.stroke(); 

        ctx.fillStyle = selectedQrDesign.accentHex;
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.letterSpacing = '10px';
        ctx.fillText(selectedQrDesign.name.toUpperCase(), size/2, p + 60);

        const qrSize = 540;
        const qrX = (size - qrSize) / 2;
        const qrY = (size - qrSize) / 2 - 20;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 24);
        ctx.fill();

        const qrImg = await loadImage(activeQrCodeUrl);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        if (storeData.logoUrl) {
          try {
            const logoImg = await loadImage(storeData.logoUrl);
            const logoSize = 140;
            const logoX = size/2;
            const logoY = qrY + qrSize/2;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(logoX, logoY, logoSize/2 + 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = 4;
            ctx.strokeStyle = '#f8fafc';
            ctx.stroke();

            ctx.save();
            ctx.beginPath();
            ctx.arc(logoX, logoY, logoSize/2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(logoImg, logoX - logoSize/2, logoY - logoSize/2, logoSize, logoSize);
            ctx.restore();
          } catch (logoErr) {
            console.warn('Could not load logo due to CORS, skipping center logo.');
          }
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((storeData.businessName || 'YOUR BRAND NAME').toUpperCase(), size/2, qrY + qrSize + 110);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 24px sans-serif';
        ctx.fillText('Scan to view our digital catalog and pay instantly.', size/2, qrY + qrSize + 160);

        const blobUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${storeData.businessName || 'Brand'}_PremiumQR_${selectedQrDesign.name.replace(/\s+/g, '')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showAlert('success', 'Premium QR Image Downloaded!');
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

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditLogoFile(file);
      setEditLogoPreview(URL.createObjectURL(file));
    }
  };

  const openEditModal = () => {
    setEditForm({
      ownerName: storeData.ownerName || '',
      businessCategory: storeData.businessCategory || '',
      businessAddress: storeData.businessAddress || '',
      shopAddress: storeData.shopAddress || '',
      facebook: storeData.facebook || '',
      instagram: storeData.instagram || '',
      youtube: storeData.youtube || '',
      websiteUrl: storeData.websiteUrl || '',
      appLink: storeData.appLink || '',
      gmbLink: storeData.gmbLink || '',
      upiId: storeData.upiId || '',
      verifiedMobile: storeData.verifiedMobile || userData?.verifiedMobile || '', // ← editable now
      invoicePrintPreference: storeData.invoicePrintPreference || 'Thermal'
    });
    setEditLogoPreview(storeData.logoUrl);
    setEditLogoFile(null);
    setIsEditModalOpen(true);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const user = firebase.auth().currentUser;
      let updatedLogoUrl = storeData.logoUrl || null; 
      if (editLogoFile) {
        const fileRef = firebase.storage().ref().child(`BusinessLogos/${user.uid}_${Date.now()}_${editLogoFile.name}`);
        await fileRef.put(editLogoFile);
        updatedLogoUrl = await fileRef.getDownloadURL();
      }

      // SUBMITTING DIRECTLY TO BUSINESSPROFILE COLLECTION
      const payload = {
        ownerName: editForm.ownerName?.toUpperCase() || "",
        businessName: "Hare Krishna Pharmacy", // Hardcoded – NOT editable
        businessCategory: editForm.businessCategory?.toUpperCase() || "",
        businessAddress: editForm.businessAddress?.toUpperCase() || "",
        shopAddress: editForm.shopAddress?.toUpperCase() || "",
        facebook: editForm.facebook || "",
        instagram: editForm.instagram || "",
        youtube: editForm.youtube || "",
        websiteUrl: editForm.websiteUrl || "",
        appLink: editForm.appLink || "",
        gmbLink: editForm.gmbLink || "",
        upiId: editForm.upiId || "",
        logoUrl: updatedLogoUrl,
        verifiedMobile: editForm.verifiedMobile || "", // ← now comes from form (editable)
        invoicePrintPreference: editForm.invoicePrintPreference || 'Thermal'
      };

      await firebase.firestore().collection('BusinessProfile').doc('HareKrishnaPharmacy').set(payload, { merge: true });

      setStoreData((prev) => ({ 
        ...prev, 
        ...payload
      }));
      setIsEditModalOpen(false);
      showAlert('success', 'Profile updated successfully!');
    } catch (err) {
      showAlert('error', err.message || 'Failed to update profile.');
      console.error("error", err);
    } finally {
      setSaving(false);
    }
  };

  if (loadingStore) return <div className="text-white">Loading profile...</div>;

  return (
    <div className="animate-fade-in-up space-y-4 sm:space-y-5">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-[#0B1221] border border-slate-800 p-4 rounded-xl shadow-md">
        <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
          <FiUser className="text-indigo-400" /> Business Profile
        </h2>
        <button onClick={openEditModal} className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-all">
          <FiEdit2 size={12} /> Edit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* DETAILS COLUMN */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#0B1221]/80 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2.5 rounded-lg text-indigo-400"><FiList size={18} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Category</p>
              <p className="text-sm font-semibold text-white mt-0.5">{storeData.businessCategory || '—'}</p>
            </div>
          </div>
          <div className="bg-[#0B1221]/80 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-lg text-emerald-400"><FiPhone size={18} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Mobile</p>
              <p className="text-sm font-semibold text-white mt-0.5">{storeData.verifiedMobile || userData?.verifiedMobile || '—'}</p>
            </div>
          </div>
          <div className="bg-[#0B1221]/80 border border-slate-800 p-3.5 rounded-xl flex items-start gap-3 sm:col-span-2">
            <div className="bg-cyan-500/10 p-2.5 rounded-lg text-cyan-400 shrink-0"><FiMapPin size={18} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Business Address</p>
              <p className="text-xs sm:text-sm font-semibold text-white mt-0.5 leading-snug">{storeData.businessAddress || '—'}</p>
            </div>
          </div>
          <div className="bg-[#0B1221]/80 border border-slate-800 p-3.5 rounded-xl flex items-start gap-3 sm:col-span-2">
            <div className="bg-pink-500/10 p-2.5 rounded-lg text-pink-400 shrink-0"><FiMapPin size={18} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Shop Address</p>
              <p className="text-xs sm:text-sm font-semibold text-white mt-0.5 leading-snug">{storeData.shopAddress || '—'}</p>
            </div>
          </div>
          <div className="bg-[#0B1221]/80 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3 sm:col-span-2">
            <div className="bg-orange-500/10 p-2.5 rounded-lg text-orange-400 shrink-0"><FiCreditCard size={18} /></div>
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 overflow-hidden">
              <div className="truncate">
                <p className="text-[10px] font-bold text-slate-500 uppercase">UPI ID</p>
                {storeData.upiId ? (
                  <p className="text-sm font-bold text-emerald-400 mt-0.5 truncate">{storeData.upiId}</p>
                ) : (
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Not Provided</p>
                )}
              </div>
              {storeData.upiId && (
                <a href={generatedUpiLink} className="flex items-center gap-2 text-slate-400 shrink-0">
                  <SiGooglepay size={18} className="hover:text-white transition-colors" />
                  <SiPhonepe size={16} className="hover:text-white transition-colors" />
                  <SiPaytm size={20} className="hover:text-white transition-colors" />
                  <span className="text-[8px] font-black border border-slate-600 px-1 py-0.5 rounded text-slate-300">BHIM</span>
                </a>
              )}
            </div>
          </div>

          <div className="bg-[#0B1221]/80 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3 sm:col-span-2">
            <div className="bg-violet-500/10 p-2.5 rounded-lg text-violet-400 shrink-0">
              <FiPrinter size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">After POS Order – Invoice Print</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {getPrintPreferenceLabel(storeData.invoicePrintPreference)}
              </p>
            </div>
          </div>
        </div>

        {/* QR CODE PREVIEW COLUMN */}
        <div className="bg-gradient-to-br from-[#0B1221] to-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[220px]">
          <div className="flex flex-col items-center justify-center w-full transition-all">
            <h3 className="text-xs font-black text-white mb-1 uppercase tracking-wide">Your AI Store QR</h3>
            <p className="text-[10px] text-slate-400 mb-3">Scan to view catalog & pay.</p>
            <div className="bg-white p-2 rounded-xl shadow-lg mb-3 border-2 border-indigo-500/30">
              <img src={defaultQrCodeUrl} alt="Store QR Code" className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
            </div>
            <button 
              onClick={() => setIsQrModalOpen(true)}
              className="w-full max-w-[200px] mb-2 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white font-bold py-1.5 px-2 rounded-md text-[10px] transition-all flex justify-center items-center gap-1.5 shadow-lg shadow-indigo-500/20"
            >
              <FiImage size={12} /> Explore 100+ Designs & Share
            </button>
            <div className="flex gap-2 w-full max-w-[200px]">
              <button onClick={() => window.open(publicStoreUrl, '_blank')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-2 rounded-md text-[10px] transition-all border border-slate-700">
                View Store
              </button>
              <button onClick={copyStoreLink} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-2 rounded-md text-[10px] transition-all border border-slate-700">
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SOCIAL LINKS VIEW */}
      <div className="bg-[#0B1221] border border-slate-800 p-4 rounded-xl shadow-md">
        <h3 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <FiGlobe size={14} /> Digital Presence
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <a href={storeData.websiteUrl || '#'} target="_blank" rel="noreferrer" className={`bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${storeData.websiteUrl ? 'hover:border-emerald-500' : 'opacity-50 cursor-not-allowed'}`}>
            <FiGlobe className="text-emerald-500" size={18} />
            <span className="text-[10px] font-bold text-slate-300">Website</span>
          </a>
          <a href={storeData.appLink || '#'} target="_blank" rel="noreferrer" className={`bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${storeData.appLink ? 'hover:border-cyan-500' : 'opacity-50 cursor-not-allowed'}`}>
            <FiSmartphone className="text-cyan-500" size={18} />
            <span className="text-[10px] font-bold text-slate-300">App</span>
          </a>
          <a href={storeData.gmbLink || '#'} target="_blank" rel="noreferrer" className={`bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${storeData.gmbLink ? 'hover:border-orange-500' : 'opacity-50 cursor-not-allowed'}`}>
            <FaGoogle className="text-orange-400" size={18} />
            <span className="text-[10px] font-bold text-slate-300">Reviews</span>
          </a>
          <a href={storeData.youtube || '#'} target="_blank" rel="noreferrer" className={`bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${storeData.youtube ? 'hover:border-red-500' : 'opacity-50 cursor-not-allowed'}`}>
            <FaYoutube className="text-red-500" size={18} />
            <span className="text-[10px] font-bold text-slate-300">YouTube</span>
          </a>
          <a href={storeData.instagram || '#'} target="_blank" rel="noreferrer" className={`bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${storeData.instagram ? 'hover:border-pink-500' : 'opacity-50 cursor-not-allowed'}`}>
            <FaInstagram className="text-pink-500" size={18} />
            <span className="text-[10px] font-bold text-slate-300">Instagram</span>
          </a>
          <a href={storeData.facebook || '#'} target="_blank" rel="noreferrer" className={`bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${storeData.facebook ? 'hover:border-blue-500' : 'opacity-50 cursor-not-allowed'}`}>
            <FaFacebook className="text-blue-500" size={18} />
            <span className="text-[10px] font-bold text-slate-300">Facebook</span>
          </a>
        </div>
      </div>

      {/* QR MODAL */}
      {isQrModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-colors duration-300 ${isQrDarkMode ? 'bg-black/80' : 'bg-slate-900/40'}`}>
          <div className={`w-full overflow-hidden animate-fade-in-up flex flex-col h-full border transition-all duration-300 ${isQrDarkMode ? 'bg-[#0B1221] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
            <div className={`flex justify-between items-center p-3 sm:p-4 border-b shrink-0 transition-colors duration-300 ${isQrDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
              <h2 className={`text-sm sm:text-base font-black flex items-center gap-2 ${isQrDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <FiImage className={isQrDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                <span>AI QR Designs Studio</span>
              </h2>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button type="button" onClick={() => setIsQrDarkMode(prev => !prev)} className={`relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border transition-all duration-300 ${isQrDarkMode ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700' : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'}`}>
                  {isQrDarkMode ? <FiSun size={17} /> : <FiMoon size={17} />}
                </button>
                <button type="button" onClick={() => setIsQrModalOpen(false)} className={`p-2 rounded-lg transition-all ${isQrDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className={`p-3 sm:p-4 md:p-5 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row gap-4 sm:gap-5 lg:gap-6 transition-colors duration-300 ${isQrDarkMode ? 'bg-[#0B1221]' : 'bg-slate-50'}`}>
              <div className="flex flex-col items-center w-full lg:w-1/3 space-y-4">
                {selectedQrDesign.isPremium ? (
                  <div className={`p-1 rounded-2xl w-full max-w-[320px] aspect-square transition-all shadow-xl ${isQrDarkMode ? 'shadow-black/50' : 'shadow-slate-300/60'} bg-gradient-to-br ${selectedQrDesign.border}`}>
                    <div className={`rounded-xl p-4 h-full flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300 ${isQrDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                      <div className={`absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 ${selectedQrDesign.accent} rounded-tl-lg`} />
                      <div className={`absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 ${selectedQrDesign.accent} rounded-tr-lg`} />
                      <div className={`absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 ${selectedQrDesign.accent} rounded-bl-lg`} />
                      <div className={`absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 ${selectedQrDesign.accent} rounded-br-lg`} />
                      <div className={`relative w-36 h-36 mb-4 bg-white p-2 rounded-lg shadow-xl ${isQrDarkMode ? 'shadow-black/50' : 'shadow-slate-300/70'}`}>
                        <img src={activeQrCodeUrl} className="w-full h-full opacity-90 object-contain" alt="Premium QR" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className={`bg-white p-1 rounded-full shadow-lg ${isQrDarkMode ? 'shadow-black/50' : 'shadow-slate-300'}`}>
                            <img src='/logo.png' className="w-8 h-8 rounded-full object-cover" alt="Brand Logo" />
                          </div>
                        </div>
                      </div>
                      <p className={`text-sm font-bold truncate w-full text-center px-4 mb-2 ${isQrDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {storeData.businessName || 'YOUR BRAND NAME'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`p-3 rounded-2xl shadow-xl relative w-full aspect-square max-w-[280px] flex items-center justify-center transition-all ${isQrDarkMode ? 'bg-white border-4 border-slate-800 shadow-black/40' : 'bg-white border-4 border-slate-200 shadow-slate-300/70'}`}>
                    <img src={activeQrCodeUrl} alt="Active QR Design" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="w-full space-y-2 max-w-[320px]">
                  <button onClick={handleDownloadQR} disabled={isDownloadingQr} className={`w-full font-bold py-3 px-4 rounded-lg text-xs transition-all border flex items-center justify-center gap-2 disabled:opacity-50 ${isQrDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-sm'}`}>
                    {isDownloadingQr ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
                    {isDownloadingQr ? 'Generating File...' : `Download ${selectedQrDesign.isPremium ? 'Premium ' : ''}QR Image`}
                  </button>
                  <button onClick={handleWhatsAppShare} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2">
                    <FaWhatsapp size={16} /> Share on WhatsApp
                  </button>
                </div>
              </div>

              <div className="w-full lg:w-2/3 flex flex-col">
                <div className="mb-4">
                  <h3 className={`text-sm font-bold mb-2 transition-colors ${isQrDarkMode ? 'text-white' : 'text-slate-900'}`}>Standard Color Themes</h3>
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {qrDesigns.map((design) => (
                      <button key={design.id} onClick={() => setSelectedQrDesign(design)} className={`flex flex-col items-center p-2 rounded-xl border transition-all ${selectedQrDesign.id === design.id ? isQrDarkMode ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-indigo-50 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.12)]' : isQrDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'}`}>
                        <div className="bg-white p-1.5 rounded-md mb-2 shadow-sm">
                          <img src={getQrUrl(design.bg, design.fg)} alt={design.name} className="w-10 h-10 object-contain pointer-events-none" />
                        </div>
                        <span className={`text-[9px] font-bold text-center leading-tight ${selectedQrDesign.id === design.id ? isQrDarkMode ? 'text-indigo-400' : 'text-indigo-600' : isQrDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{design.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`mt-4 pt-4 border-t relative transition-colors ${isQrDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${isQrDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <FiStar className="text-amber-400" /> Premium AI Combinations
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {premiumDesigns.map((pDesign) => (
                      <button key={pDesign.id} onClick={() => setSelectedQrDesign(pDesign)} className={`p-[2px] rounded-2xl bg-gradient-to-br ${pDesign.border} text-left transition-all ${selectedQrDesign.id === pDesign.id ? isQrDarkMode ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-[#0B1221] shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-[1.02]' : 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-slate-50 shadow-[0_0_15px_rgba(99,102,241,0.20)] scale-[1.02]' : isQrDarkMode ? 'hover:scale-[1.02] hover:shadow-none' : 'hover:scale-[1.02] hover:shadow-md'}`}>
                        <div className={`rounded-xl p-3 h-full flex flex-col items-center justify-center relative overflow-hidden pointer-events-none aspect-square transition-colors duration-300 ${isQrDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                          <div className={`absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 ${pDesign.accent} rounded-tl-md`} />
                          <div className={`absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 ${pDesign.accent} rounded-tr-md`} />
                          <div className={`absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 ${pDesign.accent} rounded-bl-md`} />
                          <div className={`absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 ${pDesign.accent} rounded-br-md`} />
                          <div className={`relative w-16 h-16 sm:w-20 sm:h-20 mb-2 bg-white p-1 rounded-lg shadow-lg ring-1 transition-all ${isQrDarkMode ? 'shadow-black/50 ring-transparent' : 'shadow-slate-200 ring-slate-100'}`}>
                            <img src={getQrUrl(pDesign.bg, pDesign.fg)} className="w-full h-full opacity-90 object-contain" alt="Premium QR" />
                          </div>
                          <p className={`text-[9px] font-bold truncate w-full text-center px-2 mb-1 transition-colors ${isQrDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {storeData.businessName || 'YOUR BRAND'}
                          </p>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-[#0B1221] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <FiEdit2 className="text-indigo-400" /> Edit Profile
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar">
              <form id="editForm" onSubmit={handleProfileUpdate} className="space-y-4 sm:space-y-5">
                <div className="flex flex-col items-center justify-center mb-2">
                  <div className="relative group cursor-pointer">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-indigo-500/30 overflow-hidden bg-slate-800 flex items-center justify-center">
                      {editLogoPreview ? (
                        <img src={editLogoPreview} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <FiUser size={28} className="text-slate-500" />
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <FiCamera className="text-white mb-1" size={18} />
                      <span className="text-[9px] text-white font-bold">Update</span>
                      <input type="file" accept="image/*" onChange={handleEditLogoChange} className="hidden" />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">Click to change logo</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Business Name – LOCKED */}
                  <div>
                    <label className={labelClass}>Business Name (Locked)</label>
                    <input 
                      type="text" 
                      value="Hare Krishna Pharmacy" 
                      disabled 
                      className={`${inputClass} opacity-50 cursor-not-allowed`} 
                    />
                  </div>

                  {/* Mobile Number – NOW EDITABLE */}
                  <div>
                    <label className={labelClass}>Business Mobile Number</label>
                    <input 
                      type="tel" 
                      name="verifiedMobile" 
                      value={editForm.verifiedMobile || ''} 
                      onChange={handleEditChange} 
                      placeholder="Enter 10-digit mobile number"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Business Category</label>
                    <input type="text" name="businessCategory" value={editForm.businessCategory} onChange={handleEditChange} className={inputClass} placeholder="e.g. Real Estate, Restaurant..." required />
                  </div>
                  <div>
                    <label className={labelClass}>Owner Name</label>
                    <input type="text" name="ownerName" value={editForm.ownerName} onChange={handleEditChange} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>UPI ID</label>
                    <input type="text" name="upiId" value={editForm.upiId} onChange={handleEditChange} placeholder="e.g. yourname@upi" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Business Address</label>
                    <textarea name="businessAddress" value={editForm.businessAddress} onChange={handleEditChange} rows="2" className={inputClass} required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Shop Address</label>
                    <textarea name="shopAddress" value={editForm.shopAddress} onChange={handleEditChange} rows="2" placeholder="Enter full shop location address" className={inputClass} required />
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-800">
                  <h3 className="text-[11px] font-bold text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FiPrinter size={14} /> After POS Order – Invoice Print Preference
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className={`cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${editForm.invoicePrintPreference === 'Thermal' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'}`}>
                      <input type="radio" name="invoicePrintPreference" value="Thermal" checked={editForm.invoicePrintPreference === 'Thermal'} onChange={handleEditChange} className="sr-only" />
                      <FiPrinter size={22} className={editForm.invoicePrintPreference === 'Thermal' ? 'text-indigo-400' : 'text-slate-400'} />
                      <span className={`text-xs font-bold ${editForm.invoicePrintPreference === 'Thermal' ? 'text-indigo-300' : 'text-slate-300'}`}>Thermal Printer</span>
                    </label>
                    <label className={`cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${editForm.invoicePrintPreference === 'A4' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'}`}>
                      <input type="radio" name="invoicePrintPreference" value="A4" checked={editForm.invoicePrintPreference === 'A4'} onChange={handleEditChange} className="sr-only" />
                      <FiFileText size={22} className={editForm.invoicePrintPreference === 'A4' ? 'text-indigo-400' : 'text-slate-400'} />
                      <span className={`text-xs font-bold ${editForm.invoicePrintPreference === 'A4' ? 'text-indigo-300' : 'text-slate-300'}`}>A4 Size Print</span>
                    </label>
                    <label className={`cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${editForm.invoicePrintPreference === 'No Print' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'}`}>
                      <input type="radio" name="invoicePrintPreference" value="No Print" checked={editForm.invoicePrintPreference === 'No Print'} onChange={handleEditChange} className="sr-only" />
                      <FiX size={22} className={editForm.invoicePrintPreference === 'No Print' ? 'text-indigo-400' : 'text-slate-400'} />
                      <span className={`text-xs font-bold ${editForm.invoicePrintPreference === 'No Print' ? 'text-indigo-300' : 'text-slate-300'}`}>No Print</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800 space-y-3">
                  <h3 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Digital Links</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex relative">
                      <span className="absolute left-3 top-3 text-slate-500"><FiGlobe size={14} /></span>
                      <input type="url" name="websiteUrl" value={editForm.websiteUrl} onChange={handleEditChange} placeholder="Website URL" className={`${inputClass} pl-9`} />
                    </div>
                    <div className="flex relative">
                      <span className="absolute left-3 top-3 text-slate-500"><FiSmartphone size={14} /></span>
                      <input type="url" name="appLink" value={editForm.appLink} onChange={handleEditChange} placeholder="App Link" className={`${inputClass} pl-9`} />
                    </div>
                    <div className="flex relative">
                      <span className="absolute left-3 top-3 text-slate-500"><FaGoogle size={14} /></span>
                      <input type="url" name="gmbLink" value={editForm.gmbLink} onChange={handleEditChange} placeholder="Google Review Link" className={`${inputClass} pl-9`} />
                    </div>
                    <div className="flex relative">
                      <span className="absolute left-3 top-3 text-slate-500"><FaYoutube size={14} /></span>
                      <input type="url" name="youtube" value={editForm.youtube} onChange={handleEditChange} placeholder="YouTube Link" className={`${inputClass} pl-9`} />
                    </div>
                    <div className="flex relative">
                      <span className="absolute left-3 top-3 text-slate-500"><FaInstagram size={14} /></span>
                      <input type="url" name="instagram" value={editForm.instagram} onChange={handleEditChange} placeholder="Instagram Link" className={`${inputClass} pl-9`} />
                    </div>
                    <div className="flex relative">
                      <span className="absolute left-3 top-3 text-slate-500"><FaFacebook size={14} /></span>
                      <input type="url" name="facebook" value={editForm.facebook} onChange={handleEditChange} placeholder="Facebook Link" className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2 sm:gap-3 shrink-0">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition">Cancel</button>
              <button type="submit" form="editForm" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-5 rounded-lg flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;