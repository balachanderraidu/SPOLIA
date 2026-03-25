// ──────────────────────────────────────────────────────────────────
// components/chat.js  —  Spolia Walled Bond Chat
// Bond-gated: chat only opens once a Bond exists between two parties.
// Contact-info filter: phone/email/UPI/WhatsApp are blocked before send.
// ──────────────────────────────────────────────────────────────────

import { FirebaseDB } from '../firebase-config.js';

// ── Contact-leakage detection patterns ───────────────────────────
// Blocks phone numbers, emails, UPI IDs, WhatsApp handles, Insta, Telegram
const LEAKAGE_PATTERNS = [
    /(\+?91[\s\-]?)?[6-9]\d{9}/g,           // Indian mobile numbers
    /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, // email
    /\b[\w.\-]+@(okaxis|okicici|okhdfcbank|oksbi|ybl|ibl|axl|upi)\b/gi, // UPI IDs
    /wa\.me\/\d+/gi,                         // WhatsApp wa.me links
    /whatsapp\.com/gi,                       // WhatsApp domain
    /t\.me\/[A-Za-z0-9_]+/gi,              // Telegram links
    /\btelegram\b.{0,10}@?\w+/gi,           // "telegram: @handle"
    /instagram\.com\/[A-Za-z0-9_.]+/gi,     // Instagram profile links
    /\b\d{5,6}[\s\-]?\d{5,6}\b/g,          // Aadhaar / bank account lookalikes (≥10 digits split)
    /maps\.google\.com\/maps\?/gi,          // Google Maps share link
    /paytm\.com|phonepe\.com/gi,            // PayTM/PhonePe payment links
    /\b(call me|dm me|whatsapp me|text me|message me outside|meet outside|bypass spolia)\b/gi, // social engineering phrases
    /\b(zero|one|two|three|four|five|six|seven|eight|nine)\s+(zero|one|two|three|four|five|six|seven|eight|nine)\s+(zero|one|two|three|four|five|six|seven|eight|nine)\b/gi, // digit word encoding
];

/**
 * Scan message text for contact-info leakage.
 * Returns { blocked: true, reason } if a pattern is detected.
 */
function scanForLeakage(text) {
    for (const pattern of LEAKAGE_PATTERNS) {
        pattern.lastIndex = 0; // reset stateful regex
        if (pattern.test(text)) {
            return { blocked: true };
        }
    }
    return { blocked: false };
}

// ── Chat Screen ───────────────────────────────────────────────────
export class ChatScreen {
    constructor(el) {
        this.el = el;
        this.bondId = null;
        this.chatRoomId = null;
        this.otherParty = { name: 'Loading…', role: '' };
        this.currentUser = null;
        this._unsubscribe = null;
        this._messages = [];
        this._sending = false;
    }

    render() {
        this.el.innerHTML = `
          <div id="chat-wrap" style="display:flex;flex-direction:column;height:100dvh;background:var(--color-bg-base)">

            <!-- Header -->
            <div id="chat-header" style="
              display:flex;align-items:center;gap:12px;
              padding:calc(env(safe-area-inset-top) + 14px) 16px 14px;
              background:var(--color-bg-surface);
              border-bottom:1px solid var(--color-border);
              flex-shrink:0;z-index:10">
              <button id="chat-back" class="icon-btn" aria-label="Back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <div style="flex:1;min-width:0">
                <div id="chat-party-name" style="font:600 15px/1.2 var(--font-body);color:var(--color-text-primary);
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Loading…</div>
                <div style="font:400 11px/1 var(--font-body);color:var(--color-gold);margin-top:2px">
                  🔒 Spolia Walled Chat · Bond-protected
                </div>
              </div>
              <div id="chat-bond-badge" style="font:600 10px/1 var(--font-body);color:#0D0D0D;
                background:var(--color-gold);padding:4px 8px;border-radius:6px;flex-shrink:0">
                BOND ACTIVE
              </div>
            </div>

            <!-- Warning banner -->
            <div style="
              background:rgba(255,160,0,0.07);
              border-bottom:1px solid rgba(255,160,0,0.2);
              padding:8px 16px;flex-shrink:0">
              <p style="font:400 11px/1.5 var(--font-body);color:#A09882;margin:0;text-align:center">
                ⚠️ Sharing phone numbers, emails, or UPI IDs violates Spolia's terms and may result in account suspension.
                All messages are monitored.
              </p>
            </div>

            <!-- Messages area -->
            <div id="chat-messages" style="
              flex:1;overflow-y:auto;padding:16px;
              display:flex;flex-direction:column;gap:10px;
              scroll-behavior:smooth">
              <div id="chat-loading" style="padding:40px 0;text-align:center;color:var(--color-text-muted);
                font:400 13px var(--font-body)">Loading messages…</div>
            </div>

            <!-- Input bar -->
            <div id="chat-input-bar" style="
              display:flex;align-items:flex-end;gap:10px;
              padding:12px 16px calc(env(safe-area-inset-bottom) + 12px);
              background:var(--color-bg-surface);
              border-top:1px solid var(--color-border);
              flex-shrink:0">
              <textarea id="chat-input" placeholder="Type your message…"
                rows="1" maxlength="800"
                style="flex:1;resize:none;background:var(--color-bg-elevated);
                  border:1px solid var(--color-border);border-radius:14px;
                  padding:10px 14px;font:400 14px/1.5 var(--font-body);
                  color:var(--color-text-primary);outline:none;
                  max-height:120px;overflow-y:auto;line-height:1.5">
              </textarea>
              <button id="chat-send" aria-label="Send message"
                style="width:44px;height:44px;border-radius:50%;border:none;
                  background:var(--color-gold);color:#0D0D0D;cursor:pointer;
                  display:flex;align-items:center;justify-content:center;
                  flex-shrink:0;transition:opacity 200ms">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

          </div>`;

        this._bindInputEvents();
    }

