export interface EscrowChatMessage {
  id: string
  sender: string
  timestamp: string
  message: string
}

export interface EscrowDeal {
  id: string
  creatorUsername: string
  counterpartyUsername: string
  title: string
  amount: number
  currency: 'USD' | 'USDC' | 'USDT'
  rail: 'fiat' | 'crypto'
  status: 'draft' | 'awaiting_acceptance' | 'funded' | 'released' | 'disputed'
  createdAt: string
  description: string
  chat: EscrowChatMessage[]
}

export const initialDeals: EscrowDeal[] = [
  {
    id: 'deal-801',
    creatorUsername: 'kofi_dev',
    counterpartyUsername: 'ama_design',
    title: 'Custom UI Design & Figma Kit (Freelance Contract)',
    amount: 1200,
    currency: 'USDC',
    rail: 'crypto',
    status: 'funded',
    createdAt: '2026-07-18',
    description: 'Design of 12 web application screens, component style guide, and responsive mobile mockups.',
    chat: [
      {
        id: 'm1',
        sender: 'kofi_dev',
        timestamp: 'July 18, 10:15 AM',
        message: 'Hi Ama! I initiated the escrow contract for $1,200 USDC. Once you accept, funds will be locked.',
      },
      {
        id: 'm2',
        sender: 'ama_design',
        timestamp: 'July 18, 10:30 AM',
        message: 'Accepted and funded! Working on the initial Figma wireframes now.',
      },
    ],
  },
  {
    id: 'deal-802',
    creatorUsername: 'yaw_trader',
    counterpartyUsername: 'kwame_tech',
    title: 'Off-Market GPU Server Rig Purchase',
    amount: 3400,
    currency: 'USD',
    rail: 'fiat',
    status: 'released',
    createdAt: '2026-07-10',
    description: '2x Nvidia RTX 4090 GPU workstations shipped via insured courier.',
    chat: [
      {
        id: 'm3',
        sender: 'yaw_trader',
        timestamp: 'July 10, 02:00 PM',
        message: 'Shipment received and verified working! Releasing escrow funds now.',
      },
    ],
  },
  {
    id: 'deal-803',
    creatorUsername: 'daniel_web',
    counterpartyUsername: 'agency_x',
    title: 'Smart Contract Audit & Pen-Test',
    amount: 4500,
    currency: 'USDT',
    rail: 'crypto',
    status: 'awaiting_acceptance',
    createdAt: '2026-07-20',
    description: 'Security vulnerability audit of Solidity contracts and formal report delivery.',
    chat: [],
  },
]
