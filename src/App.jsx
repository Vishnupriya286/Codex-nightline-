import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive,
  BadgeCheck,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarPlus,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Download,
  Flower2,
  Gauge,
  Globe2,
  Inbox,
  Leaf,
  Link2,
  Mail,
  Map,
  Moon,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { addDays, differenceInMonths, format, isBefore, parseISO } from 'date-fns'
import { z } from 'zod'
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './App.css'

const STORE = {
  data: 'echo.context-os.v2',
  aboutDismissed: 'echo.about-dismissed.v1',
  demoPersonal: 'echo_demo_personal_loaded',
  demoBusiness: 'echo_demo_business_loaded',
  memoryDraft: 'echo.memory-draft.v1',
}

const IMAGE_DB = 'echo-memory-images'
const IMAGE_STORE = 'images'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const colorChoices = [
  { name: 'Blue', value: '#5b7da8' },
  { name: 'Amber', value: '#d08b5b' },
  { name: 'Sage', value: '#68a678' },
  { name: 'Lavender', value: '#8e78b8' },
  { name: 'Coral', value: '#d16565' },
  { name: 'Teal', value: '#68a6a0' },
  { name: 'Rose', value: '#b87680' },
  { name: 'Slate', value: '#5f6b73' },
]
const colorValues = colorChoices.map((entry) => entry.value)
const iconChoices = ['briefcase', 'network', 'heart', 'book', 'leaf', 'spark', 'globe', 'gauge']
const iconMap = { briefcase: BriefcaseBusiness, network: Network, heart: Flower2, book: BookOpen, leaf: Leaf, spark: Sparkles, globe: Globe2, gauge: Gauge }

const echoItemSchema = z.object({
  id: z.string(),
  rawText: z.string(),
  summary: z.string(),
  sourceType: z.enum(['thought', 'conversation', 'email', 'meeting', 'personal', 'import', 'file', 'unknown']),
  itemType: z.enum(['task', 'promise', 'decision', 'follow_up', 'waiting', 'recommendation', 'idea', 'information', 'memory', 'knowledge', 'event']),
  mode: z.enum(['personal', 'business']),
  sourceId: z.string().nullable().optional(),
  context: z.string().optional(),
  subContext: z.string().nullable().optional(),
  people: z.array(z.string()).optional(),
  organizations: z.array(z.string()).optional(),
  contextIds: z.array(z.string()),
  peopleIds: z.array(z.string()),
  deadline: z.string().nullable(),
  action: z.string().nullable(),
  decision: z.string().nullable().optional(),
  reason: z.string().nullable(),
  waitingOn: z.string().nullable().optional(),
  promisedTo: z.string().nullable().optional(),
  relatedItemIds: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['open', 'completed', 'waiting', 'snoozed']),
  suggestedActions: z.array(z.string()),
  language: z.enum(['english', 'malayalam', 'manglish']),
  source: z.string(),
  createdAt: z.string(),
})

const defaultData = {
  activeMode: 'personal',
  aiProvider: 'demo',
  ollamaModel: '',
  profileName: 'Vishnu',
  focusContextId: '',
  aiUsage: { provider: 'demo', callsThisSession: 0, lastAnalysisAt: null },
  whatsappSettings: { countryCode: '91', phoneNumber: '', preferredReminderTime: '18:00', status: 'manual_send' },
  importedSources: [],
  emailThreads: [
    emailThread(
      'thread-demo-gregory',
      'personal',
      'TechX host proposal request',
      'Hi Vishnu,\nPlease send the final TechX host proposal before Friday.\nRegards,\nGregory',
      ['Gregory', 'Vishnu'],
      'ctx-ieee',
      'open',
    ),
    emailThread(
      'thread-demo-anand',
      'personal',
      'TechX funding status',
      'Anand said he will confirm TechX funding Monday.\nStill waiting for approval.',
      ['Anand', 'Vishnu'],
      'ctx-techx',
      'waiting',
    ),
  ],
  reminders: [],
  calendar: [],
  journeys: [
    {
      id: 'journey-codex-nightline',
      mode: 'personal',
      title: 'Codex Nightline',
      musicName: '',
      audioDataUrl: null,
      memoryIds: ['mem-1', 'mem-2'],
      stops: [
        { id: 'stop-1', title: 'The idea clicks', caption: 'Echo becomes a context operating system.', date: '2026-07-18', location: 'Nightline' },
        { id: 'stop-2', title: 'TechX threads connect', caption: 'Gregory, Anand, deadlines, and reminders become visible.', date: '2026-07-18', location: 'IEEE' },
        { id: 'stop-3', title: 'Demo-ready', caption: 'A living map, open loops, and memories in one calm place.', date: '2026-07-19', location: 'Echo' },
      ],
      createdAt: now(),
    },
  ],
  relationships: [
    { id: 'rel-ieee-travel', sourceContextId: 'ctx-ieee', targetContextId: 'ctx-travel', relationshipType: 'event logistics' },
    { id: 'rel-work-ieee', sourceContextId: 'ctx-work', targetContextId: 'ctx-ieee', relationshipType: 'proposal skills' },
    { id: 'rel-personal-health', sourceContextId: 'ctx-personal', targetContextId: 'ctx-health', relationshipType: 'family care' },
    { id: 'rel-business-projects-team', sourceContextId: 'biz-projects', targetContextId: 'biz-team', relationshipType: 'ownership' },
  ],
  people: [
    person('person-gregory', 'Gregory'),
    person('person-anand', 'Anand'),
    person('person-amma', 'Amma'),
    person('person-rahul', 'Rahul'),
    person('person-boss', 'Boss'),
    person('person-client', 'Client'),
    person('person-intern', 'Intern'),
    person('person-supervisor', 'Supervisor'),
    person('person-anu', 'Anu'),
  ],
  contexts: [
    context('ctx-work', 'Work', 'personal', null, '#5b7da8', 'briefcase', 'Office projects, payment platform, client work, and team updates.'),
    context('ctx-payment', 'Payment Platform', 'personal', 'ctx-work', '#5b7da8', 'gauge', 'Reusable payment SDK, gateway module, webhook testing.'),
    context('ctx-client-site', 'Client Website', 'personal', 'ctx-work', '#5b7da8', 'globe', 'Website requirements, contact form, bugs, and deployment notes.'),
    context('ctx-ieee', 'IEEE', 'personal', null, '#d08b5b', 'network', 'TechX proposals, volunteers, funding, events, and reimbursements.'),
    context('ctx-techx', 'TechX', 'personal', 'ctx-ieee', '#d08b5b', 'spark', 'Host coordination, proposals, funding, and deadlines.'),
    context('ctx-events', 'Events', 'personal', 'ctx-ieee', '#d08b5b', 'globe', 'Reignite, Hexabyte, vendor registration, and event logistics.'),
    context('ctx-music', 'Music', 'personal', null, '#8e78b8', 'leaf', 'Classes, practice, performances, and creative growth.'),
    context('ctx-personal', 'Personal', 'personal', null, '#68a678', 'heart', 'Family commitments, reminders, travel, and personal care.'),
    context('ctx-family', 'Family', 'personal', 'ctx-personal', '#68a678', 'heart', 'Family commitments and care loops.'),
    context('ctx-health', 'Health', 'personal', 'ctx-personal', '#68a678', 'leaf', 'Appointments, medicine, and wellbeing tasks.'),
    context('ctx-travel', 'Travel', 'personal', null, '#68a6a0', 'globe', 'Trips, event travel, and packing reminders.'),
    context('ctx-research', 'Research', 'personal', null, '#8e78b8', 'book', 'UAV semantic segmentation, experiments, journals, and manuscript work.'),
    context('ctx-hackathon', 'Hackathon', 'personal', null, '#d16565', 'spark', 'Echo demo flow, pitch, mobile hotspot, laptop readiness.'),
    context('ctx-learning', 'Learning', 'personal', null, '#b08968', 'book', 'Courses, experiments, and skills to build.'),
    context('ctx-startup', 'Startup Ideas', 'personal', null, '#68a6a0', 'gauge', 'Product ideas and validation notes.'),
    context('biz-operations', 'Operations', 'business', null, '#5b7da8', 'gauge', 'Order processing, inventory, execution rhythms.'),
    context('biz-customers', 'Customers', 'business', null, '#68a678', 'globe', 'Leads, support, relationship history, and promises.'),
    context('biz-projects', 'Projects', 'business', null, '#d08b5b', 'briefcase', 'Website, mobile app, delivery commitments.'),
    context('biz-team', 'Team', 'business', null, '#8e78b8', 'network', 'Owners, blockers, responsibilities, and updates.'),
    context('biz-vendors', 'Vendors', 'business', null, '#68a6a0', 'link', 'Vendor timelines, contracts, and dependencies.'),
    context('biz-finance', 'Finance', 'business', null, '#d16565', 'gauge', 'Payments, invoices, deadlines, and approvals.'),
    context('biz-marketing', 'Marketing', 'business', null, '#b87680', 'globe', 'Campaigns, content, positioning, and market conversations.'),
    context('biz-website', 'Website', 'business', 'biz-projects', '#d08b5b', 'globe', 'Business website delivery and decisions.'),
  ],
  items: [],
  memories: [
    memory('mem-1', 'personal', 'TechX planning table', 'A late evening where the TechX plan finally became clear.', '2026-04-20', 'ctx-techx', ['Gregory', 'Anand'], 'proud', ['IEEE', 'TechX'], 2),
    memory('mem-2', 'personal', 'Hackathon pitch rehearsal', 'The first Echo pitch that sounded like a product instead of a project.', '2026-06-11', 'ctx-hackathon', [], 'focused', ['Echo', 'pitch'], 1),
    memory('mem-3', 'business', 'Refund approval rule', 'Customer refunds require manager approval before processing.', '2026-06-30', 'biz-finance', [], 'clear', ['SOP', 'refunds'], 0),
  ],
  achievements: [],
  connectors: [
    connector('manual', 'Manual Import', 'connected', 'Import pasted notes, JSON, TXT, MD, and WhatsApp exports.'),
    connector('local-files', 'Local Files', 'connected', 'Upload local TXT, MD, JSON, and chat exports.'),
    connector('email-import', 'Email Import', 'connected', 'Paste an email thread or upload .eml / exported email text.'),
    connector('gmail', 'Gmail', 'coming_soon', 'OAuth integration required. Connector available in future integration.'),
    connector('calendar', 'Google Calendar', 'coming_soon', 'OAuth integration required. Connector available in future integration.'),
    connector('keep', 'Google Keep / Notes', 'coming_soon', 'Import Notes Export or Paste Notes for now.'),
    connector('whatsapp', 'WhatsApp', 'demo', 'WhatsApp personal account integration requires external APIs or WhatsApp Business access. Import WhatsApp Export is available.'),
  ],
  automations: [
    automation('auto-promise', 'When a new promise is detected, create a loose end.', true),
    automation('auto-waiting', 'When someone says they will respond later, create a waiting item.', true),
    automation('auto-deadline', 'When a deadline is detected, suggest a reminder.', true),
    automation('auto-meeting', 'When a meeting outcome contains an action, add it to the appropriate context.', true),
    automation('auto-photo', 'When a memory contains a photo, suggest adding it to Memory Garden.', false),
  ],
}

function context(id, name, mode, parentContextId, color, icon, description) {
  return { id, name, type: parentContextId ? 'sub_context' : 'primary', mode, parentContextId, color, icon, description, archived: false, createdAt: now() }
}

function person(id, name) {
  return { id, name, createdAt: now() }
}

function connector(id, name, status, description) {
  return { id, name, status, description }
}

function emailThread(id, mode, subject, rawText, participants, contextId, status) {
  return {
    id,
    mode,
    subject,
    rawText,
    participants,
    contextId,
    status,
    latestDecision: '',
    suggestedNextAction: '',
    createdAt: now(),
    updatedAt: now(),
  }
}

function automation(id, rule, enabled) {
  return { id, rule, enabled }
}

function memory(id, mode, title, description, date, contextId, people, mood, tags, waterCount = 0, imageDataUrl = null, imageStorageKey = null) {
  const timestamp = now()
  return {
    id,
    mode,
    title,
    description,
    date,
    contextId,
    people,
    tags,
    mood,
    imageDataUrl,
    imageStorageKey,
    growthStage: growthStage(waterCount),
    waterCount,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastVisitedAt: null,
  }
}

function now() {
  return new Date().toISOString()
}

function uid(prefix) {
  const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return prefix ? `${prefix}-${id}` : id
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE.data))
    if (!saved) return defaultData
    return migrateData({ ...defaultData, ...saved })
  } catch {
    return defaultData
  }
}

function saveData(data) {
  localStorage.setItem(STORE.data, JSON.stringify(data))
}

function mergeById(base, overrides) {
  const merged = new Map(base.map((entry) => [entry.id, entry]))
  overrides.forEach((entry) => merged.set(entry.id, { ...merged.get(entry.id), ...entry }))
  return [...merged.values()]
}

function migrateData(data) {
  const contexts = (data.contexts || defaultData.contexts).map((entry) => ({
    ...entry,
    mode: entry.mode || (String(entry.id || '').startsWith('biz-') ? 'business' : 'personal'),
    color: entry.color || colorValues[0],
    archived: Boolean(entry.archived),
    createdAt: entry.createdAt || now(),
  }))
  const contextMode = (contextId) => contexts.find((entry) => entry.id === contextId)?.mode || 'personal'
  const items = (data.items || []).map((entry) => {
    const contextIds = Array.isArray(entry.contextIds) ? entry.contextIds : [entry.context || entry.contextId].filter(Boolean)
    const inferredMode = entry.mode || (contextIds.some((id) => contextMode(id) === 'business') || entry.source === 'demo-business' ? 'business' : 'personal')
    return {
      ...entry,
      id: entry.id || uid('item'),
      mode: inferredMode,
      contextIds,
      peopleIds: Array.isArray(entry.peopleIds) ? entry.peopleIds : [],
      source: entry.source || 'manual',
      createdAt: entry.createdAt || now(),
    }
  })
  const memories = (data.memories || []).map((entry) => {
    const contextId = entry.contextId || entry.contextIds?.[0] || null
    const mode = entry.mode || contextMode(contextId)
    const peopleFromIds = Array.isArray(entry.peopleIds) ? names(data.people || defaultData.people, entry.peopleIds) : []
    return {
      id: entry.id || uid('mem'),
      mode,
      title: entry.title || 'Untitled memory',
      description: entry.description || '',
      date: entry.date || format(new Date(), 'yyyy-MM-dd'),
      contextId,
      people: Array.isArray(entry.people) ? entry.people : peopleFromIds,
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      mood: entry.mood || '',
      imageDataUrl: entry.imageDataUrl || entry.imageUrl || null,
      imageStorageKey: entry.imageStorageKey || null,
      growthStage: normalizeGrowth(entry.growthStage, entry.waterCount || 0),
      waterCount: Number(entry.waterCount || 0),
      createdAt: entry.createdAt || now(),
      updatedAt: entry.updatedAt || entry.createdAt || now(),
      lastVisitedAt: entry.lastVisitedAt || entry.lastVisited || null,
    }
  })
  return {
    ...defaultData,
    ...data,
    contexts,
    items,
    memories,
    aiUsage: { ...defaultData.aiUsage, ...(data.aiUsage || {}) },
    whatsappSettings: { ...defaultData.whatsappSettings, ...(data.whatsappSettings || {}) },
    emailThreads: (data.emailThreads || defaultData.emailThreads).map((entry) => ({ ...entry, id: entry.id || uid('thread'), mode: entry.mode || 'personal', participants: entry.participants || [], status: entry.status || 'open', createdAt: entry.createdAt || now(), updatedAt: entry.updatedAt || now() })),
    journeys: data.journeys || defaultData.journeys,
    connectors: mergeById(defaultData.connectors, data.connectors || []),
    importedSources: (data.importedSources || []).map((entry) => ({ ...entry, id: entry.id || uid('source'), mode: entry.mode || 'personal' })),
    reminders: (data.reminders || []).map((entry) => ({ ...entry, id: entry.id || uid('reminder'), mode: entry.mode || contextMode(entry.contextIds?.[0]) })),
    calendar: (data.calendar || []).map((entry) => ({ ...entry, id: entry.id || uid('event'), mode: entry.mode || contextMode(entry.contextIds?.[0]) })),
  }
}

function openImageDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available.'))
      return
    }
    const request = indexedDB.open(IMAGE_DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(IMAGE_STORE)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function putMemoryImage(key, dataUrl) {
  const db = await openImageDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readwrite')
    tx.objectStore(IMAGE_STORE).put(dataUrl, key)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

async function getMemoryImage(key) {
  if (!key) return null
  const db = await openImageDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readonly')
    const request = tx.objectStore(IMAGE_STORE).get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

async function deleteMemoryImage(key) {
  if (!key) return
  const db = await openImageDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readwrite')
    tx.objectStore(IMAGE_STORE).delete(key)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function prepareMemoryImage(file) {
  if (!file) return { dataUrl: null, error: '' }
  if (!supportedImageTypes.includes(file.type)) return { dataUrl: null, error: 'Please upload a JPG, PNG, or WebP image.' }
  if (file.size > MAX_IMAGE_BYTES) return { dataUrl: null, error: 'That image is over 5 MB. Choose a smaller file for this MVP.' }
  const source = await fileToDataUrl(file)
  return { dataUrl: await resizeImageDataUrl(source), error: '' }
}

function resizeImageDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const max = 1280
      const scale = Math.min(1, max / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/webp', 0.82))
    }
    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })
}

function demoPersonalItems() {
  return [
    item('Gregory asked for the final TechX proposal before Friday.', 'conversation', 'promise', 'personal', ['ctx-ieee', 'ctx-techx'], ['person-gregory'], '2026-07-24', 'Send Gregory the final TechX proposal', 'high', 'open', ['draft_email', 'create_reminder', 'create_follow_up']),
    item('Anand said he would confirm the funding status next week.', 'conversation', 'follow_up', 'personal', ['ctx-ieee', 'ctx-techx'], ['person-anand'], '2026-07-27', 'Wait for Anand to confirm the funding status', 'medium', 'waiting', ['create_follow_up', 'create_reminder']),
    item('Reignite organizers need clarification regarding vendor registration.', 'email', 'task', 'personal', ['ctx-ieee', 'ctx-events'], [], '2026-07-23', 'Clarify vendor registration requirements', 'medium', 'open', ['draft_email']),
    item('Hexabyte event receipts are still pending.', 'thought', 'task', 'personal', ['ctx-ieee', 'ctx-events'], [], '2026-07-25', 'Collect and submit Hexabyte receipts', 'medium', 'open', ['create_reminder']),
    item('The TechX host deadline is approaching.', 'meeting', 'task', 'personal', ['ctx-ieee', 'ctx-techx'], [], '2026-07-22', 'Confirm TechX host details', 'high', 'open', ['create_calendar_event', 'create_reminder']),
    item('Intern asked how the payment module can be reused across projects.', 'conversation', 'follow_up', 'personal', ['ctx-work', 'ctx-payment'], ['person-intern'], '2026-07-20', 'Reply with payment module reusability notes', 'medium', 'open', ['draft_email']),
    item('Boss requested a progress update on the payment SDK.', 'meeting', 'task', 'personal', ['ctx-work', 'ctx-payment'], ['person-boss'], '2026-07-20', 'Prepare payment SDK progress update', 'high', 'open', ['draft_email', 'create_reminder']),
    item('Client selected email integration for the website contact form.', 'meeting', 'decision', 'personal', ['ctx-work', 'ctx-client-site'], ['person-client'], null, 'Record email integration decision', 'low', 'open', ['add_to_context']),
    item('Strapi image upload error needs investigation.', 'thought', 'task', 'personal', ['ctx-work', 'ctx-client-site'], [], '2026-07-21', 'Investigate Strapi image upload error', 'medium', 'open', ['create_reminder']),
    item('Payment webhook testing is pending.', 'thought', 'task', 'personal', ['ctx-work', 'ctx-payment'], [], '2026-07-22', 'Finish payment webhook testing', 'medium', 'open', ['create_reminder']),
    item("Book Amma's medical appointment.", 'personal', 'promise', 'personal', ['ctx-personal', 'ctx-family', 'ctx-health'], ['person-amma'], '2026-07-21', "Book Amma's medical appointment", 'high', 'open', ['create_reminder', 'create_calendar_event']),
    item("Buy a gift before a friend's birthday.", 'personal', 'task', 'personal', ['ctx-personal'], [], '2026-07-26', 'Buy birthday gift', 'medium', 'open', ['create_reminder']),
    item('Rahul recommended Kappi Stories in Kakkanad.', 'conversation', 'recommendation', 'personal', ['ctx-personal', 'ctx-travel'], ['person-rahul'], null, 'Remember Kappi Stories in Kakkanad', 'low', 'open', ['add_to_context']),
    item('Review hybrid journals for UAV semantic segmentation.', 'thought', 'task', 'personal', ['ctx-research'], [], '2026-07-28', 'Review hybrid journals for UAV semantic segmentation', 'medium', 'open', ['create_reminder']),
    item('Update grasp recognition experiment results.', 'meeting', 'task', 'personal', ['ctx-research'], [], '2026-07-23', 'Update grasp recognition experiment results', 'medium', 'open', ['create_reminder']),
    item('Send manuscript feedback to the supervisor.', 'email', 'task', 'personal', ['ctx-research'], ['person-supervisor'], '2026-07-24', 'Send manuscript feedback', 'high', 'open', ['draft_email']),
    item('Finalize Echo demo flow.', 'thought', 'task', 'personal', ['ctx-hackathon'], [], '2026-07-20', 'Finalize Echo demo flow', 'high', 'open', ['create_reminder']),
    item('Test mobile hotspot.', 'thought', 'task', 'personal', ['ctx-hackathon'], [], '2026-07-20', 'Test mobile hotspot', 'medium', 'open', ['create_reminder']),
    item('Prepare a 60-second pitch.', 'thought', 'task', 'personal', ['ctx-hackathon'], [], '2026-07-20', 'Prepare a 60-second pitch', 'high', 'open', ['create_reminder']),
    item('Keep the laptop in battery-saving mode.', 'personal', 'information', 'personal', ['ctx-hackathon'], [], null, 'Remember battery-saving mode during the hackathon', 'low', 'open', ['add_to_context']),
    item('Music class practice needs a 20-minute warmup before Saturday.', 'thought', 'task', 'personal', ['ctx-music'], [], '2026-07-25', 'Do the music class warmup practice', 'medium', 'open', ['create_reminder']),
  ]
}

function demoBusinessItems() {
  return [
    item('Pending order processing needs an owner before dispatch starts.', 'meeting', 'task', 'business', ['biz-operations'], [], '2026-07-21', 'Assign pending order processing owner', 'high', 'open', ['create_reminder']),
    item('Inventory update is due before the weekly operations review.', 'thought', 'task', 'business', ['biz-operations'], [], '2026-07-22', 'Update inventory before operations review', 'medium', 'open', ['create_reminder']),
    item('Delivery coordination is blocked until Vendor A responds.', 'conversation', 'follow_up', 'business', ['biz-operations', 'biz-vendors'], [], '2026-07-23', 'Follow up with Vendor A about delivery coordination', 'high', 'waiting', ['create_follow_up', 'create_reminder']),
    item('Client wants the website updated by Friday. Rahul will finish frontend and Anu will deploy.', 'meeting', 'task', 'business', ['biz-customers', 'biz-projects', 'biz-website', 'biz-team'], ['person-rahul', 'person-anu', 'person-client'], '2026-07-24', 'Finish website update and deployment', 'high', 'open', ['create_reminder', 'draft_email']),
    item('Three customer follow-ups are pending from last week.', 'email', 'follow_up', 'business', ['biz-customers'], [], '2026-07-22', 'Close three pending customer follow-ups', 'high', 'open', ['draft_email', 'create_reminder']),
    item('One customer complaint needs a response from support.', 'conversation', 'follow_up', 'business', ['biz-customers'], [], '2026-07-20', 'Respond to the open customer complaint', 'high', 'open', ['draft_email']),
    item('Website redesign scope needs confirmation.', 'meeting', 'decision', 'business', ['biz-projects', 'biz-website'], [], '2026-07-23', 'Confirm website redesign scope', 'medium', 'open', ['create_reminder']),
    item('Payment integration needs a testing checkpoint.', 'thought', 'task', 'business', ['biz-projects', 'biz-finance'], [], '2026-07-25', 'Schedule payment integration testing checkpoint', 'medium', 'open', ['create_calendar_event']),
    item('Developer task allocation needs to be updated after sprint planning.', 'meeting', 'task', 'business', ['biz-team'], [], '2026-07-21', 'Update developer task allocation', 'medium', 'open', ['create_reminder']),
    item('Operations responsibilities need clearer ownership.', 'meeting', 'decision', 'business', ['biz-team', 'biz-operations'], [], null, 'Clarify operations responsibilities', 'medium', 'open', ['add_to_context']),
    item('Vendor payment deadline is approaching.', 'email', 'task', 'business', ['biz-finance', 'biz-vendors'], [], '2026-07-24', 'Prepare vendor payment', 'high', 'open', ['create_reminder']),
    item('Invoice follow-up is pending with finance.', 'email', 'follow_up', 'business', ['biz-finance'], [], '2026-07-23', 'Follow up on pending invoice', 'medium', 'waiting', ['create_follow_up']),
    item('Vendor response is still pending for replacement stock.', 'conversation', 'follow_up', 'business', ['biz-vendors'], [], '2026-07-22', 'Get vendor response for replacement stock', 'high', 'waiting', ['create_reminder']),
    item('Delivery delay needs a customer communication plan.', 'meeting', 'task', 'business', ['biz-vendors', 'biz-customers'], [], '2026-07-21', 'Prepare delivery delay customer update', 'high', 'open', ['draft_email']),
    item('Large orders require 50% advance payment.', 'thought', 'knowledge', 'business', ['biz-finance', 'biz-operations'], [], null, 'Document advance payment rule', 'medium', 'open', ['add_to_context']),
    item('Vendor A usually takes seven days to deliver replacement parts.', 'conversation', 'information', 'business', ['biz-vendors', 'biz-operations'], [], null, 'Remember Vendor A delivery timeline', 'low', 'open', ['add_to_context']),
    item('Customer refunds require manager approval.', 'meeting', 'decision', 'business', ['biz-customers', 'biz-finance'], [], null, 'Record refund approval rule', 'medium', 'open', ['add_to_context']),
    item('Operations team is waiting for inventory confirmation before dispatch.', 'conversation', 'follow_up', 'business', ['biz-operations', 'biz-team'], [], '2026-07-22', 'Confirm inventory before dispatch', 'high', 'waiting', ['create_follow_up', 'create_reminder']),
  ]
}

function item(rawText, sourceType, itemType, mode, contextIds, peopleIds, deadline, action, priority, status, suggestedActions) {
  const contextName = contextIds[0] || ''
  return echoItemSchema.parse({
    id: uid('item'),
    rawText,
    summary: action,
    sourceType,
    itemType,
    mode,
    sourceId: null,
    context: contextName,
    subContext: null,
    people: [],
    organizations: [],
    contextIds,
    peopleIds,
    deadline,
    action,
    decision: itemType === 'decision' ? action : null,
    reason: status === 'waiting' ? 'You are waiting on someone.' : 'This may need your attention.',
    waitingOn: null,
    promisedTo: null,
    relatedItemIds: [],
    confidence: 0.82,
    priority,
    status,
    suggestedActions,
    language: 'english',
    source: sourceType,
    createdAt: now(),
  })
}

function App() {
  const [data, setData] = useState(loadData)
  const [active, setActive] = useState('today')
  const [aboutDismissed, setAboutDismissed] = useState(() => localStorage.getItem(STORE.aboutDismissed) === 'true')
  const [capture, setCapture] = useState('')
  const [captureType, setCaptureType] = useState('unknown')
  const [draftItem, setDraftItem] = useState(null)
  const [toast, setToast] = useState('')
  const [actionPanel, setActionPanel] = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [question, setQuestion] = useState('What am I waiting for Anand to confirm?')
  const [answer, setAnswer] = useState(null)
  const [mapView, setMapView] = useState('map')
  const [selectedContextId, setSelectedContextId] = useState('')
  const [contextEditor, setContextEditor] = useState(null)
  const [memoryEditor, setMemoryEditor] = useState(null)
  const [emailDraft, setEmailDraft] = useState('')
  const [celebration, setCelebration] = useState('')
  const [resolutionCandidate, setResolutionCandidate] = useState(null)
  const waterCooldown = useRef({})
  const mode = data.activeMode
  const achievements = useMemo(() => calculateAchievements(data), [data])

  useEffect(() => saveData(data), [data])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const modeItems = data.items.filter((item) => item.mode === mode)
  const modeContexts = data.contexts.filter((contextItem) => contextItem.mode === mode && !contextItem.archived)
  const selectedContext = modeContexts.find((contextItem) => contextItem.id === selectedContextId) || modeContexts[0]
  const nav = mode === 'personal' ? personalNav : businessNav

  const update = (patch) => setData((current) => ({ ...current, ...patch }))
  const mutate = (fn) => {
    setData((current) => {
      const next = fn(current)
      const before = calculateAchievements(current)
      const after = calculateAchievements(next)
      const newly = after.find((achievement) => achievement.unlocked && !before.some((old) => old.id === achievement.id && old.unlocked))
      if (newly) {
        setTimeout(() => setCelebration(newly.name), 0)
        setTimeout(() => setCelebration(''), 2200)
      }
      return { ...next, achievements: after }
    })
  }
  const setMode = (nextMode) => {
    update({ activeMode: nextMode, focusContextId: '' })
    setActive(nextMode === 'personal' ? 'today' : 'business-home')
    setAnswer(null)
  }
  const dismissAbout = () => {
    localStorage.setItem(STORE.aboutDismissed, 'true')
    setAboutDismissed(true)
  }
  const showAbout = () => {
    localStorage.removeItem(STORE.aboutDismissed)
    setAboutDismissed(false)
  }

  const loadDemo = (demoMode = mode) => {
    mutate((current) => {
      const demoItems = demoMode === 'personal' ? demoPersonalItems() : demoBusinessItems()
      const demoContextIds = new Set(demoItems.flatMap((entry) => entry.contextIds || []))
      const missingDemoContexts = defaultData.contexts.filter((entry) => entry.mode === demoMode && demoContextIds.has(entry.id) && !current.contexts.some((contextEntry) => contextEntry.id === entry.id))
      return {
        ...current,
        contexts: [...current.contexts, ...missingDemoContexts],
        items: [...current.items.filter((entry) => entry.source !== `demo-${demoMode}`), ...demoItems.map((demo) => ({ ...demo, source: `demo-${demoMode}` }))],
      }
    })
    localStorage.setItem(demoMode === 'personal' ? STORE.demoPersonal : STORE.demoBusiness, 'true')
    setToast(demoMode === 'personal' ? 'Demo personal life loaded.' : 'Demo business context loaded.')
  }

  const clearDemo = (demoMode = mode) => {
    mutate((current) => ({ ...current, items: current.items.filter((item) => item.source !== `demo-${demoMode}`) }))
    localStorage.removeItem(demoMode === 'personal' ? STORE.demoPersonal : STORE.demoBusiness)
    setToast('Demo data cleared.')
  }

  const clearAll = () => {
    localStorage.removeItem(STORE.data)
    localStorage.removeItem(STORE.demoPersonal)
    localStorage.removeItem(STORE.demoBusiness)
    localStorage.removeItem(STORE.memoryDraft)
    setData(defaultData)
    setToast('All local Echo data cleared.')
  }

  const saveDraft = () => {
    const resolution = findResolutionCandidate(draftItem, data)
    mutate((current) => addExtractedItem(current, draftItem))
    if (resolution) setResolutionCandidate({ newItem: draftItem, oldItem: resolution })
    setDraftItem(null)
    setCapture('')
    setToast('Captured. Echo will keep the context with it.')
  }

  const addEmailThread = (thread) => {
    mutate((current) => ({ ...current, emailThreads: [thread, ...(current.emailThreads || [])] }))
    setToast('Email thread added. Echo can analyze it into an open loop.')
  }

  const analyzeThreadToInbox = async (thread) => {
    const extracted = await extractMemory(thread.rawText, 'email', data)
    setDraftItem(extracted)
    setActive(mode === 'personal' ? 'inbox' : 'business-inbox')
    updateAiUsage()
  }

  const submitCapture = async () => {
    if (!capture.trim()) return
    try {
      const extracted = await extractMemory(capture.trim(), captureType, data)
      setDraftItem(extracted)
      updateAiUsage()
    } catch (error) {
      setDraftItem(fallbackFailedItem(capture.trim(), captureType, data, error))
      setToast('Echo preserved the input, but structured extraction needs review.')
    }
  }

  const runAsk = async () => {
    const result = await askEcho(question, data, mode, 'everything')
    setAnswer(result)
    updateAiUsage()
  }

  const updateAiUsage = () => {
    setData((current) => ({ ...current, aiUsage: { provider: current.aiProvider, callsThisSession: (current.aiUsage?.callsThisSession || 0) + 1, lastAnalysisAt: now() } }))
  }

  const createReminder = (targetItem, channel = 'in_app') => {
    const personName = names(data.people, targetItem.peopleIds)[0] || ''
    mutate((current) => ({
      ...current,
      reminders: [
        {
          id: uid('reminder'),
          mode: targetItem.mode,
          title: targetItem.action || targetItem.summary,
          date: suggestedReminderDate(targetItem),
          time: current.whatsappSettings?.preferredReminderTime || '18:00',
          contextIds: targetItem.contextIds,
          relatedItemId: targetItem.id,
          person: personName,
          deliveryChannel: channel,
          status: channel === 'in_app' ? 'scheduled' : 'manual_send',
          message: buildReminderMessage(targetItem, data),
          createdAt: now(),
        },
        ...current.reminders,
      ],
    }))
    if (channel === 'whatsapp') {
      setActionPanel({ type: 'whatsapp_reminder', item: targetItem })
      setToast('WhatsApp reminder prepared for manual send.')
    } else {
      setToast('In-app reminder scheduled.')
    }
  }

  const createCalendar = (targetItem) => {
    mutate((current) => ({
      ...current,
      calendar: [
        { id: uid('event'), title: targetItem.action || targetItem.summary, date: targetItem.deadline || format(addDays(new Date(), 1), 'yyyy-MM-dd'), time: '09:30', contextIds: targetItem.contextIds, notes: targetItem.rawText },
        ...current.calendar,
      ],
    }))
    setActionPanel({ type: 'calendar', item: targetItem })
    setToast('Calendar event prepared.')
  }

  const updateStatus = (id, status) => {
    if (status === 'completed' && !window.confirm('Complete this task?')) return
    mutate((current) => ({ ...current, items: current.items.map((entry) => (entry.id === id ? { ...entry, status, completedAt: status === 'completed' ? now() : entry.completedAt } : entry)) }))
    setToast(status === 'completed' ? 'Closed. That loop is handled.' : 'Echo tucked it away for later.')
  }

  const resolveLoop = (oldId) => {
    mutate((current) => ({ ...current, items: current.items.map((entry) => entry.id === oldId ? { ...entry, status: 'completed', completedAt: now(), reason: 'Resolved by newer information.' } : entry) }))
    setResolutionCandidate(null)
    setToast('Echo closed the resolved loop.')
  }

  const saveContext = (contextValue) => {
    mutate((current) => {
      const exists = current.contexts.some((entry) => entry.id === contextValue.id)
      return { ...current, contexts: exists ? current.contexts.map((entry) => (entry.id === contextValue.id ? contextValue : entry)) : [...current.contexts, contextValue] }
    })
    setContextEditor(null)
    setToast('Context connected.')
  }

  const archiveContext = (id) => {
    if (!window.confirm('Archive this context? This keeps the memories and items, but hides the context.')) return
    mutate((current) => ({ ...current, contexts: current.contexts.map((entry) => (entry.id === id ? { ...entry, archived: true } : entry)) }))
    setToast('Context archived.')
  }

  const deleteContext = (id) => {
    if (!window.confirm('Delete this context? This cannot be undone.')) return
    mutate((current) => ({
      ...current,
      contexts: current.contexts.filter((entry) => entry.id !== id && entry.parentContextId !== id),
      items: current.items.map((entry) => ({ ...entry, contextIds: entry.contextIds.filter((contextId) => contextId !== id) })),
      memories: current.memories.map((entry) => entry.contextId === id ? { ...entry, contextId: null, updatedAt: now() } : entry),
    }))
    setToast('Context deleted.')
  }

  const deleteTask = (id) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return
    mutate((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== id) }))
    setToast('Task deleted.')
  }

  const waterMemory = (id) => {
    if (Date.now() - (waterCooldown.current[id] || 0) < 900) return
    waterCooldown.current[id] = Date.now()
    mutate((current) => ({
      ...current,
      memories: current.memories.map((entry) => {
        if (entry.id !== id) return entry
        const waterCount = entry.waterCount + 1
        return { ...entry, waterCount, growthStage: growthStage(waterCount), updatedAt: now(), lastVisitedAt: now() }
      }),
    }))
    setToast('Your memory grew.')
  }

  const visitMemory = (id) => {
    mutate((current) => ({ ...current, memories: current.memories.map((entry) => entry.id === id ? { ...entry, lastVisitedAt: now(), updatedAt: now() } : entry) }))
  }

  const addMemory = async (memoryValue) => {
    let storedMemory = { ...memoryValue, updatedAt: now() }
    if (memoryValue.imageDataUrl) {
      const imageStorageKey = memoryValue.imageStorageKey || uid('memory-image')
      try {
        await putMemoryImage(imageStorageKey, memoryValue.imageDataUrl)
        storedMemory = { ...storedMemory, imageStorageKey, imageDataUrl: null }
      } catch {
        storedMemory = { ...storedMemory, imageStorageKey: null }
      }
    }
    mutate((current) => {
      const exists = current.memories.some((entry) => entry.id === storedMemory.id)
      return { ...current, memories: exists ? current.memories.map((entry) => entry.id === storedMemory.id ? storedMemory : entry) : [storedMemory, ...current.memories] }
    })
    localStorage.removeItem(STORE.memoryDraft)
    setMemoryEditor(null)
    setToast('Memory planted.')
  }

  const deleteMemory = async (id) => {
    const target = data.memories.find((entry) => entry.id === id)
    if (!target || !window.confirm('Delete this memory? This cannot be undone.')) return
    try {
      await deleteMemoryImage(target.imageStorageKey)
    } catch {
      // Metadata deletion should still continue if image cleanup is unavailable.
    }
    mutate((current) => ({ ...current, memories: current.memories.filter((entry) => entry.id !== id) }))
    setToast('Memory deleted.')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `echo-context-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file) => {
    if (!file) return
    const text = await file.text()
    try {
      const parsed = JSON.parse(text)
      setData(migrateData({ ...defaultData, ...parsed }))
      setToast('Echo data imported.')
    } catch {
      setToast('That JSON could not be imported.')
    }
  }

  const demoFlagLoaded = localStorage.getItem(mode === 'personal' ? STORE.demoPersonal : STORE.demoBusiness) === 'true'
  const demoItemCount = data.items.filter((entry) => entry.mode === mode && entry.source === `demo-${mode}`).length
  const demoLoaded = demoFlagLoaded && demoItemCount > 0
  const demoStale = demoFlagLoaded && demoItemCount === 0
  const HeaderAction = (
    <div className="top-actions">
      <button className="primary" onClick={() => loadDemo(mode)} disabled={demoLoaded}><Sparkles size={18} />{demoLoaded ? 'Demo Data Loaded' : demoStale ? 'Reload Demo Data' : mode === 'personal' ? 'Load Demo Personal Life' : 'Load Demo Business'}</button>
      <button className="secondary" onClick={() => setImportModal(true)}><Plus size={18} />Add My Context</button>
    </div>
  )

  return (
    <div className={`app-shell ${mode === 'business' ? 'business-mode' : ''}`}>
      <aside className="sidebar">
        <Brand />
        <ModeSwitch mode={mode} setMode={setMode} />
        <nav>{nav.map(({ key, Icon, label }) => <NavButton key={key} active={active === key} Icon={Icon} label={label} onClick={() => setActive(key)} />)}</nav>
        {!aboutDismissed && <AboutCard onClose={dismissAbout} />}
        <button className="about-button" onClick={showAbout}><CircleHelp size={18} />About Echo</button>
      </aside>

      <main className="workspace">
        <AnimatePresence mode="wait">
          {(active === 'today' || active === 'business-home') && <Page key={active}>{mode === 'personal' ? <Today data={data} items={modeItems} contexts={modeContexts} headerAction={HeaderAction} setFocus={(focusContextId) => update({ focusContextId })} openAction={setActionPanel} createReminder={createReminder} updateStatus={updateStatus} /> : <BusinessHome data={data} items={modeItems} contexts={modeContexts} headerAction={HeaderAction} />}</Page>}
          {(active === 'inbox' || active === 'business-inbox') && <Page key={active}><MindInbox mode={mode} capture={capture} setCapture={setCapture} captureType={captureType} setCaptureType={setCaptureType} submitCapture={submitCapture} draftItem={draftItem} setDraftItem={setDraftItem} saveDraft={saveDraft} contexts={modeContexts} people={data.people} /></Page>}
          {(active === 'life-map' || active === 'business-map') && <Page key={active}><LifeMap data={data} mode={mode} contexts={modeContexts} items={modeItems} selected={selectedContext} setSelectedContextId={setSelectedContextId} mapView={mapView} setMapView={setMapView} openContextEditor={setContextEditor} archiveContext={archiveContext} deleteContext={deleteContext} openAction={setActionPanel} createReminder={createReminder} /></Page>}
          {active === 'operations' && <Page key="operations"><BusinessSection section="Operations" contextId="biz-operations" data={data} items={modeItems} contexts={modeContexts} openAction={setActionPanel} createReminder={createReminder} updateStatus={updateStatus} /></Page>}
          {active === 'team' && <Page key="team"><BusinessSection section="Team" contextId="biz-team" data={data} items={modeItems} contexts={modeContexts} openAction={setActionPanel} createReminder={createReminder} updateStatus={updateStatus} /></Page>}
          {active === 'email-threads' && <Page key="email-threads"><EmailThreads mode={mode} data={data} contexts={modeContexts} emailDraft={emailDraft} setEmailDraft={setEmailDraft} addEmailThread={addEmailThread} analyzeThread={analyzeThreadToInbox} /></Page>}
          {active === 'loose' && <Page key="loose"><LooseEnds data={data} items={modeItems} contexts={modeContexts} openAction={setActionPanel} createReminder={createReminder} updateStatus={updateStatus} deleteTask={deleteTask} /></Page>}
          {(active === 'memory' || active === 'knowledge') && <Page key={active}><MemoryGarden mode={mode} data={data} contexts={modeContexts} addMemory={() => setMemoryEditor({ type: 'new' })} editMemory={(entry) => setMemoryEditor(entry)} waterMemory={waterMemory} deleteMemory={deleteMemory} visitMemory={visitMemory} /></Page>}
          {active === 'achievements' && <Page key="achievements"><Achievements mode={mode} achievements={achievements} /></Page>}
          {active === 'ask' && <Page key="ask"><AskEcho question={question} setQuestion={setQuestion} ask={runAsk} answer={answer} data={data} mode={mode} createReminder={createReminder} /></Page>}
          {active === 'connectors' && <Page key="connectors"><Connectors data={data} setImportModal={setImportModal} /></Page>}
          {active === 'settings' && <Page key="settings"><SettingsScreen data={data} update={update} mutate={mutate} exportData={exportData} importData={importData} clearDemo={clearDemo} clearAll={clearAll} /></Page>}
        </AnimatePresence>
      </main>

      <nav className="mobile-nav">{nav.slice(0, 5).map(({ key, Icon, label }) => <NavButton key={key} active={active === key} Icon={Icon} label={label.replace('Business ', '')} onClick={() => setActive(key)} compact />)}<NavButton active={false} Icon={MoreHorizontal} label="More" onClick={() => setActive('settings')} compact /></nav>
      <ImportModal open={importModal} close={() => setImportModal(false)} data={data} mutate={mutate} mode={mode} />
      <ResolutionPrompt candidate={resolutionCandidate} data={data} close={() => setResolutionCandidate(null)} resolveLoop={resolveLoop} />
      <ContextEditor key={contextEditor?.id || 'context-editor'} value={contextEditor} mode={mode} contexts={modeContexts} save={saveContext} close={() => setContextEditor(null)} />
      {memoryEditor && <MemoryEditor key={memoryEditor?.id || memoryEditor?.type || 'memory-editor'} value={memoryEditor} mode={mode} contexts={modeContexts} save={addMemory} close={() => setMemoryEditor(null)} />}
      <ActionPanel panel={actionPanel} setPanel={setActionPanel} data={data} createReminder={createReminder} createCalendar={createCalendar} updateStatus={updateStatus} />
      {toast && <motion.div className="toast" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{toast}</motion.div>}
      {celebration && <motion.div className="celebration" initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}><BadgeCheck />{celebration} unlocked</motion.div>}
    </div>
  )
}

const personalNav = [
  { key: 'today', Icon: Moon, label: 'Today' },
  { key: 'inbox', Icon: Inbox, label: 'Mind Inbox' },
  { key: 'email-threads', Icon: Mail, label: 'Email Threads' },
  { key: 'life-map', Icon: Map, label: 'Life Map' },
  { key: 'loose', Icon: Bell, label: 'Loose Ends' },
  { key: 'memory', Icon: Flower2, label: 'Memory Garden' },
  { key: 'achievements', Icon: BadgeCheck, label: 'Achievements' },
  { key: 'ask', Icon: Search, label: 'Ask Echo' },
  { key: 'connectors', Icon: Link2, label: 'Connectors' },
  { key: 'settings', Icon: Settings, label: 'Settings' },
]

const businessNav = [
  { key: 'business-home', Icon: BriefcaseBusiness, label: 'Business Home' },
  { key: 'business-inbox', Icon: Inbox, label: 'Business Inbox' },
  { key: 'email-threads', Icon: Mail, label: 'Email Threads' },
  { key: 'business-map', Icon: Map, label: 'Business Map' },
  { key: 'operations', Icon: Gauge, label: 'Operations' },
  { key: 'loose', Icon: Bell, label: 'Loose Ends' },
  { key: 'knowledge', Icon: BookOpen, label: 'Knowledge Garden' },
  { key: 'team', Icon: Network, label: 'Team' },
  { key: 'ask', Icon: Search, label: 'Ask Echo' },
  { key: 'connectors', Icon: Link2, label: 'Connectors' },
  { key: 'settings', Icon: Settings, label: 'Settings' },
]

function Brand() {
  return <div className="brand"><div className="orb"><span /></div><div><strong>Echo</strong><p>Context OS</p></div></div>
}

function ModeSwitch({ mode, setMode }) {
  return <div className="mode-switch"><button className={mode === 'personal' ? 'active' : ''} onClick={() => setMode('personal')}>Personal</button><button className={mode === 'business' ? 'active' : ''} onClick={() => setMode('business')}>Business</button></div>
}

function AboutCard({ onClose }) {
  return (
    <motion.section className="about-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <button className="plain-close" onClick={onClose} aria-label="Close About Echo"><X size={16} /></button>
      <strong>Chief of Staff Mode</strong>
      <p>Current productivity tools organize information. Echo organizes context.</p>
      <small>Your life is a network of people, memories, commitments, decisions, and unfinished loops.</small>
    </motion.section>
  )
}

function NavButton({ active, Icon, label, onClick, compact }) {
  return <button className={`nav-button ${active ? 'active' : ''} ${compact ? 'compact' : ''}`} onClick={onClick}><Icon size={20} /><span>{label}</span></button>
}

function Page({ children }) {
  return <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>{children}</motion.section>
}

function Today({ data, items, contexts, headerAction, setFocus, openAction, createReminder, updateStatus }) {
  const openItems = filteredByFocus(items.filter((entry) => entry.status !== 'completed'), data.focusContextId)
  const waiting = openItems.filter((entry) => entry.status === 'waiting')
  const whoIsWaiting = openItems.filter((entry) => entry.peopleIds.length && entry.status === 'open')
  const approaching = openItems.filter((entry) => entry.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline))
  const focusContext = contexts.find((entry) => entry.id === data.focusContextId)
  const topContexts = contexts.filter((entry) => !entry.parentContextId).slice(0, 8)
  const pastMemory = data.memories.find((entry) => entry.mode === 'personal')
  const reminders = data.reminders.filter((entry) => entry.mode === 'personal' || !entry.mode).slice(0, 4)
  return (
    <>
      <header className="hero-copy">
        <span className="eyebrow"><Sparkles size={16} />See your life. Remember what matters. Close the loops.</span>
        <h1>Good evening, {data.profileName}. Here is what may need your attention.</h1>
        <p>Echo connects conversations, people, memories, deadlines, and decisions into one living map of your context.</p>
        {headerAction}
      </header>
      <section className="focus-strip">
        <span>Focus Mode</span>
        <select value={data.focusContextId} onChange={(event) => setFocus(event.target.value)}>
          <option value="">All of life</option>
          {topContexts.map((entry) => <option key={entry.id} value={entry.id}>Focus on {entry.name}</option>)}
        </select>
        {focusContext && <small>{focusContext.name} is prioritized. Everything else is visually muted.</small>}
      </section>
      <section className="stat-grid">
        <Stat value={openItems.length} label="open commitments" />
        <Stat value={waiting.length} label="waiting loops" />
        <Stat value={approaching.length} label="upcoming deadlines" />
        <Stat value={contexts.filter((entry) => !entry.parentContextId).length} label="active life contexts" />
      </section>
      <VisualDashboard data={data} items={openItems} contexts={topContexts} />
      <TwoColumn>
        <Panel title="What needs you" icon={Moon}>
          {approaching.slice(0, 4).map((entry) => <Notice key={entry.id}>{entry.summary} · {deadlineLabel(entry.deadline)}</Notice>)}
          {!approaching.length && <p className="empty">No urgent deadlines. A rare quiet pocket.</p>}
        </Panel>
        <Panel title="Who is waiting" icon={Mail}>
          {whoIsWaiting.slice(0, 4).map((entry) => <Notice key={entry.id}>{names(data.people, entry.peopleIds).join(', ')} may be waiting: {entry.summary}</Notice>)}
          {!whoIsWaiting.length && <p className="empty">No one is visibly waiting on you.</p>}
        </Panel>
      </TwoColumn>
      <TwoColumn>
        <Panel title="Who you are waiting on" icon={Bell}>
          {waiting.slice(0, 4).map((entry) => <Notice key={entry.id}>{entry.waitingOn || names(data.people, entry.peopleIds).join(', ') || 'Someone'}: {entry.summary}</Notice>)}
          {!waiting.length && <p className="empty">No external blockers found.</p>}
        </Panel>
        <Panel title="Echo noticed" icon={Sparkles}>
          {detectLooseEnds(items).slice(0, 4).map((entry) => <Notice key={entry.id}>{entry.reason}: {entry.summary}</Notice>)}
        </Panel>
      </TwoColumn>
      <TwoColumn>
        <Panel title="Suggested Next Actions" icon={ChevronRight}>
          {openItems.slice(0, 3).map((entry) => <ActionCard key={entry.id} item={entry} data={data} openAction={openAction} createReminder={createReminder} updateStatus={updateStatus} />)}
        </Panel>
        <Panel title="Today Across My Life" icon={Network}>
          <div className="balance-grid">{topContexts.slice(0, 6).map((entry) => <Balance key={entry.id} contextItem={entry} count={items.filter((itemEntry) => itemEntry.contextIds.includes(entry.id) && itemEntry.status !== 'completed').length} muted={data.focusContextId && data.focusContextId !== entry.id} />)}</div>
        </Panel>
      </TwoColumn>
      <TwoColumn>
        <Panel title="Context Balance" icon={Gauge}>
          <p className="summary">Echo is tracking {contexts.length} personal contexts, {data.relationships.filter((entry) => contexts.some((ctx) => ctx.id === entry.sourceContextId)).length} relationships, and {data.people.length} people.</p>
        </Panel>
        <Panel title="In-App Reminders" icon={Bell}>
          {reminders.length ? reminders.map((entry) => <ReminderRow key={entry.id} reminder={entry} data={data} />) : <p className="empty">No reminders scheduled yet.</p>}
        </Panel>
      </TwoColumn>
      <TwoColumn>
        <Panel title="Memory From The Past" icon={Flower2}>
          {pastMemory ? <MemoryPlant memory={pastMemory} data={data} compact /> : <p className="empty">Plant your first memory in Memory Garden.</p>}
        </Panel>
        <Panel title="Privacy State" icon={Sparkles}>
          <p className="summary">AI Processing: {data.aiProvider === 'demo' ? 'Demo Intelligence' : data.aiProvider}. Local data stays in this browser unless you explicitly send selected content to a provider.</p>
        </Panel>
      </TwoColumn>
    </>
  )
}

function BusinessHome({ items, contexts, headerAction }) {
  const summaries = ['Operations', 'Customers', 'Team', 'Finance'].map((name) => {
    const ctx = contexts.find((entry) => entry.name === name)
    const count = ctx ? items.filter((entry) => entry.contextIds.includes(ctx.id) && entry.status !== 'completed').length : 0
    return { name, count }
  })
  return (
    <>
      <header className="hero-copy business-hero">
        <span className="eyebrow"><BriefcaseBusiness size={16} />See how your business actually works.</span>
        <h1>Your business runs through people, messages, and decisions. Echo keeps the context connected.</h1>
        <p>Business Mode reuses the same context engine for operations, customers, projects, team, vendors, and finance.</p>
        {headerAction}
      </header>
      <section className="stat-grid">{summaries.map((entry) => <Stat key={entry.name} value={entry.count} label={`${entry.name.toLowerCase()} active items`} />)}</section>
      <TwoColumn>
        <Panel title="Business Briefing" icon={Gauge}>{items.slice(0, 5).map((entry) => <Notice key={entry.id}>{entry.summary}</Notice>)}</Panel>
        <Panel title="Business Daily Brief" icon={Network}><p className="summary">Needs attention: {items.filter((entry) => entry.status === 'open').length}. Waiting on others: {items.filter((entry) => entry.status === 'waiting').length}. Upcoming deadlines: {items.filter((entry) => entry.deadline).length}.</p></Panel>
      </TwoColumn>
    </>
  )
}

function ReminderRow({ reminder, data }) {
  return <article className="reminder-row"><strong>{reminder.title}</strong><p>{deadlineLabel(reminder.date)} {reminder.time ? `at ${reminder.time}` : ''} · {reminder.deliveryChannel === 'whatsapp' ? 'Open WhatsApp to send' : 'In-App'} · {contextNames(data.contexts, reminder.contextIds || []).join(', ')}</p></article>
}

function VisualDashboard({ data, items, contexts }) {
  const featured = contexts.slice(0, 6)
  const loops = items.slice(0, 5)
  return (
    <section className="visual-dashboard">
      <div className="context-orbit">
        <div className="orbit-center"><div className="orb mini"><span /></div><strong>Echo</strong><small>Context connected</small></div>
        {featured.map((entry, index) => {
          const angle = (index / Math.max(featured.length, 1)) * Math.PI * 2
          const x = 50 + Math.cos(angle) * 35
          const y = 50 + Math.sin(angle) * 34
          const count = items.filter((itemEntry) => itemEntry.contextIds.includes(entry.id)).length
          return <div key={entry.id} className="orbit-node" style={{ left: `${x}%`, top: `${y}%`, '--context': entry.color }}><strong>{entry.name}</strong><span>{count} loops</span></div>
        })}
      </div>
      <div className="loop-lane">
        <div className="lane-header"><span>Open-loop resolution lane</span><strong>Capture {'->'} Understand {'->'} Act {'->'} Resolve</strong></div>
        {loops.length ? loops.map((entry) => <article key={entry.id} className="lane-item"><span>{entry.status}</span><strong>{entry.summary}</strong><small>{contextNames(data.contexts, entry.contextIds).join(', ')} · {deadlineLabel(entry.deadline)}</small></article>) : <p className="empty">Load demo data or import an email thread to see loops move through Echo.</p>}
      </div>
    </section>
  )
}

function EmailThreads({ mode, data, contexts, emailDraft, setEmailDraft, addEmailThread, analyzeThread }) {
  const threads = (data.emailThreads || []).filter((entry) => entry.mode === mode)
  const sample = 'From: Gregory\nTo: Vishnu\nSubject: TechX host proposal\n\nHi Vishnu,\nPlease send the final TechX host proposal before Friday.\nRegards,\nGregory'
  const pasteFromClipboard = async () => {
    try {
      const value = await navigator.clipboard?.readText()
      if (value) setEmailDraft((current) => current ? `${current}\n${value}` : value)
    } catch {
      setEmailDraft((current) => current || '')
    }
  }
  const importEmailFile = async (file) => {
    if (!file) return
    setEmailDraft(await file.text())
  }
  const saveThread = () => {
    if (!emailDraft.trim()) return
    const analyzed = analyzeEmailThread(emailDraft, data, mode)
    addEmailThread({
      id: analyzed.sourceId || uid('thread'),
      mode,
      subject: inferEmailSubject(emailDraft),
      rawText: emailDraft,
      participants: names(data.people, analyzed.peopleIds),
      contextId: analyzed.contextIds[0] || contexts[0]?.id || null,
      status: analyzed.status,
      latestDecision: analyzed.itemType === 'decision' ? analyzed.summary : '',
      suggestedNextAction: analyzed.summary || 'Review thread',
      createdAt: now(),
      updatedAt: now(),
    })
    setEmailDraft('')
  }
  return (
    <>
      <Header title="Email Threads" subtitle="No fake Gmail connection here: paste real emails, upload .eml/exported text, or load samples. Echo shows the thread and can convert it into an open loop." />
      <section className="email-import-panel">
        <textarea value={emailDraft} onPaste={(event) => setEmailDraft(event.clipboardData.getData('text') || emailDraft)} onChange={(event) => setEmailDraft(event.target.value)} placeholder="Paste an email thread here..." />
        <div className="button-row"><button className="primary" onClick={saveThread}><Mail size={18} />Add Thread</button><button onClick={pasteFromClipboard}><Clipboard size={16} />Paste from Clipboard</button><button onClick={() => setEmailDraft(sample)}>Load Gregory Sample</button><label className="file-button"><Upload size={16} />Import .eml / text<input type="file" accept=".eml,.txt,.md" onChange={(event) => importEmailFile(event.target.files?.[0])} /></label></div>
      </section>
      <section className="thread-grid">{threads.length ? threads.map((thread) => <EmailThreadCard key={thread.id} thread={thread} data={data} analyzeThread={analyzeThread} />) : <p className="empty">No email threads yet. Add one above to see how Echo reasons about it.</p>}</section>
    </>
  )
}

function EmailThreadCard({ thread, data, analyzeThread }) {
  const contextName = contextNames(data.contexts, [thread.contextId]).join(', ') || 'Unsorted'
  return (
    <article className="thread-card">
      <div><span className={`status-pill ${thread.status === 'waiting' ? 'demo' : 'connected'}`}>{thread.status}</span><strong>{thread.subject}</strong></div>
      <p>{thread.rawText}</p>
      <div className="memory-meta"><span>{contextName}</span><span>{thread.participants.join(', ') || 'No participants detected'}</span><span>{format(parseISO(thread.createdAt), 'MMM d')}</span></div>
      <div className="button-row"><button onClick={() => analyzeThread(thread)}><Sparkles size={16} />Analyze into Echo</button><button onClick={() => navigator.clipboard?.writeText(thread.rawText)}><Clipboard size={16} />Copy Source</button></div>
    </article>
  )
}

function BusinessSection({ section, contextId, data, items, contexts, openAction, createReminder, updateStatus }) {
  const contextItem = contexts.find((entry) => entry.id === contextId)
  const sectionItems = items.filter((entry) => entry.contextIds.includes(contextId))
  const open = sectionItems.filter((entry) => entry.status === 'open')
  const waiting = sectionItems.filter((entry) => entry.status === 'waiting')
  const decisions = sectionItems.filter((entry) => entry.itemType === 'decision' || entry.decision)
  const people = [...new Set(sectionItems.flatMap((entry) => names(data.people, entry.peopleIds)))]
  const reminders = data.reminders.filter((entry) => entry.mode === 'business' && entry.contextIds?.includes(contextId)).slice(0, 4)
  return (
    <>
      <Header title={section} subtitle={contextItem?.description || 'Focused business context, without duplicating the full Business Map.'} />
      <section className="stat-grid">
        <Stat value={open.length} label="needs attention" />
        <Stat value={waiting.length} label="waiting on others" />
        <Stat value={decisions.length} label="decisions tracked" />
        <Stat value={people.length} label="people involved" />
      </section>
      <TwoColumn>
        <Panel title={`${section} Open Loops`} icon={Bell}>
          {sectionItems.length ? sectionItems.map((entry) => <ActionCard key={entry.id} item={entry} data={data} openAction={openAction} createReminder={createReminder} updateStatus={updateStatus} />) : <p className="empty">No {section.toLowerCase()} items yet. Capture an update in Business Inbox.</p>}
        </Panel>
        <Panel title="Owners and Blockers" icon={Network}>
          {waiting.length ? waiting.map((entry) => <Notice key={entry.id}>{entry.waitingOn || names(data.people, entry.peopleIds).join(', ') || 'Someone'} is blocking: {entry.summary}</Notice>) : <p className="empty">No blockers detected in {section}.</p>}
          <div className="suggested-list">{people.length ? people.map((personName) => <span key={personName}>{personName}</span>) : <span>No owners attached yet</span>}</div>
        </Panel>
      </TwoColumn>
      <TwoColumn>
        <Panel title="Recent Decisions" icon={Archive}>
          {decisions.length ? decisions.map((entry) => <Notice key={entry.id}>{entry.decision || entry.summary}</Notice>) : <p className="empty">No decisions recorded here yet.</p>}
        </Panel>
        <Panel title="Section Reminders" icon={CalendarPlus}>
          {reminders.length ? reminders.map((entry) => <ReminderRow key={entry.id} reminder={entry} data={data} />) : <p className="empty">No reminders scheduled for {section}.</p>}
        </Panel>
      </TwoColumn>
    </>
  )
}

function MindInbox({ mode, capture, setCapture, captureType, setCaptureType, submitCapture, draftItem, setDraftItem, saveDraft, contexts, people }) {
  const examples = mode === 'personal'
    ? ['Hi Vishnu,\nPlease send the final TechX host proposal before Friday.\nRegards,\nGregory', 'Anand said he will confirm TechX funding Monday.', 'Anand confirmed funding.', 'Gregory Friday-nu munpe TechX proposal ayakkan paranju.']
    : ['Client wants the website updated by Friday. Rahul will finish frontend and Anu will deploy.', 'Large orders require 50% advance payment.', 'Operations team is waiting for inventory confirmation before dispatch.']
  const importInboxFile = async (file) => {
    if (!file) return
    const text = await file.text()
    setCapture(text)
    setCaptureType(file.name.endsWith('.eml') ? 'email' : 'import')
  }
  return (
    <>
      <Header title={mode === 'personal' ? 'Smart Inbox' : 'Business Smart Inbox'} subtitle="Paste email, notes, meeting outcomes, WhatsApp exports, or files. Echo turns them into context, open loops, and suggested actions." />
      <section className="capture-box">
        <div className="chips">{['email', 'conversation', 'meeting', 'thought', 'personal', 'import'].map((type) => <button key={type} className={captureType === type ? 'chip active' : 'chip'} onClick={() => setCaptureType(type)}>{type === 'email' ? 'Email Thread' : type}</button>)}</div>
        <textarea value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="Capture -> Understand -> Connect -> Visualize -> Remember -> Act" />
        <div className="example-row">{examples.map((example) => <button key={example} onClick={() => setCapture(example)}>{example}</button>)}</div>
        <div className="button-row"><button className="primary" onClick={submitCapture}><Send size={18} />Understand this</button><label className="file-button"><Upload size={16} />Import Email / Notes<input type="file" accept=".eml,.txt,.md,.json" onChange={(event) => importInboxFile(event.target.files?.[0])} /></label></div>
      </section>
      {draftItem && <Confirmation item={draftItem} setItem={setDraftItem} saveDraft={saveDraft} contexts={contexts} people={people} />}
    </>
  )
}

function Confirmation({ item, setItem, saveDraft, contexts }) {
  const update = (field, value) => setItem({ ...item, [field]: value })
  return (
    <motion.section className="confirmation" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <Header title="Echo understood this" subtitle="Review the structured memory before it joins your context graph." />
      {item.processingError && <p className="form-error">{item.processingError}</p>}
      <div className="form-grid">
        <Label label="Summary"><input value={item.summary} onChange={(e) => update('summary', e.target.value)} /></Label>
        <Label label="Context"><select value={item.contextIds[0] || ''} onChange={(e) => update('contextIds', [e.target.value])}>{contexts.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Label>
        <Label label="Deadline"><input type="date" value={item.deadline || ''} onChange={(e) => update('deadline', e.target.value || null)} /></Label>
        <Label label="Action"><input value={item.action || ''} onChange={(e) => update('action', e.target.value)} /></Label>
        <Label label="Waiting on"><input value={item.waitingOn || ''} onChange={(e) => update('waitingOn', e.target.value || null)} /></Label>
        <Label label="Promised to"><input value={item.promisedTo || ''} onChange={(e) => update('promisedTo', e.target.value || null)} /></Label>
        <Label label="Priority"><select value={item.priority} onChange={(e) => update('priority', e.target.value)}><option>low</option><option>medium</option><option>high</option></select></Label>
        <Label label="Status"><select value={item.status} onChange={(e) => update('status', e.target.value)}><option>open</option><option>completed</option><option>waiting</option><option>snoozed</option></select></Label>
      </div>
      <p className="summary">Confidence: {Math.round((item.confidence || 0.72) * 100)}% · Source: {item.sourceType}</p>
      <div className="suggested-list">{item.suggestedActions.map((action) => <span key={action}>{action.replaceAll('_', ' ')}</span>)}</div>
      <button className="primary" onClick={saveDraft}><Check size={18} />Save to Echo</button>
    </motion.section>
  )
}

function LifeMap({ data, mode, contexts, items, selected, setSelectedContextId, mapView, setMapView, openContextEditor, archiveContext, deleteContext, openAction, createReminder }) {
  const [expanded, setExpanded] = useState(() => new Set(contexts.filter((entry) => !entry.parentContextId).map((entry) => entry.id)))
  const graph = useMemo(() => buildGraph(contexts, items, mode, expanded), [contexts, items, mode, expanded])
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges)
  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
  }, [graph, setNodes, setEdges])
  const onNodeClick = useCallback((_, node) => {
    if (node.id === 'center') return
    setSelectedContextId(node.id)
    setExpanded((current) => {
      const next = new Set(current)
      next.has(node.id) ? next.delete(node.id) : next.add(node.id)
      return next
    })
  }, [setSelectedContextId])
  return (
    <>
      <Header title={mode === 'personal' ? 'Life Map' : 'Business Map'} subtitle={mode === 'personal' ? 'Your life is not a list of tasks. It is a living network.' : 'A structured map of processes, owners, customers, and decisions.'} />
      <div className="view-toggle"><button className={mapView === 'map' ? 'active' : ''} onClick={() => setMapView('map')}>Life Map</button><button className={mapView === 'list' ? 'active' : ''} onClick={() => setMapView('list')}>List View</button><button onClick={() => openContextEditor(newContext(mode))}><Plus size={16} />New Context</button></div>
      {mapView === 'map' ? (
        <section className="map-shell">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick} nodeTypes={{ echo: EchoNode }} fitView>
            <Background color="#d8cfc0" gap={20} />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
          <ContextDrawer data={data} contextItem={selected} items={items} contexts={contexts} openContextEditor={openContextEditor} archiveContext={archiveContext} deleteContext={deleteContext} openAction={openAction} createReminder={createReminder} />
        </section>
      ) : (
        <section className="context-grid">{contexts.map((entry) => <button key={entry.id} className="context-card" style={{ '--context': entry.color }} onClick={() => setSelectedContextId(entry.id)}><span>{entry.name}</span><strong>{items.filter((itemEntry) => itemEntry.contextIds.includes(entry.id)).length}</strong><small>{entry.description}</small></button>)}</section>
      )}
    </>
  )
}

function EchoNode({ data }) {
  const Icon = data.iconMap[data.icon] || Sparkles
  return (
    <div className={`flow-node ${data.status}`} style={{ '--node': data.color }}>
      <Handle type="target" position={Position.Top} />
      <Icon size={17} />
      <strong>{data.label}</strong>
      <small>{data.count} open</small>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function ContextDrawer({ data, contextItem, items, contexts, openContextEditor, archiveContext, deleteContext, openAction, createReminder }) {
  if (!contextItem) return null
  const contextItems = items.filter((entry) => entry.contextIds.includes(contextItem.id))
  const peopleNames = names(data.people, [...new Set(contextItems.flatMap((entry) => entry.peopleIds))])
  const connected = data.relationships.filter((rel) => rel.sourceContextId === contextItem.id || rel.targetContextId === contextItem.id).map((rel) => contexts.find((ctx) => ctx.id === (rel.sourceContextId === contextItem.id ? rel.targetContextId : rel.sourceContextId))?.name).filter(Boolean)
  return (
    <aside className="context-drawer">
      <div className="drawer-top"><h2>{contextItem.name}</h2><button onClick={() => openContextEditor(contextItem)}><Settings size={16} />Edit</button></div>
      <p>{contextItem.description}</p>
      <div className="drawer-stats"><Stat value={contextItems.filter((entry) => entry.status !== 'completed').length} label="active items" /><Stat value={contextItems.filter((entry) => entry.deadline).length} label="deadlines" /><Stat value={peopleNames.length} label="people involved" /></div>
      <p className="summary">{summarizeContext(contextItem, contextItems, peopleNames)}</p>
      <h3>Connected to</h3><div className="suggested-list">{connected.length ? connected.map((entry) => <span key={entry}>{entry}</span>) : <span>No explicit links yet</span>}</div>
      <h3>Recent memories</h3><div className="memory-list">{contextItems.slice(0, 4).map((entry) => <Memory key={entry.id} item={entry} data={data} openAction={openAction} createReminder={createReminder} />)}</div>
      <div className="button-row"><button className="secondary" onClick={() => archiveContext(contextItem.id)}><Archive size={16} />Archive Context</button><button className="danger" onClick={() => deleteContext(contextItem.id)}><Trash2 size={16} />Delete Context</button></div>
    </aside>
  )
}

function LooseEnds({ data, items, openAction, createReminder, updateStatus, deleteTask }) {
  const loose = detectLooseEnds(items)
  const sections = [
    ['I owe someone', loose.filter((entry) => entry.itemType === 'promise' || entry.promisedTo || (entry.peopleIds.length && entry.status === 'open'))],
    ['Someone owes me', loose.filter((entry) => entry.status === 'waiting' || entry.waitingOn)],
    ['I owe myself', loose.filter((entry) => !entry.peopleIds.length && entry.status === 'open' && entry.itemType === 'task')],
    ['Unresolved decision', loose.filter((entry) => entry.itemType === 'decision')],
    ['Deadline approaching', loose.filter((entry) => entry.deadline)],
    ['Needs response', loose.filter((entry) => entry.sourceType === 'email' && entry.status === 'open')],
  ]
  return (
    <>
      <Header title="Open Loops" subtitle="Echo turns scattered requests, waiting states, and unresolved decisions into visible loops you can close." />
      <div className="loose-stack">{sections.map(([title, list]) => <Panel key={title} title={title} icon={Archive}>{list.length ? list.map((entry) => <LooseCard key={entry.id} item={entry} data={data} openAction={openAction} createReminder={createReminder} updateStatus={updateStatus} deleteTask={deleteTask} />) : <p className="empty">Nothing here right now.</p>}</Panel>)}</div>
    </>
  )
}

function MemoryGarden({ mode, data, contexts, addMemory, editMemory, waterMemory, deleteMemory, visitMemory }) {
  const contextIdsKey = contexts.map((entry) => entry.id).join('|')
  const memories = useMemo(() => {
    const allowedContextIds = new Set(contextIdsKey.split('|').filter(Boolean))
    return data.memories.filter((entry) => entry.mode === mode && (!entry.contextId || allowedContextIds.has(entry.contextId)))
  }, [data.memories, mode, contextIdsKey])
  const [rediscovered, setRediscovered] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [images, setImages] = useState({})
  const title = mode === 'personal' ? 'Memory Garden' : 'Knowledge Garden'
  useEffect(() => {
    let cancelled = false
    Promise.all(memories.map(async (entry) => {
      if (entry.imageDataUrl) return [entry.id, entry.imageDataUrl]
      if (!entry.imageStorageKey) return [entry.id, null]
      try {
        return [entry.id, await getMemoryImage(entry.imageStorageKey)]
      } catch {
        return [entry.id, null]
      }
    })).then((pairs) => {
      if (cancelled) return
      setImages(Object.fromEntries(pairs.filter(([, dataUrl]) => dataUrl)))
    })
    return () => {
      cancelled = true
    }
  }, [memories])
  const openMemory = (entry) => {
    setSelectedId(entry.id)
    visitMemory(entry.id)
  }
  const selected = memories.find((entry) => entry.id === selectedId) || null
  const rediscover = () => {
    const sorted = [...memories].sort((a, b) => new Date(a.lastVisitedAt || a.createdAt) - new Date(b.lastVisitedAt || b.createdAt))
    const picked = sorted[0]
    setRediscovered(picked || null)
    if (picked) openMemory(picked)
  }
  return (
    <>
      <Header title={title} subtitle={mode === 'personal' ? 'Meaningful memories live here as seeds, sprouts, and blooms.' : 'SOPs, decisions, lessons, and rules become business knowledge.'} />
      <div className="top-actions"><button className="primary" onClick={addMemory}><Plus size={18} />Plant a {mode === 'personal' ? 'Memory' : 'Knowledge'}</button><button className="secondary" onClick={rediscover}><RefreshCw size={18} />Rediscover a Memory</button></div>
      {rediscovered && <Notice>You planted this {differenceInMonths(new Date(), parseISO(rediscovered.createdAt)) || 1} months ago: {rediscovered.title}</Notice>}
      <section className="garden-canvas">
        {memories.length ? memories.map((entry, index) => <MemoryPlant key={entry.id} memory={entry} data={data} image={images[entry.id]} index={index} onOpen={() => openMemory(entry)} />) : <p className="empty">No plants yet. Add one memory and this garden starts breathing.</p>}
      </section>
      {mode === 'personal' && <PhotoJourneys data={data} images={images} />}
      <MemoryDrawer memoryValue={selected} image={selected ? images[selected.id] : null} data={data} close={() => setSelectedId(null)} editMemory={editMemory} waterMemory={waterMemory} deleteMemory={deleteMemory} />
    </>
  )
}

function PhotoJourneys({ data, images }) {
  const journey = data.journeys?.find((entry) => entry.mode === 'personal')
  const [activeStop, setActiveStop] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState(journey?.audioDataUrl || '')
  const audioRef = useRef(null)
  if (!journey) return null
  const stops = journey.stops || []
  const progress = stops.length > 1 ? (activeStop / (stops.length - 1)) * 100 : 0
  const memoryImage = images[journey.memoryIds?.[activeStop]]
  const toggle = () => {
    setPlaying((current) => !current)
    if (audioRef.current) {
      playing ? audioRef.current.pause() : audioRef.current.play().catch(() => {})
    }
  }
  const importAudio = async (file) => {
    if (!file) return
    setAudioUrl(await fileToDataUrl(file))
  }
  return (
    <section className="journey-panel">
      <Header title="Photo Journeys" subtitle="A symbolic memory road through moments, photos, captions, and music." />
      <div className="journey-stage">
        <div className="journey-road"><motion.div className="journey-car" animate={{ left: `${progress}%` }} transition={{ duration: 0.5 }}><span /></motion.div>{stops.map((stop, index) => <button key={stop.id} className={`journey-stop ${activeStop === index ? 'active' : ''}`} style={{ left: `${stops.length > 1 ? (index / (stops.length - 1)) * 100 : 50}%` }} onClick={() => setActiveStop(index)}><span /></button>)}</div>
        <article className="journey-card">
          {memoryImage ? <img src={memoryImage} alt="" /> : <div className="journey-placeholder"><Map /><span>{journey.title}</span></div>}
          <div><strong>{stops[activeStop]?.title}</strong><p>{stops[activeStop]?.caption}</p><small>{stops[activeStop]?.location} · {stops[activeStop]?.date}</small></div>
        </article>
        <div className="button-row"><button onClick={() => setActiveStop((activeStop + 1) % stops.length)}><ChevronRight size={16} />Next stop</button><button onClick={toggle}>{playing ? 'Pause Music' : 'Play Music'}</button><label className="file-button">Add Music<input type="file" accept="audio/*" onChange={(event) => importAudio(event.target.files?.[0])} /></label></div>
        {audioUrl && <audio ref={audioRef} src={audioUrl} controls />}
      </div>
    </section>
  )
}

function Achievements({ mode, achievements }) {
  const list = achievements.filter((entry) => entry.mode === mode)
  return (
    <>
      <Header title={mode === 'personal' ? 'Achievements' : 'Business Milestones'} subtitle={mode === 'personal' ? 'Progress rewards without turning your life into a game.' : 'Professional milestones for reducing context loss.'} />
      <section className="achievement-grid">{list.map((entry) => <article key={entry.id} className={`achievement ${entry.unlocked ? 'unlocked' : ''}`}><BadgeCheck /><strong>{entry.name}</strong><p>{entry.description}</p><progress value={entry.progress} max={entry.goal} /><small>{Math.min(entry.progress, entry.goal)} / {entry.goal}</small></article>)}</section>
    </>
  )
}

function AskEcho({ question, setQuestion, ask, answer, data, mode, createReminder }) {
  const [scope, setScope] = useState('everything')
  const supporting = answer ? data.items.filter((entry) => answer.relevantItemIds.includes(entry.id)) : []
  return (
    <>
      <Header title="Ask across everything you are managing." subtitle="Search personal and business context, source memories, people, decisions, and deadlines." />
      <div className="scope-row">{['everything', 'current context', 'personal', 'business'].map((entry) => <button key={entry} className={scope === entry ? 'active' : ''} onClick={() => setScope(entry)}>Ask {entry}</button>)}</div>
      <section className="ask-box"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={mode === 'personal' ? 'What am I waiting for Anand to confirm?' : 'Who owns deployment?'} /><button className="primary" onClick={ask}><Search size={18} />Ask Echo</button></section>
      {answer && <Panel title="Echo says" icon={Sparkles}><p className="answer">{answer.answer}</p>{answer.suggestedNextAction && <p className="summary">{answer.suggestedNextAction}</p>}<div className="memory-list">{supporting.map((entry) => <Memory key={entry.id} item={entry} data={data} createReminder={createReminder} />)}</div></Panel>}
    </>
  )
}

function Connectors({ data, setImportModal }) {
  const groups = [
    ['Connected', data.connectors.filter((entry) => entry.status === 'connected')],
    ['Import-Based', data.connectors.filter((entry) => ['manual', 'local-files', 'email-import', 'whatsapp', 'keep'].includes(entry.id) && entry.status !== 'connected')],
    ['Coming Later', data.connectors.filter((entry) => entry.status === 'coming_soon' && !['manual', 'local-files', 'email-import', 'whatsapp', 'keep'].includes(entry.id))],
  ]
  return (
    <>
      <Header title="Connectors" subtitle="Echo only marks integrations connected when they actually work in this app. Everything else is import-based or future OAuth work." />
      {groups.map(([title, connectors]) => connectors.length > 0 && <section key={title} className="connector-section"><h2>{title}</h2><div className="connector-grid">{connectors.map((entry) => <article key={entry.id} className="connector-card"><div><strong>{entry.name}</strong><Status status={entry.status} /></div><p>{entry.description}</p>{['manual', 'local-files', 'email-import', 'whatsapp', 'keep'].includes(entry.id) ? <button className="secondary" onClick={() => setImportModal(true)}><Upload size={16} />Import</button> : <button className="secondary" disabled>OAuth integration required</button>}</article>)}</div></section>)}
    </>
  )
}

function SettingsScreen({ data, update, mutate, exportData, importData, clearDemo, clearAll }) {
  const [ollamaStatus, setOllamaStatus] = useState('')
  const [models, setModels] = useState([])
  const checkOllama = async () => {
    try {
      const res = await fetch('http://localhost:11434/api/tags')
      const json = await res.json()
      setModels(json.models?.map((entry) => entry.name) || [])
      setOllamaStatus('Ollama connected.')
    } catch {
      update({ aiProvider: 'demo' })
      setOllamaStatus('Local AI unavailable. Echo is using demo intelligence.')
    }
  }
  return (
    <>
      <Header title="Settings" subtitle="Your Context, Your Control" />
      <section className="settings-grid">
        <Panel title="Profile" icon={Settings}><Label label="Name"><input value={data.profileName} onChange={(e) => update({ profileName: e.target.value })} /></Label></Panel>
        <Panel title="AI Engine" icon={Sparkles}>
          <div className="chips">{['demo', 'ollama', 'openai'].map((provider) => <button key={provider} className={data.aiProvider === provider ? 'chip active' : 'chip'} onClick={() => update({ aiProvider: provider })}>{provider === 'demo' ? 'Demo AI' : provider === 'ollama' ? 'Local AI with Ollama' : 'OpenAI'}</button>)}</div>
          <button className="secondary" onClick={checkOllama}><RefreshCw size={16} />Check Ollama connection</button>
          {ollamaStatus && <p className="summary">{ollamaStatus}</p>}
          {models.length > 0 && <Label label="Installed model"><select value={data.ollamaModel} onChange={(e) => update({ ollamaModel: e.target.value })}>{models.map((model) => <option key={model}>{model}</option>)}</select></Label>}
          <div className="usage-panel"><strong>AI usage this session</strong><p>Provider: {data.aiProvider}</p><p>Calls: {data.aiUsage?.callsThisSession || 0}</p><p>Last analysis: {data.aiUsage?.lastAnalysisAt ? format(parseISO(data.aiUsage.lastAnalysisAt), 'PPp') : 'Not yet'}</p></div>
          <p className="privacy">Your data stays in your browser in Demo Mode. When Ollama is selected, AI processing uses your local model if available. With cloud AI, selected content may be sent to the configured provider.</p>
        </Panel>
        <Panel title="WhatsApp Reminders" icon={Bell}>
          <p className="summary">Automatic WhatsApp sending is not configured. Echo can prepare a message and open WhatsApp for manual send.</p>
          <div className="form-grid">
            <Label label="Country code"><input value={data.whatsappSettings?.countryCode || ''} onChange={(e) => update({ whatsappSettings: { ...data.whatsappSettings, countryCode: e.target.value } })} /></Label>
            <Label label="Phone number"><input value={data.whatsappSettings?.phoneNumber || ''} onChange={(e) => update({ whatsappSettings: { ...data.whatsappSettings, phoneNumber: e.target.value } })} /></Label>
            <Label label="Preferred reminder time"><input type="time" value={data.whatsappSettings?.preferredReminderTime || '18:00'} onChange={(e) => update({ whatsappSettings: { ...data.whatsappSettings, preferredReminderTime: e.target.value } })} /></Label>
            <Label label="Status"><input value={data.whatsappSettings?.status === 'manual_send' ? 'Manual Send' : 'Not Configured'} readOnly /></Label>
          </div>
        </Panel>
        <Panel title="Data" icon={Download}>
          <div className="button-row"><button onClick={exportData}><Download size={16} />Export Echo Data</button><label className="file-button"><Upload size={16} />Import Echo Data<input type="file" accept="application/json" onChange={(e) => importData(e.target.files?.[0])} /></label><button onClick={() => clearDemo('personal')}><Trash2 size={16} />Clear Personal Demo</button><button onClick={() => clearDemo('business')}><Trash2 size={16} />Clear Business Demo</button><button className="danger" onClick={clearAll}><Trash2 size={16} />Clear All Local Data</button></div>
        </Panel>
        <Panel title="Personal Automations" icon={Bell}>
          {data.automations.map((entry) => <label key={entry.id} className="toggle-row"><input type="checkbox" checked={entry.enabled} onChange={() => mutate((current) => ({ ...current, automations: current.automations.map((auto) => auto.id === entry.id ? { ...auto, enabled: !auto.enabled } : auto) }))} /><span>{entry.rule}</span></label>)}
        </Panel>
      </section>
    </>
  )
}

function ImportModal({ open, close, data, mutate, mode }) {
  const [kind, setKind] = useState('Paste Text')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  if (!open) return null
  const analyze = async () => setPreview(await extractContext(text, data, mode, kind))
  const importFile = async (file) => {
    if (!file) return
    const fileText = await file.text()
    setText(fileText)
    setPreview(await extractContext(fileText, data, mode, file.name.endsWith('.json') ? 'Import JSON' : 'Upload File'))
  }
  const confirm = () => {
    mutate((current) => mergeImport(current, preview, mode, kind, text))
    close()
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <motion.div className="modal import-modal" onClick={(event) => event.stopPropagation()} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="icon-close" onClick={close}>x</button>
        <Header title="Add My Context" subtitle="Paste notes, import JSON, or upload TXT, MD, JSON, or WhatsApp exports." />
        <div className="chips">{['Paste Text', 'Upload File', 'Paste Notes', 'Import JSON', 'Connect Source'].map((entry) => <button key={entry} className={kind === entry ? 'chip active' : 'chip'} onClick={() => setKind(entry)}>{entry}</button>)}</div>
        {kind === 'Upload File' || kind === 'Import JSON' ? <label className="upload-zone"><Upload />Upload EML, TXT, MD, JSON, or WhatsApp export<input type="file" accept=".eml,.txt,.md,.json" onChange={(e) => importFile(e.target.files?.[0])} /></label> : <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="I am the chair of IEEE TechX. Gregory handles proposals. Anand is coordinating funding. Host applications close on August 7..." />}
        <button className="primary" onClick={analyze}><Sparkles size={18} />Analyze Context</button>
        {preview && <ImportPreview preview={preview} confirm={confirm} />}
      </motion.div>
    </div>
  )
}

function ImportPreview({ preview, confirm }) {
  return (
    <section className="import-preview">
      <Header title="Echo found these contexts" subtitle="Review the map before adding it to Echo." />
      <div className="preview-grid">
        <PreviewList title="Contexts" items={preview.contexts.map((entry) => entry.name)} />
        <PreviewList title="People" items={preview.people.map((entry) => entry.name)} />
        <PreviewList title="Deadlines" items={preview.items.filter((entry) => entry.deadline).map((entry) => `${entry.summary} · ${deadlineLabel(entry.deadline)}`)} />
        <PreviewList title="Tasks and Memories" items={preview.items.map((entry) => entry.summary)} />
      </div>
      <button className="primary" onClick={confirm}><Plus size={18} />Add to My Life</button>
    </section>
  )
}

function ResolutionPrompt({ candidate, data, close, resolveLoop }) {
  if (!candidate) return null
  return (
    <div className="modal-backdrop" onClick={close}>
      <motion.div className="modal resolution-modal" onClick={(event) => event.stopPropagation()} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="icon-close" onClick={close}>x</button>
        <Header title="Echo noticed this may close a loop" subtitle="New information appears to resolve an older waiting item. You stay in control." />
        <article className="resolution-card">
          <span>New evidence</span>
          <strong>{candidate.newItem.rawText}</strong>
        </article>
        <article className="resolution-card">
          <span>Possible loop to close</span>
          <strong>{candidate.oldItem.summary}</strong>
          <p>{contextNames(data.contexts, candidate.oldItem.contextIds).join(', ')} · {names(data.people, candidate.oldItem.peopleIds).join(', ') || candidate.oldItem.waitingOn || 'No person'}</p>
        </article>
        <div className="button-row"><button className="primary" onClick={() => resolveLoop(candidate.oldItem.id)}><Check size={16} />Close Loop</button><button onClick={close}>Keep Open</button></div>
      </motion.div>
    </div>
  )
}

function ContextEditor({ value, mode, contexts, save, close }) {
  const [draft, setDraft] = useState(value)
  if (!draft) return null
  return (
    <div className="modal-backdrop" onClick={close}>
      <motion.div className="modal" onClick={(event) => event.stopPropagation()} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="icon-close" onClick={close}>x</button>
        <Header title={draft.id ? 'Edit Context' : 'Create Context'} subtitle="Contexts can be renamed, colored, nested, and archived." />
        <div className="form-grid">
          <Label label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Label>
          <Label label="Parent context"><select value={draft.parentContextId || ''} onChange={(e) => setDraft({ ...draft, parentContextId: e.target.value || null })}><option value="">Primary context</option>{contexts.filter((entry) => entry.id !== draft.id).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Label>
          <Label label="Icon"><select value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })}>{iconChoices.map((entry) => <option key={entry}>{entry}</option>)}</select></Label>
          <Label label="Color"><div className="swatches">{colorChoices.map((color) => <button key={color.value} title={color.name} aria-label={color.name} className={draft.color === color.value ? 'selected' : ''} style={{ background: color.value }} onClick={() => setDraft({ ...draft, color: color.value })} />)}</div></Label>
        </div>
        <Label label="Description"><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Label>
        <button className="primary" onClick={() => save({ ...draft, id: draft.id || uid('ctx'), mode, type: draft.parentContextId ? 'sub_context' : 'primary', archived: false, createdAt: draft.createdAt || now() })}><Check size={18} />Save Context</button>
      </motion.div>
    </div>
  )
}

function MemoryEditor({ value, mode, contexts, save, close }) {
  const initialDraft = () => {
    if (value?.id) return value
    const savedDraft = localStorage.getItem(STORE.memoryDraft)
    if (savedDraft && window.confirm('Resume your unfinished memory?')) {
      try {
        return JSON.parse(savedDraft)
      } catch {
        localStorage.removeItem(STORE.memoryDraft)
      }
    } else if (savedDraft) {
      localStorage.removeItem(STORE.memoryDraft)
    }
    return memory(uid('mem'), mode, '', '', format(new Date(), 'yyyy-MM-dd'), contexts[0]?.id || null, [], '', [], 0)
  }
  const [draft, setDraft] = useState(initialDraft)
  const [imageError, setImageError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (draft.imageStorageKey && !draft.imageDataUrl) {
      getMemoryImage(draft.imageStorageKey)
        .then((dataUrl) => dataUrl && setDraft((current) => ({ ...current, imageDataUrl: dataUrl })))
        .catch(() => {})
    }
  }, [draft.imageStorageKey, draft.imageDataUrl])
  if (!value) return null
  const updateDraft = (patch) => {
    const next = { ...draft, ...patch, updatedAt: now() }
    setDraft(next)
    localStorage.setItem(STORE.memoryDraft, JSON.stringify(next))
  }
  const setPhoto = async (file) => {
    const result = await prepareMemoryImage(file)
    setImageError(result.error)
    if (result.dataUrl) updateDraft({ imageDataUrl: result.dataUrl, imageStorageKey: null })
  }
  const closeSafely = () => {
    if ((draft.title || draft.description || draft.imageDataUrl) && !window.confirm('Keep this unfinished memory draft for later? Choose Cancel to continue editing.')) return
    close()
  }
  const saveMemory = async () => {
    setSaving(true)
    await save({ ...draft, title: draft.title || (mode === 'personal' ? 'Untitled memory' : 'Untitled knowledge'), mode, growthStage: growthStage(draft.waterCount), updatedAt: now() })
    setSaving(false)
  }
  return (
    <div className="modal-backdrop" onClick={closeSafely}>
      <motion.div className="modal" onClick={(event) => event.stopPropagation()} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="icon-close" onClick={closeSafely}>x</button>
        <Header title={`${value?.id ? 'Edit' : 'Add'} ${mode === 'personal' ? 'Memory' : 'Knowledge'}`} subtitle="Photos are saved persistently in your browser using IndexedDB, with local fallback if needed." />
        <div className="form-grid">
          <Label label="Photo"><div className="photo-picker">{draft.imageDataUrl ? <img src={draft.imageDataUrl} alt="Memory preview" /> : <span><Upload />Upload JPG, PNG, or WebP</span>}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0])} /></div>{draft.imageDataUrl && <button className="secondary" onClick={() => updateDraft({ imageDataUrl: null, imageStorageKey: null })}>Remove image</button>}{imageError && <p className="form-error">{imageError}</p>}</Label>
          <Label label="Title"><input value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} /></Label>
          <Label label="Date"><input type="date" value={draft.date} onChange={(e) => updateDraft({ date: e.target.value })} /></Label>
          <Label label="Context"><select value={draft.contextId || ''} onChange={(e) => updateDraft({ contextId: e.target.value || null })}><option value="">No context</option>{contexts.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Label>
          <Label label="Mood"><input value={draft.mood} onChange={(e) => updateDraft({ mood: e.target.value })} /></Label>
          <Label label="People"><ChipInput values={draft.people} onChange={(people) => updateDraft({ people })} placeholder="Type a name and press Enter" /></Label>
          <Label label="Tags"><ChipInput values={draft.tags} onChange={(tags) => updateDraft({ tags })} placeholder="Type a tag and press Enter" /></Label>
        </div>
        <Label label="Description"><textarea value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} /></Label>
        <button className="primary" onClick={saveMemory} disabled={saving}><Leaf size={18} />{saving ? 'Saving...' : 'Save'}</button>
      </motion.div>
    </div>
  )
}

function ActionPanel({ panel, setPanel, data, createReminder, createCalendar, updateStatus }) {
  if (!panel) return null
  const { type = 'draft_email', item: targetItem } = panel
  const recipient = names(data.people, targetItem.peopleIds)[0] || 'there'
  const draft = `Hi ${recipient},\n\nI'm following up on ${targetItem.summary.toLowerCase()}. Please let me know if any additional details are required.\n\nBest,\nVishnu`
  const whatsapp = type === 'whatsapp_reminder' ? buildReminderMessage(targetItem, data) : `Hi ${recipient}, ${targetItem.summary}. Please let me know if anything else is needed.`
  const phone = `${data.whatsappSettings?.countryCode || ''}${data.whatsappSettings?.phoneNumber || ''}`.replace(/\D/g, '')
  const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsapp)}` : `https://wa.me/?text=${encodeURIComponent(whatsapp)}`
  return (
    <div className="modal-backdrop" onClick={() => setPanel(null)}>
      <motion.div className="modal" onClick={(event) => event.stopPropagation()} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="icon-close" onClick={() => setPanel(null)}>x</button>
        <Header title={type === 'calendar' ? 'Calendar event prepared' : type === 'whatsapp' || type === 'whatsapp_reminder' ? 'WhatsApp message prepared' : 'Email draft'} subtitle={type === 'whatsapp_reminder' ? 'Automatic WhatsApp sending is not configured. Open WhatsApp to send this reminder manually.' : targetItem.summary} />
        {type === 'calendar' ? <div className="form-grid"><Label label="Event title"><input value={targetItem.action || targetItem.summary} readOnly /></Label><Label label="Date"><input value={targetItem.deadline || format(addDays(new Date(), 1), 'yyyy-MM-dd')} readOnly /></Label><Label label="Time"><input value="09:30" readOnly /></Label></div> : <textarea className="draft-text" value={type === 'whatsapp' || type === 'whatsapp_reminder' ? whatsapp : draft} readOnly />}
        <div className="button-row"><button onClick={() => navigator.clipboard?.writeText(type === 'whatsapp' || type === 'whatsapp_reminder' ? whatsapp : draft)}><Clipboard size={16} />Copy {type === 'whatsapp' || type === 'whatsapp_reminder' ? 'Message' : 'Draft'}</button>{(type === 'whatsapp' || type === 'whatsapp_reminder') && <a className="button-link" href={waUrl} target="_blank" rel="noreferrer">Open WhatsApp to send</a>}<button onClick={() => createReminder(targetItem)}><Bell size={16} />Create Reminder</button><button onClick={() => createCalendar(targetItem)}><CalendarPlus size={16} />Calendar</button><button onClick={() => updateStatus(targetItem.id, 'completed')}><Check size={16} />Mark as Sent</button></div>
      </motion.div>
    </div>
  )
}

