import base44 from '../../../src/api/base44Client';

const THEORETICAL: any = {
  handWinFreq: { 1: 0.0284, 2: 0.1042, 3: 0.0381, 4: 0.0521, 5: 0.0612, 6: 0.0743, 7: 0.1042, 8: 0.0743, 9: 0.0892, 10: 0.0284, board: 0.1820 },
  rankFreq: { 'High Card': 0.1741, 'One Pair': 0.4384, 'Two Pair': 0.2356, 'Three of a Kind': 0.0481, 'Straight': 0.0462, 'Flush': 0.0303, 'Full House': 0.0256, 'Four of a Kind': 0.0024, 'Straight Flush': 0.00139, 'Royal Flush': 0.000032 },
  colorFreq: { '3R': 0.3125, '3B': 0.3125, '4R': 0.1563, '4B': 0.1563, '5R': 0.0313, '5B': 0.0313 },
  lowHighFreq: { LOW: 0.4615, HIGH: 0.5385 }
};
const HAND_NAMES = ['A♦10♥','K♣K♠','Q♣J♠','Q♠10♠','J♣9♣','8♦6♦','7♦7♠','4♥2♥','3♣3♥','A♥5♦'];
const pct = (n: number) => (n * 100).toFixed(2) + '%';
const diff = (obs: number, theo: number) => ((obs - theo) * 100).toFixed(2);
const driftLevel = (obs: number, theo: number): string => { const d = Math.abs(obs - theo); return d >= 0.06 ? 'critical' : d >= 0.03 ? 'warning' : 'ok'; };

