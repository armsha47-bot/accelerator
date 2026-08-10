import BottomNav from "@/components/layout/BottomNav";
import CelebrationProvider from "@/components/shared/CelebrationProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
      <CelebrationProvider />
    </>
  );
}
