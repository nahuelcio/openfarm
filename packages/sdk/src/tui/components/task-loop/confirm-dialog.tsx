import { Box, Text } from "@openfarm/tui-opentui";
import { OverlayContainer } from "./overlay-container";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "y",
  cancelLabel = "n",
}: ConfirmDialogProps) {
  return (
    <OverlayContainer
      footer={`${confirmLabel}/${cancelLabel} to continue`}
      title={title}
    >
      <Box flexDirection="column">
        <Text>{message}</Text>
        <Text>
          <Text bold>[{confirmLabel}]</Text> confirm{" "}
          <Text bold>[{cancelLabel}]</Text> cancel
        </Text>
      </Box>
    </OverlayContainer>
  );
}
