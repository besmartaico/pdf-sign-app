export const metadata = {
  title: "PDF Sign App",
  description: "Simple document signing MVP"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Arial, sans-serif", padding: "40px" }}>
        {children}
      </body>
    </html>
  )
}