function ActionCard({ item: targetItem, data, openAction, createReminder, updateStatus }) {
  return <article className="action-card"><strong>{targetItem.summary}</strong><p>Context: {contextNames(data.contexts, targetItem.contextIds).join(', ')}</p><p>People: {names(data.people, targetItem.peopleIds).join(', ') || 'No person attached'}</p><p>Deadline: {deadlineLabel(targetItem.deadline)}</p>{targetItem.reason && <p>Evidence: {targetItem.reason}</p>}<div className="button-row"><button onClick={() => openAction({ type: 'draft_email', item: targetItem })}><Mail size={16} />Draft Email</button><button onClick={() => createReminder(targetItem)}><Bell size={16} />In-App Reminder</button><button onClick={() => createReminder(targetItem, 'whatsapp')}><Bell size={16} />WhatsApp Reminder</button><button onClick={() => updateStatus(targetItem.id, 'completed')}><Check size={16} />Mark Complete</button></div></article>
}

function LooseCard({ item: targetItem, data, openAction, createReminder, updateStatus, deleteTask }) {
  return <article className="loose-card"><div><strong>{targetItem.rawText}</strong><p>{contextNames(data.contexts, targetItem.contextIds).join(', ')} · {names(data.people, targetItem.peopleIds).join(', ') || 'No person'} · {format(parseISO(targetItem.createdAt), 'MMM d')}</p><span>{targetItem.reason}</span></div><div className="button-row"><button onClick={() => updateStatus(targetItem.id, 'completed')}><Check size={16} />Complete</button><button onClick={() => openAction({ type: 'draft_email', item: targetItem })}><Mail size={16} />Draft Response</button><button onClick={() => createReminder(targetItem)}><Bell size={16} />Reminder</button><button onClick={() => createReminder(targetItem, 'whatsapp')}><Bell size={16} />WhatsApp</button><button onClick={() => updateStatus(targetItem.id, 'snoozed')}><PanelLeftClose size={16} />Snooze</button><button className="danger" onClick={() => deleteTask(targetItem.id)}><Trash2 size={16} />Delete</button></div></article>
}

