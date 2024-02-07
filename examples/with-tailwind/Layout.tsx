import React from "react";

interface LayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  footer: React.ReactNode;
  content: React.ReactNode;
}

export default function Layout({
  header,
  sidebar,
  footer,
  content,
}: LayoutProps) {
  // Changed the div structure with the "flex" property and "flex-col" for vertical layout
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-blue-500 text-white p-4">{header}</header>
      <div className="flex-grow flex overflow-hidden">
        <aside className="bg-gray-700 text-white w-64 p-4 overflow-y-auto">
          {sidebar}
        </aside>
        <main className="flex-grow p-4 overflow-y-auto">{content}</main>
      </div>
      <footer className="bg-gray-800 text-white p-4">{footer}</footer>
    </div>
  );
}

// Adjusted the __PREVIEW__ component to work correctly without props for preview purposes
export function __PREVIEW__() {
  // Applied placeholder content for the preview
  const headerContent = <div>Header Placeholder</div>;
  const sidebarContent = <div>Sidebar Placeholder</div>;
  const footerContent = <div>Footer Placeholder</div>;
  const mainContent = <div>Main Content Placeholder</div>;

  return (
    <Layout
      header={headerContent}
      sidebar={sidebarContent}
      footer={footerContent}
      content={mainContent}
    />
  );
}
