import React from "react";
import Header from "../Header/Header";
import { Outlet } from "react-router";

const Layout: React.FC<{ context?: string[] }> = ({ context }) => {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", fontFamily: "var(--font-sans)" }}>
      <Header context={context} />
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 96px" }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
