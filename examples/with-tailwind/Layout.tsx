import React from "react"; // Import has been changed to default import

type LayoutProps = {
  children: React.ReactNode; // ReactNode updated to React.ReactNode
};

type HeaderProps = {
  // Props definition for Header if needed
};

type FooterProps = {
  // Props definition for Footer if needed
};

// Header component definition
// Header styling has been enhanced
const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto">
        {" "}
        {/* Added container for alignment */}
        <h1 className="text-xl font-bold">Header</h1>
        <nav className="mt-2">
          {/* Navigation added */}
          <ul className="flex space-x-4">
            {" "}
            {/* Flex layout for navigation */}
            <li className="hover:text-blue-300">Home</li>
            <li className="hover:text-blue-300">About</li>
            <li className="hover:text-blue-300">Contact</li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

// Footer component definition
const Footer: React.FC<FooterProps> = () => {
  return <footer className="bg-blue-500 text-white p-4">Footer</footer>;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header /> {/* Using Header component */}
      <main className="flex-1 p-4">{children}</main>
      <Footer /> {/* Using Footer component */}
    </div>
  );
};

export default Layout;

export function __PREVIEW__() {
  return (
    <Layout>
      <div className="text-center p-4">
        <h2 className="font-bold text-lg mb-4">
          Welcome to the Layout Preview
        </h2>
        <p>This is an example of content within the shared layout.</p>
      </div>
    </Layout>
  );
}
