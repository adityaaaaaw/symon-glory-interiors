import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Command, Sun, Moon, Sparkles, BookOpen, Layers, Check } from 'lucide-react';

export const CommandPalette = () => {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, currentTab, setCurrentTab, user } = useApp();
  const [search, setSearch] = useState('');

  // Key event listeners for Ctrl+K and /
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.key === 'k') || e.key === '/') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands = [
    { name: 'Book Site Visit Appointment', category: 'Client Portal', action: () => { setCurrentTab('booking'); setIsCommandPaletteOpen(false); }, icon: Sparkles },
    { name: 'View Client Dashboard Portal', category: 'Client Portal', action: () => { setCurrentTab('portal'); setIsCommandPaletteOpen(false); }, icon: Layers },
    { name: 'View Admin CRM Dashboard', role: 'admin', category: 'Management', action: () => { setCurrentTab('crm'); setIsCommandPaletteOpen(false); }, icon: Command },
    { name: 'Return to Homepage', category: 'General', action: () => { setCurrentTab('home'); setIsCommandPaletteOpen(false); }, icon: BookOpen }
  ];

  // Filter commands by query and user role
  const filtered = commands.filter(cmd => {
    if (cmd.role && user?.role !== cmd.role) return false;
    return cmd.name.toLowerCase().includes(search.toLowerCase()) || cmd.category.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-[#0F172A]/40 backdrop-blur-sm transition-opacity duration-200">
      <div className="w-full max-w-xl bg-white border border-borderColor rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-borderColor bg-bgBase">
          <Search className="w-5 h-5 text-secondary" />
          <input
            type="text"
            className="w-full bg-transparent text-sm text-primary outline-none placeholder-secondary"
            placeholder="Type a command or search platform sections... (ESC to close)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-xs text-secondary bg-white border border-borderColor rounded shadow-sm">
            esc
          </kbd>
        </div>

        {/* Action list */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length > 0 ? (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={i}
                  onClick={cmd.action}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm text-secondary hover:bg-bgBase hover:text-primary rounded-xl transition-colors duration-150 group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-accentGold group-hover:scale-110 transition-transform" />
                    <span>{cmd.name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-borderColor/40 rounded text-secondary">
                    {cmd.category}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="text-center py-8 text-sm text-secondary">
              No command matches found. Try typing <span className="font-semibold text-accentGold">"visit"</span> or <span className="font-semibold text-accentGold">"dashboard"</span>.
            </div>
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="flex items-center justify-between px-4 py-2 bg-bgBase border-t border-borderColor text-[11px] text-secondary">
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3 text-accentGold" /> Search Palette Active
          </span>
          <span>Press <kbd className="px-1 border border-borderColor rounded bg-white shadow-sm">Ctrl+K</kbd> anywhere</span>
        </div>
      </div>
    </div>
  );
};