function Memory({ item: targetItem, data, openAction, createReminder }) {
  const urgent = targetItem.deadline && isBefore(parseISO(targetItem.deadline), addDays(new Date(), 7))
  return <article className={`memory ${urgent ? 'urgent' : ''}`}><div><strong>{targetItem.summary}</strong><p>{targetItem.rawText}</p></div><div className="memory-meta"><span>{contextNames(data.contexts, targetItem.contextIds).join(', ')}</span><span>{names(data.people, targetItem.peopleIds).join(', ') || 'No people'}</span><span>{deadlineLabel(targetItem.deadline)}</span><span>{targetItem.status}</span></div><div className="button-row">{openAction && <button onClick={() => openAction({ type: 'draft_email', item: targetItem })}><Mail size={16} />Draft</button>}{createReminder && <button onClick={() => createReminder(targetItem)}><Bell size={16} />Reminder</button>}</div></article>
}

function MemoryDrawer({ memoryValue, image, data, close, editMemory, waterMemory, deleteMemory }) {
  if (!memoryValue) return null
  const contextName = contextNames(data.contexts, [memoryValue.contextId]).join(', ') || 'No context'
  return (
    <div className="modal-backdrop" onClick={close}>
      <motion.div className="modal memory-drawer" onClick={(event) => event.stopPropagation()} initial={{ x: 34, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
        <button className="icon-close" onClick={close}>x</button>
        {image && <img className="memory-photo" src={image} alt="" />}
        <Header title={memoryValue.title} subtitle={memoryValue.description} />
        <div className="memory-detail-grid">
          <Detail label="Date" value={format(parseISO(memoryValue.date), 'PPP')} />
          <Detail label="Context" value={contextName} />
          <Detail label="People" value={memoryValue.people.join(', ') || 'No people'} />
          <Detail label="Growth" value={`${titleCase(memoryValue.growthStage)} · ${memoryValue.waterCount} waters`} />
        </div>
        <div className="suggested-list">{memoryValue.tags.map((tag) => <span key={`${memoryValue.id}-${tag}`}>{tag}</span>)}</div>
        <div className="button-row"><button onClick={() => waterMemory(memoryValue.id)}><Leaf size={16} />Water Memory</button><button onClick={() => editMemory(memoryValue)}><Settings size={16} />Edit</button><button className="danger" onClick={() => deleteMemory(memoryValue.id)}><Trash2 size={16} />Delete</button></div>
      </motion.div>
    </div>
  )
}

function Detail({ label, value }) {
  return <div className="detail"><span>{label}</span><strong>{value}</strong></div>
}

function ChipInput({ values, onChange, placeholder }) {
  const [input, setInput] = useState('')
  const add = () => {
    const value = input.trim()
    if (!value || values.includes(value)) return
    onChange([...values, value])
    setInput('')
  }
  const remove = (value) => onChange(values.filter((entry) => entry !== value))
  return (
    <div className="chip-input">
      <div>{values.map((value) => <span key={value}>{value}<button onClick={() => remove(value)} aria-label={`Remove ${value}`}>x</button></span>)}</div>
      <input value={input} placeholder={placeholder} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ',') {
          event.preventDefault()
          add()
        }
      }} onBlur={add} />
    </div>
  )
}

