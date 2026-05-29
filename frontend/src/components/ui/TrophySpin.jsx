import { TrophySpin } from "react-loading-indicators";
import { useTheme } from "@/context/ThemeContext";
import "../../styles/TrophySpin.css";

// Indicador de carregamento animado (troféu) adaptado ao tema activo
const TrophySpinComponent = ({ message = "Aguarde por favor" }) => {
  const { theme } = useTheme();
  // Cor do loader consoante o tema
  const loaderColor = theme === "dark" ? "#5a8aff" : "#4a78e0";
  // Cor do texto de legenda
  const textColorValue = theme === "dark" ? "#e8eaed" : "#4c3b3b";

  return (
    <div className="loader-container">
      <TrophySpin color={loaderColor} size="medium" text={message} textColor={textColorValue} />
    </div>
  );
};

export default TrophySpinComponent;