    async onActivate(params = {}) {
        this.currentUser = window.App?.currentUser;
        if (!this.currentUser) { window.navigate?.('login'); return; }

        // Clean up previous listener
        if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null; }

        this.bondId = params.bondId || null;
        this.otherParty = params.otherParty || { name: 'Unknown', role: '' };

        // Determine the other party's UID for notifications
        const bondData = params.bondData || null;
        if (bondData) {
            const isSeller = this.currentUser.uid === bondData.sellerUid;
            this._otherPartyUid = isSeller ? bondData.buyerUid : bondData.sellerUid;
        }

        // Update header
        const nameEl = this.el.querySelector('#chat-party-name');
        if (nameEl) nameEl.textContent = this.otherParty.name;

        if (!this.bondId) {
            this._showError('No bond associated with this chat.');
            return;
        }

        if (window.isDemoMode?.()) {
            this.chatRoomId = 'demo-chat-123';
            this._messages = [
                { type: 'system', text: '🔒 Walled chat started for this Spolia Bond. Sharing contact info is not permitted.' },
                { senderName: this.otherParty.name, senderUid: this._otherPartyUid, text: 'Hi! Let me know when you can pick this up.', createdAt: { toDate: () => new Date() } }
            ];
            this._renderMessages();
            this.el.querySelector('#chat-back')?.addEventListener('click', () => {
                window.goBack?.('bond-detail', { bondId: this.bondId });
            });
            return;
        }

