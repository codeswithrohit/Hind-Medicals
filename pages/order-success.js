import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FiCheckCircle, FiHome, FiDownload } from 'react-icons/fi';
import Link from 'next/link';

export default function OrderSuccess() {
  const router = useRouter();
  const { orderId } = router.query;
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (orderId) {
      // Optionally fetch order details from Firebase
      // firebase.firestore().collection('hindmedicalsOrders').doc(orderId).get()...
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiCheckCircle size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Payment Successful!</h1>
        <p className="text-slate-600 mb-6">
          Thank you for your payment. Your order has been confirmed.
        </p>

        {orderId && (
          <p className="text-sm bg-slate-100 rounded-lg py-3 px-4 mb-6 font-mono">
            Order ID: <strong>{orderId}</strong>
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500"
          >
            <FiHome size={18} /> Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}