export default async function handler(req: Request) {
  const { action, question } = await req.json();
  const rounds: any[] = (await base44.asServiceRole.entities.ObserverRound.list({ limit: 5000 })) || [];
  const n = rounds.length;
  if (n < 50 && action !== 'status') return Response.json({ error: 'Insufficient data', roundsLoaded: n, needed: 50 });
  if (action === 'status') return Response.json({ roundsLoaded: n, ready: n >= 250 });

  const handWins: any = { board: 0 };
  for (let i = 1; i <= 10; i++) handWins[i] = 0;
  const rankCounts: any = {}, colorCounts: any = { '3R':0,'3B':0,'4R':0,'4B':0,'5R':0,'5B':0 }, lhCounts: any = { LOW:0, HIGH:0 }, betUsage: any = {};
  let ksRounds = 0, totalBet = 0, totalPayout = 0;

  for (const r of rounds) {
    if (r.is_board_win) handWins['board']++;
    else (r.winner_hand_ids||[]).forEach((h: number) => { handWins[h] = (handWins[h]||0)+1; });
    if (r.winning_rank) rankCounts[r.winning_rank] = (rankCounts[r.winning_rank]||0)+1;
    (r.winning_colors||[]).forEach((c: string) => { if (colorCounts[c]!==undefined) colorCounts[c]++; });
    if (r.winning_low_high) lhCounts[r.winning_low_high]++;
    if (r.kill_switch_active) ksRounds++;
    totalBet += r.total_bet||0; totalPayout += r.total_payout||0;
    ['hand_bets','color_bets','rank_bets'].forEach(field => { if (r[field]) Object.keys(r[field]).forEach(k => { betUsage[`${field.replace('_bets','')}_${k}`]=(betUsage[`${field.replace('_bets','')}_${k}`]||0)+1; }); });
    if (r.low_high_bet?.type) betUsage[`lh_${r.low_high_bet.type}`]=(betUsage[`lh_${r.low_high_bet.type}`]||0)+1;
  }

  const driftFlags: any[] = [];
  const handDrift = Object.entries(handWins).map(([hid, wins]: any) => {
    const obs=wins/n, theo=THEORETICAL.handWinFreq[hid]||0, level=driftLevel(obs,theo);
    const name=hid==='board'?'Board Win':`Hand ${hid} (${HAND_NAMES[Number(hid)-1]})`;
    if (level!=='ok') driftFlags.push({ category:'Hand Win Frequency', position:name, obs:pct(obs), theo:pct(theo), drift:diff(obs,theo)+'pp', level });
    return { hid, name, obs, theo, level, wins };
  });
  Object.entries(rankCounts).forEach(([rank,count]: any) => { const obs=count/n,theo=THEORETICAL.rankFreq[rank]||0,level=driftLevel(obs,theo); if(level!=='ok') driftFlags.push({category:'Rank Frequency',position:rank,obs:pct(obs),theo:pct(theo),drift:diff(obs,theo)+'pp',level}); });
  Object.entries(colorCounts).forEach(([key,count]: any) => { const obs=count/n,theo=THEORETICAL.colorFreq[key]||0,level=driftLevel(obs,theo); if(level!=='ok') driftFlags.push({category:'Color Board',position:key,obs:pct(obs),theo:pct(theo),drift:diff(obs,theo)+'pp',level}); });
  ['LOW','HIGH'].forEach(t => { const obs=lhCounts[t]/n,theo=THEORETICAL.lowHighFreq[t],level=driftLevel(obs,theo); if(level!=='ok') driftFlags.push({category:'River Low/High',position:t,obs:pct(obs),theo:pct(theo),drift:diff(obs,theo)+'pp',level}); });

  const exploits = handDrift.filter(h=>h.obs>(h.theo+0.04)&&h.wins>=5).sort((a,b)=>(b.obs-b.theo)-(a.obs-a.theo)).map(h=>({position:h.name,observedFreq:pct(h.obs),theoreticalFreq:pct(h.theo),overFrequency:diff(h.obs,h.theo)+'pp',severity:h.obs-h.theo>=0.08?'HIGH':'MEDIUM'}));
  const topBets = Object.entries(betUsage).sort((a:any,b:any)=>b[1]-a[1]).slice(0,8).map(([pos,count]:any)=>({position:pos,usageRate:pct(count/n)}));
  const ksRate = ksRounds/n;
  const rtp = totalBet>0?(totalPayout/totalBet)*100:null;
  const he = rtp!==null?(100-rtp).toFixed(2)+'%':null;
  const crit = driftFlags.filter(f=>f.level==='critical'), warn = driftFlags.filter(f=>f.level==='warning');
  const recs: string[] = [];
  if (!crit.length&&!warn.length) recs.push('✅ All frequencies within expected variance. No calibration needed.');
  crit.forEach(f=>recs.push(`🔴 CRITICAL: ${f.position} drifting ${f.drift} from theory.`));
  warn.forEach(f=>recs.push(`🟡 WARNING: ${f.position} showing ${f.drift} drift. Monitor 100+ more rounds.`));
  if (exploits.length) recs.push(`⚠️ ${exploits.length} exploit candidate(s) detected.`);
  if (rtp!==null) { const r=parseFloat(rtp.toFixed(2)); recs.push(r>97?`🔴 RTP ${r.toFixed(2)}% above 97% ceiling.`:r<88?`🔴 RTP ${r.toFixed(2)}% unusually low.`:`✅ RTP ${r.toFixed(2)}% — within range.`); }

  let answer: string|null = null;
  if (action==='ask'&&question) {
    const q=question.toLowerCase();
    if (q.includes('rtp')||q.includes('house edge')||q.includes('return')) {
      answer=rtp!==null?`Based on ${n} observed rounds: running at ${parseFloat(rtp.toFixed(2)).toFixed(2)}% RTP (house edge: ${he}). ${parseFloat(rtp.toFixed(2))>96?`Above 96% target — check highest-payout hand positions for drift first.`:parseFloat(rtp.toFixed(2))<90?`Below healthy floor target — verify payout calculations, especially tie-split logic.`:`Healthy range for casino floor operation.`}`:`No bet data yet — need rounds with actual bets placed.`;
    } else if (q.includes('exploit')||q.includes('weakness')||q.includes('vulnerab')||q.includes('attack')) {
      answer=exploits.length===0?`No exploit candidates in ${n} rounds. No position running more than 4pp over expected. ${n<500?'Still a small sample — keep observing.':'Solid sample — this is a good sign.'}`:`${exploits.length} exploit target(s): ${exploits.map(e=>`${e.position} (+${e.overFrequency})`).join(', ')}. Run the simulation to quantify how much edge a targeted player extracts.`;
    } else if (q.includes('kill')||q.includes('switch')) {
      answer=`Kill-switch fired in ${(ksRate*100).toFixed(1)}% of rounds (${ksRounds}/${n}). ${ksRate>0.4?'Notably high — 3+ hand play is frequent. Check that losing side boards isn\'t creating dead-round feeling.':ksRate<0.05?'Very low — not being stress-tested much in live play yet.':'Normal range for mixed play.'}`;
    } else if (q.includes('payout')||q.includes('calibrat')||q.includes('adjust')||q.includes('lower')||q.includes('raise')) {
      const top=driftFlags.sort((a,b)=>Math.abs(parseFloat(b.drift))-Math.abs(parseFloat(a.drift))).slice(0,3);
      answer=top.length===0?`All positions within variance — wouldn't touch payouts yet. Run to 500+ rounds first. Good data in, good data out.`:`Top drift positions: ${top.map(d=>`${d.position} (${d.drift})`).join(', ')}. Calibration candidates — but need 500+ rounds for confidence. ${n<300?`At ${n} rounds. Keep observing.`:`At ${n} rounds — approaching reliable baseline.`}`;
    } else {
      answer=`${n} rounds observed.\n• RTP: ${rtp!==null?parseFloat(rtp.toFixed(2)).toFixed(2)+'%':'pending'}\n• Kill-switch rate: ${(ksRate*100).toFixed(1)}%\n• Drift flags: ${driftFlags.length} (${crit.length} critical, ${warn.length} warning)\n• Exploit candidates: ${exploits.length}\n${driftFlags.length>0?`Top drift: ${driftFlags[0]?.position} at ${driftFlags[0]?.drift}.`:'All frequencies clean.'}\n\nAsk about RTP, exploits, kill-switch, or payout calibration for specific analysis.`;
    }
  }

  return Response.json({ roundsAnalyzed:n, readyForSecurity:n>=250, observedRTP:rtp!==null?parseFloat(rtp.toFixed(2)):null, houseEdge:he, killSwitchRate:pct(ksRate), driftFlags, exploitCandidates:exploits, recommendations:recs, topBetPositions:topBets, handDrift:handDrift.map(h=>({...h,obs:pct(h.obs),theo:pct(h.theo)})), partnerAnswer:answer });
}