function MemoryPlant({ memory: memoryValue, data, image, index, onOpen, compact }) {
  const contextItem = data.contexts.find((entry) => entry.id === memoryValue.contextId)
  const style = { '--plant': contextItem?.color || '#68a678', '--x': `${12 + ((index * 29) % 72)}%`, '--y': `${12 + ((index * 37) % 68)}%`, '--delay': `${(index % 5) * 0.18}s` }
  if (compact) {
    return <article className={`plant ${memoryValue.growthStage}`}><div className="plant-visual">{image ? <img src={image} alt="" /> : <PlantGlyph stage={memoryValue.growthStage} />}</div><div><strong>{memoryValue.title}</strong><p>{memoryValue.description}</p><div className="memory-meta"><span>{titleCase(memoryValue.growthStage)}</span><span>{format(parseISO(memoryValue.date), 'MMM d, yyyy')}</span><span>{contextItem?.name || 'No context'}</span></div></div></article>
  }
  return (
    <button className={`garden-plant ${memoryValue.growthStage}`} style={style} onClick={onOpen} aria-label={`Open ${memoryValue.title}`}>
      <PlantGlyph stage={memoryValue.growthStage} />
      <span className="plant-tooltip"><strong>{memoryValue.title}</strong><small>{format(parseISO(memoryValue.date), 'MMM d, yyyy')} · {titleCase(memoryValue.growthStage)}</small></span>
    </button>
  )
}

