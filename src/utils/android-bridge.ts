import { Contact, DeviceAction } from '../types/assistant';
import { findContacts, INITIAL_CONTACTS } from './contacts';

export interface ActionResult {
  success: boolean;
  actionType: DeviceAction['type'];
  message: string;
  url?: string;
  data?: any;
  needsClarification?: boolean;
}

// Allowed application map for safe launch
export const APP_ALLOWLIST: Record<string, { name: string; url: string; scheme: string; icon: string }> = {
  whatsapp: {
    name: 'WhatsApp',
    url: 'https://web.whatsapp.com',
    scheme: 'whatsapp://',
    icon: '💬',
  },
  youtube: {
    name: 'YouTube',
    url: 'https://www.youtube.com',
    scheme: 'vnd.youtube://',
    icon: '▶️',
  },
  instagram: {
    name: 'Instagram',
    url: 'https://www.instagram.com',
    scheme: 'instagram://',
    icon: '📸',
  },
  spotify: {
    name: 'Spotify',
    url: 'https://open.spotify.com',
    scheme: 'spotify://',
    icon: '🎵',
  },
  maps: {
    name: 'Google Maps',
    url: 'https://maps.google.com',
    scheme: 'geo:0,0?q=',
    icon: '🗺️',
  },
  camera: {
    name: 'Camera',
    url: '',
    scheme: 'camera://',
    icon: '📷',
  },
  calculator: {
    name: 'Calculator',
    url: '',
    scheme: 'calculator://',
    icon: '🧮',
  },
  phone: {
    name: 'Phone Dialer',
    url: '',
    scheme: 'tel:',
    icon: '📞',
  },
};

/**
 * Checks if running inside an Android WebView with Native Bridge or Capacitor
 */
function getNativeBridge(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).AndroidBridge || (window as any).Capacitor?.Plugins || null;
}

export class DeviceActionHandler {
  private contacts: Contact[] = INITIAL_CONTACTS;
  private onActionTriggered?: (action: DeviceAction) => void;

  constructor(onActionTriggered?: (action: DeviceAction) => void) {
    this.onActionTriggered = onActionTriggered;
  }

  public updateContacts(newContacts: Contact[]) {
    this.contacts = newContacts;
  }

  public getContacts(): Contact[] {
    return this.contacts;
  }

  /**
   * Action 1: Open WhatsApp
   */
  public async openWhatsApp(params: { message?: string; phoneNumber?: string } = {}): Promise<ActionResult> {
    const bridge = getNativeBridge();
    const text = params.message ? encodeURIComponent(params.message) : '';
    let targetUrl = 'https://web.whatsapp.com';
    let deepLink = 'whatsapp://send';

    if (params.phoneNumber) {
      const cleanPhone = params.phoneNumber.replace(/[^\d+]/g, '');
      targetUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}${text ? `&text=${text}` : ''}`;
      deepLink = `whatsapp://send?phone=${cleanPhone}${text ? `&text=${text}` : ''}`;
    } else if (text) {
      deepLink = `whatsapp://send?text=${text}`;
    }

    if (bridge?.openWhatsApp) {
      try {
        bridge.openWhatsApp(params.phoneNumber || '', params.message || '');
      } catch (e) {
        console.warn('Native openWhatsApp failed, falling back:', e);
      }
    } else {
      // Trigger deep link / web fallback
      try {
        window.location.href = deepLink;
      } catch {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }

    const action: DeviceAction = {
      id: 'act-' + Date.now(),
      type: 'openWhatsApp',
      timestamp: Date.now(),
      params,
      status: 'success',
      message: params.phoneNumber ? `Opening WhatsApp for ${params.phoneNumber}` : 'WhatsApp open kar diya hai!',
      url: targetUrl,
    };
    this.onActionTriggered?.(action);

    return {
      success: true,
      actionType: 'openWhatsApp',
      message: 'WhatsApp successfully khol diya gaya hai.',
      url: targetUrl,
    };
  }

