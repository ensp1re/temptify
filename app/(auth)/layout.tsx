import React, { FC } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return <main className="auth">{children}</main>;
};

export default Layout;
