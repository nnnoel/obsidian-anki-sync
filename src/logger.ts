export class Logger {
    private enabled: boolean;
    private readonly prefix: string;

    constructor(enabled: boolean = false) {
        this.enabled = enabled;
        this.prefix = '[Anki Sync] ';
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    log(...args: any[]) {
        if (this.enabled) {
            console.log(this.prefix, ...args);
        }
    }

    error(...args: any[]) {
        if (this.enabled) {
            console.error(this.prefix, ...args);
        }
    }

    warn(...args: any[]) {
        if (this.enabled) {
            console.warn(this.prefix, ...args);
        }
    }

    debug(...args: any[]) {
        if (this.enabled) {
            console.debug(this.prefix, ...args);
        }
    }
}
