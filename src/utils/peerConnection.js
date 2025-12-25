/**
 * WebRTC Peer Connection Utility
 * Enables direct device-to-device communication with no middleman
 */

// ICE servers for NAT traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export class PeerConnection {
  constructor(onMessage, onConnectionChange) {
    this.pc = null;
    this.dataChannel = null;
    this.onMessage = onMessage;
    this.onConnectionChange = onConnectionChange;
    this.isHost = false;
  }

  // Create a new peer connection
  _createPeerConnection() {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        this.onConnectionChange?.('connected');
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.onConnectionChange?.('disconnected');
      }
    };

    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this._setupDataChannel();
    };
  }

  _setupDataChannel() {
    this.dataChannel.onopen = () => {
      this.onConnectionChange?.('connected');
    };

    this.dataChannel.onclose = () => {
      this.onConnectionChange?.('disconnected');
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage?.(data);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }

  // HOST: Create an offer code for the other player to use
  async createOffer() {
    this.isHost = true;
    this._createPeerConnection();

    // Create data channel
    this.dataChannel = this.pc.createDataChannel('game');
    this._setupDataChannel();

    // Create offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Wait for ICE candidates to be gathered
    await this._waitForIceGathering();

    // Encode the offer as a shareable string
    const offerData = {
      type: 'offer',
      sdp: this.pc.localDescription.sdp,
    };

    return btoa(JSON.stringify(offerData));
  }

  // GUEST: Accept an offer and create an answer
  async acceptOffer(offerCode) {
    this.isHost = false;
    this._createPeerConnection();

    try {
      const offerData = JSON.parse(atob(offerCode));

      await this.pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: offerData.sdp,
      }));

      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      // Wait for ICE candidates
      await this._waitForIceGathering();

      const answerData = {
        type: 'answer',
        sdp: this.pc.localDescription.sdp,
      };

      return btoa(JSON.stringify(answerData));
    } catch (e) {
      console.error('Failed to accept offer:', e);
      throw new Error('Invalid connection code');
    }
  }

  // HOST: Accept the answer from guest to complete connection
  async acceptAnswer(answerCode) {
    try {
      const answerData = JSON.parse(atob(answerCode));

      await this.pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: answerData.sdp,
      }));

      return true;
    } catch (e) {
      console.error('Failed to accept answer:', e);
      throw new Error('Invalid answer code');
    }
  }

  // Wait for ICE gathering to complete
  _waitForIceGathering() {
    return new Promise((resolve) => {
      if (this.pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (this.pc.iceGatheringState === 'complete') {
          this.pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      this.pc.addEventListener('icegatheringstatechange', checkState);

      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    });
  }

  // Send a message to the peer
  send(data) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  // Close the connection
  close() {
    this.dataChannel?.close();
    this.pc?.close();
    this.dataChannel = null;
    this.pc = null;
  }

  // Check if connected
  isConnected() {
    return this.dataChannel?.readyState === 'open';
  }
}
