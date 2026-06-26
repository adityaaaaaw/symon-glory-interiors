import React, { useState } from 'react';
import { Maximize2, ZoomIn, ZoomOut, Check, Edit3, X, ChevronLeft, ChevronRight } from 'lucide-react';

export const RenderComparison = ({ onApprove, onRevision }) => {
  const [version, setVersion] = useState('v2'); // 'v1' vs 'v2'
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [conceptStatus, setConceptStatus] = useState('Pending'); // 'Approved', 'Pending', 'Revision Requested'

  const imgV1 = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80'; // Classic Luxury
  const imgV2 = 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80'; // Modern Warm

  const handleSliderMove = (e) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const submitApproval = (status) => {
    setConceptStatus(status);
    if (status === 'Approved') {
      onApprove && onApprove(feedback);
    } else {
      onRevision && onRevision(feedback);
    }
    setFeedback('');
  };

  return (
    <div className="space-y-6">
      
      {/* Version select tabs & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-bgBase p-1 rounded-xl border border-borderColor">
          <button
            onClick={() => setVersion('v1')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              version === 'v1'
                ? 'bg-white text-accentGold shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Revision 1 (Classic Slate)
          </button>
          <button
            onClick={() => setVersion('v2')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              version === 'v2'
                ? 'bg-white text-accentGold shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Revision 2 (Golden Warmth)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary">Concept Status:</span>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            conceptStatus === 'Approved'
              ? 'bg-green-100 text-green-700'
              : conceptStatus === 'Revision Requested'
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {conceptStatus}
          </span>
        </div>
      </div>

      {/* Before/After Sliding Interface */}
      <div 
        className="relative w-full h-[400px] rounded-xl overflow-hidden border border-borderColor select-none cursor-ew-resize group shadow-md"
        onMouseMove={handleSliderMove}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {/* Revision 1 (Classic Slate) Background */}
        <img 
          src={imgV1} 
          alt="Revision 1" 
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Revision 2 (Golden Warmth) Clamped Overlay */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img 
            src={imgV2} 
            alt="Revision 2" 
            className="absolute inset-0 w-[100%] h-[100%] object-cover max-w-none"
            style={{ width: '100%', height: '400px', objectFit: 'cover' }}
          />
          <span className="absolute top-4 left-4 bg-white/80 text-primary text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md border border-borderColor">
            Revision 2
          </span>
        </div>
        
        <span className="absolute top-4 right-4 bg-white/80 text-primary text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md border border-borderColor">
          Revision 1
        </span>

        {/* Sliding Controller Line */}
        <div 
          className="absolute inset-y-0 w-1 bg-accentGold cursor-ew-resize pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-accentGold flex items-center justify-center shadow-lg pointer-events-auto">
            <ChevronLeft className="w-3.5 h-3.5 text-accentGold" />
            <ChevronRight className="w-3.5 h-3.5 text-accentGold" />
          </div>
        </div>

        {/* Zoom Overlay Trigger */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsZoomed(true); }}
          className="absolute bottom-4 right-4 p-2 bg-white/95 border border-borderColor hover:bg-accentGold hover:text-white rounded-lg shadow-lg transition-all transform group-hover:scale-105 duration-200"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Client Feedback Input */}
      {conceptStatus !== 'Approved' && (
        <div className="p-5 bg-white rounded-xl border border-borderColor space-y-4">
          <h4 className="font-poppins text-sm font-semibold text-primary flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-accentGold" /> Concept Feedback & Modifications
          </h4>
          <textarea
            className="w-full h-24 p-3 bg-bgBase text-sm text-primary border border-borderColor rounded-xl outline-none focus:border-accentGold placeholder-secondary resize-none"
            placeholder="Type any revisions (e.g. 'Can we swap the velvet fabric to linen? Change spotlights to warm yellow...')"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => submitApproval('Revision Requested')}
              disabled={!feedback.trim()}
              className="px-4 py-2 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              Request Changes
            </button>
            <button
              onClick={() => submitApproval('Approved')}
              className="px-5 py-2 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Approve Concept Design
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Portal */}
      {isZoomed && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/90 flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.75, prev - 0.25))}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setIsZoomed(false); setZoomLevel(1); }}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="w-full max-w-4xl h-[70vh] flex items-center justify-center overflow-hidden">
            <img 
              src={version === 'v1' ? imgV1 : imgV2} 
              alt="Zoomed concept render" 
              className="max-w-full max-h-full object-contain rounded transition-transform duration-250"
              style={{ transform: `scale(${zoomLevel})` }}
            />
          </div>
          <span className="mt-4 text-xs text-white/75 font-inter bg-white/10 px-3 py-1.5 rounded-full">
            Reviewing {version === 'v1' ? 'Revision 1 (Classic Slate)' : 'Revision 2 (Golden Warmth)'} • Zoom Level: {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};
