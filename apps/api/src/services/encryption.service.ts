import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "../config/env.js";

/*
 * =========================================================
 * ENCRYPTION CONFIGURATION
 * =========================================================
 */

const ALGORITHM = "aes-256-gcm";

const IV_LENGTH = 12;

/*
 * =========================================================
 * ENCRYPTION SERVICE
 * =========================================================
 */

export class EncryptionService {
    private readonly key: Buffer;

    constructor() {
        /*
         * A validação da chave agora fica
         * centralizada em env.ts.
         *
         * env.auth.encryptionKey garante:
         *
         * - variável configurada;
         * - exatamente 64 caracteres hex;
         * - equivalente a 32 bytes;
         * - compatível com AES-256.
         */

        this.key = Buffer.from(
            env.auth.encryptionKey,

            "hex"
        );
    }

    /*
     * =====================================================
     * ENCRYPT
     * =====================================================
     *
     * AES-256-GCM gera:
     *
     * IV
     * +
     * Authentication Tag
     * +
     * Ciphertext
     *
     * Resultado:
     *
     * iv.authTag.encrypted
     */

    encrypt(value: string): string {
        /*
         * 12 bytes é o tamanho recomendado
         * para IV em AES-GCM.
         */

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

    /*
     * =====================================================
     * DECRYPT
     * =====================================================
     */

    decrypt(value: string): string {
        const [ivEncoded, authTagEncoded, encryptedEncoded] = value.split(".");

        /*
         * O token criptografado sempre deve
         * possuir exatamente as três partes:
         *
         * IV
         * Authentication Tag
         * Ciphertext
         */

        if (!ivEncoded || !authTagEncoded || !encryptedEncoded) {
            throw new Error("TOKEN_ENCRYPTION_INVALID");
        }

        const iv = Buffer.from(ivEncoded, "base64");

        const authTag = Buffer.from(authTagEncoded, "base64");

        const encrypted = Buffer.from(encryptedEncoded, "base64");

        /*
         * Proteção adicional.
         *
         * O IV usado pelo DevPulse deve
         * possuir exatamente 12 bytes.
         */

        if (iv.length !== IV_LENGTH) {
            throw new Error("TOKEN_ENCRYPTION_INVALID");
        }

        const decipher = createDecipheriv(ALGORITHM, this.key, iv);

        /*
         * O GCM valida integridade e
         * autenticidade através da auth tag.
         */

        decipher.setAuthTag(authTag);

        try {
            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

            return decrypted.toString("utf8");
        } catch {
            /*
             * Não propagamos detalhes
             * criptográficos para camadas
             * superiores.
             */

            throw new Error("TOKEN_ENCRYPTION_INVALID");
        }
    }
}
