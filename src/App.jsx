import Layout from '@/Layout';
import Landing from '@/pages/Landing';
import Contact from '@/pages/Contact';
import Support from '@/pages/Support';

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const isContactPage = pathname === '/contact';
  const isSupportPage = pathname === '/support';
  const isInnerPage = isContactPage || isSupportPage;

  return (
    <Layout currentPage={isContactPage ? 'contact' : isSupportPage ? 'support' : 'home'} isInnerPage={isInnerPage}>
      {isContactPage ? <Contact /> : isSupportPage ? <Support /> : <Landing />}
    </Layout>
  );
}
