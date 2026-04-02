import { Feather } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import { getSettings } from '../scripts/settings';

interface UpdateInfo {
  version: string;
  url: string;
  notes: string;
  published_at: string;
}

const GITHUB_API_URL = 'https://api.github.com/repos/sayampy/deepdenoiser/releases/latest';

const compareVersions = (v1: string, v2: string) => {
  const cleanV1 = v1.replace(/^v/, '').split('.').map(Number);
  const cleanV2 = v2.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(cleanV1.length, cleanV2.length); i++) {
    const n1 = cleanV1[i] || 0;
    const n2 = cleanV2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
};

export default function UpdateModal() {
  const [visible, setVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUpdates();
  }, []);

  const checkUpdates = async () => {
    try {
      const settings = await getSettings();
      if (!settings.checkForUpdates) return;

      const currentVersion = Constants.expoConfig?.version || '0.0.0';
      const response = await fetch(GITHUB_API_URL);
      const data = await response.json();

      if (data.tag_name) {
        if (compareVersions(data.tag_name, currentVersion) > 0) {
          const apkAsset = data.assets?.find((a: any) => a.name.endsWith('.apk'));
          if (apkAsset) {
            setUpdateInfo({
              version: data.tag_name,
              url: apkAsset.browser_download_url,
              notes: data.body || 'No release notes provided.',
              published_at: data.published_at,
            });
            setVisible(true);
          }
        }
        // setVisible(true); // For test
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
    }
  };

  const handleDownload = async () => {
    if (!updateInfo) return;

    setDownloading(true);
    setError(null);

    try {
      const asset = Asset.fromURI(updateInfo.url);
      await asset.downloadAsync();

      if (asset.localUri) {
        if (Platform.OS === 'android') {
          // On Android, sharing is often more reliable to trigger APK installation
          await Sharing.shareAsync(asset.localUri, {
            mimeType: 'application/vnd.android.package-archive',
            dialogTitle: 'Install DeepDenoiser Update',
          });
        }
      } else {
        throw new Error('Failed to get local URI for downloaded asset');
      }
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download update. Please try again or download manually from GitHub.');
    } finally {
      setDownloading(false);
    }
  };

  const openGitHub = () => {
    Linking.openURL('https://github.com/sayampy/deepdenoiser/releases/latest');
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => !downloading && setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Feather name="arrow-up-circle" size={24} color={COLORS.primary} />
              <Text style={styles.title}>Update Available</Text>
            </View>
            {!downloading && (
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Feather name="x" size={24} color={COLORS.subtext} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.content}>
            <Text style={styles.versionInfo}>
              New version <Text style={styles.versionText}>{updateInfo?.version}</Text> is ready.
            </Text>

            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>What&apos;s New:</Text>
              <ScrollView style={styles.notesScroll} nestedScrollEnabled>
                <Text style={styles.notesText}>{updateInfo?.notes}</Text>
              </ScrollView>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            {downloading ? (
              <View style={styles.downloadingContainer}>
                <ActivityIndicator color={COLORS.primary} style={{ marginRight: 12 }} />
                <Text style={styles.downloadingText}>Downloading update...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={openGitHub}
                >
                  <Text style={styles.secondaryButtonText}>GitHub</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleDownload}
                >
                  <Text style={styles.primaryButtonText}>Download & Install</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.large,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.large,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE.heading,
    fontWeight: '800',
    color: COLORS.text,
    marginLeft: SPACING.small,
  },
  content: {
    marginBottom: SPACING.large,
  },
  versionInfo: {
    fontSize: FONT_SIZE.body,
    color: COLORS.subtext,
    marginBottom: SPACING.medium,
  },
  versionText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  notesContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.medium,
    height: 150,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesTitle: {
    fontSize: FONT_SIZE.small,
    fontWeight: '700',
    color: COLORS.subtext,
    textTransform: 'uppercase',
    marginBottom: SPACING.small,
  },
  notesScroll: {
    flex: 1,
  },
  notesText: {
    fontSize: FONT_SIZE.small,
    color: COLORS.text,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.medium,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: SPACING.small,
    borderRadius: 8,
  },
  errorText: {
    fontSize: FONT_SIZE.xsmall,
    color: COLORS.error,
    marginLeft: SPACING.xsmall,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.small,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderRadius: 12,
    flex: 2,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.body,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.body,
    fontWeight: '600',
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: SPACING.small,
  },
  downloadingText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.body,
    fontWeight: '600',
  },
});
