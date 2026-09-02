import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { requestsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23EC4899'/><circle cx='50' cy='38' r='20' fill='%23FFFFFF'/><path d='M20 85 c0-20 15-30 30-30 s30 10 30 30' fill='%23FFFFFF'/></svg>";

const QUICK_COMPANIONS = [
  {
    id: 'c-priya',
    name: 'Priya Sharma',
    age: 24,
    area: 'Connaught Place, Delhi NCR',
    hourlyRate: 2500,
    avatar: DEFAULT_AVATAR,
    bio: 'Love coffee meetups, art galleries & tech talks in CP!',
    reply: "Hey there! 😊 Yes, I'd love to meet for coffee in Connaught Place! Let me know what time works best for you!",
  },
  {
    id: 'c-meera',
    name: 'Meera Nair',
    age: 26,
    area: 'Bandra West, Mumbai',
    hourlyRate: 3500,
    avatar: DEFAULT_AVATAR,
    bio: 'Concerts, fine dining and spontaneous city walks.',
    reply: "Hi! I'm so excited! Live music & fine dining in Bandra sound amazing. Are you free this weekend?",
  },
  {
    id: 'c-ananya',
    name: 'Ananya Patel',
    age: 23,
    area: 'DLF Cyber City, Gurgaon',
    hourlyRate: 2800,
    avatar: DEFAULT_AVATAR,
    bio: 'Yoga instructor & tech enthusiast. Love weekend coffee dates.',
    reply: "Hey! Weekend coffee dates & yoga are my absolute favorite. Shall we plan for Saturday afternoon?",
  },
  {
    id: 'c-riya',
    name: 'Riya Kapoor',
    age: 25,
    area: 'Koramangala, Bangalore',
    hourlyRate: 3000,
    avatar: DEFAULT_AVATAR,
    bio: 'Exploring fine dining spots and shopping in Koramangala.',
    reply: "Hi! I love Koramangala fine dining spots. Let's arrange our meetup!",
  },
];

type MessageItem = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
  isMine: boolean;
};

