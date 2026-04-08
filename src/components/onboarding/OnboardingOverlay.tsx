import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Rocket, 
  X, 
  Target, 
  Dumbbell, 
  Moon, 
  Clock, 
  Sun, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  ArrowRight,
  Brain,
  Fingerprint,
  Activity
} from 'lucide-react';

interface OnboardingOverlayProps {
  theme: any;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  onboardingData: any;
  setOnboardingData: (data: any) => void;
  completeOnboarding: () => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  theme,
  onboardingStep,
  setOnboardingStep,
  onboardingData,
  setOnboardingData,
  completeOnboarding
}) => {
  if (theme.id === 'simple') {
    return (
      <div className="fixed inset-0 z-[200] bg-white flex flex-col font-sans overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-border sticky top-0 bg-white/80 backdrop-blur-md z-20">
          <button onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))} className="text-text_secondary hover:text-text_primary">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 mx-8 h-3 bg-border rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(onboardingStep / 4) * 100}%` }}
              className="h-full bg-primary rounded-full"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Rocket size={14} className="text-primary" />
            </div>
          </div>
          <button onClick={() => completeOnboarding()} className="text-text_secondary hover:text-text_primary">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {onboardingStep === 1 && (
              <motion.div 
                key="simple-step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-md space-y-8"
              >
                <div className="space-y-4">
                  <h2 className="text-3xl font-extrabold text-text_primary leading-tight">
                    What's your main <span className="text-primary italic">mission?</span>
                  </h2>
                  <p className="text-text_secondary font-semibold">Choose the focus area where you want LifePilot AI to help you excel this week.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'focus', title: 'Deep Focus', desc: 'Eliminate distractions and crush your big projects.', icon: <Target className="text-primary" />, bg: 'bg-primary/10' },
                    { id: 'habits', title: 'Healthy Habits', desc: 'Consistency is key. Build routines that actually stick.', icon: <Dumbbell className="text-success" />, bg: 'bg-success/10' },
                    { id: 'sleep', title: 'Better Sleep', desc: 'Optimize your wind-down and wake up fully energized.', icon: <Moon className="text-secondary" />, bg: 'bg-secondary/10' },
                    { id: 'time', title: 'More Free Time', desc: 'Automate the boring stuff to focus on what you love.', icon: <Clock className="text-accent" />, bg: 'bg-accent/10' }
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => {
                        setOnboardingData((prev: any) => ({ ...prev, mission: item.id }));
                        setOnboardingStep(2);
                      }}
                      className={`w-full p-6 bg-surface border-2 rounded-[24px] flex items-center gap-6 text-left transition-all group active:scale-[0.98] ${onboardingData.mission === item.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    >
                      <div className={`size-14 rounded-2xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-extrabold text-text_primary">{item.title}</h4>
                        <p className="text-sm text-text_secondary font-medium">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {onboardingStep === 2 && (
              <motion.div 
                key="simple-step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-md space-y-8"
              >
                <div className="text-center space-y-4">
                  <div className="inline-block px-4 py-1 bg-accent text-black text-[10px] font-black uppercase tracking-widest rounded-full transform -rotate-2">Calibration</div>
                  <h2 className="text-3xl font-extrabold text-text_primary leading-tight">Let's set your flight plan</h2>
                  <p className="text-text_secondary font-semibold">Your pilot adapts to your natural rhythm. Tell us when you start and end your day.</p>
                </div>

                <div className="space-y-6">
                  <div className="p-8 bg-surface rounded-[32px] border-2 border-border space-y-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4 text-text_secondary/10"><Sun size={64} /></div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="size-12 bg-primary rounded-2xl flex items-center justify-center text-black shadow-lg shadow-primary/20">
                        <Sun size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-extrabold text-text_primary">Wake Up Time</h4>
                        <p className="text-xs text-text_secondary font-bold uppercase">Early Bird</p>
                      </div>
                    </div>
                    <div className="flex justify-center items-center gap-4 bg-background p-6 rounded-2xl border-2 border-border">
                      <div className="flex flex-col items-center">
                        <button 
                          onClick={() => {
                            const [h, m] = onboardingData.wakeTime.split(':');
                            const newH = (parseInt(h) % 12) + 1;
                            setOnboardingData((prev: any) => ({ ...prev, wakeTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                          }}
                          className="text-text_secondary hover:text-primary transition-colors"
                        ><ChevronUp size={20} /></button>
                        <div className="text-5xl font-black text-text_primary">{onboardingData.wakeTime}</div>
                        <button 
                          onClick={() => {
                            const [h, m] = onboardingData.wakeTime.split(':');
                            const newH = parseInt(h) === 1 ? 12 : parseInt(h) - 1;
                            setOnboardingData((prev: any) => ({ ...prev, wakeTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                          }}
                          className="text-text_secondary hover:text-primary transition-colors"
                        ><ChevronDown size={20} /></button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setOnboardingData((prev: any) => ({ ...prev, wakePeriod: 'AM' }))}
                          className={`px-4 py-1 text-xs font-black rounded-lg transition-all ${onboardingData.wakePeriod === 'AM' ? 'bg-primary text-black' : 'bg-surface text-text_secondary'}`}
                        >AM</button>
                        <button 
                          onClick={() => setOnboardingData((prev: any) => ({ ...prev, wakePeriod: 'PM' }))}
                          className={`px-4 py-1 text-xs font-black rounded-lg transition-all ${onboardingData.wakePeriod === 'PM' ? 'bg-primary text-black' : 'bg-surface text-text_secondary'}`}
                        >PM</button>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-surface rounded-[32px] border-2 border-border space-y-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4 text-text_secondary/10"><Moon size={64} /></div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="size-12 bg-secondary rounded-2xl flex items-center justify-center text-black shadow-lg shadow-secondary/20">
                        <Moon size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-extrabold text-text_primary">Bedtime</h4>
                        <p className="text-xs text-text_secondary font-bold uppercase">Night Owl</p>
                      </div>
                    </div>
                    <div className="flex justify-center items-center gap-4 bg-background p-6 rounded-2xl border-2 border-border">
                      <div className="flex flex-col items-center">
                        <button 
                          onClick={() => {
                            const [h, m] = onboardingData.bedTime.split(':');
                            const newH = (parseInt(h) % 12) + 1;
                            setOnboardingData((prev: any) => ({ ...prev, bedTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                          }}
                          className="text-text_secondary hover:text-secondary transition-colors"
                        ><ChevronUp size={20} /></button>
                        <div className="text-5xl font-black text-text_primary">{onboardingData.bedTime}</div>
                        <button 
                          onClick={() => {
                            const [h, m] = onboardingData.bedTime.split(':');
                            const newH = parseInt(h) === 1 ? 12 : parseInt(h) - 1;
                            setOnboardingData((prev: any) => ({ ...prev, bedTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                          }}
                          className="text-text_secondary hover:text-secondary transition-colors"
                        ><ChevronDown size={20} /></button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setOnboardingData((prev: any) => ({ ...prev, bedPeriod: 'AM' }))}
                          className={`px-4 py-1 text-xs font-black rounded-lg transition-all ${onboardingData.bedPeriod === 'AM' ? 'bg-secondary text-black' : 'bg-surface text-text_secondary'}`}
                        >AM</button>
                        <button 
                          onClick={() => setOnboardingData((prev: any) => ({ ...prev, bedPeriod: 'PM' }))}
                          className={`px-4 py-1 text-xs font-black rounded-lg transition-all ${onboardingData.bedPeriod === 'PM' ? 'bg-secondary text-black' : 'bg-surface text-text_secondary'}`}
                        >PM</button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {onboardingStep === 3 && (
              <motion.div 
                key="simple-step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full max-w-md space-y-12 flex flex-col items-center py-12"
              >
                <div className="relative size-48">
                  <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping"></div>
                  <div className="relative size-48 bg-primary rounded-full flex items-center justify-center text-black shadow-2xl shadow-primary/40">
                    <Sparkles size={64} />
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-black text-text_primary">Building your perfect day...</h2>
                  <p className="text-text_secondary font-semibold">Our AI is orchestrating your habits, goals, and breaks into a seamless flow.</p>
                </div>

                <div className="w-full space-y-4">
                  <div className="h-4 bg-surface rounded-full overflow-hidden relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 2 }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface border-t border-border sticky bottom-0">
          <div className="max-w-md mx-auto flex gap-4">
            <button 
              onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))}
              className="px-6 py-4 bg-surface border-2 border-border rounded-2xl text-text_secondary font-black uppercase tracking-widest hover:bg-background active:scale-95 transition-all"
            >
              Back
            </button>
            <button 
              onClick={() => {
                if (onboardingStep < 3) setOnboardingStep(onboardingStep + 1);
                else completeOnboarding();
              }}
              className="flex-1 py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest shadow-[0_4px_0_var(--color-primary-dark)] hover:brightness-110 active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-primary-dark)] transition-all flex items-center justify-center gap-3"
            >
              {onboardingStep === 3 ? 'Show me my day!' : 'Continue'}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Elite AI Onboarding (Original)
  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col grid-background overflow-y-auto no-scrollbar">
      {/* Onboarding Header */}
      <div className="flex items-center justify-between p-8 sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => completeOnboarding()}
            className="size-10 flex items-center justify-center rounded-xl bg-surface hover:bg-surface/80 text-text_secondary transition-all"
          >
            <X size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Calibration Sequence</span>
          </div>
        </div>
        <div className="bg-surface px-4 py-1.5 rounded-full border border-border">
          <span className="text-[10px] font-black uppercase tracking-widest text-text_secondary">Step 0{onboardingStep}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            {onboardingStep === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 sm:space-y-12"
              >
                <div className="text-center space-y-4">
                  <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-text_primary leading-none">LIFE <span className="text-primary">PILOT</span></h2>
                  <p className="text-text_secondary text-[10px] font-black uppercase tracking-[0.4em]">Your High-Performance Digital Partner</p>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-[48px] blur-xl opacity-50 group-hover:opacity-100 transition-all duration-1000"></div>
                  <div className="relative stitch-card p-6 sm:p-12 border-border flex flex-col items-center gap-8">
                    <div className="absolute top-6 right-8 text-right hidden sm:block">
                      <div className="text-[8px] font-black text-text_secondary uppercase tracking-widest mb-1">Core Status</div>
                      <div className="text-[10px] font-black text-primary uppercase tracking-widest">Stable // 98.4%</div>
                    </div>
                    
                    <div className="size-32 sm:size-48 rounded-[32px] sm:rounded-[40px] bg-surface border border-border flex items-center justify-center relative overflow-hidden shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                      <div className="relative z-10 size-16 sm:size-24 bg-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center text-primary border border-primary/20 shadow-2xl">
                        <Brain size={32} className="sm:size-[48px] animate-pulse-subtle" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20">
                        <div className="h-full bg-primary w-2/3 animate-pulse"></div>
                      </div>
                    </div>

                    <div className="text-center space-y-2">
                      <div className="text-[10px] font-black text-secondary uppercase tracking-widest">Neural Sync</div>
                      <div className="text-xs font-black text-text_primary uppercase tracking-[0.2em]">READY_FOR_BOOT</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="stitch-card p-6 sm:p-8 border-border space-y-4 hover:border-primary/20 transition-all group">
                    <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Sparkles size={20} className="sm:size-[24px]" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-text_primary">Autonomous Optimization</h4>
                      <p className="text-[10px] sm:text-xs text-text_secondary leading-relaxed">Dynamic scheduling that adapts to your physiological performance peaks.</p>
                    </div>
                  </div>
                  <div className="stitch-card p-6 sm:p-8 border-border space-y-4 hover:border-secondary/20 transition-all group">
                    <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                      <Fingerprint size={20} className="sm:size-[24px]" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-text_primary">Biometric Integration</h4>
                      <p className="text-[10px] sm:text-xs text-text_secondary leading-relaxed">Seamlessly bridges with your wearables for real-time life-state mapping.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 sm:pt-8">
                  <button 
                    onClick={() => setOnboardingStep(2)}
                    className="flex-1 py-6 sm:py-8 bg-primary text-black rounded-2xl sm:rounded-[24px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all group text-sm sm:text-base"
                  >
                    Begin Calibration
                    <ArrowRight size={20} className="sm:size-[24px] group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}
            
            {onboardingStep === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 sm:space-y-12"
              >
                <div className="space-y-4">
                  <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-text_primary leading-none">SET <br/><span className="text-primary">DIRECTIVES</span></h2>
                  <p className="text-text_secondary font-medium text-sm sm:text-lg max-w-lg">Define the operational parameters for your LifePilot AI. These goals will calibrate your cognitive environment and mission prioritizations.</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {[
                    { id: 'focus', title: 'Peak Focus', desc: 'Eliminate distractions and crush your big projects.', icon: <Target size={20} />, color: 'text-primary' },
                    { id: 'mastery', title: 'Calm Mastery', desc: 'Maintain equilibrium. Managed stress levels and sustainable productivity flow.', icon: <Moon size={20} />, color: 'text-secondary' },
                    { id: 'creative', title: 'Creative Velocity', desc: 'Maximize lateral thinking. AI-assisted ideation and high-output synthesis.', icon: <Sparkles size={20} />, color: 'text-accent' },
                    { id: 'physical', title: 'Physical Peak', desc: 'Bio-optimization. Integration with somatic data for peak physiological performance.', icon: <Activity size={20} />, color: 'text-danger' }
                  ].map(directive => (
                    <button 
                      key={directive.id}
                      onClick={() => {
                        setOnboardingData((prev: any) => ({ ...prev, directive: directive.id }));
                        setOnboardingStep(3);
                      }}
                      className={`stitch-card p-5 sm:p-8 border-2 transition-all text-left flex items-start gap-4 sm:gap-6 group relative overflow-hidden ${onboardingData.directive === directive.id ? 'border-primary bg-primary/5' : 'border-border hover:border-text_primary/20 hover:bg-surface/80'}`}
                    >
                      <div className={`size-10 sm:size-14 rounded-xl sm:rounded-2xl bg-surface flex items-center justify-center ${directive.color} group-hover:scale-110 transition-transform shrink-0`}>
                        {directive.icon}
                      </div>
                      <div className="space-y-1 sm:space-y-2 flex-1">
                        <h4 className={`text-lg sm:text-2xl font-black tracking-tight ${directive.color}`}>{directive.title}</h4>
                        <p className="text-text_secondary text-[10px] sm:text-sm leading-relaxed font-medium">{directive.desc}</p>
                      </div>
                      <div className="absolute top-4 right-4 size-1.5 sm:size-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 shadow-[0_0_10px_var(--color-primary)] transition-all"></div>
                    </button>
                  ))}
                </div>

                <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-8">
                  <div className="text-center space-y-1 sm:space-y-2">
                    <div className="text-[8px] sm:text-[10px] font-black text-text_secondary uppercase tracking-widest">Calibration Load</div>
                    <div className="text-2xl sm:text-4xl font-black text-text_primary">84%</div>
                  </div>
                  <div className="h-1.5 sm:h-2 w-full bg-surface rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '84%' }}
                      className="h-full bg-primary shadow-[0_0_15px_var(--color-primary-dark)]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-6 sm:gap-12 pt-2 sm:pt-4">
                  <div className="flex items-center gap-2">
                    <div className="size-1 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-[7px] sm:text-[8px] font-black text-text_secondary uppercase tracking-widest">Neural Link Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-1 bg-secondary rounded-full"></div>
                    <span className="text-[7px] sm:text-[8px] font-black text-text_secondary uppercase tracking-widest">Latency 14ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-1 bg-accent rounded-full"></div>
                    <span className="text-[7px] sm:text-[8px] font-black text-text_secondary uppercase tracking-widest">Encryption: Quantum</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 sm:pt-8">
                  <button 
                    onClick={() => setOnboardingStep(1)}
                    className="size-14 sm:size-20 bg-surface border border-border rounded-xl sm:rounded-2xl flex items-center justify-center text-text_secondary hover:text-text_primary hover:bg-surface/80 transition-all"
                  >
                    <ChevronLeft size={20} className="sm:size-[24px]" />
                  </button>
                  <button 
                    onClick={() => setOnboardingStep(3)}
                    className="flex-1 py-4 sm:py-6 bg-primary text-black rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-3 text-sm sm:text-base"
                  >
                    <ArrowRight size={20} className="sm:size-[24px]" />
                  </button>
                </div>
              </motion.div>
            )}


            {onboardingStep === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 sm:space-y-12"
              >
                <div className="text-center space-y-4">
                  <p className="text-primary text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em]">Core Processing</p>
                  <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-text_primary leading-none">SYSTEM <br/>SYNTHESIS</h2>
                </div>

                <div className="flex justify-center py-6 sm:py-12">
                  <div className="relative size-48 sm:size-64 flex items-center justify-center">
                    <svg className="absolute inset-0 size-full -rotate-90">
                      <circle 
                        cx="96" cy="96" r="88" 
                        className="sm:hidden text-white/5"
                        fill="none" stroke="currentColor" strokeWidth="4" 
                      />
                      <circle 
                        cx="128" cy="128" r="120" 
                        className="hidden sm:block text-white/5"
                        fill="none" stroke="currentColor" strokeWidth="4" 
                      />
                      <motion.circle 
                        cx="96" cy="96" r="88" 
                        fill="none" stroke="currentColor" strokeWidth="4" 
                        strokeDasharray="553"
                        initial={{ strokeDashoffset: 553 }}
                        animate={{ strokeDashoffset: 553 * (1 - 0.84) }}
                        className="sm:hidden text-primary"
                        strokeLinecap="round"
                      />
                      <motion.circle 
                        cx="128" cy="128" r="120" 
                        fill="none" stroke="currentColor" strokeWidth="4" 
                        strokeDasharray="754"
                        initial={{ strokeDashoffset: 754 }}
                        animate={{ strokeDashoffset: 754 * (1 - 0.84) }}
                        className="hidden sm:block text-primary"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="text-center space-y-1">
                      <div className="text-4xl sm:text-6xl font-black tracking-tighter text-text_primary">84%</div>
                      <div className="text-[8px] sm:text-[10px] font-black text-text_secondary uppercase tracking-widest">Integrity</div>
                    </div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 sm:size-2 bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)]"></div>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {[
                    { label: 'Neural Link', status: 'Analyzing focus peaks across circadian rhythms...', progress: 65, color: 'bg-primary' },
                    { label: 'Architect', status: 'Architecting mission matrix for maximum output...', progress: 100, color: 'bg-secondary' },
                    { label: 'Sync', status: 'Synchronizing life-pilot protocols to biological baseline...', progress: 45, color: 'bg-accent' }
                  ].map(proc => (
                    <div key={proc.label} className="stitch-card p-5 sm:p-6 border-border space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-1.5 sm:size-2 rounded-full ${proc.color}`}></div>
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-text_primary">{proc.label}</span>
                      </div>
                      <p className="text-[10px] sm:text-xs font-medium text-text_secondary">{proc.status}</p>
                      <div className="h-1 sm:h-1.5 w-full bg-surface rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${proc.progress}%` }}
                          className={`h-full ${proc.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-4 sm:pt-8">
                  <button 
                    onClick={() => setOnboardingStep(2)}
                    className="size-14 sm:size-20 bg-surface border border-border rounded-xl sm:rounded-2xl flex items-center justify-center text-text_secondary hover:text-text_primary hover:bg-surface/80 transition-all"
                  >
                    <ChevronLeft size={20} className="sm:size-[24px]" />
                  </button>
                  <div className="flex-1 flex flex-col items-center justify-center gap-1.5 sm:gap-2">
                    <div className="h-1 w-24 sm:w-32 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[84%]"></div>
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-text_secondary uppercase tracking-widest">84% Compiled</span>
                  </div>
                  <button 
                    onClick={() => setOnboardingStep(4)}
                    className="size-14 sm:size-20 bg-primary text-bg-dark rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 hover:brightness-110 transition-all"
                  >
                    <ArrowRight size={20} className="sm:size-[24px]" />
                  </button>
                </div>
              </motion.div>
            )}

            {onboardingStep === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 sm:space-y-12"
              >
                <div className="space-y-4">
                  <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-text_primary leading-none">CALIBRATE <br/><span className="text-primary">ROUTINE</span></h2>
                  <p className="text-primary text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em]">Protocol 8.4: Chronotype Alignment</p>
                </div>

                <div className="stitch-card p-6 sm:p-12 border-border flex flex-col items-center gap-6 sm:gap-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
                  <div className="text-[8px] sm:text-[10px] font-black text-text_secondary uppercase tracking-widest">Primary Awakening</div>
                  <div className="flex items-center gap-4 sm:gap-8">
                    <div className="flex flex-col items-center">
                      <button 
                        onClick={() => {
                          const [h, m] = onboardingData.wakeTime.split(':');
                          const newH = (parseInt(h) % 12) + 1;
                          setOnboardingData((prev: any) => ({ ...prev, wakeTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                        }}
                        className="text-text_secondary hover:text-primary transition-colors"
                      ><ChevronUp size={32} /></button>
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <span className="text-5xl sm:text-8xl font-black tracking-tighter text-text_primary">{onboardingData.wakeTime}</span>
                        <span className="text-lg sm:text-2xl font-black text-text_secondary uppercase">{onboardingData.wakePeriod}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const [h, m] = onboardingData.wakeTime.split(':');
                          const newH = parseInt(h) === 1 ? 12 : parseInt(h) - 1;
                          setOnboardingData((prev: any) => ({ ...prev, wakeTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                        }}
                        className="text-text_secondary hover:text-primary transition-colors"
                      ><ChevronDown size={32} /></button>
                    </div>
                  </div>
                  <div 
                    onClick={() => setOnboardingData((prev: any) => ({ ...prev, wakePeriod: prev.wakePeriod === 'AM' ? 'PM' : 'AM' }))}
                    className="relative size-48 sm:size-64 group cursor-pointer active:scale-95 transition-all"
                  >
                    <div className="absolute inset-0 border border-border rounded-[32px] sm:rounded-[48px] rotate-45"></div>
                    <div className="absolute inset-3 sm:inset-4 border border-border rounded-[28px] sm:rounded-[40px] rotate-45"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-4">
                      <div className="size-12 sm:size-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                        <Sparkles size={24} className="sm:size-[32px]" />
                      </div>
                      <div className="text-[8px] sm:text-[10px] font-black text-text_primary uppercase tracking-widest">Set Wake Time</div>
                    </div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-3 sm:size-4 bg-primary rounded-full shadow-[0_0_15px_var(--color-primary)] border-2 sm:border-4 border-background"></div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 sm:pt-8">
                  <button 
                    onClick={() => setOnboardingStep(3)}
                    className="size-14 sm:size-20 bg-surface border border-border rounded-xl sm:rounded-2xl flex items-center justify-center text-text_secondary hover:text-text_primary hover:bg-surface/80 transition-all"
                  >
                    <ChevronLeft size={20} className="sm:size-[24px]" />
                  </button>
                  <button 
                    onClick={() => completeOnboarding()}
                    className="flex-1 py-6 sm:py-8 bg-primary text-black rounded-2xl sm:rounded-[24px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all group text-sm sm:text-base"
                  >
                    Initialize Pilot
                    <ArrowRight size={20} className="sm:size-[24px] group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
