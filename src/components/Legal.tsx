import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface LegalProps {
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<LegalProps> = ({ onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[200] bg-bg-primary p-6 overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto space-y-8 py-12">
        <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} /> Back to App
        </button>
        
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Privacy Policy</h1>
        </div>

        <div className="prose prose-invert max-w-none text-slate-400 space-y-6">
          <p>Last Updated: March 13, 2026</p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
            <p>We collect information you provide directly to us when you create an account, such as your email address and name. We also collect data related to your tasks, habits, and schedules to provide our AI-powered services.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">2. How We Use Your Information</h2>
            <p>We use your information to provide, maintain, and improve our services, including our AI schedule generation. We do not sell your personal data to third parties.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">3. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">4. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal information at any time through the application settings.</p>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

export const TermsOfService: React.FC<LegalProps> = ({ onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[200] bg-bg-primary p-6 overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto space-y-8 py-12">
        <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} /> Back to App
        </button>
        
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Terms of Service</h1>
        </div>

        <div className="prose prose-invert max-w-none text-slate-400 space-y-6">
          <p>Last Updated: March 13, 2026</p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
            <p>By using LifePilot AI, you agree to these terms. If you do not agree, please do not use the service.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">2. Subscription and Payments</h2>
            <p>Premium features require a paid subscription. Payments are processed through Razorpay. Subscriptions automatically renew unless cancelled.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">3. User Conduct</h2>
            <p>You are responsible for your use of the service and any content you provide. You agree not to use the service for any illegal or unauthorized purpose.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">4. Limitation of Liability</h2>
            <p>LifePilot AI is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>
          </section>
        </div>
      </div>
    </motion.div>
  );
};
