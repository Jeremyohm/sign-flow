import { uid } from "../utils";

export const INIT_EMAILS = [
  { id: uid(), envelopeId: null, envelopeName: "Purchase Agreement — 123 Oceanview Dr",
    to: "sarah@example.com", toName: "Sarah Mitchell", type: "request",
    subject: "Signature requested: Purchase Agreement — 123 Oceanview Dr",
    signingUrl: "https://sign.yourserver.com/s/abc123def456",
    status: "opened", sentAt: "2026-03-17T10:35:00Z", deliveredAt: "2026-03-17T10:35:04Z", openedAt: "2026-03-17T11:02:00Z" },
  { id: uid(), envelopeId: null, envelopeName: "Purchase Agreement — 123 Oceanview Dr",
    to: "james@example.com", toName: "James Chen", type: "request",
    subject: "Signature requested: Purchase Agreement — 123 Oceanview Dr",
    signingUrl: "https://sign.yourserver.com/s/ghi789jkl012",
    status: "delivered", sentAt: "2026-03-18T14:25:00Z", deliveredAt: "2026-03-18T14:25:03Z", openedAt: null },
  { id: uid(), envelopeId: null, envelopeName: "Seller Disclosure — 456 Mauka Rd",
    to: "david@example.com", toName: "David Nakamura", type: "request",
    subject: "Signature requested: Seller Disclosure — 456 Mauka Rd",
    signingUrl: "https://sign.yourserver.com/s/mno345pqr678",
    status: "opened", sentAt: "2026-03-10T08:05:00Z", deliveredAt: "2026-03-10T08:05:02Z", openedAt: "2026-03-10T09:15:00Z" },
  { id: uid(), envelopeId: null, envelopeName: "Inspection Addendum — 789 Aloha Blvd",
    to: "robert@example.com", toName: "Robert Kaimana", type: "request",
    subject: "Signature requested: Inspection Addendum — 789 Aloha Blvd",
    signingUrl: "https://sign.yourserver.com/s/stu901vwx234",
    status: "delivered", sentAt: "2026-03-19T09:02:00Z", deliveredAt: "2026-03-19T09:02:05Z", openedAt: null },
];

export const INIT_ENVELOPES = [
  { id: uid(), name: "Purchase Agreement — 123 Oceanview Dr", status: "in_progress",
    createdAt: "2026-03-17T10:30:00Z", updatedAt: "2026-03-18T14:22:00Z",
    signers: [
      { id: "s1", name: "Sarah Mitchell", email: "sarah@example.com", role: "Buyer", status: "signed", signedAt: "2026-03-17T11:15:00Z" },
      { id: "s2", name: "James Chen", email: "james@example.com", role: "Buyer (Spouse)", status: "pending", signedAt: null },
      { id: "s3", name: "True Legacy Homes", email: "closing@truelegacy.com", role: "Seller", status: "waiting", signedAt: null },
    ], routing: "sequential", pages: 3 },
  { id: uid(), name: "Seller Disclosure — 456 Mauka Rd", status: "completed",
    createdAt: "2026-03-10T08:00:00Z", updatedAt: "2026-03-14T16:45:00Z",
    signers: [
      { id: "s1", name: "David Nakamura", email: "david@example.com", role: "Seller", status: "signed", signedAt: "2026-03-10T09:30:00Z" },
      { id: "s2", name: "Lisa Park", email: "lisa@example.com", role: "Buyer", status: "signed", signedAt: "2026-03-14T16:45:00Z" },
    ], routing: "sequential", pages: 2 },
  { id: uid(), name: "Inspection Addendum — 789 Aloha Blvd", status: "sent",
    createdAt: "2026-03-19T09:00:00Z", updatedAt: "2026-03-19T09:00:00Z",
    signers: [{ id: "s1", name: "Robert Kaimana", email: "robert@example.com", role: "Buyer", status: "pending", signedAt: null }],
    routing: "sequential", pages: 1 },
  { id: uid(), name: "Earnest Money Receipt — 321 Palm St", status: "draft",
    createdAt: "2026-03-19T07:30:00Z", updatedAt: "2026-03-19T07:30:00Z",
    signers: [], routing: "sequential", pages: 1 },
];

export const INIT_TEMPLATES = [
  { id: uid(), name: "Purchase Agreement", description: "Standard Hawaii purchase agreement with buyer/seller signature blocks",
    pages: 3, signerRoles: ["Buyer", "Buyer (Spouse)", "Seller"], fields: [
      { type: "signature", page: 2, x: 24, y: 580, w: 200, h: 50, signer: 0 },
      { type: "date", page: 2, x: 24, y: 640, w: 140, h: 36, signer: 0 },
      { type: "signature", page: 2, x: 320, y: 580, w: 200, h: 50, signer: 1 },
      { type: "date", page: 2, x: 320, y: 640, w: 140, h: 36, signer: 1 },
      { type: "signature", page: 2, x: 170, y: 710, w: 200, h: 50, signer: 2 },
      { type: "date", page: 2, x: 380, y: 710, w: 140, h: 36, signer: 2 },
    ], createdAt: "2026-02-15T10:00:00Z", usageCount: 12 },
  { id: uid(), name: "Seller Disclosure", description: "HRS 508D-compliant property disclosure form",
    pages: 2, signerRoles: ["Seller", "Buyer"], fields: [
      { type: "signature", page: 1, x: 24, y: 580, w: 200, h: 50, signer: 0 },
      { type: "date", page: 1, x: 24, y: 640, w: 140, h: 36, signer: 0 },
      { type: "initials", page: 0, x: 480, y: 740, w: 80, h: 40, signer: 1 },
      { type: "signature", page: 1, x: 320, y: 580, w: 200, h: 50, signer: 1 },
      { type: "date", page: 1, x: 320, y: 640, w: 140, h: 36, signer: 1 },
    ], createdAt: "2026-02-20T10:00:00Z", usageCount: 8 },
  { id: uid(), name: "Inspection Addendum", description: "Post-inspection repair request form",
    pages: 1, signerRoles: ["Buyer", "Seller"], fields: [
      { type: "signature", page: 0, x: 24, y: 580, w: 200, h: 50, signer: 0 },
      { type: "date", page: 0, x: 24, y: 640, w: 140, h: 36, signer: 0 },
      { type: "signature", page: 0, x: 320, y: 580, w: 200, h: 50, signer: 1 },
      { type: "date", page: 0, x: 320, y: 640, w: 140, h: 36, signer: 1 },
    ], createdAt: "2026-03-01T10:00:00Z", usageCount: 4 },
];
