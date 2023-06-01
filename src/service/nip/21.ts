import {
  Event,
  EventSetMetadataContent,
} from 'service/api';
import {
  DecodedNaddrResult,
  DecodedNeventResult,
  DecodedNprofileResult,
  DecodedNrelayResult,
  Nip19,
  Nip19DataType,
  Nip19ShareableDataType,
} from './19';
import { UserMap } from 'service/type';
import { OneTimeWebSocketClient } from 'service/websocket/onetime';

export interface NpubResult {
  key: string;
  profile:
    | EventSetMetadataContent
    | (EventSetMetadataContent & { created_at })
    | null;
  pubkey: string;
}

export interface NprofileResult {
  key: string;
  profile:
    | EventSetMetadataContent
    | (EventSetMetadataContent & { created_at })
    | null;
  decodedMetadata: DecodedNprofileResult;
}

export interface NoteResult {
  key: string;
  noteEvent: Event | null;
  eventId: string;
}

export interface NeventResult {
  key: string;
  noteEvent: Event | null;
  decodedMetadata: DecodedNeventResult;
}

export interface NaddrResult {
  key: string;
  replaceableEvent: Event | null;
  decodedMetadata: DecodedNaddrResult;
}

export interface NrelayResult {
  key: string;
  decodedMetadata: DecodedNrelayResult;
}

export class Nip21 {
  // todo: change for-loop to parallel and re-use connection on fallback relays
  static async transformNpub(
    content: string,
    userMap: UserMap,
    fallbackRelays: string[],
  ) {
    const results: NpubResult[] = [];

    const match = /nostr:npub\S*\b/g.exec(content);
    if (match == null || match?.length === 0) return results;

    const transform = async (key: string) => {
      const npub = key.split(':')[1];
      const { type, data: pubkey } = Nip19.decode(npub);
      if (type !== Nip19DataType.Npubkey) return null;

      let user:
        | EventSetMetadataContent
        | (EventSetMetadataContent & { created_at })
        | null = null;

      const userMapItem = userMap.get(pubkey);
      if (userMapItem) {
        user = userMapItem;
      }

      if (!user) {
        const _user = await OneTimeWebSocketClient.fetchProfile({ pubkey, relays: fallbackRelays });
        if (_user) {
          user = _user;
        }
      }

      return {
        key,
        profile: user,
        pubkey,
      };
    };

    for (const key of match) {
      const result = await transform(key);
      if (result) results.push(result);
    }

    return results;
  }

  static async transformNprofile(
    content: string,
    userMap: UserMap,
    fallbackRelays: string[],
  ) {
    const results: NprofileResult[] = [];

    const match = /nostr:nprofile\S*\b/g.exec(content);
    if (match == null || match?.length === 0) return results;

    const transform = async (key: string) => {
      const nprofile = key.split(':')[1];
      const { type, data: _data } = Nip19.decodeShareable(nprofile);
      if (type !== Nip19ShareableDataType.Nprofile) return null;
      const decodedMetadata = _data as DecodedNprofileResult;
      const pubkey = decodedMetadata.pubkey;

      let user:
        | EventSetMetadataContent
        | (EventSetMetadataContent & { created_at })
        | null = null;

      const userMapItem = userMap.get(pubkey);
      if (userMapItem) {
        user = userMapItem;
      }

      if (!user) {
        const relays = decodedMetadata.relays || fallbackRelays;
        let _user = await OneTimeWebSocketClient.fetchProfile({ pubkey, relays });
        if (_user == null && decodedMetadata.relays) {
          _user = await OneTimeWebSocketClient.fetchProfile({ pubkey, relays: fallbackRelays });
        }

        if (_user) {
          user = _user;
        }
      }

      return {
        key,
        decodedMetadata,
        profile: user,
      };
    };

    for (const key of match) {
      const result = await transform(key);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  static async transformNote(content: string, fallbackRelays: string[]) {
    const results: NoteResult[] = [];

    const match = /nostr:note\S*\b/g.exec(content);
    if (match == null || match?.length === 0) return results;

    const transform = async (key: string) => {
      const encodedData = key.split(':')[1];
      const { type, data: eventId } = Nip19.decode(encodedData);
      if (type !== Nip19DataType.EventId) return null;

      const noteEvent = await OneTimeWebSocketClient.fetchEvent({
        eventId,
        relays: fallbackRelays,
      });

      return {
        key,
        noteEvent,
        eventId,
      };
    };

    for (const key of match) {
      const result = await transform(key);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  static async transformNevent(content: string, userMap: UserMap) {
    const results: NeventResult[] = [];

    const match = /nostr:nevent\S*\b/g.exec(content);
    if (match == null || match?.length === 0) return results;

    const transform = async (key: string) => {
      const nevent = key.split(':')[1];
      const { type, data: _data } = Nip19.decodeShareable(nevent);
      if (type !== Nip19ShareableDataType.Nevent) return null;

      const decodedMetadata = _data as DecodedNeventResult;
      const noteEvent = await OneTimeWebSocketClient.fetchEvent({
        eventId: decodedMetadata.id,
        relays: decodedMetadata.relays,
      });

      return {
        key,
        noteEvent,
        decodedMetadata,
      };
    };

    for (const key of match) {
      const result = await transform(key);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  static async transformNaddr(content: string, fallbackRelays: string[]) {
    const results: NaddrResult[] = [];

    const match = /nostr:naddr\S*\b/g.exec(content);
    if (match == null || match?.length === 0) return results;

    const transform = async (key: string) => {
      const naddr = key.split(':')[1];
      const { type, data: _data } = Nip19.decodeShareable(naddr);
      if (type !== Nip19ShareableDataType.Naddr) return null;
      const decodedMetadata = _data as DecodedNaddrResult;

      const pubkey = decodedMetadata.pubkey;
      const identifier = decodedMetadata.identifier;
      const kind = decodedMetadata.kind;
      const relays = decodedMetadata.relays;

      let replaceableEvent = await OneTimeWebSocketClient.fetchReplaceableEvent({
        kind,
        identifier,
        pubkey,
        relays,
      });

      if (!replaceableEvent) {
        replaceableEvent = await OneTimeWebSocketClient.fetchReplaceableEvent({
          kind,
          identifier,
          pubkey,
          relays: fallbackRelays,
        });
      }

      return {
        key,
        decodedMetadata,
        replaceableEvent,
      };
    };

    for (const key of match) {
      const result = await transform(key);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  static async transformNrelay(content: string) {
    const results: NrelayResult[] = [];

    const match = /nostr:nrelay\S*\b/g.exec(content);
    if (match == null || match?.length === 0) return results;

    const transform = async (key: string) => {
      const nrelay = key.split(':')[1];
      const { type, data: _data } = Nip19.decodeShareable(nrelay);
      if (type !== Nip19ShareableDataType.Nrelay) return null;
      const relay = _data as DecodedNrelayResult;

      return {
        key,
        decodedMetadata: relay,
      };
    };

    for (const key of match) {
      const result = await transform(key);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }
}
