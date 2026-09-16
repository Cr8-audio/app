import React from 'react';
// import Banner from '@/components/Banner';
import { HeroSection } from '@/lib/components/waitlist';
// import Image from 'next/image';
// import Link from 'next/link';
import { Github, X } from 'lucide-react';

const Waitlist: React.FC = () => {
  return (
    <div>
      <header
        className="bg-white text-black p-6 flex justify-between items-center shadow-lg"
        style={{
          backgroundImage: 'radial-gradient(#FFDC58 1px, transparent 1px)',
          backgroundSize: '10px 10px',
        }}
      >
        <div className="flex items-center">
          <img
            src="/logo.svg"
            alt="Crate Logo"
            width={64}
            height={64}
            className="w-16 h-16"
          />
          {/* <h1 className="text-2xl font-heading text-black ml-4">Welcome to Crate</h1> */}
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/orgs/Crate-AI/repositories"
            className="transition-transform duration-300 hover:scale-110"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="p-2 rounded-md border-2 border-black shadow-light dark:shadow-dark">
              <Github className="w-8 h-8" />
            </div>
          </a>
          <a
            href="https://x.com/zpaprikaf"
            className="transition-transform duration-300 hover:scale-110"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="p-2 rounded-md border-2 border-black shadow-light dark:shadow-dark">
              <X className="w-8 h-8" />
            </div>
          </a>
        </div>
      </header>
      <HeroSection />
    </div>
  );
};

export default Waitlist;
