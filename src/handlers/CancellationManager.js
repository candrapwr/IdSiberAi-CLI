class CancellationManager {
  constructor() {
    this.jobs = new Map(); // jobId -> { controller, startedAt, meta }
  }

    /**
     * Create a new abort controller for a job.
     * @param {string} jobId
     * @param {object} meta optional metadata for debugging
     * @returns {{signal: AbortSignal, controller: AbortController}}
     */
  create(jobId, meta = {}) {
    if (!jobId) throw new Error('jobId is required');
    // If existing, cancel and replace to avoid leaks
    this.cancel(jobId);
    const controller = new AbortController();
    this.jobs.set(jobId, { controller, startedAt: Date.now(), meta });
    return { signal: controller.signal, controller };
  }

  /**
   * Cancel an existing job.
   * @param {string} jobId
   * @returns {boolean} true if a job was canceled
   */
  cancel(jobId) {
    const rec = this.jobs.get(jobId);
    if (rec) {
      try { rec.controller.abort(); } catch (_) {}
      this.jobs.delete(jobId);
      return true;
    }
    return false;
  }

  /**
   * Check if a job exists.
   * @param {string} jobId
   */
  has(jobId) {
    return this.jobs.has(jobId);
  }

  /**
   * Retrieve the AbortSignal for a job.
   * @param {string} jobId
   * @returns {AbortSignal|null}
   */
  getSignal(jobId) {
    const rec = this.jobs.get(jobId);
    return rec ? rec.controller.signal : null;
  }

  /**
   * Cancel all jobs (e.g., on shutdown or session reset)
   */
  cancelAll() {
    for (const [jobId, rec] of this.jobs.entries()) {
      try { rec.controller.abort(); } catch (_) {}
      this.jobs.delete(jobId);
    }
  }
}

export default new CancellationManager();
