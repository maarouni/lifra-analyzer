import React, { useState, useMemo } from "react";

// ─── Access Control ───────────────────────────────────────────────────────────
const APP_PASSWORD = "LIFRA-Analyzer1!";
const USER_PINS = { masoud:"1234", advisor1:"0000", advisor2:"0000" };
const PIN_TO_NAME = Object.fromEntries(Object.entries(USER_PINS).map(([n,p])=>[p,n]));

// ─── Colors (identical to Estate Liquidity Analyzer) ─────────────────────────
const C = {
  bg: "#0a1628",
  panel: "#0f2040",
  card: "#1a3a5c",
  cardLt: "#1e4570",
  blue: "#4472C4",
  blueLt: "#6b9de8",
  gold: "#C9A84C",
  goldLt: "#F0D98C",
  white: "#F5F7FA",
  muted: "#8A9BB5",
  green: "#7CFC00",
  greenDk: "#2ECC8A",
  red: "#FF6B6B",
  orange: "#FFD700",
  border: "rgba(68,114,196,0.35)",
  grid: "rgba(138,155,181,0.12)",
};

// ─── LIFRA Core Calculations ──────────────────────────────────────────────────
// IRA left to heirs: NPV of 10-year forced distribution taxed at heir's rate
function iraNetToHeirs(balance, heirTaxRate, discountRate=0.03) {
  // Uniform distributions over 10 years, each taxed, discounted back at 3%
  let npv = 0;
  const annual = balance / 10;
  for (let yr = 1; yr <= 10; yr++) {
    const afterTax = annual * (1 - heirTaxRate);
    npv += afterTax / Math.pow(1 + discountRate, yr);
  }
  return npv;
}

// IRA grows until retirement, then owner pays tax on distributions to fund premiums
function lifraMath(inputs) {
  const {
    iraBalance, earningsRatePre, earningsRatePost,
    retirementAge, issueAge, ownerTaxRate, heirTaxRate,
    annualPremium, yearsToRetirement, showEstateTaxes,
    deathBenefitOverride,
  } = inputs;

  // IRA value at retirement
  const iraAtRetirement = iraBalance * Math.pow(1 + earningsRatePre, yearsToRetirement);

  // After-tax cost of funding premiums (owner takes distribution, pays tax, pays premium)
  // Gross distribution needed so that net-of-tax = annualPremium
  const grossDistNeeded = annualPremium / (1 - ownerTaxRate);

  // Net IRA legacy (no LIFRA): IRA grows post-retirement for illustration period then heirs take it
  // We show at death (assume death at retirement for illustration simplicity)
  const iraNetHeirs = iraNetToHeirs(iraAtRetirement, heirTaxRate, 0.03);

  // LIFRA death benefit (guaranteed, income-tax free)
  const lifraDeathBenefit = deathBenefitOverride > 0 ? deathBenefitOverride : annualPremium * 35; // rough placeholder

  // Tax drag = IRA to heirs gross - net
  const taxDrag = iraAtRetirement - iraNetHeirs;

  // Improvement
  const improvement = lifraDeathBenefit - iraNetHeirs;

  // Total premiums paid (over years to retirement + policy pay period; simplify to yearsToRetirement)
  const totalPremiums = annualPremium * yearsToRetirement;

  return {
    iraAtRetirement,
    grossDistNeeded,
    iraNetHeirs,
    lifraDeathBenefit,
    taxDrag,
    improvement,
    totalPremiums,
  };
}

// Build comparison over time series
function buildTimeSeries(inputs, maxYears=30) {
  return Array.from({length: maxYears}, (_, i) => {
    const yr = i + 1;
    const iraGrown = inputs.iraBalance * Math.pow(1 + inputs.earningsRatePre, yr);
    const iraNet = iraNetToHeirs(iraGrown, inputs.heirTaxRate, 0.03);
    const db = inputs.deathBenefitOverride > 0 ? inputs.deathBenefitOverride : inputs.annualPremium * 35;
    return {
      year: yr,
      iraGrown,
      iraNet,
      lifraDB: db,
      taxDrag: iraGrown - iraNet,
    };
  });
}

// ─── Gate Screen ──────────────────────────────────────────────────────────────
function GateScreen({ onAuth }) {
  const [step, setStep] = useState("password");
  const [pwd, setPwd] = useState("");
  const [pin, setPin] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [pinErr, setPinErr] = useState("");

  const iStyle = { width:"100%", boxSizing:"border-box", background:C.card,
    border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px",
    color:C.white, fontSize:15, marginBottom:10, outline:"none" };
  const bStyle = { width:"100%", padding:"13px", background:C.blue, border:"none",
    color:C.white, borderRadius:8, cursor:"pointer", fontSize:15, fontWeight:700,
    marginTop:4, boxSizing:"border-box" };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:380,background:C.panel,borderRadius:16,padding:"36px 32px",
        border:`1px solid ${C.border}`,boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:11,color:C.blue,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>
            RealEstate-Analytics.ai
          </div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:"Georgia,serif",color:C.white}}>
            💰 LIFRA Analyzer
          </div>
          <div style={{fontSize:12,color:C.muted,marginTop:6}}>Life Insurance Funded with Retirement Account Distributions</div>
          <div style={{fontSize:11,color:C.muted,marginTop:4}}>
            {step==="password"?"🔒 Enter access password":"🔑 Enter your PIN"}
          </div>
        </div>
        {step==="password" && (
          <form onSubmit={e=>{e.preventDefault();
            if(pwd===APP_PASSWORD){setStep("pin");setPwdErr("");}
            else setPwdErr("❌ Incorrect password.");}}>
            <input type="password" placeholder="Access password" value={pwd} autoComplete="current-password" name="password"
              onChange={e=>setPwd(e.target.value)} style={iStyle}/>
            {pwdErr && <div style={{color:C.red,fontSize:12,marginBottom:8}}>{pwdErr}</div>}
            <button type="submit" style={bStyle}>Continue →</button>
          </form>
        )}
        {step==="pin" && (
          <form onSubmit={e=>{e.preventDefault();
            const name=PIN_TO_NAME[pin.trim()];
            if(name) onAuth(name); else setPinErr("❌ Incorrect PIN.");}}>
            <input type="password" placeholder="Your PIN" value={pin} autoComplete="one-time-code" name="pin"
              onChange={e=>setPin(e.target.value)} maxLength={4} inputMode="numeric" style={iStyle}/>
            {pinErr && <div style={{color:C.red,fontSize:12,marginBottom:8}}>{pinErr}</div>}
            <button type="submit" style={bStyle}>Access Analyzer →</button>
            <button type="button" onClick={()=>{setStep("password");setPwd("");setPin("");setPinErr("");}}
              style={{...bStyle,background:"transparent",color:C.muted,border:`1px solid ${C.border}`,marginTop:8}}>
              ← Back</button>
          </form>
        )}
        <div style={{textAlign:"center",marginTop:20,fontSize:10,color:C.muted}}>
          Protected — NYL APG Advanced Planning | RealEstate-Analytics.ai
        </div>
      </div>
    </div>
  );
}

