import fs from 'fs/promises';
import path from 'path';

export class SessionManager {
    constructor(options = {}) {
        this.sessionsDir = path.resolve(options.sessionsDir || './sessions');
        this.ensureDirPromise = null;
    }

    async ensureDirectory() {
        if (!this.ensureDirPromise) {
            this.ensureDirPromise = fs.mkdir(this.sessionsDir, { recursive: true })
                .catch(error => {
                    this.ensureDirPromise = null;
                    throw error;
                });
        }
        return this.ensureDirPromise;
    }

    getSessionPath(sessionId) {
        if (!sessionId) {
            throw new Error('sessionId is required');
        }
        return path.join(this.sessionsDir, `${sessionId}.json`);
    }

    deriveTitle(conversation, fallbackTitle) {
        if (!Array.isArray(conversation)) {
            return fallbackTitle || 'Untitled Session';
        }

        const firstUser = conversation.find(message => message.role === 'user' && typeof message.content === 'string');
        if (firstUser && firstUser.content.trim()) {
            return firstUser.content.trim().replace(/\s+/g, ' ').slice(0, 80);
        }

        return fallbackTitle || 'Untitled Session';
    }

    async saveSession(sessionId, conversation, metadata = {}) {
        if (!sessionId) {
            throw new Error('sessionId is required to save a session');
        }

        if (!Array.isArray(conversation)) {
            throw new Error('conversation must be an array of messages');
        }

        await this.ensureDirectory();
        const sessionPath = this.getSessionPath(sessionId);
        const now = new Date().toISOString();

        let existingData = null;
        try {
            const raw = await fs.readFile(sessionPath, 'utf8');
            existingData = JSON.parse(raw);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        const title = metadata.title || existingData?.title || this.deriveTitle(conversation, metadata.fallbackTitle);
        const sessionData = {
            sessionId,
            title,
            createdAt: existingData?.createdAt || now,
            updatedAt: now,
            aiProvider: metadata.aiProvider || existingData?.aiProvider || null,
            messageCount: conversation.length,
            lastUserMessage: metadata.lastUserMessage || existingData?.lastUserMessage || null,
            lastAssistantMessage: metadata.lastAssistantMessage || existingData?.lastAssistantMessage || null,
            conversation,
            metadata: {
                ...existingData?.metadata,
                ...metadata
            }
        };

        await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf8');
        return sessionData;
    }

    async listSessions() {
        await this.ensureDirectory();
        let files;
        try {
            files = await fs.readdir(this.sessionsDir);
        } catch (error) {
            throw new Error(`Failed to read sessions directory: ${error.message}`);
        }

        const sessions = [];
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const raw = await fs.readFile(path.join(this.sessionsDir, file), 'utf8');
                const parsed = JSON.parse(raw);
                sessions.push({
                    sessionId: parsed.sessionId,
                    title: parsed.title || 'Untitled Session',
                    updatedAt: parsed.updatedAt,
                    createdAt: parsed.createdAt,
                    aiProvider: parsed.aiProvider || parsed.metadata?.aiProvider || null,
                    messageCount: parsed.messageCount || parsed.conversation?.length || 0,
                    lastUserMessage: parsed.lastUserMessage || parsed.metadata?.lastUserMessage || null,
                    lastAssistantMessage: parsed.lastAssistantMessage || parsed.metadata?.lastAssistantMessage || null
                });
            } catch (error) {
                sessions.push({
                    sessionId: file.replace(/\.json$/, ''),
                    title: `Unreadable session (${error.message})`,
                    updatedAt: null,
                    createdAt: null,
                    aiProvider: null,
                    messageCount: 0,
                    error: true
                });
            }
        }

        sessions.sort((a, b) => {
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return bTime - aTime;
        });

        return sessions;
    }

    async loadSession(sessionId) {
        await this.ensureDirectory();
        const sessionPath = this.getSessionPath(sessionId);
        try {
            const raw = await fs.readFile(sessionPath, 'utf8');
            return JSON.parse(raw);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Session ${sessionId} not found`);
            }
            throw new Error(`Failed to load session: ${error.message}`);
        }
    }

    async deleteSession(sessionId) {
        await this.ensureDirectory();
        const sessionPath = this.getSessionPath(sessionId);
        try {
            await fs.unlink(sessionPath);
            return { success: true };
        } catch (error) {
            if (error.code === 'ENOENT') {
                return { success: false, error: 'Session not found' };
            }
            return { success: false, error: error.message };
        }
    }
}
