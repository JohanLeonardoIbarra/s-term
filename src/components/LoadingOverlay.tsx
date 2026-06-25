import Refresh from "@mui/icons-material/Refresh";

export default function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-icon">
          <Refresh fontSize="large" className="spin" />
        </div>
        <div className="loading-text">estableciendo conexión</div>
      </div>
    </div>
  );
}
