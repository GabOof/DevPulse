import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

const IV_LENGTH = 12;

export class EncryptionService {
    private readonly key: Buffer;

    constructor() {
        const encryptionKey = process.env.AUTH_ENCRYPTION_KEY;

        if (!encryptionKey) {
            throw new Error("AUTH_ENCRYPTION_KEY não configurada.");
        }

        const key = Buffer.from(encryptionKey, "hex");

        if (key.length !== 32) {
            throw new Error("AUTH_ENCRYPTION_KEY deve possuir 32 bytes.");
        }

        this.key = key;
    }

    encrypt(value: string): string {
        const iv = randomBytes(IV_LENGTH);

        const cipher = createCipheriv(ALGORITHM, this.key, iv);

        const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

        const authTag = cipher.getAuthTag();

        return [
            iv.toString("base64"),
            authTag.toString("base64"),
            encrypted.toString("base64"),
        ].join(".");
    }

    decrypt(value: string): string {
        const [ivEncoded, authTagEncoded, encryptedEncoded] = value.split(".");

        if (!ivEncoded || !authTagEncoded || !encryptedEncoded) {
            throw new Error("TOKEN_ENCRYPTION_INVALID");
        }

        const iv = Buffer.from(ivEncoded, "base64");

        const authTag = Buffer.from(authTagEncoded, "base64");

        const encrypted = Buffer.from(encryptedEncoded, "base64");

        const decipher = createDecipheriv(ALGORITHM, this.key, iv);

        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

        return decrypted.toString("utf8");
    }
}
