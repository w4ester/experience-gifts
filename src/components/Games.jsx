// Games - Simple room codes via signaling server
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Copy, Check, Gamepad2, Grid3X3, LayoutGrid, Type, Wifi, RefreshCw, HelpCircle, X, Users, Circle, Flower2, Hand, Grid2X2, LogOut, Hexagon } from 'lucide-react';
import { PeerConnection } from '../utils/peerConnection';
import { VALID_WORDS } from '../utils/wordList';
import { BEE_WORDS } from '../utils/beeWordList';

// Word list for Wordle answers - common 5-letter words (subset for answers)
const ANSWER_WORDS = Array.from(VALID_WORDS).filter(w =>
  // Filter to common words good for answers
  ['ABOUT', 'ABOVE', 'ACTOR', 'ADULT', 'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'ALARM', 'ALBUM', 'ALLOW', 'ALONE', 'ALONG', 'ANGEL', 'ANGRY', 'APPLE', 'ARENA', 'ARGUE', 'ARISE', 'AUDIO', 'AWARD', 'BEACH', 'BEAST', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BLACK', 'BLAME', 'BLANK', 'BLAST', 'BLEND', 'BLIND', 'BLOCK', 'BLOOD', 'BOARD', 'BRAIN', 'BRAND', 'BRAVE', 'BREAD', 'BREAK', 'BRING', 'BROAD', 'BROWN', 'BUILD', 'CABIN', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHARM', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHILD', 'CHINA', 'CHOSE', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOUD', 'COACH', 'COAST', 'COULD', 'COUNT', 'COURT', 'COVER', 'CRAFT', 'CRANE', 'CRASH', 'CRATE', 'CRAZY', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'DAILY', 'DANCE', 'DEATH', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAIN', 'DRAMA', 'DRANK', 'DREAM', 'DRESS', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'EARTH', 'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'EQUAL', 'EVENT', 'EVERY', 'EXACT', 'EXTRA', 'FAITH', 'FALSE', 'FANCY', 'FAULT', 'FAVOR', 'FEAST', 'FIELD', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLAME', 'FLASH', 'FLOAT', 'FLOOD', 'FLOOR', 'FOCUS', 'FORCE', 'FORUM', 'FOUND', 'FRAME', 'FRANK', 'FRESH', 'FRONT', 'FRUIT', 'FUNNY', 'GHOST', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE', 'GLORY', 'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT', 'GRAPE', 'GRASP', 'GRASS', 'GRAVE', 'GREAT', 'GREEN', 'GREET', 'GRIEF', 'GROUP', 'GROVE', 'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'HABIT', 'HAPPY', 'HEARD', 'HEART', 'HEAVY', 'HELLO', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'HUMOR', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JAPAN', 'JOINT', 'JUDGE', 'JUICE', 'KNOCK', 'KNOWN', 'LABEL', 'LABOR', 'LARGE', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEMON', 'LEVEL', 'LIGHT', 'LIMIT', 'LINKS', 'LIVER', 'LIVES', 'LOCAL', 'LOGIC', 'LOOSE', 'LOWER', 'LOYAL', 'LUCKY', 'LUNCH', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MATCH', 'MAYBE', 'MAYOR', 'MEANS', 'MEANT', 'MEDAL', 'MEDIA', 'MERCY', 'MERIT', 'METAL', 'MIGHT', 'MINOR', 'MIXED', 'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NAKED', 'NERVE', 'NEVER', 'NIGHT', 'NOBLE', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCEAN', 'OFFER', 'OFTEN', 'OLIVE', 'OPERA', 'ORDER', 'OTHER', 'OUGHT', 'OUTER', 'OWNED', 'OWNER', 'PAINT', 'PANEL', 'PANIC', 'PAPER', 'PARTY', 'PASTA', 'PATCH', 'PAUSE', 'PEACE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'PLAZA', 'POINT', 'POLAR', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'PUPPY', 'QUEEN', 'QUEST', 'QUICK', 'QUIET', 'QUITE', 'QUOTE', 'RADIO', 'RAISE', 'RALLY', 'RANCH', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REALM', 'REBEL', 'REFER', 'REIGN', 'RELAX', 'REPLY', 'RIGHT', 'RIVAL', 'RIVER', 'ROBOT', 'ROMAN', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RULED', 'RULER', 'RURAL', 'SAINT', 'SALAD', 'SALES', 'SAUCE', 'SAVED', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SCOUT', 'SENSE', 'SERVE', 'SETUP', 'SEVEN', 'SHADE', 'SHAKE', 'SHALL', 'SHAME', 'SHAPE', 'SHARE', 'SHARP', 'SHEEP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORE', 'SHORT', 'SHOWN', 'SIGHT', 'SILLY', 'SINCE', 'SIXTH', 'SKILL', 'SLAVE', 'SLEEP', 'SLIDE', 'SLOPE', 'SMALL', 'SMART', 'SMELL', 'SMILE', 'SMOKE', 'SNAKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPARK', 'SPEAK', 'SPEED', 'SPELL', 'SPEND', 'SPENT', 'SPINE', 'SPLIT', 'SPOKE', 'SPORT', 'SPRAY', 'SQUAD', 'STACK', 'STAFF', 'STAGE', 'STAIR', 'STAKE', 'STAMP', 'STAND', 'STARK', 'START', 'STATE', 'STEAK', 'STEAM', 'STEEL', 'STEEP', 'STEER', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STRAP', 'STRAW', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUNNY', 'SUPER', 'SWAMP', 'SWEEP', 'SWEET', 'SWING', 'SWORD', 'TABLE', 'TAKEN', 'TASTE', 'TEACH', 'TEETH', 'TERMS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THIEF', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB', 'TIGER', 'TIGHT', 'TIMER', 'TIRED', 'TITLE', 'TOAST', 'TODAY', 'TOKEN', 'TORCH', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIL', 'TRAIN', 'TRAIT', 'TRASH', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRUCK', 'TRULY', 'TRUNK', 'TRUST', 'TRUTH', 'TWICE', 'TWIST', 'UNCLE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WAGON', 'WASTE', 'WATCH', 'WATER', 'WEIGH', 'WEIRD', 'WHALE', 'WHEAT', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WIDTH', 'WITCH', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRITE', 'WRONG', 'WROTE', 'YIELD', 'YOUNG', 'YOUTH'].includes(w)
);

export default function Games({ onBack }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState('choose'); // choose, host-waiting, guest-joining, connected
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const peerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Handle incoming messages from peer
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
      // Stop polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      // Host assigns roles
      if (isHost) {
        const role = Math.random() > 0.5 ? 'X' : 'O';
        setPlayerRole(role);
        peerRef.current?.send({ type: 'role-assign', role: role === 'X' ? 'O' : 'X' });
      }
    }
  };

  // HOST: Create room and start waiting
  const startAsHost = async () => {
    setIsHost(true);
    setStep('host-waiting');
    setConnectionStatus('connecting');
    setError('');

    try {
      // Create WebRTC offer
      peerRef.current = new PeerConnection(handleMessage, handleConnectionChange);
      const offer = await peerRef.current.createOffer();

      // Send offer to signaling server, get room code
      const res = await fetch(`/api/signal/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: offer })
      });

      if (!res.ok) throw new Error('Failed to create room');

      const { code } = await res.json();
      setRoomCode(code);

      // Poll for guest's answer (every 3 seconds, with retry tolerance)
      let notFoundCount = 0;
      pollIntervalRef.current = setInterval(async () => {
        try {
          const answerRes = await fetch(`/api/signal/${code}?answer`);
          if (answerRes.status === 200) {
            const { answer } = await answerRes.json();
            await peerRef.current.acceptAnswer(answer);
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          } else if (answerRes.status === 404) {
            // Give tolerance for serverless cold starts - only fail after 3 consecutive 404s
            notFoundCount++;
            if (notFoundCount >= 3) {
              clearInterval(pollIntervalRef.current);
              setError('Room expired. Please start again.');
              setStep('choose');
            }
          } else {
            // 202 or other - reset counter, room still exists
            notFoundCount = 0;
          }
        } catch (e) {
          // Network error, keep polling
        }
      }, 3000);

    } catch (e) {
      console.error('Start game error:', e);
      setError(`Failed to start game: ${e.message || 'Unknown error'}`);
      setStep('choose');
    }
  };

  // GUEST: Join with room code
  const joinWithCode = async () => {
    if (inputCode.length !== 4) {
      setError('Please enter a 4-character code');
      return;
    }

    setIsHost(false);
    setStep('guest-joining');
    setConnectionStatus('connecting');
    setError('');

    try {
      // Get host's offer from signaling server
      const offerRes = await fetch(`/api/signal/${inputCode.toLowerCase()}`);

      if (offerRes.status === 404) {
        setError('Room not found. Check the code and try again.');
        setStep('choose');
        return;
      }

      if (!offerRes.ok) throw new Error('Failed to join room');

      const { offer } = await offerRes.json();

      // Create WebRTC answer
      peerRef.current = new PeerConnection(handleMessage, handleConnectionChange);
      const answer = await peerRef.current.acceptOffer(offer);

      // Send answer to signaling server
      await fetch(`/api/signal/${inputCode.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: answer })
      });

      // Connection timeout - if not connected in 20 seconds, show error
      setTimeout(() => {
        if (step === 'guest-joining') {
          peerRef.current?.close();
          setError('Connection timed out. Both devices need to be online. Try again.');
          setStep('choose');
        }
      }, 20000);
    } catch (e) {
      console.error('Join game error:', e);
      setError(`Failed to join: ${e.message || 'Unknown error'}`);
      setStep('choose');
    }
  };

  // Copy room code to clipboard
  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
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
        // Host (player 1) always goes first
        return { board: Array(9).fill(null), currentPlayer: 1, winner: null };
      case 'matching':
        const emojis = ['🎁', '🎄', '⭐', '🔔', '❄️', '🦌', '🎅', '🤶'];
        const cards = [...emojis, ...emojis]
          .sort(() => Math.random() - 0.5)
          .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
        return { cards, flippedCards: [], currentPlayer: 1, scores: { 1: 0, 2: 0 } };
      case 'wordle':
        return {
          word: ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)],
          guesses: [],
          currentGuess: '',
          currentPlayer: 1,
          gameOver: false,
          won: false
        };
      case 'connect4':
        return {
          board: Array(6).fill(null).map(() => Array(7).fill(null)),
          currentPlayer: 1,
          winner: null
        };
      case 'flower':
        return {
          word: ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)],
          guessedLetters: [],
          wrongGuesses: 0,
          currentPlayer: 1,
          gameOver: false,
          won: false
        };
      case 'rps':
        return {
          round: 1,
          maxRounds: 3,
          choices: { 1: null, 2: null },
          scores: { 1: 0, 2: 0 },
          roundResult: null,
          gameOver: false
        };
      case 'dots':
        const size = 4;
        return {
          size,
          horizontalLines: Array(size + 1).fill(null).map(() => Array(size).fill(null)),
          verticalLines: Array(size).fill(null).map(() => Array(size + 1).fill(null)),
          boxes: Array(size).fill(null).map(() => Array(size).fill(null)),
          currentPlayer: 1,
          scores: { 1: 0, 2: 0 },
          gameOver: false
        };
      case 'spellingbee':
        // Generate 7 unique letters with at least 2 vowels
        const vowels = 'AEIOU'.split('');
        const consonants = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
        const shuffledVowels = vowels.sort(() => Math.random() - 0.5);
        const shuffledConsonants = consonants.sort(() => Math.random() - 0.5);
        const beeLetters = [
          ...shuffledVowels.slice(0, 2),
          ...shuffledConsonants.slice(0, 5)
        ].sort(() => Math.random() - 0.5);
        const centerLetter = beeLetters[0]; // First letter is center (required)

        // Find all valid words for this puzzle
        const letterSet = new Set(beeLetters);
        const validBeeWords = Array.from(BEE_WORDS).filter(word => {
          if (word.length < 4) return false;
          if (!word.includes(centerLetter)) return false;
          return word.split('').every(letter => letterSet.has(letter));
        });

        return {
          letters: beeLetters,
          centerLetter,
          validWords: validBeeWords,
          foundWords: [],
          scores: { 1: 0, 2: 0 },
          currentPlayer: 1,
          gameOver: false
        };
      default:
        return null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerRef.current?.close();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Connection setup screens
  if (step !== 'connected') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-purple-50 via-white to-blue-50 pb-safe">
        <div className="max-w-md mx-auto px-4 sm:px-6 py-6 pt-safe">
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

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Choose: Start or Join */}
          {step === 'choose' && (
            <div className="space-y-4">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Gamepad2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Real-Time Family Games</h3>
                <p className="text-gray-500 text-sm mt-1">Connect with a simple 4-letter code</p>
              </div>

              <button
                onClick={startAsHost}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl p-5 text-left hover:shadow-lg transition-all active:scale-[0.98] min-h-[72px]"
              >
                <div className="font-semibold text-lg">Start a Game</div>
                <div className="text-purple-100 text-sm">Get a code to share with family</div>
              </button>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="font-semibold text-gray-800 mb-3">Join a Game</div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toLowerCase().slice(0, 4))}
                    placeholder="enter code"
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none text-center text-[20px] font-bold tracking-[0.2em] lowercase min-h-[56px]"
                    maxLength={4}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                  />
                  <button
                    onClick={joinWithCode}
                    disabled={inputCode.length !== 4}
                    className="w-full py-4 bg-purple-500 text-white rounded-xl font-semibold disabled:opacity-50 min-h-[56px] active:scale-95 transition-transform text-lg"
                  >
                    Join Game
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Host: Waiting for guest */}
          {step === 'host-waiting' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <div className="mb-4">
                  <Users className="w-12 h-12 text-purple-500 mx-auto mb-2" />
                  <div className="text-gray-500 text-sm">Share this code with family:</div>
                </div>

                {roomCode ? (
                  <>
                    <div className="text-5xl font-bold text-purple-600 tracking-[0.3em] mb-6">
                      {roomCode}
                    </div>

                    <button
                      onClick={copyCode}
                      className="w-full py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-medium flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>

                    <div className="mt-6 text-center text-sm text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                        Waiting for them to join...
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto" />
                    <div className="text-gray-500 text-sm mt-4">Creating game...</div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                  peerRef.current?.close();
                  setStep('choose');
                  setRoomCode('');
                }}
                className="w-full py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 min-h-[48px] active:scale-[0.98] active:bg-gray-100 transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Guest: Connecting */}
          {step === 'guest-joining' && (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              <div className="text-lg font-semibold text-gray-800 mb-2">Connecting...</div>
              <div className="text-gray-500 text-sm">Joining game {inputCode}</div>
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
                <div className="p-5 space-y-5">
                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="font-bold text-purple-800 mb-2">Person 1 (Host)</div>
                    <div className="text-sm text-purple-700 space-y-1">
                      <p>1. Tap <strong>"Start New Game"</strong></p>
                      <p>2. You'll get a code like <strong>v6gb</strong></p>
                      <p>3. Share the code with your partner</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="font-bold text-blue-800 mb-2">Person 2 (Guest)</div>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>1. Type the 4-letter code</p>
                      <p>2. Tap <strong>"Join Game"</strong></p>
                      <p>3. Wait for connection (few seconds)</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-4">
                    <div className="font-bold text-amber-800 mb-2">Not Connecting?</div>
                    <div className="text-sm text-amber-700 space-y-1">
                      <p>• Turn off VPN on both devices</p>
                      <p>• Make sure code is entered correctly</p>
                      <p>• Try: one on WiFi, one on cellular</p>
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
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-purple-50 via-white to-blue-50 pb-safe">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-6 pt-safe">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              if (selectedGame) {
                // Playing a game - go back to game selection
                setSelectedGame(null);
              } else {
                // In game selection - exit completely
                peerRef.current?.close();
                onBack();
              }
            }}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-xl min-h-[44px] min-w-[44px]"
            title={selectedGame ? "Back to game menu" : "Exit"}
          >
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
            <button
              onClick={() => {
                peerRef.current?.close();
                onBack();
              }}
              className="p-2 hover:bg-red-100 rounded-xl min-h-[44px] min-w-[44px]"
              title="Disconnect and exit"
            >
              <LogOut className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>

        {!selectedGame ? (
          // Game selection
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
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-purple-300 transition-all text-left active:scale-[0.98] active:bg-purple-50 min-h-[72px]"
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
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-blue-300 transition-all text-left active:scale-[0.98] active:bg-blue-50 min-h-[72px]"
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
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-green-300 transition-all text-left active:scale-[0.98] active:bg-green-50 min-h-[72px]"
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

                <button
                  onClick={() => selectGame('connect4')}
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-red-300 transition-all text-left active:scale-[0.98] active:bg-red-50 min-h-[72px]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <Circle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Connect Four</div>
                      <div className="text-sm text-gray-500">Drop discs, get 4 in a row</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => selectGame('flower')}
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-pink-300 transition-all text-left active:scale-[0.98] active:bg-pink-50 min-h-[72px]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                      <Flower2 className="w-6 h-6 text-pink-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Flower</div>
                      <div className="text-sm text-gray-500">Guess letters, grow a flower</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => selectGame('rps')}
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-orange-300 transition-all text-left active:scale-[0.98] active:bg-orange-50 min-h-[72px]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Hand className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Rock Paper Scissors</div>
                      <div className="text-sm text-gray-500">Best of 3 rounds</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => selectGame('dots')}
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-teal-300 transition-all text-left active:scale-[0.98] active:bg-teal-50 min-h-[72px]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                      <Grid2X2 className="w-6 h-6 text-teal-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Dots and Boxes</div>
                      <div className="text-sm text-gray-500">Draw lines, complete squares</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => selectGame('spellingbee')}
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-yellow-300 transition-all text-left active:scale-[0.98] active:bg-yellow-50 min-h-[72px]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Hexagon className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Spelling Bee</div>
                      <div className="text-sm text-gray-500">Make words from 7 letters</div>
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
                playerRole={isHost ? 1 : 2}
                onMove={sendGameState}
                onNewGame={() => selectGame('tictactoe')}
                isHost={isHost}
              />
            )}
            {selectedGame === 'matching' && (
              <MatchingGame
                gameState={gameState}
                playerRole={isHost ? 1 : 2}
                onMove={sendGameState}
                onNewGame={() => selectGame('matching')}
                isHost={isHost}
              />
            )}
            {selectedGame === 'wordle' && (
              <WordleGame
                gameState={gameState}
                playerRole={isHost ? 1 : 2}
                onMove={sendGameState}
                onNewGame={() => selectGame('wordle')}
                isHost={isHost}
              />
            )}
            {selectedGame === 'connect4' && (
              <ConnectFour
                gameState={gameState}
                playerRole={isHost ? 1 : 2}
                onMove={sendGameState}
                onNewGame={() => selectGame('connect4')}
                isHost={isHost}
              />
            )}
            {selectedGame === 'flower' && (
              <FlowerGame
                gameState={gameState}
                playerRole={isHost ? 1 : 2}
                onMove={sendGameState}
                onNewGame={() => selectGame('flower')}
                isHost={isHost}
              />
            )}
            {selectedGame === 'rps' && (
              <RockPaperScissors
                gameState={gameState}
                playerRole={isHost ? 1 : 2}
                onMove={sendGameState}
                onNewGame={() => selectGame('rps')}
                isHost={isHost}
              />
            )}
            {selectedGame === 'dots' && (
              <DotsAndBoxes
                gameState={gameState}
                playerRole={isHost ? 1 : 2}
                onMove={sendGameState}
                onNewGame={() => selectGame('dots')}
                isHost={isHost}
              />
            )}
            {selectedGame === 'spellingbee' && (
              <SpellingBee
                gameState={gameState}
                playerRole={isHost ? 1 : 2}
                onMove={sendGameState}
                onNewGame={() => selectGame('spellingbee')}
                isHost={isHost}
              />
            )}
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
                <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
                  <Wifi className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="text-sm text-green-700">Connected! Host picks the game, then take turns.</div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="font-bold text-gray-800 mb-2">Games:</div>
                  <div className="grid gap-2">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <strong>Tic-Tac-Toe</strong> — Get 3 in a row
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <strong>Memory</strong> — Flip cards, match pairs
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <strong>Wordle</strong> — Guess the 5-letter word
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <strong>Connect Four</strong> — Drop discs, get 4 in a row
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <strong>Flower</strong> — Guess letters before flower blooms
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <strong>Rock Paper Scissors</strong> — Best of 3 wins
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <strong>Dots & Boxes</strong> — Draw lines, complete boxes
                    </div>
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
  // Player 1 is X, Player 2 is O
  const mySymbol = playerRole === 1 ? 'X' : 'O';

  const handleClick = (index) => {
    if (board[index] || winner || currentPlayer !== playerRole) return;

    const newBoard = [...board];
    newBoard[index] = mySymbol;

    const newWinner = checkWinner(newBoard);
    const isDraw = !newWinner && newBoard.every(cell => cell);

    onMove({
      board: newBoard,
      currentPlayer: currentPlayer === 1 ? 2 : 1,
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
        You are <span className="font-bold text-purple-600">{mySymbol}</span>
        {!winner && (
          currentPlayer === playerRole
            ? " — Your turn!"
            : " — Waiting..."
        )}
      </p>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[340px] mx-auto mb-6 px-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={cell || winner || currentPlayer !== playerRole}
            className={`aspect-square rounded-2xl text-5xl font-bold flex items-center justify-center transition-all active:scale-95 border-2 ${
              cell
                ? 'bg-gray-100 border-gray-200'
                : currentPlayer === playerRole
                ? 'bg-purple-100 border-purple-300 active:bg-purple-200'
                : 'bg-gray-200 border-gray-300'
            } ${cell === 'X' ? 'text-purple-600' : 'text-blue-600'}`}
          >
            {cell}
          </button>
        ))}
      </div>

      {winner && (
        <div className="mb-4">
          <div className={`text-xl font-bold ${winner === 'draw' ? 'text-gray-600' : 'text-green-600'}`}>
            {winner === 'draw' ? "It's a draw!" : winner === mySymbol ? 'You win!' : 'You lost!'}
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
        {currentPlayer === playerRole ? "Your turn!" : "Waiting..."}
      </p>

      <div className="grid grid-cols-4 gap-2 w-full max-w-[340px] mx-auto mb-6 px-2">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.flipped || card.matched || currentPlayer !== playerRole}
            className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all active:scale-95 ${
              card.flipped || card.matched
                ? 'bg-white border-2 border-purple-200'
                : currentPlayer === playerRole
                ? 'bg-purple-500 active:bg-purple-600'
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
  const { word, guesses, currentPlayer, gameOver, won } = gameState;
  const [localGuess, setLocalGuess] = useState('');
  const localGuessRef = useRef(localGuess);
  localGuessRef.current = localGuess;

  const isMyTurn = currentPlayer === playerRole;

  // QWERTY keyboard layout
  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
  ];

  // Get the best color status for each letter based on all guesses
  const getKeyboardLetterStatus = () => {
    const status = {};
    guesses.forEach(guess => {
      guess.split('').forEach((letter, index) => {
        const currentStatus = status[letter];
        if (word[index] === letter) {
          status[letter] = 'correct'; // Green - highest priority
        } else if (word.includes(letter) && currentStatus !== 'correct') {
          status[letter] = 'present'; // Yellow
        } else if (!currentStatus) {
          status[letter] = 'absent'; // Gray
        }
      });
    });
    return status;
  };

  const letterStatus = getKeyboardLetterStatus();

  const [invalidWord, setInvalidWord] = useState(false);

  const handleKeyPress = (key) => {
    if (!isMyTurn || gameOver) return;
    const currentGuess = localGuessRef.current;

    if (key === 'ENTER') {
      if (currentGuess.length === 5) {
        const guess = currentGuess.toUpperCase();

        // Validate word is in dictionary
        if (!VALID_WORDS.has(guess)) {
          setInvalidWord(true);
          setTimeout(() => setInvalidWord(false), 1500);
          return;
        }

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
      }
    } else if (key === '⌫' || key === 'BACKSPACE') {
      setLocalGuess(prev => prev.slice(0, -1));
      setInvalidWord(false);
    } else if (currentGuess.length < 5 && /^[A-Z]$/.test(key)) {
      setLocalGuess(prev => prev + key);
      setInvalidWord(false);
    }
  };

  // Handle physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isMyTurn || gameOver) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('BACKSPACE');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, gameOver]);

  const getKeyColor = (key) => {
    if (key === 'ENTER' || key === '⌫') {
      return 'bg-gray-300 text-gray-800';
    }
    const status = letterStatus[key];
    if (status === 'correct') return 'bg-green-500 text-white';
    if (status === 'present') return 'bg-yellow-500 text-white';
    if (status === 'absent') return 'bg-gray-500 text-white';
    return 'bg-gray-200 text-gray-800';
  };

  const getLetterColor = (letter, index) => {
    if (word[index] === letter) return 'bg-green-500 text-white border-green-500';
    if (word.includes(letter)) return 'bg-yellow-500 text-white border-yellow-500';
    return 'bg-gray-500 text-white border-gray-500';
  };

  // Get display for current row being typed
  const currentRowIndex = guesses.length;

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Word Guess</h3>
      <p className="text-gray-500 mb-2">
        {!gameOver && (isMyTurn ? "Your turn!" : "Waiting...")}
      </p>

      {/* Invalid word message */}
      {invalidWord && (
        <p className="text-red-500 text-sm mb-2 font-medium animate-pulse">Not in word list!</p>
      )}

      {/* Letter grid */}
      <div className="space-y-1 mb-4">
        {Array(6).fill(null).map((_, rowIndex) => {
          const guess = guesses[rowIndex];
          const isCurrentRow = rowIndex === currentRowIndex && isMyTurn && !gameOver;
          return (
            <div key={rowIndex} className="flex justify-center gap-1">
              {Array(5).fill(null).map((_, colIndex) => {
                const letter = guess?.[colIndex] || (isCurrentRow ? localGuess[colIndex] : '') || '';
                const hasGuess = !!guess;
                return (
                  <div
                    key={colIndex}
                    className={`w-12 h-12 sm:w-11 sm:h-11 flex items-center justify-center text-xl font-bold rounded border-2 transition-all ${
                      hasGuess
                        ? getLetterColor(letter, colIndex)
                        : letter
                          ? 'bg-white border-gray-400'
                          : 'bg-white border-gray-200'
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

      {/* On-screen keyboard */}
      {!gameOver && (
        <div className="space-y-1 px-1">
          {keyboardRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1">
              {row.map(key => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  disabled={!isMyTurn}
                  className={`${
                    key === 'ENTER' || key === '⌫' ? 'px-2 sm:px-3 text-xs' : 'w-8 sm:w-9'
                  } h-12 sm:h-11 rounded font-bold flex items-center justify-center transition-all active:scale-95 ${
                    getKeyColor(key)
                  } ${!isMyTurn ? 'opacity-50' : ''}`}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>
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

// Connect Four Component
function ConnectFour({ gameState, playerRole, onMove, onNewGame, isHost }) {
  const { board, currentPlayer, winner } = gameState;

  const dropDisc = (col) => {
    if (winner || currentPlayer !== playerRole) return;
    let row = -1;
    for (let r = 5; r >= 0; r--) {
      if (!board[r][col]) { row = r; break; }
    }
    if (row === -1) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;

    const newWinner = checkConnect4Winner(newBoard, row, col, currentPlayer);
    const isDraw = !newWinner && newBoard.every(r => r.every(c => c));

    onMove({
      board: newBoard,
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      winner: newWinner ? currentPlayer : (isDraw ? 'draw' : null)
    });
  };

  const checkConnect4Winner = (b, row, col, player) => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
      let count = 1;
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i, c = col + dc * i;
        if (r >= 0 && r < 6 && c >= 0 && c < 7 && b[r][c] === player) count++;
        else break;
      }
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i, c = col - dc * i;
        if (r >= 0 && r < 6 && c >= 0 && c < 7 && b[r][c] === player) count++;
        else break;
      }
      if (count >= 4) return true;
    }
    return false;
  };

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Connect Four</h3>
      <p className="text-gray-500 mb-4">
        You are <span className={`font-bold ${playerRole === 1 ? 'text-red-500' : 'text-yellow-500'}`}>
          {playerRole === 1 ? 'Red' : 'Yellow'}
        </span>
        {!winner && (currentPlayer === playerRole ? " - Your turn!" : " - Waiting...")}
      </p>

      <div className="inline-block bg-blue-600 p-2 rounded-xl">
        {[0, 1, 2, 3, 4, 5].map(row => (
          <div key={row} className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map(col => (
              <button
                key={col}
                onClick={() => dropDisc(col)}
                disabled={winner || currentPlayer !== playerRole}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-blue-700 transition-all active:scale-95 ${
                  board[row][col] === 1 ? 'bg-red-500' :
                  board[row][col] === 2 ? 'bg-yellow-400' : 'bg-white hover:bg-gray-100'
                }`}
              />
            ))}
          </div>
        ))}
      </div>

      {winner && (
        <div className="mt-4">
          <div className={`text-xl font-bold ${winner === 'draw' ? 'text-gray-600' : winner === playerRole ? 'text-green-600' : 'text-red-600'}`}>
            {winner === 'draw' ? "It's a draw!" : winner === playerRole ? 'You win!' : 'You lost!'}
          </div>
          {isHost && (
            <button onClick={onNewGame} className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-full font-medium flex items-center gap-2 mx-auto min-h-[44px]">
              <RefreshCw className="w-4 h-4" /> Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Flower Game Component
function FlowerGame({ gameState, playerRole, onMove, onNewGame, isHost }) {
  const { word, guessedLetters, wrongGuesses, currentPlayer, gameOver, won } = gameState;
  const maxWrong = 6;
  const isMyTurn = currentPlayer === playerRole;

  const guessLetter = (letter) => {
    if (gameOver || !isMyTurn || guessedLetters.includes(letter)) return;
    const newGuessed = [...guessedLetters, letter];
    const isWrong = !word.includes(letter);
    const newWrongGuesses = isWrong ? wrongGuesses + 1 : wrongGuesses;
    const allLettersGuessed = word.split('').every(l => newGuessed.includes(l));
    const isLost = newWrongGuesses >= maxWrong;

    onMove({
      ...gameState,
      guessedLetters: newGuessed,
      wrongGuesses: newWrongGuesses,
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      gameOver: allLettersGuessed || isLost,
      won: allLettersGuessed && !isLost
    });
  };

  const displayWord = word.split('').map(l => guessedLetters.includes(l) ? l : '_').join(' ');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Flower</h3>
      <p className="text-gray-500 mb-2">{!gameOver && (isMyTurn ? "Your turn!" : "Waiting...")}</p>
      <p className="text-sm text-gray-400 mb-4">Wrong: {wrongGuesses}/{maxWrong}</p>

      <div className="w-32 h-40 mx-auto mb-4 relative">
        {wrongGuesses >= 1 && <div className="absolute bottom-0 left-1/2 w-2 h-20 bg-green-500 -translate-x-1/2 rounded-full" />}
        {wrongGuesses >= 2 && <div className="absolute bottom-8 left-1/2 w-6 h-3 bg-green-500 -translate-x-8 rotate-[-30deg] rounded-full" />}
        {wrongGuesses >= 3 && <div className="absolute bottom-12 left-1/2 w-6 h-3 bg-green-500 translate-x-2 rotate-[30deg] rounded-full" />}
        {wrongGuesses >= 4 && <div className="absolute top-4 left-1/2 w-8 h-8 bg-yellow-400 -translate-x-1/2 rounded-full" />}
        {wrongGuesses >= 5 && <>
          <div className="absolute top-0 left-1/2 w-6 h-6 bg-pink-400 -translate-x-1/2 -translate-y-2 rounded-full" />
          <div className="absolute top-4 left-1/2 w-6 h-6 bg-pink-400 -translate-x-8 rounded-full" />
          <div className="absolute top-4 left-1/2 w-6 h-6 bg-pink-400 translate-x-2 rounded-full" />
        </>}
        {wrongGuesses >= 6 && <>
          <div className="absolute top-8 left-1/2 w-6 h-6 bg-pink-400 -translate-x-1/2 translate-y-2 rounded-full" />
          <div className="absolute top-2 left-1/2 w-6 h-6 bg-pink-400 -translate-x-6 -translate-y-1 rounded-full" />
          <div className="absolute top-2 left-1/2 w-6 h-6 bg-pink-400 translate-x-1 -translate-y-1 rounded-full" />
        </>}
      </div>

      <div className="text-3xl font-bold tracking-[0.3em] mb-6 font-mono">{displayWord}</div>

      {!gameOver && (
        <div className="grid grid-cols-9 gap-1 max-w-xs mx-auto">
          {alphabet.map(letter => (
            <button
              key={letter}
              onClick={() => guessLetter(letter)}
              disabled={!isMyTurn || guessedLetters.includes(letter)}
              className={`w-8 h-8 rounded font-bold text-sm transition-all ${
                guessedLetters.includes(letter)
                  ? word.includes(letter) ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                  : isMyTurn ? 'bg-purple-100 text-purple-700 active:scale-95' : 'bg-gray-100 text-gray-400'
              }`}
            >{letter}</button>
          ))}
        </div>
      )}

      {gameOver && (
        <div className="mt-4">
          <div className={`text-xl font-bold ${won ? 'text-green-600' : 'text-gray-600'}`}>
            {won ? 'You saved the flower!' : `The word was: ${word}`}
          </div>
          {isHost && (
            <button onClick={onNewGame} className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-full font-medium flex items-center gap-2 mx-auto min-h-[44px]">
              <RefreshCw className="w-4 h-4" /> Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Rock Paper Scissors Component
function RockPaperScissors({ gameState, playerRole, onMove, onNewGame, isHost }) {
  const { round, maxRounds, choices, scores, roundResult, gameOver } = gameState;
  const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

  const makeChoice = (choice) => {
    if (gameOver || choices[playerRole]) return;
    const newChoices = { ...choices, [playerRole]: choice };

    if (newChoices[1] && newChoices[2]) {
      const p1 = newChoices[1], p2 = newChoices[2];
      let result = 'tie';
      if ((p1 === 'rock' && p2 === 'scissors') || (p1 === 'paper' && p2 === 'rock') || (p1 === 'scissors' && p2 === 'paper')) result = 1;
      else if (p1 !== p2) result = 2;

      const newScores = { ...scores };
      if (result === 1) newScores[1]++;
      else if (result === 2) newScores[2]++;

      const winsNeeded = Math.ceil(maxRounds / 2);
      const isOver = newScores[1] >= winsNeeded || newScores[2] >= winsNeeded;

      onMove({ ...gameState, choices: newChoices, scores: newScores, roundResult: result, gameOver: isOver });

      if (!isOver) {
        setTimeout(() => {
          onMove({ ...gameState, round: round + 1, choices: { 1: null, 2: null }, scores: newScores, roundResult: null, gameOver: false });
        }, 2000);
      }
    } else {
      onMove({ ...gameState, choices: newChoices });
    }
  };

  const winner = scores[1] > scores[2] ? 1 : scores[2] > scores[1] ? 2 : 'tie';

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Rock Paper Scissors</h3>
      <p className="text-gray-500 mb-2">Best of {maxRounds} - Round {round}</p>

      <div className="flex justify-center gap-6 mb-4">
        <div className={`px-4 py-2 rounded-full ${playerRole === 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>You: {scores[playerRole]}</div>
        <div className={`px-4 py-2 rounded-full ${playerRole !== 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>Them: {scores[playerRole === 1 ? 2 : 1]}</div>
      </div>

      {!gameOver && !roundResult && (
        <div className="space-y-4">
          <p className="text-gray-600">{choices[playerRole] ? 'Waiting for opponent...' : 'Make your choice!'}</p>
          <div className="flex justify-center gap-4">
            {['rock', 'paper', 'scissors'].map(c => (
              <button key={c} onClick={() => makeChoice(c)} disabled={choices[playerRole]}
                className={`w-20 h-20 rounded-2xl text-4xl flex items-center justify-center transition-all ${
                  choices[playerRole] === c ? 'bg-purple-200 scale-110' : choices[playerRole] ? 'bg-gray-100 opacity-50' : 'bg-purple-100 active:scale-95'
                }`}>{emojis[c]}</button>
            ))}
          </div>
        </div>
      )}

      {roundResult && !gameOver && (
        <div className="py-8">
          <div className="flex justify-center gap-8 text-5xl mb-4">
            <span>{emojis[choices[playerRole]]}</span><span className="text-gray-400">vs</span><span>{emojis[choices[playerRole === 1 ? 2 : 1]]}</span>
          </div>
          <div className={`text-xl font-bold ${roundResult === playerRole ? 'text-green-600' : roundResult === 'tie' ? 'text-gray-600' : 'text-red-600'}`}>
            {roundResult === 'tie' ? 'Tie!' : roundResult === playerRole ? 'You win this round!' : 'They win this round!'}
          </div>
        </div>
      )}

      {gameOver && (
        <div className="mt-4">
          <div className="flex justify-center gap-8 text-5xl mb-4">
            <span>{emojis[choices[playerRole]]}</span><span className="text-gray-400">vs</span><span>{emojis[choices[playerRole === 1 ? 2 : 1]]}</span>
          </div>
          <div className={`text-xl font-bold ${winner === playerRole ? 'text-green-600' : winner === 'tie' ? 'text-gray-600' : 'text-red-600'}`}>
            {winner === 'tie' ? "It's a tie!" : winner === playerRole ? 'You win!' : 'They win!'}
          </div>
          {isHost && (
            <button onClick={onNewGame} className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-full font-medium flex items-center gap-2 mx-auto min-h-[44px]">
              <RefreshCw className="w-4 h-4" /> Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Dots and Boxes Component
function DotsAndBoxes({ gameState, playerRole, onMove, onNewGame, isHost }) {
  const { size, horizontalLines, verticalLines, boxes, currentPlayer, scores, gameOver } = gameState;

  const drawLine = (type, row, col) => {
    if (gameOver || currentPlayer !== playerRole) return;
    const lines = type === 'h' ? horizontalLines : verticalLines;
    if (lines[row][col]) return;

    const newH = horizontalLines.map(r => [...r]);
    const newV = verticalLines.map(r => [...r]);
    if (type === 'h') newH[row][col] = currentPlayer;
    else newV[row][col] = currentPlayer;

    const newBoxes = boxes.map(r => [...r]);
    let completed = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!newBoxes[r][c] && newH[r][c] && newH[r + 1][c] && newV[r][c] && newV[r][c + 1]) {
          newBoxes[r][c] = currentPlayer;
          completed++;
        }
      }
    }

    const newScores = { ...scores };
    if (completed > 0) newScores[currentPlayer] += completed;

    onMove({
      size, horizontalLines: newH, verticalLines: newV, boxes: newBoxes,
      currentPlayer: completed > 0 ? currentPlayer : (currentPlayer === 1 ? 2 : 1),
      scores: newScores, gameOver: newBoxes.every(r => r.every(c => c))
    });
  };

  const winner = gameOver ? (scores[1] > scores[2] ? 1 : scores[2] > scores[1] ? 2 : 'tie') : null;

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Dots and Boxes</h3>
      <div className="flex justify-center gap-6 mb-4">
        <div className={`px-4 py-2 rounded-full ${playerRole === 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>You: {scores[playerRole]}</div>
        <div className={`px-4 py-2 rounded-full ${playerRole !== 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>Them: {scores[playerRole === 1 ? 2 : 1]}</div>
      </div>
      <p className="text-gray-500 mb-4">{!gameOver && (currentPlayer === playerRole ? "Your turn!" : "Waiting...")}</p>

      <div className="inline-block p-2">
        {Array(size * 2 + 1).fill(null).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            {i % 2 === 0 ? (
              // Dot row with horizontal lines
              Array(size * 2 + 1).fill(null).map((_, j) => (
                j % 2 === 0 ? (
                  <div key={j} className="w-3 h-3 bg-gray-800 rounded-full" />
                ) : (
                  <button key={j} onClick={() => drawLine('h', i / 2, (j - 1) / 2)}
                    disabled={gameOver || currentPlayer !== playerRole || horizontalLines[i / 2][(j - 1) / 2]}
                    className={`w-8 h-3 mx-0.5 rounded ${
                      horizontalLines[i / 2][(j - 1) / 2] ? (horizontalLines[i / 2][(j - 1) / 2] === 1 ? 'bg-purple-500' : 'bg-blue-500')
                      : 'bg-gray-200 hover:bg-gray-300'
                    }`} />
                )
              ))
            ) : (
              // Vertical line row with boxes
              Array(size * 2 + 1).fill(null).map((_, j) => (
                j % 2 === 0 ? (
                  <button key={j} onClick={() => drawLine('v', (i - 1) / 2, j / 2)}
                    disabled={gameOver || currentPlayer !== playerRole || verticalLines[(i - 1) / 2][j / 2]}
                    className={`w-3 h-8 my-0.5 rounded ${
                      verticalLines[(i - 1) / 2][j / 2] ? (verticalLines[(i - 1) / 2][j / 2] === 1 ? 'bg-purple-500' : 'bg-blue-500')
                      : 'bg-gray-200 hover:bg-gray-300'
                    }`} />
                ) : (
                  <div key={j} className={`w-8 h-8 mx-0.5 my-0.5 rounded ${
                    boxes[(i - 1) / 2][(j - 1) / 2] ? (boxes[(i - 1) / 2][(j - 1) / 2] === 1 ? 'bg-purple-200' : 'bg-blue-200') : ''
                  }`} />
                )
              ))
            )}
          </div>
        ))}
      </div>

      {gameOver && (
        <div className="mt-4">
          <div className={`text-xl font-bold ${winner === playerRole ? 'text-green-600' : winner === 'tie' ? 'text-gray-600' : 'text-red-600'}`}>
            {winner === 'tie' ? "It's a tie!" : winner === playerRole ? 'You win!' : 'They win!'}
          </div>
          {isHost && (
            <button onClick={onNewGame} className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-full font-medium flex items-center gap-2 mx-auto min-h-[44px]">
              <RefreshCw className="w-4 h-4" /> Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Spelling Bee Game Component
function SpellingBee({ gameState, playerRole, onMove, onNewGame, isHost }) {
  const { letters, centerLetter, validWords, foundWords, scores, currentPlayer, gameOver } = gameState;
  const [currentWord, setCurrentWord] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', 'info'

  const isMyTurn = currentPlayer === playerRole;

  // Calculate points for a word
  const getWordPoints = (word) => {
    const isPangram = letters.every(l => word.includes(l));
    const basePoints = word.length === 4 ? 1 : word.length;
    return basePoints + (isPangram ? 7 : 0);
  };

  // Check if word is a pangram
  const isPangram = (word) => letters.every(l => word.includes(l));

  // Handle letter click
  const handleLetterClick = (letter) => {
    if (!isMyTurn || gameOver) return;
    setCurrentWord(prev => prev + letter);
    setMessage('');
  };

  // Handle submit
  const handleSubmit = () => {
    if (!isMyTurn || gameOver) return;

    if (currentWord.length < 4) {
      setMessage('Too short! Need 4+ letters');
      setMessageType('error');
      return;
    }

    const word = currentWord.toUpperCase();

    // Check if word includes center letter
    if (!word.includes(centerLetter)) {
      setMessage('Must include center letter!');
      setMessageType('error');
      return;
    }

    // Check if word only uses valid letters
    const letterSet = new Set(letters);
    if (!word.split('').every(l => letterSet.has(l))) {
      setMessage('Invalid letters used!');
      setMessageType('error');
      return;
    }

    // Check if word is in valid words list
    if (!validWords.includes(word)) {
      setMessage('Not in word list!');
      setMessageType('error');
      return;
    }

    // Check if already found
    if (foundWords.includes(word)) {
      setMessage('Already found!');
      setMessageType('error');
      return;
    }

    // Valid word! Add points
    const points = getWordPoints(word);
    const newScores = { ...scores, [currentPlayer]: scores[currentPlayer] + points };
    const newFoundWords = [...foundWords, word];

    // Check if game is over (found all words or reached score limit)
    const totalPossible = validWords.length;
    const isOver = newFoundWords.length >= totalPossible || newScores[1] >= 50 || newScores[2] >= 50;

    setMessage(isPangram(word) ? `PANGRAM! +${points} points!` : `+${points} point${points > 1 ? 's' : ''}!`);
    setMessageType('success');

    onMove({
      ...gameState,
      foundWords: newFoundWords,
      scores: newScores,
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      gameOver: isOver
    });

    setCurrentWord('');
  };

  // Handle delete
  const handleDelete = () => {
    setCurrentWord(prev => prev.slice(0, -1));
    setMessage('');
  };

  // Handle shuffle (rearranges outer letters)
  const handleShuffle = () => {
    // Only shuffle, don't send to peer - just local visual
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isMyTurn || gameOver) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const letter = e.key.toUpperCase();
        if (letters.includes(letter)) {
          e.preventDefault();
          handleLetterClick(letter);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, gameOver, currentWord, letters]);

  // Determine winner
  const getWinner = () => {
    if (!gameOver) return null;
    if (scores[1] > scores[2]) return 1;
    if (scores[2] > scores[1]) return 2;
    return 'tie';
  };

  const winner = getWinner();

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Spelling Bee</h3>

      {/* Scores */}
      <div className="flex justify-center gap-6 mb-3">
        <div className={`px-4 py-1 rounded-full ${playerRole === 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
          You: {scores[playerRole]}
        </div>
        <div className={`px-4 py-1 rounded-full ${playerRole === 2 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
          Them: {scores[playerRole === 1 ? 2 : 1]}
        </div>
      </div>

      {!gameOver && (
        <p className="text-gray-500 mb-3 text-sm">
          {isMyTurn ? "Your turn! Make a word" : "Waiting for their word..."}
        </p>
      )}

      {/* Message */}
      {message && (
        <p className={`text-sm mb-2 font-medium ${messageType === 'success' ? 'text-green-500' : messageType === 'error' ? 'text-red-500' : 'text-gray-500'}`}>
          {message}
        </p>
      )}

      {/* Current word display */}
      <div className="h-10 mb-3 flex items-center justify-center">
        <span className="text-2xl font-bold tracking-wider text-gray-800">
          {currentWord || <span className="text-gray-300">Type a word</span>}
        </span>
      </div>

      {/* Honeycomb - simplified hexagon layout */}
      <div className="flex flex-col items-center gap-2 mb-4">
        {/* Top row - 2 letters */}
        <div className="flex gap-2">
          {letters.slice(1, 3).map((letter, i) => (
            <button
              key={i}
              onClick={() => handleLetterClick(letter)}
              disabled={!isMyTurn || gameOver}
              className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl text-gray-800 disabled:opacity-50 transition-all active:scale-95"
            >
              {letter}
            </button>
          ))}
        </div>
        {/* Middle row - center + 2 */}
        <div className="flex gap-2">
          <button
            onClick={() => handleLetterClick(letters[3])}
            disabled={!isMyTurn || gameOver}
            className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl text-gray-800 disabled:opacity-50 transition-all active:scale-95"
          >
            {letters[3]}
          </button>
          <button
            onClick={() => handleLetterClick(centerLetter)}
            disabled={!isMyTurn || gameOver}
            className="w-14 h-14 bg-yellow-400 hover:bg-yellow-500 rounded-lg font-bold text-2xl text-gray-800 disabled:opacity-50 transition-all active:scale-95 shadow-md"
          >
            {centerLetter}
          </button>
          <button
            onClick={() => handleLetterClick(letters[4])}
            disabled={!isMyTurn || gameOver}
            className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl text-gray-800 disabled:opacity-50 transition-all active:scale-95"
          >
            {letters[4]}
          </button>
        </div>
        {/* Bottom row - 2 letters */}
        <div className="flex gap-2">
          {letters.slice(5, 7).map((letter, i) => (
            <button
              key={i}
              onClick={() => handleLetterClick(letter)}
              disabled={!isMyTurn || gameOver}
              className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl text-gray-800 disabled:opacity-50 transition-all active:scale-95"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-3 mb-4">
        <button
          onClick={handleDelete}
          disabled={!isMyTurn || gameOver || currentWord.length === 0}
          className="px-4 py-2 border-2 border-gray-300 rounded-full text-gray-600 font-medium disabled:opacity-50 min-h-[44px]"
        >
          Delete
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isMyTurn || gameOver || currentWord.length === 0}
          className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 rounded-full text-gray-800 font-bold disabled:opacity-50 min-h-[44px]"
        >
          Enter
        </button>
      </div>

      {/* Found words */}
      <div className="bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto">
        <div className="text-xs text-gray-500 mb-2">
          Found: {foundWords.length} / {validWords.length} words
        </div>
        <div className="flex flex-wrap gap-1 justify-center">
          {foundWords.map((word, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                isPangram(word) ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* Game over */}
      {gameOver && (
        <div className="mt-4">
          <div className={`text-xl font-bold ${winner === playerRole ? 'text-green-600' : winner === 'tie' ? 'text-gray-600' : 'text-red-600'}`}>
            {winner === 'tie' ? "It's a tie!" : winner === playerRole ? 'You win!' : 'They win!'}
          </div>
          <div className="text-gray-500 mt-1">
            Final: {scores[1]} - {scores[2]}
          </div>
          {isHost && (
            <button onClick={onNewGame} className="mt-4 px-6 py-2 bg-yellow-400 text-gray-800 rounded-full font-bold flex items-center gap-2 mx-auto min-h-[44px]">
              <RefreshCw className="w-4 h-4" /> New Puzzle
            </button>
          )}
        </div>
      )}
    </div>
  );
}
