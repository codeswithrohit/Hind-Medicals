import Head from "next/head";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* ========== PRIMARY META TAGS (Google SEO) ========== */}
        <title>Hare Krishna Pharmacy - Genuine Medicines & Healthcare in Varanasi</title>
        <meta name="title" content="Hare Krishna Pharmacy - Genuine Medicines & Healthcare in Varanasi" />
        <meta 
          name="description" 
          content="Your trusted neighborhood medical store in Gilat Bazar, Varanasi. Get genuine medicines, surgical equipment, and healthcare essentials delivered directly to your doorstep." 
        />
        <meta 
          name="keywords" 
          content="Pharmacy, Medical Store, Medicines, Varanasi, Gilat Bazar, Medicine Delivery, Healthcare, Surgical items, Ayurvedic medicines, Hare Krishna Pharmacy" 
        />
        <meta name="author" content="Hare Krishna Pharmacy" />
        <meta name="publisher" content="Hare Krishna Pharmacy" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        
        {/* ========== SEARCH ENGINE ROBOTS ========== */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />

        {/* ========== OPEN GRAPH / FACEBOOK / WHATSAPP ========== */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.harekrishnapharmacy.in/" />
        <meta property="og:site_name" content="Hare Krishna Pharmacy" />
        <meta property="og:title" content="Hare Krishna Pharmacy - Genuine Medicines in Varanasi" />
        <meta 
          property="og:description" 
          content="Your trusted neighborhood medical store in Gilat Bazar, Varanasi. Get genuine medicines and healthcare essentials delivered directly to your doorstep." 
        />
        <meta property="og:image" content="https://www.harekrishnapharmacy.in/logo.png" />
        <meta property="og:image:alt" content="Hare Krishna Pharmacy Logo" />
        <meta property="og:locale" content="en_IN" />

        {/* ========== TWITTER CARDS ========== */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://www.harekrishnapharmacy.in/" />
        <meta name="twitter:title" content="Hare Krishna Pharmacy - Genuine Medicines in Varanasi" />
        <meta 
          name="twitter:description" 
          content="Your trusted neighborhood medical store in Gilat Bazar, Varanasi. Get genuine medicines and healthcare essentials delivered directly to your doorstep." 
        />
        <meta name="twitter:image" content="https://www.harekrishnapharmacy.in/logo.png" />

        {/* ========== ICONS & PWA THEME ========== */}
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="canonical" href="https://www.harekrishnapharmacy.in/" />
        {/* Changed theme color to a deep red to match the pharmacy's branding */}
        <meta name="theme-color" content="#B91C1C" /> 
        
      </Head>
      
      <Component {...pageProps} />
    </>
  );
}