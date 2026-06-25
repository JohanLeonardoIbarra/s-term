import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { listen } from "@tauri-apps/api/event";
import { closeSession, resizeSession, writeSession } from "../api";
import type { PtyDataEvent, PtyExitEvent } from "../types";
import LoadingOverlay from "./LoadingOverlay";

interface Props {
  sessionId: string;
  active: boolean;
  connecting?: boolean;
  onExit: (sessionId: string) => void;
  onConnected?: (sessionId: string) => void;
}

export default function Terminal({ sessionId, active, connecting, onExit, onConnected }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily:
        'Menlo, Monaco, "Cascadia Code", "Fira Code", "Courier New", monospace',
      fontSize: 13,
      theme: {
        background: "#1e1e2e",
        foreground: "#cdd6f4",
        cursor: "#f5e0dc",
        selectionBackground: "#585b70",
      },
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(container);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    const writeDisposable = term.onData((data) => {
      void writeSession(sessionId, data);
    });

    const resizeDisposable = term.onResize(({ cols, rows }) => {
      void resizeSession(sessionId, cols, rows);
    });

    // Push the initial size to the backend so the PTY matches the view.
    void resizeSession(sessionId, term.cols, term.rows);

    const unlistenData = listen<PtyDataEvent>("pty://data", (event) => {
      if (event.payload.id === sessionId) {
        term.write(event.payload.data);
        // Signal that connection is established on first data
        if (onConnected) {
          onConnected(sessionId);
        }
      }
    });

    const unlistenExit = listen<PtyExitEvent>("pty://exit", (event) => {
      if (event.payload.id === sessionId) {
        term.write("\r\n\x1b[90m[process exited]\x1b[0m\r\n");
        onExit(sessionId);
      }
    });

    const onWindowResize = () => {
      try {
        fit.fit();
      } catch {
        /* ignore fit errors while hidden */
      }
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      window.removeEventListener("resize", onWindowResize);
      writeDisposable.dispose();
      resizeDisposable.dispose();
      void unlistenData.then((fn) => fn());
      void unlistenExit.then((fn) => fn());
      term.dispose();
      void closeSession(sessionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Re-fit and focus when this tab becomes active.
  useEffect(() => {
    if (active && fitRef.current && termRef.current) {
      requestAnimationFrame(() => {
        try {
          fitRef.current?.fit();
          termRef.current?.focus();
        } catch {
          /* ignore */
        }
      });
    }
  }, [active]);

  return (
    <div
      className="terminal-pane"
      style={{ display: active ? "block" : "none" }}
      ref={containerRef}
    >
      {connecting && <LoadingOverlay />}
    </div>
  );
}
