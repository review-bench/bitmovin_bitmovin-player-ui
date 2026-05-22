import { Container, ContainerConfig } from '../Container';
import { Label, LabelConfig } from '../labels/Label';
import { LocalizableText } from '../../localization/i18n';

/**
 * Configuration interface for a {@link FloatingPanelItem}.
 *
 * @category Configs
 */
export interface FloatingPanelItemConfig extends ContainerConfig {
  /**
   * Label shown at the start of the row.
   */
  leadingLabel: LocalizableText;

  /**
   * Label shown at the end of the row.
   * Default: "-"
   */
  trailingLabel?: LocalizableText;
}

/**
 * Generic two-column row for use inside a {@link FloatingPanel}.
 *
 * @category Components
 */
export class FloatingPanelItem<
  Config extends FloatingPanelItemConfig = FloatingPanelItemConfig,
> extends Container<Config> {
  private readonly leadingLabel: Label<LabelConfig>;
  private readonly trailingLabel: Label<LabelConfig>;

  constructor(config: Config) {
    const leadingLabel = new Label<LabelConfig>({
      text: config.leadingLabel,
      cssClasses: ['ui-floating-panel-item-leading-label'],
    });
    const trailingLabel = new Label<LabelConfig>({
      text: config.trailingLabel ?? '-',
      cssClasses: ['ui-floating-panel-item-trailing-label'],
    });

    const itemConfig = {
      ...config,
      components: [leadingLabel, trailingLabel, ...(config.components ?? [])],
    };

    super(itemConfig);

    this.leadingLabel = leadingLabel;
    this.trailingLabel = trailingLabel;

    this.config = this.mergeConfig(
      itemConfig,
      {
        cssClass: 'ui-floating-panel-item',
        role: 'group',
        trailingLabel: '-',
      } as Config,
      this.config,
    );
  }

  setLeadingLabel(text: LocalizableText): void {
    this.config.leadingLabel = text;
    this.leadingLabel.setText(text);
  }

  setTrailingLabel(text: LocalizableText): void {
    this.config.trailingLabel = text;
    this.trailingLabel.setText(text);
  }
}
