import { Container, ContainerConfig } from '../Container';

/**
 * Configuration interface for a {@link ContextMenuSeparator}.
 *
 * @category Configs
 */
export interface ContextMenuSeparatorConfig extends ContainerConfig {}

/**
 * A visual separator between groups of context menu rows.
 *
 * @category Components
 */
export class ContextMenuSeparator extends Container<ContextMenuSeparatorConfig> {
  constructor(config: ContextMenuSeparatorConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-context-menu-separator',
        role: 'separator',
      },
      this.config,
    );
  }
}