type LocalChatSession = {
  id: string;
  companionId: string;
  name: string;
  area: string;
  hourlyRate: number;
  avatar: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
  messages: MessageItem[];
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { user, userId } = useAuth();
  const currentUid = userId || user?.uid;

  // Clear any legacy demo data from global keys
  try {
    const legacyChats = localStorage.getItem('lf_local_chats');
    if (legacyChats) localStorage.removeItem('lf_local_chats');
    const legacyBids = localStorage.getItem('lf_user_bids');
    if (legacyBids) localStorage.removeItem('lf_user_bids');
  } catch {}

  const [searchQuery, setSearchQuery] = useState('');
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [localChats, setLocalChats] = useState<LocalChatSession[]>(() => {
    const key = currentUid ? `lf_local_chats_${currentUid}` : 'lf_local_chats_guest';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return []; // Completely empty for new users!
  });

  useEffect(() => {
    const key = currentUid ? `lf_local_chats_${currentUid}` : 'lf_local_chats_guest';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setLocalChats(parsed);
          return;
        }
      } catch {}
    }
    setLocalChats([]);
  }, [currentUid]);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync local chats to user-scoped localStorage
  useEffect(() => {
    const key = currentUid ? `lf_local_chats_${currentUid}` : 'lf_local_chats_guest';
    localStorage.setItem(key, JSON.stringify(localChats));
  }, [localChats, currentUid]);

  // Ensure navigated chat exists without pre-fabricated messages
  useEffect(() => {
    if (conversationId && !localChats.some((c) => c.id === conversationId)) {
      const comp = QUICK_COMPANIONS.find((c) => c.id === conversationId);
      if (comp) {
        const newChat: LocalChatSession = {
          id: comp.id,
          companionId: comp.id,
          name: comp.name,
          area: comp.area,
          hourlyRate: comp.hourlyRate,
          avatar: comp.avatar,
          lastMessage: '',
          updatedAt: new Date().toISOString(),
          unreadCount: 0,
          messages: [],
        };
        setLocalChats((prev) => [newChat, ...prev]);
      }
    }
  }, [conversationId, localChats]);

  // Query live server requests and merge with user-scoped localStorage bids
  const { data: serverRequestsData } = useQuery({
    queryKey: ['my-server-requests-chat', currentUid],
    queryFn: () => requestsApi.myRequests().catch(() => null),
    refetchInterval: 5_000,
  });

  const bids: any[] = (() => {
    let local: any[] = [];
    try {
      const key = currentUid ? `lf_user_bids_${currentUid}` : 'lf_user_bids_guest';
      const saved = localStorage.getItem(key);
      if (saved) {
        local = JSON.parse(saved);
      }
    } catch {}
    const server = ((serverRequestsData as any)?.requests || []).map((r: any) => ({
      id: r.id,
      requestId: r.to_profile_id,
      targetName: r.profiles?.display_name || '',
      status: r.status,
      amount: 2500,
    }));
    const combined = [...local];
    server.forEach((sb: any) => {
      const idx = combined.findIndex((lb) =>
        lb.id === sb.id ||
        lb.requestId === sb.requestId ||
        (lb.targetName && sb.targetName && lb.targetName.toLowerCase() === sb.targetName.toLowerCase())
      );
      if (idx >= 0) {
        combined[idx] = { ...combined[idx], status: sb.status };
      } else {
        combined.push(sb);
      }
    });
    return combined;
  })();

  const getProposalForCompanion = (compName: string, compId?: string) => {
    return bids.find((b: any) =>
      (b.targetName && compName && b.targetName.toLowerCase() === compName.toLowerCase()) ||
      (compId && (b.requestId === compId || b.id === compId))
    );
  };

  const activeChat = localChats.find((c) => c.id === conversationId);
  const fallbackComp = QUICK_COMPANIONS.find((c) => c.id === conversationId);
  const currentChat = activeChat || (fallbackComp ? {
    id: fallbackComp.id,
    companionId: fallbackComp.id,
    name: fallbackComp.name,
    area: fallbackComp.area,
    hourlyRate: fallbackComp.hourlyRate,
    avatar: fallbackComp.avatar,
    lastMessage: '',
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    messages: [],
  } : {
    id: conversationId || '',
    companionId: conversationId || '',
    name: 'Companion',
    area: 'City Area',
    hourlyRate: 2500,
    avatar: DEFAULT_AVATAR,
    lastMessage: '',
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    messages: [],
  });

  const currentProposal = currentChat ? getProposalForCompanion(currentChat.name, (currentChat as any).companionId || currentChat.id) : null;
  const isProposalAccepted = currentProposal?.status === 'ACCEPTED' || currentProposal?.status === 'CONFIRMED';
  const isProposalPending = currentProposal?.status === 'SUBMITTED' || currentProposal?.status === 'PENDING' || currentProposal?.status === 'PENDING_RESPONSE';
  const isProposalRejected = currentProposal?.status === 'REJECTED' || currentProposal?.status === 'CANCELLED';
  const hasProposal = Boolean(currentProposal);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationId, activeChat?.messages.length, isTyping]);

  // Handle sending message & companion auto-reply (Only allowed if Proposal Accepted!)
  const handleSendMessage = (msgText?: string) => {
    if (!isProposalAccepted) {
      alert('🔒 Chat Locked: Message sirf tabhi bhej sakte hain jab samne wala companion aapka proposal ACCEPT kare.');
      return;
    }
    const content = (msgText || text).trim();
    if (!content || !conversationId) return;

    const userMsg: MessageItem = {
      id: `m-usr-${Date.now()}`,
      senderId: user?.uid || 'user-me',
      senderName: 'You',
      text: content,
      time: new Date().toISOString(),
      isMine: true,
    };

    setLocalChats((prev) =>
      prev.map((chat) => {
        if (chat.id === conversationId) {
          return {
            ...chat,
            lastMessage: content,
            updatedAt: new Date().toISOString(),
            messages: [...chat.messages, userMsg],
          };
        }
        return chat;
      })
    );

    setText('');
    setIsTyping(true);

    // Companion Simulated Auto-Reply after 1.5 seconds
    setTimeout(() => {
      const compInfo = QUICK_COMPANIONS.find((c) => c.id === conversationId) || QUICK_COMPANIONS[0];
      const replies = [
        compInfo.reply,
        `That sounds fantastic! Shall we confirm for tomorrow around 6 PM in ${activeChat?.area || 'the city'}? 🌸`,
        `I'd love that! Meeting in person will be so much fun. 💖`,
        `Sounds great! I love good conversation & coffee dates. Looking forward to meeting you! ☕✨`,
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      const companionReplyMsg: MessageItem = {
        id: `m-comp-${Date.now()}`,
        senderId: compInfo.id,
        senderName: compInfo.name,
        text: randomReply,
        time: new Date().toISOString(),
        isMine: false,
      };

      setLocalChats((prev) =>
        prev.map((chat) => {
          if (chat.id === conversationId) {
            return {
              ...chat,
              lastMessage: randomReply,
              updatedAt: new Date().toISOString(),
              unreadCount: 0,
              messages: [...chat.messages, companionReplyMsg],
            };
          }
          return chat;
        })
      );
      setIsTyping(false);
    }, 1500);
  };

  // ── CONVERSATION LIST VIEW ────────────────────────────────────────────────
  if (!conversationId) {
    const filteredChats = localChats.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="page" style={{ background: '#F8FAFC' }}>
        <Header />

        {/* Messages Header Bar */}
        <div style={{
          padding: '12px 18px', background: '#FFFFFF', borderBottom: '1px solid #F1F5F9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', fontWeight: 800,
              margin: 0, color: '#BE185D', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '-0.02em'
            }}>
              <span style={{ fontSize: '1.15rem' }}>💬</span> Messages
            </h2>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 1, fontWeight: 500 }}>
              Live chats with verified companions
            </div>
          </div>
          <span style={{
            fontSize: '0.68rem', fontWeight: 800, background: '#DCFCE7', color: '#16A34A',
            padding: '3px 9px', borderRadius: 99, border: '1px solid #86EFAC', display: 'inline-flex',
            alignItems: 'center', gap: 4, boxShadow: '0 1px 4px rgba(22,163,74,0.12)'
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 5px #22C55E' }} />
            {localChats.length} Active
          </span>
        </div>

        <div className="page-content" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 20px)' }}>
          {/* Pill Search Input Bar */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: '0.82rem', color: '#94A3B8', pointerEvents: 'none'
            }}>🔍</span>
            <input
              type="text"
              style={{
                width: '100%', padding: '8px 14px 8px 36px', borderRadius: 99, fontSize: '0.8rem',
                border: '1.5px solid #E2E8F0', background: '#FFFFFF', outline: 'none',
                color: '#0F172A', fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.2s ease'
              }}
              placeholder="Search messages & companions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Conversation List matching screenshot */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredChats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>💬</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>No messages found</div>
                <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Start a new conversation with a verified companion!</div>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    borderRadius: 20, background: 'rgba(255,255,255,0.98)',
                    border: '1.5px solid rgba(236,72,153,0.18)', cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(236,72,153,0.06)', transition: 'all 0.2s ease'
                  }}
                >
                  {/* Companion Avatar with Online Indicator */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      style={{
                        width: 52, height: 52, borderRadius: '50%', objectFit: 'cover',
                        border: '2.5px solid #EC4899', background: '#FCE7F3',
                        boxShadow: '0 3px 10px rgba(236,72,153,0.2)'
                      }}
                    />
                    <span style={{
                      position: 'absolute', bottom: 1, right: 1, width: 12, height: 12,
                      background: '#16A34A', border: '2px solid white', borderRadius: '50%'
                    }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name & Time */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.96rem', color: '#0F172A' }}>
                        {chat.name}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600 }}>
                        {formatTime(chat.updatedAt)}
                      </span>
                    </div>

                    {/* Message Preview & Hourly Rate Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, flex: 1
                      }}>
                        {chat.lastMessage}
                      </div>

                      <span style={{
                        fontSize: '0.74rem', fontWeight: 900, color: '#15803D',
                        background: 'linear-gradient(135deg, #DCFCE7, #BBF7D0)',
                        padding: '3px 9px', borderRadius: 99, border: '1px solid #86EFAC',
                        flexShrink: 0, boxShadow: '0 1px 4px rgba(22,163,74,0.12)', display: 'inline-flex', alignItems: 'center', gap: 3
                      }}>
                        ⚡ ₹{chat.hourlyRate}/hr
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  // ── INDIVIDUAL CHAT ROOM VIEW ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#FDF2F8', overflow: 'hidden' }}>
      {/* Room Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        paddingTop: 'calc(12px + env(safe-area-inset-top))', background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
      }}>
        <button
          onClick={() => navigate('/chat')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: 'var(--color-text)', padding: 0 }}
        >
          ←
        </button>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={currentChat.avatar}
            alt=""
            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #EC4899', background: '#FCE7F3' }}
          />
          <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: '#16A34A', border: '2px solid white', borderRadius: '50%' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: '0.96rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {currentChat.name}
            <span style={{ fontSize: '0.68rem', background: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: 99, fontWeight: 800 }}>
              ⚡ ₹{currentChat.hourlyRate}/hr
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 700 }}>
            🟢 Online Now · {currentChat.area}
          </div>
        </div>

        <button
          className="btn btn-primary btn-xs"
          style={{ borderRadius: 99, fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px' }}
          onClick={() => alert(`Connecting voice call with ${currentChat.name}...`)}
        >
          📞 Call
        </button>
      </div>

      {/* Messages Thread Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {currentChat.messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: msg.isMine ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: msg.isMine ? 'row-reverse' : 'row' }}>
              {!msg.isMine && (
                <img
                  src={currentChat.avatar}
                  alt=""
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #EC4899' }}
                />
              )}

              <div style={{
                maxWidth: '78%', padding: '10px 14px', borderRadius: msg.isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.isMine ? 'linear-gradient(135deg, var(--color-primary), #E11D48)' : 'var(--color-surface)',
                color: msg.isMine ? 'white' : 'var(--color-text)',
                fontSize: '0.88rem', lineHeight: 1.45, fontWeight: 500,
                boxShadow: msg.isMine ? '0 4px 12px rgba(225,29,72,0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
                border: msg.isMine ? 'none' : '1px solid rgba(236,72,153,0.18)'
              }}>
                {msg.text}
              </div>
            </div>

            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', marginTop: 3, paddingLeft: !msg.isMine ? 36 : 0, fontWeight: 600 }}>
              {formatTime(msg.time)} {msg.isMine && <span style={{ color: '#16A34A', fontWeight: 800 }}>✓✓</span>}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={currentChat.avatar} alt="" style={{ width: 26, height: 26, borderRadius: '50%' }} />
            <div style={{
              background: 'white', padding: '8px 12px', borderRadius: 18,
              fontSize: '0.78rem', color: '#BE185D', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid rgba(236,72,153,0.2)'
            }}>
              {currentChat.name} is typing… 💬
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Explanatory Banner when Chat is Locked */}
      {!isProposalAccepted && (
        <div style={{
          background: isProposalPending ? 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' : '#F8FAFC',
          border: '1.5px solid ' + (isProposalPending ? '#FCD34D' : '#CBD5E1'),
          borderRadius: 14,
          padding: '12px 16px',
          margin: '0 12px 8px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>
            {isProposalPending ? '⏳' : isProposalRejected ? '❌' : '🔒'}
          </div>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isProposalPending ? '#92400E' : isProposalRejected ? '#991B1B' : '#1E293B' }}>
            {isProposalPending
              ? 'Proposal Under Review'
              : isProposalRejected
              ? 'Proposal Declined'
              : 'Proposal Required to Chat'}
          </div>
          <div style={{ fontSize: '0.75rem', color: isProposalPending ? '#78350F' : isProposalRejected ? '#7F1D1D' : '#64748B', marginTop: 3, lineHeight: 1.4 }}>
            {isProposalPending ? (
              <>Aapka proposal <strong>{currentChat.name}</strong> ko bhej diya gaya hai.<br /><strong>Jab tak samne wala proposal ACCEPT nahi karta, tab tak message nahi kar sakte.</strong></>
            ) : isProposalRejected ? (
              <>Companion ne aapka proposal decline kar diya hai. Chat unlocked nahi hai.</>
            ) : (
              <>Aapne abhi tak <strong>{currentChat.name}</strong> ko proposal nahi bheja hai.<br />Message karne ke liye pehle proposal bhejein aur accept hone ka intezar karein.</>
            )}
          </div>
          {!hasProposal && (
            <button
              type="button"
              onClick={() => navigate('/requests')}
              style={{
                marginTop: 8, background: 'linear-gradient(135deg, var(--color-primary), #E11D48)',
                color: 'white', border: 'none', borderRadius: 99, padding: '6px 14px',
                fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(225,29,72,0.25)'
              }}
            >
              🎯 Discover & Send Proposal Now
            </button>
          )}
        </div>
      )}

      {/* Quick Action Suggestion Chips (Only if proposal accepted) */}
      {isProposalAccepted && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '6px 12px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', scrollbarWidth: 'none' }}>
          {[
            '☕ Are you free for coffee tomorrow?',
            '📍 What area do you prefer to meet?',
            '🎯 Looking forward to our meetup!',
            '🌸 Tell me more about your hobbies!',
          ].map((chip, idx) => (
            <button
              key={idx}
              style={{
                fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', padding: '4px 10px',
                borderRadius: 99, border: '1px solid #EC4899', background: 'rgba(236,72,153,0.06)',
                color: '#BE185D', cursor: 'pointer', flexShrink: 0
              }}
              onClick={() => handleSendMessage(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div style={{
        padding: '10px 12px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)',
        display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0
      }}>
        <button
          onClick={() => {
            if (!isProposalAccepted) {
              alert('🔒 Chat Locked: Jab tak companion proposal accept nahi karega, media attachments blocked hain.');
              return;
            }
            alert('Image attachment feature enabled');
          }}
          disabled={!isProposalAccepted}
          style={{
            background: 'none',
            border: '1.5px solid ' + (!isProposalAccepted ? '#E2E8F0' : 'var(--color-border)'),
            borderRadius: '50%',
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: !isProposalAccepted ? 'not-allowed' : 'pointer', flexShrink: 0, fontSize: '1.1rem',
            opacity: !isProposalAccepted ? 0.5 : 1
          }}
          title={!isProposalAccepted ? 'Locked' : 'Send image'}
        >
          📷
        </button>

        <input
          type="text"
          className="form-input"
          disabled={!isProposalAccepted}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 99, fontSize: '0.88rem',
            border: '1.5px solid ' + (!isProposalAccepted ? '#E2E8F0' : 'var(--color-border)'),
            outline: 'none',
            background: !isProposalAccepted ? '#F8FAFC' : 'var(--color-surface-2)',
            color: !isProposalAccepted ? '#94A3B8' : 'var(--color-text)',
            cursor: !isProposalAccepted ? 'not-allowed' : 'text',
            fontWeight: 500
          }}
          placeholder={
            !isProposalAccepted
              ? isProposalPending
                ? '🔒 Chat locked: Awaiting acceptance'
                : '🔒 Chat locked: Send proposal first'
              : `Message ${currentChat.name}…`
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); }
          }}
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!text.trim() || !isProposalAccepted}
          style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: (text.trim() && isProposalAccepted)
              ? 'linear-gradient(135deg, var(--color-primary), #E11D48)'
              : '#E2E8F0',
            color: (text.trim() && isProposalAccepted) ? 'white' : '#94A3B8',
            fontSize: '1.1rem',
            cursor: (text.trim() && isProposalAccepted) ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: (text.trim() && isProposalAccepted) ? '0 4px 12px rgba(225,29,72,0.3)' : 'none'
          }}
          title={!isProposalAccepted ? 'Chat is locked until proposal is accepted' : 'Send message'}
        >
          {!isProposalAccepted ? '🔒' : '🚀'}
        </button>
      </div>
    </div>
  );
}