// ─── UI Helpers (identical to Estate Liquidity Analyzer) ──────────────────────
const Label = ({children, sub}) => (
  <div style={{marginBottom:3}}>
    <span style={{fontSize:11,color:C.muted}}>{children}</span>
    {sub && <span style={{fontSize:10,color:C.blue,marginLeft:6}}>{sub}</span>}
  </div>
);

function NumInput({label, value, onChange, min=0, max=999999999, step=50000, sub, prefix="$"}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  return (
    <div style={{marginBottom:12}}>
      <Label sub={sub}>{label}</Label>
      {editing ? (
        <input type="text" autoFocus value={raw}
          onChange={e=>setRaw(e.target.value)}
          onBlur={()=>{const v=parseFloat(raw.replace(/[$,%,\s]/g,""));
            if(!isNaN(v)) onChange(Math.min(max,Math.max(min,v)));
            setEditing(false);}}
          onKeyDown={e=>{if(e.key==="Enter"){const v=parseFloat(raw.replace(/[$,%,\s]/g,""));
            if(!isNaN(v)) onChange(Math.min(max,Math.max(min,v)));setEditing(false);}
            if(e.key==="Escape")setEditing(false);}}
          style={{width:"100%",boxSizing:"border-box",background:C.card,
            border:`1px solid ${C.gold}`,borderRadius:6,padding:"7px 10px",
            color:C.white,fontSize:13,outline:"none"}}/>
      ) : (
        <div onClick={()=>{setEditing(true);setRaw(String(value));}}
          title="Click to edit"
          style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,
            padding:"7px 10px",fontSize:13,color:C.white,cursor:"text",
            display:"flex",justifyContent:"space-between"}}>
          <span style={{color:C.muted,fontSize:11}}>{prefix}</span>
          <span>{prefix==="$"?value.toLocaleString():value}</span>
        </div>
      )}
    </div>
  );
}

function SliderRow({label, value, min, max, step=0.001, display, onChange, sub}) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
        <Label sub={sub}>{label}</Label>
        <span style={{fontSize:12,fontWeight:700,color:C.goldLt}}>{display(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))}
        style={{width:"100%",accentColor:C.blue}}/>
    </div>
  );
}

function TextInput({label, value, onChange, placeholder}) {
  return (
    <div style={{marginBottom:12}}>
      <Label>{label}</Label>
      <input type="text" value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{width:"100%",boxSizing:"border-box",background:C.card,
          border:`1px solid ${C.border}`,borderRadius:6,padding:"7px 10px",
          color:C.white,fontSize:13,outline:"none"}}/>
    </div>
  );
}