function PlantGlyph({ stage }) {
  return (
    <span className={`plant-glyph ${stage}`}>
      <span className="soil" />
      <span className="stem" />
      <span className="leaf left" />
      <span className="leaf right" />
      <span className="bloom-head" />
    </span>
  )
}

function Stat({ value, label }) {
  return <article className="stat"><strong>{value}</strong><span>{label}</span></article>
}

function Notice({ children }) {
  return <motion.article className="notice" whileHover={{ x: 3 }}><Sparkles size={16} />{children}</motion.article>
}

function Panel({ title, icon: Icon, children }) {
  return <section className="panel"><h2><Icon size={20} />{title}</h2>{children}</section>
}

function Header({ title, subtitle }) {
  return <header className="section-header"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</header>
}

function TwoColumn({ children }) {
  return <section className="two-column">{children}</section>
}

function Label({ label, children }) {
  return <label><span>{label}</span>{children}</label>
}

function Balance({ contextItem, count, muted }) {
  return <article className={`balance ${muted ? 'muted' : ''}`} style={{ '--context': contextItem.color }}><span>{contextItem.name}</span><strong>{count}</strong><small>{count === 1 ? 'item' : 'items'}</small></article>
}

function Status({ status }) {
  const text = status === 'connected' ? 'Connected' : status === 'demo' ? 'Demo connector' : 'Coming Soon'
  return <span className={`status-pill ${status}`}>{text}</span>
}

