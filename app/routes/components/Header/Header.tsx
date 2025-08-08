import React from "react";

const Header: React.FC = () => {
  return (
    <header className="w-full bg-gradient-to-r from-[#6B4F3A] to-[#8B5E3C] shadow-md relative">
      {/* Subtle overlay pattern for retro texture */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://www.transparenttextures.com/patterns/paper-fibers.png')",
        }}
      ></div>

      <div className="relative max-w-6xl mx-auto px-6 py-5 flex items-center justify-center">
        <h1 className="text-3xl font-extrabold tracking-wide text-[#FDF6E3] drop-shadow-sm">
          Avlokan
        </h1>
      </div>
    </header>
  );
};

export default Header;
