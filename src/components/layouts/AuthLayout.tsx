import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>

      {/* Right - Image/Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-white text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-lg flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-bold">N</span>
          </div>
          <h2 className="text-3xl font-bold mb-4">NexSpace</h2>
          <p className="text-white/80 text-lg max-w-sm">
            AI-powered project management that helps you ship faster.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white/70">Real-time sync</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm text-white/70">AI Assistant</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
