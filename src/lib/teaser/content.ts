// Editorial copy and bilingual defaults for the website teaser.
// Site-editable at runtime through PayloadCMS (`home-page` collection).

export const teaser = {
  name: "sophomores",
  domain: "sophomores.co",
  launchAt: null as string | null,
  launchHint: "In ~10 days",
  preludeTitleLeft: "The best conversations",
  preludeTitleRight: "happen outside your circle.",
  warpPassageLine1:
    "Whether it’s a company, a craft, or a new direction, perspective narrows when you stay in your lane.",
  warpPassageLine2: "We create the room where different worlds cross paths.",
  introduction:
    "A private social club for people building in different worlds.",
  notification:
    "Something is taking shape. Ticket sales open in around ten days. The first night is still under wraps.",
  headline: "It Didn’t Begin With A Club.\nIt Began With A Question.",
  peopleHeadline:
    "Experienced Enough To Know Better. Curious Enough To Go Anyway.",
  invitation: "Go ahead, take a light..."
} as const;

export const teaserKo = {
  name: "sophomores",
  domain: "sophomores.co",
  launchAt: null as string | null,
  launchHint: "약 10일 후 오픈",
  preludeTitleLeft: "가장 흥미로운 대화는",
  preludeTitleRight: "익숙한 바운더리 밖에서 시작된다.",
  warpPassageLine1:
    "어떤 일을 하든 익숙한 반경 안에만 머물면 시야는 좁아지기 마련이다.",
  warpPassageLine2: "우린 서로 다른 세계가 교차하는 자리를 만든다.",
  introduction:
    "서로 다른 세계에서 자기만의 길을 가는 사람들을 위한 프라이빗 소셜 클럽.",
  notification:
    "첫 번째 밤을 준비하고 있습니다. 약 10일 후 티켓이 오픈됩니다.",
  headline: "시작은 클럽이 아니라,\n하나의 질문이었다.",
  peopleHeadline: "알 만큼 알지만, 그래도 기어이 가보는 사람들.",
  invitation: "Go ahead, take a light..."
} as const;

export const chapters = [
  { id: "hero", label: "Home" },
  { id: "origin", label: "Origin" },
  { id: "strategy", label: "The first night" },
  { id: "people", label: "The people" },
  { id: "contacts", label: "The invitation" }
] as const;

export const stories = [
  {
    title: "Everyone Remembers The First Year And The Last.",
    body: "Admissions and graduations get the spotlight. The stretch in between rarely gets a name.",
    tone: "blue"
  },
  {
    title: "Most Of Life Happens In That Middle Stretch.",
    body: "Enough experience to know your footing. Enough road ahead to change direction entirely.",
    tone: "dark"
  },
  {
    title: "Going Your Own Way Can Narrow The View.",
    body: "The deeper you get into your own work, the rarer it becomes to cross paths with someone outside it.",
    tone: "green"
  },
  {
    title: "A Room Where Different Paths Cross.",
    body: "Sophomores brings people building in very different worlds into the same room—to talk, trade perspective, and return to their lives with new momentum.",
    tone: "portrait"
  }
] as const;

export const storiesKo = [
  {
    title: "사람들은 입학과 졸업만 기억한다.",
    body: "시작의 설렘과 끝의 성취는 주목받지만, 정작 그사이의 시간은 쉽게 잊힌다.",
    tone: "blue"
  },
  {
    title: "하지만 가장 많은 일은 그 중간의 시간에서 일어난다.",
    body: "발디딜 곳을 알 만큼의 경험은 쌓였고, 어디로든 방향을 틀 수 있을 만큼의 여백이 남아 있는 시기.",
    tone: "dark"
  },
  {
    title: "자기 길에 몰두할수록 바운더리는 좁아진다.",
    body: "하는 일에 깊어질수록, 전혀 다른 세계의 사람과 마주칠 기회는 오히려 줄어든다.",
    tone: "green"
  },
  {
    title: "서로 다른 길이 교차하는 자리.",
    body: "Sophomores는 서로 다른 세계에서 자기만의 길을 가는 사람들을 한자리에 모읍니다. 대화를 나누고, 새로운 시야와 동력을 얻어 가는 자리입니다.",
    tone: "portrait"
  }
] as const;

export const principles = [
  {
    title: "A Different Kind\nOf Company",
    body: "People who have done a few things. Changed their minds. Stayed curious. Less interested in a title than in what happens next.",
    color: "#ff4c25"
  },
  {
    title: "Living, Sans\nReference",
    body: "A little outside the script. Familiar enough to feel at home. Unfamiliar enough to feel something. A shared appetite for the unplanned.",
    color: "#192ce4"
  },
  {
    title: "The Beginning\nIs A Night",
    body: "Music. Conversation. A room with its own rhythm. Some things are better discovered in person. We’ll leave the rest for the invitation.",
    color: "#58b8e1"
  }
] as const;

export const messages = [
  {
    from: "From: sophomores",
    text: "Our first gathering is a single evening in Seoul for people building across different fields."
  },
  {
    from: "From: sophomores",
    text: "One room, unhurried conversation, and music until late. Capacity is kept intentionally small."
  },
  {
    from: "From: sophomores",
    text: "Ticket access opens soon. Full venue details are shared with confirmed guests."
  }
] as const;

export const messagesKo = [
  {
    from: "From: sophomores",
    text: "첫 번째 모임은 서로 다른 영역에서 자기만의 일을 만들어가는 사람들을 위한 하룻밤의 자리입니다."
  },
  {
    from: "From: sophomores",
    text: "밀도 있는 대화와 음악, 그리고 예상치 못한 만남을 위해 제한된 인원으로만 진행됩니다."
  },
  {
    from: "From: sophomores",
    text: "티켓은 곧 오픈되며, 구체적인 장소와 안내는 참석이 확정된 분들께 전달됩니다."
  }
] as const;

export const values = [
  {
    image: "/teaser/orb-blue.webp",
    body: "A little experience.\nA lot left to discover.\n\nNot beginners. Not finished."
  },
  {
    image: "/teaser/orb-pink.webp",
    body: "Less performing.\nMore being there.\n\nGood company is a beginning, not a credential."
  },
  {
    image: "/teaser/orb-gold.webp",
    body: "One room.\nUnexpected connections.\n\nLet’s see what happens next."
  }
] as const;
