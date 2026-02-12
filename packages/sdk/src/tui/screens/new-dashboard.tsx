/**
 * Simple Dashboard
 *
 * Pantalla de inicio ultra-simple.
 * Cualquier tecla inicia el agente.
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useStore } from "../store";

export function NewDashboard() {
  const { setScreen } = useStore();

  useInput(() => {
    setScreen("simple-setup");
  });

  return (
    <Box
      alignItems="center"
      flexDirection="column"
      flexGrow={1}
      justifyContent="center"
    >
      {/* Logo grande */}
      <Text bold color="green">
        🌾 OpenFarm
      </Text>

      <Text bold color="white" marginTop={2}>
        Tu agente de código inteligente
      </Text>

      {/* Instrucción principal */}
      <Box backgroundColor="cyan" marginTop={4} paddingX={2} paddingY={1}>
        <Text bold color="black">
          PRESIONA CUALQUIER TECLA PARA CONFIGURAR
        </Text>
      </Box>

      <Text color="gray" dimColor marginTop={2}>
        Elige: tarea, workflow, ubicación y AI
      </Text>

      {/* Ejemplos */}
      <Box alignItems="center" flexDirection="column" marginTop={2}>
        <Text color="gray" dimColor>
          En 5 pasos simples:
        </Text>
        <Text color="cyan" marginTop={1}>
          1. Qué necesitas
        </Text>
        <Text color="cyan">2. Tipo de trabajo</Text>
        <Text color="cyan">3. Dónde trabajar</Text>
        <Text color="cyan">4. Qué AI usar</Text>
        <Text color="cyan">5. ¡Empezar!</Text>
      </Box>
    </Box>
  );
}