  /**
   * Action 2: Open App from Allowlist
   */
  public async openApp(appName: string): Promise<ActionResult> {
    if (!appName || typeof appName !== 'string') {
      return {
        success: false,
        actionType: 'openApp',
        message: 'Application ka naam nahi mila.',
      };
    }

    const clean = appName.trim().toLowerCase();
    let matchedKey: string | null = null;

    for (const key of Object.keys(APP_ALLOWLIST)) {
      if (clean.includes(key) || APP_ALLOWLIST[key].name.toLowerCase().includes(clean)) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      const errorMsg = `Kshama kijiye, '${appName}' application safe allowlist me nahi hai ya device par available nahi hai.`;
      const action: DeviceAction = {
        id: 'act-' + Date.now(),
        type: 'openApp',
        timestamp: Date.now(),
        params: { appName },
        status: 'failed',
        message: errorMsg,
      };
      this.onActionTriggered?.(action);

      return {
        success: false,
        actionType: 'openApp',
        message: errorMsg,
      };
    }

    const app = APP_ALLOWLIST[matchedKey];
    const bridge = getNativeBridge();

    if (bridge?.openApp) {
      try {
        bridge.openApp(matchedKey);
      } catch (e) {
        console.warn('Bridge openApp error:', e);
      }
    } else if (app.url) {
      try {
        window.open(app.url, '_blank', 'noopener,noreferrer');
      } catch {
        window.location.href = app.scheme || app.url;
      }
    }

    const action: DeviceAction = {
      id: 'act-' + Date.now(),
      type: 'openApp',
      timestamp: Date.now(),
      params: { appName: app.name },
      status: 'success',
      message: `${app.name} khol diya hai!`,
      url: app.url,
    };
    this.onActionTriggered?.(action);

    return {
      success: true,
      actionType: 'openApp',
      message: `${app.name} open kar diya hai.`,
      url: app.url,
    };
  }

  /**
   * Action 3: Open Website URL
   */
  public async openUrl(url: string): Promise<ActionResult> {
    if (!url || typeof url !== 'string') {
      return {
        success: false,
        actionType: 'openUrl',
        message: 'Invalid URL provided.',
      };
    }

    const trimmed = url.trim();
    // Validate scheme - only http / https allowed to avoid arbitrary code / schemes
    if (!/^https?:\/\//i.test(trimmed)) {
      return {
        success: false,
        actionType: 'openUrl',
        message: 'Security warning: Keval safe HTTP/HTTPS URLs allow hain.',
      };
    }

    try {
      new URL(trimmed); // ensure parseable
    } catch {
      return {
        success: false,
        actionType: 'openUrl',
        message: 'URL format sahi nahi hai.',
      };
    }

    const bridge = getNativeBridge();
    if (bridge?.openUrl) {
      bridge.openUrl(trimmed);
    } else {
      window.open(trimmed, '_blank', 'noopener,noreferrer');
    }

    const action: DeviceAction = {
      id: 'act-' + Date.now(),
      type: 'openUrl',
      timestamp: Date.now(),
      params: { url: trimmed },
      status: 'success',
      message: `Website open ki ja rahi hai: ${trimmed}`,
      url: trimmed,
    };
    this.onActionTriggered?.(action);

    return {
      success: true,
      actionType: 'openUrl',
      message: `Website ${trimmed} successfully open kar di gayi hai.`,
      url: trimmed,
    };
  }

  /**
   * Action 4: Make Direct Phone Call
   */
  public async makeCall(phoneNumber: string): Promise<ActionResult> {
    if (!phoneNumber) {
      return {
        success: false,
        actionType: 'makeCall',
        message: 'Phone number missing hai.',
      };
    }

    const clean = phoneNumber.replace(/[^\d+]/g, '');
    if (clean.length < 3) {
      return {
        success: false,
        actionType: 'makeCall',
        message: 'Valid phone number nahi hai.',
      };
    }

    const bridge = getNativeBridge();
    if (bridge?.makeCall) {
      try {
        bridge.makeCall(clean);
      } catch (e) {
        console.warn('Native makeCall failed:', e);
      }
    } else {
      // Trigger native phone dialer via standard tel:
      window.location.href = `tel:${clean}`;
    }

    const action: DeviceAction = {
      id: 'act-' + Date.now(),
      type: 'makeCall',
      timestamp: Date.now(),
      params: { phoneNumber: clean },
      status: 'success',
      message: `${clean} ko call lagayi ja rahi hai...`,
      url: `tel:${clean}`,
    };
    this.onActionTriggered?.(action);

    return {
      success: true,
      actionType: 'makeCall',
      message: `${clean} par call initiate kar di gayi hai.`,
      url: `tel:${clean}`,
    };
  }

