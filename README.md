# youtube-live-chat-ts

A library for handling YouTube live chats, written entirely in TypeScript. Also includes utilities to help find live
streams, and track quota usage.

# Demo

```ts
import {YouTubeLiveChat} from 'youtube-live-chat-ts';

// This uses your YouTube API key. More info: https://developers.google.com/youtube/v3/getting-started
const handler = new YouTubeLiveChat(process.env.API_KEY);

// Note: this is very quota intensive (100 units!), so skip this step if possible.
const currentLiveStreams = await handler.searchChannelForLiveVideoIds(YOUTUBE_CHANNEL_ID);
const videoId = currentLiveStreams[0];

// You can just skip to here if you know your video id, e.g. https://youtube.com/watch?v=<ID> or https://youtu.be/<ID>
const liveChatId = await handler.getLiveChatIdFromVideoId(videoId); // The chat ID is *not* the video ID!
handler.listen(liveChatId).subscribe((chatMessage) => {
  if (chatMessage.snippet.type === 'textMessageEvent') {
    console.log(`${data.authorDetails.displayName}: ${data.snippet.displayMessage}`);
  }
});

// Some time later...
handler.stop(liveChatId);
// We will also automatically stop if YouTube tells us the chat has ended.
```

# Notes

This uses and respects YouTube's `nextPageToken` and `pollingIntervalMillis` values to ensure that we don't pull any
more data than we need to, and that we don't poll YouTube any more often than it suggest we should, respecively.

We keep an internal cache of active `liveChatId`s, so if you ask for the same chat more than once, we won't spam YouTube
with multiple requests for the same data.

There is an estimated quota usage tracker. This is just a best guess currently, because YouTube does not properly
document how much quota their live endpoints use. See https://developers.google.com/youtube/v3/determine_quota_cost for
how quota is calculated - at time of writing, there is no documentation for how much quota the liveChat endpoints use.

We use:
* the `/v3/search` endpoint in `searchChannelForLiveVideoIds`
* the `/v3/videos` endpoint in `getLiveChatIdFromVideoId`
* the `/v3/liveChat/messages` endpoint (repeatedly) in `listen()`

# Requirements

* axios: ^0.20.0 - for executing requests
* rxjs: ^6.6.3 - for the `listen()` observable
* typescript: ^4.0.3 - duh
