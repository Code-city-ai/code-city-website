import Layout from '@/Layout';
import Landing from '@/pages/Landing';
import Contact from '@/pages/Contact';
import Support from '@/pages/Support';
import Privacy from '@/pages/Privacy';
import AccountDeletion from '@/pages/AccountDeletion';
import Careers from '@/pages/Careers';

const routes = {
  '/': { currentPage: 'home', Component: Landing, isInnerPage: false },
  '/contact': { currentPage: 'contact', Component: Contact, isInnerPage: true },
  '/support': { currentPage: 'support', Component: Support, isInnerPage: true },
  '/privacy': { currentPage: 'privacy', Component: Privacy, isInnerPage: true },
  '/account-deletion': { currentPage: 'account-deletion', Component: AccountDeletion, isInnerPage: true },
  '/careers': { currentPage: 'careers', Component: Careers, isInnerPage: true },
};

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const route = routes[pathname] || routes['/'];
  const { currentPage, Component, isInnerPage } = route;

  return (
    <Layout currentPage={currentPage} isInnerPage={isInnerPage}>
      <Component />
    </Layout>
  );
}
