module TronGrid {
    /** Synchronizes the size and scroll area of another scrollable piece of content either horizontally or vertically 
    For example a horizontal layout would be something like:
       ---------------------
       |                   |
       |     Tron Grid     |
       |                   |
       |<---Sychronized--->|

       ---------------------
       | External Scroller |
    :--|-------------------|---:
    :  |     Container     |   :
    :--|-------------------|---:
       |<---Sychronized--->|


    In this example the container will automatically be resized to the same width as the trongrid full scroll range.
    The two scroll bars will scroll together.
    */
    export class ScrollSyncBehavior implements TronGrid.IGridBehavior {
        scroller: JQuery;
        container: JQuery;
        grid: TronGrid.TronGrid;
        handling = false;
        constructor(public targetScrollerSelector: string, public containerSelector: string, public horizontal: boolean, public isActive: KnockoutObservable<boolean>) {
            this.isActive.subscribe(a => {
                setTimeout(() => this.activate(), 300);
            });
        }

        attach(attachToGrid: TronGrid.TronGrid) {
            this.grid = attachToGrid;

            this.activate();
        }

        activate() {
            this.container = this.findRelative(this.grid.scroller, this.containerSelector);
            this.scroller = this.findRelative(this.grid.scroller, this.targetScrollerSelector);
            this.scrollChanged(this.grid.scrollBounds);
            this.scroller.scroll(this.targetScrollChanged.bind(this));
        }

        targetScrollChanged() {
            if (!this.isActive() || this.handling) {
                return;
            }

            this.handling = true;
            this.grid.scroller.scrollLeft = this.scroller.scrollLeft();
            this.grid.scroller.scrollTop = this.scroller.scrollTop();
            this.handling = false;
        }

        // Loops back up through the parents of the viewport DOM node and locates the parent scroller.
        findRelative(source: Element, selector: string): JQuery {
            // Find the scroller.
            // It is fine to use closest here as the _first_ matching scroller will be returned.
            var matchedElements = $(source).closest(selector);

            if (!matchedElements.length) {
                return $(selector);
            }

            return matchedElements;
        }

        scrollChanged(bounds: TronGrid.Rectangle) {
            if (!this.isActive() || this.handling) {
                return;
            }

            this.handling = true;
            if (this.horizontal) {
                this.container.width(this.grid.totalWidth + 'px');
                this.scroller.scrollLeft(bounds.left);
            } else {
                this.container.height(this.grid.totalHeight + 'px');
                this.scroller.scrollTop(bounds.top);
            }

            this.handling = false;
        }
    }
}