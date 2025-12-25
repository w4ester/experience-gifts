// Games - Simple room codes via signaling server
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Copy, Check, Gamepad2, Grid3X3, LayoutGrid, Type, Wifi, RefreshCw, HelpCircle, X, Users } from 'lucide-react';
import { PeerConnection } from '../utils/peerConnection';

// Word list for Wordle
const WORDS = ['GIFTS', 'HAPPY', 'JOLLY', 'MERRY', 'PEACE', 'CHEER', 'GRACE', 'HEART', 'LOVED', 'SWEET', 'FAITH', 'BLESS', 'LIGHT', 'SHINE', 'DREAM', 'HOPES', 'SMILE', 'LAUGH'];

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
      setError('Failed to start game. Please try again.');
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

      // Connection will complete via WebRTC
    } catch (e) {
      setError('Failed to join game. Please try again.');
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
                <div className="p-5 space-y-6">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🎮</div>
                    <p className="text-gray-600 text-sm">Play games together in real-time!</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-purple-600">1</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Start a game</div>
                        <div className="text-sm text-gray-500">Get a 4-letter code like "A3F9"</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-purple-600">2</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Share the code</div>
                        <div className="text-sm text-gray-500">Tell them the code - text, call, or in person!</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">3</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">They join</div>
                        <div className="text-sm text-gray-500">They enter the code and you're connected!</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">Privacy First</div>
                    <div className="text-xs text-gray-500">
                      Game data goes directly between your devices. The code is just to help you find each other!
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
              className="w-full mt-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 min-h-[48px] active:scale-[0.98] active:bg-gray-100 transition-all"
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
            : " — Waiting..."
        )}
      </p>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[340px] mx-auto mb-6 px-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={cell || winner || currentPlayer !== playerRole}
            className={`aspect-square rounded-2xl text-5xl font-bold flex items-center justify-center transition-all active:scale-95 ${
              cell
                ? 'bg-gray-100'
                : currentPlayer === playerRole
                ? 'bg-purple-100 active:bg-purple-200'
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

  const getLetterColor = (letter, index) => {
    if (word[index] === letter) return 'bg-green-500 text-white';
    if (word.includes(letter)) return 'bg-yellow-500 text-white';
    return 'bg-gray-400 text-white';
  };

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Word Guess</h3>
      <p className="text-gray-500 mb-4">
        {!gameOver && (isMyTurn ? "Your turn!" : "Waiting...")}
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
                    className={`w-14 h-14 sm:w-12 sm:h-12 flex items-center justify-center text-xl font-bold rounded-lg ${
                      guess ? getLetterColor(letter, colIndex) : 'bg-gray-200'
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
        <form onSubmit={handleSubmit} className="flex gap-3 justify-center px-4">
          <input
            type="text"
            value={localGuess}
            onChange={(e) => setLocalGuess(e.target.value.slice(0, 5))}
            placeholder="GUESS"
            className="px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none text-center uppercase font-bold tracking-widest flex-1 max-w-[180px] min-h-[56px] text-lg"
            maxLength={5}
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={localGuess.length !== 5}
            className="px-6 py-4 bg-purple-500 text-white rounded-xl font-semibold disabled:opacity-50 min-h-[56px] active:scale-95 transition-transform"
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
