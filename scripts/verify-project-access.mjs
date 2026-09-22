/** Local UI fixture only. Never deployed; no real credentials, email, or trading calls. */
import { createServer as createHTTPServer } from 'node:http';
import { createServer as createViteServer } from 'vite';

const apiPort = 54431;
const webPort = 4181;
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'owner@example.test', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const payload = { sub: user.id, role: 'authenticated', email: user.email, session_id: '22222222-2222-4222-8222-222222222222', exp: Math.floor(Date.now()/1000)+86400 };
const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.local-fixture-only`;
const projects = { orc: { unlocked:false,code:'fixture-code-orc',configured:process.env.FIXTURE_UNCONFIGURED !== '1' }, 'trade-city': { unlocked:false,code:'fixture-code-only',configured:process.env.FIXTURE_UNCONFIGURED !== '1' }, 'code-city': { unlocked:false,code:'fixture-code-city',configured:process.env.FIXTURE_UNCONFIGURED !== '1' } };
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
  if(req.url.startsWith('/auth/v1/logout')) {for(const project of Object.values(projects))project.unlocked=false;reply({});return;}
  if(req.url.startsWith('/auth/v1/recover')) {reply({});return;}
  if(req.url.startsWith('/rest/v1/admin_profiles')) {reply({user_id:user.id,full_name:'Local fixture owner',role:'owner',is_active:true,last_seen_at:null});return;}
  if(req.url.startsWith('/functions/v1/project-workspace')) {
    if(!req.headers.authorization?.endsWith('.local-fixture-only')) {reply({error:'Sign in first.'},401);return;}
    const project=projects[body.project];
    if(!project){reply({error:'Unknown project'},400);return;}
    const status=()=>({owner:true,configured:project.configured,unlocked:project.unlocked,expires_at:project.unlocked?new Date(Date.now()+3600000).toISOString():null});
    if(body.action==='status') reply(status());
    else if(body.action==='unlock') {if(body.code!==project.code) reply({error:'The access code was not accepted.'},403);else {project.unlocked=true;reply(status());}}
    else if(body.action==='configure') {if(project.configured&&body.current_code!==project.code) reply({error:'The current code was not accepted.'},403);else {project.code=body.code;project.configured=true;project.unlocked=false;reply({...status(),notification:'accepted'});}}
    else if(body.action==='lock') {project.unlocked=false;reply(status());}
    else reply({error:'Unknown action'},400);
    return;
  }
  reply({error:'Fixture route not implemented'},404);
});
await new Promise((resolve,reject)=>{api.once('error',reject);api.listen(apiPort,'127.0.0.1',resolve);});
process.env.VITE_SUPABASE_URL=`http://127.0.0.1:${apiPort}`;
process.env.VITE_SUPABASE_ANON_KEY='public-local-fixture-key';
const vite=await createViteServer({server:{host:'127.0.0.1',port:webPort,strictPort:true},plugins:[{name:'local-fixture-label',transformIndexHtml(){return [{tag:'div',attrs:{style:'position:relative;text-align:center;background:#493415;color:#fff1d9;font:11px system-ui;padding:8px;pointer-events:none'},children:'LOCAL ACCESS-SCREEN TEST · NO REAL ACCOUNT OR EMAIL',injectTo:'body-prepend'}];}}]});
await vite.listen();
console.log(`Local fixture: http://127.0.0.1:${webPort}/sign-in — email owner@example.test, any test password, Trade City code fixture-code-only, ORC code fixture-code-orc. No live services are contacted.`);
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,async()=>{await vite.close();api.close();process.exit(0);});
