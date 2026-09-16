import React from 'react';

const CrateLogo: React.FC = () => {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center bg-black m-12">
      <div className="perspective">
        <div className="absolute w-full h-1/4 bg-gray-700 bottom-0 animate-assembleBottom"></div>
        <div className="absolute w-1/4 h-full bg-gray-800 left-0 animate-assembleLeft"></div>
        <div className="absolute w-1/4 h-full bg-gray-800 right-0 animate-assembleRight"></div>
        <div className="absolute w-full h-1/4 bg-gray-700 top-0 animate-assembleTop"></div>
        <div className="absolute w-full h-full bg-gray-900 opacity-75 animate-fadeIn"></div>{' '}
        {/* Optional front face */}
      </div>
    </div>
  );
};

export default CrateLogo;
