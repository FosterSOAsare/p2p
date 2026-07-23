export interface EscrowChatMessage {
  id: string
  sender: string
  timestamp: string
  message: string
}

export interface EscrowMilestone {
  id: string
  title: string
  amount: number
  status: 'pending' | 'delivered' | 'disbursed'
}

export interface EscrowDeal {
  id: string
  code: string
  creatorUsername: string
  counterpartyUsername: string
  title: string
  amount: number
  currency: 'GHS' | 'TRX'
  rail: 'fiat' | 'crypto'
  status: 'created' | 'funded' | 'delivered' | 'disbursed' | 'disputed'
  createdAt: string
  description: string
  chat: EscrowChatMessage[]
  milestones?: EscrowMilestone[]
}

export const initialDeals: EscrowDeal[] = [
  {
    id: 'deal-801',
    code: 'ESC-8F3K2M',
    creatorUsername: 'kofi_dev',
    counterpartyUsername: 'ama_design',
    title: 'Custom UI Design & Figma Kit (Freelance Contract)',
    amount: 1200,
    currency: 'TRX',
    rail: 'crypto',
    status: 'funded',
    createdAt: '2026-07-18',
    description: 'Design of 12 web application screens, component style guide, and responsive mobile mockups.',
    chat: [
      {
        id: 'm1',
        sender: 'kofi_dev',
        timestamp: 'July 18, 10:15 AM',
        message: 'Hi Ama! I initiated the escrow contract for 1,200 TRX on the TRON testnet. Once you accept, funds will be locked.',
      },
      {
        id: 'm2',
        sender: 'ama_design',
        timestamp: 'July 18, 10:30 AM',
        message: 'Accepted and funded! Working on the initial Figma wireframes now.',
      },
    ],
    milestones: [
      { id: 'ms-1', title: 'Wireframes & user flows', amount: 300, status: 'disbursed' },
      { id: 'ms-2', title: '12 hi-fi web screens', amount: 600, status: 'delivered' },
      { id: 'ms-3', title: 'Component style guide & handoff', amount: 300, status: 'pending' },
    ],
  },
  {
    id: 'deal-802',
    code: 'ESC-2QW9RD',
    creatorUsername: 'yaw_trader',
    counterpartyUsername: 'kwame_tech',
    title: 'Off-Market GPU Server Rig Purchase',
    amount: 3400,
    currency: 'GHS',
    rail: 'fiat',
    status: 'disbursed',
    createdAt: '2026-07-10',
    description: '2x Nvidia RTX 4090 GPU workstations shipped via insured courier.',
    chat: [
      {
        id: 'm3',
        sender: 'yaw_trader',
        timestamp: 'July 10, 02:00 PM',
        message: 'Shipment received and verified working! Disbursing escrow funds now.',
      },
    ],
  },
  {
    id: 'deal-803',
    code: 'ESC-7NP4XA',
    creatorUsername: 'daniel_web',
    counterpartyUsername: 'agency_x',
    title: 'Smart Contract Audit & Pen-Test',
    amount: 4500,
    currency: 'TRX',
    rail: 'crypto',
    status: 'created',
    createdAt: '2026-07-20',
    description: 'Security vulnerability audit of Solidity contracts and formal report delivery.',
    chat: [],
  },
]
