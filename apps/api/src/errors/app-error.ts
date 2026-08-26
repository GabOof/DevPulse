export interface AppErrorOptions {
    code: string;
    message: string;
    statusCode?: number;
    details?: unknown;
}

export class AppError extends Error {
    readonly code: string;

    readonly statusCode: number;

    readonly details?: unknown;

    constructor({ code, message, statusCode = 500, details }: AppErrorOptions) {
        super(message);

        this.name = "AppError";

        this.code = code;

        this.statusCode = statusCode;

        this.details = details;

        /*
         * Necessário principalmente
         * quando a classe Error é
         * estendida em determinados
         * targets JavaScript.
         */
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
