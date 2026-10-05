import { Contact } from '../types/assistant';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c-1',
    name: 'Mummy',
    relationship: 'Mother',
    phoneNumber: '+919876543210',
    avatar: '👩‍👧',
  },
  {
    id: 'c-2',
    name: 'Papa',
    relationship: 'Father',
    phoneNumber: '+919876543211',
    avatar: '👨‍👧',
  },
  {
    id: 'c-3',
    name: 'Rahul Sharma',
    relationship: 'Best Friend',
    phoneNumber: '+919820011223',
    avatar: '👦',
  },
  {
    id: 'c-4',
    name: 'Rahul Verma',
    relationship: 'Office Colleague',
    phoneNumber: '+919820044556',
    avatar: '💼',
  },
  {
    id: 'c-5',
    name: 'Priya',
    relationship: 'Sister',
    phoneNumber: '+919811122334',
    avatar: '👧',
  },
  {
    id: 'c-6',
    name: 'Boss',
    relationship: 'Manager',
    phoneNumber: '+919999988888',
    avatar: '👔',
  },
  {
    id: 'c-7',
    name: 'Rohit Sir',
    relationship: 'Owner / Self',
    phoneNumber: '+919800000001',
    avatar: '👑',
  },
];

export function findContacts(nameQuery: string, contacts: Contact[] = INITIAL_CONTACTS): {
  matches: Contact[];
  query: string;
} {
  const q = nameQuery.trim().toLowerCase();
  if (!q) return { matches: [], query: nameQuery };

  // Common Hindi / English variations
  const aliases: Record<string, string[]> = {
    mummy: ['mom', 'maa', 'mataji', 'mother', 'mummy'],
    mom: ['mummy', 'maa', 'mother'],
    papa: ['dad', 'pitaji', 'father', 'daddy', 'papa'],
    dad: ['papa', 'pitaji', 'father', 'daddy'],
    sister: ['priya', 'behan', 'didi'],
    friend: ['rahul sharma', 'dost', 'yaar'],
  };

  const matches = contacts.filter((c) => {
    const cName = c.name.toLowerCase();
    const cRel = (c.relationship || '').toLowerCase();

    if (cName === q) return true;
    if (cName.includes(q) || q.includes(cName)) return true;
    if (cRel && (cRel.includes(q) || q.includes(cRel))) return true;

    // Check aliases
    for (const [key, list] of Object.entries(aliases)) {
      if (q.includes(key)) {
        if (list.some((alias) => cName.includes(alias) || cRel.includes(alias))) {
          return true;
        }
      }
    }

    return false;
  });

  return { matches, query: nameQuery };
}
