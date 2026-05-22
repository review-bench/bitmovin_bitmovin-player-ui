import { PlayerAPI } from 'bitmovin-player';
import { UIInstanceManager } from '../../../UIManager';
import { i18n, LocalizableText } from '../../../localization/i18n';
import { Timeout } from '../../../utils/Timeout';
import { Label, LabelConfig } from '../../labels/Label';
import { SettingsPanel, SettingsPanelConfig } from '../../settings/SettingsPanel';
import { InteractiveSettingsPanelItem } from '../../settings/InteractiveSettingsPanelItem';
import { SettingsPanelItemConfig } from '../../settings/SettingsPanelItem';
import { FloatingPanel, FloatingPanelConfig, FloatingPanelPlacement } from '../FloatingPanel';
import { FloatingPanelItem } from '../FloatingPanelItem';
import {
  formatAudioInsight,
  formatBufferInsight,
  formatDroppedFramesInsight,
  formatStreamInsight,
  formatTimeInsight,
  formatVideoInsight,
} from './PlayerInsightsUtils';

export { formatBitrate, formatSeconds } from './PlayerInsightsUtils';

type PlayerInsightsValueProvider = (player: PlayerAPI) => LocalizableText | null | undefined;

interface PlayerInsightsItemConfig {
  leadingLabel: LocalizableText;
  value: PlayerInsightsValueProvider;
  emptyValue?: LocalizableText;
}

interface PlayerInsightsItem {
  item: FloatingPanelItem;
  value: PlayerInsightsValueProvider;
  emptyValue: LocalizableText;
}

/**
 * Configuration interface for a {@link PlayerInsightsPanel}.
 *
 * @category Configs
 */
export interface PlayerInsightsPanelConfig extends FloatingPanelConfig {
  /**
   * The interval in milliseconds at which the displayed values are refreshed while playback is active.
   * Set to -1 to disable periodic refreshes.
   * Default: 1000
   */
  refreshIntervalMs?: number;

  /**
   * Whether the built-in player-insight rows should be added before custom components.
   * Default: true
   */
  includeDefaultItems?: boolean;
}

/**
 * Floating player diagnostics panel composed from {@link FloatingPanelItem} rows.
 *
 * @category Components
 */
export class PlayerInsightsPanel extends FloatingPanel<PlayerInsightsPanelConfig> {
  private refreshTimer: Timeout | null = null;
  private readonly insightsItems: PlayerInsightsItem[];

