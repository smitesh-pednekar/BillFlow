import { chromium } from "playwright";
const BASE="https://billflow-flax.vercel.app";
const b=await chromium.launch();
const R=[]; const chk=(n,p,note="")=>{R.push([p,n,note]);console.log(`${p?"PASS":"FAIL"}  ${n}${note?"  — "+note:""}`);};

async function login(ctx){
  const p=await ctx.newPage();
  await p.goto(`${BASE}/login`,{waitUntil:"domcontentloaded"}); await p.waitForTimeout(2500);
  await p.fill("#email","demo@billflow.app"); await p.fill("#password","demo1234");
  const r=p.waitForResponse(x=>x.url().includes("/api/auth/login"),{timeout:30000});
  await p.click('button[type=submit]'); await r; await p.waitForTimeout(3000);
  return p;
}
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const p=await login(ctx);
chk("Demo login works on production",p.url().includes("/dashboard"),p.url());

await p.waitForSelector("text=Total earned",{timeout:30000}); await p.waitForTimeout(1500);
const t=await p.locator("body").innerText();
const money=[...t.matchAll(/£[\d,]+\.\d\d/g)].map(m=>m[0]);
chk("Dashboard shows £22,042.50 earned",t.includes("22,042.50"),money.slice(0,4).join(" "));
chk("Overdue £6,132.00 with 2 past due",t.includes("6,132.00")&&t.includes("2 invoices past due"));
chk("Chart rendered",!t.includes("No income to chart yet"));

await p.goto(`${BASE}/invoices?status=overdue`,{waitUntil:"domcontentloaded"}); await p.waitForTimeout(2500);
chk("Overdue filter returns 2",(await p.locator("table tbody tr").count())===2);

// PDF from production
const ids=await p.evaluate(async()=>{const r=await fetch('/api/invoices');return (await r.json()).rows.map(x=>x.id);});
const pdf=await p.evaluate(async(id)=>{const r=await fetch(`/api/invoices/${id}/pdf`);const buf=await r.arrayBuffer();
  return {s:r.status,n:buf.byteLength,h:new TextDecoder().decode(buf.slice(0,5)),cd:r.headers.get("content-disposition")};},ids[0]);
chk("PDF downloads from production",pdf.s===200&&pdf.h==="%PDF-",`${pdf.n}b ${pdf.cd}`);

// AI drafting on production
await p.goto(`${BASE}/invoices/new`,{waitUntil:"domcontentloaded"}); await p.waitForTimeout(3000);
await p.click("text=Describe the work instead"); await p.waitForTimeout(600);
await p.fill("#ai-prompt","Built a Shopify store: 30 hours dev at 85/hr, theme customisation 1200 flat, and 3 months support at 400/month. 20% VAT");
const dr=p.waitForResponse(x=>x.url().includes("/api/ai/draft-invoice"),{timeout:40000});
await p.click("text=Draft line items"); await dr; await p.waitForTimeout(2000);
const realAI=(await p.locator("text=No AI key is configured").count())===0;
chk("AI drafting uses the real model",realAI);
await p.click("text=Use these items"); await p.waitForTimeout(2000);
const paper=await p.locator("article").innerText();
chk("Drafted totals compute to £5,940.00",paper.includes("5,940.00"));

// public page, logged out
const tok=await p.evaluate(async(id)=>{const r=await fetch(`/api/invoices/${id}`);return (await r.json()).publicToken;},ids[0]);
const a2=await (await b.newContext()).newPage();
await a2.goto(`${BASE}/i/${tok}`,{waitUntil:"domcontentloaded"}); await a2.waitForTimeout(2000);
chk("Public invoice works logged out",(await a2.locator("article").count())>0);
chk("Public page has no app nav",(await a2.locator('a[href="/settings"]').count())===0);
await a2.goto(`${BASE}/i/notarealtoken0000000000000000`,{waitUntil:"domcontentloaded"}); await a2.waitForTimeout(1500);
chk("Bad token 404s",(await a2.locator("body").innerText()).includes("could not find that page"));

// mobile
const m=await b.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
const mp=await login(m);
for(const path of ["/dashboard","/invoices","/clients","/settings"]){
  await mp.goto(BASE+path,{waitUntil:"domcontentloaded"}); await mp.waitForTimeout(1800);
  chk(`375px no h-scroll ${path}`,!(await mp.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)));
}
await b.close();
const f=R.filter(r=>!r[0]);
console.log(`\n${R.length-f.length}/${R.length} passed on PRODUCTION`);
if(f.length) f.forEach(x=>console.log("  FAILED:",x[1],x[2]));
