'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Phone, Package, Truck, ClipboardList, AlertTriangle } from 'lucide-react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id') || '';
  const pharmacy = searchParams.get('pharmacy') || '';

  const steps = [
    {
      icon: <Phone size={20} className="text-teal-500" />,
      title: 'Pharmacy Calls You',
      desc: `${pharmacy || 'The pharmacy'} will call you to verify your order and confirm the details.`,
    },
    {
      icon: <Package size={20} className="text-purple-500" />,
      title: 'Order Prepared',
      desc: 'Your medications will be carefully prepared and packaged.',
    },
    {
      icon: <Truck size={20} className="text-orange-500" />,
      title: 'Delivered by Tomorrow',
      desc: 'Your order will be delivered to your address by the next business day.',
    },
    {
      icon: <ClipboardList size={20} className="text-green-500" />,
      title: 'Keep Your Prescription',
      desc: 'Have your original prescription ready to hand over to the delivery agent.',
    },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      {/* Success Icon */}
      <div className="flex items-center justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={48} className="text-green-500" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
      <p className="text-gray-500 mb-1">Your order has been submitted successfully.</p>
      {orderId && (
        <p className="text-xs text-gray-400 mb-8">
          Order ID: <span className="font-mono">{orderId}</span>
        </p>
      )}

      {/* Next Steps */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left mb-6">
        <h2 className="font-semibold text-gray-900 mb-5 text-center">What happens next?</h2>
        <div className="space-y-5">
          {steps.map(({ icon, title, desc }, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important Warning */}
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-left mb-8">
        <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800 text-sm">Important Notice</p>
          <p className="text-sm text-red-700 mt-1">
            If the original prescription is not provided at the time of delivery, the order <strong>will not be delivered</strong>.
            Please have it ready when the delivery agent arrives.
          </p>
        </div>
      </div>

      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 bg-teal-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-teal-600 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
