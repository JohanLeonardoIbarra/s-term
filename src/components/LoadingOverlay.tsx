import Refresh from "@mui/icons-material/Refresh";
import { useTranslation } from "../i18n";

export default function LoadingOverlay() {
  const { t } = useTranslation();
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-icon">
          <Refresh fontSize="large" className="spin" />
        </div>
        <div className="loading-text">{t("loading.connecting")}</div>
      </div>
    </div>
  );
}
