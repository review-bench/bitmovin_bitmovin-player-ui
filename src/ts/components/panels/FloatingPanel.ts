import { Container, ContainerConfig } from '../Container';
import { UIInstanceManager } from '../../UIManager';
import { PlayerAPI } from 'bitmovin-player';
import { getKeyMapForPlatform } from '../../spatialnavigation/getKeyMapForPlatform';
import { Action } from '../../spatialnavigation/types';
import { CloseButton } from '../buttons/CloseButton';
import { LocalizableText } from '../../localization/i18n';

/**
 * Predefined locations for a {@link FloatingPanel} inside the UI container.
 *
 * @category Components
 */
export enum FloatingPanelPlacement {
  TopLeft = 'top-left',
  TopRight = 'top-right',
  BottomLeft = 'bottom-left',
  BottomRight = 'bottom-right',
  Center = 'center',
}

const FLOATING_PANEL_PLACEMENTS = [
  FloatingPanelPlacement.TopLeft,
  FloatingPanelPlacement.TopRight,
  FloatingPanelPlacement.BottomLeft,
  FloatingPanelPlacement.BottomRight,
  FloatingPanelPlacement.Center,
];

/**
 * Configuration interface for a {@link FloatingPanel}.
 *
 * @category Configs
 */
export interface FloatingPanelConfig extends ContainerConfig {
  /**
   * Initial placement of the panel inside the UI container.
   * Default: {@link FloatingPanelPlacement.TopRight}
   */
  placement?: FloatingPanelPlacement;

  /**
   * If true, the panel hides when Escape or a platform back action is pressed.
   * Default: true
   */
  hideOnBackAction?: boolean;

  /**
   * If true, the panel renders a close button in the top-right corner.
   * Default: true
   */
  closeButton?: boolean;

  /**
   * Accessible close button label.
   * Default: `close`
   */
  closeButtonText?: LocalizableText;
}

/**
 * Generic floating container for UI surfaces that are shown independently from the
 * control bar and without the settings panel's page/navigation behavior.
 *
 * @category Components
 */
export class FloatingPanel<Config extends FloatingPanelConfig = FloatingPanelConfig> extends Container<Config> {
  private static readonly PLACEMENT_CLASS_PREFIX = 'floating-panel-placement-';
  private static readonly CLASS_WITH_CLOSE_BUTTON = 'floating-panel-with-close-button';

  private documentKeyUpHandler: ((event: KeyboardEvent) => void) | null = null;
  private closeButton: CloseButton | null = null;

  constructor(config: Config = {} as Config) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-floating-panel',
        hidden: true,
        role: 'dialog',
        placement: FloatingPanelPlacement.TopRight,
        hideOnBackAction: true,
        closeButton: true,
      } as Config,
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    this.closeButton?.configure(player, uimanager);

    if (!this.config.hideOnBackAction) {
      return;
    }

    const documentKeyUpHandler = (event: KeyboardEvent) => {
      const action = getKeyMapForPlatform()[event.keyCode];
      if (this.isShown() && (event.key === 'Escape' || action === Action.BACK)) {
        this.hide();
      }
    };
    this.documentKeyUpHandler = documentKeyUpHandler;

    this.onShow.subscribe(() => {
      document.addEventListener('keyup', documentKeyUpHandler);
    });
    this.onHide.subscribe(() => {
      document.removeEventListener('keyup', documentKeyUpHandler);
    });
  }

  release(): void {
    if (this.documentKeyUpHandler) {
      document.removeEventListener('keyup', this.documentKeyUpHandler);
      this.documentKeyUpHandler = null;
    }

    this.closeButton?.release();
    this.closeButton = null;

    super.release();
  }

  setPlacement(placement: FloatingPanelPlacement): void {
    const currentPlacement = this.config.placement;
    this.config.placement = placement;

    if (!this.hasDomElement()) {
      return;
    }

    const element = this.getDomElement();
    element.removeClass(this.getPlacementCssClass(currentPlacement));
    element.addClass(this.getPlacementCssClass(placement));
    this.clearInlinePosition();
  }

  /**
   * Shows the panel at the supplied client coordinates, clamped to its offset
   * parent. This is useful for pointer-anchored menus or diagnostics.
   */
  showAt(clientX: number, clientY: number): void {
    const element = this.getDomElement();
    const rootElement = element.get(0) as HTMLElement;
    const parentElement = (rootElement.offsetParent as HTMLElement) ?? rootElement.parentElement;
    const parentRect = parentElement?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const offsetWidth = rootElement.offsetWidth;
    const offsetHeight = rootElement.offsetHeight;
    const maxLeft = Math.max(0, parentRect.width - offsetWidth - 4);
    const maxTop = Math.max(0, parentRect.height - offsetHeight - 4);
    const left = Math.max(0, Math.min(clientX - parentRect.left, maxLeft));
    const top = Math.max(0, Math.min(clientY - parentRect.top, maxTop));

    this.removePlacementCssClass();
    element.css({
      bottom: 'auto',
      left: `${left}px`,
      right: 'auto',
      top: `${top}px`,
    });

    this.show();
  }

  protected toDomElement() {
    const element = super.toDomElement();
    element.addClass(this.getPlacementCssClass(this.config.placement));

    if (this.config.closeButton) {
      this.closeButton = new CloseButton({
        target: this,
        cssClasses: ['ui-floating-panel-close-button'],
        text: this.config.closeButtonText,
      });

      element.addClass(this.prefixCss(FloatingPanel.CLASS_WITH_CLOSE_BUTTON));
      element.append(this.closeButton.getDomElement());
    }

    return element;
  }

  private clearInlinePosition(): void {
    this.getDomElement().css({
      bottom: '',
      left: '',
      right: '',
      top: '',
    });
  }

  private removePlacementCssClass(): void {
    FLOATING_PANEL_PLACEMENTS.forEach(placement => {
      this.getDomElement().removeClass(this.getPlacementCssClass(placement));
    });
  }

  private getPlacementCssClass(placement: FloatingPanelPlacement): string {
    return this.prefixCss(FloatingPanel.PLACEMENT_CLASS_PREFIX + placement);
  }
}
