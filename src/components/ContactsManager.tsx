import React from 'react';
import { Contact } from '../types/assistant';
import { Users, Phone, Plus, X } from 'lucide-react';

interface ContactsManagerProps {
  contacts: Contact[];
  onAddContact: (contact: Contact) => void;
  onClose: () => void;
  onCallContact: (contact: Contact) => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  contacts,
  onAddContact,
  onClose,
  onCallContact,
}) => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [name, setName] = React.useState('');
  const [relationship, setRelationship] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phoneNumber.trim()) return;

    onAddContact({
      id: 'c-' + Date.now(),
      name: name.trim(),
      relationship: relationship.trim() || 'Contact',
      phoneNumber: phoneNumber.trim(),
      avatar: '👤',
    });

    setName('');
    setRelationship('');
    setPhoneNumber('');
    setShowAdd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-bold text-white">Rohit Sir&apos;s Phone Contacts</h2>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Contact</span>
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleSave} className="p-4 rounded-xl bg-slate-950 border border-slate-800 mb-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">New Device Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name (e.g. Rahul)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Best Friend)"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <input
              type="tel"
              placeholder="Phone Number (e.g. +91 98765 43210)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-3 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg text-xs bg-rose-600 text-white font-semibold hover:bg-rose-500"
              >
                Save Contact
              </button>
            </div>
          </form>
        )}

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{contact.avatar || '👤'}</span>
                <div>
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    <span>{contact.name}</span>
                    {contact.name.includes('Rohit') && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                        Owner
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{contact.relationship}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-2 py-1 rounded border border-cyan-800/60">
                  {contact.phoneNumber}
                </span>
                <button
                  onClick={() => onCallContact(contact)}
                  className="p-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white transition"
                  title="Direct Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
