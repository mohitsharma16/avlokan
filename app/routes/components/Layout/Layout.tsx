import React from "react";
import Header from "../Header/Header";
import { Outlet } from "react-router";

const Layout: React.FC = () => {
  return (
    <div className="layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
