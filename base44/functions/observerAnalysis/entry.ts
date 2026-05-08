import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// observerAnalysis — live game observer engine v5
const THEORETICAL: any = {
  handWinFreq: { 1: 0.0284, 2: 0.1042, 3: 0.0381, 4: 0.0521, 5: 0.0612, 6: 0.0743, 7: 0.1042, 8: 0.0743, 9: 0.0892, 10: 0.0284, board: 0.1820 },
  rankFreq: { 'High Card': 0.1741, 'One Pair': 0.4384, 'Two Pair': 0.2356, 'Three of a Kind': 0.0481, 'Straight': 0.0462, 'Flush': 0.0303, 'Full House': 0.0256, 'Four of a Kind': 0.0024, 'Straight Flush': 0.00139, 'Royal Flush': 0.000032 },
  colorFreq: { '3R': 0.3125, '3B': 0.3125, '4R': 0.1563, '4B': 0.1563, '5R': 0.0313, '5B': 0.0313 },
  lowHighFreq: { LOW: 0.4615, HIGH: 0.5385 }
};

const pct = (x: number) => (x * 100).toFixed(2) + '%';
const ddiff = (o: number, t: number) => ((o - t) * 100).toFixed(2);
const dL = (o: number, t: number) => Math.abs(o-t) >= 0.06 ? 'critical' : Math.abs(o-t) >= 0.03 ? 'warning' : 'ok';

