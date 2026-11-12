import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { firebase } from '../../Firebase/config';
import { 
  FiUser, FiBox, FiLogOut, FiCheckCircle, FiUsers 
} from 'react-icons/fi';

// Import child components
import Profile from '../../components/AiBusiness/Home';
import Products from '../../components/AiBusiness/Products';

const Dashboard = ({ businessData }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('PROFILE');
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  const CUSTOMER_ID = 'TROBINNQ'; // Ensure we use this constant everywhere

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  useEffect(() => {
    const checkAuthAndData = async () => {
      // 1. Firebase Auth Check (Ensures there is an active session)
      const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
          try {
            // 2. Fetch the document using the specific CUSTOMER_ID, NOT user.uid
            const snapshot = await firebase.firestore().collection('BusinessUsers')
              .where('customerId', '==', CUSTOMER_ID)
              .get();

            if (!snapshot.empty) {
              const docSnap = snapshot.docs[0];
              const data = docSnap.data();
              
              // 3. Optional extra safety: Ensure the logged-in auth phone matches the document phone
              // (This prevents someone from logging in with a random number but viewing TROBINNQ data)
              // If you don't need this strict phone check, you can remove the IF block below.
              if (user.phoneNumber && data.verifiedMobile !== user.phoneNumber) {
                  await firebase.auth().signOut();
                  router.push('/AiBusiness/login');
                  return;
              }

              // Include the actual Firestore document ID as part of userData
              setUserData({ ...data, docId: docSnap.id, uid: user.uid });
            } else {
              // Document matching customerId not found
              await firebase.auth().signOut();
              router.push('/AiBusiness/login');
            }
          } catch (error) {
            console.error("Error fetching business user data:", error);
            await firebase.auth().signOut();
            router.push('/AiBusiness/login');
          } finally {
            setLoading(false);
          }
        } else {
          router.push('/AiBusiness/login');
        }
      });
      return () => unsubscribe();
    };

    checkAuthAndData();
  }, [router]);

  const handleLogout = async () => {
    await firebase.auth().signOut();
    router.push('/AiBusiness/login');
  };

  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg({ type: '', text: '' }), 3000);
  };

  // Merge the fetched data (if component fetched directly) with the prop data (if injected by _app)
  const currentData = businessData || userData;

  // ================= INSTANT SKELETON LOADER =================
  if (loading || !currentData) {
    return (
      <div className="flex h-screen bg-gray-50 font-sans overflow-hidden animate-pulse">
        {/* DESKTOP SIDEBAR SKELETON */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
            <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
          </div>
          <nav className="flex-1 py-6 px-4 space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="w-full h-11 bg-gray-200 rounded-xl"></div>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200">
            <div className="w-full h-12 bg-gray-200 rounded-xl"></div>
          </div>
        </aside>

        {/* MAIN CONTENT SKELETON */}
        <main className="flex-1 flex flex-col h-full relative">
          <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0"></div>
              <div className="space-y-1.5">
                <div className="h-2 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
          </header>
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-10 space-y-6">
            <div className="h-20 w-full bg-white border border-gray-200 rounded-2xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 w-full bg-white border border-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="h-64 w-full bg-white border border-gray-200 rounded-2xl"></div>
          </div>
        </main>
      </div>
    );
  }

  // ================= TABS CONFIGURATION =================
  const tabs = [
    { id: 'PROFILE', label: 'Profile Settings', icon: FiUser },
    { id: 'PRODUCTS', label: 'Our Store', icon: FiBox },
    ...(currentData?.role === 'master admin' ? [{ id: 'MEMBERS', label: 'Our Members', icon: FiUsers }] : [])
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-full shadow-sm z-20">
        <div className="p-6 border-b border-gray-200 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="bg-gray-50 p-1 rounded-full shadow-sm border border-gray-200">
              <img 
                src={currentData.logoUrl || "/logo.png"} 
                alt="Business Logo" 
                className="w-10 h-10 object-contain rounded-full" 
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">
                {currentData.businessName || "Your Pharmacy"}
              </p>
              <h1 className="text-sm font-black text-gray-900 truncate" title={`${currentData.ownerName} | ${currentData.verifiedMobile}`}>
                {currentData.ownerName || 'Owner'}
              </h1>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative z-10">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Your Role / Category</p>
            <p className="text-xs font-black text-indigo-600 truncate uppercase tracking-widest">
              {currentData.role || currentData.businessCategory || 'Admin'}
            </p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isActive 
                  ? 'bg-gray-900 text-white shadow-md translate-x-1' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={18} className={isActive ? 'text-white' : 'text-gray-400'} /> {tab.label}
              </button>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200 shrink-0 bg-white relative z-10">
          <button 
            onClick={handleLogout} 
            className="w-full bg-white text-red-600 py-3 rounded-xl border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider shadow-sm"
          >
            <FiLogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-20 lg:pb-0 relative scroll-smooth bg-gray-50">
        
        {/* MOBILE HEADER */}
        <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-30 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-gray-50 p-0.5 rounded-full border border-gray-200 shadow-sm">
              <img 
                src={currentData.logoUrl || "/logo.png"} 
                alt="Business Logo" 
                className="w-9 h-9 object-contain rounded-full" 
              />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                {getGreeting()}, {currentData.businessName}
              </p>
              <h1 className="text-sm font-black text-gray-900 truncate max-w-[160px]">
                {currentData.ownerName || currentData.verifiedMobile}
              </h1>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="bg-white text-red-600 p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
          >
            <FiLogOut size={18} />
          </button>
        </header>

        {/* ALERTS */}
        {alertMsg.text && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 absolute top-4 left-0 right-0 z-50 animate-fade-in-down">
            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold shadow-lg backdrop-blur-md ${
              alertMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}>
              <FiCheckCircle className="shrink-0" size={20} /> {alertMsg.text}
            </div>
          </div>
        )}

        {/* TAB RENDERING */}
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-10 relative z-10">
          {activeTab === 'PROFILE' && (
            <Profile 
              userData={currentData} 
              businessData={businessData}
              setUserData={setUserData} 
              showAlert={showAlert} 
              setActiveTab={setActiveTab} 
            />
          )}

          {activeTab === 'PRODUCTS' && (
            <Products 
              userData={currentData} 
              businessData={businessData}
              setUserData={setUserData} 
              showAlert={showAlert} 
            />
          )}

        
        </div>
      </main>

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-40 px-2 py-2 pb-safe flex justify-around items-center overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[64px] flex-1 py-2 rounded-xl transition-all duration-300 ${
                isActive ? 'text-gray-900 bg-gray-100 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <tab.icon size={isActive ? 20 : 18} className={`mb-1 transition-all ${isActive ? 'text-gray-900' : ''}`} />
              <span className={`text-[9px] font-bold tracking-wide transition-all w-full text-center px-1 leading-tight ${isActive ? 'opacity-100 text-gray-900' : 'opacity-70'}`}>
                {tab.label.split(' ').slice(0, 2).join(' ')}
              </span>
            </button>
          );
        })}
      </nav>

    </div>
  );
};

export default Dashboard;