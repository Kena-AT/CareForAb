"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Heart, Activity, Pill, Shield, ChevronRight, CheckCircle2, ArrowRight, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export default function WelcomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Remove automatic redirection to allow logged-in users to see the redesigned Welcome page
  // They can navigate to the dashboard manually via the navbar
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-primary">CareForAb</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auth">
              <span className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">Login</span>
            </Link>
            <Link href="/auth?mode=signup">
              <Button size="sm" className="rounded-full px-6 bg-primary hover:bg-primary/90">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-8"
            >
              <motion.div variants={itemVariants} className="space-y-2">
                <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">Personalized Health Intelligence</span>
                <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight text-foreground">
                  Healthcare that <br />
                  feels <span className="text-primary italic">human</span> again.
                </h1>
              </motion.div>
              
              <motion.p variants={itemVariants} className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                CareForAb bridges the gap between clinical data and empathetic care. 
                Monitor your vitals, track medications, and protect your health data with precision.
              </motion.p>

              <motion.div variants={itemVariants}>
                <Link href={user ? "/dashboard" : "/auth?mode=signup"}>
                  <Button size="lg" className="h-14 px-8 text-base font-bold rounded-full bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 group">
                    {user ? "Go to Dashboard" : "Get Started Today"}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative aspect-square md:aspect-[4/3] flex items-center justify-center"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/5 rounded-full blur-[100px] -z-10" />
              <div className="relative w-full h-full max-w-md mx-auto">
                {/* Smartphone Mockup */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-[3rem] -rotate-3 border border-primary/10" />
                <div className="relative w-full h-full bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl overflow-hidden ring-8 ring-slate-100">
                   <img 
                    src="/images/hero-phone.png"
                    alt="CareForAb Dashboard" 
                    className="w-full h-full object-cover rounded-[1.8rem]"
                  />
                  {/* Floating Stat Card */}
                  <div className="absolute bottom-12 -left-8 bg-white p-4 rounded-2xl shadow-xl space-y-2 border border-slate-100 animate-pulse-gentle">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary">
                      <Heart className="w-3 h-3 fill-primary" /> HEART RATE
                    </div>
                    <div className="text-2xl font-bold font-mono tracking-tight">72 BPM</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Precision Monitoring Section */}
        <section className="py-24 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Precision Monitoring. Deep Care.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed">
              A seamless experience designed to help you manage your holistic health journey with empathy and efficiency.
            </p>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 grid md:grid-cols-2 lg:grid-cols-7 gap-6">
            {/* Medication Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="lg:col-span-4 p-8 md:p-12 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex flex-col md:flex-row gap-8 items-center overflow-hidden h-auto min-h-[450px]"
            >
              <div className="flex-1 space-y-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Pill size={24} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold tracking-tight">Intelligent Medication Tracking</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our smart reminders adapt to your schedule and notify you when it's time for a refill, 
                    ensuring you stay on track with your health goals.
                  </p>
                </div>
                <ul className="space-y-3">
                  {['Automatic interaction warnings', 'Timely refill reminders', 'Adherence statistics'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-primary" strokeWidth={3} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 relative w-full h-64 md:h-full">
                <img 
                  src="/images/pill-bottle.png" 
                  alt="Medication"
                  className="w-full h-full object-contain md:scale-150 md:translate-x-12"
                />
              </div>
            </motion.div>

            {/* Privacy Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="lg:col-span-3 p-8 rounded-[2rem] bg-primary text-primary-foreground flex flex-col justify-between h-[400px]"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Privacy First</h3>
                  <p className="text-primary-foreground/70 text-sm leading-relaxed">
                    Personal health data is sensitive. We believe health data belongs to the patient, always.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  End-to-end encrypted
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Brand Values Footer Section */}
        <section className="py-24 bg-white border-t border-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              {[
                { label: 'SECURE', value: 'PRIVACY GUARANTEED' },
                { label: 'CLINICAL', value: 'MEDICAL STANDARDS' },
                { label: 'UNIFIED', value: 'HOLISTIC VIEW' },
                { label: 'RELIABLE', value: 'ALWAYS CONNECTED' },
              ].map((stat) => (
                <div key={stat.label} className="text-center space-y-1">
                  <p className="text-[10px] font-black tracking-[0.2em] text-primary">{stat.label}</p>
                  <p className="text-xs font-medium text-slate-400">{stat.value}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-24 pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 grayscale group hover:opacity-100 hover:grayscale-0 transition-all">
              <span className="text-sm font-bold tracking-tight text-primary">CareForAb</span>
              <p className="text-xs font-medium">© 2026 K.A.Y.E. All rights reserved.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
