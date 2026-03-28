const en = {
  tab: {
    feed: "New",
    fame: "Hall of Fame",
    post: "Post",
  },
  feed: {
    loading: "Loading...",
    empty: "No posts yet",
    emptyAction: "Post the first mishearing",
    newPosts: "New Posts",
    jumpToNew: "Jump to new posts",
  },
  fame: {
    title: "Hall of Fame",
    empty: "No data yet",
    reactions: "reactions",
  },
  postCard: {
    play: "Play",
    reveal: "Show mishearing",
    spoilerPlaceholder: "???",
  },
  reactions: {
    add: "Add reaction",
    pickerTitle: "Pick an emoji",
  },
  editor: {
    urlLabel: "Video URL",
    urlPlaceholder: "https://youtube.com/watch?v=... or nicovideo.jp/watch/sm...",
    urlInvalid: "Please enter a valid URL",
    startLabel: "Start",
    endLabel: "End",
    sourceLangLabel: "Original language",
    targetLangLabel: "Sounds like",
    misheardLabel: "Sounds like this! (misheard text)",
    misheardPlaceholder: "e.g. The condor looked like a sumo wrestler",
    artistLabel: "Artist",
    songLabel: "Song title",
    originalLabel: "Original lyrics (if known)",
    eraLabel: "Era / Year (optional)",
    eraPlaceholder: "1985, 90s, 2020s...",
    commentLabel: "One-liner (optional)",
    commentPlaceholder: "The shock when I first heard it...",
    nicknameLabel: "Nickname (optional)",
    nicknamePlaceholder: "Anonymous",
    deleteKeyLabel: "Delete key (optional, to delete your post later)",
    drafts: "Drafts",
    noDrafts: "No drafts",
    saveDraft: "Save draft",
    draftSaved: "Draft saved",
    submit: "Post",
    previewOpen: "Preview",
    previewClose: "Close preview",
    previewUnsupported: "Preview is available for YouTube videos only",
    delete: "Delete",
  },
  pickup: {
    loading: "Loading...",
    empty: "No picks yet",
    emptyHint: "The master will choose when posts gather",
    archive: "Past picks",
    closing: "See you next month at the counter",
    reveal: "Show the mishearing",
    copied: "Link copied!",
    intro: 'Next up: "{songTitle}" by {artistName}, {year}',
    watchVideo: "Watch the video",
  },
  footer: {
    siteName: "Ear in the Sky Diamond",
    disclaimer: "Videos and audio use embedded players from their respective platforms.",
    noHosting: "This site does not host any content.",
    madeBy: "Made by",
    visits: "visits",
  },
  share: "Share",
  toast: {
    posted: "Posted!",
    postFailed: "Failed to post",
    urlCopied: "URL copied",
    rateLimited: "Please wait 30 seconds between posts",
  },
  header: {
    subtitle: "Does that song sound different to you?",
    alias: "",
  },
  niconico: {
    fallbackLink: "Watch on Niconico",
    playSegment: "Play this part",
  },
  youtube: {
    playSegment: "Play this part",
    replay: "Play again",
    cannotPlay: "This video cannot be played",
  },
  platform: {
    youtube: "YouTube",
    niconico: "Niconico",
    other: "External site",
  },
};

// Deep-string version of the messages shape for i18n compatibility
type DeepString<T> = {
  [K in keyof T]: T[K] extends Record<string, unknown> ? DeepString<T[K]> : string;
};

export type Messages = DeepString<typeof en>;
export default en as Messages;