async function getAllRounds(base44: any): Promise<any[]> {
  const all: any[] = [];
  let skip = 0;
  const limit = 500;
  while (true) {
    const batch = await base44.asServiceRole.entities.ObserverRound.filter({}, { limit, skip });
    if (!batch || !batch.length) break;
    all.push(...batch);
    if (batch.length < limit) break;
    skip += limit;
  }
  return all;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { action = 'analyze', question = '', roundData } = body;

    // ── SAVE A SINGLE ROUND ─────────────────────────────────────
    if (action === 'saveRound') {
      if (!roundData) return Response.json({ error: 'No roundData provided' }, { status: 400 });
      const created = await base44.asServiceRole.entities.ObserverRound.create({
        session_id: roundData.sessionId || 'live',
        round_number: roundData.roundId,
        community_cards: (roundData.communityCards || []).map((c: any) => (c?.rank ?? '') + (c?.suit ?? '')),
        winner_hand_ids: roundData.winnerHandIds || [],
        winning_rank: roundData.winningRank || null,
        winning_colors: roundData.winningColors || [],
        winning_low_high: roundData.winningLowHigh || null,
        is_board_win: roundData.isBoardWin || false,
        hand_bets: roundData.handBets || {},
        rank_bets: roundData.rankBets || {},
        color_bets: roundData.colorBets || {},
        low_high_bet: roundData.lowHighBet || null,
        kill_switch_active: roundData.killSwitchActive || false,
        hand_bet_count: roundData.handBetCount || 0,
        total_bet: roundData.totalBet || 0,
        total_payout: roundData.totalPayout || 0,
        net_result: roundData.netResult || 0,
        balance_before: roundData.balanceBefore || 0,
        balance_after: roundData.balanceAfter || 0,
        reds_count: roundData.redsCount || 0,
        blacks_count: roundData.blacksCount || 0,
        river_card: roundData.riverCard || null,
      });
      return Response.json({ success: true, id: created.id });
    }

    // ── CLEAR ALL ROUNDS ─────────────────────────────────────────
    if (action === 'clearRounds') {
      const rounds = await getAllRounds(base44);
      await Promise.all(rounds.map((r: any) => base44.asServiceRole.entities.ObserverRound.delete(r.id)));
      return Response.json({ success: true, deleted: rounds.length });
    }

    // ── STATUS ───────────────────────────────────────────────────
    if (action === 'status') {
      const rounds = await getAllRounds(base44);
      return Response.json({ roundsLoaded: rounds.length, ready: rounds.length >= 250 });
    }

    // ── EXPORT ───────────────────────────────────────────────────
    if (action === 'export') {
      const rounds = await getAllRounds(base44);
      return Response.json({ roundsAnalyzed: rounds.length, rawRounds: rounds });
    }

    // ── ANALYZE ──────────────────────────────────────────────────
    const rounds: any[] = await getAllRounds(base44);
    const n = rounds.length;

    if (n < 50) return Response.json({ error: 'Insufficient data', roundsLoaded: n, needed: 50 });

    // ── CRUNCH DATA ──────────────────────────────────────────────
    const hW: any = { board: 0 };
    for (let i = 1; i <= 10; i++) hW[i] = 0;
    const rC: any = {}, cC: any = {'3R':0,'3B':0,'4R':0,'4B':0,'5R':0,'5B':0}, lC: any = {LOW:0,HIGH:0}, bU: any = {};
    let ks = 0, tb = 0, tp = 0;

    for (const r of rounds) {
      if (r.is_board_win) hW.board++;
      else (r.winner_hand_ids || []).forEach((h: number) => { hW[h] = (hW[h] || 0) + 1; });
      if (r.winning_rank) rC[r.winning_rank] = (rC[r.winning_rank] || 0) + 1;
      (r.winning_colors || []).forEach((c: string) => { if (cC[c] !== undefined) cC[c]++; });
      if (r.winning_low_high) lC[r.winning_low_high]++;
      if (r.kill_switch_active) ks++;
      tb += r.total_bet || 0; tp += r.total_payout || 0;
      if (r.hand_bets) Object.keys(r.hand_bets).forEach((k: string) => { bU['hand_'+k] = (bU['hand_'+k]||0)+1; });
      if (r.color_bets) Object.keys(r.color_bets).forEach((k: string) => { bU['color_'+k] = (bU['color_'+k]||0)+1; });
      if (r.rank_bets) Object.keys(r.rank_bets).forEach((k: string) => { bU['rank_'+k] = (bU['rank_'+k]||0)+1; });
      if (r.low_high_bet?.type) bU['lh_'+r.low_high_bet.type] = (bU['lh_'+r.low_high_bet.type]||0)+1;
    }

    const df: any[] = [];
    const HAND_NAMES = ['A♦10♥','K♣K♠','Q♣J♠','Q♦10♠','J♣9♣','8♦6♦','7♦7♠','4♥2♥','3♣3♥','A♥5♦'];
    const hD = Object.entries(hW).map(([id, w]: any) => {
      const o = w/n, t = THEORETICAL.handWinFreq[id]||0, lv = dL(o,t);
      const nm = id==='board' ? 'Board Win' : `Hand ${id} (${HAND_NAMES[Number(id)-1]||'?'})`;
      if (lv !== 'ok') df.push({ category:'Hand Win', position:nm, obs:pct(o), theo:pct(t), drift:ddiff(o,t)+'pp', level:lv });
      return { hid:id, name:nm, obs:o, theo:t, level:lv, wins:w };
    });
    Object.entries(rC).forEach(([r,c]:any) => { const o=c/n,t=THEORETICAL.rankFreq[r]||0,lv=dL(o,t); if(lv!=='ok') df.push({category:'Rank',position:r,obs:pct(o),theo:pct(t),drift:ddiff(o,t)+'pp',level:lv}); });
    Object.entries(cC).forEach(([k,c]:any) => { const o=c/n,t=THEORETICAL.colorFreq[k]||0,lv=dL(o,t); if(lv!=='ok') df.push({category:'Color',position:k,obs:pct(o),theo:pct(t),drift:ddiff(o,t)+'pp',level:lv}); });
    ['LOW','HIGH'].forEach(t => { const o=lC[t]/n,th=THEORETICAL.lowHighFreq[t],lv=dL(o,th); if(lv!=='ok') df.push({category:'River',position:t,obs:pct(o),theo:pct(th),drift:ddiff(o,th)+'pp',level:lv}); });

    const ex = hD.filter(h=>h.obs>(h.theo+0.04)&&h.wins>=5).sort((a,b)=>(b.obs-b.theo)-(a.obs-a.theo)).map(h=>({
      position:h.name, observedFreq:pct(h.obs), theoreticalFreq:pct(h.theo),
      overFrequency:ddiff(h.obs,h.theo)+'pp', severity:h.obs-h.theo>=0.08?'HIGH':'MEDIUM'
    }));
    const tb2 = Object.entries(bU).sort((a:any,b:any)=>b[1]-a[1]).slice(0,8).map(([p,c]:any) => ({ position:p, usageRate:pct(c/n) }));
    const ksr = ks/n, rtp = tb>0?(tp/tb)*100:null, he = rtp?(100-rtp).toFixed(2)+'%':null;
    const cr = df.filter(f=>f.level==='critical'), wr = df.filter(f=>f.level==='warning');
    const recs: string[] = [];
    if (!cr.length&&!wr.length) recs.push('All frequencies within variance. No calibration needed.');
    cr.forEach(f => recs.push('CRITICAL: '+f.position+' drifting '+f.drift+' from theory.'));
    wr.forEach(f => recs.push('WARNING: '+f.position+' showing '+f.drift+' drift.'));
    if (ex.length) recs.push(ex.length+' exploit candidate(s) detected.');
    if (rtp) { const r2=+rtp.toFixed(2); recs.push(r2>97?'RTP '+r2.toFixed(2)+'% above 97% ceiling.':r2<88?'RTP '+r2.toFixed(2)+'% unusually low.':'RTP '+r2.toFixed(2)+'% within range.'); }

    let ans: string|null = null;
    if (action==='ask' && question) {
      const q = question.toLowerCase();
      if (q.includes('rtp')||q.includes('house edge')) {
        ans = rtp ? `Based on ${n} rounds: ${rtp.toFixed(2)}% RTP (house edge: ${he}). ${rtp>96?'Above 96% — check high-payout hands.':rtp<90?'Below floor — verify tie logic.':'Healthy range.'}` : 'No bet data yet.';
      } else if (q.includes('exploit')||q.includes('weakness')) {
        ans = ex.length===0 ? `No exploits in ${n} rounds. ${n<500?'Small sample.':'Good sign.'}` : `${ex.length} target(s): ${ex.map((e:any)=>e.position+' (+'+e.overFrequency+')').join(', ')}.`;
      } else if (q.includes('kill')||q.includes('switch')) {
        ans = `Kill-switch: ${(ksr*100).toFixed(1)}% of rounds (${ks}/${n}). ${ksr>0.4?'High.':ksr<0.05?'Low — not tested yet.':'Normal.'}`;
      } else if (q.includes('payout')||q.includes('calibrat')) {
        const top = [...df].sort((a,b)=>Math.abs(+b.drift)-Math.abs(+a.drift)).slice(0,3);
        ans = top.length===0 ? 'All within variance.' : `Top drift: ${top.map((d:any)=>d.position+' ('+d.drift+')').join(', ')}. At ${n} rounds.`;
      } else {
        ans = `${n} rounds observed. RTP: ${rtp?rtp.toFixed(2)+'%':'pending'}. Kill-switch: ${(ksr*100).toFixed(1)}%. Flags: ${df.length}. Exploits: ${ex.length}.`;
      }
    }

    return Response.json({
      roundsAnalyzed: n,
      readyForSecurity: n>=250,
      observedRTP: rtp?+rtp.toFixed(2):null,
      houseEdge: he,
      killSwitchRate: pct(ksr),
      driftFlags: df,
      exploitCandidates: ex,
      recommendations: recs,
      topBetPositions: tb2,
      handDrift: hD.map(h=>({...h,obs:pct(h.obs),theo:pct(h.theo)})),
      partnerAnswer: ans
    });

  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, { status: 500 });
  }
});
