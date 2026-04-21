"use client";
import { useState, useRef, useEffect } from "react";

type DeployStatus = "idle" | "uploading" | "building" | "deployed" | "error";

interface StatusState {
  type: DeployStatus;
  message: string;
  id?: string;
}

export default function Deploy() {
  const sampleRepoUrl =
    "https://github.com/codebydurvesh/deployment-test-react-app";

  const uploadServiceBaseUrl = (
    process.env.NEXT_PUBLIC_UPLOAD_SERVICE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_UPLOAD_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const requestHandlerHost = (
    process.env.NEXT_PUBLIC_BACKEND_REQ_URL ||
    process.env.NEXT_PUBLIC_REQUEST_HANDLER_HOST ||
    "localhost"
  )
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");

  const [repoUrl, setRepoUrl] = useState("");
  const [status, setStatus] = useState<StatusState>({
    type: "idle",
    message: "",
  });
  const [sampleCopied, setSampleCopied] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotFailed, setSnapshotFailed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  useEffect(() => {
    if (status.type === "deployed" && status.id) {
      setSnapshotLoading(true);
      setSnapshotFailed(false);
    }
  }, [status.type, status.id]);

  const isLoading = status.type === "uploading" || status.type === "building";

  async function pollStatus(id: string) {
    try {
      const res = await fetch(`${uploadServiceBaseUrl}/status/${id}`);
      const data = await res.json();
      if (data.status === "deployed") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus({
          type: "deployed",
          message: "Deployment complete — your project is live.",
          id,
        });
      } else if (data.status === "uploaded") {
        setStatus({ type: "building", message: "Building your project…", id });
      }
    } catch {
      // silently retry
    }
  }

  async function deploy() {
    const url = repoUrl.trim();
    if (!url) {
      inputRef.current?.focus();
      return;
    }

    if (pollRef.current) clearInterval(pollRef.current);
    setSnapshotLoading(false);
    setSnapshotFailed(false);
    setStatus({ type: "uploading", message: "Queuing deployment…" });

    try {
      const res = await fetch(`${uploadServiceBaseUrl}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          type: "error",
          message: data.message || "Deployment failed. Please try again.",
        });
        return;
      }

      const { id } = data;
      setStatus({
        type: "building",
        message: "Cloning and uploading source files…",
        id,
      });
      pollRef.current = setInterval(() => pollStatus(id), 2000);
    } catch {
      setStatus({
        type: "error",
        message:
          "Could not reach the upload service. Is it running on port 3000?",
      });
    }
  }

  async function copySampleRepo() {
    try {
      await navigator.clipboard.writeText(sampleRepoUrl);
    } catch {
      // Ignore clipboard API failures and still fill the input.
    }

    setRepoUrl(sampleRepoUrl);
    setSampleCopied(true);

    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => {
      setSampleCopied(false);
    }, 2000);
  }

  const statusDot: Record<DeployStatus, string> = {
    idle: "bg-neutral-600",
    uploading: "bg-neutral-400 animate-pulse",
    building: "bg-neutral-400 animate-pulse",
    deployed: "bg-green-500",
    error: "bg-red-500",
  };

  const statusBorder: Record<DeployStatus, string> = {
    idle: "border-white/10",
    uploading: "border-white/10",
    building: "border-white/10",
    deployed: "border-green-500/30",
    error: "border-red-500/30",
  };

  const btnLabel =
    status.type === "uploading"
      ? "Uploading…"
      : status.type === "building"
        ? "Deploying…"
        : "Upload";

  const deployedSiteUrl = status.id
    ? `http://${status.id}.${requestHandlerHost}:3001/index.html`
    : "";

  const deployedSnapshotUrl = deployedSiteUrl
    ? `/api/snapshot?target=${encodeURIComponent(deployedSiteUrl)}&w=1200&h=700&id=${status.id}`
    : "";

  return (
    // `dark` class forces Tailwind dark mode on this subtree.
    // Remove it and use your app-level dark mode strategy if you prefer.
    <div className="dark">
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="w-full max-w-[440px]">
          {/* Card */}
          <div
            className="
            rounded-xl px-8 py-8
            bg-neutral-900
            border border-white/[0.07]
            shadow-[0_8px_48px_rgba(0,0,0,0.55)]
          "
          >
            {/* Heading */}
            <h1 className="text-neutral-100 text-[1.125rem] font-semibold tracking-tight mb-1.5">
              Deploy your GitHub Repository
            </h1>
            <p className="text-neutral-500 text-sm leading-relaxed mb-7">
              Enter the URL of your GitHub repository to deploy it
            </p>

            {status.type === "idle" && (
              <div className="mb-5 rounded-lg border border-cyan-400/25 bg-cyan-500/[0.08] p-3">
                <p className="text-[0.68rem] uppercase tracking-[0.14em] text-cyan-300">
                  Need a sample repo?
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <p
                    title={sampleRepoUrl}
                    className="min-w-0 flex-1 truncate rounded-md border border-cyan-200/20 bg-neutral-950/60 px-2.5 py-2 text-[0.72rem] text-cyan-100"
                  >
                    {sampleRepoUrl}
                  </p>
                  <button
                    type="button"
                    onClick={copySampleRepo}
                    className="h-8 rounded-md border border-cyan-300/30 bg-cyan-400/10 px-3 text-[0.72rem] font-medium text-cyan-100 transition-colors hover:bg-cyan-300/20"
                  >
                    {sampleCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {status.type !== "deployed" && (
              <>
                {/* Field */}
                <div className="flex flex-col gap-2 mb-5">
                  <label
                    htmlFor="repoUrl"
                    className="text-neutral-200 text-[0.825rem] font-medium tracking-tight"
                  >
                    GitHub Repository URL
                  </label>
                  <input
                    ref={inputRef}
                    id="repoUrl"
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && deploy()}
                    placeholder="https://github.com/username/repo"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isLoading}
                    className="
                      h-10 rounded-lg px-3 text-sm w-full
                      bg-neutral-800 text-neutral-100
                      border border-white/[0.08]
                      placeholder:text-neutral-600
                      outline-none
                      transition-colors duration-150
                      hover:border-white/[0.16]
                      focus:border-white/30
                      disabled:opacity-40 disabled:cursor-not-allowed
                    "
                  />
                </div>

                {/* Submit button */}
                <button
                  onClick={deploy}
                  disabled={isLoading}
                  className="
                    w-full h-10 rounded-lg text-sm font-medium tracking-tight
                    bg-neutral-100 text-neutral-900
                    flex items-center justify-center gap-2
                    transition-all duration-150
                    hover:bg-white
                    active:scale-[0.99]
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                    cursor-pointer
                  "
                >
                  {isLoading && (
                    <svg
                      className="w-3.5 h-3.5 animate-spin shrink-0"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <circle
                        cx="7"
                        cy="7"
                        r="5.5"
                        stroke="currentColor"
                        strokeOpacity="0.25"
                        strokeWidth="2"
                      />
                      <path
                        d="M7 1.5A5.5 5.5 0 0 1 12.5 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {btnLabel}
                </button>
              </>
            )}

            {/* Status bar */}
            {status.type !== "idle" && (
              <div
                className={`
                mt-5 flex items-start gap-2.5
                bg-neutral-800/60 rounded-lg px-3.5 py-3
                border ${statusBorder[status.type]}
                transition-colors duration-300
              `}
              >
                <span
                  className={`
                  mt-[5px] w-[7px] h-[7px] rounded-full shrink-0
                  ${statusDot[status.type]}
                `}
                />
                <div>
                  <p className="text-neutral-400 text-[0.8rem] leading-relaxed">
                    {status.message}
                  </p>
                  {status.id && (
                    <p className="mt-1 text-[0.72rem] font-mono text-neutral-600">
                      ID: <span className="text-neutral-400">{status.id}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {status.type === "deployed" && status.id && (
              <div className="mt-4 rounded-lg border border-green-500/30 bg-neutral-800/60 p-3.5">
                <p className="text-[0.72rem] uppercase tracking-wide text-neutral-500">
                  Deployed URL
                </p>
                <a
                  href={deployedSiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-[0.8rem] text-green-400 hover:text-green-300"
                >
                  {deployedSiteUrl}
                </a>

                <div className="mt-3 overflow-hidden rounded-md border border-white/10 bg-black">
                  {!snapshotFailed ? (
                    <div className="relative h-64 w-full">
                      {snapshotLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-neutral-950/80 text-xs text-neutral-300">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-200" />
                          Generating snapshot...
                        </div>
                      )}

                      <img
                        key={deployedSnapshotUrl}
                        src={deployedSnapshotUrl}
                        alt={`Snapshot of deployment ${status.id}`}
                        className={`h-64 w-full object-cover object-top transition-opacity duration-300 ${snapshotLoading ? "opacity-0" : "opacity-100"}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onLoad={() => setSnapshotLoading(false)}
                        onError={() => {
                          setSnapshotLoading(false);
                          setSnapshotFailed(true);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center px-4 text-center text-xs text-neutral-400">
                      Snapshot unavailable for this URL. Use the deployed link
                      above to open the website.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
