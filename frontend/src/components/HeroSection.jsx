import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Check, ArrowRight } from 'lucide-react';
import furnishedRoomImg from '../assets/furnished_room.jpg';

export const HeroSection = () => {
  const navigate = useNavigate();

  // Animation settings for both buttons to guarantee consistent timing
  const buttonTransition = {
    type: "spring",
    stiffness: 400,
    damping: 25
  };

  return (
    <section 
      className="relative w-full min-h-[75vh] sm:min-h-[80vh] lg:min-h-[92vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-20 overflow-hidden bg-center bg-no-repeat"
      style={{ 
        backgroundImage: `url(${furnishedRoomImg})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      }}
    >
      {/* Soft warm ivory color tint overlay to harmonize the image with the site theme */}
      <div className="absolute inset-0 bg-[#FAF6F0]/20 pointer-events-none"></div>
 
      {/* Floating Centered Translucent Glassmorphism Content Panel */}
      <div className="relative z-10 w-full max-w-[1000px] bg-[#FAF6F0]/70 backdrop-blur-lg border border-white/60 p-5 sm:p-8 md:p-12 lg:p-14 rounded-2xl sm:rounded-[32px] shadow-[0_30px_70px_rgba(28,28,28,0.1)] space-y-5 sm:space-y-7 text-center transition-all duration-500 hover:shadow-[0_35px_80px_rgba(28,28,28,0.14)]">
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C5A880] block font-poppins">
            Interior Architecture Studio
          </span>
          <div className="w-8 h-[1px] bg-[#C5A880]/50 mx-auto mt-1"></div>
        </div>
        
        <h1 
          className="font-poppins text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold text-[#1C1C1C] mx-auto"
          style={{ maxWidth: '900px', lineHeight: '1.1', letterSpacing: '-0.02em' }}
        >
          Every Beautiful Interior
          <br className="hidden sm:inline" /> Begins With An <span className="text-[#C5A880] whitespace-nowrap">Empty Space</span>
        </h1>
        
        <p className="text-[#4C4C4C] text-sm sm:text-base leading-relaxed max-w-lg mx-auto font-inter font-light">
          Book a professional site visit and get matched with the right design expert for your space.
        </p>

        {/* Buttons Wrapper: Flex-col on mobile (stacking, stretching) and Flex-row on desktop */}
        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 pt-2 w-full max-w-sm sm:max-w-none mx-auto">
          
          {/* Primary Button */}
          <motion.button 
            onClick={() => navigate('/booking')}
            whileHover={{ 
              y: -4, 
              backgroundColor: "#C5A880", 
              color: "#1F1F1F",
              boxShadow: "0px 10px 20px rgba(197, 168, 128, 0.4)" 
            }}
            transition={buttonTransition}
            className="w-full sm:w-56 min-h-[48px] bg-[#1F1F1F] text-white font-poppins font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2.5 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 focus:ring-offset-white"
            aria-label="Book a site visit consultation"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Book Site Visit</span>
          </motion.button>

          {/* Secondary Button */}
          <motion.button 
            onClick={() => navigate('/login')}
            whileHover={{ 
              y: -4, 
              borderColor: "#C5A880", 
              color: "#C5A880",
              boxShadow: "0px 10px 20px rgba(28, 28, 28, 0.08)"
            }}
            transition={buttonTransition}
            className="w-full sm:w-56 min-h-[48px] bg-white border-2 border-[#1F1F1F] text-[#1F1F1F] font-poppins font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2.5 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 focus:ring-offset-white"
            aria-label="Log in to portal"
          >
            <span>Portal Login</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </motion.button>

        </div>

        {/* Premium Horizontal Trust Bar */}
        <div className="border-t border-[#C5A880]/20 pt-8 mt-4">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3.5 text-[9px] font-bold text-[#1C1C1C] font-poppins tracking-tight uppercase">
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-[#C5A880] stroke-[3]" />
              <span>Professional Site Visits</span>
            </div>
            <span className="text-[#C5A880]/35 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-[#C5A880] stroke-[3]" />
              <span>Smart Designer Assignment</span>
            </div>
            <span className="text-[#C5A880]/35 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-[#C5A880] stroke-[3]" />
              <span>Fast Scheduling</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