  /**
   * Action 5: Call Contact by Name
   * Strictly adheres to no guessing rules:
   * 1 match -> Calls
   * Multiple matches -> Asks which one
   * 0 matches -> Honestly reports contact not found
   */
  public async callContact(contactName: string): Promise<ActionResult> {
    if (!contactName || !contactName.trim()) {
      return {
        success: false,
        actionType: 'callContact',
        message: 'Kripya contact ka naam batayein.',
      };
    }

    const { matches } = findContacts(contactName, this.contacts);

    if (matches.length === 0) {
      const msg = `Mujhe "${contactName}" naam ka koi contact nahi mila.`;
      const action: DeviceAction = {
        id: 'act-' + Date.now(),
        type: 'callContact',
        timestamp: Date.now(),
        params: { contactName },
        status: 'failed',
        message: msg,
      };
      this.onActionTriggered?.(action);

      return {
        success: false,
        actionType: 'callContact',
        message: msg,
      };
    }

    if (matches.length > 1) {
      const namesList = matches.map((m) => `${m.name} (${m.relationship || m.phoneNumber})`).join(', ');
      const clarifyMsg = `${contactName} naam ke ${matches.length} contacts mile hain: ${namesList}। Aap kis wale ko call karna chahte hain?`;

      const action: DeviceAction = {
        id: 'act-' + Date.now(),
        type: 'callContact',
        timestamp: Date.now(),
        params: { contactName },
        status: 'disambiguation_needed',
        message: clarifyMsg,
        candidates: matches,
      };
      this.onActionTriggered?.(action);

      return {
        success: false,
        needsClarification: true,
        actionType: 'callContact',
        message: clarifyMsg,
        data: { candidates: matches },
      };
    }

    // Exactly 1 match found
    const targetContact = matches[0];
    const bridge = getNativeBridge();
    const cleanPhone = targetContact.phoneNumber.replace(/[^\d+]/g, '');

    if (bridge?.makeCall) {
      bridge.makeCall(cleanPhone);
    } else {
      window.location.href = `tel:${cleanPhone}`;
    }

    const action: DeviceAction = {
      id: 'act-' + Date.now(),
      type: 'callContact',
      timestamp: Date.now(),
      params: { contactName: targetContact.name, phoneNumber: targetContact.phoneNumber },
      status: 'success',
      message: `${targetContact.name} (${targetContact.phoneNumber}) ko call connect ho rahi hai...`,
      url: `tel:${cleanPhone}`,
    };
    this.onActionTriggered?.(action);

    return {
      success: true,
      actionType: 'callContact',
      message: `${targetContact.name} ko call lagayi ja rahi hai (${targetContact.phoneNumber})।`,
      url: `tel:${cleanPhone}`,
      data: targetContact,
    };
  }

  /**
   * Execute safe function call from Gemini tool invocation
   */
  public async executeTool(name: string, args: Record<string, any>): Promise<ActionResult> {
    switch (name) {
      case 'openWhatsApp':
        return this.openWhatsApp(args);
      case 'openApp':
        return this.openApp(args.appName || args.name || '');
      case 'openUrl':
        return this.openUrl(args.url || '');
      case 'makeCall':
        return this.makeCall(args.phoneNumber || args.number || '');
      case 'callContact':
        return this.callContact(args.contactName || args.name || '');
      default:
        return {
          success: false,
          actionType: 'openApp',
          message: `Unknown or unsupported tool action: ${name}`,
        };
    }
  }
}
