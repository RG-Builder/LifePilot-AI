import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';

interface LegalProps {
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<LegalProps> = ({ onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[200] bg-background p-0 overflow-y-auto"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-text_primary">Privacy Policy</h1>
          </div>
          <button 
            onClick={onClose} 
            className="size-10 rounded-full bg-surface hover:bg-surface/80 flex items-center justify-center text-text-secondary hover:text-text_primary transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <div className="prose prose-invert max-w-none text-text-secondary space-y-8">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
            <p className="text-sm font-medium text-primary">Last Updated: March 13, 2026</p>
            <p className="mt-2 text-text_primary">This Privacy Policy describes how LifePilot AI collects, uses, and protects your personal information when you use our services.</p>
          </div>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text_primary flex items-center gap-3">
              <span className="size-8 rounded-lg bg-surface flex items-center justify-center text-sm font-mono text-text-secondary">01</span>
              Information We Collect
            </h2>
            <div className="pl-11">
              <p>We collect information you provide directly to us when you create an account, such as your email address and name. We also collect data related to your tasks, habits, and schedules to provide our AI-powered services.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text_primary flex items-center gap-3">
              <span className="size-8 rounded-lg bg-surface flex items-center justify-center text-sm font-mono text-text-secondary">02</span>
              How We Use Your Information
            </h2>
            <div className="pl-11">
              <p>We use your information to provide, maintain, and improve our services, including our AI schedule generation. We do not sell your personal data to third parties.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text_primary flex items-center gap-3">
              <span className="size-8 rounded-lg bg-surface flex items-center justify-center text-sm font-mono text-text-secondary">03</span>
              Data Security
            </h2>
            <div className="pl-11">
              <p>We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text_primary flex items-center gap-3">
              <span className="size-8 rounded-lg bg-surface flex items-center justify-center text-sm font-mono text-text-secondary">04</span>
              Your Rights
            </h2>
            <div className="pl-11">
              <p>You have the right to access, correct, or delete your personal information at any time through the application settings.</p>
            </div>
          </section>
        </div>

        <div className="pt-12 border-t border-border text-center">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-primary text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            I Understand
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const TermsOfService: React.FC<LegalProps> = ({ onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[200] bg-background p-0 overflow-y-auto"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-text_primary">Terms of Service</h1>
          </div>
          <button 
            onClick={onClose} 
            className="size-10 rounded-full bg-surface hover:bg-surface/80 flex items-center justify-center text-text-secondary hover:text-text_primary transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <div className="prose prose-invert max-w-none text-text-secondary space-y-8">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
            <p className="text-sm font-medium text-primary">Last Updated: March 13, 2026</p>
            <p className="mt-2 text-text_primary">By accessing or using LifePilot AI, you agree to be bound by these Terms of Service.</p>
          </div>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text_primary flex items-center gap-3">
              <span className="size-8 rounded-lg bg-surface flex items-center justify-center text-sm font-mono text-text-secondary">01</span>
              Acceptance of Terms
            </h2>
            <div className="pl-11">
              <p>By using LifePilot AI, you agree to these terms. If you do not agree, please do not use the service.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text_primary flex items-center gap-3">
              <span className="size-8 rounded-lg bg-surface flex items-center justify-center text-sm font-mono text-text-secondary">02</span>
              Subscription and Payments
            </h2>
            <div className="pl-11">
              <p>Premium features require a paid subscription. Payments are processed through Razorpay. Subscriptions automatically renew unless cancelled.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text_primary flex items-center gap-3">
              <span className="size-8 rounded-lg bg-surface flex items-center justify-center text-sm font-mono text-text-secondary">03</span>
              User Conduct
            </h2>
            <div className="pl-11">
              <p>You are responsible for your use of the service and any content you provide. You agree not to use the service for any illegal or unauthorized purpose.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text_primary flex items-center gap-3">
              <span className="size-8 rounded-lg bg-surface flex items-center justify-center text-sm font-mono text-text-secondary">04</span>
              Limitation of Liability
            </h2>
            <div className="pl-11">
              <p>LifePilot AI is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>
            </div>
          </section>
        </div>

        <div className="pt-12 border-t border-border text-center">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-primary text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            I Agree
          </button>
        </div>
      </div>
    </motion.div>
  );
};
