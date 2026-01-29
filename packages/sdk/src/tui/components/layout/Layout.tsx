import React from "react";
import { useTheme } from "../../theme/styles";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const theme = useTheme("dark");

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor={theme.colors.background}
    >
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <box flexDirection="row" flexGrow={1}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <box
          flexGrow={1}
          padding={theme.spacing.md}
          flexDirection="column"
        >
          {children}
        </box>
      </box>

      {/* Footer */}
      <Footer />
    </box>
  );
}
