import React from 'react';

const Logo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 160 40"
    className="h-8 w-auto"
    fill="currentColor"
  >
    <path
      d="M58.33,2.4a8.33,8.33,0,0,1,8.34,8.33V29.27a8.33,8.33,0,0,1-16.67,0V10.73a8.33,8.33,0,0,1,8.33-8.33m0,3.33a5,5,0,0,0-5,5v18.54a5,5,0,1,0,10,0V10.73a5,5,0,0,0-5-5"
      transform="translate(0 0)"
    />
    <path
      d="M3.33,10.73a8.33,8.33,0,0,1,8.34-8.33H22.92a5,5,0,0,1,0,10H15v4.17h7.92a5,5,0,0,1,0,10H15v9.17a5,5,0,1,1-10,0V10.73Z"
      transform="translate(0 0)"
    />
    <path
      d="M29.17,10.73a8.33,8.33,0,0,1,8.33-8.33h1.25a5,5,0,0,1,0,10H37.5v16.67a5,5,0,1,1-10,0V10.73h1.67Z"
      transform="translate(0 0)"
    />
    <path
      d="M72.92,10.73a8.33,8.33,0,0,1,8.33-8.33h1.25a5,5,0,0,1,0,10H81.25v16.67a5,5,0,1,1-10,0V10.73h1.67Z"
      transform="translate(0 0)"
    />
    <path
      d="M87.5,10.73a8.33,8.33,0,0,1,8.33-8.33h6.25a8.33,8.33,0,0,1,8.34,8.33V29.27a5,5,0,1,1-10,0V22.92h-2.92v6.35a5,5,0,1,1-10,0V10.73m12.92,8.34V10.73a5,5,0,0,0-5-5H91.67a5,5,0,0,0-5,5v18.54a1.67,1.67,0,1,0,3.33,0V22.92h5a5,5,0,0,1,5,5,1.67,1.67,0,1,0,3.33,0V22.08a8.33,8.33,0,0,1-8.33-8.33"
      transform="translate(0 0)"
    />
    <path
      d="M112.5,5.73a5,5,0,0,1,5,5V29.27a5,5,0,1,1-10,0v-10h-2.5a5,5,0,1,1,0-10h12.5a5,5,0,1,1,0,10h-1.67v10a1.67,1.67,0,1,0,3.33,0V10.73a8.33,8.33,0,0,0-8.33-8.33,5,5,0,0,1-3.33,9.17V9.09a5,5,0,0,1,5-5Z"
      transform="translate(0 0)"
    />
    <path
      d="M129.58,18.42a5,5,0,0,1,4.58-4.92,4.86,4.86,0,0,1,5.1,4.08,8.23,8.23,0,0,1,.4,2.6,8.33,8.33,0,0,1-8.33,8.33H129a5,5,0,0,1,0-10h2.17a1.67,1.67,0,0,0,0-3.33H129a8.33,8.33,0,0,1,0-16.67h12.5a8.33,8.33,0,0,1,8.33,8.33,5,5,0,0,1-10,0V15.92a1.67,1.67,0,0,0-1.67-1.67h-2.08a5,5,0,0,1-1.25,10.33,5,5,0,0,1-5-5.33"
      transform="translate(0 0)"
    />
    <path
      fillRule="evenodd"
      d="M135.45,0.22a5,5,0,0,1,7.07,0l16.67,16.67a5,5,0,0,1-7.07,7.07L135.45,7.29,126.6,16.14A5,5,0,0,1,119.53,9.07l15.92-15.92Z"
      transform="translate(0 0)"
      className="text-primary"
    />
  </svg>
);


export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b">
        <div className="container mx-auto flex items-center gap-2">
            <Logo />
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} gatherKids. All rights reserved.</p>
      </footer>
    </div>
  );
}
