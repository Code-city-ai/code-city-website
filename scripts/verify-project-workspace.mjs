/** Local UI fixture only. Never deployed; no real credentials, email, or trading calls. */
import { createServer as createHTTPServer } from 'node:http';
import { createServer as createViteServer } from 'vite';

const apiPort = 54421;
const webPort = 4173;
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'owner@example.test', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const payload = { sub: user.id, role: 'authenticated', email: user.email, session_id: '22222222-2222-4222-8222-222222222222', exp: Math.floor(Date.now()/1000)+86400 };
const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.local-fixture-only`;
let unlocked = false;
let code = 'fixture-code-only';
let configured = true;
const position = (symbol, quantity, price, cost) => ({ symbol, quantity: String(quantity), market_value: String(quantity*price), unrealized_pnl: String(quantity*(price-cost)), unrealized_pnl_pct: String((price-cost)/cost*100) });
const snapshot = (broker, period) => ({
  broker, period, fetched_at: new Date().toISOString(),
  portfolio: { error:null, data:{ broker, currency:'USD', total_market_value:'128450.62', total_cost_basis:'121830.11', total_unrealized_pnl:'6620.51', pricing_complete:true, positions:[position('AAPL',120,225.4,211),position('NVDA',200,118.32,112.45),position('BTC-USD',0.42,67584,65000),position('MSFT',60,422.75,430)] } },
  performance: { error:null, data:{ currency:'USD',net_pnl:'8432.18',win_rate:'68.42',trade_count:38,max_drawdown:'-1240.50',order_store_state:'available',drawdown_state:'available',cost_evidence_complete:false,equity_curve: [0,150,280,-100,440,910,760,1440,1330,2300,1970,2450,3100,2900,3500,3300,4600,5100,4300,6000,5800,6800,6500,7900,7400,8432.18].map((cumulative_pnl,index)=>({index,cumulative_pnl:String(cumulative_pnl),closed_at:new Date(Date.UTC(2026,8,index+1)).toISOString()})) } },
  nova: {error:null,data:{alive:true}},
});
const api = createHTTPServer(async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin',`http://127.0.0.1:${webPort}`);
  res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers'] || 'authorization, apikey, content-type, x-client-info, x-supabase-api-version');
  res.setHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS');
  res.setHeader('Content-Type','application/json');
  const reply=(body,status=200)=>{res.statusCode=status;res.end(JSON.stringify(body));};
  if(req.method==='OPTIONS') {res.statusCode=204;res.end();return;}
  let text='';for await(const chunk of req) text+=chunk;
  const body=text?JSON.parse(text):{};
  if(req.url.startsWith('/auth/v1/token')) { reply({access_token:token,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:86400,expires_at:payload.exp,user});return; }
  if(req.url.startsWith('/auth/v1/user')) {reply(user);return;}
  if(req.url.startsWith('/auth/v1/logout')) {unlocked=false;reply({});return;}
  if(req.url.startsWith('/rest/v1/admin_profiles')) {reply({user_id:user.id,full_name:'Kemar Campbell',role:'owner',is_active:true,last_seen_at:null});return;}
  if(req.url.startsWith('/functions/v1/project-workspace')) {
    if(!req.headers.authorization?.endsWith('.local-fixture-only')) {reply({error:'Sign in first.'},401);return;}
    const status=()=>({owner:true,configured,unlocked,expires_at:unlocked?new Date(Date.now()+3600000).toISOString():null});
    if(body.action==='status') reply(status());
    else if(body.action==='unlock') {if(body.code!==code) reply({error:'The access code was not accepted.'},403);else {unlocked=true;reply(status());}}
    else if(body.action==='configure') {if(configured&&body.current_code!==code) reply({error:'The current code was not accepted.'},403);else {code=body.code;configured=true;unlocked=false;reply({...status(),notification:'accepted'});}}
    else if(body.action==='lock') {unlocked=false;reply(status());}
    else if(body.action==='snapshot') {if(!unlocked)reply({error:'Enter your access code.'},403);else if(body.broker==='kraken')reply({error:'Trade City is not connected to this workspace yet.'},503);else reply(snapshot(body.broker,body.period));}
    else reply({error:'Unknown action'},400);
    return;
  }
  reply({error:'Fixture route not implemented'},404);
});
await new Promise((resolve,reject)=>{api.once('error',reject);api.listen(apiPort,'127.0.0.1',resolve);});
process.env.VITE_SUPABASE_URL=`http://127.0.0.1:${apiPort}`;
process.env.VITE_SUPABASE_ANON_KEY='public-local-fixture-key';
const vite=await createViteServer({server:{host:'127.0.0.1',port:webPort,strictPort:true},plugins:[{name:'local-fixture-label',transformIndexHtml(){return [{tag:'div',attrs:{style:'position:relative;text-align:center;background:#493415;color:#fff1d9;font:11px system-ui;padding:8px;pointer-events:none'},children:'LOCAL VERIFICATION · SYNTHETIC DATA · NOT A LIVE ACCOUNT',injectTo:'body-prepend'}];}}]});
await vite.listen();
console.log(`Local fixture: http://127.0.0.1:${webPort}/sign-in — email owner@example.test, any test password, access code fixture-code-only. No live services are contacted.`);
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,async()=>{await vite.close();api.close();process.exit(0);});
