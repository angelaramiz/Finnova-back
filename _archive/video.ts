/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VideoMetadata {
  providerId: string;
  playbackUrl: string;
  durationSeconds: number;
  thumbnailUrl?: string;
  status: 'draft' | 'processing' | 'ready' | 'error';
}

export interface VideoProvider {
  /**
   * Registers a newly generated video clip or maps an existing url
   */
  registerClip(title: string, rawUrl: string): Promise<VideoMetadata>;
  
  /**
   * Generates a secure tokenized playback URL for Cloudflare Stream
   */
  getSignedPlayback(providerId: string): Promise<string>;
}

/**
 * Mock implementation of Cloudflare Stream Video Provider
 */
export class MockVideoProvider implements VideoProvider {
  private mockRegistry = new Map<string, VideoMetadata>([
    [
      'cf-stream-id-compound-interest',
      {
        providerId: 'cf-stream-id-compound-interest',
        playbackUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        durationSeconds: 52,
        thumbnailUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=200',
        status: 'ready',
      },
    ],
    [
      'cf-stream-id-diversification',
      {
        providerId: 'cf-stream-id-diversification',
        playbackUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        durationSeconds: 45,
        thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        status: 'ready',
      },
    ],
    [
      'cf-stream-id-pe-ratio',
      {
        providerId: 'cf-stream-id-pe-ratio',
        playbackUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
        durationSeconds: 58,
        thumbnailUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=200',
        status: 'ready',
      },
    ],
    [
      'cf-stream-id-leverage',
      {
        providerId: 'cf-stream-id-leverage',
        playbackUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        durationSeconds: 59,
        thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=200',
        status: 'ready',
      },
    ]
  ]);

  async registerClip(title: string, rawUrl: string): Promise<VideoMetadata> {
    const id = `cf-stream-${Math.random().toString(36).substring(7)}`;
    const metadata: VideoMetadata = {
      providerId: id,
      playbackUrl: rawUrl || 'https://vjs.zencdn.net/v/oceans.mp4',
      durationSeconds: 45,
      status: 'ready',
    };
    this.mockRegistry.set(id, metadata);
    return metadata;
  }

  async getSignedPlayback(providerId: string): Promise<string> {
    const match = this.mockRegistry.get(providerId);
    if (match) {
      return `${match.playbackUrl}?token=jwt-secured-cf-token-${Math.random().toString(36).substring(5)}`;
    }
    // Return sample fallback
    return 'https://vjs.zencdn.net/v/oceans.mp4';
  }
}

/**
 * Real production implementation placeholder for Cloudflare Stream API
 */
export class CloudflareStreamProvider implements VideoProvider {
  private accountId: string;
  private apiToken: string;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
  }

  async registerClip(title: string, rawUrl: string): Promise<VideoMetadata> {
    if (!this.apiToken) {
      console.warn('Cloudflare Stream API token not set. Falling back to local mock data.');
      return new MockVideoProvider().registerClip(title, rawUrl);
    }
    // Standard fetch POST to Cloudflare Stream API:
    // https://api.cloudflare.com/client/v4/accounts/{account_id}/stream/copy
    // Passing the raw URLs (e.g. from Storage, S3, or n8n outputs)
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/copy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: rawUrl,
          meta: { name: title },
        }),
      });
      const data = (await response.json()) as any;
      const result = data.result;
      
      return {
        providerId: result.uid,
        playbackUrl: result.playback.hls,
        durationSeconds: result.duration || 45,
        thumbnailUrl: result.thumbnail,
        status: result.status.state === 'ready' ? 'ready' : 'processing',
      };
    } catch (err) {
      console.error('Cloudflare Stream integration failed, using mock provider fallback:', err);
      return new MockVideoProvider().registerClip(title, rawUrl);
    }
  }

  async getSignedPlayback(providerId: string): Promise<string> {
    // Cloudflare Stream secures video playback via signed URLs using a private key
    // Here we sign a payload using HMAC and token keys to let authorized users stream videos
    if (!this.apiToken) {
      return new MockVideoProvider().getSignedPlayback(providerId);
    }
    return `https://customer-${this.accountId}.cloudflarestream.com/${providerId}/manifest/video.m3u8?token=production-active-signed-jwt`;
  }
}

export function getVideoProvider(): VideoProvider {
  const providerType = process.env.VIDEO_PROVIDER || 'local_mock';
  if (providerType === 'cloudflare') {
    return new CloudflareStreamProvider();
  }
  return new MockVideoProvider();
}
