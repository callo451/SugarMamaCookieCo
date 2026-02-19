import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const MESSENGER_URL = 'https://m.me/61572980297155';

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.2.16.15.26.36.27.58l.05 1.81c.02.56.6.93 1.11.7l2.02-.8c.17-.07.36-.09.54-.05.88.24 1.82.37 2.86.37 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm5.89 7.55-2.89 4.58c-.46.73-1.44.92-2.12.42l-2.3-1.72a.6.6 0 0 0-.72 0l-3.1 2.35c-.41.31-.95-.17-.67-.6l2.89-4.58c.46-.73 1.44-.92 2.12-.42l2.3 1.72a.6.6 0 0 0 .72 0l3.1-2.35c.41-.31.95.17.67.6z" />
    </svg>
  );
}

export default function MessengerButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-gray-200"
          >
            <p className="text-sm font-medium text-gray-800 whitespace-nowrap">
              Chat with us on Messenger
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.a
        href={MESSENGER_URL}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-shadow hover:shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #0695FF 0%, #A334FA 50%, #FF6968 100%)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Chat on Messenger"
      >
        <MessengerIcon className="h-7 w-7 text-white" />
      </motion.a>
    </div>
  );
}
