import Layout from '@/Layout';
import Landing from '@/pages/Landing';
import Contact from '@/pages/Contact';

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const isContactPage = pathname === '/contact';

  return (
    <Layout isContactPage={isContactPage}>
      {isContactPage ? <Contact /> : <Landing />}
    </Layout>
  );
}
