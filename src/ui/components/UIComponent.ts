/**
 * Base UI Component
 * 
 * Provides a foundation for building modular UI components with lifecycle management
 * and automatic cleanup.
 */

export interface ComponentProps {
  className?: string;
}

/**
 * Base class for UI components
 * Handles DOM element creation, updates, and cleanup
 */
export abstract class UIComponent<TProps extends ComponentProps = ComponentProps> {
  protected element: HTMLElement;
  protected props: TProps;
  private cleanupFunctions: Array<() => void> = [];

  constructor(tagName: string, props: TProps) {
    this.element = document.createElement(tagName);
    this.props = props;
    
    if (props.className) {
      this.element.className = props.className;
    }
    
    this.initialize();
  }

  /**
   * Initialize the component
   * Override this to set up your component
   */
  protected abstract initialize(): void;

  /**
   * Update the component with new props
   * Override this to handle prop updates
   */
  public update(props: Partial<TProps>): void {
    this.props = { ...this.props, ...props };
    this.render();
  }

  /**
   * Render the component
   * Override this to update the DOM based on props
   */
  protected abstract render(): void;

  /**
   * Get the component's root element
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Mount the component to a parent element
   */
  public mount(parent: HTMLElement): void {
    parent.appendChild(this.element);
  }

  /**
   * Unmount the component from its parent
   */
  public unmount(): void {
    this.element.remove();
    this.cleanup();
  }

  /**
   * Register a cleanup function to be called when the component is destroyed
   */
  protected addCleanup(fn: () => void): void {
    this.cleanupFunctions.push(fn);
  }

  /**
   * Add an event listener and automatically clean it up
   */
  protected addEventListener<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window | Document,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener as EventListener, options);
    this.addCleanup(() => {
      target.removeEventListener(type, listener as EventListener, options);
    });
  }

  /**
   * Create a child element with optional class and text
   */
  protected createElement(
    tagName: string,
    className?: string,
    textContent?: string
  ): HTMLElement {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (textContent) {
      element.textContent = textContent;
    }
    return element;
  }

  /**
   * Create a button with text and click handler
   */
  protected createButton(
    text: string,
    onClick: () => void,
    className = ''
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.className = className;
    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.cleanupFunctions.forEach(fn => fn());
    this.cleanupFunctions = [];
  }

  /**
   * Destroy the component and clean up
   */
  public destroy(): void {
    this.unmount();
  }
}

/**
 * Helper function to conditionally apply a class
 */
export function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Helper to format numbers consistently
 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toFixed(decimals);
}

/**
 * Helper to format time in a human-readable way
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}
