import React from 'react';
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, KeyRound, LineChart, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '@/admin/AuthProvider';

export default function Projects() {
  const { profile } = useAdminAuth();
  return <div className="project-home">
    <header className="project-home-heading"><div><h2>Good to have you here{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.</h2><p>Your work, with a wider perspective.</p></div><span><ShieldCheck size={16} />Private project access</span></header>
    <a className="project-feature" href="/admin/projects/trade-city">
      <div className="project-feature-copy"><img src="/brands/trade-city.png" alt="" /><h3>Trade City<span>A clearer view<br />of every move.</span></h3><p>Your portfolio, trading performance, and Nova’s runtime status. Together in one focused workspace.</p><span className="project-feature-action">Open Trade City <ArrowUpRight size={22} /></span></div>
      <div className="project-feature-visual" aria-hidden="true"><div className="project-wordmark">TRADE<br /><span>CITY</span></div><div className="project-monoliths"><i /><i /><i /><i /><i /><i /><i /></div><div className="project-feature-caption"><LineChart size={18} />A perspective built around your portfolio.</div></div>
    </a>
    <div className="project-other"><div><h3>The rest of your workspace</h3><p>Continue where the work is happening.</p></div><a href="/admin"><BriefcaseBusiness /><span><strong>Client operations</strong><small>Inquiries, relationships, and marketing</small></span><ArrowRight /></a>{profile?.role === 'owner' && <a href="/admin/projects/access"><KeyRound /><span><strong>Project access</strong><small>Manage your fixed access code</small></span><ArrowRight /></a>}</div>
  </div>;
}
