"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeLiveChat = void 0;
const axios_1 = __importDefault(require("axios"));
const rxjs_1 = require("rxjs");
const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const SEARCH_QUOTA_USAGE = 100;
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const VIDEOS_LIST_QUOTA_USAGE = 1;
const LIVE_CHAT_MESSAGES_URL = 'https://www.googleapis.com/youtube/v3/liveChat/messages';
const LIVE_CHAT_MESSAGES_LIST_QUOTA = 1;
const LIVE_CHAT_MESSAGE_QUOTA_PER_ITEM = 0; // Unclear? This might be 1.
const MAX_MAX_RESULTS = 2000;
class YouTubeLiveChat {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.estimatedQuotaUsed = 0;
    }
    searchChannelForLiveVideoIds(channelId) {
        return __awaiter(this, void 0, void 0, function* () {
            const resp = yield axios_1.default.get(SEARCH_URL, { params: {
                    eventType: 'live',
                    part: 'id',
                    channelId,
                    type: 'video',
                    key: this.apiKey,
                } });
            this.estimatedQuotaUsed += SEARCH_QUOTA_USAGE;
            const respData = resp.data;
            return respData.items.map((i) => i.id.videoId);
        });
    }
    getLiveChatIdFromVideoId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const resp = yield axios_1.default.get(VIDEOS_URL, { params: {
                    part: 'liveStreamingDetails',
                    id,
                    key: this.apiKey,
                } });
            this.estimatedQuotaUsed += VIDEOS_LIST_QUOTA_USAGE;
            const respData = resp.data;
            if (respData.items.length === 1) {
                return respData.items[0].liveStreamingDetails.activeLiveChatId;
            }
            else if (respData.items.length === 0) {
                return null;
            }
            else {
                throw new Error(`How are there ${respData.items.length} videos with the same ID (${id}) ?!?!`);
            }
        });
    }
    fetchLiveChats(liveChatId, pageToken, maxResults) {
        return __awaiter(this, void 0, void 0, function* () {
            const resp = yield axios_1.default.get(LIVE_CHAT_MESSAGES_URL, { params: {
                    liveChatId,
                    pageToken,
                    maxResults: maxResults || MAX_MAX_RESULTS,
                    part: 'id,snippet,authorDetails',
                    profileImageSize: 16,
                    key: this.apiKey,
                } });
            const respData = resp.data;
            this.estimatedQuotaUsed += LIVE_CHAT_MESSAGES_LIST_QUOTA;
            this.estimatedQuotaUsed += respData.items.length * LIVE_CHAT_MESSAGE_QUOTA_PER_ITEM;
            return respData;
        });
    }
    listen(liveChatId) {
        if (!YouTubeLiveChat.subjectCache[liveChatId]) {
            YouTubeLiveChat.subjectCache[liveChatId] = new rxjs_1.Subject();
            const resultsFetchLoop = (result) => {
                if (YouTubeLiveChat.subjectCache[liveChatId].isStopped) {
                    return;
                }
                if (!result) {
                    YouTubeLiveChat.subjectCache[liveChatId].error({
                        code: null,
                        message: 'Unkonwn error occurred - no result object was given',
                    });
                }
                else if (result.error) {
                    YouTubeLiveChat.subjectCache[liveChatId].error(result.error);
                }
                else {
                    let chatEndedFlag = false;
                    for (const message of result.items) {
                        YouTubeLiveChat.subjectCache[liveChatId].next(message);
                        if (message.snippet.type === 'chatEndedEvent') {
                            chatEndedFlag = true;
                        }
                    }
                    if (result.offlineAt || chatEndedFlag) {
                        YouTubeLiveChat.subjectCache[liveChatId].complete();
                        return;
                    }
                    setTimeout(() => {
                        this.fetchLiveChats(liveChatId, result.nextPageToken).then(resultsFetchLoop);
                    }, result.pollingIntervalMillis);
                }
            };
            this.fetchLiveChats(liveChatId, undefined, 1).then(resultsFetchLoop);
        }
        return YouTubeLiveChat.subjectCache[liveChatId];
    }
    stop(liveChatId) {
        if (YouTubeLiveChat.subjectCache[liveChatId]) {
            YouTubeLiveChat.subjectCache[liveChatId].complete();
        }
    }
}
exports.YouTubeLiveChat = YouTubeLiveChat;
YouTubeLiveChat.subjectCache = {};
//# sourceMappingURL=index.js.map