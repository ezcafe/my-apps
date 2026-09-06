export const babyTypeDefs = /* GraphQL */ `
  type BabyProfile {
    id: ID!
    workspaceId: ID!
    displayName: String!
    birthDate: String
    createdAt: String!
    updatedAt: String!
  }

  type BabyCareEvent {
    id: ID!
    workspaceId: ID!
    babyId: ID!
    type: String!
    occurredAt: String!
    endedAt: String
    payload: JSON!
    source: String!
    createdByUserSub: String!
    updatedByUserSub: String!
  }

  type BabyGrowthEntry {
    id: ID!
    workspaceId: ID!
    babyId: ID!
    kind: String!
    recordedAt: String!
    valueNum: Float
    valueText: String
    unit: String
    notes: String
    source: String!
  }

  type BabyTimelineItem {
    id: ID!
    kind: String!
    type: String!
    at: String!
    endedAt: String
    payload: JSON!
    summary: String!
    source: String!
    cursor: String!
  }

  type BabyTimelineConnection {
    items: [BabyTimelineItem!]!
    nextCursor: String
  }

  type BabyGrowthConnection {
    items: [BabyGrowthEntry!]!
    nextCursor: String
  }

  enum BabyVaccineDose {
    first
    second
  }

  type BabyVaccineEntry {
    id: ID!
    workspaceId: ID!
    babyId: ID!
    name: String!
    dose: BabyVaccineDose!
    administeredAt: String!
    notes: String
    source: String!
    createdAt: String!
    updatedAt: String!
  }

  type BabyVaccineConnection {
    items: [BabyVaccineEntry!]!
    nextCursor: String
  }

  type BabyTelegramLink {
    workspaceId: ID!
    chatId: String!
    linkedAt: String!
    linkedByUserSub: String!
    confirmedAt: String
  }

  type BabySyncConfig {
    intervalMinutes: Int!
  }

  scalar JSON

  type Query {
    babyProfile: BabyProfile!
    babyTimeline(
      from: String
      to: String
      cursor: String
      limit: Int
    ): BabyTimelineConnection!
    """Indexed open nap for Start-disable — null when none."""
    babyOpenSleep: BabyCareEvent
    babyGrowthEntries(
      kind: String
      from: String
      to: String
      cursor: String
      limit: Int
    ): BabyGrowthConnection!
    babyVaccines(
      from: String
      to: String
      cursor: String
      limit: Int
    ): BabyVaccineConnection!
    babyTelegramLink: BabyTelegramLink
    babySyncConfig: BabySyncConfig!
  }

  input CreateBabyFeedInput {
    method: String!
    durationSec: Int
    amountMl: Float
    notes: String
    occurredAt: String
  }

  input CreateBabyDiaperInput {
    kind: String!
    notes: String
    occurredAt: String
  }

  input StartBabySleepInput {
    notes: String
    occurredAt: String
  }

  input EndBabySleepInput {
    eventId: ID
    endedAt: String
  }

  input CreateBabyGrowthInput {
    kind: String!
    recordedAt: String
    valueNum: Float
    valueText: String
    unit: String
    notes: String
  }

  input UpdateBabyGrowthInput {
    id: ID!
    kind: String
    recordedAt: String
    valueNum: Float
    valueText: String
    unit: String
    notes: String
  }

  input CreateBabyVaccineInput {
    name: String!
    dose: BabyVaccineDose!
    administeredAt: String
    notes: String
    source: String
  }

  input UpdateBabyVaccineInput {
    id: ID!
    name: String
    dose: BabyVaccineDose
    administeredAt: String
    notes: String
  }

  input LinkBabyTelegramInput {
    chatId: String!
  }

  input UpdateBabyEventInput {
    id: ID!
    occurredAt: String
    endedAt: String
    payload: JSON
  }

  type Mutation {
    ensureBabyProfile(displayName: String): BabyProfile!
    createBabyFeed(input: CreateBabyFeedInput!): BabyCareEvent!
    createBabyDiaper(input: CreateBabyDiaperInput!): BabyCareEvent!
    startBabySleep(input: StartBabySleepInput): BabyCareEvent!
    endBabySleep(input: EndBabySleepInput): BabyCareEvent!
    updateBabyEvent(input: UpdateBabyEventInput!): BabyCareEvent!
    deleteBabyEvent(id: ID!): BabyCareEvent!
    createBabyGrowth(input: CreateBabyGrowthInput!): BabyGrowthEntry!
    updateBabyGrowth(input: UpdateBabyGrowthInput!): BabyGrowthEntry!
    deleteBabyGrowth(id: ID!): BabyGrowthEntry!
    createBabyVaccine(input: CreateBabyVaccineInput!): BabyVaccineEntry!
    updateBabyVaccine(input: UpdateBabyVaccineInput!): BabyVaccineEntry!
    deleteBabyVaccine(id: ID!): BabyVaccineEntry!
    linkBabyTelegramChat(input: LinkBabyTelegramInput!): BabyTelegramLink!
    unlinkBabyTelegramChat: Boolean!
  }
`;
