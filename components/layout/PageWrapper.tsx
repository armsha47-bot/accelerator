/**
 * Standard mobile page frame: centered 390px column, safe-area top padding, and
 * bottom padding so content clears the floating nav bar.
 */
export default function PageWrapper({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`safe-top mx-auto min-h-dvh w-full max-w-md px-4 pb-28 pt-4 ${className}`}
    >
      {children}
    </main>
  );
}
