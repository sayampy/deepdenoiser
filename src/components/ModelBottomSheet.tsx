import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/src/constants/theme";
import {
  MODELS,
  MODEL_IDS,
  type ModelDescriptor,
  type ModelId,
} from "@/src/scripts/models/registry";
import {
  deleteModel,
  downloadModel,
  getSelectedModel,
  importModelFile,
  installStateLabel,
  setSelectedModel,
} from "@/src/scripts/models/storage";
import { releaseOtherEngines } from "@/src/scripts/models/runtime";
import Feather from "@expo/vector-icons/Feather";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStyles } from "@/src/hooks/useStyles";

export interface ModelBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedModelId?: ModelId;
  onSelect?: (id: ModelId) => void;
  /** When set (e.g. 48000 for live recording), highlights models with compatible rate */
  requiredSampleRate?: number;
}

type RowState =
  | { kind: "checking" }
  | { kind: "installed"; bytes: number }
  | { kind: "missing" }
  | { kind: "downloading"; fraction: number }
  | { kind: "deleting" };

export default function ModelBottomSheet({
  visible,
  onClose,
  selectedModelId,
  onSelect,
  requiredSampleRate,
}: ModelBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);
  const [activeId, setActiveId] = useState<ModelId>(selectedModelId ?? "deepfilternet3");
  const [prevSelectedId, setPrevSelectedId] = useState(selectedModelId);
  if (selectedModelId !== prevSelectedId) {
    setPrevSelectedId(selectedModelId);
    if (selectedModelId) setActiveId(selectedModelId);
  }

  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<ModelId | null>(null);

  const downloadAbortRef = useRef<AbortController | null>(null);

  const refreshState = useCallback(async () => {
    const current = await getSelectedModel();
    setActiveId(current.id);

    const next: Record<string, RowState> = {};
    for (const id of MODEL_IDS) {
      const label = await installStateLabel(id);
      next[id] =
        label.status === "installed"
          ? { kind: "installed", bytes: label.bytes }
          : { kind: "missing" };
    }
    setRows(next);
  }, []);

  useEffect(() => {
    if (!visible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- modal open reset
    setError(null);
    void refreshState();
  }, [visible, refreshState]);

  const handleSelect = async (id: ModelId) => {
    if (id === activeId) {
      onClose();
      return;
    }
    try {
      await setSelectedModel(id);
      await releaseOtherEngines(id);
      setActiveId(id);
      onSelect?.(id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleStartDownload = async (id: ModelId) => {
    const controller = new AbortController();
    downloadAbortRef.current = controller;
    setRows((prev) => ({ ...prev, [id]: { kind: "downloading", fraction: 0 } }));
    setError(null);

    try {
      await downloadModel(id, {
        signal: controller.signal,
        onProgress: ({ fraction }) => {
          setRows((prev) => ({
            ...prev,
            [id]: { kind: "downloading", fraction },
          }));
        },
      });
      await refreshState();
    } catch (err) {
      setRows((prev) => ({ ...prev, [id]: { kind: "missing" } }));
      const msg = err instanceof Error ? err.message : String(err);
      if (!controller.signal.aborted) {
        setError(msg);
      }
    } finally {
      if (downloadAbortRef.current === controller) {
        downloadAbortRef.current = null;
      }
    }
  };

  const handleCancelDownload = (id: ModelId) => {
    downloadAbortRef.current?.abort();
    downloadAbortRef.current = null;
    setRows((prev) => ({ ...prev, [id]: { kind: "missing" } }));
  };

  const handleDelete = async (id: ModelId) => {
    setRows((prev) => ({ ...prev, [id]: { kind: "deleting" } }));
    setConfirmDeleteId(null);
    try {
      await deleteModel(id);
      await refreshState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      await refreshState();
    }
  };

  const handleImportFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.length) return;

      const file = picked.assets[0];
      // Choose target model based on file name or prompt
      const targetId: ModelId = file.name.toLowerCase().includes("mossformergan")
        ? "mossformergan_se_16k"
        : file.name.toLowerCase().includes("mossformer2")
          ? "mossformer2_se_48k"
          : "mossformer2_se_48k";

      setRows((prev) => ({ ...prev, [targetId]: { kind: "downloading", fraction: 0 } }));
      await importModelFile(targetId, file.uri);
      await refreshState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      await refreshState();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Material Expressive Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Expressive Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Feather name="cpu" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.title}>AI Denoising Models</Text>
                <Text style={styles.subtitle}>On-device neural speech enhancement</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={20} color={COLORS.subtext} />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText} numberOfLines={2}>
                {error}
              </Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Feather name="x" size={14} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          )}

          {/* Model Cards List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {MODEL_IDS.map((id) => {
              const model: ModelDescriptor = MODELS[id];
              const row = rows[id] ?? { kind: "checking" };
              const isSelected = activeId === id;
              const isInstalled =
                row.kind === "installed" || (model.bundled && row.kind !== "checking");
              const isDownloading = row.kind === "downloading";
              const isRateEligible =
                requiredSampleRate === undefined || model.sampleRate === requiredSampleRate;

              const fraction = isDownloading ? row.fraction : 0;
              const percent = Math.round(fraction * 100);

              return (
                <View
                  key={id}
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                    !isRateEligible && styles.cardIncompatible,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleArea}>
                      <View style={styles.cardTitleRow}>
                        <Text style={[styles.modelName, isSelected && styles.modelNameSelected]}>
                          {model.name}
                        </Text>
                        {isSelected && (
                          <View style={styles.activeBadge}>
                            <Feather name="check" size={12} color={COLORS.background} />
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                        {model.bundled && (
                          <View style={styles.bundledBadge}>
                            <Text style={styles.bundledBadgeText}>Bundled</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.modelDescription}>{model.description}</Text>
                    </View>
                  </View>

                  {/* Badges Row */}
                  <View style={styles.badgesRow}>
                    <View style={styles.badgePill}>
                      <Feather name="activity" size={12} color={COLORS.primary} />
                      <Text style={styles.badgeText}>{model.sampleRate / 1000} kHz</Text>
                    </View>

                    <View style={styles.badgePill}>
                      <Feather name="zap" size={12} color={COLORS.subtext} />
                      <Text style={styles.badgeText}>
                        {model.cost === "fast" ? "Fastest" : model.cost === "slow" ? "Balanced" : "Deep SE"}
                      </Text>
                    </View>

                    <View style={styles.badgePill}>
                      <Feather name="hard-drive" size={12} color={COLORS.subtext} />
                      <Text style={styles.badgeText}>
                        {(model.bytes / (1024 * 1024)).toFixed(0)} MB
                      </Text>
                    </View>

                    {requiredSampleRate && !isRateEligible && (
                      <View style={styles.rateWarningPill}>
                        <Text style={styles.rateWarningText}>
                          Need {requiredSampleRate / 1000} kHz
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions / Download / Select Area */}
                  <View style={styles.actionContainer}>
                    {isDownloading ? (
                      <View style={styles.downloadProgressBlock}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>Downloading model...</Text>
                          <Text style={styles.progressPercent}>{percent}%</Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${percent}%` }]} />
                        </View>
                        <TouchableOpacity
                          style={styles.cancelDownloadBtn}
                          onPress={() => handleCancelDownload(id)}
                        >
                          <Feather name="x-circle" size={14} color={COLORS.subtext} />
                          <Text style={styles.cancelDownloadText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isInstalled ? (
                      <View style={styles.installedRow}>
                        <TouchableOpacity
                          style={[
                            styles.selectBtn,
                            isSelected ? styles.selectBtnActive : styles.selectBtnInactive,
                          ]}
                          onPress={() => isRateEligible && handleSelect(id)}
                          disabled={!isRateEligible || isSelected}
                        >
                          <Feather
                            name={isSelected ? "check-circle" : "circle"}
                            size={16}
                            color={isSelected ? COLORS.primary : COLORS.subtext}
                          />
                          <Text
                            style={[
                              styles.selectBtnText,
                              isSelected && styles.selectBtnTextActive,
                            ]}
                          >
                            {isSelected ? "Currently Active" : "Switch to this model"}
                          </Text>
                        </TouchableOpacity>

                        {!model.bundled && (
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => setConfirmDeleteId(id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="trash-2" size={16} color={COLORS.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => handleStartDownload(id)}
                      >
                        <Feather name="download-cloud" size={16} color={COLORS.background} />
                        <Text style={styles.downloadBtnText}>
                          Download Model ({(model.bytes / (1024 * 1024)).toFixed(0)} MB)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Dev / Advanced Import Action */}
            <View style={styles.bottomImportSection}>
              <TouchableOpacity style={styles.importBtn} onPress={handleImportFile}>
                <Feather name="folder-plus" size={16} color={COLORS.subtext} />
                <Text style={styles.importBtnText}>Import .ort file from storage</Text>
              </TouchableOpacity>
              <Text style={styles.privacyNote}>
                All models run 100% locally on your device CPU. No audio is ever uploaded.
              </Text>
            </View>
          </ScrollView>

          {/* Delete confirmation modal */}
          {confirmDeleteId && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTitle}>Delete Model?</Text>
                <Text style={styles.confirmDesc}>
                  Delete {MODELS[confirmDeleteId]?.name} to free storage? You can re-download it anytime.
                </Text>
                <View style={styles.confirmButtons}>
                  <TouchableOpacity
                    style={styles.confirmCancelBtn}
                    onPress={() => setConfirmDeleteId(null)}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmDeleteBtn}
                    onPress={() => handleDelete(confirmDeleteId)}
                  >
                    <Text style={styles.confirmDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = () => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(6, 10, 20, 0.78)",
  },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FONT_SIZE.heading,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FONT_SIZE.xsmall,
    color: COLORS.subtext,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    marginHorizontal: SPACING.medium,
    marginTop: SPACING.small,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    flex: 1,
    fontSize: FONT_SIZE.xsmall,
    color: COLORS.error,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    padding: SPACING.medium,
    gap: 14,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.lg,
    padding: SPACING.medium,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceContainerHigh,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  cardIncompatible: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitleArea: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  modelName: {
    fontSize: FONT_SIZE.body,
    fontWeight: "700",
    color: COLORS.text,
  },
  modelNameSelected: {
    color: COLORS.primary,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  activeBadgeText: {
    fontSize: FONT_SIZE.xsmall - 2,
    fontWeight: "800",
    color: COLORS.background,
  },
  bundledBadge: {
    backgroundColor: COLORS.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  bundledBadgeText: {
    fontSize: FONT_SIZE.xsmall - 2,
    fontWeight: "700",
    color: COLORS.subtext,
  },
  modelDescription: {
    fontSize: FONT_SIZE.small,
    color: COLORS.subtext,
    lineHeight: 18,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeText: {
    fontSize: FONT_SIZE.xsmall,
    color: COLORS.subtext,
    fontWeight: "600",
  },
  rateWarningPill: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  rateWarningText: {
    fontSize: FONT_SIZE.xsmall,
    color: COLORS.accent,
    fontWeight: "600",
  },
  actionContainer: {
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  downloadBtnText: {
    fontSize: FONT_SIZE.small,
    fontWeight: "700",
    color: COLORS.background,
  },
  downloadProgressBlock: {
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: FONT_SIZE.xsmall,
    color: COLORS.subtext,
    fontWeight: "600",
  },
  progressPercent: {
    fontSize: FONT_SIZE.xsmall,
    color: COLORS.primary,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  cancelDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 4,
  },
  cancelDownloadText: {
    fontSize: FONT_SIZE.xsmall,
    color: COLORS.subtext,
  },
  installedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  selectBtnActive: {
    backgroundColor: "rgba(0, 229, 255, 0.08)",
    borderColor: COLORS.primary,
  },
  selectBtnInactive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  selectBtnText: {
    fontSize: FONT_SIZE.small,
    fontWeight: "600",
    color: COLORS.subtext,
  },
  selectBtnTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  bottomImportSection: {
    alignItems: "center",
    paddingVertical: SPACING.small,
    gap: 8,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  importBtnText: {
    fontSize: FONT_SIZE.small,
    color: COLORS.subtext,
    fontWeight: "600",
  },
  privacyNote: {
    fontSize: FONT_SIZE.xsmall,
    color: COLORS.subtext,
    textAlign: "center",
    opacity: 0.75,
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    width: "100%",
  },
  confirmTitle: {
    fontSize: FONT_SIZE.heading,
    fontWeight: "700",
    color: COLORS.text,
  },
  confirmDesc: {
    fontSize: FONT_SIZE.small,
    color: COLORS.subtext,
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  confirmCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  confirmCancelText: {
    color: COLORS.subtext,
    fontWeight: "600",
  },
  confirmDeleteBtn: {
    backgroundColor: COLORS.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.sm,
  },
  confirmDeleteText: {
    color: COLORS.white,
    fontWeight: "700",
  },
});