function SelectInput({label, value, options, onChange}) {
  return (
    <div style={{marginBottom:12}}>
      <Label>{label}</Label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,
          borderRadius:6,padding:"7px 10px",color:C.white,fontSize:13}}>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({label, checked, onChange, help}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,
      background:C.card,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`}}>
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}
        style={{accentColor:C.blue,width:16,height:16,cursor:"pointer"}}/>
      <div>
        <div style={{fontSize:12,color:C.white,fontWeight:600}}>{label}</div>
        {help && <div style={{fontSize:10,color:C.muted,marginTop:2}}>{help}</div>}
      </div>
    </div>
  );
}

function MetricCard({label, value, color=C.white, sub}) {
  return (
    <div style={{background:C.card,borderRadius:10,padding:"14px 16px",
      border:`1px solid ${C.border}`,flex:"1 1 150px",textAlign:"center"}}>
      <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,color,fontFamily:"Georgia,serif"}}>{value}</div>
      {sub && <div style={{fontSize:10,color:C.muted,marginTop:4}}>{sub}</div>}
    </div>
  );
}

function SectionHeader({children, caption}) {
  return (
    <div style={{borderLeft:`4px solid ${C.blue}`,paddingLeft:12,marginBottom:16,marginTop:24}}>
      <div style={{fontSize:16,fontWeight:700,color:C.white,fontFamily:"Georgia,serif"}}>{children}</div>
      {caption && <div style={{fontSize:11,color:C.muted,marginTop:3}}>{caption}</div>}
    </div>
  );
}

// ─── Bar Comparison Chart (SVG) ───────────────────────────────────────────────
function ComparisonChart({iraNet, lifraDB}) {
  const W=500, H=220, PL=60, PR=20, PT=20, PB=40;
  const maxV = Math.max(iraNet, lifraDB, 1);
  const cH = H - PT - PB;
  const barW = 80;
  const gap = 60;
  const x1 = PL + 40;
  const x2 = x1 + barW + gap;
  const fmt = v => v>=1000000?`$${(v/1000000).toFixed(2)}M`:v>=1000?`$${Math.round(v/1000)}K`:`$${Math.round(v)}`;

  const h1 = (iraNet/maxV)*cH;
  const h2 = (lifraDB/maxV)*cH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",maxWidth:500,height:"auto"}}>
      {/* IRA bar */}
      <rect x={x1} y={PT+cH-h1} width={barW} height={h1} fill={C.red} opacity="0.8" rx="4"/>
      <text x={x1+barW/2} y={PT+cH-h1-8} textAnchor="middle" style={{fontSize:11,fill:C.white,fontWeight:"bold"}}>{fmt(iraNet)}</text>
      <text x={x1+barW/2} y={PT+cH+16} textAnchor="middle" style={{fontSize:10,fill:C.muted}}>IRA to Heirs</text>
      <text x={x1+barW/2} y={PT+cH+28} textAnchor="middle" style={{fontSize:9,fill:C.red}}>(after income tax)</text>

      {/* LIFRA bar */}
      <rect x={x2} y={PT+cH-h2} width={barW} height={h2} fill={C.greenDk} opacity="0.85" rx="4"/>
      <text x={x2+barW/2} y={PT+cH-h2-8} textAnchor="middle" style={{fontSize:11,fill:C.white,fontWeight:"bold"}}>{fmt(lifraDB)}</text>
      <text x={x2+barW/2} y={PT+cH+16} textAnchor="middle" style={{fontSize:10,fill:C.muted}}>LIFRA Death Benefit</text>
      <text x={x2+barW/2} y={PT+cH+28} textAnchor="middle" style={{fontSize:9,fill:C.greenDk}}>(income-tax free)</text>

      {/* axes */}
      <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke={C.muted} strokeWidth="1"/>
      <line x1={PL} y1={PT+cH} x2={W-PR} y2={PT+cH} stroke={C.muted} strokeWidth="1"/>

      {/* y-axis ticks */}
      {[0,0.25,0.5,0.75,1].map((t,i)=>(
        <g key={i}>
          <line x1={PL-4} y1={PT+cH-(t*cH)} x2={PL} y2={PT+cH-(t*cH)} stroke={C.muted} strokeWidth="1"/>
          <text x={PL-6} y={PT+cH-(t*cH)+4} textAnchor="end" style={{fontSize:9,fill:C.muted}}>{fmt(t*maxV)}</text>
          <line x1={PL} y1={PT+cH-(t*cH)} x2={W-PR} y2={PT+cH-(t*cH)} stroke={C.grid} strokeWidth="1" strokeDasharray="3,3"/>
        </g>
      ))}
    </svg>
  );
}

// ─── Growth Line Chart (SVG) ──────────────────────────────────────────────────
function GrowthChart({data}) {
  const W=700, H=260, PL=80, PR=20, PT=30, PB=40;
  const cW=W-PL-PR, cH=H-PT-PB;
  const allVals = data.flatMap(d=>[d.iraGrown,d.iraNet,d.lifraDB]);
  const maxV = Math.max(...allVals, 1);
  const xPx = i => PL + (i/(data.length-1))*cW;
  const yPx = v => PT + cH - (v/maxV)*cH;
  const fmt = v => v>=1000000?`$${(v/1000000).toFixed(1)}M`:v>=1000?`$${Math.round(v/1000)}K`:`$${Math.round(v)}`;
  const ticks = 4;

  const lines = [
    {key:"iraGrown", color:C.blue, label:"IRA Gross Value", dash:"none"},
    {key:"iraNet",   color:C.red,  label:"IRA Net to Heirs (after tax)", dash:"6,3"},
    {key:"lifraDB",  color:C.greenDk, label:"LIFRA Death Benefit (tax-free)", dash:"none"},
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
      {lines.map(({color,label,dash},i)=>(
        <g key={i} transform={`translate(${PL+i*210},8)`}>
          <line x1="0" y1="6" x2="18" y2="6" stroke={color} strokeWidth="2.5" strokeDasharray={dash}/>
          <text x="22" y="10" style={{fontSize:9,fill:C.muted}}>{label}</text>
        </g>
      ))}
      {Array.from({length:ticks+1},(_,i)=>(
        <line key={i} x1={PL} y1={PT+(i/ticks)*cH} x2={W-PR} y2={PT+(i/ticks)*cH}
          stroke={C.grid} strokeWidth="1" strokeDasharray="3,3"/>
      ))}
      {Array.from({length:ticks+1},(_,i)=>{
        const v=((ticks-i)/ticks)*maxV;
        return <text key={i} x={PL-6} y={PT+(i/ticks)*cH+4} textAnchor="end"
          style={{fontSize:9,fill:C.muted}}>{fmt(v)}</text>;
      })}
      {[1,5,10,15,20,25,30].filter(y=>y<=data.length).map(y=>(
        <text key={y} x={xPx(y-1)} y={H-8} textAnchor="middle"
          style={{fontSize:9,fill:C.muted}}>Yr {y}</text>
      ))}
      {lines.map(({key,color,dash})=>{
        const pts = data.map((d,i)=>`${xPx(i)},${yPx(d[key])}`).join(" ");
        return <polyline key={key} points={pts} fill="none" stroke={color}
          strokeWidth="2" strokeDasharray={dash} strokeLinejoin="round"/>;
      })}
      <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke={C.muted} strokeWidth="1"/>
      <line x1={PL} y1={PT+cH} x2={W-PR} y2={PT+cH} stroke={C.muted} strokeWidth="1"/>
    </svg>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function LifraApp({ userName }) {

  // ── Agent fields
  const [agentName, setAgentName] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [goName, setGoName] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const [agentCity, setAgentCity] = useState("");
  const [agentState, setAgentState] = useState("");
  const [agentZip, setAgentZip] = useState("");
  const [caLicense, setCaLicense] = useState("");

  // ── IRA Owner fields
  const [ownerFirst, setOwnerFirst] = useState("");
  const [ownerLast, setOwnerLast] = useState("");
  const [ownerDOB, setOwnerDOB] = useState("");
  const [ownerMarital, setOwnerMarital] = useState("Married");
  const [ownerState, setOwnerState] = useState("");

  // ── IRA Beneficiary fields
  const [benFirst, setBenFirst] = useState("");
  const [benLast, setBenLast] = useState("");
  const [benDOB, setBenDOB] = useState("");
  const [benSpouse, setBenSpouse] = useState("Yes");

  // ── Retirement Savings
  const [iraBalance, setIraBalance] = useState(1000000);
  const [earningsRatePre, setEarningsRatePre] = useState(0.08);
  const [earningsRatePost, setEarningsRatePost] = useState(0.05);
  const [retirementAge, setRetirementAge] = useState(65);
  const [issueAge, setIssueAge] = useState(62);
  const [ownerTaxRate, setOwnerTaxRate] = useState(0.34);
  const [heirTaxRate, setHeirTaxRate] = useState(0.34);
  const [showEstateTaxes, setShowEstateTaxes] = useState(false);
  const [rmdsMode, setRmdsMode] = useState("Spent");

  // ── Insured (primary)
  const [insuredFirst, setInsuredFirst] = useState("");
  const [insuredLast, setInsuredLast] = useState("");
  const [insuredGender, setInsuredGender] = useState("Male");
  const [insuredClass, setInsuredClass] = useState("Non-Smoker");
  const [sameAsOwner, setSameAsOwner] = useState(true);

  // ── Survivorship insured
  const [survFirst, setSurvFirst] = useState("");
  const [survLast, setSurvLast] = useState("");
  const [survIssueAge, setSurvIssueAge] = useState(60);
  const [survGender, setSurvGender] = useState("Female");
  const [survClass, setSurvClass] = useState("Non-Smoker");

  // ── Policy Illustration
  const [policyType, setPolicyType] = useState("CSWL");
  const [faceAmount, setFaceAmount] = useState(1260000);
  const [annualPremium, setAnnualPremium] = useState(32100);
  const [yearsToPay, setYearsToPay] = useState(10);
  const [dot, setDot] = useState("");
  const [opp, setOpp] = useState("");

  // ── Email
  const [apgEmail, setApgEmail] = useState("apg@newyorklife.com");

  const [activeStep, setActiveStep] = useState(1);

  const yearsToRetirement = Math.max(retirementAge - issueAge, 1);

  const inputs = {
    iraBalance, earningsRatePre, earningsRatePost,
    retirementAge, issueAge, ownerTaxRate, heirTaxRate,
    annualPremium, yearsToRetirement, showEstateTaxes,
    deathBenefitOverride: faceAmount,
  };

  const results = useMemo(() => lifraMath(inputs),
    [iraBalance, earningsRatePre, earningsRatePost, retirementAge, issueAge,
     ownerTaxRate, heirTaxRate, annualPremium, faceAmount]);

  const timeSeries = useMemo(() => buildTimeSeries(inputs, 30),
    [iraBalance, earningsRatePre, retirementAge, issueAge, heirTaxRate, faceAmount, annualPremium]);

  const fmt = v => "$"+Math.round(v).toLocaleString();
  const fmtPct = v => (v*100).toFixed(1)+"%";
  const today = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const ownerDisplay = ownerFirst ? `${ownerFirst} ${ownerLast}`.trim() : "IRA Owner";

  const improvement = results.lifraDeathBenefit - results.iraNetHeirs;
  const improvementPct = results.iraNetHeirs > 0
    ? ((improvement / results.iraNetHeirs) * 100).toFixed(1)
    : "N/A";

  const emailBody =
`LIFRA Illustration Summary
Life Insurance Funded with Retirement Account Distributions
Prepared by: ${agentName || "[Agent Name]"} | Agent Code: ${agentCode || "[Code]"} | GO: ${goName || "[GO]"}
Date: ${today}

CLIENT: ${ownerDisplay}
DOB: ${ownerDOB} | Marital Status: ${ownerMarital} | State: ${ownerState}
Beneficiary: ${benFirst} ${benLast} | DOB: ${benDOB} | Spouse of Owner: ${benSpouse}

─── RETIREMENT SAVINGS INFORMATION ───
IRA / Qualified Plan Balance: ${fmt(iraBalance)}
Hypothetical Earnings Rate — Before Retirement: ${fmtPct(earningsRatePre)}
Hypothetical Earnings Rate — After Retirement: ${fmtPct(earningsRatePost)}
Retirement Age of IRA Owner: ${retirementAge}
Owner's Tax Bracket: ${fmtPct(ownerTaxRate)}
Tax Rate for Beneficiary: ${fmtPct(heirTaxRate)}
Show Estate Taxes: ${showEstateTaxes?"Yes":"No"}
RMDs: ${rmdsMode}

─── INSURED INFORMATION ───
Insured: ${sameAsOwner ? ownerDisplay : `${insuredFirst} ${insuredLast}`.trim()} | Gender: ${insuredGender} | Underwriting Class: ${insuredClass}
${ownerMarital === "Married" ? `Survivorship Insured: ${survFirst} ${survLast} | Issue Age: ${survIssueAge} | Gender: ${survGender} | Class: ${survClass}` : ""}

─── POLICY ILLUSTRATION ───
Type of Policy: ${policyType}
Face Amount / Death Benefit: ${fmt(faceAmount)}
Annual Premium: ${fmt(annualPremium)}
Years to Pay: ${yearsToPay}
${dot ? `DOT: ${dot}` : ""}
${opp ? `OPP: ${opp}` : ""}

─── ILLUSTRATION RESULTS ───
IRA Value at Retirement (projected): ${fmt(results.iraAtRetirement)}
IRA Net to Heirs (after 10-yr forced dist., ${fmtPct(heirTaxRate)} tax, 3% NPV): ${fmt(results.iraNetHeirs)}
Tax Drag on IRA Inheritance: ${fmt(results.taxDrag)}
LIFRA Guaranteed Death Benefit (income-tax free): ${fmt(results.lifraDeathBenefit)}
Improvement vs. IRA Direct: ${fmt(improvement)} (+${improvementPct}%)
Total Premiums Funded from IRA Distributions: ${fmt(results.totalPremiums)}
Gross IRA Distribution Needed Annually (pre-tax): ${fmt(results.grossDistNeeded)}

─── STRATEGY COMPARISON ───
${"Option".padEnd(36)}${"Net to Heirs".padEnd(20)}Tax Treatment
${"Leave IRA directly to heirs".padEnd(36)}${fmt(results.iraNetHeirs).padEnd(20)}Taxed as ordinary income (10-yr rule)
${"LIFRA — fund whole life from IRA dist.".padEnd(36)}${fmt(results.lifraDeathBenefit).padEnd(20)}Income-tax free death benefit

─── DISCLAIMER ───
This illustration is for educational and planning purposes only.
Not legal, tax, insurance, investment, or estate planning advice.
All values are estimates based on inputs provided.
Consult qualified advisors before implementing any planning strategies.
Generated by RealEstate-Analytics.ai | ${today}`;

  const stepBtn = (n, label) => (
    <button onClick={()=>setActiveStep(n)}
      style={{padding:"10px 20px",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
        background:activeStep===n?C.blue:"transparent",
        color:activeStep===n?C.white:C.muted,
        borderBottom:activeStep===n?`3px solid ${C.blueLt}`:"3px solid transparent",
        borderRadius:activeStep===n?"6px 6px 0 0":"0"}}>
      {label}
    </button>
  );

  return (
    <div style={{fontFamily:"'Calibri','Segoe UI',sans-serif",background:C.bg,color:C.white,minHeight:"100vh"}}>

      {/* Header */}
      <div style={{background:C.panel,borderBottom:`3px solid ${C.blue}`,padding:"14px 24px",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,color:C.blue,letterSpacing:3,textTransform:"uppercase"}}>RealEstate-Analytics.ai</div>
          <div style={{fontSize:19,fontWeight:700,fontFamily:"Georgia,serif"}}>
            💰 LIFRA Analyzer — APG Workflow
          </div>
          <div style={{fontSize:11,color:C.muted}}>
            Life Insurance Funded with Retirement Account Distributions | NYL Advanced Planning Group
          </div>
        </div>
        <div style={{fontSize:11,color:C.muted}}>👤 {userName.charAt(0).toUpperCase()+userName.slice(1)}</div>
      </div>

      {/* Strategy Banner */}
      <div style={{background:"#1a3a5c",borderLeft:`4px solid ${C.gold}`,padding:"12px 24px",fontSize:13}}>
        💡 <strong>LIFRA Strategy:</strong> Instead of leaving a taxable IRA to heirs (taxed as ordinary income over 10 years),
        take distributions now, pay tax at today's rates, and fund a whole life policy delivering a{" "}
        <strong>tax-free guaranteed death benefit</strong> — potentially passing significantly more to heirs.
      </div>

      {/* Step tabs */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"0 24px",display:"flex",gap:4}}>
        {stepBtn(1,"Step 1 — Client & Agent Info")}
        {stepBtn(2,"Step 2 — Analysis & Results")}
        {stepBtn(3,"Step 3 — Send to APG")}
      </div>

      <div style={{padding:"24px",maxWidth:1200,margin:"0 auto"}}>

        {/* ── STEP 1 ── */}
        {activeStep===1 && <>
          <SectionHeader caption="Mirrors the LIFRA Questionnaire fields — Agent, IRA Owner, Beneficiary, Insured, Policy">
            Step 1 — Client, Agent & Policy Information
          </SectionHeader>

          <div style={{background:"#0d2010",borderRadius:8,padding:"10px 16px",
            border:"1px solid rgba(46,204,138,0.4)",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16}}>🔒</span>
            <span style={{fontSize:12,color:"#2ECC8A"}}>
              <strong>Privacy Notice:</strong> Client data is never transmitted or stored. All calculations run locally in your browser. Closing this tab clears all data completely.
            </span>
          </div>

          {/* Agent */}
          <div style={{background:C.panel,borderRadius:10,padding:"16px 20px",
            border:`1px solid ${C.border}`,marginBottom:20}}>
            <div style={{fontSize:13,color:C.blue,fontWeight:700,marginBottom:14}}>👤 Agent Information</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
              <div>
                <TextInput label="Agent Name" value={agentName} onChange={setAgentName} placeholder="Full name"/>
                <TextInput label="Agent Code" value={agentCode} onChange={setAgentCode} placeholder="Agent code"/>
                <TextInput label="GO Name" value={goName} onChange={setGoName} placeholder="General Office name"/>
              </div>
              <div>
                <TextInput label="Address 1" value={agentAddress} onChange={setAgentAddress} placeholder="Street address"/>
                <TextInput label="City" value={agentCity} onChange={setAgentCity} placeholder="City"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <TextInput label="State" value={agentState} onChange={setAgentState} placeholder="CA"/>
                  <TextInput label="Zip" value={agentZip} onChange={setAgentZip} placeholder="00000"/>
                </div>
              </div>
              <div>
                <TextInput label="CA/AR Insurance License #" value={caLicense} onChange={setCaLicense}
                  placeholder="Required for CA/AR clients"/>
              </div>
            </div>
          </div>

          {/* IRA Owner + Beneficiary */}
          <div style={{background:C.panel,borderRadius:10,padding:"16px 20px",
            border:`1px solid ${C.border}`,marginBottom:20}}>
            <div style={{fontSize:13,color:C.blue,fontWeight:700,marginBottom:14}}>🏦 IRA Ownership Information</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <div>
                <div style={{fontSize:11,color:C.gold,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>IRA Owner</div>
                <TextInput label="First Name *" value={ownerFirst} onChange={setOwnerFirst} placeholder="First name"/>
                <TextInput label="Last Name *" value={ownerLast} onChange={setOwnerLast} placeholder="Last name"/>
                <TextInput label="Date of Birth *" value={ownerDOB} onChange={setOwnerDOB} placeholder="MM/DD/YYYY"/>
                <SelectInput label="Marital Status *" value={ownerMarital}
                  options={["Married","Single","Widowed","Divorced"]} onChange={setOwnerMarital}/>
                <TextInput label="State *" value={ownerState} onChange={setOwnerState} placeholder="e.g. CA"/>
              </div>
              <div>
                <div style={{fontSize:11,color:C.gold,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>IRA Beneficiary</div>
                <TextInput label="First Name *" value={benFirst} onChange={setBenFirst} placeholder="First name"/>
                <TextInput label="Last Name *" value={benLast} onChange={setBenLast} placeholder="Last name"/>
                <TextInput label="Date of Birth *" value={benDOB} onChange={setBenDOB} placeholder="MM/DD/YYYY"/>
                <SelectInput label="Spouse of IRA Owner? *" value={benSpouse}
                  options={["Yes","No"]} onChange={setBenSpouse}/>
              </div>
            </div>
          </div>

          {/* Insured Information */}
          <div style={{background:C.panel,borderRadius:10,padding:"16px 20px",
            border:`1px solid ${C.border}`,marginBottom:20}}>
            <div style={{fontSize:13,color:C.blue,fontWeight:700,marginBottom:8}}>🧑 Insured Information</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:14}}>Must be IRA owner and/or spouse.</div>
            <Toggle label="Insured is same as IRA owner" checked={sameAsOwner} onChange={setSameAsOwner}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <div>
                <div style={{fontSize:11,color:C.gold,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Insured</div>
                {!sameAsOwner && <>
                  <TextInput label="First Name *" value={insuredFirst} onChange={setInsuredFirst} placeholder="First name"/>
                  <TextInput label="Last Name *" value={insuredLast} onChange={setInsuredLast} placeholder="Last name"/>
                </>}
                <NumInput label="Issue Age *" value={issueAge} onChange={setIssueAge} min={18} max={85} step={1} prefix=""/>
                <SelectInput label="Gender *" value={insuredGender}
                  options={["Male","Female"]} onChange={setInsuredGender}/>
                <SelectInput label="Underwriting Class *" value={insuredClass}
                  options={["Non-Smoker","Smoker","Preferred","Standard"]} onChange={setInsuredClass}/>
              </div>
              {ownerMarital==="Married" && (
                <div>
                  <div style={{fontSize:11,color:C.gold,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>If Survivorship: IRA Owner's Spouse</div>
                  <TextInput label="First Name" value={survFirst} onChange={setSurvFirst} placeholder="First name"/>
                  <TextInput label="Last Name" value={survLast} onChange={setSurvLast} placeholder="Last name"/>
                  <NumInput label="Issue Age" value={survIssueAge} onChange={setSurvIssueAge} min={18} max={85} step={1} prefix=""/>
                  <SelectInput label="Gender" value={survGender}
                    options={["Female","Male"]} onChange={setSurvGender}/>
                  <SelectInput label="Underwriting Class" value={survClass}
                    options={["Non-Smoker","Smoker","Preferred","Standard"]} onChange={setSurvClass}/>
                </div>
              )}
            </div>
          </div>

          {/* Policy Illustration */}
          <div style={{background:C.panel,borderRadius:10,padding:"16px 20px",
            border:`1px solid ${C.border}`,marginBottom:20}}>
            <div style={{fontSize:13,color:C.blue,fontWeight:700,marginBottom:14}}>📋 Policy Illustration Information</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div>
                <SelectInput label="Type of Policy *" value={policyType}
                  options={["CSWL","Whole Life","Term","Universal Life","VUL"]} onChange={setPolicyType}/>
                <NumInput label="Face Amount / Death Benefit ($) *" value={faceAmount} onChange={setFaceAmount}
                  sub="Override — leave 0 to auto-estimate"/>
                <NumInput label="Annual Premium ($) *" value={annualPremium} onChange={setAnnualPremium} step={1000}/>
              </div>
              <div>
                <NumInput label="Years to Pay" value={yearsToPay} onChange={setYearsToPay} min={1} max={40} step={1} prefix=""/>
                <TextInput label="DOT (Date of Transfer)" value={dot} onChange={setDot} placeholder="Optional"/>
                <TextInput label="OPP (Optional Planning Parameter)" value={opp} onChange={setOpp} placeholder="Optional"/>
              </div>
            </div>
          </div>

          <button onClick={()=>setActiveStep(2)}
            style={{padding:"12px 32px",background:C.blue,border:"none",color:C.white,
              borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700}}>
            Continue to Step 2 →
          </button>
        </>}

        {/* ── STEP 2 ── */}
        {activeStep===2 && <>
          <SectionHeader caption="IRA assumptions, tax rates, and side-by-side comparison">
            Step 2 — Retirement Savings Parameters & Analysis
          </SectionHeader>

          <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:20}}>
            <div>
              <div style={{background:C.panel,borderRadius:10,padding:"16px",
                border:`1px solid ${C.border}`,marginBottom:16}}>
                <div style={{fontSize:12,color:C.blue,fontWeight:700,marginBottom:12}}>
                  📊 Retirement Savings Information
                </div>
                <NumInput label="IRA / Qualified Plan Balance ($)" value={iraBalance} onChange={setIraBalance}/>
                <SliderRow label="Hypothetical Earnings Rate — Before Retirement"
                  value={earningsRatePre} min={0} max={0.15} step={0.005}
                  display={v=>(v*100).toFixed(1)+"%"} onChange={setEarningsRatePre}/>
                <SliderRow label="Hypothetical Earnings Rate — After Retirement"
                  value={earningsRatePost} min={0} max={0.12} step={0.005}
                  display={v=>(v*100).toFixed(1)+"%"} onChange={setEarningsRatePost}/>
                <NumInput label="Retirement Age of IRA Owner" value={retirementAge}
                  onChange={setRetirementAge} min={50} max={90} step={1} prefix=""/>
              </div>

              <div style={{background:C.panel,borderRadius:10,padding:"16px",
                border:`1px solid ${C.border}`,marginBottom:16}}>
                <div style={{fontSize:12,color:C.blue,fontWeight:700,marginBottom:12}}>
                  💸 Tax Rates
                </div>
                <SliderRow label="Owner's Tax Bracket (%)"
                  value={ownerTaxRate} min={0.10} max={0.60} step={0.01}
                  display={v=>(v*100).toFixed(0)+"%"} onChange={setOwnerTaxRate}/>
                <SliderRow label="Beneficiary's Tax Rate (%)"
                  value={heirTaxRate} min={0.10} max={0.60} step={0.01}
                  display={v=>(v*100).toFixed(0)+"%"} onChange={setHeirTaxRate}
                  sub="Applied to 10-yr forced IRA distributions"/>
              </div>

              <div style={{background:C.panel,borderRadius:10,padding:"16px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:12,color:C.blue,fontWeight:700,marginBottom:12}}>
                  ⚙️ Display Options
                </div>
                <Toggle label="Show Estate Taxes in illustration" checked={showEstateTaxes}
                  onChange={setShowEstateTaxes}
                  help="Adds estate tax overlay to the comparison"/>
                <SelectInput label="Show RMDs as:" value={rmdsMode}
                  options={["Spent","Reinvested"]} onChange={setRmdsMode}/>
                <div style={{fontSize:10,color:C.muted,marginTop:4}}>
                  Years to retirement (Issue Age → Retirement): <strong style={{color:C.white}}>{yearsToRetirement} yrs</strong>
                </div>
              </div>
            </div>

            <div>
              {/* Key metrics */}
              <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:16}}>
                <MetricCard label="IRA at Retirement" value={fmt(results.iraAtRetirement)} color={C.blueLt}
                  sub={`${yearsToRetirement} yrs @ ${fmtPct(earningsRatePre)}`}/>
                <MetricCard label="IRA Net to Heirs" value={fmt(results.iraNetHeirs)} color={C.red}
                  sub={`After ${fmtPct(heirTaxRate)} tax, 10-yr rule, 3% NPV`}/>
                <MetricCard label="Tax Drag" value={fmt(results.taxDrag)} color={C.orange}
                  sub="Lost to income tax"/>
                <MetricCard label="LIFRA Death Benefit" value={fmt(results.lifraDeathBenefit)} color={C.greenDk}
                  sub="Guaranteed, income-tax free"/>
                <MetricCard label="Improvement" value={`+${fmt(improvement)}`}
                  color={improvement>0?C.green:C.red}
                  sub={improvement>0?`+${improvementPct}% more to heirs`:"Revisit assumptions"}/>
                <MetricCard label="Annual Premium" value={fmt(annualPremium)} color={C.white}
                  sub={`Gross dist. needed: ${fmt(results.grossDistNeeded)}/yr`}/>
              </div>

              {/* Side-by-side comparison */}
              <div style={{background:C.panel,borderRadius:10,padding:"16px",
                border:`1px solid ${C.border}`,marginBottom:16}}>
                <div style={{fontSize:13,color:C.blue,fontWeight:700,marginBottom:12}}>
                  📊 IRA vs. LIFRA — Legacy Comparison
                </div>
                <div style={{display:"flex",gap:20,alignItems:"flex-start",flexWrap:"wrap"}}>
                  <div style={{flex:"0 0 auto"}}>
                    <ComparisonChart iraNet={results.iraNetHeirs} lifraDB={results.lifraDeathBenefit}/>
                  </div>
                  <div style={{flex:"1 1 220px"}}>
                    <div style={{background:C.card,borderRadius:8,padding:"14px",marginBottom:10}}>
                      <div style={{fontSize:11,color:C.red,fontWeight:700,marginBottom:6}}>❌ Without LIFRA</div>
                      <div style={{fontSize:12,color:C.muted,marginBottom:4}}>IRA at retirement: <strong style={{color:C.white}}>{fmt(results.iraAtRetirement)}</strong></div>
                      <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Tax drag: <strong style={{color:C.red}}>{fmt(results.taxDrag)}</strong></div>
                      <div style={{fontSize:13,color:C.white,fontWeight:700}}>Net to heirs: <span style={{color:C.red}}>{fmt(results.iraNetHeirs)}</span></div>
                      <div style={{fontSize:10,color:C.muted,marginTop:4}}>10-yr rule • taxed as ordinary income • NPV at 3%</div>
                    </div>
                    <div style={{background:C.card,borderRadius:8,padding:"14px"}}>
                      <div style={{fontSize:11,color:C.greenDk,fontWeight:700,marginBottom:6}}>✅ With LIFRA</div>
                      <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Annual premium: <strong style={{color:C.white}}>{fmt(annualPremium)}</strong></div>
                      <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Policy type: <strong style={{color:C.white}}>{policyType}</strong></div>
                      <div style={{fontSize:13,color:C.white,fontWeight:700}}>Death benefit: <span style={{color:C.greenDk}}>{fmt(results.lifraDeathBenefit)}</span></div>
                      <div style={{fontSize:10,color:C.muted,marginTop:4}}>Guaranteed • income-tax free • IRC §101(a)</div>
                    </div>
                    <div style={{background:"#0d2010",borderRadius:8,padding:"12px",marginTop:10,
                      border:"1px solid rgba(46,204,138,0.3)"}}>
                      <div style={{fontSize:12,color:C.greenDk,fontWeight:700}}>
                        +{fmt(improvement)} more to heirs ({improvementPct}% improvement)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Growth over time */}
              <div style={{background:C.panel,borderRadius:10,padding:"16px",
                border:`1px solid ${C.border}`,marginBottom:16}}>
                <div style={{fontSize:13,color:C.blue,fontWeight:700,marginBottom:12}}>
                  📈 IRA Growth vs. LIFRA Death Benefit Over Time (Years 1–30)
                </div>
                <div style={{background:"#070f1e",borderRadius:8,padding:"10px 6px"}}>
                  <GrowthChart data={timeSeries}/>
                </div>
              </div>

              {/* Formula Methodology */}
              <div style={{background:C.panel,borderRadius:10,padding:"16px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:13,color:C.blue,fontWeight:700,marginBottom:10}}>📐 Formula Methodology</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr style={{background:C.cardLt}}>
                      {["Formula","Expression","Source"].map(h=>(
                        <th key={h} style={{padding:"6px 8px",color:C.muted,textAlign:"left"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["IRA at retirement","Balance × (1 + r_pre)^years","Standard FV formula"],
                      ["IRA net to heirs (NPV)","Σ [(Annual dist × (1−tax)) / (1.03)^yr] over 10 yrs","IRC §401(a)(9) 10-year rule"],
                      ["Beneficiary tax","Ordinary income rate applied to IRA distributions","IRC §72 / SECURE Act 2.0"],
                      ["LIFRA death benefit","Guaranteed face amount of whole life policy","IRC §101(a) income-tax free"],
                      ["Gross dist. needed","Annual premium ÷ (1 − owner tax rate)","Pre-tax IRA withdrawal math"],
                      ["Improvement","LIFRA death benefit − IRA net to heirs","Legacy comparison metric"],
                    ].map(([f,e,s],i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.grid}`,
                        background:i%2===0?"transparent":"rgba(26,58,92,0.3)"}}>
                        <td style={{padding:"6px 8px",color:C.white}}>{f}</td>
                        <td style={{padding:"6px 8px",color:C.goldLt,fontFamily:"monospace"}}>{e}</td>
                        <td style={{padding:"6px 8px",color:C.muted}}>{s}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{fontSize:10,color:C.muted,marginTop:8}}>
                  NPV discount rate: 3%. 10-year rule per SECURE Act (2019) / SECURE 2.0 (2022).
                  Eligible Designated Beneficiaries (minors, disabled, chronically ill, &lt;10yr younger) may use life-expectancy distributions — consult advisor.
                </div>
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:12,marginTop:16}}>
            <button onClick={()=>setActiveStep(1)}
              style={{padding:"12px 24px",background:"transparent",border:`1px solid ${C.blue}`,
                color:C.blue,borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}>
              ← Back to Step 1
            </button>
            <button onClick={()=>setActiveStep(3)}
              style={{padding:"12px 32px",background:C.blue,border:"none",color:C.white,
                borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700}}>
              Continue to Step 3 →
            </button>
          </div>
        </>}

        {/* ── STEP 3 ── */}
        {activeStep===3 && <>
          <SectionHeader caption="Generate a pre-formatted submission to send to the NYL APG team for a full illustration.">
            Step 3 — Send to APG Team
          </SectionHeader>

          <div style={{marginBottom:20}}>
            <div style={{background:C.panel,borderRadius:10,padding:"16px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:13,color:C.blue,fontWeight:700,marginBottom:12}}>📧 Submit to NYL APG</div>
              <TextInput label="APG Email Address" value={apgEmail} onChange={setApgEmail}/>
              <button onClick={()=>{
                const subj = encodeURIComponent(`LIFRA Case Submission — ${ownerDisplay} — ${today}`);
                const body = encodeURIComponent(emailBody);
                window.open(`mailto:${apgEmail}?subject=${subj}&body=${body}`);
              }} style={{width:"100%",padding:"11px",background:"#1a4a2a",border:`1px solid ${C.greenDk}`,
                color:C.greenDk,borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}>
                📤 Open Email to APG
              </button>
            </div>
          </div>

          <div style={{background:C.panel,borderRadius:10,padding:"16px",border:`1px solid ${C.border}`,marginBottom:20}}>
            <div style={{fontSize:13,color:C.blue,fontWeight:700,marginBottom:10}}>
              📋 Full LIFRA Submission Summary (copy/paste)
            </div>
            <textarea readOnly value={emailBody}
              style={{width:"100%",height:400,background:C.card,border:`1px solid ${C.border}`,
                borderRadius:6,padding:"10px",color:C.white,fontSize:11,
                fontFamily:"monospace",resize:"vertical",outline:"none"}}/>
          </div>

          <div style={{background:"#1a1a2e",borderRadius:10,padding:"16px",
            border:"1px solid rgba(255,107,107,0.3)",marginBottom:20}}>
            <div style={{fontSize:12,color:C.red,fontWeight:700,marginBottom:8}}>⚠️ Important Disclaimer</div>
            <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
              This prototype is for educational and planning illustration purposes only.
              It does not provide legal, tax, insurance, investment, or financial planning advice.
              All outputs are simplified estimates based on user-entered assumptions.
              Actual IRA growth, tax treatment, distribution rules, and death benefit values
              may differ materially from projections shown here.
              Users should review all decisions with qualified tax advisors, CPAs, estate planning
              attorneys, and licensed insurance professionals.
              New York Life Insurance Company, its agents and employees may not provide legal,
              tax or accounting advice. © New York Life Insurance Company.
            </div>
          </div>

          <button onClick={()=>setActiveStep(2)}
            style={{padding:"12px 24px",background:"transparent",border:`1px solid ${C.blue}`,
              color:C.blue,borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}>
            ← Back to Step 2
          </button>
        </>}

      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  if (!user) return <GateScreen onAuth={setUser}/>;
  return <LifraApp userName={user}/>;
}
