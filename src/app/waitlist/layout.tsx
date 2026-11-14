import { MobileTopBar } from '@/components/site/mobile-top-bar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MobileTopBar />
      {children}
    </>
  )
}
