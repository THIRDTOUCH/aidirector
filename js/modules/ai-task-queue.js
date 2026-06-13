/**
 * ============================================================
 * AI 导演台 · AI Task Queue & Poller
 *
 * 纯浏览器版 — 基于魔因漫创 moyin-creator task-queue / task-poller 设计
 * License: AGPL-3.0
 *
 * 核心功能：
 *  - 任务优先级队列（FIFO + 优先级排序）
 *  - 最大并发数控制（避免 API 限流）
 *  - 自动重试（maxRetries）
 *  - 任务状态轮询（异步任务完成）
 *  - 动态超时调整（根据 estimatedTime）
 *  - 进度回调（onProgress → UI 更新）
 * ============================================================
 */

(function () {
  'use strict';

  // ============================================================
  // Task States
  // ============================================================
  const TaskState = {
    PENDING:   'pending',
    RUNNING:   'running',
    COMPLETED: 'completed',
    FAILED:    'failed',
    CANCELLED: 'cancelled'
  };

  // ============================================================
  // TaskItem
  // ============================================================
  let _taskIdCounter = 0;

  function createTask(options) {
    return {
      id:            options.id      || ('task_' + (++_taskIdCounter)),
      type:          options.type    || 'unknown',   // 'generate_image' | 'generate_video' | 'llm_call'
      priority:      options.priority || 5,           // 1（最高）~ 10（最低）
      payload:       options.payload  || {},
      state:         TaskState.PENDING,
      retries:       0,
      maxRetries:    options.maxRetries || 3,
      createdAt:     Date.now(),
      startedAt:     null,
      completedAt:   null,
      result:        null,
      error:         null,
      progress:      0,       // 0-100
      estimatedTime: options.estimatedTime || 30000, // ms
      metadata:      options.metadata || {}
    };
  }

  // ============================================================
  // TaskQueue — 任务队列管理
  // ============================================================
  class TaskQueue {
    constructor(options) {
      options = options || {};
      this.maxConcurrent = options.maxConcurrent || 3;  // 最大并发数
      this._queue = [];         // 待执行队列
      this._running = [];        // 正在执行
      this._completed = [];      // 已完成
      this._listeners = {};     // 事件监听器
      this._paused = false;
    }

    // -------- 事件系统 --------
    on(event, handler) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(handler);
      return this;
    }

    off(event, handler) {
      if (!this._listeners[event]) return;
      this._listeners[event] = this._listeners[event].filter(h => h !== handler);
    }

    _emit(event, data) {
      if (!this._listeners[event]) return;
      this._listeners[event].forEach(h => {
        try { h(data); } catch (e) { console.error('[TaskQueue] listener error:', e); }
      });
    }

    // -------- 队列操作 --------
    add(options) {
      const task = createTask(options);
      this._queue.push(task);
      // 按优先级排序（数字小的排前面）
      this._queue.sort((a, b) => a.priority - b.priority);
      this._emit('taskAdded', task);
      this._tryStartNext();
      return task.id;
    }

    addBatch(optionsList) {
      return optionsList.map(opts => this.add(opts));
    }

    remove(taskId) {
      // 从待执行队列移除
      const qi = this._queue.findIndex(t => t.id === taskId);
      if (qi >= 0) {
        const removed = this._queue.splice(qi, 1)[0];
        this._emit('taskRemoved', removed);
        return removed;
      }
      // 从运行中取消
      const ri = this._running.findIndex(t => t.id === taskId);
      if (ri >= 0) {
        const running = this._running[ri];
        running.state = TaskState.CANCELLED;
        running.error = new Error('Cancelled by user');
        this._running.splice(ri, 1);
        this._emit('taskRemoved', running);
        return running;
      }
      return null;
    }

    cancelAll() {
      const cancelled = [];
      this._queue.forEach(t => {
        t.state = TaskState.CANCELLED;
        cancelled.push(t);
      });
      this._running.forEach(t => {
        t.state = TaskState.CANCELLED;
        t.error = new Error('Cancelled by user');
        cancelled.push(t);
      });
      this._queue = [];
      this._running = [];
      cancelled.forEach(t => this._emit('taskRemoved', t));
      return cancelled;
    }

    pause()  { this._paused = true; }
    resume() { this._paused = false; this._tryStartNext(); }
    get paused() { return this._paused; }

    // -------- 状态查询 --------
    getTask(taskId) {
      return this._queue.find(t => t.id === taskId)
          || this._running.find(t => t.id === taskId)
          || this._completed.find(t => t.id === taskId)
          || null;
    }

    getPending()   { return [...this._queue]; }
    getRunning()   { return [...this._running]; }
    getCompleted() { return [...this._completed]; }
    getFailed()    { return this._completed.filter(t => t.state === TaskState.FAILED); }

    getStats() {
      return {
        pending:   this._queue.length,
        running:   this._running.length,
        completed: this._completed.filter(t => t.state === TaskState.COMPLETED).length,
        failed:    this._completed.filter(t => t.state === TaskState.FAILED).length,
        total:     this._queue.length + this._running.length + this._completed.length
      };
    }

    // -------- 内部执行逻辑 --------
    async _tryStartNext() {
      if (this._paused) return;
      if (this._running.length >= this.maxConcurrent) return;
      if (this._queue.length === 0) return;

      // 取出优先级最高的任务
      const task = this._queue.shift();
      task.state = TaskState.RUNNING;
      task.startedAt = Date.now();
      this._running.push(task);
      this._emit('taskStarted', task);

      try {
        const result = await this._executeTask(task);
        task.state = TaskState.COMPLETED;
        task.completedAt = Date.now();
        task.result = result;
        task.progress = 100;
        this._completeTask(task);
      } catch (err) {
        task.retries++;
        task.error = err;

        if (task.retries < task.maxRetries) {
          // 重试：放回队列
          task.state = TaskState.PENDING;
          // 降低优先级（指数退避）
          task.priority = Math.min(task.priority + 2, 10);
          this._queue.unshift(task);
          this._queue.sort((a, b) => a.priority - b.priority);
          this._emit('taskRetry', { task, attempt: task.retries });
        } else {
          task.state = TaskState.FAILED;
          this._completeTask(task);
        }
      }
    }

    _completeTask(task) {
      const idx = this._running.findIndex(t => t.id === task.id);
      if (idx >= 0) this._running.splice(idx, 1);
      this._completed.push(task);
      // 限制 completed 历史数量
      if (this._completed.length > 100) {
        this._completed.splice(0, this._completed.length - 100);
      }
      this._emit('taskCompleted', task);
      // 继续执行下一个
      this._tryStartNext();
    }

    // 由外部设置任务执行器
    setExecutor(fn) {
      this._executor = fn;
    }

    async _executeTask(task) {
      if (this._executor) {
        return await this._executor(task, this._onTaskProgress.bind(this, task.id));
      }
      // 默认：返回 payload
      return task.payload;
    }

    _onTaskProgress(taskId, progress, info) {
      const task = this._running.find(t => t.id === taskId);
      if (task) {
        task.progress = Math.max(task.progress || 0, progress);
        if (info) task.metadata = { ...task.metadata, ...info };
        this._emit('taskProgress', { task, progress, info });
      }
    }
  }

  // ============================================================
  // TaskPoller — 异步任务轮询器（用于轮询异步 AI API）
  // ============================================================
  class TaskPoller {
    constructor(options) {
      options = options || {};
      this.pollInterval  = options.pollInterval  || 2000;   // 基础轮询间隔（ms）
      this.maxWait       = options.maxWait        || 300000;  // 最大等待时间（5分钟）
      this.jitter        = options.jitter          || 0.3;     // 随机抖动 ±30%
      this._pollers = {};  // taskId -> { interval, timeout, state }
      this._listeners = {};
    }

    // -------- 事件系统 --------
    on(event, handler) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(handler);
      return this;
    }
    off(event, handler) {
      if (!this._listeners[event]) return;
      this._listeners[event] = this._listeners[event].filter(h => h !== handler);
    }
    _emit(event, data) {
      if (!this._listeners[event]) return;
      this._listeners[event].forEach(h => {
        try { h(data); } catch (e) { console.error('[TaskPoller] listener error:', e); }
      });
    }

    /**
     * 开始轮询一个异步任务
     * @param {string} taskId - 外部任务 ID
     * @param {Function} checkFn - async 函数，返回 { state, progress?, result?, error? }
     * @param {Object} options
     */
    async poll(taskId, checkFn, options) {
      options = options || {};
      const estimatedTime = options.estimatedTime || this.pollInterval * 10;
      const maxWait      = options.maxWait         || this.maxWait;

      // 动态调整初始间隔（根据预估时间）
      let interval = Math.max(this.pollInterval, Math.min(estimatedTime / 5, 30000));
      let elapsed  = 0;
      let state    = 'pending';

      return new Promise((resolve, reject) => {
        const poll = async () => {
          if (this._pollers[taskId]?.cancelled) {
            reject(new Error('Poll cancelled'));
            return;
          }

          try {
            const result = await checkFn(taskId);
            state = result.state || 'pending';
            const progress = result.progress || Math.min(90, Math.round(elapsed / estimatedTime * 100));

            this._emit('progress', { taskId, progress, state, result: result.result });

            if (state === 'completed' || state === 'success' || state === 'done') {
              this._clearPoller(taskId);
              this._emit('completed', { taskId, result: result.result });
              resolve(result.result);
              return;
            }
            if (state === 'failed' || state === 'error') {
              this._clearPoller(taskId);
              this._emit('failed', { taskId, error: result.error });
              reject(result.error || new Error('Task failed'));
              return;
            }

            elapsed += interval;

            if (elapsed >= maxWait) {
              this._clearPoller(taskId);
              this._emit('timeout', { taskId, elapsed });
              reject(new Error(`轮询超时（${Math.round(maxWait / 1000)}s），任务可能仍在处理中`));
              return;
            }

            // 动态调整间隔（越接近预估时间越频繁）
            const remaining = Math.max(estimatedTime - elapsed, 0);
            interval = Math.max(
              this.pollInterval,
              Math.min(remaining / 3, 30000)
            );
            // 加随机抖动
            interval *= (1 + (Math.random() * 2 - 1) * this.jitter);

            const poller = this._pollers[taskId];
            if (poller) {
              poller.interval = setTimeout(poll, interval);
            }

          } catch (err) {
            // 网络错误：稍后重试
            const poller = this._pollers[taskId];
            if (poller) {
              this._emit('error', { taskId, error: err });
              // 退避重试
              poller.interval = setTimeout(poll, interval * 2);
            }
          }
        };

        // 启动轮询
        this._pollers[taskId] = {
          interval: setTimeout(poll, 0),
          timeout: setTimeout(() => {
            this.cancel(taskId);
            reject(new Error(`轮询超时（${Math.round(maxWait / 1000)}s）`));
          }, maxWait),
          cancelled: false
        };

        this._emit('started', { taskId });
      });
    }

    cancel(taskId) {
      const poller = this._pollers[taskId];
      if (!poller) return;
      poller.cancelled = true;
      if (poller.interval) clearTimeout(poller.interval);
      if (poller.timeout)  clearTimeout(poller.timeout);
      delete this._pollers[taskId];
      this._emit('cancelled', { taskId });
    }

    cancelAll() {
      Object.keys(this._pollers).forEach(id => this.cancel(id));
    }

    _clearPoller(taskId) {
      const poller = this._pollers[taskId];
      if (poller) {
        if (poller.interval) clearTimeout(poller.interval);
        if (poller.timeout)  clearTimeout(poller.timeout);
        delete this._pollers[taskId];
      }
    }
  }

  // ============================================================
  // 对外暴露
  // ============================================================
  window.DC = window.DC || {};

  window.DC.TaskState = TaskState;
  window.DC.TaskQueue = TaskQueue;
  window.DC.TaskPoller = TaskPoller;

  // 全局默认队列实例
  window.DC.AITaskQueue = new TaskQueue({ maxConcurrent: 3 });
  window.DC.AITaskPoller = new TaskPoller();

  // 监听队列事件 → toast 通知
  window.DC.AITaskQueue.on('taskCompleted', task => {
    if (task.type === 'generate_image') {
      console.log('[TaskQueue] 图片生成完成:', task.id);
    }
  });
  window.DC.AITaskQueue.on('taskRetry', ({ task, attempt }) => {
    console.warn('[TaskQueue] 任务重试:', task.id, 'attempt', attempt);
  });

  console.log('[DC] AI TaskQueue & Poller 已就绪（并发控制+自动重试+动态轮询）');
})();
