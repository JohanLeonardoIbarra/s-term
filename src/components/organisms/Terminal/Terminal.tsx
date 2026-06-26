import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { listen } from "@tauri-apps/api/event";
import { closeSession, resizeSession, writeSession } from "../../../api";
import type { PtyDataEvent, PtyExitEvent } from "../../../types";
import LoadingOverlay from "../LoadingOverlay";
import styles from "./Terminal.module.css";

interface Props {
  sessionId: string;
  active: boolean;
  connecting?: boolean;
  onExit: (sessionId: string) => void;
  onConnected?: (sessionId: string) => void;
  terminalFontSize?: number;
}

export default function Terminal({
  sessionId,
  active,
  connecting,
  onExit,
  onConnected,
  terminalFontSize = 14,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const onExitRef = useRef(onExit);
  const onConnectedRef = useRef(onConnected);
  const fontSizeRef = useRef(terminalFontSize);

  // Keep refs updated
  useEffect(() => {
    onExitRef.current = onExit;
    onConnectedRef.current = onConnected;
    fontSizeRef.current = terminalFontSize;
  }, [onExit, onConnected, terminalFontSize]);

  // Font size effect (separate to avoid remount)
  useEffect(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term) return;
    term.options.fontSize = terminalFontSize;
    requestAnimationFrame(() => {
      try {
        fit?.fit();
      } catch {
        /* ignore */
      }
    });
  }, [terminalFontSize]);

  // Main effect: only depends on sessionId
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily:
        'Menlo, Monaco, "Cascadia Code", "Fira Code", "Courier New", monospace',
      fontSize: fontSizeRef.current,
      theme: {
        background: "#000000",
        foreground: "#e5e2e1",
        cursor: "#13ff43",
        cursorAccent: "#13ff43",
        selectionBackground: "#2979FF",
        selectionForeground: "#ffffff",
      },
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(container);
    // Delay fit to ensure container has dimensions
    requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {
        /* ignore fit errors during initialization */
      }
    });

    termRef.current = term;
    fitRef.current = fit;

    const writeDisposable = term.onData((data) => {
      void writeSession(sessionId, data);
    });

    const resizeDisposable = term.onResize(({ cols, rows }) => {
      void resizeSession(sessionId, cols, rows);
    });

    void resizeSession(sessionId, term.cols, term.rows);

    const unlistenData = listen<PtyDataEvent>("pty://data", (event) => {
      if (event.payload.id === sessionId) {
        term.write(event.payload.data);
        onConnectedRef.current?.(sessionId);
      }
    });

    const unlistenExit = listen<PtyExitEvent>("pty://exit", (event) => {
      if (event.payload.id === sessionId) {
        term.write("\r\n\x1b[90m[process exited]\x1b[0m\r\n");
        onExitRef.current?.(sessionId);
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
  }, [sessionId]);

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
      className={styles.pane}
      style={{ display: active ? "block" : "none" }}
      ref={containerRef}
    >
      {connecting && <LoadingOverlay />}
    </div>
  );
}
