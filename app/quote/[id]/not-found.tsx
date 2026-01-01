import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFFBF7] dark:bg-[#0C0A09] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 border border-white/50">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Quote Not Found</h2>
          <p className="text-gray-600 mb-8">
            The quote you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            Back to Swipe Quotes
          </Link>
        </div>
      </div>
    </div>
  );
}