        try {
            const bondData = params.bondData || null;
            this.chatRoomId = await FirebaseDB.getOrCreateChatRoom(
                this.bondId,
                this.currentUser.uid,
                bondData
            );
            this._subscribeToMessages();
            FirebaseDB.markChatRead(this.chatRoomId, this.currentUser.uid).catch(() => {});

            // Wire back button here so we have bondId
            this.el.querySelector('#chat-back')?.addEventListener('click', () => {
                window.goBack?.('bond-detail', { bondId: this.bondId });
            });
        } catch (err) {
            console.error('[Chat] onActivate error:', err);
            this._showError('Failed to open chat. Please try again.');
        }
    }

    onDeactivate() {
        if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null; }
    }

    // ── Private helpers ─────────────────────────────────────────────

    _subscribeToMessages() {
        this._unsubscribe = FirebaseDB.listenToChat(this.chatRoomId, (messages) => {
            this._messages = messages;
            this._renderMessages();
        });
    }

    _renderMessages() {
        const container = this.el.querySelector('#chat-messages');
        if (!container) return;

        if (this._messages.length === 0) {
            container.innerHTML = `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;
                justify-content:center;padding:40px 24px;text-align:center">
                <div style="font-size:40px;margin-bottom:16px">🔒</div>
                <div style="font:600 15px var(--font-body);color:var(--color-text-primary);margin-bottom:8px">
                  Walled Chat Active
                </div>
                <p style="font:400 13px/1.6 var(--font-body);color:var(--color-text-muted);max-width:260px">
                  This channel is exclusively for coordinating this Spolia Bond transaction.
                  Sharing contact details or payment info outside this platform is not allowed.
                </p>
              </div>`;
            return;
        }

        const uid = this.currentUser?.uid;
        const html = this._messages.map(msg => {
            const isMe = msg.senderUid === uid;
            const time = msg.createdAt?.toDate
                ? msg.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : '';

            if (msg.type === 'system') {
                return `
                  <div style="text-align:center;padding:4px 0">
                    <span style="font:400 11px var(--font-body);color:var(--color-text-muted);
                      background:var(--color-bg-elevated);padding:4px 12px;border-radius:20px">
                      ${msg.text}
                    </span>
                  </div>`;
            }

            return `
              <div style="display:flex;flex-direction:column;
                align-items:${isMe ? 'flex-end' : 'flex-start'};gap:2px">
                ${!isMe ? `<span style="font:600 11px var(--font-body);color:var(--color-text-muted);
                  padding:0 4px">${msg.senderName || 'Other Party'}</span>` : ''}
                <div style="
                  max-width:78%;padding:10px 14px;word-break:break-word;
                  border-radius:${isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
                  background:${isMe ? 'var(--color-gold)' : 'var(--color-bg-elevated)'};
                  color:${isMe ? '#0D0D0D' : 'var(--color-text-primary)'};
                  font:400 14px/1.5 var(--font-body);
                  border:${isMe ? 'none' : '1px solid var(--color-border)'}">
                  ${this._escapeHtml(msg.text)}
                </div>
                <span style="font:400 10px var(--font-body);color:var(--color-text-muted);
                  padding:0 4px">${time}</span>
              </div>`;
        }).join('');

        container.innerHTML = html;

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    _bindInputEvents() {
        const input = this.el.querySelector('#chat-input');
        const sendBtn = this.el.querySelector('#chat-send');

        // Auto-grow textarea
        input?.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });

        // Send on Enter (shift+enter = newline)
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._sendMessage();
            }
        });

        sendBtn?.addEventListener('click', () => this._sendMessage());
    }

    async _sendMessage() {
        if (this._sending) return;
        const input = this.el.querySelector('#chat-input');
        const text = input?.value?.trim();
        if (!text) return;

        // ── Contact-leakage guard ──────────────────────────────────
        const { blocked } = scanForLeakage(text);
        if (blocked) {
            window.showToast?.(
                '🚫 Message blocked — sharing contact details (phone, email, UPI) violates Spolia\'s terms.',
                'error',
                5000
            );
            return;
        }

        if (text.length > 800) {
            window.showToast?.('Message too long (max 800 characters).', 'error');
            return;
        }

        this._sending = true;
        const sendBtn = this.el.querySelector('#chat-send');
        if (sendBtn) sendBtn.style.opacity = '0.5';

        if (window.isDemoMode?.()) {
            this._messages.push({
                senderUid: this.currentUser.uid,
                senderName: this.currentUser.displayName || 'User',
                text,
                type: 'user',
                createdAt: { toDate: () => new Date() }
            });
            this._renderMessages();
            if (input) {
                input.value = '';
                input.style.height = 'auto';
            }
            this._sending = false;
            if (sendBtn) sendBtn.style.opacity = '1';
            return;
        }

        try {
            await FirebaseDB.sendMessage(this.chatRoomId, {
                text,
                senderUid: this.currentUser.uid,
                senderName: this.currentUser.displayName || 'User',
                type: 'user',
            });

            // Notify the other party (non-blocking)
            if (this._otherPartyUid) {
                FirebaseDB.addNotification(this._otherPartyUid, {
                    type: 'chat_message',
                    title: `💬 ${this.currentUser.displayName || 'Your contact'} sent a message`,
                    body: text.length > 80 ? text.substring(0, 80) + '…' : text,
                    chatId: this.chatRoomId
                }).catch(() => {});
            }

            if (input) {
                input.value = '';
                input.style.height = 'auto';
            }
        } catch (err) {
            window.showToast?.('Failed to send message. Please try again.', 'error');
            console.error('[Chat] sendMessage error:', err);
        } finally {
            this._sending = false;
            if (sendBtn) sendBtn.style.opacity = '1';
        }
    }


    _showError(msg) {
        const container = this.el.querySelector('#chat-messages');
        if (container) {
            container.innerHTML = `
              <div style="padding:40px 20px;text-align:center;color:var(--color-red)">
                ${msg}
              </div>`;
        }
    }

    _escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/\n/g, '<br>');
    }
}
