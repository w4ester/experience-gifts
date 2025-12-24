import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Copy, Check, Gamepad2, Grid3X3, LayoutGrid, Type, Users, Wifi, WifiOff, RefreshCw, HelpCircle, X, QrCode, Link, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import LZString from 'lz-string';
import { PeerConnection } from '../utils/peerConnection';

// Compress/decompress connection codes for shorter URLs
const compressCode = (code) => {
  try {
    return LZString.compressToEncodedURIComponent(code);
  } catch {
    return null;
  }
};

const decompressCode = (compressed) => {
  try {
    return LZString.decompressFromEncodedURIComponent(compressed);
  } catch {
    return null;
  }
};

// Generate shareable URL with compressed code
const getJoinUrl = (code, isAnswer = false) => {
  const compressed = compressCode(code);
  const param = isAnswer ? 'answer' : 'join';
  return `${window.location.origin}${window.location.pathname}?game=${param}=${compressed}`;
};

// Get code from URL if present
const getCodeFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get('game');
  if (joinCode) {
    if (joinCode.startsWith('join=')) {
      return { type: 'offer', code: decompressCode(joinCode.replace('join=', '')) };
    }
    if (joinCode.startsWith('answer=')) {
      return { type: 'answer', code: decompressCode(joinCode.replace('answer=', '')) };
    }
  }
  return null;
};

// Word list for Wordle (5-letter words)
const WORDS = ['GIFTS', 'HAPPY', 'JOLLY', 'MERRY', 'PEACE', 'CHEER', 'GRACE', 'HEART', 'LOVED', 'SWEET', 'FAITH', 'BLESS', 'LIGHT', 'SHINE', 'BRIGHT', 'DREAM', 'HOPES', 'JOYFUL', 'SMILE', 'LAUGH'];

