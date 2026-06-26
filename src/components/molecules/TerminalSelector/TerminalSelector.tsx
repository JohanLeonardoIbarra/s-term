import { useEffect, useRef, useState } from "react";
import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import Button from "../../atoms/Button";
import { useTranslation } from "../../../i18n";
import type { TerminalInfo } from "../../../types";
import styles from "./TerminalSelector.module.css";

interface Props {
  terminals: TerminalInfo[];
  selected: string;
  onNewLocal: () => void;
  onPick: (id: string) => void;
}

export default function TerminalSelector({
  terminals,
  selected,
  onNewLocal,
  onPick,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handlePick = (id: string) => {
    setOpen(false);
    onPick(id);
  };

  const hasMultiple = terminals.length > 1;

  return (
    <div ref={ref} className={styles.container}>
      <Button fullWidth onClick={() => onNewLocal()} className={styles.mainBtn}>
        {t("sidebar.localTerminal")}
      </Button>
      {hasMultiple && (
        <Button className={styles.toggleBtn} onClick={() => setOpen(!open)}>
          <ArrowDropDown fontSize="small" />
        </Button>
      )}
      {open && hasMultiple && (
        <div className={styles.dropdown}>
          {terminals.map((terminal) => (
            <button
              key={terminal.id}
              className={`${styles.option} ${
                selected === terminal.id ? styles.optionActive : ""
              }`}
              onClick={() => handlePick(terminal.id)}
            >
              {terminal.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