  constructor(config: PlayerInsightsPanelConfig = {}) {
    const insightsItems = config.includeDefaultItems === false ? [] : PlayerInsightsPanel.createDefaultItems();
    const panelConfig = {
      ...config,
      closeButtonText: config.closeButtonText ?? i18n.getLocalizer('playerInsights.hide'),
      cssClasses: ['ui-player-insights-panel', ...(config.cssClasses ?? [])],
      components: [
        PlayerInsightsPanel.createTitleLabel(),
        ...insightsItems.map(insightsItem => insightsItem.item),
        ...(config.components ?? []),
      ],
    };

    super(panelConfig);

    this.insightsItems = insightsItems;

    this.config = this.mergeConfig(
      panelConfig,
      {
        placement: FloatingPanelPlacement.TopLeft,
        refreshIntervalMs: 1000,
        includeDefaultItems: true,
      } as PlayerInsightsPanelConfig,
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    const updateItems = () => this.updateItems(player);
    const updateAndStartTimer = () => {
      updateItems();
      this.startTimer(player, updateItems);
    };

    player.on(player.exports.PlayerEvent.Play, updateAndStartTimer);
    player.on(player.exports.PlayerEvent.Playing, updateAndStartTimer);
    player.on(player.exports.PlayerEvent.Paused, updateItems);
    player.on(player.exports.PlayerEvent.Seeked, updateItems);
    player.on(player.exports.PlayerEvent.SourceLoaded, updateItems);
    player.on(player.exports.PlayerEvent.SourceUnloaded, updateItems);
    player.on(player.exports.PlayerEvent.VideoQualityChanged, updateItems);
    player.on(player.exports.PlayerEvent.AudioQualityChanged, updateItems);
    player.on(player.exports.PlayerEvent.StallStarted, updateItems);
    player.on(player.exports.PlayerEvent.StallEnded, updateItems);
    player.on(player.exports.PlayerEvent.PlaybackFinished, () => this.stopTimer());
    player.on(player.exports.PlayerEvent.Destroy, () => this.stopTimer());

    this.onShow.subscribe(() => {
      updateItems();
      this.startTimer(player, updateItems);
    });
    this.onHide.subscribe(() => this.stopTimer());

    uimanager.getConfig().events.onUpdated.subscribe(updateItems);

    updateItems();
  }

  release(): void {
    this.stopTimer();
    super.release();
  }

  /**
   * Creates a settings-panel row that toggles this panel and closes the source settings panel.
   */
  createSettingsPanelToggleItem(
    settingsPanel: SettingsPanel<SettingsPanelConfig>,
  ): InteractiveSettingsPanelItem<SettingsPanelItemConfig> {
    const item = new InteractiveSettingsPanelItem<SettingsPanelItemConfig>({
      label: i18n.getLocalizer('playerInsights.title'),
      addSettingAsComponent: false,
      ariaLabel: i18n.getLocalizer('playerInsights.title'),
      isSetting: false,
      role: 'menuitem',
      tabIndex: 0,
    });

    item.onClick.subscribe(() => {
      settingsPanel.hide();
      this.toggleHidden();
    });

    return item;
  }

  private updateItems(player: PlayerAPI): void {
    this.insightsItems.forEach(insightsItem => {
      const value = insightsItem.value(player);
      insightsItem.item.setTrailingLabel(value ?? insightsItem.emptyValue);
    });
  }

  private startTimer(player: PlayerAPI, updateHandler: () => void): void {
    this.stopTimer();

    if (this.config.refreshIntervalMs === -1 || this.isHidden() || player.isPaused()) {
      return;
    }

    this.refreshTimer = new Timeout(this.config.refreshIntervalMs, updateHandler, true).start();
  }

  private stopTimer(): void {
    if (this.refreshTimer) {
      this.refreshTimer.clear();
      this.refreshTimer = null;
    }
  }

  private static createDefaultItems(): PlayerInsightsItem[] {
    return [
      PlayerInsightsPanel.createItem({
        leadingLabel: i18n.getLocalizer('playerInsights.video'),
        value: player => formatVideoInsight(player),
      }),
      PlayerInsightsPanel.createItem({
        leadingLabel: i18n.getLocalizer('playerInsights.audio'),
        value: player => formatAudioInsight(player),
      }),
      PlayerInsightsPanel.createItem({
        leadingLabel: i18n.getLocalizer('playerInsights.buffer'),
        value: player => formatBufferInsight(player),
      }),
      PlayerInsightsPanel.createItem({
        leadingLabel: i18n.getLocalizer('playerInsights.droppedFrames'),
        value: player => formatDroppedFramesInsight(player),
      }),
      PlayerInsightsPanel.createItem({
        leadingLabel: i18n.getLocalizer('playerInsights.time'),
        value: player => formatTimeInsight(player),
      }),
      PlayerInsightsPanel.createItem({
        leadingLabel: i18n.getLocalizer('playerInsights.stream'),
        value: player => formatStreamInsight(player),
      }),
      PlayerInsightsPanel.createItem({
        leadingLabel: i18n.getLocalizer('playerInsights.player'),
        value: player => player.version,
      }),
    ];
  }

  private static createItem(config: PlayerInsightsItemConfig): PlayerInsightsItem {
    const emptyValue = config.emptyValue ?? '-';

    return {
      item: new FloatingPanelItem({
        leadingLabel: config.leadingLabel,
        trailingLabel: emptyValue,
      }),
      value: config.value,
      emptyValue,
    };
  }

  private static createTitleLabel(): Label<LabelConfig> {
    return new Label<LabelConfig>({
      text: i18n.getLocalizer('playerInsights.title'),
      cssClasses: ['ui-player-insights-panel-header', 'ui-player-insights-panel-title'],
    });
  }
}