export default function Games({ onBack }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [isHost, setIsHost] = useState(false);
  const [offerCode, setOfferCode] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState('choose'); // choose, host-waiting, guest-joining, connected
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [playerRole, setPlayerRole] = useState(null); // 'X' or 'O' for tic-tac-toe, 1 or 2 for others
  const [showHelp, setShowHelp] = useState(false);
  const [showQR, setShowQR] = useState(true);
  const [urlFromParams, setUrlFromParams] = useState(null);

  const peerRef = useRef(null);

  // Check URL for join code on mount
  useEffect(() => {
    const urlCode = getCodeFromUrl();
    if (urlCode && urlCode.code) {
      setUrlFromParams(urlCode);
      if (urlCode.type === 'offer') {
        // Someone shared an offer URL - go to guest joining
        setIsHost(false);
        setStep('guest-joining');
        setInputCode(urlCode.code);
      } else if (urlCode.type === 'answer') {
        // Someone shared an answer URL - host needs to accept
        setInputCode(urlCode.code);
      }
      // Clear URL params
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Handle incoming messages
  const handleMessage = (data) => {
    if (data.type === 'game-state') {
      setGameState(data.state);
    } else if (data.type === 'game-select') {
      setSelectedGame(data.game);
      setGameState(data.initialState);
    } else if (data.type === 'role-assign') {
      setPlayerRole(data.role);
    }
  };

  // Handle connection status changes
  const handleConnectionChange = (status) => {
    setConnectionStatus(status);
    if (status === 'connected') {
      setStep('connected');
      // Host assigns roles
      if (isHost) {
        const role = Math.random() > 0.5 ? 'X' : 'O';
        setPlayerRole(role);
        peerRef.current?.send({ type: 'role-assign', role: role === 'X' ? 'O' : 'X' });
      }
    }
  };

  // Create connection as host
  const startAsHost = async () => {
    setIsHost(true);
    setStep('host-waiting');
    setConnectionStatus('connecting');

    peerRef.current = new PeerConnection(handleMessage, handleConnectionChange);
    const code = await peerRef.current.createOffer();
    setOfferCode(code);
  };

  // Join as guest
  const startAsGuest = () => {
    setIsHost(false);
    setStep('guest-joining');
  };

  // Guest accepts host's offer
  const joinWithCode = async () => {
    if (!inputCode.trim()) return;

    setConnectionStatus('connecting');
    peerRef.current = new PeerConnection(handleMessage, handleConnectionChange);

    try {
      const answer = await peerRef.current.acceptOffer(inputCode.trim());
      setAnswerCode(answer);
    } catch (e) {
      alert('Invalid code. Please try again.');
      setConnectionStatus('disconnected');
    }
  };

  // Host accepts guest's answer
  const acceptAnswer = async () => {
    if (!inputCode.trim()) return;

    try {
      await peerRef.current.acceptAnswer(inputCode.trim());
    } catch (e) {
      alert('Invalid answer code. Please try again.');
    }
  };

  // Copy to clipboard
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send game state to peer
  const sendGameState = (state) => {
    setGameState(state);
    peerRef.current?.send({ type: 'game-state', state });
  };

  // Select a game (host only)
  const selectGame = (game) => {
    const initialState = getInitialState(game);
    setSelectedGame(game);
    setGameState(initialState);
    peerRef.current?.send({ type: 'game-select', game, initialState });
  };

  // Get initial state for a game
  const getInitialState = (game) => {
    switch (game) {
      case 'tictactoe':
        return { board: Array(9).fill(null), currentPlayer: 'X', winner: null };
      case 'matching':
        const emojis = ['🎁', '🎄', '⭐', '🔔', '❄️', '🦌', '🎅', '🤶'];
        const cards = [...emojis, ...emojis]
          .sort(() => Math.random() - 0.5)
          .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
        return { cards, flippedCards: [], currentPlayer: 1, scores: { 1: 0, 2: 0 } };
      case 'wordle':
        return {
          word: WORDS[Math.floor(Math.random() * WORDS.length)],
          guesses: [],
          currentGuess: '',
          currentPlayer: 1,
          gameOver: false,
          won: false
        };
      default:
        return null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerRef.current?.close();
    };
  }, []);

  // Render connection setup
  if (step !== 'connected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-md mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl min-h-[44px] min-w-[44px]">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-xl font-bold text-gray-800">Play Together</h2>
            </div>
            <button onClick={() => setShowHelp(true)} className="p-2 hover:bg-gray-100 rounded-xl min-h-[44px] min-w-[44px]">
              <HelpCircle className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {step === 'choose' && (
            <div className="space-y-4">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Gamepad2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Real-Time Family Games</h3>
                <p className="text-gray-500 text-sm mt-1">Connect directly — your game data stays private</p>
              </div>

              <button
                onClick={startAsHost}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl p-5 text-left hover:shadow-lg transition-all"
              >
                <div className="font-semibold text-lg">Start a Game</div>
                <div className="text-purple-100 text-sm">Create a code to share with family</div>
              </button>

              <button
                onClick={startAsGuest}
                className="w-full bg-white border-2 border-gray-200 rounded-2xl p-5 text-left hover:border-purple-300 transition-all"
              >
                <div className="font-semibold text-gray-800">Join a Game</div>
                <div className="text-gray-500 text-sm">Enter a code from family member</div>
              </button>
            </div>
          )}

          {step === 'host-waiting' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-600">1</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">Share with family</div>
                      <div className="text-sm text-gray-500">Scan QR or send link</div>
                    </div>
                  </div>
                  {/* Toggle QR/Link view */}
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title={showQR ? "Show link" : "Show QR code"}
                  >
                    {showQR ? <Link className="w-5 h-5 text-gray-500" /> : <QrCode className="w-5 h-5 text-gray-500" />}
                  </button>
                </div>

                {offerCode ? (
                  showQR ? (
                    <div className="flex flex-col items-center mb-4">
                      <div className="bg-white p-4 rounded-xl border-2 border-purple-100">
                        <QRCodeSVG
                          value={getJoinUrl(offerCode)}
                          size={180}
                          level="L"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                        <Smartphone className="w-4 h-4" />
                        <span>Scan with phone camera</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-xl p-3 mb-3">
                      <div className="text-xs text-gray-600 break-all font-mono max-h-20 overflow-y-auto">
                        {getJoinUrl(offerCode)}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-gray-400">Generating...</div>
                )}

                <button
                  onClick={() => copyCode(getJoinUrl(offerCode))}
                  disabled={!offerCode}
                  className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-purple-600">2</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">Paste their response</div>
                    <div className="text-sm text-gray-500">They'll send back a response code</div>
                  </div>
                </div>

                <textarea
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Paste the response code here..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none text-sm font-mono min-h-[80px] resize-none"
                />

                <button
                  onClick={acceptAnswer}
                  disabled={!inputCode.trim()}
                  className="w-full mt-3 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium disabled:opacity-50 min-h-[44px]"
                >
                  Connect
                </button>
              </div>
            </div>
          )}

          {step === 'guest-joining' && (
            <div className="space-y-6">
              {!answerCode ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {urlFromParams?.type === 'offer' ? 'Ready to join!' : 'Enter their code'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {urlFromParams?.type === 'offer' ? 'Tap Join to connect' : 'Paste the link or code they sent'}
                      </div>
                    </div>
                  </div>

                  {!urlFromParams?.type && (
                    <textarea
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      placeholder="Paste link or code here..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm font-mono min-h-[80px] resize-none"
                    />
                  )}

                  <button
                    onClick={joinWithCode}
                    disabled={!inputCode.trim()}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium disabled:opacity-50 min-h-[44px]"
                  >
                    Join Game
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-blue-600">2</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Send this back</div>
                        <div className="text-sm text-gray-500">Share QR or send link to host</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowQR(!showQR)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title={showQR ? "Show link" : "Show QR code"}
                    >
                      {showQR ? <Link className="w-5 h-5 text-gray-500" /> : <QrCode className="w-5 h-5 text-gray-500" />}
                    </button>
                  </div>

                  {showQR ? (
                    <div className="flex flex-col items-center mb-4">
                      <div className="bg-white p-4 rounded-xl border-2 border-blue-100">
                        <QRCodeSVG
                          value={getJoinUrl(answerCode, true)}
                          size={180}
                          level="L"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                        <Smartphone className="w-4 h-4" />
                        <span>Host scans this to connect</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-xl p-3 mb-3">
                      <div className="text-xs text-gray-600 break-all font-mono max-h-20 overflow-y-auto">
                        {getJoinUrl(answerCode, true)}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => copyCode(getJoinUrl(answerCode, true))}
                    className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>

                  <div className="mt-4 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      Waiting for connection...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help Modal */}
          {showHelp && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
                  <h3 className="text-lg font-bold text-gray-800">How to Connect</h3>
                  <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-5 space-y-6">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🎮</div>
                    <p className="text-gray-600 text-sm">Play games together in real-time — your data stays private!</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-purple-600">1</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">One person starts</div>
                        <div className="text-sm text-gray-500">Tap "Start a Game" to get a QR code</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-purple-600">2</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Share it</div>
                        <div className="text-sm text-gray-500">Same room? Scan QR. Far away? Send the link!</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">3</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Other person joins</div>
                        <div className="text-sm text-gray-500">Scan/click opens the game ready to join</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">4</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Send response QR/link</div>
                        <div className="text-sm text-gray-500">They share their QR or link back to you</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-green-600">5</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Connected!</div>
                        <div className="text-sm text-gray-500">Scan/paste their response and play!</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">Why codes?</div>
                    <div className="text-xs text-gray-500">
                      This connects you directly device-to-device. No server stores your game — it's completely private between you and your family!
                    </div>
                  </div>

                  <button
                    onClick={() => setShowHelp(false)}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium min-h-[44px]"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Connected - show game selection or active game
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-md mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-green-600">
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <button onClick={() => setShowHelp(true)} className="p-2 hover:bg-gray-100 rounded-xl min-h-[44px] min-w-[44px]">
              <HelpCircle className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {!selectedGame ? (
          // Game selection (host picks)
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                {isHost ? 'Choose a Game' : 'Waiting for host to pick...'}
              </h3>
              <p className="text-gray-500 text-sm">You are Player {playerRole}</p>
            </div>

            {isHost && (
              <div className="grid gap-4">
                <button
                  onClick={() => selectGame('tictactoe')}
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-purple-300 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Grid3X3 className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Tic-Tac-Toe</div>
                      <div className="text-sm text-gray-500">Classic X's and O's</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => selectGame('matching')}
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-blue-300 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <LayoutGrid className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Memory Match</div>
                      <div className="text-sm text-gray-500">Find the matching pairs</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => selectGame('wordle')}
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-green-300 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Type className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Word Guess</div>
                      <div className="text-sm text-gray-500">Guess the 5-letter word together</div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {!isHost && (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Host is selecting a game...</p>
              </div>
            )}
          </div>
        ) : (
          // Active game
          <div>
            {selectedGame === 'tictactoe' && (
              <TicTacToe
                gameState={gameState}
                playerRole={playerRole}
                onMove={sendGameState}
                onNewGame={() => selectGame('tictactoe')}
                isHost={isHost}
              />
            )}
            {selectedGame === 'matching' && (
              <MatchingGame
                gameState={gameState}
                playerRole={playerRole === 'X' ? 1 : 2}
                onMove={sendGameState}
                onNewGame={() => selectGame('matching')}
                isHost={isHost}
              />
            )}
            {selectedGame === 'wordle' && (
              <WordleGame
                gameState={gameState}
                playerRole={playerRole === 'X' ? 1 : 2}
                onMove={sendGameState}
                onNewGame={() => selectGame('wordle')}
                isHost={isHost}
              />
            )}

            <button
              onClick={() => {
                setSelectedGame(null);
                peerRef.current?.send({ type: 'game-select', game: null, initialState: null });
              }}
              className="w-full mt-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 min-h-[44px]"
            >
              Choose Different Game
            </button>
          </div>
        )}

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
                <h3 className="text-lg font-bold text-gray-800">How to Play</h3>
                <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3">
                  <Wifi className="w-5 h-5 text-green-600" />
                  <div className="text-sm text-green-700">You're connected! Game moves sync instantly.</div>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-gray-800">Game Tips:</div>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Tic-Tac-Toe:</strong> Take turns placing X's and O's. Get 3 in a row to win!</p>
                    <p><strong>Memory Match:</strong> Take turns flipping cards. Match pairs to score points!</p>
                    <p><strong>Word Guess:</strong> Take turns guessing the 5-letter word. Green = right spot, Yellow = wrong spot.</p>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="text-sm text-purple-700">
                    <strong>Privacy:</strong> All moves go directly between your devices. No server sees your game!
                  </div>
                </div>

                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium min-h-[44px]"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tic-Tac-Toe Component
function TicTacToe({ gameState, playerRole, onMove, onNewGame, isHost }) {
  const { board, currentPlayer, winner } = gameState;

  const handleClick = (index) => {
    if (board[index] || winner || currentPlayer !== playerRole) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;

    const newWinner = checkWinner(newBoard);
    const isDraw = !newWinner && newBoard.every(cell => cell);

    onMove({
      board: newBoard,
      currentPlayer: currentPlayer === 'X' ? 'O' : 'X',
      winner: newWinner || (isDraw ? 'draw' : null)
    });
  };

  const checkWinner = (b) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b1, c] of lines) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    }
    return null;
  };

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Tic-Tac-Toe</h3>
      <p className="text-gray-500 mb-4">
        You are <span className="font-bold text-purple-600">{playerRole}</span>
        {!winner && (
          currentPlayer === playerRole
            ? " — Your turn!"
            : " — Waiting for opponent..."
        )}
      </p>

      <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto mb-6">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={cell || winner || currentPlayer !== playerRole}
            className={`aspect-square rounded-xl text-4xl font-bold flex items-center justify-center transition-all min-h-[80px] ${
              cell
                ? 'bg-gray-100'
                : currentPlayer === playerRole
                ? 'bg-purple-100 hover:bg-purple-200'
                : 'bg-gray-50'
            } ${cell === 'X' ? 'text-purple-600' : 'text-blue-600'}`}
          >
            {cell}
          </button>
        ))}
      </div>

      {winner && (
        <div className="mb-4">
          <div className={`text-xl font-bold ${winner === 'draw' ? 'text-gray-600' : 'text-green-600'}`}>
            {winner === 'draw' ? "It's a draw!" : winner === playerRole ? 'You win!' : 'You lost!'}
          </div>
          {isHost && (
            <button
              onClick={onNewGame}
              className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-full font-medium flex items-center gap-2 mx-auto min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Matching Game Component
function MatchingGame({ gameState, playerRole, onMove, onNewGame, isHost }) {
  const { cards, currentPlayer, scores } = gameState;
  const flippedCards = cards.filter(c => c.flipped && !c.matched);

  const handleCardClick = (cardId) => {
    if (currentPlayer !== playerRole) return;
    if (flippedCards.length >= 2) return;

    const card = cards.find(c => c.id === cardId);
    if (card.flipped || card.matched) return;

    const newCards = cards.map(c =>
      c.id === cardId ? { ...c, flipped: true } : c
    );

    const newFlipped = newCards.filter(c => c.flipped && !c.matched);

    if (newFlipped.length === 2) {
      // Check for match
      setTimeout(() => {
        const [first, second] = newFlipped;
        const isMatch = first.emoji === second.emoji;

        const finalCards = newCards.map(c => {
          if (c.id === first.id || c.id === second.id) {
            return { ...c, flipped: isMatch, matched: isMatch };
          }
          return c;
        });

        onMove({
          cards: finalCards,
          currentPlayer: isMatch ? currentPlayer : (currentPlayer === 1 ? 2 : 1),
          scores: isMatch
            ? { ...scores, [currentPlayer]: scores[currentPlayer] + 1 }
            : scores
        });
      }, 1000);
    }

    onMove({ ...gameState, cards: newCards });
  };

  const allMatched = cards.every(c => c.matched);
  const winner = allMatched ? (scores[1] > scores[2] ? 1 : scores[2] > scores[1] ? 2 : 'tie') : null;

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Memory Match</h3>

      <div className="flex justify-center gap-6 mb-4">
        <div className={`px-4 py-2 rounded-full ${playerRole === 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
          You: {scores[playerRole]}
        </div>
        <div className={`px-4 py-2 rounded-full ${playerRole !== 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
          Them: {scores[playerRole === 1 ? 2 : 1]}
        </div>
      </div>

      <p className="text-gray-500 mb-4">
        {currentPlayer === playerRole ? "Your turn!" : "Waiting for opponent..."}
      </p>

      <div className="grid grid-cols-4 gap-2 max-w-[320px] mx-auto mb-6">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.flipped || card.matched || currentPlayer !== playerRole}
            className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all min-h-[60px] ${
              card.flipped || card.matched
                ? 'bg-white border-2 border-purple-200'
                : currentPlayer === playerRole
                ? 'bg-purple-500 hover:bg-purple-600'
                : 'bg-gray-400'
            }`}
          >
            {(card.flipped || card.matched) ? card.emoji : ''}
          </button>
        ))}
      </div>

      {winner && (
        <div className="mb-4">
          <div className="text-xl font-bold text-green-600">
            {winner === 'tie' ? "It's a tie!" : winner === playerRole ? 'You win!' : 'You lost!'}
          </div>
          {isHost && (
            <button
              onClick={onNewGame}
              className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-full font-medium flex items-center gap-2 mx-auto min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Wordle-style Game Component
function WordleGame({ gameState, playerRole, onMove, onNewGame, isHost }) {
  const { word, guesses, currentGuess, currentPlayer, gameOver, won } = gameState;
  const [localGuess, setLocalGuess] = useState('');

  const isMyTurn = currentPlayer === playerRole;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isMyTurn || localGuess.length !== 5) return;

    const guess = localGuess.toUpperCase();
    const newGuesses = [...guesses, guess];
    const isWon = guess === word;
    const isOver = isWon || newGuesses.length >= 6;

    onMove({
      ...gameState,
      guesses: newGuesses,
      currentGuess: '',
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      gameOver: isOver,
      won: isWon
    });

    setLocalGuess('');
  };

  const getLetterColor = (letter, index, guess) => {
    if (word[index] === letter) return 'bg-green-500 text-white';
    if (word.includes(letter)) return 'bg-yellow-500 text-white';
    return 'bg-gray-400 text-white';
  };

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Word Guess</h3>
      <p className="text-gray-500 mb-4">
        Take turns guessing the 5-letter word!
        {!gameOver && (isMyTurn ? " — Your turn!" : " — Waiting for opponent...")}
      </p>

      <div className="space-y-2 mb-6">
        {Array(6).fill(null).map((_, rowIndex) => {
          const guess = guesses[rowIndex];
          return (
            <div key={rowIndex} className="flex justify-center gap-1">
              {Array(5).fill(null).map((_, colIndex) => {
                const letter = guess?.[colIndex] || '';
                return (
                  <div
                    key={colIndex}
                    className={`w-12 h-12 flex items-center justify-center text-xl font-bold rounded-lg ${
                      guess ? getLetterColor(letter, colIndex, guess) : 'bg-gray-200'
                    }`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {!gameOver && isMyTurn && (
        <form onSubmit={handleSubmit} className="flex gap-2 justify-center">
          <input
            type="text"
            value={localGuess}
            onChange={(e) => setLocalGuess(e.target.value.slice(0, 5))}
            placeholder="Enter guess"
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none text-center uppercase font-bold tracking-widest w-40 min-h-[44px]"
            maxLength={5}
          />
          <button
            type="submit"
            disabled={localGuess.length !== 5}
            className="px-6 py-3 bg-purple-500 text-white rounded-xl font-medium disabled:opacity-50 min-h-[44px]"
          >
            Guess
          </button>
        </form>
      )}

      {gameOver && (
        <div className="mb-4">
          <div className={`text-xl font-bold ${won ? 'text-green-600' : 'text-gray-600'}`}>
            {won ? 'You got it!' : `The word was: ${word}`}
          </div>
          {isHost && (
            <button
              onClick={onNewGame}
              className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-full font-medium flex items-center gap-2 mx-auto min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