function PreviewList({ title, items }) {
  return <div><h3>{title}</h3>{items.length ? items.map((entry, index) => <p key={`${title}-${index}-${entry}`}>{entry}</p>) : <p className="empty">None found</p>}</div>
}

function newContext(mode) {
  return { id: '', name: mode === 'personal' ? 'New Life Area' : 'New Business Area', type: 'primary', mode, parentContextId: null, color: colorValues[0], icon: 'spark', description: '', archived: false, createdAt: now() }
}

function growthStage(count) {
  if (count >= 5) return 'bloom'
  if (count >= 2) return 'sprout'
  return 'seed'
}

function normalizeGrowth(stage, count) {
  const normalized = String(stage || '').toLowerCase()
  if (['seed', 'sprout', 'bloom'].includes(normalized)) return normalized
  return growthStage(count)
}

function titleCase(value) {
  return `${value || ''}`.slice(0, 1).toUpperCase() + `${value || ''}`.slice(1)
}

function names(people, ids) {
  return ids.map((id) => people.find((personItem) => personItem.id === id)?.name).filter(Boolean)
}

function contextNames(contexts, ids) {
  return ids.map((id) => contexts.find((contextItem) => contextItem.id === id)?.name).filter(Boolean)
}

function deadlineLabel(date) {
  if (!date) return 'No deadline'
  return format(parseISO(date), 'EEE, MMM d')
}

function filteredByFocus(items, focusContextId) {
  if (!focusContextId) return items
  return items.filter((entry) => entry.contextIds.includes(focusContextId))
}

function detectLanguage(text) {
  if (/[\u0D00-\u0D7F]/.test(text)) return 'malayalam'
  if (/(paranju|ayakkan|cheyyanam|munpe|nale|orma|vilikkanam|confirm cheyyum)/i.test(text)) return 'manglish'
  return 'english'
}

function detectDeadline(text) {
  const lower = text.toLowerCase()
  if (/august 7/.test(lower)) return '2026-08-07'
  if (/monday/.test(lower)) return '2026-07-20'
  if (/(tomorrow|nale)/.test(lower)) return format(addDays(new Date(), 1), 'yyyy-MM-dd')
  if (/(friday|munpe)/.test(lower)) return '2026-07-24'
  if (/next week/.test(lower)) return '2026-07-27'
  const dateMatch = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  return dateMatch ? dateMatch[1] : null
}

function detectItemType(text) {
  const lower = text.toLowerCase()
  if (/(sop|rule|requires|usually takes)/.test(lower)) return 'knowledge'
  if (/(recommended|kappi|cafe)/.test(lower)) return 'recommendation'
  if (/(selected|decide|decision|choose|whether|approval)/.test(lower)) return 'decision'
  if (/(follow up|confirm|waiting|respond|reply|will finish|will deploy)/.test(lower)) return 'follow_up'
  if (/(promised|promise|i will)/.test(lower)) return 'promise'
  if (/(idea|explore)/.test(lower)) return 'idea'
  if (/(asked|send|submit|book|prepare|test|update|ayakkan|cheyyanam|vilikkanam|wants)/.test(lower)) return 'task'
  return 'information'
}

function detectPeople(text, people) {
  const existing = people.filter((entry) => new RegExp(`\\b${entry.name}\\b`, 'i').test(text)).map((entry) => entry.id)
  const candidates = extractPersonCandidates(text)
  return { ids: [...new Set(existing)], newNames: candidates.filter((name) => !people.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) }
}

function extractPersonCandidates(text) {
  const candidates = []
  const pushName = (value) => {
    const cleaned = cleanPersonName(value)
    if (cleaned) candidates.push(cleaned)
  }
  text.split(/\n/).forEach((line) => {
    const header = line.match(/^(from|to|cc|bcc):\s*(.+)$/i)
    if (header) header[2].split(/[;,]/).forEach(pushName)
    const greeting = line.match(/^(hi|hello|dear)\s+([^,!.\n]+)/i)
    if (greeting) pushName(greeting[2])
  })
  ;[...text.matchAll(/\b(?:as|by|with|from)\s+([A-Z][a-z]+(?:\s+[A-Z][A-Za-z.]*){0,3})(?=,|\s+(?:at|from|will|takes|is|has|shares|joins))/g)].forEach((match) => pushName(match[1]))
  return [...new Set(candidates)]
}

function cleanPersonName(value) {
  const stopWords = new Set(['A', 'An', 'The', 'Team', 'Road', 'Innovation', 'Day', 'Date', 'Time', 'Google', 'Meet', 'Backend', 'Engineer', 'Creating', 'Winning', 'Pitch', 'Deck', 'Regards', 'Thanks', 'Hello', 'Greetings', 'Subject'])
  const withoutEmail = String(value || '').replace(/<[^>]+>/g, '').replace(/\S+@\S+/g, '').replace(/["'`]/g, '').trim()
  const parts = withoutEmail.split(/\s+/).map((part) => part.replace(/[^A-Za-z.]/g, '')).filter(Boolean)
  const usable = parts.filter((part) => !stopWords.has(part))
  if (!usable.length || usable.length > 4) return ''
  if (usable.some((part) => ['Team', 'Road', 'Google', 'Meet'].includes(part))) return ''
  if (!usable.every((part) => /^[A-Z][a-z]+$/.test(part) || /^[A-Z]{1,3}\.?$/.test(part))) return ''
  return usable.join(' ')
}

function chooseContexts(text, data, mode) {
  const lower = text.toLowerCase()
  const contexts = data.contexts.filter((entry) => entry.mode === mode && !entry.archived)
  const matches = contexts.filter((entry) => lower.includes(entry.name.toLowerCase()) || entry.description.toLowerCase().split(/\W+/).some((word) => word.length > 4 && lower.includes(word))).map((entry) => entry.id)
  if (matches.length) return [...new Set(matches)].slice(0, 4)
  if (mode === 'business') {
    if (/(customer|client|lead|support)/.test(lower)) return ['biz-customers']
    if (/(website|project|deploy|frontend)/.test(lower)) return ['biz-projects', 'biz-website']
    if (/(team|rahul|anu|owner|responsib)/.test(lower)) return ['biz-team']
    if (/(finance|payment|invoice|refund|advance)/.test(lower)) return ['biz-finance']
    return ['biz-operations']
  }
  if (/(techx|ieee|gregory|anand|funding|reignite|hexabyte|vendor)/.test(lower)) return ['ctx-ieee', 'ctx-techx']
  if (/(boss|client|payment|sdk|office|strapi|webhook|intern|website|work)/.test(lower)) return ['ctx-work']
  if (/(amma|medical|birthday|gift|rahul|kappi|family|appointment)/.test(lower)) return ['ctx-personal']
  if (/(uav|journal|research|experiment|manuscript|supervisor|paper)/.test(lower)) return ['ctx-research']
  if (/(hackathon|demo|pitch|hotspot|laptop|battery)/.test(lower)) return ['ctx-hackathon']
  if (/(music|class|practice|performance)/.test(lower)) return ['ctx-music']
  return [contexts[0]?.id].filter(Boolean)
}

function looksLikeEmail(text) {
  return /(^|\n)(from:|to:|subject:|regards,|hi vishnu|dear vishnu)/i.test(text)
}

function analyzeEmailThread(text, data, mode) {
  const lower = text.toLowerCase()
  const contextIds = chooseContexts(text, data, mode)
  const peopleResult = detectPeople(text, data.people)
  const deadline = detectDeadline(text)
  const sourceId = `thread-${hashText(text)}`
  const gregoryId = data.people.find((entry) => entry.name === 'Gregory')?.id
  const anandId = data.people.find((entry) => entry.name === 'Anand')?.id
  const isGregoryProposal = /gregory/.test(lower) && /(proposal|techx|host)/.test(lower) && /(send|please send|before)/.test(lower)
  const isAnandWaiting = /anand/.test(lower) && /(confirm|funding)/.test(lower) && !/(confirmed|approved|done|resolved)/.test(lower)
  const isResolution = /(confirmed|approved|resolved|done|sent|completed|closed)/.test(lower)
  const needsReply = looksLikeEmail(text) && /(please|can you|send|confirm|reply|update)/.test(lower)
  let summary = ''
  let itemType = detectItemType(text)
  let status = 'open'
  let waitingOn = null
  let promisedTo = null
  let reason = needsReply ? 'Email thread appears to need your response.' : 'Echo found a possible next action.'

  if (isGregoryProposal) {
    summary = 'Send Gregory the final TechX host proposal'
    itemType = 'promise'
    promisedTo = 'Gregory'
    reason = 'Gregory requested the TechX host proposal in an email thread.'
  } else if (isAnandWaiting) {
    summary = 'Wait for Anand to confirm TechX funding'
    itemType = 'waiting'
    status = 'waiting'
    waitingOn = 'Anand'
    reason = 'Anand owns the next update on funding.'
  } else if (isResolution && /anand|funding/.test(lower)) {
    summary = 'Anand confirmed TechX funding'
    itemType = 'information'
    status = 'open'
    waitingOn = null
    reason = 'This may resolve an older funding waiting loop.'
  }

  return {
    sourceId,
    contextIds,
    peopleIds: [gregoryId && /gregory/.test(lower) ? gregoryId : null, anandId && /anand/.test(lower) ? anandId : null, ...peopleResult.ids].filter(Boolean),
    itemType,
    summary,
    deadline,
    status,
    waitingOn,
    promisedTo,
    relatedItemIds: relevantItemsForText(text, data, mode).map((entry) => entry.id),
    reason,
    confidence: summary ? 0.9 : 0.72,
  }
}

function relevantItemsForText(text, data, mode) {
  const lower = text.toLowerCase()
  const tokens = lower.split(/\W+/).filter((token) => token.length > 3)
  return data.items
    .filter((entry) => entry.mode === mode && entry.status !== 'completed')
    .map((entry) => {
      const haystack = `${entry.rawText} ${entry.summary} ${contextNames(data.contexts, entry.contextIds).join(' ')} ${names(data.people, entry.peopleIds).join(' ')}`.toLowerCase()
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0)
      return { entry, score }
    })
    .filter(({ score }) => score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ entry }) => entry)
}

function findResolutionCandidate(newItem, data) {
  if (!newItem || !/(confirmed|approved|resolved|done|sent|completed|closed)/i.test(newItem.rawText)) return null
  const candidates = relevantItemsForText(newItem.rawText, data, newItem.mode)
  return candidates.find((entry) => entry.id !== newItem.id && entry.status === 'waiting') || null
}

function suggestedReminderDate(targetItem) {
  if (!targetItem.deadline) return format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const due = parseISO(targetItem.deadline)
  const before = addDays(due, -1)
  return format(isBefore(before, new Date()) ? due : before, 'yyyy-MM-dd')
}

function buildReminderMessage(targetItem, data) {
  const context = contextNames(data.contexts, targetItem.contextIds).join(', ') || 'Echo'
  const date = targetItem.deadline ? ` before ${deadlineLabel(targetItem.deadline)}` : ''
  return `Reminder from Echo: ${targetItem.summary}${date}. Context: ${context}.`
}

function hashText(text) {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  return Math.abs(hash).toString(36)
}

function inferEmailSubject(text) {
  const subject = text.match(/^subject:\s*(.+)$/im)?.[1]?.trim()
  if (subject) return subject
  if (/techx|proposal/i.test(text)) return 'TechX proposal thread'
  if (/funding/i.test(text)) return 'Funding status thread'
  return text.split('\n').find((line) => line.trim())?.slice(0, 72) || 'Imported email thread'
}

