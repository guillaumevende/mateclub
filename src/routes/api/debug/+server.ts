import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 1000;
const MAX_LOGS_PER_MINUTE = 30;
const LOG_HISTORY: { timestamp: number }[] = [];

function sliceString(value: unknown, maxLength: number) {
    return typeof value === 'string' ? value.slice(0, maxLength) : undefined;
}

function sanitizeValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return value.slice(0, 500);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeValue);
    if (typeof value === 'object') {
        return sanitizeContext(value as Record<string, unknown>);
    }
    return String(value).slice(0, 500);
}

function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context).slice(0, 60)) {
        sanitized[key] = sanitizeValue(value);
    }
    return sanitized;
}

function rateLimitCheck(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Nettoyer les vieux logs
    while (LOG_HISTORY.length > 0 && LOG_HISTORY[0].timestamp < oneMinuteAgo) {
        LOG_HISTORY.shift();
    }
    
    // Vérifier la limite
    if (LOG_HISTORY.length >= MAX_LOGS_PER_MINUTE) {
        return false;
    }
    
    LOG_HISTORY.push({ timestamp: now });
    return true;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!rateLimitCheck()) {
        return json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const body = await request.json();
        
        const message = String(body.message || '').slice(0, MAX_MESSAGE_LENGTH);
        const stack = String(body.stack || '').slice(0, MAX_STACK_LENGTH);
        const context = body.context && typeof body.context === 'object'
            ? sanitizeContext(body.context)
            : {};
        const userId = locals.user?.id || 'anonymous';
        
        // Log structuré pour faciliter le parsing
        const logEntry = {
            level: 'ERROR',
            timestamp: new Date().toISOString(),
            userId,
            message,
            stack: stack.length > 0 ? stack : undefined,
            context: {
                ...context,
                url: sliceString(context.url, 300),
                userAgent: sliceString(context.userAgent, 300),
                audioType: sliceString(context.audioType, 80),
            }
        };
        
        console.error('[CLIENT ERROR]', JSON.stringify(logEntry));
        
        return json({ success: true });
    } catch (e) {
        return json({ error: 'Invalid request' }, { status: 400 });
    }
};
