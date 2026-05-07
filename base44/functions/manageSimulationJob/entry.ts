import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ============================================================
// MANAGE SIMULATION JOB
// Actions:
//   create  — create a new SimulationJob record
//   status  — get job + all bet results
//   update  — update job fields (bets_complete, status, blended_rtp, etc.)
//   delete  — delete job and all its bet results
//   list    — list all jobs (summary)
// ============================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, job_id, ...fields } = body;

    if (!action) return Response.json({ error: 'Missing action' }, { status: 400 });

    // ── CREATE ────────────────────────────────────────────────
    if (action === 'create') {
      const {
        module_id, module_name, rounds_per_bet, bets_total,
        rtp_low, rtp_high, standard, payouts_snapshot,
      } = fields;

      if (!module_id || !rounds_per_bet || !bets_total) {
        return Response.json({ error: 'Missing: module_id, rounds_per_bet, bets_total' }, { status: 400 });
      }

      const job = await base44.asServiceRole.entities.SimulationJob.create({
        module_id,
        module_name: module_name ?? module_id,
        status: 'pending',
        bets_total,
        bets_complete: 0,
        rounds_per_bet,
        rtp_low: rtp_low ?? 94,
        rtp_high: rtp_high ?? 98.5,
        standard: standard ?? 'House Internal Standard',
        blended_rtp: null,
        bets_passed: 0,
        bets_failed: 0,
        started_at: new Date().toISOString(),
        payouts_snapshot: payouts_snapshot ?? null,
      });

      return Response.json({ success: true, job });
    }

    // ── STATUS ────────────────────────────────────────────────
    if (action === 'status') {
      if (!job_id) return Response.json({ error: 'Missing job_id' }, { status: 400 });

      const job = await base44.asServiceRole.entities.SimulationJob.get(job_id);
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

      const results = await base44.asServiceRole.entities.SimulationBetResult.filter({ job_id });

      return Response.json({ success: true, job, results });
    }

    // ── UPDATE ────────────────────────────────────────────────
    if (action === 'update') {
      if (!job_id) return Response.json({ error: 'Missing job_id' }, { status: 400 });

      const allowedFields = [
        'status','bets_complete','blended_rtp','bets_passed',
        'bets_failed','completed_at','error_message',
      ];
      const updateData: Record<string,unknown> = {};
      for (const f of allowedFields) {
        if (fields[f] !== undefined) updateData[f] = fields[f];
      }

      const updated = await base44.asServiceRole.entities.SimulationJob.update(job_id, updateData);
      return Response.json({ success: true, job: updated });
    }

    // ── DELETE ────────────────────────────────────────────────
    if (action === 'delete') {
      if (!job_id) return Response.json({ error: 'Missing job_id' }, { status: 400 });

      // Delete all bet results for this job first
      const results = await base44.asServiceRole.entities.SimulationBetResult.filter({ job_id });
      await Promise.all(results.map((r: {id: string}) =>
        base44.asServiceRole.entities.SimulationBetResult.delete(r.id)
      ));

      await base44.asServiceRole.entities.SimulationJob.delete(job_id);
      return Response.json({ success: true, deleted: { job_id, bet_results: results.length } });
    }

    // ── LIST ──────────────────────────────────────────────────
    if (action === 'list') {
      const jobs = await base44.asServiceRole.entities.SimulationJob.list();
      // Sort newest first
      jobs.sort((a: {created_date: string}, b: {created_date: string}) =>
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      );
      return Response.json({ success: true, jobs });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