async function extractMemory(input, sourceType, data) {
  const mode = data.activeMode
  const emailState = analyzeEmailThread(input, data, mode)
  const itemType = emailState.itemType || detectItemType(input)
  const peopleResult = detectPeople(input, data.people)
  const contextIds = emailState.contextIds.length ? emailState.contextIds : chooseContexts(input, data, mode)
  const lower = input.toLowerCase()
  const summary = emailState.summary || (peopleResult.ids.includes('person-anand') && lower.includes('funding') ? 'Wait for Anand to confirm the TechX funding status' : input.replace(/[“”"]/g, '').replace(/\.$/, ''))
  const deadline = emailState.deadline || detectDeadline(input)
  const status = emailState.status || (/(waiting|confirm|will confirm|said he will|said he would|respond)/i.test(input) ? 'waiting' : 'open')
  const peopleIds = [...new Set([...peopleResult.ids, ...emailState.peopleIds])]
  return echoItemSchema.parse({
    id: uid('item'),
    rawText: input,
    summary,
    sourceType: sourceType === 'unknown' && looksLikeEmail(input) ? 'email' : sourceType,
    itemType,
    mode,
    sourceId: emailState.sourceId,
    context: contextNames(data.contexts, [contextIds[0]]).join(', ') || '',
    subContext: contextNames(data.contexts, [contextIds[1]]).join(', ') || null,
    people: names(data.people, peopleIds),
    organizations: contextIds.includes('ctx-ieee') ? ['IEEE'] : [],
    contextIds,
    peopleIds,
    deadline,
    action: summary,
    decision: itemType === 'decision' ? summary : null,
    reason: emailState.reason || (status === 'waiting' ? 'You are waiting on someone.' : 'Echo found a possible next action.'),
    waitingOn: emailState.waitingOn,
    promisedTo: emailState.promisedTo,
    relatedItemIds: emailState.relatedItemIds,
    confidence: emailState.confidence,
    priority: deadline ? 'high' : 'medium',
    status,
    suggestedActions: suggestedActions(itemType, deadline, peopleIds),
    language: detectLanguage(input),
    source: sourceType === 'email' || looksLikeEmail(input) ? 'email-import' : 'manual',
    createdAt: now(),
  })
}

function suggestedActions(itemType, deadline, peopleIds) {
  const actions = new Set(['add_to_context'])
  if (deadline) actions.add('create_reminder')
  if (deadline && itemType !== 'recommendation') actions.add('create_calendar_event')
  if (peopleIds.length) {
    actions.add('draft_email')
    actions.add('generate_whatsapp_message')
  }
  if (itemType === 'follow_up' || itemType === 'promise') actions.add('create_follow_up')
  return [...actions]
}

function addExtractedItem(data, extracted) {
  const peopleResult = detectPeople(extracted.rawText, data.people)
  const newPeople = peopleResult.newNames.map((name) => person(uid('person'), name))
  return { ...data, people: [...data.people, ...newPeople], items: [{ ...extracted, peopleIds: [...extracted.peopleIds, ...newPeople.map((entry) => entry.id)] }, ...data.items] }
}

function fallbackFailedItem(input, sourceType, data, error) {
  const mode = data.activeMode
  const contextIds = chooseContexts(input, data, mode)
  return {
    id: uid('item'),
    rawText: input,
    summary: input.slice(0, 120) || 'Unprocessed capture',
    sourceType,
    itemType: 'information',
    mode,
    sourceId: null,
    context: contextNames(data.contexts, [contextIds[0]]).join(', ') || '',
    subContext: null,
    people: [],
    organizations: [],
    contextIds,
    peopleIds: [],
    deadline: null,
    action: null,
    decision: null,
    reason: 'Processing error. Please review and edit before saving.',
    waitingOn: null,
    promisedTo: null,
    relatedItemIds: [],
    confidence: 0.2,
    priority: 'medium',
    status: 'open',
    suggestedActions: ['add_to_context'],
    language: detectLanguage(input),
    source: 'manual',
    processingError: error?.message || 'Echo could not structure this input automatically.',
    createdAt: now(),
  }
}

async function extractContext(text, data, mode, sourceType) {
  if (!text.trim()) return { contexts: [], people: [], items: [] }
  if (sourceType === 'Import JSON') {
    try {
      const parsed = JSON.parse(text)
      return { contexts: parsed.contexts || [], people: parsed.people || [], items: parsed.items || [] }
    } catch {
      return { contexts: [], people: [], items: [] }
    }
  }
  const llmPreview = await tryOllamaContextExtraction(text, data, mode, sourceType)
  if (llmPreview) return llmPreview
  const peopleResult = detectPeople(text, data.people)
  const lines = normalizeImportLines(text)
  const contextNamesFound = detectContextNames(text, data, mode)
  const contexts = contextNamesFound.map((name) => context(uid('ctx'), name, mode, /TechX|Events|Funding/.test(name) ? data.contexts.find((entry) => entry.mode === mode && entry.name === 'IEEE')?.id || null : null, colorValues[Math.floor(Math.random() * colorValues.length)], 'spark', `Imported from ${sourceType}.`))
  const people = peopleResult.newNames.map((name) => person(uid('person'), name))
  const ctxIds = contexts.map((entry) => entry.id)
  const personIds = [...peopleResult.ids, ...people.map((entry) => entry.id)]
  const items = lines.slice(0, 8).map((line) => item(line, 'import', detectItemType(line), mode, ctxIds.length ? ctxIds : chooseContexts(line, data, mode), personIds, detectDeadline(line), compactSummary(line), detectDeadline(line) ? 'high' : 'medium', /(waiting|confirm|will respond|follow up)/i.test(line) ? 'waiting' : 'open', suggestedActions(detectItemType(line), detectDeadline(line), personIds)))
  return { contexts, people, items }
}

async function tryOllamaContextExtraction(text, data, mode, sourceType) {
  if (data.aiProvider !== 'ollama' || !data.ollamaModel) return null
  try {
    const existingContexts = data.contexts.filter((entry) => entry.mode === mode && !entry.archived).map((entry) => entry.name).join(', ')
    const prompt = `Extract Echo context data from this ${sourceType}. Return only JSON with keys contexts, people, items. Contexts should be broad human labels, not every capitalized phrase. People should be real human names only. Items should be actionable tasks, decisions, reminders, waiting loops, or useful memories. Existing contexts: ${existingContexts}.\n\nText:\n${text.slice(0, 6000)}`
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: data.ollamaModel, prompt, stream: false, format: 'json' }),
    })
    if (!response.ok) return null
    const payload = await response.json()
    const parsed = JSON.parse(payload.response || '{}')
    return normalizeLlmPreview(parsed, data, mode, sourceType, text)
  } catch {
    return null
  }
}

function normalizeLlmPreview(parsed, data, mode, sourceType, rawText) {
  const existingContexts = data.contexts.filter((entry) => entry.mode === mode)
  const contextNamesFound = [...new Set((parsed.contexts || []).map((entry) => typeof entry === 'string' ? entry : entry.name).filter(Boolean).map((name) => cleanContextName(name)).filter(Boolean))]
  const contexts = contextNamesFound
    .filter((name) => !existingContexts.some((entry) => entry.name.toLowerCase() === name.toLowerCase()))
    .slice(0, 6)
    .map((name) => context(uid('ctx'), name, mode, null, colorValues[Math.floor(Math.random() * colorValues.length)], 'spark', `Imported from ${sourceType}.`))
  const contextIds = [...contexts.map((entry) => entry.id), ...existingContexts.filter((entry) => contextNamesFound.some((name) => entry.name.toLowerCase() === name.toLowerCase())).map((entry) => entry.id)]
  const peopleNames = [...new Set((parsed.people || []).map((entry) => typeof entry === 'string' ? entry : entry.name).map(cleanPersonName).filter(Boolean))]
  const people = peopleNames.filter((name) => !data.people.some((entry) => entry.name.toLowerCase() === name.toLowerCase())).slice(0, 10).map((name) => person(uid('person'), name))
  const personIds = [...people.map((entry) => entry.id), ...data.people.filter((entry) => peopleNames.some((name) => entry.name.toLowerCase() === name.toLowerCase())).map((entry) => entry.id)]
  const rawItems = Array.isArray(parsed.items) ? parsed.items : []
  const items = rawItems.slice(0, 10).map((entry) => {
    const summary = compactSummary(typeof entry === 'string' ? entry : entry.summary || entry.title || entry.text || rawText)
    const deadline = detectDeadline(`${summary} ${typeof entry === 'object' ? entry.deadline || entry.date || '' : ''}`)
    const itemType = typeof entry === 'object' && entry.type ? entry.type : detectItemType(summary)
    return item(summary, 'import', itemType, mode, contextIds.length ? contextIds : chooseContexts(summary, data, mode), personIds, deadline, summary, deadline ? 'high' : 'medium', /(waiting|confirm|follow up|pending)/i.test(summary) ? 'waiting' : 'open', suggestedActions(itemType, deadline, personIds))
  })
  return { contexts, people, items }
}

function normalizeImportLines(text) {
  const ignored = /^(from|to|cc|bcc|subject|hi|hello|dear|regards|thanks|date|time|google meet)\b|^\p{Emoji_Presentation}/iu
  return text.split(/\n|\. /).map((line) => line.trim()).filter((line) => line.length > 12 && !ignored.test(line)).slice(0, 12)
}

function detectContextNames(text, data, mode) {
  const known = data.contexts.filter((entry) => entry.mode === mode && new RegExp(`\\b${escapeRegExp(entry.name)}\\b`, 'i').test(text)).map((entry) => entry.name)
  const lower = text.toLowerCase()
  const inferred = []
  if (mode === 'business') {
    if (/(team|owner|developer|responsib|staff)/.test(lower)) inferred.push('Team')
    if (/(customer|client|complaint|support)/.test(lower)) inferred.push('Customers')
    if (/(project|website|integration|redesign)/.test(lower)) inferred.push('Projects')
    if (/(payment|invoice|finance|refund)/.test(lower)) inferred.push('Finance')
    if (/(vendor|delivery|stock)/.test(lower)) inferred.push('Vendors')
    if (/(marketing|pitch|campaign|event)/.test(lower)) inferred.push('Marketing')
  } else {
    if (/(ieee|techx|reignite|hexabyte)/.test(lower)) inferred.push('IEEE')
    if (/(music|practice|performance)/.test(lower)) inferred.push('Music')
    if (/(research|paper|journal|experiment)/.test(lower)) inferred.push('Research')
    if (/(office|client|payment|website|project)/.test(lower)) inferred.push('Work')
    if (/(family|personal|birthday|health|trip)/.test(lower)) inferred.push('Personal')
  }
  return [...new Set([...known, ...inferred].map(cleanContextName).filter(Boolean))]
}

function cleanContextName(name) {
  const cleaned = String(name || '').replace(/[^A-Za-z0-9 /&-]/g, '').trim()
  if (!cleaned || cleaned.length > 36) return ''
  if (/^(date|time|google meet|hi|hello|subject)$/i.test(cleaned)) return ''
  return cleaned
}

function compactSummary(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 160)
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mergeImport(data, preview, mode, sourceType, rawText) {
  if (!preview) return data
  const importedSource = { id: uid('source'), mode, sourceType, rawText, createdAt: now() }
  return { ...data, contexts: [...data.contexts, ...preview.contexts], people: [...data.people, ...preview.people], items: [...preview.items, ...data.items], importedSources: [importedSource, ...data.importedSources] }
}

function detectLooseEnds(items) {
  return items.filter((entry) => entry.status !== 'completed' && (entry.itemType === 'promise' || entry.itemType === 'follow_up' || entry.itemType === 'decision' || entry.deadline || entry.peopleIds.length || entry.itemType === 'recommendation'))
}

function summarizeContext(contextItem, items, peopleNames) {
  const waiting = items.filter((entry) => entry.status === 'waiting').length
  const deadlines = items.filter((entry) => entry.deadline).length
  return `You currently have ${items.length} related items, ${waiting} waiting loop, ${deadlines} deadline${deadlines === 1 ? '' : 's'}, and ${peopleNames.length} connected people in ${contextItem.name}.`
}

async function askEcho(question, data, mode) {
  const q = question.toLowerCase()
  const tokens = q.split(/\W+/).filter((token) => token.length > 2)
  const candidateItems = data.items.filter((entry) => mode === 'personal' ? entry.mode === 'personal' : entry.mode === 'business')
  const scored = candidateItems.map((entry) => {
    const itemContexts = contextNames(data.contexts, entry.contextIds)
    const haystack = `${entry.rawText} ${entry.summary} ${itemContexts.join(' ')} ${names(data.people, entry.peopleIds).join(' ')} ${entry.itemType} ${entry.status}`.toLowerCase()
    let score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 2 : 0), 0)
    if (itemContexts.some((contextName) => q.includes(contextName.toLowerCase()))) score += 5
    if (/(block|blocking|stuck|risk|focus)/.test(q) && (entry.status === 'waiting' || entry.deadline || entry.priority === 'high')) score += 4
    if (q.includes('waiting') && entry.status === 'waiting') score += 5
    if (q.includes('promise') && entry.itemType === 'promise') score += 4
    if (entry.deadline) score += 1
    return { entry, score }
  }).filter(({ score }) => score > 2).sort((a, b) => b.score - a.score).slice(0, 5)
  if (!scored.length) return { answer: 'Echo does not have enough context for that yet.', relevantItemIds: [], found: false, suggestedNextAction: null }
  const relevant = scored.map(({ entry }) => entry)
  const waiting = relevant.filter((entry) => entry.status === 'waiting' || entry.waitingOn)
  const owed = relevant.filter((entry) => entry.status === 'open' && (entry.itemType === 'promise' || entry.promisedTo || entry.deadline))
  const answerParts = []
  if (waiting.length) answerParts.push(`You are waiting on ${waiting.map((entry) => entry.waitingOn || names(data.people, entry.peopleIds)[0] || 'someone').join(', ')} for ${waiting.map((entry) => entry.summary.toLowerCase()).join('; ')}.`)
  if (owed.length) answerParts.push(`You still need to handle ${owed.map((entry) => entry.summary.toLowerCase()).join('; ')}.`)
  if (!answerParts.length) answerParts.push(`The strongest matches are ${relevant.map((entry) => entry.summary.toLowerCase()).join('; ')}.`)
  return { answer: answerParts.join(' '), relevantItemIds: relevant.map((entry) => entry.id), found: true, suggestedNextAction: relevant.some((entry) => entry.deadline) ? 'Create reminders for the dated loops and close any resolved waiting items.' : 'Open the connected context and close the next loop.', confidence: 0.84 }
}

function buildGraph(contexts, items, mode, expanded) {
  const centerLabel = mode === 'personal' ? 'ME' : 'BUSINESS'
  const visible = contexts.filter((entry) => !entry.parentContextId || expanded.has(entry.parentContextId))
  const root = contexts.filter((entry) => !entry.parentContextId)
  const nodes = [{ id: 'center', type: 'echo', position: { x: 380, y: 250 }, data: { label: centerLabel, count: items.length, color: mode === 'personal' ? '#31483f' : '#263f5f', icon: 'spark', status: 'active', iconMap } }]
  root.forEach((entry, index) => {
    const angle = (index / Math.max(root.length, 1)) * Math.PI * 2
    nodes.push(nodeFor(entry, 380 + Math.cos(angle) * 290, 250 + Math.sin(angle) * 210, items, 'primary'))
  })
  visible.filter((entry) => entry.parentContextId).forEach((entry, index) => {
    const parentIndex = root.findIndex((rootEntry) => rootEntry.id === entry.parentContextId)
    const angle = (parentIndex / Math.max(root.length, 1)) * Math.PI * 2
    nodes.push(nodeFor(entry, 380 + Math.cos(angle) * 430 + (index % 2) * 44, 250 + Math.sin(angle) * 315 + (index % 3) * 30, items, 'child'))
  })
  const edges = root.map((entry) => edge('center', entry.id)).concat(visible.filter((entry) => entry.parentContextId).map((entry) => edge(entry.parentContextId, entry.id)))
  return { nodes, edges }
}

function nodeFor(contextItem, x, y, items) {
  const count = items.filter((entry) => entry.contextIds.includes(contextItem.id) && entry.status !== 'completed').length
  const urgent = items.some((entry) => entry.contextIds.includes(contextItem.id) && entry.deadline && isBefore(parseISO(entry.deadline), addDays(new Date(), 7)))
  return { id: contextItem.id, type: 'echo', position: { x, y }, data: { label: contextItem.name, count, color: contextItem.color, icon: contextItem.icon, status: urgent ? 'urgent' : count ? 'active' : 'stable', iconMap } }
}

function edge(source, target) {
  return { id: `${source}-${target}`, source, target, animated: true, style: { stroke: '#b9ad9e', strokeWidth: 2 } }
}

function calculateAchievements(data) {
  const completed = data.items.filter((entry) => entry.status === 'completed')
  const personalContexts = data.contexts.filter((entry) => entry.mode === 'personal' && !entry.archived)
  const watered = data.memories.filter((entry) => entry.mode === 'personal').reduce((sum, entry) => sum + entry.waterCount, 0)
  const personal = [
    ach('first-loop', 'First Loop Closed', 'Complete your first loose end.', completed.length, 1, 'personal'),
    ach('clear-mind', 'Clear Mind', 'Close 5 loose ends.', completed.length, 5, 'personal'),
    ach('context-keeper', 'Context Keeper', 'Maintain 5 active life contexts.', personalContexts.length, 5, 'personal'),
    ach('memory-gardener', 'Memory Gardener', 'Water 10 memories.', watered, 10, 'personal'),
    ach('promise-keeper', 'Promise Keeper', 'Complete 5 promises.', completed.filter((entry) => entry.itemType === 'promise').length, 5, 'personal'),
    ach('life-mapper', 'Life Mapper', 'Create 10 connected context nodes.', personalContexts.length, 10, 'personal'),
  ]
  const business = [
    ach('process-documented', 'Process Documented', 'Create the first business knowledge item.', data.items.filter((entry) => entry.mode === 'business' && entry.itemType === 'knowledge').length, 1, 'business'),
    ach('five-closed', '5 Loose Ends Closed', 'Close 5 business loops.', completed.filter((entry) => entry.mode === 'business').length, 5, 'business'),
    ach('first-sop', 'First SOP Created', 'Store one SOP or business rule.', data.items.filter((entry) => entry.mode === 'business' && entry.itemType === 'knowledge').length, 1, 'business'),
    ach('team-context', 'Team Context Connected', 'Connect 3 team-related items.', data.items.filter((entry) => entry.contextIds.includes('biz-team')).length, 3, 'business'),
  ]
  return [...personal, ...business]
}

function ach(id, name, description, progress, goal, mode) {
  return { id, name, description, progress, goal, mode, unlocked: progress >= goal }
}

export default App
