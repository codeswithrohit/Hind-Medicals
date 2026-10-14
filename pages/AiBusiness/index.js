import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { firebase } from '../../Firebase/config';
import { 
  FiUser, FiBox, FiLogOut, FiCheckCircle, FiUsers 
} from 'react-icons/fi';

// Import child components
import Profile from '../../components/AiBusiness/Home';
import Products from '../../components/AiBusiness/Products';
import OurMembers from '../../components/AiBusiness/OurMembers';

const Dashboard = () => {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('PROFILE');
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = firebase.firestore().collection('HareKrishnaPharmacyAdmin').doc(user.uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const data = docSnap.data();
          setUserData({ ...data, uid: user.uid });
        } else {
          router.push('/AiBusiness/login');
        }
        setLoading(false);
      } else {
        router.push('/AiBusiness/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await firebase.auth().signOut();
    router.push('/AiBusiness/login');
  };

  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg({ type: '', text: '' }), 3000);
  };

  // ================= INSTANT SKELETON LOADER =================
  if (loading) {
    return (
      <div className="flex h-screen bg-[#070B14] font-sans overflow-hidden animate-pulse">
        {/* DESKTOP SIDEBAR SKELETON */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#0B1221] border-r border-slate-800 h-full">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-slate-800 rounded w-1/2"></div>
                <div className="h-3 bg-slate-800 rounded w-3/4"></div>
              </div>
            </div>
            <div className="h-12 bg-slate-800 rounded-lg w-full"></div>
          </div>
          <nav className="flex-1 py-6 px-4 space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="w-full h-11 bg-slate-800 rounded-xl"></div>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-800">
            <div className="w-full h-12 bg-slate-800 rounded-xl"></div>
          </div>
        </aside>

        {/* MAIN CONTENT SKELETON */}
        <main className="flex-1 flex flex-col h-full relative">
          <header className="lg:hidden bg-[#0B1221] border-b border-slate-800/80 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0"></div>
              <div className="space-y-1.5">
                <div className="h-2 bg-slate-800 rounded w-16"></div>
                <div className="h-3 bg-slate-800 rounded w-24"></div>
              </div>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-lg"></div>
          </header>
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-10 space-y-6">
            <div className="h-20 w-full bg-[#0B1221] border border-slate-800 rounded-2xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 w-full bg-[#0B1221] border border-slate-800 rounded-xl"></div>
              ))}
            </div>
            <div className="h-64 w-full bg-[#0B1221] border border-slate-800 rounded-2xl"></div>
          </div>
        </main>
      </div>
    );
  }

  // ================= TABS CONFIGURATION =================
  // Dynamically include "Our Members" ONLY if role is 'master admin'
  const tabs = [
    { id: 'PROFILE', label: 'Profile Settings', icon: FiUser },
    { id: 'PRODUCTS', label: 'Our Store', icon: FiBox },
    ...(userData?.role === 'master admin' ? [{ id: 'MEMBERS', label: 'Our Members', icon: FiUsers }] : [])
  ];

  return (
    <div className="flex h-screen bg-[#070B14] text-slate-200 font-sans overflow-hidden">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0B1221] border-r border-slate-800 h-full shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800 relative overflow-hidden">
          {/* Subtle Theme Glow */}
          <div className="absolute top-0 left-0 w-full h-full bg-red-600 opacity-5 blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="bg-white p-1 rounded-full shadow-md border-2 border-red-500/30">
              <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider truncate">Hare Krishna Pharmacy</p>
              <h1 className="text-sm font-black text-white truncate" title={userData.ownerName || userData.verifiedMobile}>
                {userData.ownerName || userData.verifiedMobile}-{userData.verifiedMobile}
              </h1>
            </div>
          </div>
          
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 relative z-10">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Your Role</p>
            <p className="text-xs font-black text-yellow-400 truncate uppercase tracking-widest">{userData.role || 'Admin'}</p>
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
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 translate-x-1' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <tab.icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} /> {tab.label}
              </button>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800 shrink-0 bg-[#0B1221] relative z-10">
          <button onClick={handleLogout} className="w-full bg-slate-900 text-red-400 py-3 rounded-xl border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider">
            <FiLogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-20 lg:pb-0 relative scroll-smooth bg-[#070B14]">
        
        {/* MOBILE HEADER */}
        <header className="lg:hidden bg-[#0B1221] border-b border-slate-800/80 sticky top-0 z-30 p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white p-0.5 rounded-full border border-red-500/30 shadow-sm">
              <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{getGreeting()}</p>
              <h1 className="text-sm font-black text-white truncate max-w-[160px]">
                {userData.ownerName || userData.verifiedMobile}
              </h1>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-slate-900 text-red-400 p-2 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors">
            <FiLogOut size={18} />
          </button>
        </header>

        {/* ALERTS */}
        {alertMsg.text && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 absolute top-4 left-0 right-0 z-50 animate-fade-in-down">
            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold shadow-2xl backdrop-blur-md ${
              alertMsg.type === 'success' ? 'bg-emerald-500/90 border border-emerald-400 text-white' : 'bg-red-600/90 border border-red-400 text-white'
            }`}>
              <FiCheckCircle className="shrink-0" size={20} /> {alertMsg.text}
            </div>
          </div>
        )}

        {/* TAB RENDERING */}
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-10 relative z-10">
          
          {activeTab === 'PROFILE' && (
            <Profile 
              userData={userData} 
              setUserData={setUserData} 
              showAlert={showAlert} 
              setActiveTab={setActiveTab} 
            />
          )}

          {activeTab === 'PRODUCTS' && (
            <Products 
              userData={userData} 
              setUserData={setUserData} 
              showAlert={showAlert} 
            />
          )}

          {activeTab === 'MEMBERS' && userData?.role === 'master admin' && (
            <OurMembers 
              showAlert={showAlert} 
            />
          )}
          
        </div>
      </main>

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0B1221] border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] z-40 px-2 py-2 pb-safe flex justify-around items-center overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[64px] flex-1 py-2 rounded-xl transition-all duration-300 ${
                isActive ? 'text-yellow-400 bg-red-600/10 border border-red-500/20' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon size={isActive ? 20 : 18} className={`mb-1 transition-all ${isActive ? 'text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.6)]' : ''}`} />
              <span className={`text-[9px] font-bold tracking-wide transition-all w-full text-center px-1 leading-tight ${isActive ? 'opacity-100 text-red-400' : 'opacity-70'}`}>
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