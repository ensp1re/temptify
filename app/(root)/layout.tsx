import MobileNav from "@/components/shared/MobileNav";
import Sidebar from "@/components/shared/Sidebar";
import React, { FC } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <main className="root">
      <Sidebar />
      <MobileNav  />
      <div className="root-container">
        <div className="wrapper">{children}</div>
      </div>
    </main>
  );
};

export default Layout;
