import { useCallback, useMemo, useState } from "react";
import "./main.css";

const STARTER_BOT_MESSAGE = {
  role: "assistant",
  content: "Wallet connected. Ask NexusAI anything to get started.",
};

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([STARTER_BOT_MESSAGE]);

  const isConnected = Boolean(walletAddress);

  const shortAddress = useMemo(() => {
    if (!walletAddress) return "";
    return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  }, [walletAddress]);

  const connectWallet = useCallback(async () => {
    const provider = window?.solana;

    if (provider?.isPhantom) {
      try {
        const response = await provider.connect();
        const key = response?.publicKey?.toString();
        if (key) {
          setWalletAddress(key);
          return;
        }
      } catch (error) {
        console.error("Phantom wallet connection failed", error);
      }
    }

    const manual = window.prompt("Enter your wallet address to continue:");
    if (manual) setWalletAddress(manual.trim());
  }, []);

  const triggerGeminiController = useCallback(async (userMessage) => {
    if (typeof window !== "undefined") {
      const globalController =
        window.GeminiAPIController ?? window.geminiApiController ?? null;

      if (typeof globalController?.sendMessage === "function") {
        return globalController.sendMessage(userMessage);
      }
    }

    const response = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed (${response.status})`);
    }

    const data = await response.json();
    return data.reply ?? data.message ?? "No response from Gemini.";
  }, []);

  const handleSendMessage = useCallback(
    async (event) => {
      event.preventDefault();
      const message = prompt.trim();
      if (!message || isSending) return;

      const nextMessages = [...messages, { role: "user", content: message }];
      setMessages(nextMessages);
      setPrompt("");
      setIsSending(true);

      try {
        const reply = await triggerGeminiController(message);
        setMessages((prev) => [...prev, { role: "assistant", content: String(reply) }]);
      } catch (error) {
        console.error(error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I couldn't reach Gemini right now. Please retry.",
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages, prompt, triggerGeminiController],
  );

  return (
    <div className="app-bg">
      <div className="container">
        <nav className="navbar glass">
          <div className="brand">
            <span className="brand-dot" aria-hidden="true" />
            <span>NexusAI Network</span>
          </div>

          <div className="nav-actions">
            {isConnected ? (
              <span className="wallet-pill">{shortAddress}</span>
            ) : (
              <button type="button" className="cta cta-small" onClick={connectWallet}>
                Connect Wallet
              </button>
            )}
          </div>
        </nav>

        {!isConnected ? (
          <section className="hero glass">
            <div className="logo-wrap" aria-label="NexusAI logo placeholder">
              <div className="logo-inner">🤖</div>
            </div>
            <h1>NexusAI Network</h1>
            <p className="subtitle">Connect your wallet to access the AI dashboard and marketplace.</p>
            <button type="button" className="cta" onClick={connectWallet}>
              Connect Wallet
            </button>
          </section>
        ) : (
          <section className="dashboard-wrap">
            <div className="tabs glass">
              <button
                type="button"
                className={`tab ${activeTab === "chat" ? "active" : ""}`}
                onClick={() => setActiveTab("chat")}
              >
                AI Chat Dashboard
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "marketplace" ? "active" : ""}`}
                onClick={() => setActiveTab("marketplace")}
              >
                Marketplace
              </button>
            </div>

            {activeTab === "chat" ? (
              <article className="chat-panel glass">
                <div className="messages" aria-live="polite">
                  {messages.map((message, idx) => (
                    <div key={`${message.role}-${idx}`} className={`bubble ${message.role}`}>
                      {message.content}
                    </div>
                  ))}
                </div>

                <form className="chat-form" onSubmit={handleSendMessage}>
                  <input
                    className="chat-input"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Send a prompt to Gemini..."
                    disabled={isSending}
                  />
                  <button className="cta cta-small" type="submit" disabled={isSending}>
                    {isSending ? "Sending..." : "Send"}
                  </button>
                </form>
              </article>
            ) : (
              <article className="market-panel glass">
                <h2>Marketplace</h2>
                <p className="subtitle">Discover AI gigs, automation templates, and verified service providers.</p>
                <div className="grid">
                  <div className="card glass item-card">
                    <h3>Prompt Packs</h3>
                    <p>Pre-built prompts for growth, support, and operations teams.</p>
                  </div>
                  <div className="card glass item-card">
                    <h3>Agent Workflows</h3>
                    <p>Composable AI agents for analytics, outreach, and reporting.</p>
                  </div>
                  <div className="card glass item-card">
                    <h3>Freelancer Vault</h3>
                    <p>Hire vetted experts paid in crypto with escrow-ready milestones.</p>
                  </div>
                </div>
              </article>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
