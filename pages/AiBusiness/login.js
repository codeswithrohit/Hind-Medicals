import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { firebase } from '../../Firebase/config';

const Login = () => {
  const router = useRouter();
  const CUSTOMER_ID = 'TROBINNQ'; // Hardcoded unique customer ID for validation

  // Steps: 1 = Phone Number, 2 = OTP
  const [step, setStep] = useState(1);
  
  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Recaptcha Initialization
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible'
      });
    }
  }, []);


  // ========== FIREBASE OTP LOGIC ==========
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await firebase.auth().signInWithPhoneNumber(`+91${phoneNumber}`, window.recaptchaVerifier);
      setConfirmationResult(result);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      
      const usersRef = firebase.firestore().collection('BusinessUsers');
      const doc = await usersRef.doc(user.uid).get();
      
      if (!doc.exists) {
        // NEW USER LOGIN ATTEMPT
        // We only allow login, not account creation. 
        // If the document doesn't exist, they are not a registered business user.
        await firebase.auth().signOut();
        setStep(1);
        setOtp('');
        setError('Account not found. Please contact administration for access.');
        setLoading(false);
        return;

      } else {
        // EXISTING USER
        const data = doc.data();
        
        // 1. Check if customerId matches the hardcoded TROBINNQ
        if (data.customerId !== CUSTOMER_ID) {
           await firebase.auth().signOut();
           setStep(1);
           setOtp('');
           setError('Unauthorized access. Invalid customer ID.');
           setLoading(false);
           return;
        }

        // 2. Check if isActive and isVerified are BOTH TRUE
        if (data.isActive === true && data.isVerified === true) {
          // Success! Navigate to dashboard
          router.push('/AiBusiness');
        } else {
          // Block access if false
          await firebase.auth().signOut();
          setStep(1);
          setOtp('');
          setError('You do not have access. Your account is inactive or pending verification.');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      setError('Invalid OTP. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-gray-50 font-sans">
      {/* Invisible Recaptcha Container */}
      <div id="recaptcha-container" />

      {/* LEFT PANEL - Branding (Hidden on very small screens, visible on md and up) */}
      <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-gradient-to-br from-red-600 to-red-900 text-white flex-col justify-between p-12 relative overflow-hidden shadow-2xl z-10">
        {/* Background Design Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-400 opacity-20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-white p-2 rounded-xl shadow-lg border-b-4 border-yellow-400">
              <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-wider">HARE KRISHNA<br/><span className="text-yellow-400 text-sm tracking-widest font-bold uppercase">Pharmacy</span></h1>
          </div>
          
          <div className="mt-20">
            <h2 className="text-4xl font-bold leading-tight mb-6">
              Secure Access <br /> 
              <span className="text-yellow-200 text-3xl font-light">to your Admin Panel</span>
            </h2>
            <p className="text-red-100 text-lg max-w-md leading-relaxed">
              Log in with your authorized mobile number to manage products, view orders, and handle daily operations efficiently. Only verified administrators can access the dashboard.
            </p>
          </div>
        </div>

        <div className="relative z-10 text-sm text-red-200/80 font-medium">
          &copy; {new Date().getFullYear()} Hare Krishna Pharmacy. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL - Login Form */}
      <div className="w-full md:w-1/2 lg:w-7/12 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 p-8 sm:p-10 relative z-10">
          
          {/* Mobile Only Header */}
          <div className="md:hidden flex flex-col items-center justify-center mb-8 text-center">
            <div className="bg-red-50 border border-red-100 p-3 rounded-2xl mb-4 shadow-sm">
              <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-xl font-black text-red-700 uppercase tracking-wide">Hare Krishna</h1>
            <p className="text-xs font-bold text-yellow-600 uppercase tracking-widest mt-1">Pharmacy</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 1 ? 'Welcome Back' : 'Verify Identity'}
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              {step === 1 
                ? 'Enter your mobile number to receive a verification code.' 
                : `Enter the 6-digit code sent to +91 ${phoneNumber}`
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-200 shadow-sm">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* STEP 1: PHONE NUMBER FORM */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mobile Number</label>
                <div className="flex bg-gray-50 rounded-xl border border-gray-200 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/20 transition-all overflow-hidden shadow-sm">
                  <div className="flex items-center justify-center px-4 bg-gray-100 border-r border-gray-200 text-red-700 font-black text-sm">
                    +91
                  </div>
                  <input 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    placeholder="Enter 10 digits" 
                    className="w-full bg-transparent px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none text-base font-bold tracking-wide"
                    required 
                    autoFocus
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading || phoneNumber.length !== 10} 
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-base transition-all duration-200 shadow-lg shadow-red-600/30 active:scale-[0.98] flex justify-center items-center gap-2"
              >
                {loading ? (
                  <span className="animate-pulse">Sending Code...</span>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </form>
          )}

          {/* STEP 2: OTP FORM */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-700">Verification Code</label>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="text-xs font-bold text-yellow-600 hover:text-yellow-700 transition-colors"
                  >
                    Edit Number
                  </button>
                </div>
                <input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  placeholder="• • • • • •" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-all shadow-sm"
                  required 
                  autoFocus
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading || otp.length !== 6} 
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-200 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-900 font-black py-3.5 rounded-xl text-base transition-all duration-200 shadow-lg shadow-yellow-500/30 active:scale-[0.98]"
              >
                {loading ? 'Verifying...' : 'Verify & Secure Login'}
              </button>
            </form>
          )}

          {/* Step Indicator (Dots) */}
          <div className="flex justify-center gap-2 mt-8">
            <div className={`h-2 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-red-600' : 'w-2 bg-gray-200'}`}></div>
            <div className={`h-2 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-red-600' : 'w-2 bg-gray-200'}`}></div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;