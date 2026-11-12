import { useRouter } from 'next/router';
import { FiXCircle, FiHome, FiRefreshCw } from 'react-icons/fi';
import Link from 'next/link';

export default function OrderFailed() {
  const router = useRouter();
  const { orderId } = router.query;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiXCircle size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Payment Failed</h1>
        <p className="text-slate-600 mb-6">
          Your payment could not be processed. Please try again or choose Cash on Delivery.
        </p>

        {orderId && (
          <p className="text-sm bg-slate-100 rounded-lg py-3 px-4 mb-6 font-mono">
            Order ID: <strong>{orderId}</strong>
          </p>
        )}

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500"
          >
            <FiRefreshCw size={18} /> Try Again
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
          >
            <FiHome size={18} /> Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}