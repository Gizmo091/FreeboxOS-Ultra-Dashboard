import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { freeboxApi } from './freeboxApi.js';
import { config } from '../config.js';

export interface RebootSchedule {
  enabled: boolean;
  days: number[]; // 0-6 (Sun-Sat)
  time: string; // "HH:MM"
}

const DEFAULT_SCHEDULE: RebootSchedule = {
  enabled: false,
  days: [],
  time: '03:00'
};

class RebootSchedulerService {
  private schedule: RebootSchedule;
  private task: cron.ScheduledTask | null = null;
  private configPath: string;

  constructor() {
    // Determine config file path (next to token file)
    const tokenPath = config.freebox.tokenFile;
    const configDir = path.dirname(tokenPath);
    this.configPath = path.join(configDir, '.reboot_schedule.json');
    
    this.schedule = this.loadSchedule();
    this.updateCronJob();
  }

  private loadSchedule(): RebootSchedule {
    if (fs.existsSync(this.configPath)) {
      try {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return { ...DEFAULT_SCHEDULE, ...JSON.parse(data) };
      } catch (error) {
        console.error('[Scheduler] Failed to load schedule:', error);
      }
    }
    return { ...DEFAULT_SCHEDULE };
  }

  private saveSchedule() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.schedule, null, 2), 'utf-8');
      console.log(`[Scheduler] Saved schedule to ${this.configPath}`);
    } catch (error) {
      console.error('[Scheduler] Failed to save schedule:', error);
    }
  }

  getSchedule(): RebootSchedule {
    return this.schedule;
  }

  updateSchedule(newSchedule: Partial<RebootSchedule>): RebootSchedule {
    this.schedule = { ...this.schedule, ...newSchedule };
    this.saveSchedule();
    this.updateCronJob();
    return this.schedule;
  }

  private updateCronJob() {
    // Stop existing task
    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    if (!this.schedule.enabled || this.schedule.days.length === 0) {
      console.log('[Scheduler] Reboot schedule disabled');
      return;
    }

    // Parse time
    const [hour, minute] = this.schedule.time.split(':');
    
    // Construct cron expression: "minute hour * * days"
    const daysStr = this.schedule.days.join(',');
    const cronExpression = `${minute} ${hour} * * ${daysStr}`;

    console.log(`[Scheduler] Scheduling reboot with cron: "${cronExpression}"`);

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error('[Scheduler] Invalid cron expression generated');
      return;
    }

    this.task = cron.schedule(cronExpression, async () => {
      console.log('[Scheduler] Executing scheduled reboot...');
      try {
        await freeboxApi.reboot();
      } catch (error) {
        console.error('[Scheduler] Scheduled reboot failed:', error);
      }
    });
  }
}

export const rebootScheduler = new RebootSchedulerService();
