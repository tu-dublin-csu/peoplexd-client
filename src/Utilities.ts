import { decode } from 'html-entities'

export function decodeHtml(text: string): string {
    return decode(text)
}

export enum LogType {
    LOG = 'LOG',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

export function log(logType: LogType, ...args: unknown[]): void {
    if(!process.env.PXD_NODE_ENV){
        // default behaviour, do not log if PXD_NODE_ENV is not set
        return;
    }
    if ('DEVELOPMENT' === process.env.PXD_NODE_ENV) {
        switch (logType) {
            case LogType.LOG:
                console.log(...args)
                break;
            case LogType.WARN:
                console.warn(...args)
                break;
            case LogType.ERROR:
                console.error(...args)
                break;
            case LogType.DEBUG:
                console.debug(...args)
                break;
            default:    
                throw new Error(`Unknown log type: ${logType}`);
        }
    }
}
