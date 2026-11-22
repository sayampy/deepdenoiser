import type { ModelId } from "@/src/scripts/models/registry";
import React from "react";
import ModelBottomSheet from "./ModelBottomSheet";

export interface ModelPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect?: (id: ModelId) => void;
  selectedModelId?: ModelId;
  requiredSampleRate?: number;
}

/**
 * Material Expressive Model Picker.
 * Standardizes model choosing to a menu that raises from the bottom
 * and supports downloading directly inside the menu.
 */
export default function ModelPicker({
  visible,
  onClose,
  onSelect,
  selectedModelId,
  requiredSampleRate,
}: ModelPickerProps) {
  return (
    <ModelBottomSheet
      visible={visible}
      onClose={onClose}
      onSelect={onSelect}
      selectedModelId={selectedModelId}
      requiredSampleRate={requiredSampleRate}
    />
  );
}
