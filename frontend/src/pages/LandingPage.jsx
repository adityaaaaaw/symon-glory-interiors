import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  X, 
  Star, 
  Calendar, 
  UserCheck, 
  FileText
} from 'lucide-react';
import { HeroSection } from '../components/HeroSection';

export const LandingPage = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  
  // Scroll detection for Navbar transparency transitions
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const services = [
    {
      title: 'Residential Site Assessment',
      desc: 'On-site dimensions, moisture audits, load wall analysis, and 3D spatial mapping for villas and apartments.',
      pic: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80',
      tag: 'Technical Audit'
    },
    {
      title: 'Commercial Layout Mapping',
      desc: 'Professional coordinate drafting, egress mapping, lighting vector scans, and electrical layout audits.',
      pic: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
      tag: 'Office & Retail'
    },
    {
      title: 'Modular Fit-Out Inspections',
      desc: 'Accurate kitchen/wardrobe plumb verification, appliance electrical placement, and quartz refit checks.',
      pic: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=600&q=80',
      tag: 'Modular Systems'
    },
    {
      title: 'Structural Feasibility Audits',
      desc: 'Turnkey spatial restructuring feasibility checks, load calculations, and technical wall assessments.',
      pic: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      tag: 'Renovation Engineering'
    }
  ];

  const steps = [
    {
      num: '01',
      title: 'Book a Visit',
      desc: 'Schedule a dimension mapping slot detailing location coordinates.',
      icon: Calendar
    },
    {
      num: '02',
      title: 'Smart Assignment',
      desc: 'The CRM maps regional coordinates to allocate the top-rated available lead.',
      icon: UserCheck
    },
    {
      num: '03',
      title: 'Site Summary Report',
      desc: 'Inspector completes checks, generating summaries, follow-ups, and actions.',
      icon: FileText
    }
  ];

  const testimonials = [
    {
      quote: "The site visit booking was seamless, and the assigned designer mapped our Sobha Primrose apartment in 3D. The PDF reports are incredibly thorough.",
      author: "Vikram Sharma",
      role: "Apartment Renovation",
      avatar: "VS",
      rating: 5
    },
    {
      quote: "We loved the automated assignment transparency. The designer had a 4.9★ workload ranking and mapped our site vector plans beautifully.",
      author: "Aditya",
      role: "Bespoke Villa Construction",
      avatar: "A",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F0] text-[#1C1C1C] transition-colors duration-200">
      
      {/* 1. Transparent Navigation header overlay */}
      <nav className={`fixed top-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#C5A880]/15 shadow-sm' 
          : 'bg-transparent border-b border-transparent'
      }`}>
        <Link to="/" className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-[#1C1C1C] flex items-center justify-center font-bold text-[#C5A880] text-base shadow-sm">G</div>
          <span className="font-poppins font-extrabold text-[#1C1C1C] tracking-tight text-base">
            Glory Simon <span className="text-[#C5A880] font-normal">Studio</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link 
            to="/login"
            className="px-4 py-2 text-xs font-bold border border-slate-300/40 text-slate-800 rounded-xl hover:bg-slate-900/5 transition-all font-poppins uppercase tracking-wider"
          >
            Portal Login
          </Link>
          <Link 
            to="/booking"
            className="px-4 py-2 text-xs font-bold bg-[#1C1C1C] hover:bg-neutral-800 text-white rounded-xl active:scale-95 transition-all shadow-sm uppercase tracking-wider font-poppins"
          >
            Book Site Visit
          </Link>
        </div>
      </nav>

      {/* 2. Hero Section (full-bleed photo with ivory overlay) */}
      <HeroSection />

      {/* 3. How It Works (Timeline Roadmap) */}
      <section className="py-24 px-6 bg-[#FAF6F0] w-full border-t border-[#C5A880]/10">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C5A880] block font-poppins">
              The Protocol
            </span>
            <h2 className="font-poppins text-3xl font-extrabold text-[#1C1C1C] tracking-tight">How It Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="space-y-4 text-left group">
                  <div className="flex items-center justify-between border-b border-[#C5A880]/15 pb-4">
                    <h3 className="font-poppins font-bold text-sm text-[#1C1C1C] tracking-tight">{s.title}</h3>
                    <span className="font-poppins font-extrabold text-3xl text-[#C5A880]/30 group-hover:text-[#C5A880] transition-colors">{s.num}</span>
                  </div>
                  <p className="text-xs text-[#5C5C5C] leading-relaxed font-inter font-light">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Services Portfolio */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#FAF6F0] via-white/20 to-[#FAF6F0] border-y border-[#C5A880]/10 w-full">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C5A880] block font-poppins">
              Our Expertise
            </span>
            <h2 className="font-poppins text-3xl font-extrabold text-[#1C1C1C] tracking-tight">Turnkey Design Services</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {services.map((serv, index) => (
              <div 
                key={index}
                className="group relative flex flex-col justify-end h-[400px] rounded-3xl overflow-hidden shadow-sm border border-[#C5A880]/10"
              >
                {/* Visual portfolio image */}
                <img 
                  src={serv.pic} 
                  alt={serv.title} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent"></div>
                
                {/* Content Overlay */}
                <div className="relative z-10 p-8 space-y-2 text-white text-left">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#C5A880] bg-[#FAF6F0]/10 px-2 py-0.5 rounded border border-white/10 inline-block">
                    {serv.tag}
                  </span>
                  <h3 className="font-poppins font-extrabold text-lg">{serv.title}</h3>
                  <p className="text-xs text-slate-350 font-light leading-relaxed max-w-sm">{serv.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Client Testimonials */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#FAF6F0] via-white/30 to-[#FAF6F0] border-t border-[#C5A880]/10 w-full">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C5A880] block font-poppins">
              Testimonials
            </span>
            <h2 className="font-poppins text-3xl font-extrabold text-[#1C1C1C] tracking-tight">Client Perspectives</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {testimonials.map((test, index) => (
              <div 
                key={index}
                className="space-y-6 text-left border-l-2 border-[#C5A880]/20 pl-6 flex flex-col justify-between"
              >
                <p className="text-sm md:text-base text-[#4C4C4C] leading-relaxed italic font-light font-inter">
                  "{test.quote}"
                </p>
                
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="block text-xs font-bold text-[#1C1C1C] font-poppins">{test.author}</span>
                    <span className="block text-[10px] text-[#C5A880] font-medium uppercase tracking-wider mt-0.5">{test.role}</span>
                  </div>
                  
                  <div className="flex items-center gap-0.5">
                    {[...Array(test.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-[#C5A880] text-[#C5A880]" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Full-Width Final CTA */}
      <section className="w-full bg-[#1C1C1C] text-white py-28 px-6 relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C5A880]/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-2xl mx-auto space-y-8 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C5A880] block font-poppins">
            Studio Booking
          </span>
          <h2 className="font-poppins text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Ready to design your space?
          </h2>
          <p className="text-xs md:text-sm text-neutral-450 max-w-lg mx-auto leading-relaxed font-inter font-light">
            Schedule a certified site verification. Our calendar routing allocates available territory experts to inspect, take dimensions, and plan layout outlines.
          </p>
          
          <div className="pt-2">
            <button
              onClick={() => navigate('/booking')}
              className="px-8 py-4 bg-[#C5A880] hover:bg-[#C5A880]/90 text-[#1C1C1C] font-bold text-xs rounded-xl shadow-lg transition-all uppercase tracking-wider font-poppins inline-flex items-center gap-1.5"
            >
              Book Site Visit
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 text-xs py-8 border-t border-slate-900 text-center w-full">
        <div className="max-w-6xl mx-auto px-6 space-y-4">
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[#FAF6F0] flex items-center justify-center font-bold text-primary text-xs text-[#C5A880]">G</div>
            <span className="font-poppins font-bold text-white tracking-tight">Glory Simon Interiors</span>
          </div>
          <p className="text-[10px] text-slate-650">
            &copy; {new Date().getFullYear()} Glory Simon Interiors. All rights reserved. Turnkey scheduling modules.
          </p>
        </div>
      </footer>

    </div>
  );
};
