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

  type BabyHydrationDay {
    date: String!
    wetCount: Int!
    feedCount: Int!
    formulaMl: Float
  }

  type BabyHydrationSeries {
    days: [BabyHydrationDay!]!
    alert: String
    emptyReason: String
  }

  type BabyNightRestDay {
    date: String!
    nightSleepMinutes: Int!
    intervalCount: Int!
  }

  type BabyNightRestSeries {
    days: [BabyNightRestDay!]!
    emptyReason: String
  }

  type BabyWakeWindowKpi {
    avgMinutes: Float
    emptyReason: String
  }

  type BabyMilkToDiaperKpi {
    avgLagMinutes: Float
    emptyReason: String
  }

  type BabySleepEfficiencyKpi {
    emptyReason: String!
  }

  type BabyPatternSleepBlock {
    startMin: Int!
    endMin: Int!
  }

  type BabyPatternMarker {
    minuteOfDay: Int!
    kind: String!
  }

  type BabyPatternDay {
    date: String!
    sleepBlocks: [BabyPatternSleepBlock!]!
    markers: [BabyPatternMarker!]!
  }

  type BabyPatternFinderSeries {
    days: [BabyPatternDay!]
    emptyReason: String
  }

  type BabyAwakeTrendDay {
    date: String!
    meanWakeMinutes: Float!
    rollingMeanWakeMinutes: Float
  }

  type BabyAwakeTrendSeries {
    days: [BabyAwakeTrendDay!]
    emptyReason: String
  }

  type BabyDiaperOutputBuckets {
    wet: Int!
    normal: Int!
    watery: Int!
    blowouts: Int!
  }

  type BabyDiaperOutputSeries {
    buckets: BabyDiaperOutputBuckets
    alert: String
    emptyReason: String
  }

  type BabyInsightsCareCounts {
    feeds: Int!
    sleep: Int!
    diapers: Int!
  }

  type BabyInsightsCareCountDay {
    day: String!
    feed: Int!
    sleep: Int!
    diaper: Int!
  }

  type BabyInsightsSeries {
    hydration: BabyHydrationSeries!
    nightRest: BabyNightRestSeries!
    wakeWindow: BabyWakeWindowKpi!
    milkToDiaper: BabyMilkToDiaperKpi!
    sleepEfficiency: BabySleepEfficiencyKpi!
    patternFinder: BabyPatternFinderSeries!
    awakeTrend: BabyAwakeTrendSeries!
    diaperOutput: BabyDiaperOutputSeries!
    counts: BabyInsightsCareCounts!
    careCountDays: [BabyInsightsCareCountDay!]!
  }

  type BabyHomeQuickStatus {
    lastFeed: BabyTimelineItem
    lastSleep: BabyTimelineItem
    lastDiaper: BabyTimelineItem
    openSleep: BabyCareEvent
    feedsToday: Int!
    birthDate: String
    latestWeightKg: Float
    """Distinct formula ml from recent feed events, newest by occurredAt first, max 3."""
    recentBottleMl: [Int!]!
  }

  enum BabyQuickActionKind {
    BREAST
    FORMULA
    SLEEP
    DIAPER
  }

  enum BabyDiaperKind {
    wet
    dirty
    mixed
    dry
  }

  enum BabyDiaperColor {
    yellow
    brown
    green
    black
    white_pale
    red_bloody
  }

  enum BabyDiaperTexture {
    soft
    seedy
    mushy
    watery
    hard
    formed
  }

  enum BabyDiaperAmount {
    smear
    medium
    blowout
  }

  input BabyQuickActionInput {
    kind: BabyQuickActionKind!
    side: String
    amountMl: Float
    diaperKind: BabyDiaperKind
    diaperColor: BabyDiaperColor
    diaperTexture: BabyDiaperTexture
    diaperAmount: BabyDiaperAmount
  }

  input BabyQuickBreastInput {
    side: String!
    durationSec: Int!
  }

  input BabyQuickCareInput {
    action: BabyQuickActionInput!
    breastRunning: BabyQuickBreastInput
    feedSessionEventId: ID
    clientRequestId: String!
  }

  type BabyQuickCareStepResult {
    step: String!
    wrote: String!
    event: BabyCareEvent!
  }

  type BabyQuickCareResult {
    steps: [BabyQuickCareStepResult!]!
    replayed: Boolean!
    openSleep: BabyCareEvent
  }

  input UpdateBabyProfileInput {
    birthDate: String
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
    """One-shot read for the Baby home quick-log page."""
    babyHomeQuickStatus(dayFrom: String!, dayTo: String!): BabyHomeQuickStatus!
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
    """Full-range Insights chart/KPI snapshot for the applied date filter."""
    babyInsightsSeries(from: String!, to: String!): BabyInsightsSeries!
  }

  input CreateBabyFeedInput {
    method: String!
    durationSec: Int
    amountMl: Float
    notes: String
    occurredAt: String
  }

  input CreateBabyDiaperInput {
    kind: BabyDiaperKind!
    color: BabyDiaperColor
    texture: BabyDiaperTexture
    amount: BabyDiaperAmount
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
    updateBabyProfile(input: UpdateBabyProfileInput!): BabyProfile!
    createBabyFeed(input: CreateBabyFeedInput!): BabyCareEvent!
    createBabyDiaper(input: CreateBabyDiaperInput!): BabyCareEvent!
    startBabySleep(input: StartBabySleepInput): BabyCareEvent!
    endBabySleep(input: EndBabySleepInput): BabyCareEvent!
    babyQuickCare(input: BabyQuickCareInput!): BabyQuickCareResult!
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
