import Head from "next/head";
import "@/styles/globals.css";
import { useState, useEffect } from "react";
import { firebase } from '../Firebase/config';

export default function App({ Component, pageProps }) {
  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        // Fetch data from 'BusinessUsers' where customerId == 'TROBINNQ'
        const businessRef = firebase.firestore().collection('BusinessUsers');
        const snapshot = await businessRef.where('customerId', '==', 'TROBINNQ').get();
        
        if (!snapshot.empty) {
          // Assuming customerId is unique, we take the first matched document
          setBusinessData(snapshot.docs[0].data());
        } else {
          console.warn("No business found with this customerId.");
          setBusinessData(null);
        }
      } catch (error) {
        console.error("Error fetching business data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, []);

  console.log("businessdata", businessData);

  // ==========================================
  // DYNAMIC SEO & META TAGS BASED ON FIREBASE
  // ==========================================
  const siteTitle = businessData?.businessName 
    ? `${businessData.businessName} | ${businessData.businessCategory || 'Healthcare'} in ${businessData.businessAddress || 'India'}`
    : "Tech Rakshak - Genuine Medicines & Healthcare in Varanasi";

  const siteDescription = businessData?.businessName 
    ? `Visit ${businessData.businessName}, your trusted ${businessData.businessCategory?.toLowerCase() || 'store'} located at ${businessData.fullOfficeAddress}, ${businessData.state}.`
    : "Your trusted neighborhood medical store in Gilat Bazar, Varanasi. Get genuine medicines, surgical equipment, and healthcare essentials delivered directly to your doorstep.";

  const siteKeywords = businessData?.keywords?.length > 0
    ? businessData.keywords.join(", ")
    : "Pharmacy, Medical Store, Medicines, Varanasi, Gilat Bazar, Medicine Delivery, Healthcare, Surgical items, Ayurvedic medicines, Tech Rakshak";

  const siteAuthor = businessData?.ownerName || "Tech Rakshak";
  
  const siteUrl = businessData?.websiteUrl || "https://www.harekrishnapharmacy.in/";
  
  const siteLogo = businessData?.logoUrl || "https://www.harekrishnapharmacy.in/logo.png";
  const favIcon = businessData?.logoUrl || "/logo.png";

  return (
    <>
      <Head>
        {/* ========== PRIMARY META TAGS (Google SEO) ========== */}
        <title>{siteTitle}</title>
        <meta name="title" content={siteTitle} />
        <meta name="description" content={siteDescription} />
        <meta name="keywords" content={siteKeywords} />
        <meta name="author" content={siteAuthor} />
        <meta name="publisher" content={siteAuthor} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        
        {/* ========== SEARCH ENGINE ROBOTS ========== */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />

        {/* ========== OPEN GRAPH / FACEBOOK / WHATSAPP ========== */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:site_name" content={businessData?.businessName || "Tech Rakshak"} />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:image" content={siteLogo} />
        <meta property="og:image:alt" content={`${businessData?.businessName || "Tech Rakshak"} Logo`} />
        <meta property="og:locale" content="en_IN" />

        {/* ========== TWITTER CARDS ========== */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={siteUrl} />
        <meta name="twitter:title" content={siteTitle} />
        <meta name="twitter:description" content={siteDescription} />
        <meta name="twitter:image" content={siteLogo} />

        {/* ========== ICONS & PWA THEME ========== */}
        <link rel="icon" href={favIcon} />
        <link rel="apple-touch-icon" href={favIcon} />
        <link rel="canonical" href={siteUrl} />
        <meta name="theme-color" content="#B91C1C" /> 
      </Head>
      
      {/* Passing the fetched data to all pages */}
      <Component 
        {...pageProps} 
        businessData={businessData}
        loading={loading}
      />
    </>
  );
}